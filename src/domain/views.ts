import { addMonths, differenceInMonths, parseISO, startOfDay } from 'date-fns';
import { SYSTEM_LABELS, weekLabel, type Bucket, type Item } from './types';
import { estimateOf } from './estimates';
import { dueDate, hasTime, isFuture, isOverdue, isToday, toApiDate } from './dates';

/** Case-insensitive label test, so `Week` and `week` behave the same. */
export const hasLabel = (item: Item, label: string): boolean =>
  item.labels.some((l) => l.toLowerCase() === label.toLowerCase());

export const QUICK_THRESHOLD_MINUTES = 5;

/**
 * Quick holds tasks that take five minutes or less.
 *
 * The estimate is the fact and the `quick` tag is a claim: a task tagged quick
 * but estimated at forty minutes is not quick, so it stays out of the group
 * and is reported as a conflict instead. Without an estimate the tag is all
 * there is to go on.
 */
export function isQuick(item: Item): boolean {
  const est = estimateOf(item);
  if (est !== null && est > QUICK_THRESHOLD_MINUTES) return false;
  if (hasLabel(item, SYSTEM_LABELS.quick)) return true;
  return est !== null && est <= QUICK_THRESHOLD_MINUTES;
}

/**
 * The single rule that decides where a task appears.
 *
 * A real date always wins over the `week` label; nothing is ever corrected
 * silently, so a task carrying both is placed by its date and separately
 * surfaces as a conflict.
 */
export function bucketOf(item: Item, now = new Date()): Bucket {
  if (item.due) {
    if (isOverdue(item, now)) return 'overdue';
    if (isToday(item, now)) return 'today';
    if (isFuture(item, now)) return 'upcoming';
  }
  return hasLabel(item, weekLabel()) ? 'anytime' : 'someday';
}

/** Tasks that are open: not completed, not deleted. */
export const isOpen = (item: Item): boolean => !item.checked && !item.is_deleted;

export interface WeekGroups {
  overdue: Item[];
  quick: Item[];
  untimed: Item[];
  timed: Item[];
  anytime: Item[];
}

/**
 * My week, assembled in the order the spec fixes: behind schedule, then quick,
 * then today without a time, then today with a time, and finally the flexible
 * "anytime this week" tasks.
 *
 * Quick absorbs today's quick tasks so none is listed twice; overdue tasks stay
 * in Behind schedule even when they are quick, because lateness is the more
 * urgent fact about them.
 */
export function groupWeek(items: Item[], now = new Date(), showQuickGroup = true): WeekGroups {
  const groups: WeekGroups = { overdue: [], quick: [], untimed: [], timed: [], anytime: [] };

  for (const item of items) {
    const bucket = bucketOf(item, now);
    if (bucket === 'overdue') {
      groups.overdue.push(item);
    } else if (bucket === 'today') {
      if (showQuickGroup && isQuick(item)) groups.quick.push(item);
      else if (hasTime(item.due)) groups.timed.push(item);
      else groups.untimed.push(item);
    } else if (bucket === 'anytime') {
      groups.anytime.push(item);
    }
  }

  const byTime = (a: Item, b: Item) =>
    (dueDate(a)?.getTime() ?? 0) - (dueDate(b)?.getTime() ?? 0);
  groups.timed.sort(byTime);
  groups.overdue.sort(byTime);

  return groups;
}

export interface QuickSplit {
  /** What to do rather than plan, in the order it came. */
  quick: Item[];
  /** Everything else, in the order it came. */
  rest: Item[];
}

/**
 * Pulls the quick tasks out of a page's list, for every page but My week.
 *
 * A task goes in the group when it is quick (`isQuick`) and its date makes it
 * something to do now: late, due today (with or without a time), or no date at
 * all, which covers the `week` label and every Someday task. A task dated
 * tomorrow or later stays where it is: a quick task due on 15 November has
 * nothing to do at the top of a project today. Only top-level tasks are taken;
 * a quick subtask stays under its parent. Each task ends up on one side.
 *
 * My week keeps `groupWeek`, which takes today's quick tasks and leaves the
 * late ones in Behind schedule: this is the rule for the pages that have no
 * Behind schedule to leave them in.
 */
export function splitQuick(items: Item[], now = new Date()): QuickSplit {
  const quick: Item[] = [];
  const rest: Item[] = [];
  for (const item of items) {
    const takes = isOpen(item)
      && !item.parent_id
      && isQuick(item)
      && bucketOf(item, now) !== 'upcoming';
    (takes ? quick : rest).push(item);
  }
  return { quick, rest };
}

