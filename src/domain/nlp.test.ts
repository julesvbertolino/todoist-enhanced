import { describe, expect, it } from 'vitest';
import { readNaturalDate } from './nlp';

/* A Monday, so nothing below depends on which day the tests happen to run. */
const now = new Date(2026, 8, 28);

const read = (text: string, options?: Parameters<typeof readNaturalDate>[2]) =>
  readNaturalDate(text, now, options);

describe('a month is read from its own words, not its first three letters (#123)', () => {
  it('reads « 14 juillet » as July, not June', () => {
    expect(read('Fête 14 juillet')?.date).toBe('2027-07-14');
  });

  it('reads an ordinal day: « 1er juillet », "July 1st"', () => {
    expect(read('Réunion 1er juillet')?.date).toBe('2027-07-01');
    expect(read('Party July 1st')?.date).toBe('2027-07-01');
  });

  it('reads the abbreviations both languages use', () => {
    expect(read('sept 10')?.date).toBe('2027-09-10');
    expect(read('10 sept.')?.matched).toBe('10 sept.');
    expect(read('10 mar')?.date).toBe('2027-03-10');
    expect(read('14 juil')?.date).toBe('2027-07-14');
    expect(read('Call 3 mars')?.date).toBe('2027-03-03');
  });

  it.each([
    'Visiter 2 maisons',
    'Acheter 3 marrons',
    'Buy 2 apricots',
    'Review 2 decks',
  ])('reads nothing in "%s"', (text) => {
    expect(read(text)).toBeNull();
  });

  it('skips a day the month does not have', () => {
    expect(read('31 février')).toBeNull();
  });

  it('keeps the month that starts first when a sentence holds two', () => {
    expect(read('du 3 mars au 9 mai')?.matched).toBe('3 mars');
  });
});

describe('a numeric date follows the Date format setting (#123)', () => {
  it('reads 12/03 day first by default', () => {
    expect(read('Call 12/03')?.date).toBe('2027-03-12');
  });

  it('reads 12/03 month first when the setting says so', () => {
    expect(read('Call 12/03', { dateFormat: 'mdy' })?.date).toBe('2026-12-03');
  });

  it.each(['dmy', 'ymd', 'numeric'] as const)('reads 12/03 day first for %s', (dateFormat) => {
    expect(read('Call 12/03', { dateFormat })?.date).toBe('2027-03-12');
  });

  it('reads a year when there is one', () => {
    expect(read('12/03/2027')?.date).toBe('2027-03-12');
  });
});

describe('what already worked keeps working', () => {
  it('reads the named days', () => {
    expect(read('demain')?.date).toBe('2026-09-29');
    expect(read('lundi')?.date).toBe('2026-10-05');
    expect(read('next week')?.date).toBe('2026-10-05');
    expect(read('dans 2 semaines')?.date).toBe('2026-10-12');
  });

  it('reads a day with a time', () => {
    expect(read('tomorrow at 9h')?.date).toBe('2026-09-29T09:00:00');
  });
});


describe('relative calendar months and singular words', () => {
  it.each(['dans un mois', 'dans 1 mois', 'in a month', 'in one month'])('reads %s and keeps the exact matched span', (phrase) => {
    expect(read(`Faire ceci ${phrase}`)).toMatchObject({ date: '2026-10-28', matched: phrase, index: 11, hasTime: false });
  });
  it('reads several months and an attached time', () => {
    expect(read('dans 2 mois à 9h')?.date).toBe('2026-11-28T09:00:00');
    expect(read('dans une semaine')?.date).toBe('2026-10-05');
    expect(read('in a day')?.date).toBe('2026-09-29');
  });
  it('clamps the date at the end of a short month, including leap years', () => {
    expect(readNaturalDate('dans un mois', new Date(2026, 0, 31))?.date).toBe('2026-02-28');
    expect(readNaturalDate('dans un mois', new Date(2028, 0, 31))?.date).toBe('2028-02-29');
  });
  it('does not mistake nouns or incomplete phrases for offsets', () => {
    expect(read('dans une maison')).toBeNull();
    expect(read('dans un')).toBeNull();
  });
});


