import { differenceInCalendarDays, format, startOfDay, subDays } from 'date-fns';
import type { CompletedItem, Item, Snapshot } from './types';
import { ESTIMATE_PREFIX, isUncompletable, toDisplayPriority } from './types';
import { estimateOf } from './estimates';
import { bucketKey, bucketsOf, type Grain, type Range } from './periods';

/**
 * The numbers behind Insights, computed from the completed-task history and
 * the current open tasks. Everything here is derived: nothing is stored.
 */

export interface PriorityBreakdown {
  p1: number;
  p2: number;
  p3: number;
  p4: number;
}

export interface InsightsSummary {
  completedCount: number;
  completedMinutes: number;
  /** Completed tasks that carried no estimate, so the time above understates. */
  completedWithoutEstimate: number;
  activeCount: number;
  /** Share of open work already done, as a whole percentage. */
  progressPercentage: number;
  focusScore: number;
  priorities: PriorityBreakdown;
  byDay: Array<{ date: string; count: number }>;
  byHour: number[];
  byProject: Array<{ projectId: string; name: string; count: number }>;
  /**
   * Tags on completed work, most used first, with the untagged share as the
   * last entry. `est-*` is this app's own storage for a duration, not a tag
   * the user chose, so it is not counted here.
   */
  byLabel: Array<{ label: string; count: number; untagged?: boolean }>;
  activeDays: number;
  currentStreak: number;
  longestStreak: number;
  /** Share of open tasks that carry an estimate. */
  estimateCoverage: number;
}

/**
 * Focus score: the share of completed work that went to what mattered.
 *
 * Each completed task is weighted by its priority, P1 counting four times what
 * P4 counts. The score is that weighted total against the total if every task
 * had been a P1, so a week spent entirely on P1 reads 100 and one spent
 * entirely on P4 reads 25. It answers whether effort went to priorities or to
 * busy work, which is the question Rewind set out to answer.
 */
export function focusScore(items: Array<{ priority?: number }>): number {
  if (items.length === 0) return 0;
  const weights = items.map((item) => {
    // Todoist stores 4 as P1, and that is already the weight we want.
    const stored = item.priority ?? 1;
    return Math.min(4, Math.max(1, stored));
  });
  const total = weights.reduce((a, b) => a + b, 0);
  return Math.round((total / (weights.length * 4)) * 100);
}

function countPriorities(items: Array<{ priority?: number }>): PriorityBreakdown {
  const out: PriorityBreakdown = { p1: 0, p2: 0, p3: 0, p4: 0 };
  for (const item of items) {
    const display = toDisplayPriority((item.priority ?? 1) as 1 | 2 | 3 | 4);
    out[`p${display}` as keyof PriorityBreakdown] += 1;
  }
  return out;
}

/** Consecutive days ending today (or yesterday) on which something was completed. */
function streaks(days: Set<string>, now: Date): { current: number; longest: number } {
  const sorted = [...days].sort();
  if (sorted.length === 0) return { current: 0, longest: 0 };

  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i += 1) {
    const gap = differenceInCalendarDays(new Date(sorted[i]), new Date(sorted[i - 1]));
    if (gap === 1) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }

  // A streak survives today being empty until the day is over, so the count
  // walks back from today and accepts yesterday as the anchor.
  let current = 0;
  let cursor = startOfDay(now);
  if (!days.has(format(cursor, 'yyyy-MM-dd'))) {
    cursor = subDays(cursor, 1);
  }
  while (days.has(format(cursor, 'yyyy-MM-dd'))) {
    current += 1;
    cursor = subDays(cursor, 1);
  }

  return { current, longest };
}

/** Ignore a completion when its still-open task is now a standing item. */
export function isCountableCompletion(item: CompletedItem, snapshot: Snapshot): boolean {
  const current = snapshot.items[item.task_id ?? item.id];
  return !isUncompletable(item) && (!current || !isUncompletable(current));
}

