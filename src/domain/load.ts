import { isUncompletable, type Item } from './types';
import { effectiveEstimate } from './estimates';

/** Capacity in minutes for each day, indexed 0 = Sunday .. 6 = Saturday. */
export type DailyCapacity = [number, number, number, number, number, number, number];

export const DEFAULT_DAILY_MINUTES = 300; // five hours

export const defaultCapacity = (): DailyCapacity => [
  DEFAULT_DAILY_MINUTES, DEFAULT_DAILY_MINUTES, DEFAULT_DAILY_MINUTES,
  DEFAULT_DAILY_MINUTES, DEFAULT_DAILY_MINUTES, DEFAULT_DAILY_MINUTES,
  DEFAULT_DAILY_MINUTES,
];

/** Weekly capacity is derived from the days, unless the user overrides it. */
export function weeklyCapacity(daily: DailyCapacity, manualOverride: number | null): number {
  if (manualOverride !== null && manualOverride > 0) return manualOverride;
  return daily.reduce((a, b) => a + b, 0);
}

export interface LoadSummary {
  taskCount: number;
  estimatedMinutes: number;
  unestimatedCount: number;
  /** Null when the view has no meaningful capacity to measure against. */
  percentage: number | null;
  level: 'ok' | 'tight' | 'over' | null;
}

/**
 * The tasks of a list that sit under another task of the same list. A subtask
 * listed on its own as well as under its parent (#405) is already in the
 * parent's figure: the time is counted once, by the task above it.
 */
export function insideOthers(items: Item[], childrenOf: (parentId: string) => Item[]): Set<string> {
  const inside = new Set<string>();
  const collect = (id: string, depth: number) => {
    if (depth > 50) return;
    for (const child of childrenOf(id)) { inside.add(child.id); collect(child.id, depth + 1); }
  };
  for (const item of items) collect(item.id, 0);
  return inside;
}

/** Skip standing headings but keep their ordinary descendants in workload totals. */
export function completableChildrenOf(childrenOf: (parentId: string) => Item[]): (id: string) => Item[] {
  return (id) => {
    const visited = new Set([id]);
    const collect = (parentId: string): Item[] => childrenOf(parentId).flatMap((child) => {
      if (visited.has(child.id) || child.checked || child.is_deleted) return [];
      visited.add(child.id);
      return isUncompletable(child) ? collect(child.id) : [child];
    });
    return collect(id);
  };
}

/** The topmost completable tasks represented in a workload, including children of standing headings. */
export function workloadRoots(items: Item[], childrenOf: (parentId: string) => Item[]): Item[] {
  const countable = items.filter((item) => !isUncompletable(item));
  const children = completableChildrenOf(childrenOf);
  const workload = [...new Map([...countable, ...items.filter(isUncompletable).flatMap((item) => children(item.id))].map((item) => [item.id, item])).values()];
  const inside = insideOthers(workload, children);
  return workload.filter((item) => !inside.has(item.id));
}

/** The very same tasks that the load summary calls unestimated. */
export function unestimatedWorkload(items: Item[], childrenOf: (parentId: string) => Item[]): Item[] {
  const children = completableChildrenOf(childrenOf);
  return workloadRoots(items, childrenOf).filter((item) => effectiveEstimate(item, children).minutes === null);
}

/**
 * The header line: X tasks, X h X min, X % of capacity, X unestimated.
 *
 * Computed over the tasks actually displayed, after filters, so the number
 * always describes what the user is looking at.
 */
export function summariseLoad(
  items: Item[],
  childrenOf: (parentId: string) => Item[],
  capacityMinutes: number | null,
): LoadSummary {
  let estimatedMinutes = 0;
  let unestimatedCount = 0;

  const countable = items.filter((item) => !isUncompletable(item));
  const countableChildren = completableChildrenOf(childrenOf);
  for (const item of workloadRoots(items, childrenOf)) {
    const { minutes } = effectiveEstimate(item, countableChildren);
    if (minutes === null) unestimatedCount += 1;
    else estimatedMinutes += minutes;
  }

  if (capacityMinutes === null || capacityMinutes <= 0) {
    return {
      taskCount: countable.length,
      estimatedMinutes,
      unestimatedCount,
      percentage: null,
      level: null,
    };
  }

  const percentage = Math.round((estimatedMinutes / capacityMinutes) * 100);
  // Under 80 % reads as comfortable, 80 to 100 as tight, above as over capacity.
  const level = percentage < 80 ? 'ok' : percentage <= 100 ? 'tight' : 'over';

  return { taskCount: countable.length, estimatedMinutes, unestimatedCount, percentage, level };
}

/**
 * How full the capacity is, as the header's duration shows it (#173): neutral
 * under 95%, amber from 95 up to a full day, red beyond it, and neutral wherever the
 * page has no capacity to measure against. The percentage is the one the
 * tooltip reads out, so what is said and what is shown never disagree.
 */
export type LoadTone = 'neutral' | 'warn' | 'over';

export function loadTone(percentage: number | null): LoadTone {
  if (percentage === null) return 'neutral';
  if (percentage > 100) return 'over';
  if (percentage >= 95) return 'warn';
  return 'neutral';
}
