import { withStep, stepLabel, STEPS, type Step } from './steps';
import { SYSTEM_LABELS, weekLabel, withoutHorizons, type Item } from './types';
import { toApiDate } from './dates';
import { dueForDate } from './recurrence';
import { byChildOrder } from './orderKey';

/**
 * What a drop means.
 *
 * Section 7 of the specification fixes one mutation per destination. Putting
 * them in one place keeps the rules readable and stops the interface from
 * inventing its own.
 */

export type DropTarget =
  | { kind: 'step'; step: Step }
  | { kind: 'today' }
  /** Today, and tagged quick: the Quick group is defined by that tag. */
  | { kind: 'quick' }
  | { kind: 'anytime' }
  /** A horizon past this week, carried by the `later` tag. */
  | { kind: 'month' }
  | { kind: 'someday' }
  /**
   * A calendar day, and optionally a time of day (`HH:mm:ss`) typed with it in
   * a date picker. Without one a task keeps the time it already has.
   */
  | { kind: 'day'; date: Date; time?: string }
  | { kind: 'project'; projectId: string }
  | { kind: 'section'; sectionId: string | null; projectId: string }
  | { kind: 'label'; label: string }
  /**
   * The Favourites heading in the sidebar.
   *
   * A place for a project or a tag to be dropped, and for nothing else: a
   * task has no business being a favourite, so `dropMutation` reads this as
   * no mutation at all and the heading stands down while a task is in flight.
   */
  | { kind: 'favourites' };

export interface DropMutation {
  /** Fields for an `item_update` command, when the drop changes the task itself. */
  update?: Record<string, unknown>;
  /** Fields for an `item_move` command, when the drop changes where it lives. */
  move?: { project_id?: string; section_id?: string | null };
}

/**
 * Todoist's `item_move` takes exactly one destination. A section implies its
 * project, so the section is sent when there is one and the project otherwise.
 */
export function moveArgs(
  move: { project_id?: string; section_id?: string | null },
): { section_id: string } | { project_id?: string } {
  return move.section_id ? { section_id: move.section_id } : { project_id: move.project_id };
}

/** Horizons exclude each other: a task is in the week, later, or in neither. */
const withoutHorizon = withoutHorizons;

const withWeek = (labels: string[]): string[] =>
  withoutHorizon(labels).concat(weekLabel());

const withMonth = (labels: string[]): string[] =>
  withoutHorizon(labels).concat(SYSTEM_LABELS.month);

/**
 * A due value for a calendar date.
 *
 * The one in domain/recurrence, because dropping a repeating task onto a day
 * is the commonest way to end a series by accident: it used to write the date
 * into `due.string` while leaving `is_recurring` true, which leaves a task
 * wearing a repeat marker that will never repeat again.
 */
const dueOn = (item: Item, date: Date, time?: string) =>
  dueForDate(item.due, time ? `${toApiDate(date)}T${time}` : toApiDate(date));

/**
 * Where a task typed into a group should land, from what the group means.
 *
 * A section's "Add task" line and a task dropped onto that same section are
 * the same intention said two ways, and they used to disagree: dropping into
 * Anytime this week put the week label on, and adding there opened an empty
 * composer, so the task went to Someday — out of the section it was added
 * from and out of the week. Both readings come from one table now, so a group
 * cannot mean one thing to a drop and another to a line.
 */
export interface TaskPlacement {
  minutes?: number;
  responsibleUid?: string | null;
  projectId?: string;
  sectionId?: string;
  date?: string;
  labels?: string[];
  /** As it is written and read, 1 to 4, not Todoist's inverted number. */
  priority?: 1 | 2 | 3 | 4;
}

export function placementFor(target: DropTarget, now = new Date()): TaskPlacement {
  switch (target.kind) {
    case 'step': return { labels: [stepLabel(target.step)] };
    case 'today':
      return { date: toApiDate(now) };
    case 'quick':
      return { date: toApiDate(now), labels: [SYSTEM_LABELS.quick] };
    case 'day':
      return { date: toApiDate(target.date) };
    case 'anytime':
      return { labels: [weekLabel()] };
    case 'month':
      return { labels: [SYSTEM_LABELS.month] };
    // Nothing to carry: Someday is what a task with no date and no week label
    // already is.
    case 'someday':
      return {};
    case 'project':
      return { projectId: target.projectId };
    case 'section':
      return target.sectionId
        ? { projectId: target.projectId, sectionId: target.sectionId }
        : { projectId: target.projectId };
    case 'label':
      return { labels: [target.label] };
    default:
      return {};
  }
}

