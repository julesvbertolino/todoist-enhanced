import { describe, expect, it } from 'vitest';
import {
  ageInMonths, groupWeek, keptDay, pruneKept, readKept, splitDust, splitQuick,
} from './views';
import { due, item } from '@/test/items';

/* A Wednesday at noon, so "earlier today" and "later today" both exist. */
const NOW = new Date(2026, 9, 7, 12, 0, 0);

const ids = (list: { id: string }[]) => list.map((task) => task.id);

describe('splitQuick', () => {
  it.each([
    ['overdue', { id: 'a', labels: ['est-3'], due: due('2026-10-05') }],
    ['due today, no time', { id: 'a', labels: ['est-3'], due: due('2026-10-07') }],
    ['due later today, with a time', { id: 'a', labels: ['est-3'], due: due('2026-10-07T17:00:00') }],
    ['no date', { id: 'a', labels: ['est-3'] }],
    ['the week label', { id: 'a', labels: ['est-3', 'week'] }],
    ['tagged quick, no estimate', { id: 'a', labels: ['quick'] }],
    ['estimated at exactly five minutes', { id: 'a', labels: ['est-5'] }],
    ['tagged quick and estimated at five minutes', { id: 'a', labels: ['quick', 'est-5'] }],
  ])('takes a quick task that is %s', (_name, task) => {
    expect(ids(splitQuick([item(task)], NOW).quick)).toEqual(['a']);
  });

  it.each([
    ['tomorrow', due('2026-10-08')],
    ['next month', due('2026-11-15')],
  ])('leaves a quick task dated %s where it is', (_name, date) => {
    const split = splitQuick([item({ id: 'a', labels: ['est-3'], due: date })], NOW);
    expect(ids(split.quick)).toEqual([]);
    expect(ids(split.rest)).toEqual(['a']);
  });

  it('leaves a task that is not quick, whatever its date', () => {
    const tasks = [
      item({ id: 'long', labels: ['est-30'] }),
      item({ id: 'none' }),
      item({ id: 'six', labels: ['est-6'] }),
      item({ id: 'late', labels: ['est-30'], due: due('2026-10-01') }),
    ];
    expect(ids(splitQuick(tasks, NOW).quick)).toEqual([]);
  });

  it('does not take a task tagged quick that is estimated at forty minutes', () => {
    const split = splitQuick([item({ id: 'a', labels: ['quick', 'est-40'] })], NOW);
    expect(ids(split.quick)).toEqual([]);
    expect(ids(split.rest)).toEqual(['a']);
  });

  it('does not pull a quick subtask out from under its parent', () => {
    const tasks = [
      item({ id: 'parent', labels: ['est-30'] }),
      item({ id: 'child', parent_id: 'parent', labels: ['est-2'] }),
    ];
    const split = splitQuick(tasks, NOW);
    expect(ids(split.quick)).toEqual([]);
    expect(ids(split.rest)).toEqual(['parent', 'child']);
  });

  it('does not take a completed task', () => {
    const split = splitQuick([item({ id: 'a', labels: ['est-3'], checked: true })], NOW);
    expect(ids(split.quick)).toEqual([]);
  });

  it('puts every task on exactly one side, in the order it came', () => {
    const tasks = [
      item({ id: '1', labels: ['est-3'] }),
      item({ id: '2', labels: ['est-30'] }),
      item({ id: '3', labels: ['est-2'], due: due('2026-10-07') }),
      item({ id: '4', labels: ['est-2'], due: due('2026-12-01') }),
      item({ id: '5' }),
    ];
    const { quick, rest } = splitQuick(tasks, NOW);
    expect(ids(quick)).toEqual(['1', '3']);
    expect(ids(rest)).toEqual(['2', '4', '5']);
    expect([...ids(quick), ...ids(rest)].sort()).toEqual(['1', '2', '3', '4', '5']);
  });
});

describe('groupWeek', () => {
  /* My week keeps its own rules: the late ones stay in Behind schedule. */
  it('keeps a late quick task in Behind schedule and takes only today for Quick', () => {
    const tasks = [
      item({ id: 'late', labels: ['est-3'], due: due('2026-10-05') }),
      item({ id: 'today', labels: ['est-3'], due: due('2026-10-07') }),
      item({ id: 'anytime', labels: ['est-3', 'week'] }),
    ];
    const groups = groupWeek(tasks, NOW);
    expect(ids(groups.overdue)).toEqual(['late']);
    expect(ids(groups.quick)).toEqual(['today']);
    expect(ids(groups.anytime)).toEqual(['anytime']);
  });
});

