import { request } from './client';

/**
 * Whether the account asks Todoist to reset a recurring task's subtasks when
 * the task is completed (Settings › General › "Reset sub-tasks").
 *
 * Todoist's own apps do that reset themselves after closing the parent;
 * `item_close` alone leaves the subtasks ticked. Read once per session and
 * kept: the setting rarely changes. A read that fails says "no", which is
 * what Enhanced did before, never a reset the user did not ask for.
 */
let cached: Promise<boolean> | null = null;

export function readResetSubtasks(): Promise<boolean> {
  cached ??= request<{ user_settings?: { reset_recurring_subtasks?: boolean } }>('/sync', {
    method: 'POST',
    form: { sync_token: '*', resource_types: JSON.stringify(['user_settings']) },
  }).then((response) => response.user_settings?.reset_recurring_subtasks === true)
    .catch(() => { cached = null; return false; });
  return cached;
}

/** For tests. */
export function forgetResetSubtasks(): void {
  cached = null;
}