/**
 * What a task created from a page with the Q shortcut starts with: the page's
 * project, Today's date, the tag of a tag page, My week's label. The same as the page's own
 * "Add task" line, so the two never disagree. Pages that fix nothing (Upcoming,
 * a filter) give nothing.
 */
export function placementForPage(
  page: { view: string; id?: string },
  inboxId: string | undefined,
  now = new Date(),
): TaskPlacement {
  switch (page.view) {
    case 'project':
      return page.id ? { projectId: page.id } : {};
    case 'inbox':
      return inboxId ? { projectId: inboxId } : {};
    case 'today':
      return placementFor({ kind: 'today' }, now);
    /* My week's own "Add task" line puts a task in the week with its label. */
    case 'week':
      return placementFor({ kind: 'anytime' }, now);
    case 'month':
      return placementFor({ kind: 'month' }, now);
    case 'label':
      return page.id ? { labels: [page.id] } : {};
    default:
      return {};
  }
}

export function dropMutation(item: Item, target: DropTarget): DropMutation | null {
  switch (target.kind) {
    case 'step': return { update: { labels: withStep(item.labels, target.step) } };
    case 'today':
      // Today's date, the week label dropped, the time of day and reminders kept.
      return { update: { due: dueOn(item, new Date()), labels: withoutHorizon(item.labels) } };

    case 'quick': {
      const labels = withoutHorizon(item.labels);
      const tagged = labels.some((l) => l.toLowerCase() === SYSTEM_LABELS.quick);
      return {
        update: {
          due: dueOn(item, new Date()),
          labels: tagged ? labels : [...labels, SYSTEM_LABELS.quick],
        },
      };
    }

    case 'day':
      /* A real date and the week tag on the same task is the contradiction the
         app reports rather than resolves, so giving a task a day takes the tag
         off — exactly as dropping it on Today does. */
      return { update: { due: dueOn(item, target.date, target.time), labels: withoutHorizon(item.labels) } };

    case 'anytime':
      // Committed to this week, but to no particular day.
      return { update: { due: null, labels: withWeek(item.labels) } };

    case 'month':
      return { update: { due: null, labels: withMonth(item.labels) } };

    case 'someday':
      return { update: { due: null, labels: withoutHorizon(item.labels) } };

    /* A subtask dropped on the place it already lives in is lifted out of its
       parent, so the same list it came from is still a real destination. */
    case 'project':
      if (item.project_id === target.projectId && !item.parent_id) return null;
      return { move: { project_id: target.projectId } };

    case 'section':
      /* A project is a section destination with no section, so "already there"
         has to mean the same project as well: a task with no section compared
         only by section reads as already in every project (#205). */
      if (
        item.project_id === target.projectId
        && (item.section_id ?? null) === (target.sectionId ?? null)
        && !item.parent_id
      ) return null;
      return { move: { project_id: target.projectId, section_id: target.sectionId } };

    case 'label': {
      // A tag is added to whatever the task already carries; it never replaces.
      const already = item.labels.some((l) => l.toLowerCase() === target.label.toLowerCase());
      if (already) return null;
      return { update: { labels: [...item.labels, target.label] } };
    }

    default:
      return null;
  }
}

/**
 * The droppable id of a task row that another task can be dropped onto.
 *
 * One target, two readings, told apart by direction the way the sidebar tells
 * them apart: straight down the list the task takes that row's position, out
 * to the right it goes inside it. Kept apart from `DropTarget` because neither
 * is a destination with a mutation of its own — both need the row itself, one
 * for its place among its siblings and the other for the project and section
 * the task follows it into.
 */
const ROW_PREFIX = 'row:';
export const rowTargetId = (itemId: string): string => `${ROW_PREFIX}${itemId}`;
export const decodeRowTarget = (id: string): string | null =>
  (id.startsWith(ROW_PREFIX) ? id.slice(ROW_PREFIX.length).split('|')[0] : null);

/**
 * How a list keeps the order its rows are dropped into.
 *
 * `project` is one project's own numbering, which is what Todoist counts and
 * what a project page shows. `day` is the number Todoist keeps for the lists
 * that cross projects — a week, a tag, everything you put off — because there
 * is no other field that can hold an order across them.
 */
export type RowOrder = 'project' | 'day';

/**
 * The tasks that share a place with this one, in the order they are drawn.
 *
 * Todoist counts `child_order` inside one container — a project, or a section
 * of it, or a parent task — so those are the tasks a reorder can renumber, and
 * a task dropped in from anywhere else has to join the container first.
 */
