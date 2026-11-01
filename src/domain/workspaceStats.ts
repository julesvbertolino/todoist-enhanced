import { differenceInCalendarDays, differenceInDays, differenceInMonths, addMonths, startOfDay, subDays } from 'date-fns';
import { intlNumber } from '@/lib/intl';

const unit = (locale: string, unit: 'year' | 'month' | 'day', value: number) =>
  intlNumber(locale, { style: 'unit', unit, unitDisplay: 'long' }).format(value);

/**
 * How long ago something started, in the two largest units that apply:
 * "2 years, 6 months", "3 months, 12 days", "5 days". Under a day it is "today".
 */
export function elapsed(from: Date, now: Date, locale: string, today: string): string {
  if (!Number.isFinite(from.getTime()) || from > now) return today;
  const months = differenceInMonths(now, from);
  const years = Math.floor(months / 12);
  const restMonths = months % 12;
  const days = differenceInDays(now, addMonths(from, months));
  const parts: string[] = [];
  if (years > 0) parts.push(unit(locale, 'year', years));
  if (restMonths > 0) parts.push(unit(locale, 'month', restMonths));
  if (years === 0 && days > 0) parts.push(unit(locale, 'day', days));
  if (parts.length === 0) return today;
  return parts.slice(0, 2).join(', ');
}

/** Completed tasks per project in each of the last `weeks` seven-day spans, oldest first. */
export function weeklyCompletions(
  items: Array<{ project_id: string; completed_at: string }>,
  now: Date,
  weeks = 8,
): Record<string, number[]> {
  const today = startOfDay(now);
  const out: Record<string, number[]> = {};
  for (const item of items) {
    const at = new Date(item.completed_at);
    if (!Number.isFinite(at.getTime())) continue;
    const ago = differenceInCalendarDays(today, startOfDay(at));
    if (ago < 0 || ago >= weeks * 7) continue;
    const bucket = weeks - 1 - Math.floor(ago / 7);
    (out[item.project_id] ??= Array.from({ length: weeks }, () => 0))[bucket] += 1;
  }
  return out;
}

export const weeksStart = (now: Date, weeks = 8): Date => subDays(startOfDay(now), weeks * 7 - 1);
