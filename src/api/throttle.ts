import { accountOnDevice } from '@/lib/accountWatch';

/** A server-imposed pause is shared by every caller and same-origin window. */
const pauseMemory = new Map<string, number>();
/** Reset transient test state. */
export function resetRetryPauses(): void { pauseMemory.clear(); }
export function pauseKey(): string { return `tde.retryAfter.${accountOnDevice() ?? 'unknown'}`; }
export function pauseUntil(key: string): number {
  let stored = 0;
  try { stored = Number(localStorage.getItem(key)) || 0; } catch { /* storage unavailable */ }
  return Math.max(pauseMemory.get(key) ?? 0, stored);
}
export function retryDeadline(): number | null {
  const until = pauseUntil(pauseKey());
  return until > Date.now() ? until : null;
}
export function rememberPause(key: string, until: number): void {
  const next = Math.max(pauseUntil(key), until);
  pauseMemory.set(key, next);
  try { localStorage.setItem(key, String(next)); } catch { /* in-memory fallback */ }
}
export function pauseForServer(ms: number): void {
  if (Number.isFinite(ms) && ms > 0) rememberPause(pauseKey(), Date.now() + ms);
}
export function retryDelay(header: string | null, body: string, now = Date.now()): number | null {
  const values: number[] = [];
  if (header) {
    const numeric = Number(header);
    const delay = Number.isFinite(numeric) ? numeric * 1000 : Date.parse(header) - now;
    if (Number.isFinite(delay) && delay > 0) values.push(delay);
  }
  try {
    const seconds = JSON.parse(body)?.error_extra?.retry_after;
    if (typeof seconds === 'number' && Number.isFinite(seconds) && seconds > 0) values.push(seconds * 1000);
  } catch { /* non-JSON response */ }
  return values.length ? Math.max(...values) : null;
}

