import { clearProjectPeopleCache } from './collab';
import { usePomodoro } from './pomodoro';
/** Talking to Todoist: signing in and out, reading, writing, the offline queue, the demo. */
import { verifyEstimateWrites } from './estimate-safety';
import { auth } from '@/api/auth';
import { completeSignIn } from '@/api/oauth';
import { ApiError, NotConnectedError } from '@/api/client';
import { applySync, applyWrite, sync } from '@/api/sync';
import { sendCommands, type Command } from '@/api/commands';
import { settleOrphans } from '@/api/repair';
import * as idb from '@/db/idb';
import { emptySnapshot, setWeekLabel } from '@/domain/types';
import { readKept } from '@/domain/views';
import { detectLocale, translate } from '@/i18n';
import { buildDemoSnapshot } from '@/demo/demoData';
import { sessionGet, sessionRemove, sessionSet } from '@/lib/sessionStore';
import { forgetDemoOnboarding } from '@/domain/onboarding';
import { defaultPreferences, hydratePreferences, readSettingsComment, type Preferences } from './prefs';
import {
  explainFailures, hidePending, partitionQueue, pendingDeletes, revertRefused, schedulePersist,
} from './helpers';
import {
  PREFS_KEY, preferencesWriteTimer, remotePreferences, tourSnapshotBackup, withOnboarding, fetchSettingsComments, settingsComments, legacySettingsTask,
} from './preferences';
import { DUST_KEY } from './dust';
import type { AppState } from './types';
import type { Slice, SyncSlice } from './types';
import { accountOnDevice, mayWriteAs } from '@/lib/accountWatch';
import { claimed, exclusive, holdOptimistic, reapplyWaiting } from './syncGate';
import { loadSyncLog, recordRefusal, recordSyncFailure } from './syncLog';
import { clearPrefsDirty, loadPrefsDirty } from './preferences';

/** How often the app asks Todoist what changed while the tab is in the foreground. */
export const POLL_INTERVAL_MS = 45_000;

/**
 * Reads that failed in a row. At this many, the next read starts from scratch
 * once, in case what Todoist refuses is the token the device kept (#466). One
 * fresh read per streak: a large account is not downloaded on every poll.
 */
export const FULL_READ_AFTER_FAILURES = 3;
let failureStreak = 0;
/** For tests. */
export function resetFailureStreak() { failureStreak = 0; }

/** A failed or unreadable settings lookup is not proof of a new account. */
export async function readAccountSettings(snapshot: ReturnType<typeof emptySnapshot>) {
  const cached = settingsComments(snapshot);
  if (cached.length > 0) return cached.every((note) => readSettingsComment(note.content)) ? snapshot : null;
  if (legacySettingsTask(snapshot)) return snapshot;
  const inbox = snapshot.user?.inbox_project_id;
  const comments = inbox ? await fetchSettingsComments(inbox) : null;
  if (comments === null || comments.some((note) => !readSettingsComment(note.content))) return null;
  const notes = { ...snapshot.notes };
  for (const old of settingsComments(snapshot)) delete notes[old.id];
  for (const note of comments) notes[note.id] = note;
  return { ...snapshot, notes };
}

/** Who a language repair is done for, and which language the account reads in. */
const repairAccount = (get: () => AppState) => {
  const user = get().snapshot.user;
  return { ...(user?.id ? { userId: user.id } : {}), ...(user?.lang ? { userLang: user.lang } : {}) };
};

