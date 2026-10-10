/** What more than one slice of the store needs: pure helpers, and the module state they share. */
import { addDays, addWeeks, nextDay, type Day } from 'date-fns';
import type { Command } from '@/api/commands';
import * as idb from '@/db/idb';
import type { QueuedCommand } from '@/db/idb';
import { dueDate, hasTime, toApiDate, toApiDateTime } from '@/domain/dates';
import { WEEKDAY_WORDS } from '@/domain/dateVocabulary';
import type { Item, Snapshot } from '@/domain/types';
import type { Locale } from '@/i18n';
import type { AppState } from './types';

/**
 * Where a repeating task goes next, in the demo.
 *
 * The demo cannot ask Todoist to resolve a rule, so it covers the ordinary
 * daily and weekly ones it seeds without pretending to be a parser. The rule is
 * read folded (lower case, no accents), and the new date is worked out and
 * written in local time, never through `toISOString`: that shifted the day for
 * anyone east of UTC+12, and dropped the time of a timed task (#130).
 */
export function advanceDemoRecurrence(snapshot: Snapshot, id: string): Snapshot {
  const item = snapshot.items[id];
  if (!item?.due?.is_recurring) return snapshot;
  const current = dueDate(item);
  if (!current) return snapshot;

  const rule = item.due.string.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const opener = '(?:every|each|tous les|toutes les|tous le|chaque)\\s+';
  const weekdays = [...WEEKDAY_WORDS.en, ...WEEKDAY_WORDS.fr];
  // Both lists start on Sunday, as `Date.getDay()` does, so the index is the day.
  const named = weekdays.findIndex((words) => new RegExp(`${opener}(?:${words})\\b`).test(rule));

  let next: Date;
  if (/\b(?:every day|daily|tous les jours|chaque jour|quotidien(?:ne)?)\b/.test(rule)) {
    next = addDays(current, 1);
  } else if (named >= 0) {
    // "every Monday": the next Monday after the date it stands on.
    next = nextDay(current, (named % 7) as Day);
  } else if (/\b(?:every week|weekly|chaque semaine|hebdomadaire)\b/.test(rule)) {
    next = addWeeks(current, 1);
  } else {
    next = addDays(current, 1);
  }

  return patchItem(snapshot, id, {
    due: {
      ...item.due,
      date: hasTime(item.due) ? toApiDateTime(next) : toApiDate(next),
    },
    checked: false,
  });
}

/**
 * Makes sure a change only Todoist can finish has come back finished.
 *
 * Closing a recurring task, or giving one a rule, leaves the date to Todoist.
 * Its answer to the write already carries the task as it now stands, because
 * every write is sent as an incremental sync. So nothing more is asked for
 * unless that answer did not bring the task back: then one incremental sync
 * fetches it, never a full one.
 */
export async function settleFromServer(
  get: () => AppState,
  id: string,
  unsettled: (item: Item) => boolean,
): Promise<void> {
  const state = get();
  if (state.demo || !navigator.onLine) return;
  const item = state.snapshot.items[id];
  if (item && unsettled(item)) await state.refresh();
}

/**
 * Which of these tasks are to be deleted for real: those with no ancestor that
 * is also in the list.
 *
 * Todoist deletes a task's subtasks with it, so a parent and one of its
 * subtasks both selected (⌘A picks every visible row) were sent as two
 * deletions, and the second one hit a task that was already gone (#126). The
 * order of the list is kept, an id given twice counts once, and an id the
 * snapshot does not know is dropped.
 */
export function deletionRoots(ids: string[], items: Record<string, Item>): string[] {
  const wanted = new Set(ids.filter((id) => items[id]));
  const seen = new Set<string>();
  const roots: string[] = [];
  for (const id of ids) {
    if (!wanted.has(id) || seen.has(id)) continue;
    seen.add(id);
    // Walk up; a cycle the server should never send must not hang this.
    const visited = new Set<string>([id]);
    let parent = items[id].parent_id;
    let covered = false;
    while (parent && !visited.has(parent)) {
      if (wanted.has(parent)) { covered = true; break; }
      visited.add(parent);
      parent = items[parent]?.parent_id ?? null;
    }
    if (!covered) roots.push(id);
  }
  return roots;
}

