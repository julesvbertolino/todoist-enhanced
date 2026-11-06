import { addDays, endOfMonth, startOfDay, startOfMonth, startOfWeek } from 'date-fns';
import { dueDate, toApiDate, toApiDateTime, weekStartsOnOf } from './dates';
import { estimateOf } from './estimates';
import { dueForDate } from './recurrence';
import type { CalendarPrefs, Item, ViewPrefs } from './types';

export function calendarPrefs(view: ViewPrefs, viewKey: string): CalendarPrefs {
  const saved = view.calendar;
  return {
    presentation: saved && ['3-days', 'week', 'month'].includes(saved.presentation) ? saved.presentation : 'week',
    futureOccurrences: saved?.futureOccurrences === true,
    completed: saved?.completed === true,
    coloration: saved && ['priority', 'project', 'tag'].includes(saved.coloration) ? saved.coloration
      : viewKey.startsWith('project:') || viewKey === 'inbox' ? 'priority' : 'project',
    /* Upcoming lists dated tasks only, so its No date panel starts from everywhere. */
    undatedSource: typeof saved?.undatedSource === 'string' && saved.undatedSource ? saved.undatedSource : viewKey === 'upcoming' ? 'all' : 'view',
  };
}

export type UndatedSource =
  | { kind: 'view' }
  | { kind: 'all' }
  | { kind: 'project' | 'label' | 'filter'; id: string };

/** Reads what `CalendarPrefs.undatedSource` holds; anything unreadable is the page itself. */
export function readUndatedSource(value: string): UndatedSource {
  if (value === 'all') return { kind: 'all' };
  const match = value.match(/^(project|label|filter):(.+)$/);
  return match ? { kind: match[1] as 'project' | 'label' | 'filter', id: match[2] } : { kind: 'view' };
}

export function calendarRange(anchor: Date, presentation: CalendarPrefs['presentation'], startDay?: number) {
  const weekStartsOn = weekStartsOnOf(startDay);
  const first = presentation === 'month'
    ? startOfWeek(startOfMonth(anchor), { weekStartsOn })
    : presentation === 'week' ? startOfWeek(anchor, { weekStartsOn }) : startOfDay(anchor);
  const last = presentation === 'month'
    ? addDays(startOfWeek(endOfMonth(anchor), { weekStartsOn }), 6)
    : addDays(first, presentation === 'week' ? 6 : 2);
  return { first, last };
}

export const calendarMinutes = (item: Item) => estimateOf(item) ?? 30;
export const minuteOfDay = (date: Date) => date.getHours() * 60 + date.getMinutes();
export const snapMinutes = (minutes: number) => Math.round(minutes / 15) * 15;

/** A calendar placement owns the time explicitly, while preserving a repeat rule.
 * Fixed-zone tasks use an absolute instant; floating tasks keep floating time. */
export function calendarDue(item: Item, day: Date, minutes: number | null) {
  const date = new Date(day);
  if (minutes !== null) date.setHours(0, minutes, 0, 0);
  const fixed = item.due?.timezone || /(?:Z|[+-]\d{2}:?\d{2})$/.test(item.due?.date ?? '');
  const due = dueForDate(item.due, minutes === null ? toApiDate(day) : fixed ? date.toISOString() : toApiDateTime(date), 'en', { dropTime: true });
  // Date-only values have no time zone.
  if (minutes === null) due.timezone = null;
  return due;
}

/** Partition a connected overlap cluster into lanes so no task hides another. */
export function calendarLanes(items: Item[]): Map<string, { lane: number; count: number }> {
  const sorted = items.map((item) => ({ item, start: minuteOfDay(dueDate(item)!), end: minuteOfDay(dueDate(item)!) + calendarMinutes(item) }))
    .sort((a, b) => a.start - b.start || b.end - a.end || a.item.id.localeCompare(b.item.id));
  const result = new Map<string, { lane: number; count: number }>();
  let cluster: Array<{ id: string; lane: number }> = [];
  let ends: number[] = [];
  let clusterEnd = -1;
  const flush = () => { for (const entry of cluster) result.set(entry.id, { lane: entry.lane, count: ends.length }); cluster = []; ends = []; };
  for (const { item, start, end } of sorted) {
    if (start >= clusterEnd) flush();
    let lane = ends.findIndex((value) => value <= start);
    if (lane < 0) lane = ends.length;
    ends[lane] = end;
    cluster.push({ id: item.id, lane });
    clusterEnd = Math.max(cluster.length === 1 ? end : clusterEnd, end);
  }
  flush();
  return result;
}
