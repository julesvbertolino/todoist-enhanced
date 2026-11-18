import { completableChildrenOf } from './load';
import { differenceInCalendarDays, startOfDay } from 'date-fns';
import { SYSTEM_LABELS, isUncompletable, type Item } from './types';
import { effectiveEstimate } from './estimates';
import { dueDate } from './dates';
import { QUICK_THRESHOLD_MINUTES, bucketOf, hasLabel, isOpen } from './views';

/** The durations the "I have time" panel offers (#159). */
export const FIT_CHOICES = [5, 10, 15, 30, 60] as const;

/** Where a task that fits is listed, in the order the panel draws them. */
export type FitBucketKey = 'overdue' | 'today' | 'tomorrow' | 'week' | 'nodate';

export interface FitBucket {
  key: FitBucketKey;
  items: Item[];
  /** The minutes counted for these tasks. */
  minutes: number;
}

export interface FitResult {
  /** Only the buckets that have a task in them, in the order above. */
  buckets: FitBucket[];
  count: number;
  /** The minutes counted for every task that fits. */
  minutes: number;
  /** Tasks that would qualify by date but have no estimate: never guessed at. */
  setAside: Item[];
  /** The smallest duration above the one asked that would find something, or null. */
  next: number | null;
}

const ORDER: FitBucketKey[] = ['overdue', 'today', 'tomorrow', 'week', 'nodate'];

/**
 * Which bucket a task's date puts it in, or null when its date makes it
 * nothing to do yet: overdue, today (timed or not), tomorrow, the `week`
 * commitment, or no date at all. Anything dated later is left out.
 */
export function fitBucketOf(item: Item, now = new Date()): FitBucketKey | null {
  switch (bucketOf(item, now)) {
    case 'overdue': return 'overdue';
    case 'today': return 'today';
    case 'anytime': return 'week';
    case 'someday': return 'nodate';
    default: {
      const day = dueDate(item);
      return day && differenceInCalendarDays(startOfDay(day), startOfDay(now)) === 1
        ? 'tomorrow'
        : null;
    }
  }
}

/**
 * The time a task is counted at: its effective estimate (a parent without one
 * sums its subtasks), or, for a task tagged `quick` that has none, the Quick
 * threshold, as #154 does. Null when there is nothing to go on.
 */
export function countedMinutes(
  item: Item,
  childrenOf: (parentId: string) => Item[],
): number | null {
  const { minutes } = effectiveEstimate(item, completableChildrenOf(childrenOf));
  if (minutes !== null) return minutes;
  return hasLabel(item, SYSTEM_LABELS.quick) ? QUICK_THRESHOLD_MINUTES : null;
}

/**
 * What fits in the time you have (#159).
 *
 * The tasks listed are open top-level tasks whose date makes them something
 * to do now and whose counted time is at most `minutes`. A subtask is covered
 * by its parent and never listed on its own. A task with no estimate is never
 * guessed at: it is set aside and returned, so the panel can say how many and
 * offer to estimate them.
 */
export function fitsIn(
  items: Item[],
  minutes: number,
  childrenOf: (parentId: string) => Item[],
  now = new Date(),
): FitResult {
  const taken = new Map<FitBucketKey, Item[]>();
  const counted = new Map<string, number>();
  const setAside: Item[] = [];
  let next: number | null = null;

  for (const item of items) {
    if (!isOpen(item) || item.parent_id || isUncompletable(item)) continue;
    const bucket = fitBucketOf(item, now);
    if (!bucket) continue;

    const time = countedMinutes(item, childrenOf);
    if (time === null) { setAside.push(item); continue; }
    if (time > minutes) {
      if (next === null || time < next) next = time;
      continue;
    }
    counted.set(item.id, time);
    taken.set(bucket, [...(taken.get(bucket) ?? []), item]);
  }

  const byDate = (a: Item, b: Item) =>
    (dueDate(a)?.getTime() ?? Number.POSITIVE_INFINITY)
    - (dueDate(b)?.getTime() ?? Number.POSITIVE_INFINITY);

  const buckets = ORDER.filter((key) => taken.has(key)).map((key): FitBucket => {
    const list = [...taken.get(key)!];
    if (key === 'overdue' || key === 'today') list.sort(byDate);
    return { key, items: list, minutes: list.reduce((sum, item) => sum + (counted.get(item.id) ?? 0), 0) };
  });

  return {
    buckets,
    count: buckets.reduce((sum, bucket) => sum + bucket.items.length, 0),
    minutes: buckets.reduce((sum, bucket) => sum + bucket.minutes, 0),
    setAside,
    next,
  };
}

/** The duration to suggest when nothing fits: the next preset that would find something. */
export function suggestDuration(next: number | null): number | null {
  if (next === null) return null;
  return FIT_CHOICES.find((choice) => choice >= next) ?? next;
}
