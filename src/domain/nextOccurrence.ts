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
 * - a task that is already late gets no date: where Todoist puts a late
 *   occurrence is not something to assume;
 * - `every!` counts from today, which is only a plain step for the simple
 *   day and week rules; its weekday forms are left out;
 * - anything else, a bound, a month, a position ("last friday"), gives null.
 */
import { addDays, addWeeks, getDay, startOfDay } from 'date-fns';
import { dueDate, isOverdue } from './dates';
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

export function nextOccurrence(item: Pick<Item, 'due'>, now = new Date()): Date | null {
  const due = item.due;
  if (!due?.is_recurring) return null;
  const current = dueDate(item as Item);
  if (!current || isOverdue(item as Item, now)) return null;

  const rule = fold(due.string);
  const fromCompletion = /^(?:every|each|tous les|toutes les|tous le|chaque)!|!/.test(rule);
  const text = rule.replace('!', '');
  /* Counted from the due date, or from today for `every!`. */
  const base = fromCompletion ? startOfDay(now) : startOfDay(current);

  if (DAILY.test(text)) return addDays(base, 1);
  if (WEEKLY.test(text)) return addWeeks(base, 1);
  const days = EVERY_N_DAYS.exec(text);
  if (days) return addDays(base, Number(days[1]));
  const weeks = EVERY_N_WEEKS.exec(text);
  if (weeks) return addWeeks(base, Number(weeks[1]));

  if (fromCompletion) return null;
  if (WORKDAYS.test(text)) return nextOf(base, [1, 2, 3, 4, 5]);
  const list = WEEKDAY_LIST.exec(text);
  const named = list ? namedDays(list[1]) : null;
  return named ? nextOf(base, named) : null;
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
