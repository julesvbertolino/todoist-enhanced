import { leaseTurn } from '@/db/lease';
/** A small priority queue keeps background reads from crowding out edits. */
type Job = { priority: number; run: () => Promise<void> };
const queue: Job[] = [];
let running = false;
let lastStart = 0;
const INTERVAL_MS = 100;
const LAST_KEY = 'tde.network.lastStart';
const recent: Array<{ at: number; category: 'authentication' | 'write' | 'sync' | 'other' }> = [];

/** Bounded anonymous traffic counts for the local diagnostic report. */
export function networkCounts(): Record<'authentication' | 'write' | 'sync' | 'other', number> {
  const cutoff = Date.now() - 15 * 60_000;
  while (recent.length && recent[0].at < cutoff) recent.shift();
  const counts = { authentication: 0, write: 0, sync: 0, other: 0 };
  for (const entry of recent) counts[entry.category] += 1;
  return counts;
}
export function recordNetworkAttempt(priority: number): void {
  networkCounts();
  if (recent.length >= 2000) recent.shift();
  recent.push({ at: Date.now(), category: priority >= 3 ? 'authentication' : priority === 2 ? 'write' : priority === 1 ? 'sync' : 'other' });
}

function abortError(): DOMException { return new DOMException('Aborted', 'AbortError'); }
function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(abortError()); return; }
    const stop = () => { clearTimeout(timer); reject(abortError()); };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', stop); resolve(); }, ms);
    signal?.addEventListener('abort', stop, { once: true });
  });
}
async function pump(): Promise<void> {
  if (running || !queue.length) return;
  running = true;
  try { while (queue.length) await queue.shift()!.run(); }
  finally { running = false; }
}

/** The network turn covers the response body; Web Locks shares it across windows. */
export function networkTurn<T>(work: () => Promise<T>, priority: number, signal?: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      const index = queue.indexOf(job);
      if (index >= 0) { queue.splice(index, 1); reject(abortError()); }
    };
    const job: Job = { priority, run: async () => {
      signal?.removeEventListener('abort', onAbort);
      try {
        if (signal?.aborted) throw abortError();
        const perform = async (): Promise<T> => {
          if (signal?.aborted) throw abortError();
          let stored = 0;
          try { stored = Number(localStorage.getItem(LAST_KEY)) || 0; } catch { /* unavailable */ }
          // Node tests do not have a browser clock; browsers keep a bounded rate.
          const interval = typeof window === 'undefined' ? 0 : INTERVAL_MS;
          const wait = interval ? Math.max(0, Math.max(lastStart, stored) + interval - Date.now()) : 0;
          if (wait) await delay(wait, signal);
          lastStart = Date.now();
          try { localStorage.setItem(LAST_KEY, String(lastStart)); } catch { /* unavailable */ }
          return work();
        };
        const result = typeof navigator !== 'undefined' && navigator.locks
          ? await navigator.locks.request<Promise<T>>('todoist-enhanced-network', signal ? { signal } : {}, perform)
          : typeof indexedDB !== 'undefined' ? await leaseTurn('todoist-enhanced-network', perform, signal) : await perform();
        resolve(result);
      } catch (error) { reject(error); }
    } };
    if (signal?.aborted) { reject(abortError()); return; }
    signal?.addEventListener('abort', onAbort, { once: true });
    queue.push(job);
    queue.sort((a, b) => b.priority - a.priority);
    void pump();
  });
}
