/**
 * What went wrong with syncing lately, in words a bug report can carry (#469).
 *
 * Only the kind of failure, Todoist's status and tag, and when: never a task's
 * title or description, never the token. Kept in memory and on the device, so
 * a reload after "Sync failed" still knows why.
 */
import { ApiError, NotConnectedError, TimeoutError, retryDeadline } from '@/api/client';
import * as idb from '@/db/idb';
import { networkCounts } from '@/api/networkPolicy';

export type SyncStep = 'read' | 'write' | 'folders';
export type SyncFailureKind = 'offline' | 'timeout' | 'throttled' | 'server' | 'refused' | 'auth' | 'unreadable' | 'unknown';

export interface SyncFailure {
  at: number;
  step: SyncStep;
  kind: SyncFailureKind;
  status?: number;
  tag?: string;
  /** For a write: the kinds of command Todoist refused, e.g. item_update. */
  commands?: string[];
}

export const SYNC_LOG_KEY = 'sync-log';

/** Writing the log down must never be what breaks a sync. */
function persist(next: SyncFailure[]) {
  try { void idb.savePrefs(SYNC_LOG_KEY, next).catch(() => undefined); } catch { /* no device store */ }
}
const KEEP = 10;

let entries: SyncFailure[] = [];
let listeners: Array<() => void> = [];
const safeTag = (value: unknown): string | undefined =>
  typeof value === 'string' && /^[A-Z0-9_]{1,60}$/.test(value) ? value : undefined;
const safeCommand = (value: string): string => /^[a-z_]{1,60}$/.test(value) ? value : 'other';

export function syncLog(): SyncFailure[] {
  return entries;
}

export function onSyncLog(listener: () => void): () => void {
  listeners.push(listener);
  return () => { listeners = listeners.filter((one) => one !== listener); };
}

export async function loadSyncLog(): Promise<void> {
  const stored = await idb.loadPrefs<SyncFailure[]>(SYNC_LOG_KEY).catch(() => null);
  if (Array.isArray(stored)) entries = stored.filter((entry) => entry && typeof entry.at === 'number'
    && ['read', 'write', 'folders'].includes(entry.step)
    && ['offline', 'timeout', 'throttled', 'server', 'refused', 'auth', 'unreadable', 'unknown'].includes(entry.kind)).slice(-KEEP);
}

/** The kind of an error, as the person reading the panel would say it. */
export function classify(error: unknown): Pick<SyncFailure, 'kind' | 'status' | 'tag'> {
  if (error instanceof TimeoutError) return { kind: 'timeout' };
  if (error instanceof NotConnectedError) return { kind: 'auth' };
  if (error instanceof ApiError) {
    const body = (error.body && typeof error.body === 'object' ? error.body : {}) as { error_tag?: unknown };
    const tag = safeTag(body.error_tag);
    return { kind: error.isAuthError ? 'auth' : error.status === 429 ? 'throttled' : error.status >= 500 ? 'server' : 'refused', status: error.status, ...(tag ? { tag } : {}) };
  }
  if (error instanceof Error && /could not be read|did not acknowledge|did not return an identifier/i.test(error.message)) return { kind: 'unreadable' };
  if (typeof navigator !== 'undefined' && !navigator.onLine) return { kind: 'offline' };
  if (error instanceof TypeError || (error instanceof DOMException && error.name === 'AbortError')) return { kind: 'offline' };
  return { kind: 'unknown' };
}

export function recordSyncFailure(step: SyncStep, error: unknown, extra: Partial<SyncFailure> = {}) {
  entries = [...entries, { at: Date.now(), step, ...classify(error), ...extra }].slice(-KEEP);
  persist(entries);
  for (const listener of listeners) listener();
}

export function recordRefusal(step: SyncStep, refusals: Array<{ errorTag?: string; commandType?: string }>, types: string[]) {
  const tag = safeTag(refusals[0]?.errorTag);
  entries = [...entries, {
    at: Date.now(), step, kind: 'refused' as const,
    ...(tag ? { tag } : {}),
    commands: [...new Set(types.map(safeCommand))].slice(0, 6),
  }].slice(-KEEP);
  persist(entries);
  for (const listener of listeners) listener();
}

export function clearSyncLog() {
  entries = [];
  persist(entries);
  for (const listener of listeners) listener();
}

/** Plain text for a bug report: nothing from the tasks themselves. */
export function syncReport(info: {
  version: string; userAgent: string; state: string; syncedAt?: number | null;
  queue: Array<{ type: string; attempts?: number; queuedAt?: number }>; now?: number;
}): string {
  const iso = (ms: number) => new Date(ms).toISOString();
  const types = new Map<string, number>();
  let attempts = 0;
  let oldest: number | null = null;
  for (const cmd of info.queue) {
    const type = safeCommand(cmd.type);
    types.set(type, (types.get(type) ?? 0) + 1);
    attempts = Math.max(attempts, cmd.attempts ?? 0);
    if (cmd.queuedAt && (!oldest || cmd.queuedAt < oldest)) oldest = cmd.queuedAt;
  }
  const traffic = networkCounts();
  const lines = [
    `Enhanced for Todoist ${info.version}`,
    `Browser: ${info.userAgent}`,
    `Online: ${typeof navigator !== 'undefined' ? String(navigator.onLine) : 'unknown'}`,
    `Report time: ${iso(info.now ?? Date.now())}`,
    `Sync state: ${info.state}`,
    `Last successful sync: ${info.syncedAt ? iso(info.syncedAt) : 'never'}`,
    `Retry after: ${retryDeadline() ? iso(retryDeadline()!) : 'none'}`,
    `Changes waiting: ${info.queue.length}${info.queue.length ? ` (${[...types].map(([type, count]) => `${type} ×${count}`).join(', ')}; most attempts ${attempts})` : ''}`,
    `Oldest pending change: ${oldest ? iso(oldest) : 'unknown'}`,
    `Requests in this window (last 15 minutes, capped at 2000): auth ${traffic.authentication}, writes ${traffic.write}, sync ${traffic.sync}, other ${traffic.other}`,
    'Recent sync failures:',
    ...(entries.length === 0 ? ['  none'] : [...entries].reverse().map((entry) => `  ${iso(entry.at)} ${entry.step} ${entry.kind}${entry.status ? ` ${entry.status}` : ''}${safeTag(entry.tag) ? ` ${safeTag(entry.tag)}` : ''}${entry.commands?.length ? ` [${entry.commands.map(safeCommand).join(', ')}]` : ''}`)),
  ];
  return lines.join('\n');
}
