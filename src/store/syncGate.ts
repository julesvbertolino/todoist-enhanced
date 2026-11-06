/**
 * One conversation with Todoist at a time (#468).
 *
 * A write sent by `apply` and a read started by a poll used to run side by
 * side. The read emptied the outbox while the write was still sending the same
 * commands, so a change could reach Todoist twice; and a read answered before a
 * write could land after it, putting the old task back on screen until the
 * next poll. Every request that sends or reads now waits its turn here.
 */
import type { Snapshot } from '@/domain/types';

let chain: Promise<unknown> = Promise.resolve();

/** Runs `task` once every earlier one has finished, whatever became of them. */
export function exclusive<T>(task: () => Promise<T>): Promise<T> {
  const run = chain.then(task, task);
  chain = run.catch(() => undefined);
  return run;
}

/**
 * Commands a write already holds. They sit in the outbox so that a reload does
 * not lose them, but the outbox's own flush leaves them to the write that is
 * sending them.
 */
export const claimed = new Set<string>();

/**
 * What the screen shows for writes still waiting their turn. A read that comes
 * back meanwhile reapplies them, so a change does not blink back to what
 * Todoist had before it was sent.
 */
const waiting = new Map<number, (snapshot: Snapshot) => Snapshot>();
let nextWaiting = 0;

export function holdOptimistic(change: (snapshot: Snapshot) => Snapshot): () => void {
  const key = nextWaiting++;
  waiting.set(key, change);
  return () => { waiting.delete(key); };
}

/** The waiting changes laid over a snapshot just read, oldest first. */
export function reapplyWaiting(snapshot: Snapshot): Snapshot {
  let next = snapshot;
  for (const change of waiting.values()) {
    try { next = change(next); } catch { /* a change that no longer fits is left to its write */ }
  }
  return next;
}

/** For tests: forget every claim and waiting change. */
export function resetSyncGate() {
  chain = Promise.resolve();
  claimed.clear();
  waiting.clear();
}
