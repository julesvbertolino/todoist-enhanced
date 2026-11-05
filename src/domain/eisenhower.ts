import { bucketOf } from './views';
import { differenceInCalendarDays, endOfWeek, endOfMonth, addDays, endOfDay } from 'date-fns';
import { deadlineDate, dueDate } from './dates';
import { toDisplayPriority, type Item, type MatrixOverrides } from './types';
import {
  viewPrefs,
  type EisenhowerPriority, type EisenhowerUrgencyRule, type MatrixHorizon, type MatrixLayout, type Preferences,
} from '@/store/prefs';
import { rootItems } from '@/store/selectors';

export type EisenhowerQuadrant =
  | 'urgent-important'
  | 'not-urgent-important'
  | 'urgent-not-important'
  | 'not-urgent-not-important';

export const EISENHOWER_QUADRANTS: EisenhowerQuadrant[] = [
  'urgent-important',
  'not-urgent-important',
  'urgent-not-important',
  'not-urgent-not-important',
];

/**
 * A transparent, configurable classification.
 *
 * Overdue dates are always urgent. A date is otherwise urgent through the
 * chosen local-calendar horizon; an undated task never becomes urgent by
 * accident. Importance follows Todoist priority, either P1 only or P1 + P2.
 */
export function eisenhowerQuadrant(
  item: Item,
  now = new Date(),
  urgentRules: EisenhowerUrgencyRule[] = ['overdue', 'today'],
  importantPriorities: EisenhowerPriority[] = [1, 2],
  weekLabel = 'week',
): EisenhowerQuadrant {
  const important = importantPriorities.includes(toDisplayPriority(item.priority));
  const rule = eisenhowerUrgencyRule(item, now, weekLabel);
  const deadlineRule = eisenhowerDeadlineRule(item, now);
  /* Urgent through its date or through its deadline: either is enough (#329). */
  const urgent = (rule !== null && urgentRules.includes(rule))
    || (deadlineRule !== null && urgentRules.includes(deadlineRule));

  if (urgent && important) return 'urgent-important';
  if (!urgent && important) return 'not-urgent-important';
  if (urgent) return 'urgent-not-important';
  return 'not-urgent-not-important';
}

/**
 * The urgency bucket its deadline gives a task, apart from its date: a task
 * planned "anytime this week" with a deadline on Sunday is not urgent by its
 * date, and is by its deadline. A deadline already past is `overdue`, which
 * `eisenhowerUrgencyRule` reads.
 */
export function eisenhowerDeadlineRule(item: Item, now = new Date()): EisenhowerUrgencyRule | null {
  const deadline = deadlineDate(item);
  if (!deadline) return null;
  const days = differenceInCalendarDays(deadline, now);
  if (days < 0) return null;
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === 2) return 'after-tomorrow';
  return days <= 7 ? 'next-seven' : null;
}

/** True when the deadline is what makes a task urgent, so its card can say so. */
export function urgentByDeadline(
  item: Item, now: Date, urgentRules: EisenhowerUrgencyRule[], weekLabel = 'week',
): boolean {
  const deadline = eisenhowerDeadlineRule(item, now);
  if (deadline === null || !urgentRules.includes(deadline)) return false;
  const date = eisenhowerUrgencyRule(item, now, weekLabel);
  return date === null || !urgentRules.includes(date);
}

/** The single, non-overlapping urgency bucket a task belongs to. */
export function eisenhowerUrgencyRule(
  item: Item,
  now = new Date(),
  weekLabel = 'week',
): EisenhowerUrgencyRule | null {
  const deadline = deadlineDate(item);
  if (deadline && differenceInCalendarDays(deadline, now) < 0) return 'overdue';
  const due = dueDate(item);
  if (due) {
    const days = differenceInCalendarDays(due, now);
    if (days < 0) return 'overdue';
    if (days === 0) return 'today';
    if (days === 1) return 'tomorrow';
    if (days === 2) return 'after-tomorrow';
    if (days <= 7) return 'next-seven';
    return null;
  }
  return item.labels.some((label) => label.toLowerCase() === weekLabel.toLowerCase())
    ? 'week'
    : null;
}