/** How long a task may sit in Someday before it is said to be gathering dust (#161). */
export const DUST_MONTHS = [1, 2, 3, 6, 12] as const;
export type DustMonths = (typeof DUST_MONTHS)[number];
export const DEFAULT_DUST_MONTHS: DustMonths = 3;

export const isDustMonths = (value: unknown): value is DustMonths =>
  typeof value === 'number' && (DUST_MONTHS as readonly number[]).includes(value);

/**
 * The tasks kept in Someday on purpose, as this device remembers them: the
 * task's id, and the local day it was kept (`yyyy-MM-dd`). Never sent to Todoist.
 */
export type DustLedger = Record<string, string>;

export interface DustOptions {
  now?: Date;
  months: number;
  kept?: DustLedger;
}

/**
 * Whether `from` is far enough back that `months` calendar months are up.
 *
 * Counted in calendar months against the local day, and from the day: a task
 * added on 7 July has its three months on 7 October, at whatever hour it was
 * added. "More than three months" is read as "its three months are over", so
 * the anniversary itself counts and the day before it does not.
 */
export function monthsAreUp(from: Date, months: number, now: Date): boolean {
  return startOfDay(from) <= startOfDay(addMonths(now, -months));
}

/**
 * The tasks that have sat in Someday for months (#161), oldest first.
 *
 * Todoist does not record when a task *entered* Someday, only when it was
 * created, so an old task moved there last week counts as old; the setting's
 * help text says so. A task is in the group when it is an open top-level task
 * on the Someday page (no date, no `week` label), was created longer ago than
 * the delay, and has not been kept: a kept task comes back only after another
 * full delay counted from the day it was kept. A task with no creation date is
 * never in it. Run after `splitQuick`, so something quick is listed as quick,
 * not here; each task ends up on one side.
 */
export function splitDust(
  items: Item[],
  { now = new Date(), months, kept = {} }: DustOptions,
): { dust: Item[]; rest: Item[] } {
  const dust: Item[] = [];
  const rest: Item[] = [];
  for (const item of items) {
    const added = item.added_at ? parseISO(item.added_at) : null;
    const keptOn = kept[item.id] ? parseISO(kept[item.id]) : null;
    const takes = isOpen(item)
      && !item.parent_id
      && bucketOf(item, now) === 'someday'
      && added !== null && !Number.isNaN(added.getTime())
      && monthsAreUp(added, months, now)
      && (keptOn === null || Number.isNaN(keptOn.getTime()) || monthsAreUp(keptOn, months, now));
    (takes ? dust : rest).push(item);
  }
  dust.sort((a, b) => (a.added_at ?? '').localeCompare(b.added_at ?? ''));
  return { dust, rest };
}

/** Whole months since a task was added, never under one: it only matters once it is old. */
export function ageInMonths(item: Item, now = new Date()): number {
  if (!item.added_at) return 0;
  return Math.max(1, differenceInMonths(now, parseISO(item.added_at)));
}

/**
 * The ledger without what no delay could still hide: an entry older than the
 * longest delay has expired whatever the setting is.
 */
export function pruneKept(kept: DustLedger, now = new Date()): DustLedger {
  const longest = DUST_MONTHS[DUST_MONTHS.length - 1];
  return Object.fromEntries(
    Object.entries(kept).filter(([, day]) => {
      const on = parseISO(day);
      return !Number.isNaN(on.getTime()) && !monthsAreUp(on, longest, now);
    }),
  );
}

/** A ledger read back from the device: only well-formed entries survive. */
export function readKept(stored: unknown): DustLedger {
  if (!stored || typeof stored !== 'object') return {};
  return Object.fromEntries(
    Object.entries(stored as Record<string, unknown>)
      .filter((entry): entry is [string, string] =>
        typeof entry[1] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(entry[1])),
  );
}

/** The day a task is kept on, as the ledger writes it. */
export const keptDay = (now = new Date()): string => toApiDate(now);

/** Everything the Upcoming view shows: strictly future dates, within a horizon. */
export function upcomingItems(items: Item[], now = new Date()): Item[] {
  return items.filter((i) => bucketOf(i, now) === 'upcoming');
}

/** Someday / backlog: no date and no `week` commitment. */
export function somedayItems(items: Item[], now = new Date()): Item[] {
  return items.filter((i) => bucketOf(i, now) === 'someday');
}

/** Anytime this week: no date, carrying `week`. */
export function anytimeItems(items: Item[], now = new Date()): Item[] {
  return items.filter((i) => bucketOf(i, now) === 'anytime');
}

/** Everything My week covers, used for the header counts and the load pill. */
export function weekItems(items: Item[], now = new Date()): Item[] {
  return items.filter((i) => {
    const b = bucketOf(i, now);
    return b === 'overdue' || b === 'today' || b === 'anytime';
  });
}
