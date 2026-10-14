import { describe, it, expect } from 'vitest';
import { readNaturalDate } from './nlp';
import { parseShorthand } from './shorthand';
import { projectOccurrences } from './projectOccurrences';
import { searchRank } from './search';
import { validLabelRename, renamedLabelSnapshot } from './renameLabel';
import { emptySnapshot } from './types';
import { summariseLoad } from './load';
import { revertRefused } from '@/store/helpers';
import { command } from '@/api/commands';
import { item } from '@/test/items';
const recurring = (string: string, date = '2026-10-13', extra = {}) => item({ id: 'a', due: { date, string, lang: 'en', timezone: null, is_recurring: true }, ...extra });
const project = (rule: string, from = '2026-10-14', until = '2026-10-20', anchor = '2026-10-13') => projectOccurrences([recurring(rule, anchor)], new Date(from + 'T00:00:00'), new Date(until + 'T00:00:00'));
const dates = (rule: string) => project(rule).items.map((i) => i.due!.date);
describe('release: recurring forecasts', () => {
  it('counts every weekday duration, excludes the weekend and leaves source data intact', () => {
    const task = recurring('every weekday', '2026-10-13T09:00:00', { duration: { amount: 30, unit: 'minute' } });
    const result = projectOccurrences([task], new Date(2026, 9, 14), new Date(2026, 9, 20));
    expect(result.items).toHaveLength(5);
    expect(result.items.map((i) => i.due!.date)).toEqual(['2026-10-14T09:00:00','2026-10-15T09:00:00','2026-10-16T09:00:00','2026-10-19T09:00:00','2026-10-20T09:00:00']);
    expect(summariseLoad(result.items, () => [], null).estimatedMinutes).toBe(150);
    expect(new Set(result.items.map((i) => i.id)).size).toBe(5);
    expect(task.due!.date).toBe('2026-10-13T09:00:00');
  });
  it('anchors interval rules and supports weekday lists in both languages', () => {
    expect(dates('every 3 days')).toEqual(['2026-10-16','2026-10-19']);
    expect(dates('chaque jour de la semaine')).toEqual(['2026-10-14','2026-10-15','2026-10-16','2026-10-19','2026-10-20']);
    expect(dates('chaque jour de semaine')).toEqual(dates('every weekday'));
    expect(dates('tous les lundis')).toEqual(['2026-10-19']);
    expect(dates('every mon, wed, fri')).toEqual(['2026-10-14','2026-10-16','2026-10-19']);
    expect(dates('every other day')).toEqual(['2026-10-15','2026-10-17','2026-10-19']);
  });
  it('keeps the real occurrence once and never projects before a postponed occurrence', () => {
    const result = project('every day', '2026-10-14', '2026-10-20', '2026-10-18');
    expect(result.items.map((i) => i.due!.date)).toEqual(['2026-10-18','2026-10-19','2026-10-20']);
    expect(result.items[0].projection).toBeUndefined();
  });
  it('supports month intervals and last weekdays', () => {
    expect(project('every month', '2026-10-14', '2026-12-31').items.map((i) => i.due!.date)).toEqual(['2026-11-13','2026-12-13']);
    expect(project('every last friday', '2026-10-14', '2026-11-30').items.map((i) => i.due!.date)).toEqual(['2026-10-30','2026-11-27']);
  });
  it('does not invent completion-based or unsupported schedules', () => {
    expect(project('every! 3 days').unsupported).toBe(true);
    expect(project('every holiday').items).toEqual([]);
    expect(project('every day until 1 dec').unsupported).toBe(false);
    expect(project('every day until 16 oct 2026').items.map((i) => i.due!.date)).toEqual(['2026-10-14','2026-10-15','2026-10-16']);
    expect(project('every last day', '2026-10-14', '2026-11-30').items.map((i) => i.due!.date)).toEqual(['2026-10-31','2026-11-30']);
  });
});
describe('release: bare clock times', () => {
  const now = new Date(2026, 9, 13, 14);
  it.each(['20h', '20h30', '20:30', '8pm', '8:30 am', 'at 8pm', 'à 20h', 'à 2h', 'at 2h'])('reads %s without a day', (text) => expect(readNaturalDate(text, now)?.hasTime).toBe(true));
  it('uses tomorrow when the time has passed and rolls across year boundaries', () => {
    expect(readNaturalDate('20h', new Date(2026, 9, 13, 21))?.date).toBe('2026-10-14T20:00:00');
    expect(readNaturalDate('00:30', new Date(2026, 11, 31, 21))?.date).toBe('2027-01-01T00:30:00');
  });
  it.each(['2h', '1h30', 'Chapter 12', 'Room 20', '25h', '20:90', '15pm', 'morning'])('leaves %s untouched', (text) => expect(readNaturalDate(text, now)).toBeNull());
  it('does not let distant clock time replace an explicit day in the composer', () => {
    expect(parseShorthand('20:30 call about something tomorrow', emptySnapshot(), true).date).not.toContain('T');
    expect(parseShorthand('Write 1h30', emptySnapshot(), true).minutes).toBe(90);
    expect(parseShorthand('Call tomorrow 2h', emptySnapshot(), true).minutes).toBeNull();
    expect(parseShorthand('Work (1h30) 20h', emptySnapshot(), true).minutes).toBe(90);
    expect(parseShorthand('Work (1h30) 20h', emptySnapshot(), true).ranges.map((r) => r.kind)).toEqual(['duration','date']);
  });
});
describe('release: renaming labels', () => {
  const snapshot = emptySnapshot();
  snapshot.labels.a = { id: 'a', name: 'Café', color: 'blue', item_order: 1, is_favorite: true, is_deleted: false };
  snapshot.labels.b = { ...snapshot.labels.a, id: 'b', name: 'Home' };
  snapshot.items.a = item({ id: 'a', labels: ['Café', 'Home'] });
  it('accepts accents and emoji but refuses duplicates and system names', () => {
    expect(validLabelRename(snapshot, 'a', '🏠Maison', 'this_week')).toBe(true);
    for (const name of ['', 'home', 'week', 'quick', 'est-30', 'this_week']) expect(validLabelRename(snapshot, 'a', name, 'this_week')).toBe(false);
  });
  it('renames task references and rolls them back on API refusal without losing other tags', () => {
    const next = renamedLabelSnapshot(snapshot, 'a', '🏠Maison');
    expect(next.items.a.labels).toEqual(['🏠Maison', 'Home']);
    const cmd = command('label_update', { id: 'a', name: '🏠Maison' });
    const reverted = revertRefused(next, snapshot, [cmd], [{ uuid: cmd.uuid }]);
    expect(reverted.labels.a.name).toBe('Café');
    expect(reverted.items.a.labels).toEqual(['Café','Home']);
  });
});
it('ranks complete search results consistently and folds accents', () => {
  expect(searchRank('reglages', 'Réglages')).toBe(0);
  expect(searchRank('call', 'Call home')).toBe(1);
  expect(searchRank('call', 'Please call home')).toBe(2);
  expect(searchRank('call', 'Recall')).toBe(3);
  expect(searchRank('call', 'Home', 'Make a call')).toBe(4);
});
it('renames favourites without confusing their own collection key with another label', () => {
  const snapshot = emptySnapshot();
  snapshot.labels.local = { id: 'server-id', name: 'Favourite', color: 'blue', item_order: 1, is_favorite: true, is_deleted: false };
  expect(validLabelRename(snapshot, 'local', 'Favourite', 'week')).toBe(true);
  expect(validLabelRename(snapshot, 'local', 'New favourite', 'week')).toBe(true);
  expect(renamedLabelSnapshot(snapshot, 'local', 'New-favourite').labels.local.is_favorite).toBe(true);
});