export function summariseInsights(
  completed: CompletedItem[],
  openTasks: Item[],
  snapshot: Snapshot,
  now = new Date(),
): InsightsSummary {
  completed = completed.filter((item) => isCountableCompletion(item, snapshot));
  openTasks = openTasks.filter((item) => !isUncompletable(item));
  const dayCounts = new Map<string, number>();
  const hourCounts = new Array<number>(24).fill(0);
  const projectCounts = new Map<string, number>();
  const labelCounts = new Map<string, number>();
  let untagged = 0;

  let completedMinutes = 0;
  let completedWithoutEstimate = 0;

  for (const task of completed) {
    const at = new Date(task.completed_at);
    const dayKey = format(at, 'yyyy-MM-dd');
    dayCounts.set(dayKey, (dayCounts.get(dayKey) ?? 0) + 1);
    hourCounts[at.getHours()] += 1;
    projectCounts.set(task.project_id, (projectCounts.get(task.project_id) ?? 0) + 1);

    const tags = (task.labels ?? []).filter(
      (label) => !label.toLowerCase().startsWith(ESTIMATE_PREFIX),
    );
    if (tags.length === 0) untagged += 1;
    for (const tag of tags) labelCounts.set(tag, (labelCounts.get(tag) ?? 0) + 1);

    const minutes = estimateOf({ labels: task.labels ?? [], duration: task.duration });
    if (minutes === null) completedWithoutEstimate += 1;
    else completedMinutes += minutes;
  }

  const estimated = openTasks.filter((i) => estimateOf(i) !== null).length;
  const total = completed.length + openTasks.length;
  const { current, longest } = streaks(new Set(dayCounts.keys()), now);

  return {
    completedCount: completed.length,
    completedMinutes,
    completedWithoutEstimate,
    activeCount: openTasks.length,
    progressPercentage: total > 0 ? Math.round((completed.length / total) * 100) : 0,
    focusScore: focusScore(completed),
    priorities: countPriorities(completed),
    byDay: [...dayCounts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count })),
    byHour: hourCounts,
    byProject: [...projectCounts.entries()]
      .map(([projectId, count]) => ({
        projectId,
        name: snapshot.projects[projectId]?.name ?? '—',
        count,
      }))
      .sort((a, b) => b.count - a.count),
    byLabel: [
      ...[...labelCounts.entries()]
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count),
      ...(untagged > 0 ? [{ label: '', count: untagged, untagged: true }] : []),
    ],
    activeDays: dayCounts.size,
    currentStreak: current,
    longestStreak: longest,
    estimateCoverage: openTasks.length > 0
      ? Math.round((estimated / openTasks.length) * 100)
      : 0,
  };
}

/**
 * Completions counted per day or per month of a range, every bucket present
 * even when nothing was finished in it. A quarter read by month has three
 * buckets whose counts add up to the quarter's total (#174).
 */
export function completionBuckets(
  items: Array<{ completed_at: string }>, range: Range, grain: Grain,
): Array<{ at: Date; key: string; value: number }> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = bucketKey(new Date(item.completed_at), grain);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return bucketsOf(range, grain).map((at) => {
    const key = bucketKey(at, grain);
    return { at, key, value: counts.get(key) ?? 0 };
  });
}

/** What a project page shows as its totals, matching what Todoist counts (#239). */
export interface ProjectProgress {
  completed: number;
  active: number;
  /** Share of the project's tasks already done, as a whole percentage. */
  percentage: number;
}

/**
 * A project's progress over its whole life.
 *
 * `completedTotal` is every completed task of the project, subtasks included,
 * recurring tasks never (see `useProjectCompletedCount`). `active` is every open
 * task of the project, subtasks included. Both as Todoist's project Insights
 * count them, so the percentage is theirs too. Until the count has loaded
 * there is no figure: a guessed zero would read as "0%".
 */
export function projectProgress(completedTotal: number | undefined, open: Item[]): ProjectProgress | null {
  if (completedTotal === undefined) return null;
  const active = open.filter((item) => !isUncompletable(item)).length;
  const total = completedTotal + active;
  return { completed: completedTotal, active, percentage: total > 0 ? Math.round((completedTotal / total) * 100) : 0 };
}

/**
 * Completed tasks, each once: a task completed, reopened and completed again
 * is one task, as Todoist counts it.
 */
export function completedTaskCount(items: Array<{ id: string; task_id?: string }>): number {
  return new Set(items.map((item) => item.task_id ?? item.id)).size;
}

/** Completions on or after the first day of the user's calendar week. */
export function completedSince(items: Array<{ completed_at: string }>, since: Date): number {
  return items.filter((item) => new Date(item.completed_at) >= since).length;
}