export function siblingTasks(items: Record<string, Item>, of: Item): string[] {
  return Object.values(items)
    .filter((other) => !other.is_deleted
      && other.project_id === of.project_id
      && (other.section_id ?? null) === (of.section_id ?? null)
      && (other.parent_id ?? null) === (of.parent_id ?? null))
    .sort(byChildOrder)
    .map((other) => other.id);
}

/**
 * How many levels of subtasks Todoist keeps under a task. It refuses a move
 * that would go deeper, and the row would jump back on the next sync.
 */
export const MAX_SUBTASK_DEPTH = 4;

/** How many parents a task has above it. */
function depthOf(items: Record<string, Item>, id: string): number {
  let depth = 0;
  for (let at = items[id]; at?.parent_id; at = items[at.parent_id]) depth += 1;
  return depth;
}

/**
 * The open subtasks of every task, built once per snapshot.
 *
 * Every row on screen asks `canNest` the same question the moment a drag
 * crosses the indent threshold, and reading the depth below a task by walking
 * the whole snapshot made that a scan of every task for every row. The
 * snapshot is replaced rather than edited, so a new one builds a new index and
 * the old one is collected with it.
 */
const childIndexes = new WeakMap<Record<string, Item>, Map<string, Item[]>>();

function childrenIndex(items: Record<string, Item>): Map<string, Item[]> {
  const cached = childIndexes.get(items);
  if (cached) return cached;
  const index = new Map<string, Item[]>();
  for (const item of Object.values(items)) {
    if (!item.parent_id || item.is_deleted) continue;
    const siblings = index.get(item.parent_id);
    if (siblings) siblings.push(item);
    else index.set(item.parent_id, [item]);
  }
  childIndexes.set(items, index);
  return index;
}

/** How many levels of open subtasks hang below a task; 0 for none. */
function heightOf(items: Record<string, Item>, id: string): number {
  const index = childrenIndex(items);
  const below = (parentId: string): number => {
    let height = 0;
    for (const child of index.get(parentId) ?? []) height = Math.max(height, 1 + below(child.id));
    return height;
  };
  return below(id);
}

/**
 * Whether a task may go inside another one: not inside itself, not inside
 * something already below it, not where it already is, and not so deep that
 * it or its own subtasks would pass the limit.
 */
export function canNest(items: Record<string, Item>, itemId: string, parentId: string): boolean {
  const item = items[itemId];
  const parent = items[parentId];
  if (!item || !parent || item.parent_id === parentId) return false;
  for (let at: Item | undefined = parent; at; at = at.parent_id ? items[at.parent_id] : undefined) {
    if (at.id === itemId) return false;
  }
  return depthOf(items, parentId) + 1 + heightOf(items, itemId) <= MAX_SUBTASK_DEPTH;
}

/**
 * The order a drop onto a row gives a set of siblings.
 *
 * `siblings` are all the tasks of one container in the database's order and
 * `shown` the ones the page draws, in the order it draws them. The shown ones
 * are laid back into their own slots in screen order and the ones a filter is
 * hiding keep the places they had between them, so the drop is about the page
 * in front of you. The task takes the row's place: dragged down it lands below
 * the row you aimed at, dragged up above it, and a task from elsewhere goes in
 * before the row, or after it when asked. Null when the row is not among them.
 */
export function arrangeDrop(
  siblings: string[], shown: string[], itemId: string, rowId: string, landAfter = false,
  place?: 'before' | 'after' | 'first',
): { arranged: string[]; next: string[] } | null {
  const visible = shown.filter((id) => siblings.includes(id));
  const arranged = [...siblings];
  const slots = siblings
    .map((id, at) => (visible.includes(id) ? at : -1))
    .filter((at) => at >= 0);
  slots.forEach((at, index) => { arranged[at] = visible[index]; });

  /* Placed by the line the drop showed (#165): straight after one sibling, or
     first of all, whichever way the task was dragged. */
  if (place) {
    const rest = arranged.filter((id) => id !== itemId);
    const after = rest.indexOf(rowId);
    if (place !== 'first' && after < 0) return null;
    const placed = [...rest];
    placed.splice(place === 'first' ? 0 : after + (place === 'after' ? 1 : 0), 0, itemId);
    return { arranged, next: placed };
  }
  const onto = arranged.indexOf(rowId);
  if (onto < 0) return null;
  const next = [...arranged];
  const at = next.indexOf(itemId);
  if (at >= 0) next.splice(onto, 0, ...next.splice(at, 1));
  else next.splice(onto + (landAfter ? 1 : 0), 0, itemId);
  return { arranged, next };
}

/**
 * Where a subtask picked up in a list lands when the pointer is over a row
 * (#165): the line is drawn under the row it is over, and the subtask goes
 * right there.
 *
 *  - over its parent: first of its siblings;
 *  - over a sibling, or anything inside one: right after that sibling;
 *  - over itself, or anything that is not under its parent: nowhere, null.
 */
