import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import { useT } from '@/hooks/useT';
import { archFromHint, isMacComputer, type MacArch } from '@/domain/macApp';
import { DEFAULT_QUICK_ADD_SHORTCUT, formatShortcut, shortcutFromPress } from '@/domain/shortcut';
import {
  MAC_APP_DOWNLOAD_URL, MAC_APP_INSTALL_URL, MAC_APP_RELEASES_URL, MAC_APP_URL,
} from '@/app-info';

/** What Chromium offers beyond the standard `navigator`. */
interface UserAgentData {
  platform?: string;
  getHighEntropyValues?: (hints: string[]) => Promise<{ architecture?: string }>;
}

/**
 * Whether this is a Mac, and which file it needs when the browser can say.
 *
 * `arch` stays null when it cannot: Safari and Firefox do not tell, and the
 * user agent says Intel on Apple silicon too. Nothing is shown inside the
 * desktop app itself, which sets `desktop-app` on <html> and would only be
 * offering itself.
 */
function useMacApp() {
  const [mac] = useState(() => {
    const data = (navigator as Navigator & { userAgentData?: UserAgentData }).userAgentData;
    return isMacComputer({ uaPlatform: data?.platform, platform: navigator.platform, maxTouchPoints: navigator.maxTouchPoints });
  });
  const [arch, setArch] = useState<MacArch | null>(null);

  useEffect(() => {
    if (!mac) return;
    const data = (navigator as Navigator & { userAgentData?: UserAgentData }).userAgentData;
    let live = true;
    data?.getHighEntropyValues?.(['architecture'])
      .then((values) => { if (live) setArch(archFromHint(values.architecture)); })
      .catch(() => { /* not sure: both files are offered */ });
    return () => { live = false; };
  }, [mac]);

  const inDesktopApp = document.documentElement.classList.contains('desktop-app');
  return { mac, arch, inDesktopApp };
}

/**
 * The "Mac app" card in Settings, About.
 *
 * The button does not download: it opens a call-out under itself that says
 * what macOS will ask for the first time, and the download is in there. The
 * page then scrolls to put the call-out in the middle, so the steps and the
 * button are both in view without hunting for them.
 */
export function MacAppCard() {
  const { t } = useT();
  const { mac, arch, inDesktopApp } = useMacApp();
  const [open, setOpen] = useState(false);
  const callout = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Once it has finished growing: centred while it is still folded would aim at nothing.
    const timer = window.setTimeout(
      () => callout.current?.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' }),
      reduced ? 0 : 380,
    );
    return () => window.clearTimeout(timer);
  }, [open]);

  if (inDesktopApp) return <QuickAddShortcut />;

  return (
    <div className="macapp" id="mac-app">
      <div className="macapp-text">
        <strong>{t('macApp.title')}</strong>
        <span>{t('macApp.about')}</span>
      </div>
      {mac ? (
        <>
          <div className="macapp-actions">
            <button
              type="button"
              className="btn primary"
              aria-expanded={open}
              aria-controls="mac-app-callout"
              onClick={() => setOpen((v) => !v)}
            >
              {t('macApp.download')}
              <Icon name={open ? 'caret-up' : 'caret'} size="sm" />
            </button>
          </div>
          {/* React 18's types do not know `inert` yet; the browser does. */}
          <div className={`macfold${open ? ' open' : ''}`} {...({ inert: open ? undefined : '' } as object)}>
            <div className="macfold-in">
              <div className="maccallout" id="mac-app-callout" ref={callout}>
                <strong>{t('macApp.steps')}</strong>
                <ol className="macapp-steps">
                  <li>{t('macApp.step1')}</li>
                  <li>{t('macApp.step2')}</li>
                  <li>{t('macApp.step3')}</li>
                </ol>
                <div className="macapp-actions">
                  {arch ? (
                    <a className="btn primary" href={MAC_APP_DOWNLOAD_URL[arch]}>{t('macApp.downloadFile')}</a>
                  ) : (
                    <>
                      <a className="btn primary" href={MAC_APP_DOWNLOAD_URL.arm64}>{t('macApp.appleSilicon')}</a>
                      <a className="btn soft" href={MAC_APP_DOWNLOAD_URL.x64}>{t('macApp.intel')}</a>
                    </>
                  )}
                </div>
                <p className="macapp-help">
                  {arch
                    ? <a href={MAC_APP_RELEASES_URL} target="_blank" rel="noreferrer noopener">{t('macApp.otherMac')}</a>
                    : t('macApp.notSure')}
                  {' · '}
                  <a href={MAC_APP_INSTALL_URL} target="_blank" rel="noreferrer noopener">{t('macApp.moreDetails')}</a>
                </p>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="macapp-actions">
          <a className="btn soft" href={MAC_APP_URL} target="_blank" rel="noreferrer noopener">
            <Icon name="external" size="sm" />
            {t('macApp.onGitHub')}
          </a>
        </div>
      )}
    </div>
  );
}

