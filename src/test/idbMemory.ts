/**
 * An in-memory stand-in for the device store, for tests of the store slices.
 *
 * The outbox behaves like the real one (put, read in order, take off), so a
 * test can see what is waiting; everything else is a no-op. `resetIdbMemory`
 * empties it between tests.
 */
import { vi } from 'vitest';
import type { Command } from '@/api/commands';

type Queued = Command & { queuedAt: number; attempts: number; userId?: string };
let queue: Queued[] = [];
let tick = 0;

export function resetIdbMemory() { queue = []; tick = 0; }

export function idbMemory() {
  return {
    loadSnapshot: vi.fn(async () => undefined),
    saveSnapshot: vi.fn(async () => {}),
    clearSnapshot: vi.fn(async () => {}),
    loadPrefs: vi.fn(async () => null),
    savePrefs: vi.fn(async () => {}),
    clearAll: vi.fn(async () => { queue = []; }),
    enqueue: vi.fn(async (commands: Command[], userId?: string) => {
      for (const cmd of commands) {
        queue = [...queue.filter((one) => one.uuid !== cmd.uuid), { ...cmd, queuedAt: tick++, attempts: 0, ...(userId ? { userId } : {}) }];
      }
    }),
    readQueue: vi.fn(async () => [...queue]),
    dequeue: vi.fn(async (uuids: string[]) => { queue = queue.filter((cmd) => !uuids.includes(cmd.uuid)); }),
    updateQueued: vi.fn(async (commands: Command[]) => {
      queue = queue.map((one) => {
        const next = commands.find((cmd) => cmd.uuid === one.uuid);
        return next ? { ...one, ...next, attempts: one.attempts + 1 } : one;
      });
    }),
  };
}