describe('relative hours and minutes', () => {
  const clock = new Date(2026, 9, 14, 23, 30);
  it.each(['Appeler dans deux heures', 'Appeler dans 2 heures', 'Appeler dans 2h', 'Call in two hours'])('reads %s across midnight', (text) => {
    const reading = readNaturalDate(text, clock);
    expect(reading?.date).toBe('2026-10-15T01:30:00');
    expect(reading?.hasTime).toBe(true);
    expect(text.slice(reading!.index, reading!.index + reading!.matched.length)).toBe(reading!.matched);
  });
  it('reads a minute offset and leaves plain small hours as durations', () => {
    expect(readNaturalDate('Appeler dans trente minutes', clock)).toBeNull();
    expect(readNaturalDate('Appeler dans 30 minutes', clock)?.date).toBe('2026-10-15T00:00:00');
    expect(readNaturalDate('Appeler dans une heure', clock)?.date).toBe('2026-10-15T00:30:00');
    expect(readNaturalDate('Écrire 2h', clock)).toBeNull();
  });
});

describe('Todoist short forms (#283)', () => {
  it('reads tmr, tmrw and tmw as tomorrow', () => {
    for (const word of ['tmr', 'tmrw', 'tmw']) expect(read(`call ${word}`)?.date).toBe('2026-09-29');
  });

  it('reads tod as today and tom as tomorrow when typed in lower case', () => {
    expect(read('pay rent tod')?.date).toBe('2026-09-28');
    expect(read('pay rent tom')?.date).toBe('2026-09-29');
  });

  it('leaves the first names Tod and Tom alone', () => {
    expect(read('Call Tom')).toBeNull();
    expect(read('Lunch with Tod')).toBeNull();
  });

  it('removes the short form from the task name', () => {
    const reading = read('buy milk tmr')!;
    expect(reading.matched).toBe('tmr');
  });
});

describe('dates in the selected language (#491)', () => {
  const en = { locale: 'en' as const };
  const fr = { locale: 'fr' as const };
  it('does not read a foreign weekday or date phrase', () => {
    expect(read('appeler mon client', fr)).toBeNull();
    expect(read('call lundi', en)).toBeNull();
    expect(read('rappeler tomorrow', fr)).toBeNull();
    expect(read('call demain', en)).toBeNull();
    expect(read('réunion 14 july', fr)).toBeNull();
  });
  it('recognises abbreviations in the chosen language', () => {
    expect(read('call thur', en)?.date).toBe('2026-10-01');
    expect(read('call next thur', en)?.date).toBe('2026-10-08');
    expect(read('réunion jeu', fr)?.date).toBe('2026-10-01');
  });
  it('reads relative dates and preserves the highlighted range', () => {
    expect(read('call this weekend', en)).toMatchObject({ matched: 'this weekend', date: '2026-10-03', index: 5 });
    expect(read('next weekend', en)?.date).toBe('2026-10-10');
    expect(read('later this week', en)?.date).toBe('2026-09-30');
    expect(read('le mois prochain', fr)?.date).toBe('2026-10-28');
    expect(read('un jour', fr)?.date).toBe('2026-11-28');
  });
  it('clamps month and year offsets and skips invalid ordinal days', () => {
    expect(readNaturalDate('next month', new Date(2026, 0, 31), en)?.date).toBe('2026-02-28');
    expect(readNaturalDate('someday', new Date(2028, 11, 31), en)?.date).toBe('2029-02-28');
    expect(readNaturalDate('next year', new Date(2028, 1, 29), en)?.date).toBe('2029-02-28');
    expect(readNaturalDate('31st', new Date(2026, 3, 30), en)?.date).toBe('2026-05-31');
  });
});
