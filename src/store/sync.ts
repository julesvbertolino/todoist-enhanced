/** Talking to Todoist: signing in and out, reading, writing, the offline queue, the demo. */
import { verifyEstimateWrites } from './estimate-safety';
import { auth } from '@/api/auth';
import { completeSignIn } from '@/api/oauth';
import { ApiError, NotConnectedError } from '@/api/client';
import { applySync, applyWrite, sync } from '@/api/sync';
import { sendCommands, type Command } from '@/api/commands';
import * as idb from '@/db/idb';
import { emptySnapshot, setWeekLabel } from '@/domain/types';
import { readKept } from '@/domain/views';
import { detectLocale, translate } from '@/i18n';
import { buildDemoSnapshot } from '@/demo/demoData';
import { sessionGet, sessionRemove, sessionSet } from '@/lib/sessionStore';
import { forgetDemoOnboarding } from '@/domain/onboarding';
import { defaultPreferences, hydratePreferences, type Preferences } from './prefs';
import {
  explainFailures, hidePending, partitionQueue, pendingDeletes, revertRefused, schedulePersist,
} from './helpers';
import {
  PREFS_KEY, preferencesWriteTimer, remotePreferences, tourSnapshotBackup, withOnboarding,
} from './preferences';
import { DUST_KEY } from './dust';
import type { AppState } from './types';
import type { Slice, SyncSlice } from './types';

/** How often the app asks Todoist what changed while the tab is in the foreground. */
export const POLL_INTERVAL_MS = 45_000;