describe('splitDust', () => {
  /* 7 October 2026, local. Three months back is 7 July. */
  const old = (id: string, added: string, extra = {}) =>
    item({ id, added_at: `${added}T09:30:00`, ...extra });
  const dust = (tasks: ReturnType<typeof item>[], extra = {}) =>
    ids(splitDust(tasks, { now: NOW, months: 3, ...extra }).dust);

  it('takes a task added four months ago and leaves one added two months ago', () => {
    expect(dust([old('four', '2026-06-01'), old('two', '2026-08-01')])).toEqual(['four']);
  });

  it('counts the three months as up on the day, and not the day before', () => {
    expect(dust([
      old('exactly', '2026-07-07'),
      old('next-day', '2026-07-08'),
      old('day-before', '2026-07-06'),
    ])).toEqual(['day-before', 'exactly']);
  });

  it.each([
    [1, ['2026-09-07', true], ['2026-09-08', false]],
    [2, ['2026-08-07', true], ['2026-08-08', false]],
    [6, ['2026-04-07', true], ['2026-04-08', false]],
    [12, ['2025-10-07', true], ['2025-10-08', false]],
  ] as const)('moves the line with a delay of %i months', (months, [inDay], [outDay]) => {
    const split = splitDust([old('in', inDay), old('out', outDay)], { now: NOW, months });
    expect(ids(split.dust)).toEqual(['in']);
    expect(ids(split.rest)).toEqual(['out']);
  });

  it('never takes a dated task or one carrying the week label', () => {
    expect(dust([
      old('dated', '2026-01-01', { due: due('2026-10-20') }),
      old('late', '2026-01-01', { due: due('2026-10-01') }),
      old('week', '2026-01-01', { labels: ['week'] }),
    ])).toEqual([]);
  });

  it('does not pull a subtask out from under its parent', () => {
    expect(dust([old('child', '2026-01-01', { parent_id: 'parent' })])).toEqual([]);
  });

  it('never takes a task with no creation date', () => {
    expect(dust([item({ id: 'unknown' }), item({ id: 'junk', added_at: 'not a date' })])).toEqual([]);
  });

  it('does not take a completed task', () => {
    expect(dust([old('done', '2026-01-01', { checked: true })])).toEqual([]);
  });

  it('keeps a task out until a full delay has passed from the day it was kept', () => {
    const tasks = [old('kept', '2026-01-01')];
    // Kept on 1 September: its three months are over on 1 December.
    expect(dust(tasks, { kept: { kept: '2026-09-01' } })).toEqual([]);
    expect(dust(tasks, { kept: { kept: '2026-07-07' } })).toEqual(['kept']);
    expect(dust(tasks, { kept: { kept: '2026-07-08' } })).toEqual([]);
  });

  it('keeps for the chosen delay: kept two months ago is back at 2 months, not at 3', () => {
    const tasks = [old('kept', '2026-01-01')];
    const kept = { kept: '2026-08-07' };
    expect(dust(tasks, { kept })).toEqual([]);
    expect(ids(splitDust(tasks, { now: NOW, months: 2, kept }).dust)).toEqual(['kept']);
  });

  it('lists the oldest first, and every task on exactly one side', () => {
    const tasks = [
      old('b', '2026-04-01'),
      old('recent', '2026-09-20'),
      old('a', '2025-12-25'),
      old('dated', '2025-01-01', { due: due('2026-10-20') }),
    ];
    const split = splitDust(tasks, { now: NOW, months: 3 });
    expect(ids(split.dust)).toEqual(['a', 'b']);
    expect(ids(split.rest)).toEqual(['recent', 'dated']);
  });
});

describe('the quick split runs first', () => {
  it('lists an old quick Someday task as quick, and as dust only when Quick is off', () => {
    const tasks = [
      item({ id: 'quick', labels: ['est-3'], added_at: '2026-01-01T09:00:00' }),
      item({ id: 'slow', labels: ['est-60'], added_at: '2026-01-01T09:00:00' }),
    ];
    const withQuick = splitQuick(tasks, NOW);
    expect(ids(withQuick.quick)).toEqual(['quick']);
    expect(ids(splitDust(withQuick.rest, { now: NOW, months: 3 }).dust)).toEqual(['slow']);
    expect(ids(splitDust(tasks, { now: NOW, months: 3 }).dust)).toEqual(['quick', 'slow']);
  });
});

describe('the Keep ledger', () => {
  it('reads back only well-formed entries', () => {
    expect(readKept({ a: '2026-09-01', b: 'yesterday', c: 5 })).toEqual({ a: '2026-09-01' });
    expect(readKept(null)).toEqual({});
    expect(readKept('nope')).toEqual({});
  });

  it('drops entries no delay could still hide', () => {
    const ledger = { fresh: '2026-09-01', ancient: '2025-01-01', broken: 'x' };
    expect(pruneKept(ledger, NOW)).toEqual({ fresh: '2026-09-01' });
  });

  it('writes the local day', () => {
    expect(keptDay(NOW)).toBe('2026-10-07');
  });
});

describe('ageInMonths', () => {
  it('counts whole months, and never says less than one', () => {
    expect(ageInMonths(item({ added_at: '2026-02-01T10:00:00' }), NOW)).toBe(8);
    expect(ageInMonths(item({ added_at: '2026-10-05T10:00:00' }), NOW)).toBe(1);
    expect(ageInMonths(item(), NOW)).toBe(0);
  });
});
