import { EstimateConversion } from '@/components/overlays/EstimateConversion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from './components/Icon';
import { Sidebar } from './components/Sidebar';
import { BulkBar } from './components/BulkBar';
import { DragProvider } from './components/dnd/DragProvider';
import { Composer } from './components/overlays/Composer';
import { TaskDetail } from './components/overlays/TaskDetail';
import { Issues } from './components/overlays/Issues';
import { Search } from './components/overlays/Search';
import { Shortcuts } from './components/overlays/Shortcuts';
import { InsightsPanel } from './components/overlays/InsightsPanel';
import { unreadCount } from './domain/notifications';
import { ShareSheet } from './components/overlays/ShareSheet';
import { ProjectSheet, type ProjectSheetTarget } from './components/overlays/ProjectSheet';
import { Unestimated } from './components/overlays/Unestimated';
import { ConfirmProvider } from './components/overlays/Confirm';
import { Overlay } from './components/overlays/Overlay';
import { QUICK_ADD, QuickAdd } from './QuickAdd';
import { WeekView } from './views/WeekView';
import { UpcomingView } from './views/UpcomingView';
import { SimpleListView } from './views/SimpleListView';
import { ProjectView } from './views/ProjectView';
import { LabelsView } from './views/LabelsView';
import { InsightsView } from './views/InsightsView';
import { ReviewView } from './views/ReviewView';
import { SettingsView } from './views/SettingsView';
import { EisenhowerView } from './views/EisenhowerView';
import { ConnectView } from './views/ConnectView';
import { EstimateStorageDialog } from './components/overlays/EstimateStorageDialog';
import { Walkthrough } from './components/overlays/Walkthrough';
import { Tour } from './components/overlays/Tour';
import { WhatsNew, type WhatsNewScope } from './components/overlays/WhatsNew';
import { hasChanges, parseChangelog, unseenReleases } from './domain/changelog';
import { VERSION } from './app-info';
import { hasOnboarded, shouldAskEstimateStorage } from './domain/onboarding';
import { useStore } from './store/store';
import type { Accent, Theme } from './store/prefs';
import { ACCENT_TOKENS, accentFamily, backdropGradient, hexToHsl } from './domain/accent';
import { useT } from './hooks/useT';
import { useSelectionBlocks } from './hooks/useSelectionBlocks';
import { useKeyboard } from './hooks/useKeyboard';
import { useData } from './hooks/useData';
import { navigate, useRoute, type Route } from './hooks/useRoute';
import { rootItems } from './store/selectors';
import { detectConflicts } from './domain/conflicts';
import { useParentEstimates } from './hooks/useParentEstimates';
import { anytimeItems, bucketOf, hasLabel, somedayItems, upcomingItems, weekItems } from './domain/views';
import { effectiveEstimate } from './domain/estimates';
import type { Item } from './domain/types';
import type { TranslationKey } from './i18n';