export function subtaskLanding(
  items: Record<string, Item>, itemId: string, overId: string,
): { after: string | null } | null {
  const parentId = items[itemId]?.parent_id;
  if (!parentId || overId === itemId) return null;
  if (overId === parentId) return { after: null };
  let at: Item | undefined = items[overId];
  while (at && at.parent_id !== parentId) at = at.parent_id ? items[at.parent_id] : undefined;
  if (!at || at.id === itemId) return null;
  return { after: at.id };
}

/** Every open or closed task below one, at any depth. */
export function descendantsOf(items: Record<string, Item>, id: string): string[] {
  const index = childrenIndex(items);
  const out: string[] = [];
  const walk = (parentId: string) => {
    for (const child of index.get(parentId) ?? []) {
      out.push(child.id);
      walk(child.id);
    }
  };
  walk(id);
  return out;
}

/**
 * What dropping several picked tasks onto one task, indented, would do (#166).
 *
 * The picked tasks go under the target in the order they were given. A picked
 * task whose own parent is picked too stays with it, so only the highest of
 * each branch moves: moving both would take the child out and then put it
 * back, twice. A task already directly under the target has nothing to do.
 * Anything that would make a loop, or go deeper than Todoist keeps, refuses
 * the whole drop: a partial move is the one result nobody can read.
 */
export type NestPlan =
  | { ok: true; ids: string[] }
  | { ok: false; reason: 'target-picked' | 'inside-itself' | 'too-deep' | 'nothing' };

export function planNestMany(
  items: Record<string, Item>, picked: string[], parentId: string,
): NestPlan {
  const target = items[parentId];
  if (!target || target.is_deleted) return { ok: false, reason: 'nothing' };
  const unique = [...new Set(picked)].filter((id) => items[id] && !items[id].is_deleted);
  if (unique.includes(parentId)) return { ok: false, reason: 'target-picked' };

  const set = new Set(unique);
  const hasPickedAncestor = (id: string) => {
    for (let at = items[id]?.parent_id; at; at = items[at]?.parent_id) {
      if (set.has(at)) return true;
    }
    return false;
  };
  const highest = unique.filter((id) => !hasPickedAncestor(id));

  for (const id of highest) {
    for (let at: Item | undefined = target; at; at = at.parent_id ? items[at.parent_id] : undefined) {
      if (at.id === id) return { ok: false, reason: 'inside-itself' };
    }
  }
  const moving = highest.filter((id) => items[id].parent_id !== parentId);
  if (moving.length === 0) return { ok: false, reason: 'nothing' };
  for (const id of moving) {
    if (!canNest(items, id, parentId)) return { ok: false, reason: 'too-deep' };
  }
  return { ok: true, ids: moving };
}

/**
 * Encodes a target as a droppable id, and reads it back.
 *
 * Two places can offer the same destination — the sidebar's "My week" and the
 * page's "Anytime this week" are both `anytime` — and a droppable registry is
 * keyed by id, so without a scope the second registration silently replaces
 * the first and one of the two stops accepting drops.
 */
export function encodeTarget(target: DropTarget, scope?: string): string {
  const id = encodeKind(target);
  return scope ? `${scope}|${id}` : id;
}

function encodeKind(target: DropTarget): string {
  switch (target.kind) {
    case 'step': return `step:${target.step}`;
    case 'day': return `day:${toApiDate(target.date)}`;
    case 'project': return `project:${target.projectId}`;
    case 'section': return `section:${target.projectId}:${target.sectionId ?? ''}`;
    case 'label': return `label:${target.label}`;
    default: return target.kind;
  }
}

export function decodeTarget(encoded: string): DropTarget | null {
  const id = encoded.includes('|') ? encoded.slice(encoded.indexOf('|') + 1) : encoded;
  if (id === 'today' || id === 'quick' || id === 'anytime' || id === 'month' || id === 'someday'
    || id === 'favourites') return { kind: id };

  const [kind, ...rest] = id.split(':');
  if (kind === 'day') {
    const date = new Date(`${rest[0]}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : { kind: 'day', date };
  }
  if (kind === 'project') return { kind: 'project', projectId: rest[0] };
  if (kind === 'section') {
    return { kind: 'section', projectId: rest[0], sectionId: rest[1] || null };
  }
  if (kind === 'step' && STEPS.includes(rest[0] as Step)) return { kind: 'step', step: rest[0] as Step };
  if (kind === 'label') return { kind: 'label', label: rest.join(':') };
  return null;
}