/** Sends everything waiting in the outbox, oldest first. */
export async function flushQueue(
  get: () => AppState,
  set: (patch: Partial<AppState>) => void,
): Promise<boolean> {
  const queue = await idb.readQueue();
  await settleOrphans(
    { syncToken: get().snapshot.syncToken, ...repairAccount(get) },
    new Set(queue.map((cmd) => cmd.uuid)),
  ).catch(() => undefined);
  if (queue.length === 0) return false;

  /* A deletion written to the queue because the page was hidden is still
     pending while the page lives: it goes when its toast does, or never if it
     is undone. Only a relaunch, which has forgotten it, sends it from here. */
  const held = new Set<string>();
  for (const pending of pendingDeletes.values()) {
    for (const cmd of pending.commands) held.add(cmd.uuid);
  }
  /* A change made in another account is not this account's to send. After a
     sign-in `dropForeignQueue` has already decided; this is the second lock on
     the same door, for any other way of getting here (#129). It is left queued,
     not dropped: which account it belongs to is that function's call. */
  const account = get().snapshot.user?.id;
  /* A window that still believes in another account than the device's sends
     nothing: its token is the new account's, its changes the old one's. */
  if (!mayWriteAs(account, accountOnDevice())) return false;
  const commands: Command[] = queue
    .filter((cmd) => !held.has(cmd.uuid))
    // A write still sending these is their sender, not this flush (#468).
    .filter((cmd) => !claimed.has(cmd.uuid))
    .filter((cmd) => !cmd.userId || !account || cmd.userId === account)
    // The bookkeeping stays here: Todoist is sent the command and nothing else.
    .map(({ queuedAt: _q, attempts: _a, userId: _u, ...cmd }) => cmd);
  if (commands.length === 0) return false;
  try {
    const optimistic = get().snapshot;
    const result = await sendCommands(get().snapshot.syncToken, commands, repairAccount(get));
    let merged = applyWrite(get().snapshot, result.responses, result.mapping);
    if (result.error) recordSyncFailure('write', result.error);

    /* A refused creation takes its placeholder with it. A refused edit is
       harder: the queue does not remember what the screen showed before it,
       sometimes several reloads ago, so only a full read of Todoist can say
       what was kept. */
    let stale = false;
    /* Every refusal Todoist makes arrives here, in `failures`: `sendCommands`
       turns a refusal of a whole request into a failure of each command in it,
       and the batch still counts as delivered. So a refused change leaves the
       queue with the delivered ones instead of going out on every sync for
       ever, holding a pending count that never falls, and it is reported once
       below. */
    if (result.failures.length > 0) {
      const refused = new Set(result.failures.map((failure) => failure.uuid));
      const placeholders = commands.filter((cmd) => refused.has(cmd.uuid) && cmd.temp_id);
      if (placeholders.length > 0) {
        merged = revertRefused(merged, merged, placeholders, result.failures);
      }
      stale = commands.some((cmd) => refused.has(cmd.uuid) && !cmd.temp_id);
    }

    set({ snapshot: hidePending(reapplyWaiting(merged)), resolvedIds: { ...get().resolvedIds, ...result.mapping } });
    const safety = await verifyEstimateWrites(get, set, commands, result, optimistic);
    await idb.dequeue(result.delivered.filter((id) => !safety.pending.some((cmd) => cmd.uuid === id)));
    if (safety.pending.length > 0) await idb.updateQueued(safety.pending);
    if (result.undelivered.length > 0) await idb.updateQueued(result.undelivered);
    set({ pendingCount: (await idb.readQueue()).length });
    schedulePersist(get().snapshot);
    const failures = result.failures.filter((f) => !safety.handled.has(f.uuid));
    if (failures.length > 0) {
      recordRefusal('write', failures, commands.filter((cmd) => failures.some((f) => f.uuid === cmd.uuid)).map((cmd) => cmd.type));
      get().toast(
        explainFailures(failures, result.delivered.length, get().prefs.locale),
        undefined,
        { tone: 'error' },
      );
    }
    // A full read would wipe the placeholders of what is still waiting to go.
    return stale && get().pendingCount === 0;
  } catch (error) {
    /* Only the network can throw from here (see `failures` above), so this is
       always "still unreachable": the queue is left alone and retried later. */
    recordSyncFailure('write', error);
    return false;
  }
}

/**
 * After a sign-in: what was queued for another account is not sent.
 *
 * The outbox is kept when the credentials are refused, so the same person
 * signing in again loses nothing. A different account would send it with its
 * own token, and what it names would be refused in a burst, or created in the
 * wrong account. The person is told once how many changes were left out.
 * Called with the account that has just signed in, once it is known. Says how
 * many changes are still waiting to go.
 */
export async function dropForeignQueue(
  get: () => AppState,
  set: (patch: Partial<AppState>) => void,
  userId: string | undefined,
  legacyOwner: string | null | undefined,
): Promise<number> {
  const queue = await idb.readQueue();
  if (!userId || queue.length === 0) return queue.length;
  const { foreign } = partitionQueue(queue, userId, legacyOwner);
  if (foreign.length === 0) return queue.length;
  await idb.dequeue(foreign.map((cmd) => cmd.uuid));
  set({ pendingCount: queue.length - foreign.length });
  get().toast(
    translate(get().prefs.locale, 'sync.foreignQueue', { count: foreign.length }),
    undefined,
    { tone: 'error' },
  );
  return queue.length - foreign.length;
}

