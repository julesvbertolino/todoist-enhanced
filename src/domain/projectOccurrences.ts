/** Read-only forecasts, kept outside the synced snapshot and command queue. */
import { addDays, addMonths, addYears, differenceInCalendarDays, getDaysInMonth, startOfDay } from 'date-fns';
import { dueDate, toApiDate } from './dates';
import { readNaturalDate } from './nlp';
import { plainRule } from './nextOccurrence';
import { WEEKDAY_WORDS } from './dateVocabulary';
import type { Item } from './types';

export interface Projection { sourceId: string; date: string }
const fold = (text: string) => text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
const opener = '(?:every|each|tous les|toutes les|tous le|chaque)';
const days = [...WEEKDAY_WORDS.en, ...WEEKDAY_WORDS.fr];
function weekday(word: string): number {
  return days.findIndex((pattern) => new RegExp(`^(?:${pattern})$`).test(word)) % 7;
}

/** Completion-relative and opaque rules are deliberately not invented. */
export function occurrenceSchedule(item: Item): ((day: Date) => boolean) | null {
  const due = item.due;
  const anchor = dueDate(item);
  if (!due?.is_recurring || !anchor || due.string.includes('!')) return null;
  if (due.timezone && due.timezone !== Intl.DateTimeFormat().resolvedOptions().timeZone) return null;
  let text = fold(due.string).replace(/^everyday\b/, 'every day');
  const end = text.match(/\s+(?:until|ending(?: on)?|end on|till|til|jusqu(?:'|’)au?|jusqua)\s+(.+)$/);
  if (end) {
    const bound = end[1];
    let last: Date | null = null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(bound)) {
      last = new Date(`${bound}T00:00:00`);
      if (Number.isNaN(last.getTime()) || toApiDate(last) !== bound) return null;
    } else {
      const year = bound.match(/\s+(\d{4})$/);
      const phrase = year ? bound.slice(0, year.index).trim() : bound;
      const reading = readNaturalDate(phrase, anchor, { bareTime: false });
      if (!reading || fold(reading.matched) !== phrase || reading.hasTime) return null;
      last = new Date(`${reading.date}T00:00:00`);
      if (year) {
        const month = last.getMonth(), day = last.getDate();
        last.setFullYear(Number(year[1]));
        if (last.getMonth() !== month || last.getDate() !== day) return null;
      }
    }
    const core = text.slice(0, end.index).trim();
    const schedule = occurrenceSchedule({ ...item, due: { ...due, string: core } });
    return schedule ? (day) => day <= last! && schedule(day) : null;
  }
  // The server's current occurrence already incorporates a start bound.
  text = text.replace(/\s+(?:starting(?: on| from)?|from|a partir (?:du|de)|des le)\s+.+$/, '').trim();
  // The time stays on the forecast; it does not change its calendar days.
  text = text.replace(/\s+(?:(?:at|@|a|vers)\s*)?(?:\d{1,2}(?:[:h.]\d{2}|h)?\s*(?:am|pm)?|noon|midnight|morning|afternoon|evening|night|midi|minuit|matin|apres-midi|soir|nuit)$/, '').trim();
  const plain = plainRule({ ...due, string: text });
  if (plain) return (day) => {
    switch (plain.kind) {
      case 'day': return true;
      case 'weekday': return day.getDay() >= 1 && day.getDay() <= 5;
      case 'days': return plain.days.includes(day.getDay());
      case 'step': return plain.n > 0 && differenceInCalendarDays(day, anchor) % plain.n === 0;
    }
  };
  if (new RegExp(`^${opener}\\s+(?:weekends?|week-?ends?|fins? de semaine)$`).test(text)) return (day) => [0, 6].includes(day.getDay());
  const interval = text.match(new RegExp(`^${opener}\\s+(?:(\\d{1,3})\\s+|(?:other|deux)\\s+)?(days?|jours?|weeks?|semaines?|months?|mois|quarters?|trimestres?|years?|ans?|annees?)$`));
  const shorthand = /^(monthly|mensuel(?:le)?|quarterly|trimestriel(?:le)?|yearly|annually|annuel(?:le)?)$/.exec(text);
  if (interval || shorthand) {
    const unit = interval?.[2] ?? shorthand![1];
    const n = interval ? Number(interval[1] ?? (/\b(other|deux)\b/.test(text) ? 2 : 1)) : 1;
    if (n < 1) return null;
    if (/^(day|jour|week|semaine)/.test(unit)) {
      const step = n * (/^(week|semaine)/.test(unit) ? 7 : 1);
      return (day) => differenceInCalendarDays(day, anchor) % step === 0;
    }
    if (/^(?:years?|yearly|annually|annuel(?:le)?|ans?|annees?)$/.test(unit)) return (day) => {
      const delta = day.getFullYear() - anchor.getFullYear();
      return delta >= 0 && delta % n === 0 && toApiDate(day) === toApiDate(addYears(anchor, delta));
    };
    const step = n * (/^(quarter|trimestre)/.test(unit) ? 3 : 1);
    return (day) => {
      const delta = (day.getFullYear() - anchor.getFullYear()) * 12 + day.getMonth() - anchor.getMonth();
      return delta >= 0 && delta % step === 0 && toApiDate(day) === toApiDate(addMonths(anchor, delta));
    };
  }
  if (new RegExp(`^${opener}\\s+(?:last day(?: of (?:the |each )?month)?|dernier jour(?: du mois)?)$`).test(text)) return (day) => day.getDate() === getDaysInMonth(day);
  // Monthly day lists, e.g. every 2, 15, 27. Invalid month dates are skipped.
  const monthDays = text.match(new RegExp(`^${opener}\\s+((?:\\d{1,2}(?:st|nd|rd|th|er|eme|e)?)(?:\\s*(?:,|and|et|&)\\s*\\d{1,2}(?:st|nd|rd|th|er|eme|e)?)*)$`));
  if (monthDays) {
    const dates = monthDays[1].match(/\d+/g)!.map(Number);
    if (dates.some((n) => n < 1 || n > 31)) return null;
    return (day) => dates.includes(day.getDate());
  }
  const ordinal = text.match(new RegExp(`^${opener}\\s+(1st|2nd|3rd|4th|5th|first|second|third|fourth|fifth|last|premier|premiere|deuxieme|troisieme|quatrieme|dernier|derniere)\\s+(${days.join('|')})$`));
  if (ordinal) {
    const positions: Record<string, number> = { '1st': 1, first: 1, premier: 1, premiere: 1, '2nd': 2, second: 2, deuxieme: 2, '3rd': 3, third: 3, troisieme: 3, '4th': 4, fourth: 4, quatrieme: 4, '5th': 5, fifth: 5 };
    const target = weekday(ordinal[2]);
    return (day) => day.getDay() === target && (positions[ordinal[1]]
      ? Math.floor((day.getDate() - 1) / 7) + 1 === positions[ordinal[1]]
      : day.getDate() + 7 > getDaysInMonth(day));
  }
  return null;
}

export function projectOccurrences(items: Item[], from: Date, until: Date): { items: Item[]; unsupported: boolean } {
  const output: Item[] = [];
  let unsupported = false;
  for (const item of items) {
    const anchor = dueDate(item);
    if (!anchor) continue;
    if (startOfDay(anchor) >= startOfDay(from) && startOfDay(anchor) <= until) output.push(item);
    if (!item.due?.is_recurring) continue;
    const scheduled = occurrenceSchedule(item);
    if (!scheduled) { unsupported = true; continue; }
    // A postponed current occurrence is the first known occurrence: never backfill before it.
    for (let day = startOfDay(anchor) < startOfDay(from) ? startOfDay(from) : startOfDay(addDays(anchor, 1)); day <= until; day = addDays(day, 1)) {
      if (day < startOfDay(from) || !scheduled(day)) continue;
      const date = toApiDate(day);
      let forecastDate = date;
      if (item.due.date.includes('T')) {
        const clock = new Date(day);
        clock.setHours(anchor.getHours(), anchor.getMinutes(), anchor.getSeconds(), 0);
        forecastDate = /(?:Z|[+-]\d{2}:?\d{2})$/.test(item.due.date)
          ? clock.toISOString()
          : `${date}T${String(anchor.getHours()).padStart(2, '0')}:${String(anchor.getMinutes()).padStart(2, '0')}:${String(anchor.getSeconds()).padStart(2, '0')}`;
      }
      output.push({ ...item, id: `forecast:${item.id}:${date}`, due: { ...item.due, date: forecastDate }, projection: { sourceId: item.id, date } });
    }
  }
  return { items: output, unsupported };
}
