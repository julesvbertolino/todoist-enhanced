import { openDatabase, LEASE_STORE, leaseKey } from './database';
import { leaseOwner } from './leaseOwners';
import { emptySnapshot, type Snapshot } from '@/domain/types';
import type { Command } from '@/api/commands';
import { resolveCommandIds } from '@/api/commandIds';
import { mergePreferenceChanges } from '@/lib/mergeChanges';
import { overlayQueuedIntent } from '@/store/queuedIntent';

/**
 * The local store.
 *
 * Everything lives on the device: the Todoist mirror so the app opens
 * instantly and works offline, the preferences, and the queue of changes that
 * have not reached Todoist yet. No server holds any of it.
 */

const STORE_SNAPSHOT = 'snapshot';
const STORE_PREFS = 'prefs';
const STORE_QUEUE = 'queue';
const db = openDatabase;
type SnapshotClock = { epoch: string; next: number; committed: number };
export type SnapshotTicket = { epoch: string; revision: number };
const newClock = (): SnapshotClock => ({ epoch: crypto.randomUUID(), next: 0, committed: 0 });

/** Reserve before a delayed write, so an older timer cannot replace a newer snapshot. */
export async function reserveSnapshot(): Promise<SnapshotTicket> {
  const tx = (await db()).transaction(STORE_SNAPSHOT, 'readwrite');
  const clock = (await tx.store.get('clock') as SnapshotClock | undefined) ?? newClock();
  const ticket = { epoch: clock.epoch, revision: ++clock.next };
  await tx.store.put(clock, 'clock');
  await tx.done;
  return ticket;
}

export async function loadSnapshot(): Promise<Snapshot> {
  try {
    const stored = await (await db()).get(STORE_SNAPSHOT, 'current');
    return (stored as Snapshot | undefined) ?? emptySnapshot();
  } catch {
    // A blocked or corrupt database must never stop the app from starting.
    return emptySnapshot();
  }
}

export async function saveSnapshot(snapshot: Snapshot, reserved?: Promise<SnapshotTicket>): Promise<void> {
  try {
    const ticket = await (reserved ?? reserveSnapshot());
    const tx = (await db()).transaction([STORE_SNAPSHOT, STORE_QUEUE], 'readwrite');
    const snapshots = tx.objectStore(STORE_SNAPSHOT);
    const clock = await snapshots.get('clock') as SnapshotClock | undefined;
    if (clock && clock.epoch === ticket.epoch && ticket.revision >= clock.committed) {
      const stored = await snapshots.get('current') as Snapshot | undefined;
      const queue = await tx.objectStore(STORE_QUEUE).getAll() as QueuedCommand[];
      const pending = queue.filter((entry) => entry.userId && entry.userId === snapshot.user?.id);
      const combined = stored && stored.user?.id === snapshot.user?.id
        ? overlayQueuedIntent(snapshot, stored, pending, {}) : snapshot;
      clock.committed = ticket.revision;
      await snapshots.put(combined, 'current');
      await snapshots.put(clock, 'clock');
    }
    await tx.done;
  } catch {
    /* the app keeps working from memory */
  }
}

export async function clearSnapshot(): Promise<void> {
  try {
    await (await db()).delete(STORE_SNAPSHOT, 'current');
  } catch {
    /* nothing to clear */
  }
}

export async function loadPrefs<T>(key: string, critical = false): Promise<T | null> {
  try {
    return ((await (await db()).get(STORE_PREFS, key)) as T | undefined) ?? null;
  } catch (error) {
    if (critical) throw error;
    return null;
  }
}

export async function savePrefs<T>(key: string, value: T, critical = false): Promise<void> {
  try {
    await (await db()).put(STORE_PREFS, value, key);
  } catch (error) {
    if (critical) throw error;
    /* preferences fall back to defaults next time */
  }
}

const PREFERENCE_CHANGE_PREFIX = 'preference-change:';
const PREFERENCE_CHANGE_CLOCK = 'preference-change-clock';
export interface PreferenceChange<T> { id: string; userId: string; order: number; before: T; after: T }

