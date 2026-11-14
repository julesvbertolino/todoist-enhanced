/** A short-lived, account-scoped cache for explicitly requested history reads. */
const TTL_MS = 10_000;
const VERSION_KEY = 'tde.history.version';
type Flight<T> = { promise: Promise<T>; controller: AbortController; users: number };
const flights = new Map<string, Flight<unknown>>();
const cache = new Map<string, { until: number; value: unknown }>();
let generation = 0;
const abortError = () => new DOMException('Aborted', 'AbortError');
const version = () => { try { return localStorage.getItem(VERSION_KEY) ?? ''; } catch { return ''; } };

/** Local edits invalidate caches in every same-origin window. */
export function invalidateHistory(): void {
  generation += 1;
  cache.clear();
  try { localStorage.setItem(VERSION_KEY, crypto.randomUUID()); } catch { /* no shared storage */ }
}

export function sharedRead<T>(owner: string | null, query: string, signal: AbortSignal | undefined, read: (signal: AbortSignal) => Promise<T>): Promise<T> {
  if (signal?.aborted) return Promise.reject(abortError());
  if (!owner) {
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    return read(controller.signal).finally(() => signal?.removeEventListener('abort', abort));
  }
  const key = JSON.stringify([owner, version(), query]);
  const hit = cache.get(key);
  if (hit && hit.until > Date.now()) return Promise.resolve(hit.value as T);
  if (hit) cache.delete(key);
  let flight = flights.get(key) as Flight<T> | undefined;
  if (!flight) {
    const controller = new AbortController();
    const started = generation;
    const pending: Flight<T> = { controller, users: 0, promise: Promise.resolve(undefined as T) };
    pending.promise = read(controller.signal).then((value) => {
      if (!controller.signal.aborted && started === generation && key === JSON.stringify([owner, version(), query])) {
        if (cache.size >= 30) cache.delete(cache.keys().next().value!);
        cache.set(key, { value, until: Date.now() + TTL_MS });
      }
      return value;
    }).finally(() => { if (flights.get(key) === pending) flights.delete(key); });
    flight = pending;
    flights.set(key, pending);
  }
  const current = flight;
  current.users += 1;
  return new Promise<T>((resolve, reject) => {
    let done = false;
    const finish = () => {
      if (done) return false;
      done = true;
      signal?.removeEventListener('abort', abort);
      current.users -= 1;
      return true;
    };
    const abort = () => {
      if (!finish()) return;
      if (current.users === 0) { current.controller.abort(); if (flights.get(key) === current) flights.delete(key); }
      reject(abortError());
    };
    signal?.addEventListener('abort', abort, { once: true });
    current.promise.then((value) => { if (finish()) resolve(value); }, (error: unknown) => { if (finish()) reject(error); });
  });
}
