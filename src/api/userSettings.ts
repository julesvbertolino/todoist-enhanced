import { request } from './client';

/**
 * Whether the account asks Todoist to reset a recurring task's subtasks when
 * the task is completed (Settings › General › "Reset sub-tasks").
 *
 * Todoist's own apps do that reset themselves after closing the parent;
 * `item_close` alone leaves the subtasks ticked.
 *
 * Read from Todoist at most every ten minutes, and remembered on this device so a task
 * completed offline, or while Todoist does not answer, follows the setting as
 * last seen. Never read and not answering means "no": what Enhanced did
 * before, never a reset nobody asked for. A failed read is tried again the
 * next time, so the setting is picked up as soon as Todoist answers.
 */
const STORAGE_KEY = 'te.resetRecurringSubtasks';
/** A setting changed in Todoist meanwhile is picked up within this long. */
const MAX_AGE_MS = 10 * 60_000;
let cached: Promise<boolean> | null = null;
let readAt = 0;

function remembered(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch { return false; }
}

function remember(value: boolean): void {
  try { localStorage.setItem(STORAGE_KEY, value ? '1' : '0'); } catch { /* private mode */ }
}

export function readResetSubtasks(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return Promise.resolve(remembered());
  if (cached && Date.now() - readAt > MAX_AGE_MS) cached = null;
  if (!cached) readAt = Date.now();
  cached ??= request<{ user_settings?: { reset_recurring_subtasks?: boolean } }>('/sync', {
    method: 'POST',
    form: { sync_token: '*', resource_types: JSON.stringify(['user_settings']) },
  }).then((response) => {
    const value = response.user_settings?.reset_recurring_subtasks;
    if (typeof value !== 'boolean') { cached = null; return remembered(); }
    remember(value);
    return value;
  }).catch(() => { cached = null; return remembered(); });
  return cached;
}

/** For tests. */
export function forgetResetSubtasks(): void {
  cached = null;
}