/** One read of Todoist, inside the turn `refresh` waited for. */
async function readFromTodoist(
  get: () => AppState,
  set: (patch: Partial<AppState>) => void,
  full: boolean,
  signedIn: { legacyOwner: string | null } | undefined,
): Promise<void> {
  try {
    let stale: boolean;
    if (signedIn) {
      /* Someone has just signed in, and whose account it is decides what in
         the outbox may go: read first, set the other account's changes aside,
         then send the rest (#129). The read is already the whole account, so
         what follows is one incremental read, not a second full one. */
      const response = await sync('*');
      const fresh = applySync(emptySnapshot(), response);
      const checked = await readAccountSettings(fresh);
      const initial = checked ?? fresh;
      if (signedIn.legacyOwner && signedIn.legacyOwner !== initial.user?.id) clearPrefsDirty();
      const localPrefs = signedIn.legacyOwner && signedIn.legacyOwner !== initial.user?.id
        ? { ...get().prefs, onboarded: false, setupDone: false } : get().prefs;
      const canonical = checked ? remotePreferences(initial, localPrefs) : null;
      const adopted = canonical ?? localPrefs;
      const prefs = checked ? withOnboarding(initial, adopted) : adopted;
      set({ snapshot: hidePending(reapplyWaiting(initial)), prefs, settingsChecked: checked !== null, settingsUnavailable: checked === null });
      if (checked) void idb.savePrefs(PREFS_KEY, prefs);
      await dropForeignQueue(get, set, fresh.user?.id, signedIn.legacyOwner);
      stale = await flushQueue(get, set);
    } else {
      // Anything queued offline goes out first, so the server state the app
      // reads back already includes it and cannot overwrite it.
      stale = await flushQueue(get, set);
    }

    /* A snapshot saved before filters were read has none, and an
       incremental read only carries what changed since: it would never
       bring the filters that already existed. One full read fills them. */
    const missingFilters = !get().snapshot.filters;
    let fromScratch = signedIn ? stale : (full || stale || missingFilters || failureStreak === FULL_READ_AFTER_FAILURES);
    let response: Awaited<ReturnType<typeof sync>>;
    try {
      response = await sync(fromScratch ? '*' : get().snapshot.syncToken, undefined, get().snapshot.workspaces);
    } catch (error) {
      /* Todoist refusing an incremental read is, short of a bad token or a
         rate limit, refusing the token this device kept: an old one, or one
         from before something changed on the account. Reading everything
         again is the way out, rather than "Sync failed" on every poll (#466). */
      if (fromScratch || !(error instanceof ApiError) || !error.isRefusal) throw error;
      recordSyncFailure('read', error);
      fromScratch = true;
      response = await sync('*', undefined, get().snapshot.workspaces);
    }
    for (const failure of response.failedFolderWorkspaces ?? []) recordSyncFailure('folders', failure.error);
    /* What the screen shows for writes still waiting their turn goes back
       over what was read, before the settings are read from it. From
       scratch, the folders already known stay at hand: those of a workspace
       whose folders could not be read this time are kept. */
    let snapshot = reapplyWaiting(applySync(fromScratch ? { ...emptySnapshot(), folders: get().snapshot.folders } : get().snapshot, response));
    const checked = await readAccountSettings(snapshot);
    if (checked) snapshot = checked;
    const canonical = preferencesWriteTimer || checked === null
      ? null
      : remotePreferences(snapshot, get().prefs);
    if (canonical) setWeekLabel(canonical.weekLabel);
    const adopted = canonical && JSON.stringify(canonical) !== JSON.stringify(get().prefs) ? canonical : get().prefs;
    const prefs = checked === null ? adopted : withOnboarding(snapshot, adopted);
    failureStreak = 0;
    set({ snapshot: hidePending(snapshot), prefs, syncState: 'idle', syncError: null, settingsChecked: checked !== null, settingsUnavailable: checked === null });
    schedulePersist(snapshot);
    if (canonical || prefs !== adopted) void idb.savePrefs(PREFS_KEY, prefs);
    /* Always: writes nothing when the comment already says the same, and
       moves an account off the old settings task the first time. */
    if (checked !== null) window.setTimeout(() => void get().ensurePreferencesTask(), 0);
  } catch (error) {
    if (error instanceof NotConnectedError) {
      set({ connected: false, syncState: 'idle', syncError: 'invalid' });
      return;
    }
    recordSyncFailure('read', error);
    /* Only Todoist's own refusals and unreadable answers count towards a
       fresh read: a lost network or a laptop waking up says nothing about
       the token, and must not cost a whole account's download. */
    const todoistSaidNo = (error instanceof ApiError && !error.isAuthError && error.status !== 429)
      || (error instanceof Error && /could not be read/.test(error.message));
    if (todoistSaidNo) failureStreak += 1;
    const offline = !navigator.onLine || !(error instanceof ApiError);
    set({
      syncState: offline ? 'offline' : 'error',
      syncError: error instanceof Error ? error.message : 'unknown',
    });
    if (error instanceof ApiError && error.isAuthError) {
      set({ connected: false, syncError: 'invalid' });
      await auth.disconnect();
    }
  } finally {
    /* Whatever happened above, this sync is over. A state left on
       "syncing" stops every later sync from starting. */
    if (get().syncState === 'syncing') set({ syncState: 'idle' });
  }
}

