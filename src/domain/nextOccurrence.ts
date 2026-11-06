/**
 * The date "Skip to next occurrence" will land on, for the rules where that is
 * not a guess (#153).
 *
 * `recurrence.ts` is explicit that this app does not resolve a repeat rule:
 * Todoist does, and it is the only place that gets every rule right across time
 * zones and completions. This is the one narrow exception, so the schedule menu
 * can say where a task is about to go. It earns that by saying nothing whenever
 * it is not sure, because a wrong date shown next to a button is worse than no
 * date:
 *
 * - only plain rules are read: every day, every N days or weeks, every week,
 *   every weekday, and every <weekday>[, <weekday>...], with an optional time
 *   of day on the end, which does not change the date;
 * - a task that is already late lands on the first occurrence after today:
 *   closing it does not make a task that is one day late, it moves it on to
 *   the next day the rule names that is still ahead;
 * - every month, every N months and every year, when the day of the month is
 *   the 28th or earlier: a later one is clamped in a way that is not assumed;
 * - `every!` counts from today, which is only a plain step for the simple
 *   day and week rules; its weekday forms are left out;
 * - anything else, a bound, a month, a position ("last friday"), gives null.
 */
import { addDays, addMonths, addWeeks, addYears, differenceInCalendarDays, getDay, isAfter, startOfDay } from 'date-fns';
import { intlDate } from '@/lib/intl';
import { dueDate } from './dates';
import { WEEKDAY_WORDS } from './dateVocabulary';
import type { Item } from './types';

const fold = (text: string): string =>
  text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();

const OPENER = '(?:every|each|tous les|toutes les|tous le|chaque)';
const UNIT_DAY = '(?:days?|jours?)';
const UNIT_WEEK = '(?:weeks?|semaines?)';
const WORKDAY = '(?:weekdays?|workdays?|working days?|jours? ouvres?|jours? ouvrables?|jours? de (?:la )?semaine)';
/* "at 9am", "at 20:00", "à 9h30": the time of day does not move the date. */
const TIME = '(?:\\s+(?:at|@|a|vers)\\s+[\\d:h.]+\\s*(?:am|pm)?)?';

const weekdayAlternatives = [...WEEKDAY_WORDS.en, ...WEEKDAY_WORDS.fr];
const WEEKDAY_ONE = `(?:${weekdayAlternatives.join('|')})`;
const WEEKDAY_LIST = new RegExp(
  `^${OPENER}\\s+(${WEEKDAY_ONE}(?:\\s*(?:,|and|et)\\s*${WEEKDAY_ONE})*)${TIME}$`,
);
const DAILY = new RegExp(`^(?:daily|quotidien(?:ne)?|${OPENER}\\s+${UNIT_DAY})${TIME}$`);
const EVERY_N_DAYS = new RegExp(`^${OPENER}\\s+(\\d{1,3})\\s+${UNIT_DAY}${TIME}$`);
const WEEKLY = new RegExp(`^(?:weekly|hebdomadaire|${OPENER}\\s+${UNIT_WEEK})${TIME}$`);
const EVERY_N_WEEKS = new RegExp(`^${OPENER}\\s+(\\d{1,2})\\s+${UNIT_WEEK}${TIME}$`);
const EVERY_N_MONTHS = new RegExp(`^(?:monthly|mensuel(?:le)?|${OPENER}\\s+(?:(\\d{1,2})\\s+)?(?:months?|mois))${TIME}$`);
const YEARLY = new RegExp(`^(?:yearly|annually|annuel(?:le)?|${OPENER}\\s+(?:year|an|annee))${TIME}$`);
const WORKDAYS = new RegExp(`^${OPENER}\\s+${WORKDAY}${TIME}$`);

/** The days of the week a list names, Sunday = 0, or null if a word is not one. */
function namedDays(list: string): number[] | null {
  const days = new Set<number>();
  for (const word of list.split(/\s*(?:,|and|et)\s*/)) {
    const at = weekdayAlternatives.findIndex((alternatives) =>
      new RegExp(`^(?:${alternatives})$`).test(word.trim()));
    if (at < 0) return null;
    days.add(at % 7);
  }
  return days.size > 0 ? [...days] : null;
}

/** The first day after `from` that is one of `days`. */
function nextOf(from: Date, days: number[]): Date {
  for (let step = 1; step <= 7; step += 1) {
    const day = addDays(from, step);
    if (days.includes(getDay(day))) return day;
  }
  return addDays(from, 7);
}

