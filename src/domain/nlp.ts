import { addMonths, addYears } from 'date-fns';
import { toApiDate, type DateFormat } from './dates';
import { MONTH_WORDS, WEEKDAY_WORDS } from './dateVocabulary';

/**
 * Reading a date out of what somebody typed.
 *
 * This is deliberately a short list of phrases people actually use rather than
 * a general date grammar: anything it is not sure about it leaves alone, so a
 * task called "Call mum about March" keeps its name. The caller can switch it
 * off entirely, which is why it is a separate pass from `#project`, `p1` and
 * `@tag` — those are explicit syntax, not a guess.
 */

export interface DateReading {
  /** `yyyy-MM-dd`, or with `THH:mm:ss` when a time of day was given. */
  date: string;
  /** The exact text that produced it, as it appears, so the caller can strip it. */
  matched: string;
  /** Where that text starts in what was read. */
  index: number;
  /** True when the phrase carried a time as well as a day. */
  hasTime: boolean;
}

export interface DateReadingOptions {
  /**
   * The order a numeric date is written in. `12/03` is the 12th of March
   * unless this says month first, and only `'mdy'` does. The language never
   * decides it: it is a setting.
   */
  dateFormat?: DateFormat;
  bareTime?: boolean;
  /** Omit for the bilingual date picker and recurrence reader. */
  locale?: 'en' | 'fr';
}

/**
 * Lowercased and stripped of accents, one character in for one character out.
 *
 * The length has to survive: every phrase below is found in the folded text
 * and reported as a position in the original, and "après-demain" folded the
 * ordinary way is one character shorter than it started — which is a mark
 * drawn a character to the left of the word it belongs to.
 */
const fold = (text: string): string =>
  text
    .toLowerCase()
    .split('')
    .map((ch) => ch.normalize('NFD')[0] ?? ch)
    .join('');

const addDays = (from: Date, days: number): Date => {
  const out = new Date(from);
  out.setDate(out.getDate() + days);
  return out;
};

export interface TimeReading {
  hours: number;
  minutes: number;
  /** Where the time sits in the text it was read from. */
  start: number;
  end: number;
}

/** A time of day appearing anywhere in the phrase: "at 14:00", "2pm", "à 9h30". */
export function readTime(text: string, locale?: 'en' | 'fr'): TimeReading | null {
  const span = (match: RegExpMatchArray) => {
    /* The pattern may have eaten the space in front of the time, and that
       space belongs to the sentence rather than to the reading. */
    const raw = match[0];
    const lead = raw.length - raw.trimStart().length;
    return { start: match.index! + lead, end: match.index! + raw.length };
  };

  const ampm = text.match(/(?<![\p{L}\p{N}_])(?:at|à|a)?\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/iu);
  if (ampm) {
    if (Number(ampm[1]) < 1 || Number(ampm[1]) > 12 || Number(ampm[2] ?? 0) > 59) return null;
    let hours = Number(ampm[1]) % 12;
    if (ampm[3].toLowerCase() === 'pm') hours += 12;
    return { hours, minutes: Number(ampm[2] ?? 0), ...span(ampm) };
  }
  const hm = text.match(/(?<![\p{L}\p{N}_])(?:at|à|a)?\s*(\d{1,2})\s*[h:]\s*(\d{2})?\b/iu);
  if (hm) {
    const hours = Number(hm[1]);
    if (hours > 23 || Number(hm[2] ?? 0) > 59) return null;
    return { hours, minutes: Number(hm[2] ?? 0), ...span(hm) };
  }

  /*
   * A part of the day is a time too.
   *
   * "demain matin" is a sentence anybody writes and nobody means vaguely: it
   * is tomorrow at nine. The hours below are the ones Todoist itself uses, so
   * a task written here and the same task written there land at the same time.
   * Afternoon is tried before noon, because "après-midi" contains it.
   */
  const french: Array<[RegExp, number]> = [
    [/\bapres[- ]midi\b/i, 14], [/\b(?:matin|matinee)\b/i, 9],
    [/\b(?:soir|soiree)\b/i, 19], [/\bmidi\b/i, 12], [/\bnuit\b/i, 21],
  ];
  const english: Array<[RegExp, number]> = [
    [/\bafternoon\b/i, 14], [/\bmorning\b/i, 9], [/\b(?:evening|tonight)\b/i, 19],
    [/\bnoon\b/i, 12], [/\bnight\b/i, 21],
  ];
  const parts = locale === 'fr' ? french : locale === 'en' ? english : [...french, ...english];
  for (const [pattern, hours] of parts) {
    const match = text.match(pattern);
    if (match) return { hours, minutes: 0, ...span(match) };
  }

  return null;
}