/**
 * One quiet line under the sign-in buttons. Macs only.
 *
 * It points at the app's own page rather than at a file: a download straight
 * from here would skip the steps the card in Settings puts first.
 */
export function MacAppLine() {
  const { t } = useT();
  const { mac, inDesktopApp } = useMacApp();
  if (!mac || inDesktopApp) return null;

  return (
    <p className="macapp-line">
      {t('macApp.title')}
      {' · '}
      <a href={MAC_APP_URL} target="_blank" rel="noreferrer noopener">{t('macApp.lineLink')}</a>
    </p>
  );
}

/**
 * The Quick Add shortcut, inside the Mac app only.
 *
 * The page is always the newest, the shell around it is not: an app downloaded
 * before this existed has no way to change the shortcut, so it is told so, with
 * the way to get the new one, rather than being shown a button that does nothing.
 */
function QuickAddShortcut() {
  const { t } = useT();
  const bridge = window.enhancedDesktop;
  const supported = Boolean(bridge?.setQuickAddShortcut && bridge.getQuickAddShortcut);
  const [shortcut, setShortcut] = useState(DEFAULT_QUICK_ADD_SHORTCUT);
  const [recording, setRecording] = useState(false);
  /* The modifiers held while choosing, shown in the field itself as they go down. */
  const [held, setHeld] = useState('');
  const [problem, setProblem] = useState<'needsModifier' | 'taken' | null>(null);

  useEffect(() => {
    let live = true;
    bridge?.getQuickAddShortcut?.().then((current) => { if (live && current) setShortcut(current); }).catch(() => { /* the default stays */ });
    return () => { live = false; };
  }, [bridge]);

  const save = async (accelerator: string) => {
    const result = await bridge?.setQuickAddShortcut?.(accelerator);
    if (!result) return;
    setShortcut(result.shortcut);
    setProblem(result.ok ? null : 'taken');
  };

  useEffect(() => {
    if (!recording) return;
    const modifiers = (event: KeyboardEvent) => [event.ctrlKey && 'Control', event.altKey && 'Alt', event.shiftKey && 'Shift', event.metaKey && 'Command']
      .filter((part): part is string => Boolean(part)).join('+');
    const onKey = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.key === 'Escape') { setRecording(false); setProblem(null); return; }
      setHeld(formatShortcut(modifiers(event)));
      const press = shortcutFromPress(event);
      if (!press.ok) { setProblem(press.reason === 'modifier' ? 'needsModifier' : null); return; }
      setProblem(null);
      setRecording(false);
      void save(press.accelerator);
    };
    const onUp = (event: KeyboardEvent) => setHeld(formatShortcut(modifiers(event)));
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('keyup', onUp, true);
    return () => { window.removeEventListener('keydown', onKey, true); window.removeEventListener('keyup', onUp, true); setHeld(''); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `save` only reads the bridge.
  }, [recording]);

  return (
    <>
      {/* A settings row like the others: the name and what it does on the left, the control on the right. */}
      <div className="setrow quickshortcut">
        <div>
          <strong>{t('shortcut.title')}</strong>
          <span>{supported ? t('shortcut.about') : t('shortcut.old')}</span>
        </div>
        {supported ? (
          <div className="quickshortcut-control">
            {!recording && shortcut !== DEFAULT_QUICK_ADD_SHORTCUT && (
              <button type="button" className="quickshortcut-reset" onClick={() => { setProblem(null); void save(DEFAULT_QUICK_ADD_SHORTCUT); }}>{t('shortcut.reset')}</button>
            )}
            {/* The field is the control: press it, then press the keys. */}
            <button
              type="button"
              className={`quickshortcut-field${recording ? ' recording' : ''}`}
              aria-label={t('shortcut.title')}
              onClick={() => { setProblem(null); setRecording((on) => !on); }}
              onBlur={() => setRecording(false)}
            >
              {recording ? (held || <span className="quickshortcut-hint">{t('shortcut.press')}</span>) : formatShortcut(shortcut)}
            </button>
          </div>
        ) : (
          <a className="btn primary" href={MAC_APP_RELEASES_URL} target="_blank" rel="noreferrer noopener">{t('shortcut.download')}</a>
        )}
      </div>
      {problem && <p className="quickshortcut-problem" role="alert">{t(`shortcut.${problem}`)}</p>}
    </>
  );
}