/**
 * How the menus name that date: the weekday while it is less than a week away,
 * the short date after that (#352).
 */
export function nextOccurrenceLabel(day: Date, locale: 'en' | 'fr', now = new Date()): string {
  const ahead = differenceInCalendarDays(day, now);
  const style: Intl.DateTimeFormatOptions = ahead >= 0 && ahead < 7
    ? { weekday: 'short' }
    : { day: 'numeric', month: 'short' };
  return intlDate(locale === 'fr' ? 'fr-FR' : 'en-GB', style).format(day);
}

/**
 * The first step of a series, counted from `base`, that falls after `today`.
 * A task that is not late has its first step ahead already; a late one steps
 * on until it is. Bounded, so a very old task gives nothing rather than looping.
 */
function firstAfter(today: Date, step: (count: number) => Date): Date | null {
  for (let count = 1; count <= 1000; count += 1) {
    const day = step(count);
    if (isAfter(day, today)) return day;
  }
  return null;
}

export function nextOccurrence(item: Pick<Item, 'due'>, now = new Date()): Date | null {
  const due = item.due;
  if (!due?.is_recurring) return null;
  const current = dueDate(item as Item);
  if (!current) return null;

  const rule = fold(due.string);
  const fromCompletion = /^(?:every|each|tous les|toutes les|tous le|chaque)!|!/.test(rule);
  const text = rule.replace('!', '');
  const today = startOfDay(now);
  /* Counted from the due date, or from today for `every!`. */
  const base = fromCompletion ? today : startOfDay(current);
  /* A late task counts on from today: nothing before it can be the next one. */
  const from = isAfter(today, base) ? today : base;

  if (DAILY.test(text)) return firstAfter(today, (n) => addDays(base, n));
  if (WEEKLY.test(text)) return firstAfter(today, (n) => addWeeks(base, n));
  const days = EVERY_N_DAYS.exec(text);
  if (days) return firstAfter(today, (n) => addDays(base, n * Number(days[1])));
  const weeks = EVERY_N_WEEKS.exec(text);
  if (weeks) return firstAfter(today, (n) => addWeeks(base, n * Number(weeks[1])));

  const months = EVERY_N_MONTHS.exec(text);
  if (months) return base.getDate() <= 28 ? firstAfter(today, (n) => addMonths(base, n * Number(months[1] ?? 1))) : null;
  if (YEARLY.test(text)) return base.getMonth() === 1 && base.getDate() === 29 ? null : firstAfter(today, (n) => addYears(base, n));

  if (fromCompletion) return null;
  if (WORKDAYS.test(text)) return nextOf(from, [1, 2, 3, 4, 5]);
  const list = WEEKDAY_LIST.exec(text);
  const named = list ? namedDays(list[1]) : null;
  return named ? nextOf(from, named) : null;
}

/**
 * A repeat rule that is plain enough to be laid out in time, read once.
 *
 * The same narrow set `nextOccurrence` reads, for the one other thing that
 * needs it: the streak of a habit (#155), which has to know on which days a
 * rule fell. Anything else is null, and so is a rule counted from the
 * completion (`every!`) other than "every day", because the days it fell on
 * depend on the days it was completed, which a rule alone does not say.
 */
export type PlainRule =
  | { kind: 'day' }
  | { kind: 'weekday' }
  | { kind: 'days'; days: number[] }
  /** Every `n` days, counted from the date the task stands on. */
  | { kind: 'step'; n: number };

export function plainRule(due: { string: string; is_recurring: boolean } | null | undefined): PlainRule | null {
  if (!due?.is_recurring) return null;
  const rule = fold(due.string);
  const fromCompletion = /^(?:every|each|tous les|toutes les|tous le|chaque)!|!/.test(rule);
  const text = rule.replace('!', '');
  if (DAILY.test(text)) return { kind: 'day' };
  if (fromCompletion) return null;
  if (WEEKLY.test(text)) return { kind: 'step', n: 7 };
  const days = EVERY_N_DAYS.exec(text);
  if (days) return { kind: 'step', n: Number(days[1]) };
  const weeks = EVERY_N_WEEKS.exec(text);
  if (weeks) return { kind: 'step', n: 7 * Number(weeks[1]) };
  if (WORKDAYS.test(text)) return { kind: 'weekday' };
  const list = WEEKDAY_LIST.exec(text);
  const named = list ? namedDays(list[1]) : null;
  return named ? { kind: 'days', days: named } : null;
}