/** Each window journals its edits separately; one cannot overwrite another. */
export async function appendPreferenceChange<T>(userId: string, before: T, after: T): Promise<void> {
  const tx = (await db()).transaction(STORE_PREFS, 'readwrite');
  const store = tx.store;
  let last = await store.get(PREFERENCE_CHANGE_CLOCK) as number | undefined;
  if (typeof last !== 'number') {
    // One-time migration of journals written before the counter existed.
    const entries = await store.getAll() as Array<Partial<PreferenceChange<T>>>;
    last = entries.reduce((value, entry) => Math.max(value, typeof entry?.order === 'number' ? entry.order : 0), 0);
  }
  const order = Math.max(last + 1, Date.now());
  const id = crypto.randomUUID();
  await store.put({ id, userId, order, before, after } satisfies PreferenceChange<T>, PREFERENCE_CHANGE_PREFIX + id);
  await store.put(order, PREFERENCE_CHANGE_CLOCK);
  await tx.done;
}

export async function readPreferenceChanges<T>(userId: string): Promise<Array<PreferenceChange<T>>> {
  const store = (await db()).transaction(STORE_PREFS, 'readonly').store;
  const keys = await store.getAllKeys();
  const entries = await Promise.all(keys.filter((key) => typeof key === 'string' && key.startsWith(PREFERENCE_CHANGE_PREFIX)).map((key) => store.get(key)));
  return (entries as Array<PreferenceChange<T>>).filter((entry) => entry.userId === userId).sort((a, b) => a.order - b.order);
}

export async function removePreferenceChanges(ids: string[]): Promise<void> {
  const tx = (await db()).transaction(STORE_PREFS, 'readwrite');
  for (const id of ids) await tx.store.delete(PREFERENCE_CHANGE_PREFIX + id);
  await tx.done;
}

/* ---------- The outbox of changes waiting for Todoist ---------- */

export interface QueuedCommand extends Command {
  queuedAt: number;
  attempts: number;
  /**
   * The Todoist account the change was made in (#129). A command queued before
   * this was recorded has none, and is only taken as belonging to whoever the
   * device's cached copy belonged to. Never sent to Todoist: `flushQueue`
   * takes it out with the other bookkeeping.
   */
  userId?: string;
}

export async function enqueue(commands: Command[], userId?: string, snapshot?: Snapshot, before?: Snapshot): Promise<void> {
  const database = await db();
  const tx = database.transaction([STORE_QUEUE, STORE_SNAPSHOT], 'readwrite');
  try {
    const store = tx.objectStore(STORE_QUEUE);
    const existing = await store.getAll() as QueuedCommand[];
    let order = existing.reduce((latest, entry) => Math.max(latest, entry.queuedAt), Date.now() - 1);
    for (const cmd of commands) {
      await store.put({ ...cmd, queuedAt: ++order, attempts: 0, ...(userId ? { userId } : {}) } satisfies QueuedCommand);
    }
    if (snapshot) {
      const snapshots = tx.objectStore(STORE_SNAPSHOT);
      const clock = (await snapshots.get('clock') as SnapshotClock | undefined) ?? newClock();
      const stored = await snapshots.get('current') as Snapshot | undefined;
      // Another window may have saved a different pending edit since this
      // window read its snapshot. Apply only this operation's changes.
      const combined = stored && before && userId && stored.user?.id === userId && before.user?.id === userId
        ? mergePreferenceChanges(before, snapshot, stored) : snapshot;
      clock.committed = ++clock.next;
      await snapshots.put(combined, 'current');
      await snapshots.put(clock, 'clock');
    }
    await tx.done;
  } catch (error) {
    try { tx.abort(); } catch { /* already aborted */ }
    await tx.done.catch(() => undefined);
    throw error;
  }
}

export async function readQueue(): Promise<QueuedCommand[]> {
  const all = (await (await db()).getAll(STORE_QUEUE)) as QueuedCommand[];
  return all.sort((a, b) => a.queuedAt - b.queuedAt);
}

/** Associate old unowned entries only with their verified previous account. */
export async function claimLegacyQueue(userId: string): Promise<void> {
  const tx = (await db()).transaction(STORE_QUEUE, 'readwrite');
  for (const entry of await tx.store.getAll() as QueuedCommand[]) {
    if (!entry.userId) await tx.store.put({ ...entry, userId });
  }
  await tx.done;
}

/**
 * Rewrites queued commands in place, keeping their place in the queue.
 *
 * Used when part of the queue went out and resolved ids that the rest names:
 * the rest is written back with the real ids, in the order it was queued.
 */
