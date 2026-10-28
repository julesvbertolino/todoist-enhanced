import { bucketOf } from './views';
import { differenceInCalendarDays, endOfWeek, endOfMonth, addDays, endOfDay } from 'date-fns';
import { dueDate } from './dates';
import { toDisplayPriority, type Item } from './types';
import type {
  EisenhowerPriority, EisenhowerUrgencyRule, MatrixHorizon,
} from '@/store/prefs';
import { byChildOrder } from './orderKey';

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
  const urgent = rule !== null && urgentRules.includes(rule);

  if (urgent && important) return 'urgent-important';
  if (!urgent && important) return 'not-urgent-important';
  if (urgent) return 'urgent-not-important';
  return 'not-urgent-not-important';
}

/** The single, non-overlapping urgency bucket a task belongs to. */
export function eisenhowerUrgencyRule(
  item: Item,
  now = new Date(),
  weekLabel = 'week',
): EisenhowerUrgencyRule | null {
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

/** Due date, then displayed priority, then Todoist's existing manual order. */
export function sortEisenhower(items: Item[]): Item[] {
  return [...items].sort((a, b) => {
    const aDue = dueDate(a)?.getTime() ?? Number.POSITIVE_INFINITY;
    const bDue = dueDate(b)?.getTime() ?? Number.POSITIVE_INFINITY;
    return aDue - bDue
      || toDisplayPriority(a.priority) - toDisplayPriority(b.priority)
      || byChildOrder(a, b)
      || a.id.localeCompare(b.id);
  });
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
