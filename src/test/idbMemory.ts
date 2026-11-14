/**
 * An in-memory stand-in for the device store, for tests of the store slices.
 *
 * The outbox behaves like the real one (put, read in order, take off), so a
 * test can see what is waiting; everything else is a no-op. `resetIdbMemory`
 * empties it between tests.
 */
import { vi } from 'vitest';
import type { Command } from '@/api/commands';
import { resolveCommandIds } from '@/api/commandIds';

type Queued = Command & { queuedAt: number; attempts: number; userId?: string };
let queue: Queued[] = [];
let tick = 0;
let preferenceChanges: Array<{ id: string; userId: string; order: number; before: unknown; after: unknown }> = [];

export function resetIdbMemory() { queue = []; preferenceChanges = []; tick = 0; }

export function idbMemory() {
  return {
    loadSnapshot: vi.fn(async () => undefined),
    saveSnapshot: vi.fn(async () => {}),
    reserveSnapshot: vi.fn(async () => ({ epoch: 'test', revision: 1 })),
    clearSnapshot: vi.fn(async () => {}),
    loadPrefs: vi.fn(async () => null),
    savePrefs: vi.fn(async () => {}),
    appendPreferenceChange: vi.fn(async (userId: string, before: unknown, after: unknown) => { preferenceChanges.push({ id: String(tick++), userId, order: tick, before, after }); }),
    readPreferenceChanges: vi.fn(async (userId: string) => preferenceChanges.filter((entry) => entry.userId === userId)),
    removePreferenceChanges: vi.fn(async (ids: string[]) => { preferenceChanges = preferenceChanges.filter((entry) => !ids.includes(entry.id)); }),
    clearAll: vi.fn(async () => { queue = []; }),
    clearSession: vi.fn(async () => {}),
    enqueue: vi.fn(async (commands: Command[], userId?: string) => {
      for (const cmd of commands) {
        queue = [...queue.filter((one) => one.uuid !== cmd.uuid), { ...cmd, queuedAt: tick++, attempts: 0, ...(userId ? { userId } : {}) }];
      }
    }),
    readQueue: vi.fn(async () => [...queue]),
    claimLegacyQueue: vi.fn(async (userId: string) => { queue = queue.map((entry) => entry.userId ? entry : { ...entry, userId }); }),
    settleQueue: vi.fn(async (delivered: string[], pending: Command[], mapping: Record<string, string>, _snapshot: unknown, userId?: string) => {
      const pendingMap = new Map(pending.map((entry) => [entry.uuid, entry]));
      queue = queue.filter((entry) => !delivered.includes(entry.uuid) || pendingMap.has(entry.uuid)).map((entry) => {
        if (entry.userId && entry.userId !== userId) return entry;
        const [next] = resolveCommandIds([pendingMap.get(entry.uuid) ?? entry], mapping);
        return { ...entry, ...next };
      });
    }),
    dequeue: vi.fn(async (uuids: string[]) => { queue = queue.filter((cmd) => !uuids.includes(cmd.uuid)); }),
    updateQueued: vi.fn(async (commands: Command[]) => {
      queue = queue.map((one) => {
        const next = commands.find((cmd) => cmd.uuid === one.uuid);
        return next ? { ...one, ...next, attempts: one.attempts + 1 } : one;
      });
    }),
  };
}