export async function updateQueued(commands: Command[]): Promise<void> {
  try {
    const database = await db();
    const tx = database.transaction(STORE_QUEUE, 'readwrite');
    for (const cmd of commands) {
      const existing = (await tx.store.get(cmd.uuid)) as QueuedCommand | undefined;
      await tx.store.put({
        ...cmd,
        queuedAt: existing?.queuedAt ?? Date.now(),
        attempts: (existing?.attempts ?? 0) + 1,
        // Still the same person's change, whatever ids it now names.
        ...(existing?.userId ? { userId: existing.userId } : {}),
      } satisfies QueuedCommand);
    }
    await tx.done;
  } catch {
    /* the commands are still queued under their old arguments, which Todoist can resolve */
  }
}

export async function dequeue(uuids: string[]): Promise<void> {
  try {
    const database = await db();
    const tx = database.transaction(STORE_QUEUE, 'readwrite');
    for (const uuid of uuids) await tx.store.delete(uuid);
    await tx.done;
  } catch {
    /* a stale entry is retried, which is safe: commands are idempotent by uuid */
  }
}

/** Commit the cursor/snapshot and outbox acknowledgement as one crash boundary. */
export async function settleQueue(
  delivered: string[], pending: Command[], mapping: Record<string, string>, snapshot: Snapshot, userId?: string,
): Promise<void> {
  const database = await db();
  const tx = database.transaction([STORE_QUEUE, STORE_SNAPSHOT, LEASE_STORE], 'readwrite');
  try {
    const owner = leaseOwner('todoist-enhanced-sync');
    if (owner) {
      const lease = await tx.objectStore(LEASE_STORE).get(leaseKey('todoist-enhanced-sync')) as { owner: string; until: number } | undefined;
      if (!lease || lease.owner !== owner || lease.until <= Date.now()) throw new Error('Lost ownership of the sync turn');
    }
    const store = tx.objectStore(STORE_QUEUE);
    const existing = await store.getAll() as QueuedCommand[];
    const keptPending = new Map(pending.map((entry) => [entry.uuid, entry]));
    const acknowledged = new Set(delivered.filter((id) => !keptPending.has(id)));
    for (const entry of existing) {
      if (acknowledged.has(entry.uuid)) { await store.delete(entry.uuid); continue; }
      if (entry.userId && entry.userId !== userId) continue;
      const original = keptPending.get(entry.uuid) ?? entry;
      const [rewritten] = resolveCommandIds([original], mapping);
      await store.put({ ...entry, ...rewritten, queuedAt: entry.queuedAt, attempts: entry.attempts + (keptPending.has(entry.uuid) ? 1 : 0) });
    }
    const snapshots = tx.objectStore(STORE_SNAPSHOT);
    const clock = (await snapshots.get('clock') as SnapshotClock | undefined) ?? newClock();
    const stored = await snapshots.get('current') as Snapshot | undefined;
    const stillPending = existing.filter((entry) => !acknowledged.has(entry.uuid) && (!entry.userId || entry.userId === userId));
    const combined = stored && stored.user?.id === userId
      ? overlayQueuedIntent(snapshot, stored, stillPending, mapping) : snapshot;
    clock.committed = ++clock.next;
    await snapshots.put(combined, 'current');
    await snapshots.put(clock, 'clock');
    await tx.done;
  } catch (error) {
    try { tx.abort(); } catch { /* already aborted */ }
    await tx.done.catch(() => undefined);
    throw error;
  }
}

/** Sign out without destroying unsent account-owned commands or repair journals. */
export async function clearSession(): Promise<void> {
  const database = await db();
  const tx = database.transaction([STORE_SNAPSHOT, STORE_PREFS], 'readwrite');
  await tx.objectStore(STORE_SNAPSHOT).clear();
  const prefs = tx.objectStore(STORE_PREFS);
  for (const key of await prefs.getAllKeys()) {
    if (key !== 'due-repair' && key !== PREFERENCE_CHANGE_CLOCK && !(typeof key === 'string' && (key.startsWith(PREFERENCE_CHANGE_PREFIX) || key.startsWith('lease:')))) await prefs.delete(key);
  }
  await tx.done;
}

export async function clearAll(): Promise<void> {
  try {
    const database = await db();
    await Promise.all([
      database.clear(STORE_SNAPSHOT),
      (async () => {
        const tx = database.transaction(STORE_PREFS, 'readwrite');
        for (const key of await tx.store.getAllKeys()) {
          if (!(typeof key === 'string' && key.startsWith('lease:'))) await tx.store.delete(key);
        }
        await tx.done;
      })(),
      database.clear(STORE_QUEUE),
    ]);
  } catch {
    /* nothing to clear */
  }
}