/** The roots visible on the matrix, shared with its sidebar count. */
export function matrixVisibleItems(items: Item[], projects: Record<string, import('./types').Project>, horizon: MatrixHorizon, includeSomeday: boolean, workspace: string | null, startDay = 1): Item[] {
  const now = new Date();
  return items.filter((item) => {
    const bucket = bucketOf(item, now);
    if (bucket === 'upcoming') {
      const date = dueDate(item);
      const limit = horizon === 'today' ? endOfDay(now) : horizon === 'tomorrow' ? endOfDay(addDays(now, 1))
        : horizon === 'week' ? endOfWeek(now, { weekStartsOn: (startDay % 7) as 0 | 1 | 2 | 3 | 4 | 5 | 6 }) : horizon === 'seven' ? endOfDay(addDays(now, 7))
        : horizon === 'month' ? endOfMonth(now) : null;
      if (date && limit && date > limit) return false;
    }
    if (!includeSomeday && bucket === 'someday') return false;
    return !workspace || (projects[item.project_id]?.workspace_id ?? 'personal') === workspace;
  });
}

/** What decides where a task lands on the matrix, and what the matrix shows. */
export interface MatrixSettings {
  horizon: MatrixHorizon;
  includeSomeday: boolean;
  workspace: string | null;
  startDay: number;
  urgentRules: EisenhowerUrgencyRule[];
  importantPriorities: EisenhowerPriority[];
  weekLabel: string;
  /** "Show subtasks": off lists the top-level tasks only. */
  subtasks: boolean;
}

/**
 * The cards of the matrix (#448): the top-level tasks, plus every open
 * subtask that has a date or a priority of its own. Such a subtask is a card
 * in the quadrant its own date and priority give it, and is also listed in the
 * folded subtasks of its parent, which keeps all of them. A subtask with
 * neither only appears there, so the matrix is not flooded by the dozens of
 * undated P4 steps of a checklist.
 *
 * Returns the cards and the ids of the subtasks drawn as cards, which the
 * workload counts once. The sidebar count reads the same cards.
 */
export function matrixRoots(
  items: Item[],
  projects: Record<string, import('./types').Project>,
  settings: MatrixSettings,
): { cards: Item[]; promoted: Set<string> } {
  const { horizon, includeSomeday, workspace, startDay } = settings;
  const onMatrix = (list: Item[]) => matrixVisibleItems(list, projects, horizon, includeSomeday, workspace, startDay);
  const roots = rootItems(items);
  const rootVisible = new Set(onMatrix(roots).map((item) => item.id));
  if (!settings.subtasks) return { cards: roots.filter((item) => rootVisible.has(item.id)), promoted: new Set() };

  const visible = new Set(onMatrix(items).map((item) => item.id));
  const hasOwn = (item: Item) => Boolean(item.due) || toDisplayPriority(item.priority) !== 4;
  const promoted = new Set<string>();
  const cards = items.filter((item) => {
    if (!item.parent_id) return visible.has(item.id);
    if (!hasOwn(item) || !visible.has(item.id)) return false;
    promoted.add(item.id);
    return true;
  });
  return { cards, promoted };
}

/** The matrix's settings as the page and the sidebar count both read them. */
export function matrixSettings(prefs: Preferences, startDay: number | undefined): MatrixSettings {
  const view = viewPrefs(prefs, 'matrix');
  return {
    horizon: prefs.eisenhowerHorizon,
    includeSomeday: prefs.eisenhowerIncludeSomeday,
    workspace: view.filters.workspaces.length ? null : prefs.eisenhowerWorkspace,
    startDay: startDay ?? 1,
    urgentRules: prefs.eisenhowerUrgent,
    importantPriorities: prefs.eisenhowerImportant,
    weekLabel: prefs.weekLabel,
    subtasks: view.filters.showSubtasks,
  };
}

/**
 * The rules and the layout a matrix uses: the page's own where the user
 * changed them there, the Matrix page's everywhere else.
 */
export function matrixRulesFor(prefs: Preferences, own?: MatrixOverrides): {
  urgent: EisenhowerUrgencyRule[]; important: EisenhowerPriority[]; layout: MatrixLayout;
} {
  return {
    urgent: own?.urgent ?? prefs.eisenhowerUrgent,
    important: own?.important ?? prefs.eisenhowerImportant,
    layout: own?.layout ?? prefs.eisenhowerLayout,
  };
}