/** How far a time may sit from its day and still belong to it. */
const TIME_GAP = 3;

/**
 * Finds a date phrase in `raw`.
 *
 * Returns null when nothing is recognised, which is the common case and the
 * one that must never do damage.
 */
export function readNaturalDate(
  raw: string, now = new Date(), options: DateReadingOptions = {},
): DateReading | null {
  const text = fold(raw);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  /**
   * A reading, reported as the exact stretch of `raw` that produced it.
   *
   * The phrase and the time are two matches that have to be given back as one
   * range: the caller marks that range and takes it out of the task's name, so
   * a range stitched together from two strings — "demain" and " 12:14" with the
   * space counted twice — is a range that cannot be found in what was typed,
   * and the whole reading used to be dropped on the floor because of it.
   */
  const found = (day: Date, match: RegExpMatchArray): DateReading => {
    const start = match.index!;
    const end = start + match[0].length;
    const time = readTime(text, options.locale);

    /* A time is part of this phrase when it is beside it. One further off in
       the sentence belongs to the sentence: "12:14 is the deadline, call
       tomorrow" is a task for tomorrow, at no particular hour. */
    const attached = time
      && (time.start - end <= TIME_GAP && time.start >= end
        || start - time.end <= TIME_GAP && time.end <= start
        /* Or the same words twice: "ce soir" is a day and an hour written as
           one phrase, and the hour sits inside what the day matched. */
        || time.start < end && time.end > start);

    if (!time || !attached) {
      return { date: toApiDate(day), matched: raw.slice(start, end), index: start, hasTime: false };
    }

    const from = Math.min(start, time.start);
    const to = Math.max(end, time.end);
    const pad = (n: number) => String(n).padStart(2, '0');
    return {
      date: `${toApiDate(day)}T${pad(time.hours)}:${pad(time.minutes)}:00`,
      matched: raw.slice(from, to),
      index: from,
      hasTime: true,
    };
  };

  // Relative hours/minutes are an offset from now, never a duration estimate.
  const amounts: Record<string, number> = { un: 1, une: 1, a: 1, an: 1, one: 1,
    deux: 2, two: 2, trois: 3, three: 3, quatre: 4, four: 4, cinq: 5, five: 5,
    six: 6, sept: 7, seven: 7, huit: 8, eight: 8, neuf: 9, nine: 9,
    dix: 10, ten: 10, onze: 11, eleven: 11, douze: 12, twelve: 12 };
  const offsetPattern = options.locale === 'fr' ? /\bdans\s+(\d{1,3}|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze)\s*(heures?|h|minutes?|min|mn)\b/ : options.locale === 'en' ? /\bin\s+(\d{1,3}|a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s*(hours?|h|minutes?|mins?|min)\b/ : /\b(?:in|dans)\s+(\d{1,3}|un|une|a|an|one|deux|two|trois|three|quatre|four|cinq|five|six|sept|seven|huit|eight|neuf|nine|dix|ten|onze|eleven|douze|twelve)\s*(hours?|heures?|h|minutes?|mins?|min|mn)\b/;
  const offset = text.match(offsetPattern);
  if (offset) {
    const count = /^\d+$/.test(offset[1]) ? Number(offset[1]) : amounts[offset[1]];
    if (count > 0) {
      const minutes = count * (/^(?:h|heure|hour)/.test(offset[2]) ? 60 : 1);
      const when = new Date(now.getTime() + minutes * 60_000);
      const pad = (n: number) => String(n).padStart(2, '0');
      return { date: `${toApiDate(when)}T${pad(when.getHours())}:${pad(when.getMinutes())}:00`,
        matched: raw.slice(offset.index!, offset.index! + offset[0].length), index: offset.index!, hasTime: true };
    }
  }

  // "today" / "tomorrow" / the day after
  const frenchDays: Array<[RegExp, number]> = [
    [/\b(ce soir|cette nuit|ce matin|cet? apres[- ]midi)\b/, 0],
    [/\b(aujourd'?hui|auj)\b/, 0], [/\b(apres-demain|apres demain)\b/, 2], [/\bdemain\b/, 1],
  ];
  const englishDays: Array<[RegExp, number]> = [
    [/\b(this (?:morning|afternoon|evening)|tonight)\b/, 0], [/\btoday\b/, 0],
    [/\bafter tomorrow\b/, 2], [/\b(tomorrow|tmrw?|tmw)\b/, 1],
  ];
  const plain = options.locale === 'fr' ? frenchDays : options.locale === 'en' ? englishDays : [...frenchDays, ...englishDays];
  for (const [pattern, offset] of plain) {
    const match = text.match(pattern);
    if (match) return found(addDays(today, offset), match);
  }

  /* Todoist's own short forms, "tod" and "tom" (#283). Those two are also first
     names, so they only count when typed in lower case: "call Tom" stays a task
     about Tom. */
  const short = options.locale === 'fr' ? null : text.match(/\b(tod|tom)\b/);
  if (short && raw.slice(short.index!, short.index! + short[0].length) === short[0]) {
    return found(addDays(today, short[0] === 'tod' ? 0 : 1), short);
  }

  // "next week" / "la semaine prochaine" — the coming Monday
  const nextWeek = text.match(options.locale === 'fr' ? /\b(?:la )?semaine prochaine\b/ : options.locale === 'en' ? /\bnext week\b/ : /\b(next week|semaine prochaine|la semaine prochaine)\b/);
  if (nextWeek) {
    return found(addDays(today, ((8 - today.getDay()) % 7) || 7), nextWeek);
  }

  // "in 3 days" / "dans 2 semaines"
  const relative = text.match(options.locale === 'fr' ? /\bdans\s+(\d{1,3}|un|une)\s+(jours?|semaines?|mois)\b/ : options.locale === 'en' ? /\bin\s+(\d{1,3}|a|an|one)\s+(days?|weeks?|months?)\b/ : /\b(?:in|dans)\s+(\d{1,3}|un|une|a|an|one)\s+(days?|jours?|weeks?|semaines?|months?|mois)\b/);
  if (relative) {
    const count = /^\d+$/.test(relative[1]) ? Number(relative[1]) : 1;
    const weeks = relative[2].startsWith('week') || relative[2].startsWith('semaine');
    const months = relative[2].startsWith('month') || relative[2] === 'mois';
    return found(months ? addMonths(today, count) : addDays(today, count * (weeks ? 7 : 1)), relative);
  }

  const english = options.locale !== 'fr';
  const french = options.locale !== 'en';
  const named: Array<[RegExp, (date: Date) => Date]> = [
    ...(english ? [
      [/\bthis weekend\b/, (d: Date) => addDays(d, (6 - d.getDay() + 7) % 7)],
      [/\bnext weekend\b/, (d: Date) => addDays(d, (6 - d.getDay() + 7) % 7 + 7)],
      [/\blater this week\b/, (d: Date) => addDays(d, 2)],
      [/\bnext month\b/, (d: Date) => addMonths(d, 1)],
      [/\bnext year\b/, (d: Date) => addYears(d, 1)],
      [/\bsomeday\b/, (d: Date) => addMonths(d, 2)],
    ] as Array<[RegExp, (date: Date) => Date]> : []),
    ...(french ? [
      [/\b(?:ce|cet) week[- ]end\b/, (d: Date) => addDays(d, (6 - d.getDay() + 7) % 7)],
      [/\b(?:le )?week[- ]end prochain\b/, (d: Date) => addDays(d, (6 - d.getDay() + 7) % 7 + 7)],
      [/\bplus tard cette semaine\b/, (d: Date) => addDays(d, 2)],
      [/\b(?:le )?mois prochain\b/, (d: Date) => addMonths(d, 1)],
      [/\b(?:l'|la )?annee prochaine\b/, (d: Date) => addYears(d, 1)],
      [/\bun jour\b/, (d: Date) => addMonths(d, 2)],
    ] as Array<[RegExp, (date: Date) => Date]> : []),
  ];
  for (const [pattern, date] of named) {
    const match = text.match(pattern);
    if (match) return found(date(today), match);
  }

  const languages = options.locale ? [options.locale] : ['en', 'fr'] as const;
  /* "10 sept", "3 mars", "1er juillet", "July 1st", "sept 10": the next
     occurrence of that calendar day. Use the selected language when provided;
     each month is matched by its exact words with a boundary after them. When
     a sentence holds more than one, the one that starts first is the one read;
     the caller reads on from there for a later one. */
  let earliest: { at: number; day: Date; match: RegExpMatchArray } | null = null;
  for (let month = 0; month < 12; month += 1) {
    const alternatives = languages.flatMap((language) => MONTH_WORDS[language][month].split('|')).sort((a, b) => b.length - a.length).join('|');
    const words = `(?:${alternatives})\\.?(?![a-z])`;
    const dayFirst = text.match(new RegExp(`\\b(\\d{1,2})(?:er|e|st|nd|rd|th)?\\s+${words}`));
    const monthFirst = text.match(new RegExp(`\\b${words}\\s+(\\d{1,2})(?:er|st|nd|rd|th)?\\b`));
    for (const match of [dayFirst, monthFirst]) {
      if (!match) continue;
      const dayOfMonth = Number(match[1]);
      if (dayOfMonth < 1 || dayOfMonth > 31) continue;
      let day = new Date(today.getFullYear(), month, dayOfMonth);
      if (day < today) day = new Date(today.getFullYear() + 1, month, dayOfMonth);
      if (day.getMonth() !== month) continue;   // 31 February and friends
      if (!earliest || match.index! < earliest.at) earliest = { at: match.index!, day, match };
    }
  }
  if (earliest) return found(earliest.day, earliest.match);

  for (const language of languages) {
    for (let index = 0; index < 7; index += 1) {
      const name = WEEKDAY_WORDS[language][index];
      const prefix = language === 'en' ? '(?:next )?' : '(?:prochain |le )?';
      const match = text.match(new RegExp(`\\b${prefix}(?:${name})\\b`));
      if (!match) continue;
      const delta = language === 'en' && match[0].startsWith('next ')
        ? (((8 - today.getDay()) % 7) || 7) + ((index + 6) % 7)
        : ((index - today.getDay() + 7) % 7) || 7;
      return found(addDays(today, delta), match);
    }
  }


  /* "12/03" and "12/03/2026". Day first, except when the Date format setting
     says month first: the order is a preference, not a fact about a language. */
  const numeric = text.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (numeric) {
    const monthFirst = options.dateFormat === 'mdy';
    const dayOfMonth = Number(numeric[monthFirst ? 2 : 1]);
    const month = Number(numeric[monthFirst ? 1 : 2]) - 1;
    const year = numeric[3]
      ? Number(numeric[3].length === 2 ? `20${numeric[3]}` : numeric[3])
      : today.getFullYear();
    const day = new Date(year, month, dayOfMonth);
    if (day.getMonth() === month && day.getDate() === dayOfMonth) {
      const future = !numeric[3] && day < today
        ? new Date(year + 1, month, dayOfMonth)
        : day;
      return found(future, numeric);
    }
  }

  // An ordinal without a month means the next real occurrence of that day.
  const ordinal = text.match(options.locale === 'fr' ? /\b(\d{1,2})(?:er|e|eme)\b/ : options.locale === 'en' ? /\b(\d{1,2})(?:st|nd|rd|th)\b/ : /\b(\d{1,2})(?:st|nd|rd|th|er|eme|e)\b/);
  if (ordinal) {
    const day = Number(ordinal[1]);
    if (day >= 1 && day <= 31) {
      for (let step = 0; step < 12; step += 1) {
        const first = new Date(today.getFullYear(), today.getMonth() + step, 1);
        const candidate = new Date(first.getFullYear(), first.getMonth(), day);
        if (candidate.getMonth() === first.getMonth() && candidate >= today) return found(candidate, ordinal);
      }
    }
  }

  if (options.bareTime !== false) {
    const time = readTime(text, options.locale);
    if (time) {
      const token = text.slice(time.start, time.end);
      // Small h-values remain durations; explicit prefixes and clock formats are unambiguous.
      const explicit = /^(?:at|a)\s/.test(token) || /:|(?:am|pm)\b/.test(token);
      const clock = /\d/.test(token) && (explicit || time.hours >= 7);
      if (clock) {
        const day = new Date(today);
        day.setHours(time.hours, time.minutes, 0, 0);
        if (day <= now) day.setDate(day.getDate() + 1);
        const pad = (n: number) => String(n).padStart(2, '0');
        return { date: `${toApiDate(day)}T${pad(time.hours)}:${pad(time.minutes)}:00`, matched: raw.slice(time.start, time.end), index: time.start, hasTime: true };
      }
    }
  }

  return null;
}

/** Removes the phrase the reading came from, leaving a clean task name. */
export function stripReading(raw: string, reading: DateReading): string {
  const escaped = reading.matched.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return raw
    .replace(new RegExp(escaped, 'i'), ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