/** Sends everything waiting in the outbox, oldest first. */
export async function flushQueue(
  get: () => AppState,
  set: (patch: Partial<AppState>) => void,
): Promise<boolean> {
  const queue = await idb.readQueue();
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
  const commands: Command[] = queue
    .filter((cmd) => !held.has(cmd.uuid))
    .filter((cmd) => !cmd.userId || !account || cmd.userId === account)
    // The bookkeeping stays here: Todoist is sent the command and nothing else.
    .map(({ queuedAt: _q, attempts: _a, userId: _u, ...cmd }) => cmd);
  if (commands.length === 0) return false;
  try {
    const optimistic = get().snapshot;
    const result = await sendCommands(get().snapshot.syncToken, commands);
    let merged = applyWrite(get().snapshot, result.responses, result.mapping);

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

    set({ snapshot: hidePending(merged), resolvedIds: { ...get().resolvedIds, ...result.mapping } });
    const safety = await verifyEstimateWrites(get, set, commands, result, optimistic);
    await idb.dequeue(result.delivered.filter((id) => !safety.pending.some((cmd) => cmd.uuid === id)));
    if (safety.pending.length > 0) await idb.updateQueued(safety.pending);
    if (result.undelivered.length > 0) await idb.updateQueued(result.undelivered);
    set({ pendingCount: (await idb.readQueue()).length });
    schedulePersist(get().snapshot);
    const failures = result.failures.filter((f) => !safety.handled.has(f.uuid));
    if (failures.length > 0) {
      get().toast(
        explainFailures(failures, result.delivered.length, get().prefs.locale),
        undefined,
        { tone: 'error' },
      );
    }
    // A full read would wipe the placeholders of what is still waiting to go.
    return stale && get().pendingCount === 0;
  } catch {
    /* Only the network can throw from here (see `failures` above), so this is
       always "still unreachable": the queue is left alone and retried later. */
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

export const createSyncSlice: Slice<SyncSlice> = (set, get) => ({
  ready: false,
  connected: false,
  snapshot: emptySnapshot(),
  syncState: 'idle',
  syncError: null,
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
      if (signIn === 'signed-in') sessionRemove('demo');
      if (signIn === 'denied' || signIn === 'failed') set({ signInError: signIn });

      const [storedPrefs, snapshot, queue, storedKept] = await Promise.all([
        idb.loadPrefs<Preferences>(PREFS_KEY),
        idb.loadSnapshot(),
        idb.readQueue(),
        idb.loadPrefs<unknown>(DUST_KEY),
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
    set({ syncState: 'loading', syncError: null });
    await auth.set(token);
    // Whose copy the device holds now, before the one just read replaces it.
    const legacyOwner = get().snapshot.user?.id ?? null;
    try {
      const response = await sync('*');
      const snapshot = applySync(emptySnapshot(), response);
      const canonical = remotePreferences(snapshot, get().prefs);
      if (canonical) setWeekLabel(canonical.weekLabel);
      const adopted = canonical ?? get().prefs;
      const prefs = withOnboarding(snapshot, adopted);
      set({
        connected: true, snapshot, prefs, syncState: 'idle',
        sidePanel: null, timeFilter: { minutes: null, scope: 'page', sort: 'duration' },
      });
      void idb.saveSnapshot(snapshot);
      if (canonical || prefs !== adopted) void idb.savePrefs(PREFS_KEY, prefs);
      /* What the same person left waiting goes out now; what another account
         left is set aside first (#129). */
      if (await dropForeignQueue(get, set, snapshot.user?.id, legacyOwner) > 0) void get().refresh();
      window.setTimeout(() => void get().ensurePreferencesTask(), 0);
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
      snapshot: buildDemoSnapshot(get().prefs.locale),
      pendingCount: 0,
    });
  },
  async disconnect() {
    sessionRemove('demo');
    await auth.disconnect();
    await idb.clearAll();
    set({
      connected: false,
      demo: false,
      snapshot: emptySnapshot(),
      prefs: defaultPreferences(get().prefs.locale),
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

    try {
      let stale: boolean;
      if (signedIn) {
        /* Someone has just signed in, and whose account it is decides what in
           the outbox may go: read first, set the other account's changes aside,
           then send the rest (#129). The read is already the whole account, so
           what follows is one incremental read, not a second full one. */
        const response = await sync('*');
        const fresh = applySync(emptySnapshot(), response);
        set({ snapshot: hidePending(fresh) });
        await dropForeignQueue(get, set, fresh.user?.id, signedIn.legacyOwner);
        stale = await flushQueue(get, set);
      } else {
        // Anything queued offline goes out first, so the server state the app
        // reads back already includes it and cannot overwrite it.
        stale = await flushQueue(get, set);
      }

      const fromScratch = signedIn ? stale : (full || stale);
      const token = fromScratch ? '*' : get().snapshot.syncToken;
      const response = await sync(token);
      const snapshot = applySync(fromScratch ? emptySnapshot() : get().snapshot, response);
      const canonical = preferencesWriteTimer
        ? null
        : remotePreferences(snapshot, get().prefs);
      if (canonical) setWeekLabel(canonical.weekLabel);
      const adopted = canonical ?? get().prefs;
      const prefs = withOnboarding(snapshot, adopted);
      set({ snapshot: hidePending(snapshot), prefs, syncState: 'idle' });
      schedulePersist(snapshot);
      if (canonical || prefs !== adopted) void idb.savePrefs(PREFS_KEY, prefs);
      /* Always: writes nothing when the comment already says the same, and
         moves an account off the old settings task the first time. */
      window.setTimeout(() => void get().ensurePreferencesTask(), 0);
    } catch (error) {
      if (error instanceof NotConnectedError) {
        set({ connected: false, syncState: 'idle' });
        return;
      }
      const offline = !navigator.onLine || !(error instanceof ApiError);
      set({
        syncState: offline ? 'offline' : 'error',
        syncError: error instanceof Error ? error.message : 'unknown',
      });
      if (error instanceof ApiError && error.isAuthError) {
        set({ connected: false });
        await auth.disconnect();
      }
    } finally {
      /* Whatever happened above, this sync is over. A state left on
         "syncing" stops every later sync from starting. */
      if (get().syncState === 'syncing') set({ syncState: 'idle' });
    }
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
  async apply(commands, optimistic) {
    const before = get().snapshot;
    const after = optimistic(before);

    /* A demo account is a sandbox, and so is the tour, which plays on the
       demo's tasks even for a real account (#4): changes show, and stop
       there — nothing is sent or queued with the demo's ids. */
    if (get().demo || tourSnapshotBackup) {
      set({ snapshot: after });
      return {};
    }

    set({ snapshot: after });
    schedulePersist(after);

    await idb.enqueue(commands, get().snapshot.user?.id);
    set({ pendingCount: get().pendingCount + commands.length });

    if (!navigator.onLine) {
      set({ syncState: 'offline' });
      return {};
    }

    try {
      const result = await sendCommands(after.syncToken, commands);
      let merged = applyWrite(get().snapshot, result.responses, result.mapping);
      /* Todoist refused some of it, and the screen must not keep what it
         refused: each refused command gives back only the objects it touched,
         and the person who asked is told below. A change that vanishes without
         a word is indistinguishable from a click that never registered. */
      if (result.failures.length > 0) {
        merged = revertRefused(merged, before, commands, result.failures);
        /* In development, the refused commands and Todoist's full answer, to
           diagnose a refusal on a real account (#28). */
        if (import.meta.env.DEV) {
          const refused = new Set(result.failures.map((failure) => failure.uuid));
          console.warn('[todoist] refused', commands.filter((cmd) => refused.has(cmd.uuid)), result.failures);
        }
      }

      set({
        snapshot: hidePending(merged),
        syncState: result.error ? 'offline' : 'idle',
        resolvedIds: { ...get().resolvedIds, ...result.mapping },
      });
      schedulePersist(merged);

      /* Only what Todoist received leaves the queue. What the network lost
         part-way stays, with the ids resolved so far written into it. */
      const safety = await verifyEstimateWrites(get, set, commands, result, after);
      await idb.dequeue(result.delivered.filter((id) => !safety.pending.some((cmd) => cmd.uuid === id)));
      if (safety.pending.length > 0) await idb.updateQueued(safety.pending);
      if (result.undelivered.length > 0) await idb.updateQueued(result.undelivered);
      set({ pendingCount: Math.max(0, get().pendingCount - result.delivered.length + safety.pending.length) });

      schedulePersist(get().snapshot);
      const failures = result.failures.filter((f) => !safety.handled.has(f.uuid));
      if (failures.length > 0) {
        get().toast(explainFailures(
          failures, result.delivered.length, get().prefs.locale,
        ), undefined, { tone: 'error' });
      }
      return result.mapping;
    } catch {
      /* Only the network can throw from here: a refusal comes back in
         `failures` above. The change stays queued and goes out on the next
         sync. */
      set({ syncState: 'offline' });
      return {};
    }
  },
});
