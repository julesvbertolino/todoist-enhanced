import { describe, expect, it } from 'vitest';
import { nextOccurrence, nextOccurrenceLabel } from './nextOccurrence';
import { item } from '@/test/items';

// Wednesday 7 October 2026, mid-morning.
const now = new Date(2026, 9, 7, 10, 0);
const recurring = (string: string, date: string) =>
  item({ due: { date, string, lang: 'en', timezone: null, is_recurring: true } });
const day = (date: Date | null) => date && `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

describe('where "skip to next occurrence" lands (#153)', () => {
  it('reads the plain rules from the due date', () => {
    expect(day(nextOccurrence(recurring('every day', '2026-10-07'), now))).toBe('2026-10-8');
    expect(day(nextOccurrence(recurring('every 3 days', '2026-10-07'), now))).toBe('2026-10-10');
    expect(day(nextOccurrence(recurring('every week', '2026-10-09'), now))).toBe('2026-10-16');
    expect(day(nextOccurrence(recurring('every 2 weeks', '2026-10-09'), now))).toBe('2026-10-23');
    expect(day(nextOccurrence(recurring('every Monday', '2026-10-12'), now))).toBe('2026-10-19');
    expect(day(nextOccurrence(recurring('every mon, wed, fri', '2026-10-07T18:00:00'), now))).toBe('2026-10-9');
    expect(day(nextOccurrence(recurring('every weekday', '2026-10-09'), now))).toBe('2026-10-12');
    expect(day(nextOccurrence(recurring('tous les lundis', '2026-10-12'), now))).toBe('2026-10-19');
  });

  it('reads a month or a year when the day is safe (#352)', () => {
    expect(day(nextOccurrence(recurring('every month', '2026-10-15'), now))).toBe('2026-11-15');
    expect(day(nextOccurrence(recurring('every 2 months', '2026-10-15'), now))).toBe('2026-12-15');
    expect(day(nextOccurrence(recurring('every year', '2026-10-15'), now))).toBe('2027-10-15');
    expect(nextOccurrence(recurring('every month', '2026-10-31'), now)).toBeNull();
  });

  it('names the date by weekday under a week, by short date after (#352)', () => {
    expect(nextOccurrenceLabel(new Date(2026, 9, 8), 'en', now)).toBe('Thu');
    expect(nextOccurrenceLabel(new Date(2026, 9, 13), 'en', now)).toBe('Tue');
    expect(nextOccurrenceLabel(new Date(2026, 9, 14), 'en', now)).toBe('14 Oct');
    expect(nextOccurrenceLabel(new Date(2026, 9, 14), 'fr', now)).toBe('14 oct.');
  });

  it('does not let a time of day change the date', () => {
    expect(day(nextOccurrence(recurring('every day at 9am', '2026-10-07T18:00:00'), now))).toBe('2026-10-8');
  });

  it('counts every! from today', () => {
    expect(day(nextOccurrence(recurring('every! 3 days', '2026-10-07'), now))).toBe('2026-10-10');
    expect(nextOccurrence(recurring('every! monday', '2026-10-12'), now)).toBeNull();
  });

  it('moves a late task to tomorrow when its next occurrence is already past', () => {
    expect(day(nextOccurrence(recurring('every day', '2026-10-02'), now))).toBe('2026-10-8');
    expect(day(nextOccurrence(recurring('every day at 8:00', '2026-10-07T08:00:00'), now))).toBe('2026-10-8');
    expect(day(nextOccurrence(recurring('every 3 days', '2026-10-01'), now))).toBe('2026-10-8');
    expect(day(nextOccurrence(recurring('every week', '2026-09-25'), now))).toBe('2026-10-8');
    expect(day(nextOccurrence(recurring('every Monday', '2026-09-28'), now))).toBe('2026-10-8');
    expect(day(nextOccurrence(recurring('every weekday', '2026-10-03'), now))).toBe('2026-10-8');
    expect(day(nextOccurrence(recurring('every month', '2026-08-02'), now))).toBe('2026-10-8');
    expect(day(nextOccurrence(recurring('every year', '2025-10-05'), now))).toBe('2026-10-8');
  });

  it('keeps the next occurrence of a late task when it is still ahead', () => {
    expect(day(nextOccurrence(recurring('every 2 weeks', '2026-09-30'), now))).toBe('2026-10-14');
    expect(day(nextOccurrence(recurring('every Monday', '2026-10-05'), now))).toBe('2026-10-12');
    expect(day(nextOccurrence(recurring('every month', '2026-09-15'), now))).toBe('2026-10-15');
    expect(day(nextOccurrence(recurring('every week', '2026-10-03'), now))).toBe('2026-10-10');
  });

  it('says nothing for a rule it does not read, or a task that does not repeat', () => {
    expect(nextOccurrence(recurring('every month', '2026-09-30'), now)).toBeNull();
    expect(nextOccurrence(recurring('every last friday', '2026-10-30'), now)).toBeNull();
    expect(nextOccurrence(recurring('every month', '2026-10-30'), now)).toBeNull();
    expect(nextOccurrence(recurring('every day until Dec 1', '2026-10-07'), now)).toBeNull();
    expect(nextOccurrence(item({ due: null }), now)).toBeNull();
  });
});