/** A write's own turn with Todoist: send, fold the answer in, settle the outbox. */
async function sendNow(
  get: () => AppState,
  set: (patch: Partial<AppState>) => void,
  commands: Command[],
  before: ReturnType<typeof emptySnapshot>,
  after: ReturnType<typeof emptySnapshot>,
  release: () => void,
): Promise<Record<string, string>> {
  /* Claimed before they were queued, so no flush can have sent them: they are
     this write's to send, even on a device whose outbox cannot be written. */
  const toSend = commands;
  try {
    // The token as it is now: a read may have moved it while this waited.
    const result = await sendCommands(get().snapshot.syncToken, toSend, repairAccount(get));
    let merged = applyWrite(get().snapshot, result.responses, result.mapping);
    if (result.error) recordSyncFailure('write', result.error);
    /* Todoist refused some of it, and the screen must not keep what it
       refused: each refused command gives back only the objects it touched,
       and the person who asked is told below. A change that vanishes without
       a word is indistinguishable from a click that never registered. */
    if (result.failures.length > 0) {
      merged = revertRefused(merged, before, toSend, result.failures);
      /* In development, the refused commands and Todoist's full answer, to
         diagnose a refusal on a real account (#28). */
      if (import.meta.env.DEV) {
        const refused = new Set(result.failures.map((failure) => failure.uuid));
        console.warn('[todoist] refused', toSend.filter((cmd) => refused.has(cmd.uuid)), result.failures);
      }
    }

    /* Answered: what the screen shows is now Todoist's, and no longer needs
       laying over a read. The other writes still waiting do. */
    release();
    set({
      snapshot: hidePending(reapplyWaiting(merged)),
      syncState: result.error ? 'offline' : 'idle',
      resolvedIds: { ...get().resolvedIds, ...result.mapping },
    });
    schedulePersist(get().snapshot);

    /* Only what Todoist received leaves the queue. What the network lost
       part-way stays, with the ids resolved so far written into it. */
    const safety = await verifyEstimateWrites(get, set, toSend, result, after);
    await idb.dequeue(result.delivered.filter((id) => !safety.pending.some((cmd) => cmd.uuid === id)));
    if (safety.pending.length > 0) await idb.updateQueued(safety.pending);
    if (result.undelivered.length > 0) await idb.updateQueued(result.undelivered);
    set({ pendingCount: (await idb.readQueue()).length });

    schedulePersist(get().snapshot);
    const failures = result.failures.filter((f) => !safety.handled.has(f.uuid));
    if (failures.length > 0) {
      recordRefusal('write', failures, toSend.filter((cmd) => failures.some((f) => f.uuid === cmd.uuid)).map((cmd) => cmd.type));
      get().toast(explainFailures(
        failures, result.delivered.length, get().prefs.locale,
      ), undefined, { tone: 'error' });
    }
    return result.mapping;
  } catch (error) {
    if (error instanceof NotConnectedError || (error instanceof ApiError && error.isAuthError)) {
      await auth.disconnect();
      set({ connected: false, syncState: 'idle', syncError: 'invalid' });
      return {};
    }
    /* Only the network can throw from here: a refusal comes back in
       `failures` above. The change stays queued and goes out on the next
       sync. */
    recordSyncFailure('write', error);
    set({ syncState: 'offline' });
    return {};
  }
}