export function App() {
  const { t } = useT();
  const ready = useStore((s) => s.ready);
  const connected = useStore((s) => s.connected);
  const init = useStore((s) => s.init);
  const startPolling = useStore((s) => s.startPolling);
  const locale = useStore((s) => s.prefs.locale);
  const homepage = useStore((s) => s.prefs.homepage);
  const theme = useStore((s) => s.prefs.theme);
  const accent = useStore((s) => s.prefs.accent);
  const accentCustom = useStore((s) => s.prefs.accentCustom);
  const taskChips = useStore((s) => s.prefs.taskChips);
  const layout = useStore((s) => s.prefs.layout);
  const background = useStore((s) => s.prefs.background);
  const userId = useStore((s) => s.snapshot.user?.id);
  const demo = useStore((s) => s.demo);
  const walkthroughOpen = useStore((s) => s.walkthrough);
  const [tourOpen, setTourOpen] = useState(false);
  /* Null is the whole tour, for a new account. A list of versions is the tour
     of what an update brought, asked for from What's new: shorter, and with no
     first-run dialog after it. */
  const [tourVersions, setTourVersions] = useState<string[] | null>(null);
  const [onboardingStarted, setOnboardingStarted] = useState(false);
  const setupDone = useStore((s) => s.prefs.setupDone);
  const setupAsked = useRef(false);
  const setWalkthrough = useStore((s) => s.setWalkthrough);
  const beginTourPreview = useStore((s) => s.beginTourPreview);
  const endTourPreview = useStore((s) => s.endTourPreview);
  const toasts = useStore((s) => s.toasts);
  const dismissToast = useStore((s) => s.dismissToast);
  const syncState = useStore((s) => s.syncState);
  const whatsNewOn = useStore((s) => s.prefs.whatsNew);
  const seenVersion = useStore((s) => s.prefs.seenVersion);
  const setPrefs = useStore((s) => s.setPrefs);
  const [whatsNew, setWhatsNew] = useState<WhatsNewScope | null>(null);
  /** The account's own settings have been read at least once since loading. */
  const storage = useStore((s) => s.prefs.estimateStorage);
  const onboarded = useStore((s) => s.prefs.onboarded);
  const [storageDismissed, setStorageDismissed] = useState<string | null>(null);
  const [settled, setSettled] = useState(false);
  const [conversionRequest, setConversionRequest] = useState({ target: 'tag' as 'tag' | 'duration', request: 0 });
  const syncing = useRef(false);

  const route = useRoute();
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  /** What was typed on the page before the search took it. */
  const [searchSeed, setSearchSeed] = useState('');
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [issuesOpen, setIssuesOpen] = useState(false);
  /* One right-hand panel at a time (Insights, I have time): which one is open
     is the store's to say, so opening one closes the other. */
  const insightsOpen = useStore((s) => s.sidePanel === 'insights');
  // The page makes room for Insights when the layout puts the panel beside it.
  useEffect(() => {
    document.documentElement.classList.toggle('insights-open', insightsOpen);
    return () => document.documentElement.classList.remove('insights-open');
  }, [insightsOpen]);
  const openSidePanel = useStore((s) => s.openSidePanel);
  const closeSidePanel = useStore((s) => s.closeSidePanel);
  const setInsightsOpen = (open: boolean) =>
    (open ? openSidePanel('insights') : closeSidePanel('insights'));
  /* Not a boolean: what the sheet was opened to do — create one here, or edit
     that one — is carried by the open state itself. */
  const [projectSheet, setProjectSheet] = useState<ProjectSheetTarget>(null);
  const [unestimatedOpen, setUnestimatedOpen] = useState(false);
  const [shareProject, setShareProject] = useState<string | null>(null);
  useEffect(() => {
    const open = (event: Event) =>
      setShareProject((event as CustomEvent<{ projectId: string }>).detail.projectId);
    window.addEventListener('enhanced:share', open);
    return () => window.removeEventListener('enhanced:share', open);
  }, []);
  /** The sidebar, shown as a page. There is no room for a column on a phone. */
  const [browseOpen, setBrowseOpen] = useState(false);
  /** Where a newly composed task should land, when it was added from a section. */
  const [placement, setPlacement] = useState<ComposerPlacement>({});

  /* A task opened as a panel behaves like Insights: beside the page, which makes room for it, not
     over it behind a veil. */
  const taskAsPanel = useStore((s) => s.prefs.taskOpen === 'panel');
  useEffect(() => {
    const on = taskAsPanel && openTaskId !== null;
    document.documentElement.classList.toggle('panel-open', on);
    return () => document.documentElement.classList.remove('panel-open');
  }, [taskAsPanel, openTaskId]);

  useEffect(() => { void init(); }, [init]);
  useParentEstimates();

  /* A task or a project made before Todoist answered is opened under its
     temporary id. When the answer lands — after reconnecting, most of all —
     the panel and the address follow it to the real one instead of pointing
     at something that no longer exists. */
  const resolvedIds = useStore((s) => s.resolvedIds);
  useEffect(() => {
    if (openTaskId && resolvedIds[openTaskId]) setOpenTaskId(resolvedIds[openTaskId]);
  }, [openTaskId, resolvedIds]);
  useEffect(() => {
    const id = route.id && resolvedIds[route.id];
    const sectionId = route.sectionId && resolvedIds[route.sectionId];
    if (id || sectionId) {
      navigate(route.view, id || route.id, { sectionId: sectionId || route.sectionId });
    }
  }, [route.view, route.id, route.sectionId, resolvedIds]);
  useEffect(() => {
    if (!tourOpen) return;
    beginTourPreview();
    return endTourPreview;
  }, [tourOpen, beginTourPreview, endTourPreview]);

  /* The address bar wins, always — a shared or reopened link must land where
     it says. The homepage only fills in when there is nothing to obey. */
  useEffect(() => {
    if (ready && !window.location.hash.replace(/^#\/?/, '')) navigate(homepage);
  }, [ready, homepage]);
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  /* The scheme that ended up on the page, light or dark, kept in state. With
     Theme on System the preference stays "system" while the device flips
     between the two at sunset, so it cannot be what tells the accent to run
     again: a custom accent kept the family made for light surfaces after the
     page had gone dark (#124). */
  const [scheme, setScheme] = useState<'light' | 'dark'>(
    () => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
  );
  useEffect(() => applyTheme(theme, setScheme), [theme]);
  /* Also on `scheme`: a custom accent is two families, and which one is
     written depends on the scheme that ended up resolved. */
  useEffect(() => applyAccent(accent, accentCustom), [accent, accentCustom, scheme]);
  useEffect(() => { document.documentElement.dataset.chips = taskChips; }, [taskChips]);
  /* The frame, written on <html> like the theme and for the same reason: the
     stylesheet decides what each choice looks like, and theme-boot.js reads
     the copy kept in storage so the first paint is already the right one. */
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.layout = layout;
    root.dataset.background = background;
    try {
      localStorage.setItem('layout', layout);
      localStorage.setItem('background', background);
    } catch { /* storage may be blocked */ }
  }, [layout, background]);
  useEffect(() => (connected ? startPolling() : undefined), [connected, startPolling]);
  useEffect(() => {
    const replay = () => setWalkthrough(true);
    const tour = () => {
      navigate('week');
      /* Closed first, so asking again while one is somehow still up starts it afresh rather than doing nothing. */
      setTourOpen(false);
      window.setTimeout(() => { setTourVersions(null); setTourOpen(true); }, 60);
    };
    window.addEventListener('enhanced:replay-onboarding', replay);
    window.addEventListener('enhanced:tour', tour);
    return () => {
      window.removeEventListener('enhanced:replay-onboarding', replay);
      window.removeEventListener('enhanced:tour', tour);
    };
  }, [setWalkthrough]);

  /* Signing out does not unmount this component, so what it remembered of the
     last session would keep the next one — the demo again, or another account —
     from getting its own first run (#6). */
  useEffect(() => {
    if (!connected && !demo) { setOnboardingStarted(false); setupAsked.current = false; }
  }, [connected, demo]);

  /* The first run — for a real account that has not had one, and for the demo,
     which is where most people meet this app first and is exactly where a tour
     has something to point at.

     Opened here and closed by the dialog, so asking for it again from Settings
     goes through the same door. */
  useEffect(() => {
    /* Not while the tour runs: it swaps in the demo's snapshot, whose user
       is nobody this browser has set up, and that looked like a first run (#4). */
    if (!QUICK_ADD && !tourOpen && ready && (connected || demo) && !hasOnboarded(userId) && !onboardingStarted) {
      setOnboardingStarted(true);
      /* Somebody meeting the app for the first time is getting the tour; a
         list of what changed since a version they never used is not news. */
      if (!demo) setPrefs({ seenVersion: VERSION });
      navigate('week');
      setWalkthrough(true);
    }
  }, [ready, connected, demo, userId, tourOpen, onboardingStarted, setPrefs, setWalkthrough]);

  /* An account set up before 2.0 is asked once for the choices that came with
     it (the look, the sidebar, what a task shows). Not the demo, which only
     ever has the first run, and not before the account's own settings have
     been read, or a second browser would ask what the first already did. */
  useEffect(() => {
    if (QUICK_ADD || tourOpen || !ready || !connected || demo || !settled || !hasOnboarded(userId)) return;
    if (setupDone || setupAsked.current) return;
    setupAsked.current = true;
    setWalkthrough(true);
  }, [ready, connected, demo, settled, userId, tourOpen, setupDone, setWalkthrough]);

  /* The first sync after loading is what brings the account's settings — and
     with them the version already seen on another device. Asked before it,
     every new browser would announce a release the account had already read
     about elsewhere. */
  useEffect(() => {
    if (syncState === 'syncing') syncing.current = true;
    else if (syncing.current && syncState === 'idle') setSettled(true);
  }, [syncState]);

  /* What's new, once per release (#115, #148). Never on
     top of the first run, and never in the demo, which has no account to
     remember having shown it. */
  useEffect(() => {
    if (QUICK_ADD || !ready || !connected || demo || !settled || !hasOnboarded(userId)) return;
    if (tourOpen || walkthroughOpen || whatsNew || !setupDone) return;
    if (seenVersion === VERSION) return;
    let cancelled = false;
    void import('../CHANGELOG.md?raw').then(({ default: source }) => {
      if (cancelled) return;
      const unseen = unseenReleases(parseChangelog(source), VERSION, seenVersion);
      if (whatsNewOn && hasChanges(unseen)) {
        setWhatsNew({ versions: unseen.map((release) => release.version) });
      } else {
        // Nothing new to say, or not wanted: this release counts as read.
        setPrefs({ seenVersion: VERSION });
      }
    });
    return () => { cancelled = true; };
  }, [ready, connected, demo, settled, userId, tourOpen, walkthroughOpen, whatsNew,
    seenVersion, whatsNewOn, setPrefs, setupDone]);

  const storageOpen = shouldAskEstimateStorage({
    ready: ready && connected && Boolean(userId), settled, demo, quickAdd: QUICK_ADD,
    onboarded: onboarded || hasOnboarded(userId), storage,
    busy: tourOpen || walkthroughOpen || Boolean(whatsNew) || seenVersion !== VERSION,
    dismissed: storageDismissed === userId,
  });

  /* Settings opens the whole history. With `detail.versions` the same event
     opens the window as an update would, for those releases only: how the
     "Show me" button is reached without an update to make. */
  useEffect(() => {
    const show = (event: Event) => {
      const versions = (event as CustomEvent<{ versions?: string[] } | null>).detail?.versions;
      setWhatsNew(Array.isArray(versions) ? { versions } : 'all');
    };
    window.addEventListener('enhanced:changelog', show);
    return () => window.removeEventListener('enhanced:changelog', show);
  }, []);

  if (!ready) {
    return <div className="connect"><p className="empty">{t('common.loading')}</p></div>;
  }

  if (!connected) {
    return <ConnectView />;
  }

  if (QUICK_ADD) return <QuickAdd />;

  /* Until the first sync says whether this account still owes its Setup, a
     neutral screen rather than the views, which the Setup would then cover a
     few seconds later (#7). An account this browser already knows as set up
     goes straight in; a failed sync shows the app and its error. */
  const setupUnknown = !demo && !tourOpen && !settled && !walkthroughOpen && syncState !== 'error'
    && (!userId || !hasOnboarded(userId) || !setupDone);
  if (setupUnknown) {
    return (
      <div className="connect gettingready" role="status" aria-live="polite">
        <p>{t('common.gettingReady')}</p>
        <div className="readybar" aria-hidden="true"><span /></div>
      </div>
    );
  }

  return (
    <>
      <ConfirmProvider>
        <DragProvider>
          <AppShell
            route={route}
            openTaskId={openTaskId}
            setOpenTaskId={setOpenTaskId}
            composerOpen={composerOpen}
            setComposerOpen={setComposerOpen}
            searchOpen={searchOpen}
            setSearchOpen={setSearchOpen}
            searchSeed={searchSeed}
            openSearch={(seed) => { setSearchSeed(seed); setSearchOpen(true); }}
            shortcutsOpen={shortcutsOpen}
            setShortcutsOpen={setShortcutsOpen}
            issuesOpen={issuesOpen}
            setIssuesOpen={setIssuesOpen}
            insightsOpen={insightsOpen}
            setInsightsOpen={setInsightsOpen}
            projectSheet={projectSheet}
            setProjectSheet={setProjectSheet}
            unestimatedOpen={unestimatedOpen}
            setUnestimatedOpen={setUnestimatedOpen}
            browseOpen={browseOpen}
            setBrowseOpen={setBrowseOpen}
            placement={placement}
            setPlacement={setPlacement}
          />
        </DragProvider>
      </ConfirmProvider>

      {/* Outside the shell, and above it. The choices it offers change the
          page behind it, which is the point of showing them here. */}
      <EstimateStorageDialog onConvert={(target) => setConversionRequest((previous) => ({ target, request: previous.request + 1 }))} open={storageOpen && !demo && !tourOpen && !walkthroughOpen && !whatsNew} onClose={() => { setStorageDismissed(userId ?? null); }} />
      <EstimateConversion target={conversionRequest.target} openRequest={conversionRequest.request} hideTrigger />
      <ShareSheet projectId={shareProject} onClose={() => setShareProject(null)} />
      <Walkthrough
        open={walkthroughOpen}
        onDone={() => setWalkthrough(false)}
        onTour={() => {
          /* At once, in the same breath as the setup closing: a gap between the two is
             where "What's new" used to slip in on top of the tour. */
          navigate('week');
          setTourVersions(null);
          setTourOpen(true);
        }}
      />
      <Tour
        open={tourOpen}
        versions={tourVersions}
        onDone={() => {
          setTourOpen(false);
          setTourVersions(null);
        }}
      />
      <WhatsNew
        scope={whatsNew}
        onClose={() => {
          if (whatsNew !== 'all') setPrefs({ seenVersion: VERSION });
          setWhatsNew(null);
        }}
        onShowMe={(versions) => {
          // Read, as closing it is; then the tour of what was in it, on My week.
          setPrefs({ seenVersion: VERSION });
          setWhatsNew(null);
          navigate('week');
          setTourVersions(versions);
          window.setTimeout(() => setTourOpen(true), 100);
        }}
      />

      {/* Both lanes are always in the page, empty when there is nothing to
          say: a live region has to exist before its text is put in, or most
          screen readers never read it (#136). A confirmation waits its turn
          (`status`); a refusal from Todoist is read out at once (`alert`).
          Only what was added is read, not the whole lane again. The stack
          looks the same as it always did. */}
      <div className="toasts">
        {(['status', 'alert'] as const).map((lane) => (
          <div
            className="toastlane"
            key={lane}
            role={lane}
            aria-live={lane === 'alert' ? 'assertive' : 'polite'}
            aria-atomic="false"
          >
            {toasts.filter((toast) => (toast.tone === 'error') === (lane === 'alert')).map((toast) => (
              <div className="toast" key={toast.id}>
                <span>{toast.message}</span>
                {toast.undo && (
                  <button
                    aria-label={`${t('common.undo')} — ${toast.message}`}
                    onClick={() => { toast.undo?.(); dismissToast(toast.id); }}
                  >
                    {t('common.undo')}
                  </button>
                )}
                {/* Only puts the toast away. What Undo would do stays reachable
                    with ⌘Z, and a deletion still goes out when its own wait is
                    over: closing it neither sends it early nor cancels it. */}
                <button
                  className="toastclose"
                  aria-label={t('common.close')}
                  onClick={() => dismissToast(toast.id)}
                >
                  <Icon name="close" size="sm" />
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

interface ShellProps {
  route: Route;
  openTaskId: string | null;
  setOpenTaskId: (id: string | null) => void;
  composerOpen: boolean;
  setComposerOpen: (open: boolean) => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  /** What had already been typed when the search was opened by typing. */
  searchSeed: string;
  openSearch: (seed: string) => void;
  shortcutsOpen: boolean;
  setShortcutsOpen: (open: boolean) => void;
  issuesOpen: boolean;
  setIssuesOpen: (open: boolean) => void;
  insightsOpen: boolean;
  setInsightsOpen: (open: boolean) => void;
  projectSheet: ProjectSheetTarget;
  setProjectSheet: (target: ProjectSheetTarget) => void;
  unestimatedOpen: boolean;
  setUnestimatedOpen: (open: boolean) => void;
  browseOpen: boolean;
  setBrowseOpen: (open: boolean) => void;
  placement: ComposerPlacement;
  setPlacement: (placement: ComposerPlacement) => void;
}

export interface ComposerPlacement {
  projectId?: string;
  sectionId?: string;
  date?: string;
  labels?: string[];
  priority?: 1 | 2 | 3 | 4;
}

/**
 * Writes a concrete light or dark scheme onto the document.
 *
 * The stylesheet is never asked what the device prefers: `data-theme` always
 * names one of the two real themes, and resolving "system" — including
 * following the device when it changes its mind mid-session — happens here.
 * One place decides, so there is one dark palette rather than two that drift.
 *
 * Every time the scheme is resolved it is also reported, so what is derived
 * from it (a custom accent) is redone when the device changes its mind.
 *
 * The resolved choice is mirrored into local storage because index.html reads
 * it before the first paint. Without that the page opens white and turns dark
 * a moment later, once preferences have loaded out of IndexedDB.
 */
function applyTheme(
  theme: Theme, onResolved: (scheme: 'light' | 'dark') => void,
): (() => void) | undefined {
  const root = document.documentElement;
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const apply = () => {
    const resolved = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme;
    root.dataset.theme = resolved;
    onResolved(resolved);
    try { localStorage.setItem('theme', theme); } catch { /* storage may be blocked */ }
    paintBrowserChrome();
  };
  apply();
  // Only "system" is a standing question. A fixed choice has nothing to listen for.
  if (theme !== 'system') return undefined;
  media.addEventListener('change', apply);
  return () => media.removeEventListener('change', apply);
}

/**
 * Writes the chosen brand colour onto the document.
 *
 * Only the name travels. Which nine values that name stands for — and which
 * of its two schemes applies — is the stylesheet's business, which is what
 * keeps a green accent from being a green mark on surfaces still tinted red.
 */
function applyAccent(accent: Accent, custom: string): void {
  const root = document.documentElement;
  root.dataset.accent = accent;

  /* A named accent is nine families already written in the stylesheet. A
     custom one is built here, by the same recipe, and set as inline custom
     properties — which is also why they are cleared again on the way out, or
     the last custom colour would keep overriding the named one. */
  for (const token of ACCENT_TOKENS) root.style.removeProperty(`--${token}`);

  const hsl = accent === 'custom' ? hexToHsl(custom) : null;
  if (hsl) {
    const scheme = root.dataset.theme === 'dark' ? 'dark' : 'light';
    for (const [token, value] of Object.entries(accentFamily(custom, scheme))) {
      root.style.setProperty(`--${token}`, value);
    }
  }

  /* The coloured background is drawn from whatever `--accent` ended up being,
     read back off the page so named and custom colours go through one door. */
  const backdrop = backdropGradient(getComputedStyle(root).getPropertyValue('--accent').trim());
  root.style.setProperty('--back-gradient', backdrop);

  try {
    localStorage.setItem('backdrop', backdrop);
    localStorage.setItem('accent', accent);
    localStorage.setItem('accentCustom', custom);
    /* Both schemes, because index.html has to write these before the first
       paint and cannot run the recipe. It picks the one it needs once it has
       resolved the theme, the same way this function just did. */
    localStorage.setItem('accentVars', hsl
      ? JSON.stringify({
        light: accentFamily(custom, 'light'),
        dark: accentFamily(custom, 'dark'),
      })
      : '');
  } catch { /* storage may be blocked */ }
  paintBrowserChrome();
}

/**
 * Hands the accent to the browser's own chrome — the address bar on Android,
 * the task switcher, the title bar of an installed window.
 *
 * Read back off the document rather than mapped here, so there is still only
 * one place that knows what a colour name means. The manifest's `theme_color`
 * cannot follow: it is a static file read at install time, so it keeps the
 * default red and names the app rather than this device's preference.
 */
function paintBrowserChrome(): void {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) return;
  const accent = getComputedStyle(document.documentElement)
    .getPropertyValue('--accent').trim();
  if (accent) meta.setAttribute('content', accent);
}

/** The pages that list tasks to work through, which is where "I have time" is offered (#159). */
const TIME_PAGES = new Set<Route['view']>(['week', 'today', 'project', 'label', 'inbox', 'someday']);

function AppShell({
  route, openTaskId, setOpenTaskId, composerOpen, setComposerOpen,
  searchOpen, setSearchOpen, searchSeed, openSearch, shortcutsOpen, setShortcutsOpen,
  issuesOpen, setIssuesOpen,
  insightsOpen, setInsightsOpen, projectSheet, setProjectSheet,
  unestimatedOpen, setUnestimatedOpen, browseOpen, setBrowseOpen,
  placement, setPlacement,
}: ShellProps) {
  const { t } = useT();
  const { snapshot, items, childrenOf } = useData();
  const conflictSettings = useStore((s) => s.prefs.conflicts);
  const demo = useStore((s) => s.demo);
  const sidebarCollapsed = useStore((s) => s.prefs.sidebarCollapsed);
  const weekLayout = useStore((s) => s.prefs.weekLayout);
  const density = useStore((s) => s.prefs.density);
  const leaveDemo = useStore((s) => s.disconnect);
  const clearSelection = useStore((s) => s.clearSelection);

  const roots = useMemo(() => rootItems(items), [items]);
  const snapshotForBell = useStore((s) => s.snapshot);
  const conflictCount = useMemo(
    () => detectConflicts(roots, childrenOf, conflictSettings).length + unreadCount(snapshotForBell),
    [roots, childrenOf, conflictSettings, snapshotForBell],
  );

  /** Whatever the page in front is showing, so the dialogs never describe another one. */
  const { contextItems, contextLabel } = useMemo(() => {
    switch (route.view) {
      case 'project': {
        const project = route.id ? snapshot.projects[route.id] : undefined;
        return {
          contextItems: roots.filter((i) => i.project_id === route.id),
          contextLabel: project?.name ?? t('nav.projects'),
        };
      }
      case 'label':
        return {
          contextItems: route.id ? roots.filter((i) => hasLabel(i, route.id!)) : [],
          contextLabel: route.id ?? '',
        };
      case 'week':
        return {
          /* The page's own scope, or the header and every dialog opened from
             it would describe a week this page is not showing. */
          contextItems: weekLayout === 'split' ? anytimeItems(roots) : weekItems(roots),
          contextLabel: t('nav.week'),
        };
      case 'today': {
        const now = new Date();
        return {
          contextItems: roots.filter((i) => {
            const bucket = bucketOf(i, now);
            return bucket === 'overdue' || bucket === 'today';
          }),
          contextLabel: t('nav.today'),
        };
      }
      case 'upcoming':
        return { contextItems: upcomingItems(roots), contextLabel: t('nav.upcoming') };
      case 'review':
        return { contextItems: weekItems(roots), contextLabel: t('nav.review') };
      case 'someday':
        return { contextItems: somedayItems(roots), contextLabel: t('nav.someday') };
      case 'inbox': {
        const inboxId = snapshot.user?.inbox_project_id;
        return {
          contextItems: inboxId ? roots.filter((i) => i.project_id === inboxId) : [],
          contextLabel: t('nav.inbox'),
        };
      }
      case 'matrix':
        return { contextItems: roots, contextLabel: t('nav.matrix') };
      default:
        return { contextItems: roots, contextLabel: t(`nav.${route.view}` as TranslationKey) };
    }
  }, [route, roots, snapshot.projects, snapshot.user?.inbox_project_id, t, weekLayout]);

  const unestimatedItems = useMemo(
    () => contextItems.filter((i) => effectiveEstimate(i, childrenOf).minutes === null),
    [contextItems, childrenOf],
  );
  /* The estimate pass is for the page in front, unless something else names
     the tasks: the "I have time" panel hands over the ones it set aside. */
  const [unestimatedFor, setUnestimatedFor] = useState<Item[] | null>(null);

  /* Every way out of the browse page is a navigation, so one effect closes it
     rather than each of its thirty buttons remembering to. */
  useEffect(() => setBrowseOpen(false), [route.view, route.id, route.sectionId, setBrowseOpen]);

  /* The "I have time" panel answers about the page it is on. A page with no
     pill for it (Upcoming, Insights, the review) has nothing to ask it of, so
     going there puts the panel away rather than leaving it over a page it
     cannot speak for. The duration is kept for when you come back. */
  const closeSidePanel = useStore((s) => s.closeSidePanel);
  useEffect(() => {
    if (!TIME_PAGES.has(route.view)) closeSidePanel('time');
  }, [route.view, closeSidePanel]);

  /* A selection belongs to the page it was made on. Carrying it to the next
     one would leave a bar offering to delete tasks that are no longer shown. */
  useEffect(() => clearSelection(), [route.view, route.id, route.sectionId, clearSelection]);
  useEffect(() => {
    const onBackground = (event: MouseEvent) => {
      if (document.querySelector('[role="dialog"]')) return;
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
      const target = event.target as Element | null;
      if (!target || target.closest('[data-task-id], .bulkbar, [role="dialog"], .popover, .datepanel, .fselect-list, button, a, input, textarea, select')) return;
      clearSelection();
    };
    document.addEventListener('click', onBackground, true);
    return () => document.removeEventListener('click', onBackground, true);
  }, [clearSelection]);


  useEffect(() => {
    document.querySelector<HTMLElement>('.screen.active')?.scrollTo({ top: 0 });
  }, [route.view, route.id]);

  /**
   * Whether the page's own heading has scrolled out of sight.
   *
   * Watched rather than measured on every scroll: the question is only ever
   * "is that element still on the screen", which is the one question an
   * intersection observer answers without running anything while nothing is
   * happening.
   */
  const [titleShown, setTitleShown] = useState(false);
  useEffect(() => {
    const screen = document.querySelector('.screen.active');
    const heading = screen?.querySelector('.ptitle');
    if (!screen || !heading) { setTitleShown(false); return; }
    const watch = new IntersectionObserver(
      ([entry]) => setTitleShown(!entry.isIntersecting),
      { root: screen, threshold: 0 },
    );
    watch.observe(heading);
    return () => watch.disconnect();
    // A new page brings a new heading to watch.
  }, [route.view, route.id]);

  const openTask = (id: string) => setOpenTaskId(id);
  const addTask = () => {
    setPlacement(route.view === 'project' && route.id ? { projectId: route.id } : {});
    setComposerOpen(true);
  };

  /* Every key the app answers, in one listener. It is called here rather than
     in `App` because deleting a task asks for confirmation, and the dialog
     that asks lives inside this shell. */
  useSelectionBlocks();
  useKeyboard({
    openTask,
    openSearch,
    openComposer: addTask,
    openShortcuts: () => setShortcutsOpen(true),
  });
  const addTaskTo = (next: ComposerPlacement) => {
    setPlacement(next);
    setComposerOpen(true);
  };
  const openInsights = () => setInsightsOpen(true);
  const openUnestimated = (tasks?: Item[]) => {
    // A click hands its event to whatever it calls: only a list is a list.
    setUnestimatedFor(Array.isArray(tasks) ? tasks : null);
    setUnestimatedOpen(true);
  };
  const viewProps = {
    onOpen: openTask,
    onInsights: openInsights,
    onUnestimated: openUnestimated,
    onAddTaskTo: addTaskTo,
    onProjectSheet: setProjectSheet,
  };

  return (
    <div
      className={`app${demo ? ' demo' : ''}${sidebarCollapsed ? ' collapsed' : ''}`}
      data-density={density}
    >
      {demo && (
        <div className="demobanner" role="status">
          <Icon name="warning" size="sm" />
          <span>{t('demo.banner')}</span>
          <button onClick={() => void leaveDemo()}>{t('demo.exit')}</button>
        </div>
      )}
      <Sidebar
        route={route}
        onAddTask={addTask}
        onSearch={() => setSearchOpen(true)}
        onIssues={() => setIssuesOpen(true)}
        onProjectSheet={setProjectSheet}
        issuesCount={conflictCount}
      />

      <main className="workspace">
        <header className="mobile-top">
          {/* This opened My week, whatever it said. It opens the navigation. */}
          <button
            className="iconbtn"
            aria-label={t('nav.openNavigation')}
            onClick={() => setBrowseOpen(true)}
          >
            <Icon name="menu" />
          </button>
          {/* The page names itself twice on a phone — once in this bar and once
              as the heading under it — which costs a row of a short screen to
              say nothing. The bar holds the name back until the heading has
              scrolled away, which is the same title arriving where it is
              needed rather than a second one standing beside it. */}
          <strong className={titleShown ? ' shown' : ''}>{contextLabel}</strong>
          <button className="iconbtn" aria-label={t('nav.search')} onClick={() => setSearchOpen(true)}>
            <Icon name="search" />
          </button>
        </header>

        <section className="screen active">
          {route.view === 'week' && (
            <WeekView {...viewProps} scope={weekLayout === 'split' ? 'anytime' : 'all'} />
          )}
          {route.view === 'today' && <WeekView {...viewProps} scope="today" />}
          {route.view === 'upcoming' && <UpcomingView {...viewProps} />}
          {route.view === 'someday' && <SimpleListView kind="someday" {...viewProps} />}
          {route.view === 'inbox' && <SimpleListView kind="inbox" {...viewProps} />}
          {route.view === 'label' && route.id && (
            <SimpleListView kind="label" labelName={route.id} {...viewProps} />
          )}
          {route.view === 'labels' && <LabelsView />}
          {route.view === 'matrix' && (
            <EisenhowerView onOpen={openTask} onUnestimated={openUnestimated} />
          )}
          {route.view === 'project' && route.id && (
            <ProjectView projectId={route.id} revealSectionId={route.sectionId} {...viewProps} />
          )}
          {route.view === 'review' && <ReviewView onOpen={openTask} />}
          {route.view === 'insights' && <InsightsView onOpen={openTask} />}
          {route.view === 'settings' && <SettingsView />}
        </section>

        <nav className="mobile-nav" aria-label={t('nav.projects')}>
          <button
            aria-current={route.view === 'inbox' ? 'page' : undefined}
            onClick={() => navigate('inbox')}
          >
            <Icon name="inbox" size="lg" />
            {t('nav.inbox')}
          </button>
          <button
            aria-current={route.view === 'week' ? 'page' : undefined}
            onClick={() => navigate('week')}
          >
            <Icon name="week" size="lg" />
            {t('nav.week')}
          </button>
          <button className="fab" aria-label={t('nav.addTask')} onClick={addTask}>
            {/* The stylesheet paints the round accent disc on this wrapper. */}
            <i><Icon name="plus" /></i>
          </button>
          <button
            aria-current={route.view === 'upcoming' ? 'page' : undefined}
            onClick={() => navigate('upcoming')}
          >
            <Icon name="upcoming" size="lg" />
            {t('nav.upcoming')}
          </button>
          {/* Browse was here and in the bar at the top of every page, which is
              one destination taking two of the five places a phone has. It
              stays at the top, where a burger menu is on every phone, and the
              slot it gives up goes to a destination: Someday, which was
              otherwise two taps away behind that same menu. */}
          <button
            aria-current={route.view === 'someday' ? 'page' : undefined}
            onClick={() => navigate('someday')}
          >
            <Icon name="someday" size="lg" />
            {t('nav.someday')}
          </button>
        </nav>
      </main>

      <Composer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        defaultProjectId={placement.projectId}
        defaultSectionId={placement.sectionId}
        defaultDate={placement.date}
        defaultLabels={placement.labels}
        defaultPriority={placement.priority}
      />
      <TaskDetail
        taskId={openTaskId}
        onClose={() => setOpenTaskId(null)}
        onOpen={openTask}
      />
      <Issues open={issuesOpen} onClose={() => setIssuesOpen(false)} onOpen={openTask} />
      <Search
        open={searchOpen}
        seed={searchSeed}
        onClose={() => setSearchOpen(false)}
        onOpen={openTask}
      />
      <Shortcuts open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <ProjectSheet target={projectSheet} onClose={() => setProjectSheet(null)} />

      {/* The same sidebar, as a page. One list of destinations, not two that
          have to be kept in step. */}
      <Overlay
        open={browseOpen}
        onClose={() => setBrowseOpen(false)}
        label={t('nav.browse')}
        size="full"
      >
        <div className="browse">
          <div className="browse-head">
            <strong>{t('nav.browse')}</strong>
            <button
              className="iconbtn"
              aria-label={t('common.close')}
              onClick={() => setBrowseOpen(false)}
            >
              <Icon name="close" />
            </button>
          </div>
          <Sidebar
            route={route}
            variant="sheet"
            onAddTask={() => { setBrowseOpen(false); addTask(); }}
            onSearch={() => { setBrowseOpen(false); setSearchOpen(true); }}
            onIssues={() => { setBrowseOpen(false); setIssuesOpen(true); }}
            onProjectSheet={(target) => { setBrowseOpen(false); setProjectSheet(target); }}
            issuesCount={conflictCount}
          />
        </div>
      </Overlay>
      <Unestimated
        open={unestimatedOpen}
        onClose={() => { setUnestimatedOpen(false); setUnestimatedFor(null); }}
        items={unestimatedFor ?? unestimatedItems}
        onOpen={openTask}
      />
      <BulkBar />

      <InsightsPanel
        open={insightsOpen}
        onClose={() => setInsightsOpen(false)}
        contextLabel={contextLabel}
        items={contextItems}
        onOpenTask={openTask}
      />
    </div>
  );
}