/**
 * The tasks a deletion takes with it: the roots and every descendant, parents
 * before their children, each one once. Deleted tasks are skipped.
 *
 * The parent-first order matters to whoever rebuilds the branch later, and
 * the index is built once so a long list does not scan every task for each of
 * them.
 */
export function branchOf(rootIds: string[], items: Record<string, Item>): Item[] {
  const children = new Map<string, Item[]>();
  for (const item of Object.values(items)) {
    if (!item.parent_id || item.is_deleted) continue;
    const siblings = children.get(item.parent_id);
    if (siblings) siblings.push(item);
    else children.set(item.parent_id, [item]);
  }

  const seen = new Set<string>();
  const branch: Item[] = [];
  const visit = (item: Item) => {
    if (seen.has(item.id) || item.is_deleted) return;
    seen.add(item.id);
    branch.push(item);
    for (const child of children.get(item.id) ?? []) visit(child);
  };
  for (const id of rootIds) {
    const item = items[id];
    if (item) visit(item);
  }
  return branch;
}

/**
 * The tasks to rebuild, each once and in the order they were given.
 *
 * The order is not computed here: `branchOf` hands a branch over parent-first
 * already. A comparator that only knows a parent from its own child is not a
 * consistent ordering, and a sort may put a grandchild before its grandparent.
 */