export const createSyncSlice: Slice<SyncSlice> = (set, get) => ({
  ready: false,
  connected: false,
  snapshot: emptySnapshot(),
  syncState: 'idle',
  syncError: null,
  settingsChecked: false,
  settingsUnavailable: false,
  pendingCount: 0,
  demo: false,
  resolvedIds: {},
  signInError: null,
  async init() {
    /* Always finishes. A launch that throws anywhere below used to leave the
       app on "Loading…" for ever, because nothing was listening for the
       rejection and `ready` never became true. Whatever went wrong is kept as
       the sync error, and the connect screen appears either way (#128). */
    try {
      /* A page load that is Todoist sending the person back from its consent
         page finishes the sign-in first, so what follows finds a connection. */
      const signIn = await completeSignIn();
      if (signIn === 'signed-in') { sessionRemove('demo'); auth.forgetPastedToken(); }
      if (signIn === 'denied' || signIn === 'failed') set({ signInError: signIn });

      const [storedPrefs, snapshot, queue, storedKept] = await Promise.all([
        idb.loadPrefs<Preferences>(PREFS_KEY),
        idb.loadSnapshot(),
        idb.readQueue(),
        idb.loadPrefs<unknown>(DUST_KEY),
        loadPrefsDirty(),
        loadSyncLog(),
      ]);

      const prefs = hydratePreferences(storedPrefs, detectLocale());
      /* The rules that read the week tag are pure functions called from
         everywhere; they are told the name once, here, rather than being handed
         preferences they have no other use for. */
      setWeekLabel(prefs.weekLabel);
      const connected = auth.isConnected();
      const resumeDemo = !connected && sessionGet('demo') === '1';

      // Show the cached copy immediately, then reconcile with Todoist.
      set({
        prefs,
        snapshot: resumeDemo ? buildDemoSnapshot(prefs.locale) : snapshot,
        connected: connected || resumeDemo,
        demo: resumeDemo,
        ready: true,
        pendingCount: queue.length,
        // The demo is a sandbox: it never reads what a real account kept here.
        dustKept: resumeDemo ? {} : readKept(storedKept),
      });

      if (connected) {
        /* A fresh sign-in reads the whole account, whatever the device held,
           and reads it before sending anything: only then is it known whose
           account this is, and so which of the queued changes are theirs. */
        if (signIn === 'signed-in') void get().refresh(true, { legacyOwner: snapshot.user?.id ?? null });
        else void get().refresh(snapshot.syncToken === '*');
      }
    } catch (error) {
      set({ syncError: String(error) });
    } finally {
      if (!get().ready) set({ ready: true });
    }
  },
  async connect(token: string) {
    set({ syncState: 'loading', syncError: null, settingsChecked: false, settingsUnavailable: false });
    await auth.set(token);
    // Whose copy the device holds now, before the one just read replaces it.
    const legacyOwner = get().snapshot.user?.id ?? null;
    try {
      const response = await sync('*');
      let snapshot = applySync(emptySnapshot(), response);
      const checked = await readAccountSettings(snapshot);
      if (checked) snapshot = checked;
      // A setting changed on another account is not this account's to keep.
      if (legacyOwner && legacyOwner !== snapshot.user?.id) clearPrefsDirty();
      const localPrefs = legacyOwner && legacyOwner !== snapshot.user?.id
        ? { ...get().prefs, onboarded: false, setupDone: false } : get().prefs;
      const canonical = checked === null ? null : remotePreferences(snapshot, localPrefs);
      if (canonical) setWeekLabel(canonical.weekLabel);
      const adopted = canonical && JSON.stringify(canonical) !== JSON.stringify(localPrefs) ? canonical : localPrefs;
      const prefs = checked === null ? adopted : withOnboarding(snapshot, adopted);
      set({
        connected: true, snapshot, prefs, syncState: 'idle', settingsChecked: checked !== null, settingsUnavailable: checked === null,
        sidePanel: null, timeFilter: { minutes: null, scope: 'page', sort: 'duration' },
      });
      void idb.saveSnapshot(snapshot);
      if (canonical || prefs !== adopted) void idb.savePrefs(PREFS_KEY, prefs);
      /* What the same person left waiting goes out now; what another account
         left is set aside first (#129). */
      if (await dropForeignQueue(get, set, snapshot.user?.id, legacyOwner) > 0) void get().refresh();
      if (checked !== null) window.setTimeout(() => void get().ensurePreferencesTask(), 0);
      return true;
    } catch (error) {
      await auth.disconnect();
      set({
        connected: false,
        syncState: 'error',
        syncError: error instanceof ApiError && error.isAuthError ? 'invalid' : 'offline',
      });
      return false;
    }
  },
  startDemo() {
    // Remembered for a reload when the browser allows it, and still opened when not.
    sessionSet('demo', '1');
    /* Every entry from the sign-in page is a first run (#6); a reload is not,
       since init() restores the demo without passing here. */
    forgetDemoOnboarding();
    set({
      demo: true,
      connected: true,
      ready: true,
      syncState: 'idle',
      settingsChecked: false,
      settingsUnavailable: false,
      snapshot: buildDemoSnapshot(get().prefs.locale),
      pendingCount: 0,
    });
  },
  async disconnect() {
    clearProjectPeopleCache();
    clearPrefsDirty();
    sessionRemove('demo');
    usePomodoro.getState().end();
    await auth.disconnect();
    await idb.clearAll();
    set({
      connected: false,
      demo: false,
      snapshot: emptySnapshot(),
      prefs: defaultPreferences(get().prefs.locale),
      settingsChecked: false,
      settingsUnavailable: false,
      pendingCount: 0,
      syncState: 'idle',
      resolvedIds: {},
      dustKept: {},
      // What was asked of one account's tasks is not asked of the next one's.
      sidePanel: null,
      timeFilter: { minutes: null, scope: 'page', sort: 'duration' },
      // One account's note is never the next account's.
    });
  },
  async refresh(full = false, signedIn) {
    if (get().demo) return;
    if (tourSnapshotBackup) return;
    if (!auth.isConnected()) return;
    if (get().syncState === 'syncing') return;

    set({ syncState: 'syncing', syncError: null });
    /* A write in flight finishes first, and the next one waits for this read
       to land, so neither can undo the other on screen (#468). */
    await exclusive(() => readFromTodoist(get, set, full, signedIn));
  },
  startPolling() {
    const tick = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) void get().refresh();
    };
    const interval = setInterval(tick, POLL_INTERVAL_MS);
    // Coming back to the tab or back online is the moment the user most
    // expects to see fresh data, so both trigger an immediate read.
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('online', tick);
    window.addEventListener('focus', tick);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('online', tick);
      window.removeEventListener('focus', tick);
    };
  },
  /**
   * Applies a change everywhere at once: on screen immediately, in the outbox
   * so it survives a reload, and at Todoist. A failure rolls the screen back
   * rather than leaving it showing something Todoist never accepted.
   */
  async apply(commands, optimistic, options) {
    const before = get().snapshot;
    const after = optimistic(before);

    /* A demo account is a sandbox, and so is the tour, which plays on the
       demo's tasks even for a real account (#4): changes show, and stop
       there — nothing is sent or queued with the demo's ids. */
    if (get().demo || tourSnapshotBackup) {
      set({ snapshot: after });
      return {};
    }

    /* A window still on another account than the device's (the Quick Add
       window after the main one changed account) sends nothing: the token is
       the device's, the projects and ids it names are the other account's. It
       starts over on the device's account instead. */
    if (!mayWriteAs(before.user?.id, accountOnDevice())) {
      get().toast(translate(get().prefs.locale, 'sync.otherAccount'), undefined, { tone: 'error' });
      window.setTimeout(() => window.location.reload(), 2500);
      return {};
    }

    set({ snapshot: after });
    schedulePersist(after);

    /* These commands are this write's to send: the outbox keeps them for a
       reload, and its flush leaves them alone while this write holds them.
       What the screen shows for them survives a read that lands first. */
    for (const cmd of commands) claimed.add(cmd.uuid);
    const release = holdOptimistic(optimistic);
    try {
      await idb.enqueue(commands, get().snapshot.user?.id);
      set({ pendingCount: (await idb.readQueue()).length });

      if (!navigator.onLine) {
        set({ syncState: 'offline' });
        return {};
      }

      /* A write made while another one is answered (the estimate fallback)
         is already inside the turn: waiting for it would wait for itself. */
      const send = () => sendNow(get, set, commands, before, after, release);
      return await (options?.inTurn ? send() : exclusive(send));
    } finally {
      release();
      for (const cmd of commands) claimed.delete(cmd.uuid);
    }
  },
});
