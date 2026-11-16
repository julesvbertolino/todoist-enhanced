/**
 * A project's icon, carried inside its own description.
 *
 * Todoist's project has nowhere built-in for this — unlike the duration
 * estimate, which rides a real field by hiding inside a task's labels (see
 * `domain/estimates.ts`) — but unlike a task, a project does have one
 * free-form field of its own that syncs: `description`. The icon rides as an
 * HTML comment appended after whatever the description already says, on its
 * own line at the very end. An HTML comment because the description is
 * rendered as Markdown everywhere it is only read (`EditableDescription`),
 * where a comment draws nothing — the marker only becomes visible text where
 * the raw string is put in front of someone to edit, which is exactly where
 * `stripProjectIcon` is used to take it back out first.
 *
 * This makes the icon real Todoist data: it follows the account to another
 * browser, and shows up (as three harmless lines at the foot of the
 * description) in Todoist's own apps too.
 */

import { isProjectIconId } from './projectIconIds';

const MARKER = /\n{0,2}<!--\s*icon:([a-z0-9-]+)\s*-->\s*$/i;

/** The icon a project's description is carrying, if any. */
export function readProjectIcon(description: string | null | undefined): string | null {
  const match = (description ?? '').match(MARKER);
  return match && isProjectIconId(match[1]) ? match[1] : null;
}

/** The description with any icon marker taken back out — what a person should ever read or edit. */
export function stripProjectIcon(description: string | null | undefined): string {
  return (description ?? '').replace(MARKER, '');
}

/** The description to send Todoist: the visible text, the marker appended or removed. */
export function withProjectIcon(description: string, iconId: string | null): string {
  const base = stripProjectIcon(description).replace(/\s+$/, '');
  if (!iconId) return base;
  return base ? `${base}\n\n<!-- icon:${iconId} -->` : `<!-- icon:${iconId} -->`;
}