export function restoreOrder(items: Item[]): Item[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

/**
 * Whose changes are waiting in the outbox.
 *
 * The outbox outlives a sign-out on purpose: the same person signing in again
 * loses nothing. Someone else signing in on the same device must not send it,
 * or the old account's commands go out with the new account's token — refused
 * in a burst when they name old ids, and created in the wrong account when
 * they name none (#129).
 *
 * A command carries the account it was made in. One queued before that was
 * recorded carries none, and is only taken as the signed-in person's when the
 * copy cached on the device was theirs too (`legacyOwner`).
 */
export function partitionQueue(
  queue: QueuedCommand[],
  userId: string,
  legacyOwner: string | null | undefined,
): { mine: QueuedCommand[]; foreign: QueuedCommand[] } {
  const mine: QueuedCommand[] = [];
  const foreign: QueuedCommand[] = [];
  for (const cmd of queue) {
    const owner = cmd.userId ?? legacyOwner ?? null;
    (owner === userId ? mine : foreign).push(cmd);
  }
  return { mine, foreign };
}

/** How long a toast with an undo stays up, and so how long a deletion waits. */
export const UNDO_TOAST_MS = 8000;

/**
 * How long a plain confirmation stays up. Three seconds is long enough to read
 * a short sentence, and every toast can now be put away sooner (#140).
 * `UNDO_TOAST_MS` above is not shortened with it: it is also how long a
 * deletion waits before it is sent.
 */
export const TOAST_MS = 3000;

/** An error is a long sentence about something that did not happen: it stays longer. */
export const ERROR_TOAST_MS = 6000;

/**
 * Deletions that have not been sent yet.
 *
 * Todoist has no undelete, so a deletion is held back for as long as its
 * toast offers to undo it: the rows leave the screen at once, and the
 * `item_delete` only goes out when the toast does. Undoing inside that window
 * cancels a command that was never sent, which gives back the very same task
 * — its id, its comments, its reminders, its assignee, its history — instead
 * of a copy rebuilt from memory.
 */
export interface PendingDelete {
  timer: ReturnType<typeof setTimeout>;
  commands: Command[];
  /** The removed tasks, subtasks included, exactly as they were. */
  items: Item[];

  /** Written to the offline queue because the page was being left. */
  queued: boolean;
}
export const pendingDeletes = new Map<string, PendingDelete>();

/** Every task id a pending deletion is holding off the screen. */
export function pendingIds(): Set<string> {
  const ids = new Set<string>();
  for (const pending of pendingDeletes.values()) {
    for (const item of pending.items) ids.add(item.id);
  }
  return ids;
}

/**
 * Keeps pending deletions off the screen whatever a sync says.
 *
 * Todoist still has those tasks until the deletion goes out, so any sync in
 * the meantime — a poll, a write's answer, a full read — would bring them
 * straight back without this.
 */
export function hidePending(snapshot: Snapshot): Snapshot {
  if (pendingDeletes.size === 0) return snapshot;
  const hidden = pendingIds();
  if (!Object.keys(snapshot.items).some((id) => hidden.has(id))) return snapshot;
  const items = { ...snapshot.items };
  for (const id of hidden) delete items[id];
  return { ...snapshot, items };
}

/**
 * What goes to disk puts pending deletions back.
 *
 * If the page closes before a deletion is sent and before it reaches the
 * queue, the copy on disk must still have the tasks: Todoist does, and an
 * incremental sync would never bring back something that did not change.
 */
export function withPending(snapshot: Snapshot): Snapshot {
  if (pendingDeletes.size === 0) return snapshot;
  const items = { ...snapshot.items };
  for (const pending of pendingDeletes.values()) {
    for (const item of pending.items) items[item.id] = item;
  }
  return { ...snapshot, items };
}

/** Writes the snapshot to the device without blocking the interface. */
export let persistTimer: ReturnType<typeof setTimeout> | null = null;

/** The copy waiting for its write, so a page that is being left can write it now. */
let waiting: Snapshot | null = null;

export function schedulePersist(snapshot: Snapshot) {
  waiting = snapshot;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(flushPersist, 400);
}

/**
 * Writes the waiting copy now instead of when the timer would.
 *
 * The write waits 400 ms after the last change, which a page that is hidden
 * inside that time never got to: a change made just before switching app or
 * closing the tab was in the outbox but not in the copy kept on the device, and
 * the next launch without a connection showed the workspace as it was before it
 * (#132). Nothing waiting, nothing written.
 */
export function flushPersist() {
  if (persistTimer) { clearTimeout(persistTimer); persistTimer = null; }
  if (!waiting) return;
  const snapshot = withPending(waiting);
  waiting = null;
  void idb.saveSnapshot(snapshot);
}

/**
 * What to say when Todoist refuses a change.
 *
 * Nearly every refusal a person will meet here is an account limit: a free
 * plan allows five active projects, and the caps on sections, tags,
 * collaborators and comments work the same way. Todoist answers with a short
 * English sentence, which is accurate and says nothing about what to do, so a
 * limit gets the sentence plus the one thing worth knowing — that the change
 * did not happen, and where the limit lives. Anything else is passed through
 * as Todoist worded it rather than guessed at.
 */
export function explainFailure(error: string, locale: Locale): string {
  const limit = /limit|maximum|quota|exceed|reached|too many/i.test(error);
  const said = error.trim();
  /* "Item not found" on a task that is on screen (#28): Todoist does not let
     this account write to it, typically a task of a team project it can see
     but has not joined. Said plainly rather than as Todoist's two words. */
  if (/^item not found$/i.test(said)) {
    return locale === 'fr'
      ? 'Todoist ne permet pas à ce compte de modifier cette tâche (souvent un projet d’équipe que vous voyez sans l’avoir rejoint). Rien n’a été enregistré.'
      : 'Todoist does not let this account change this task (often a team project you can see but have not joined). Nothing was saved.';
  }
  if (locale === 'fr') {
    /* Todoist's sentence is English, and a French message with an English
       sentence in the middle reads as a bug. A limit is named in French from
       what it counts; anything else keeps Todoist's words, quoted, so it is
       clear whose they are. */
    if (limit) {
      const what = /project/i.test(said) ? ' de projets'
        : /section/i.test(said) ? ' de sections'
          : /label|tag/i.test(said) ? " d’étiquettes"
            : /comment|note/i.test(said) ? ' de commentaires'
              : /collaborator|member/i.test(said) ? ' de collaborateurs'
                : /task|item/i.test(said) ? ' de tâches'
                  : '';
      return `Limite${what} atteinte : c’est une limite de votre compte ou de votre espace de travail Todoist, pas de cette application. La modification n’a pas été enregistrée.`;
    }
    return said
      ? `Todoist a refusé cette modification (« ${said} »). Elle n’a pas été enregistrée.`
      : 'Todoist a refusé cette modification. Elle n’a pas été enregistrée.';
  }
  const english = said || 'Todoist refused it';
  return limit
    ? `${english} — this is a limit on your Todoist account or workspace, not on this app. The change was not saved.`
    : `Todoist refused this: ${english}. The change was not saved.`;
}

/**
 * What to say when Todoist refused some of a batch.
 *
 * All of it refused reads as before. Part of it refused says how much was
 * kept, so a bulk edit that half worked is not mistaken for one that did
 * nothing or one that did everything.
 */
export function explainFailures(
  failures: Array<{ error: string }>,
  total: number,
  locale: Locale,
): string {
  const reason = explainFailure(failures[0].error, locale);
  const saved = total - failures.length;
  if (saved <= 0) return reason;
  return locale === 'fr'
    ? `${saved} modification${saved > 1 ? 's' : ''} sur ${total} enregistrée${saved > 1 ? 's' : ''}. ${reason}`
    : `${saved} of ${total} changes saved. ${reason}`;
}

/** The collection a command acts on, read from its type. */
export function collectionOf(type: string): 'items' | 'projects' | 'sections' | 'labels' | 'notes' | null {
  if (type.startsWith('item_')) return 'items';
  if (type.startsWith('project_')) return 'projects';
  if (type.startsWith('section_')) return 'sections';
  if (type.startsWith('label_')) return 'labels';
  if (type.startsWith('note_')) return 'notes';
  return null;
}

/** Every id a command changes, whatever shape its arguments take. */
export function idsTouchedBy(cmd: Command): string[] {
  const args = cmd.args as Record<string, unknown>;
  const ids: string[] = [];
  if (typeof args.id === 'string') ids.push(args.id);
  for (const key of ['items', 'projects', 'sections']) {
    const list = args[key];
    if (Array.isArray(list)) {
      for (const entry of list) {
        if (entry && typeof (entry as { id?: unknown }).id === 'string') ids.push((entry as { id: string }).id);
      }
    }
  }
  for (const key of ['ids_to_orders', 'id_order_mapping']) {
    const map = args[key];
    if (map && typeof map === 'object') ids.push(...Object.keys(map));
  }
  return ids;
}

/**
 * Takes back, on screen, exactly what Todoist refused.
 *
 * A refused change used to roll the whole screen back to before the batch,
 * the accepted part with it. Now each refused command gives back only the
 * objects it touched, as they were before, and a refused creation takes its
 * placeholder away. Everything Todoist accepted stays as Todoist returned it.
 */
export function revertRefused(
  current: Snapshot,
  before: Snapshot,
  commands: Command[],
  failures: Array<{ uuid: string }>,
): Snapshot {
  const refused = new Set(failures.map((failure) => failure.uuid));
  const next: Snapshot = {
    ...current,
    items: { ...current.items },
    projects: { ...current.projects },
    sections: { ...current.sections },
    labels: { ...current.labels },
    notes: { ...current.notes },
  };
  for (const cmd of commands) {
    if (!refused.has(cmd.uuid)) continue;
    /* An invitation answered and refused gets its buttons back (#10). */
    if (cmd.type === 'accept_invitation' || cmd.type === 'reject_invitation') {
      const invitation = (cmd.args as { invitation_id?: string }).invitation_id;
      const notifications = { ...(next.notifications ?? {}) };
      for (const [id, note] of Object.entries(before.notifications ?? {})) {
        if (note.invitation_id === invitation) notifications[id] = note;
      }
      next.notifications = notifications;
      continue;
    }
    const collection = collectionOf(cmd.type);
    if (!collection) continue;
    const target = next[collection] as Record<string, unknown>;
    const was = before[collection] as Record<string, unknown>;
    if (cmd.temp_id) delete target[cmd.temp_id];
    for (const id of idsTouchedBy(cmd)) {
      if (was[id]) target[id] = was[id];
      else delete target[id];
    }
  }
  return next;
}

/** Applies a field change to one task in the snapshot. */
export function patchItem(snapshot: Snapshot, id: string, args: Record<string, unknown>): Snapshot {
  const item = snapshot.items[id];
  if (!item) return snapshot;
  return { ...snapshot, items: { ...snapshot.items, [id]: { ...item, ...args } as Item } };
}
