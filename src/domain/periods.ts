import {
  addDays, addMonths, addQuarters, addYears, differenceInCalendarDays,
  endOfDay, endOfMonth, endOfQuarter, endOfYear,
  startOfDay, startOfMonth, startOfQuarter, startOfYear,
} from 'date-fns';
import { intlDate } from '@/lib/intl';

export type Period = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

/** A window of time, inclusive at both ends. */
export interface Range {
  since: Date;
  until: Date;
}

/**
 * The window a preset names, `offset` periods away from the one holding
 * `now`: 0 is this week, -1 the week before, and so on.
 *
 * Every preset is a calendar unit rather than a rolling count of days, so
 * "the previous week" is the week before this one and not the seven days
 * before the last seven. Weeks start on the day the Todoist account does.
 */
export function rangeFor(
  period: Period,
  offset: number,
  custom: Range | null,
  startDay: number,
  now = new Date(),
): Range {
  switch (period) {
    case 'day': {
      const since = startOfDay(addDays(now, offset));
      return { since, until: endOfDay(since) };
    }
    case 'week': {
      const today = startOfDay(now);
      const back = (today.getDay() - (startDay % 7) + 7) % 7;
      const since = addDays(today, -back + offset * 7);
      return { since, until: endOfDay(addDays(since, 6)) };
    }
    case 'month': {
      const at = addMonths(now, offset);
      return { since: startOfMonth(at), until: endOfMonth(at) };
    }
    case 'quarter': {
      const at = addQuarters(now, offset);
      return { since: startOfQuarter(at), until: endOfQuarter(at) };
    }
    case 'year': {
      const at = addYears(now, offset);
      return { since: startOfYear(at), until: endOfYear(at) };
    }
    case 'custom': {
      const base = custom ?? { since: startOfDay(now), until: endOfDay(now) };
      const days = spanOf(base);
      const since = startOfDay(addDays(base.since, offset * days));
      return { since, until: endOfDay(addDays(since, days - 1)) };
    }
  }
}

/** How many calendar days a range covers, never fewer than one. */
export const spanOf = (range: Range): number =>
  Math.max(1, differenceInCalendarDays(range.until, range.since) + 1);

/** The window of the same length that ends the day before this one begins. */
export function previousRange(range: Range): Range {
  const days = spanOf(range);
  const since = startOfDay(addDays(range.since, -days));
  return { since, until: endOfDay(addDays(since, days - 1)) };
}

/**
 * The range as a label: one date for a day, two for anything longer, and the
 * year only when it is not this one.
 */
export function formatRange(range: Range, intl: string, now = new Date()): string {
  const sameYear = range.since.getFullYear() === now.getFullYear()
    && range.until.getFullYear() === now.getFullYear();
  const full = intlDate(intl, {
    day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }),
  });
  if (spanOf(range) === 1) return full.format(range.since);
  const sameMonth = range.since.getMonth() === range.until.getMonth()
    && range.since.getFullYear() === range.until.getFullYear();
  const first = sameMonth
    ? intlDate(intl, { day: 'numeric' }).format(range.since)
    : full.format(range.since);
  return `${first} – ${full.format(range.until)}`;
}

/** The unit a chart groups completions by. */
export type Grain = 'day' | 'month';

/**
 * The units a range of so many days is read in.
 *
 * A day has no series of days inside it, so it gets none, and a year read day
 * by day is three hundred and sixty-five bars nobody can tell apart. A quarter
 * is read month by month for the same reason: ninety bars (#174). A range of
 * your own in between can be read either way.
 */
export function granularitiesOf(days: number, period?: Period): Grain[] {
  if (days <= 1) return [];
  if (period === 'quarter') return ['month'];
  if (days <= 31) return ['day'];
  if (days <= 180) return ['day', 'month'];
  return ['month'];
}

/** The first instant of the bucket holding `at`. */
export const startOfGrain = (at: Date, grain: Grain): Date =>
  grain === 'month' ? new Date(at.getFullYear(), at.getMonth(), 1) : startOfDay(at);

/** A stable name for the bucket holding `at`, such as 2026-10-25 or 2026-10. */
export const bucketKey = (at: Date, grain: Grain): string => {
  const start = startOfGrain(at, grain);
  const month = String(start.getMonth() + 1).padStart(2, '0');
  const year = String(start.getFullYear()).padStart(4, '0');
  return grain === 'month' ? `${year}-${month}` : `${year}-${month}-${String(start.getDate()).padStart(2, '0')}`;
};

/**
 * The bucket `by` places after the one holding `from`.
 *
 * Days are stepped on the calendar, never by adding twenty-four hours: the
 * day clocks go back lasts twenty-five, and adding twenty-four hours to its
 * start lands on the same day again, which made a loop over a month that
 * contains it never end.
 */
export function shiftBucket(from: Date, grain: Grain, by: number): Date {
  const at = startOfGrain(from, grain);
  if (grain === 'month') return new Date(at.getFullYear(), at.getMonth() + by, 1);
  return addDays(at, by);
}

/** The start of every bucket the range touches, in order. */
export function bucketsOf(range: Range, grain: Grain): Date[] {
  const out: Date[] = [];
  for (
    let at = startOfGrain(range.since, grain);
    at <= range.until;
    at = shiftBucket(at, grain, 1)
  ) {
    out.push(at);
  }
  return out;
}

/** Every calendar day of a range, in order, including the clock-change ones. */
export function daysOf(range: Range): Date[] {
  return bucketsOf(range, 'day');
}
