import { describe, expect, it } from 'vitest';
import { eisenhowerDeadlineRule, eisenhowerQuadrant, eisenhowerUrgencyRule, urgentByDeadline } from './eisenhower';
import type { TodoistPriority } from './types';
import { due, item } from '@/test/items';

const now = new Date('2026-09-24T09:00:00');
/** Priorities as written in the app: p1 is Todoist's 4. */
const p = (display: 1 | 2 | 3 | 4) => (5 - display) as TodoistPriority;

describe('eisenhowerUrgencyRule', () => {
  it.each([
    ['2026-09-20', 'overdue'],
    ['2026-09-24', 'today'],
    ['2026-09-25', 'tomorrow'],
    ['2026-09-26', 'after-tomorrow'],
    ['2026-10-01', 'next-seven'],
    ['2026-10-02', null],
  ])('a task due %s is %s', (date, rule) => {
    expect(eisenhowerUrgencyRule(item({ due: due(date) }), now)).toBe(rule);
  });

  it('counts the week label as this week, and nothing else as urgent', () => {
    expect(eisenhowerUrgencyRule(item({ labels: ['week'] }), now)).toBe('week');
    expect(eisenhowerUrgencyRule(item(), now)).toBeNull();
  });
});

describe('eisenhowerQuadrant', () => {
  const today = due('2026-09-24');

  it('sorts into the four quadrants with the default rules', () => {
    expect(eisenhowerQuadrant(item({ due: today, priority: p(1) }), now)).toBe('urgent-important');
    expect(eisenhowerQuadrant(item({ priority: p(2) }), now)).toBe('not-urgent-important');
    expect(eisenhowerQuadrant(item({ due: today, priority: p(4) }), now)).toBe('urgent-not-important');
    expect(eisenhowerQuadrant(item({ priority: p(3) }), now)).toBe('not-urgent-not-important');
  });

  it('treats P2 as unimportant when only P1 counts', () => {
    expect(eisenhowerQuadrant(item({ due: today, priority: p(2) }), now, ['overdue', 'today'], [1]))
      .toBe('urgent-not-important');
  });

  it('widens urgency to the urgency window chosen', () => {
    const inThreeDays = item({ due: due('2026-09-27'), priority: p(1) });
    expect(eisenhowerQuadrant(inThreeDays, now)).toBe('not-urgent-important');
    expect(eisenhowerQuadrant(inThreeDays, now, ['overdue', 'today', 'next-seven']))
      .toBe('urgent-important');
  });
});

describe('matrix visible date horizon', () => {
  it('includes the chosen date range, flexible week tasks and optional someday work', async () => {
    const { matrixVisibleItems } = await import('./eisenhower');
    const { vi } = await import('vitest');
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-24T12:00:00'));
    try {
      const tasks = [item({ id: 'today', due: due('2026-09-24') }), item({ id: 'tomorrow', due: due('2026-09-25') }), item({ id: 'sun', due: due('2026-09-27') }), item({ id: 'next-week', due: due('2026-09-28') }), item({ id: 'later', due: due('2026-11-01') }), item({ id: 'week', labels: ['week'] }), item({ id: 'someday' })];
      const ids = (h: 'today' | 'tomorrow' | 'week' | 'seven' | 'month' | 'all', someday = false) => matrixVisibleItems(tasks, {}, h, someday, null, 1).map(t => t.id);
      expect(ids('today')).toEqual(['today', 'week']);
      expect(ids('tomorrow')).toEqual(['today', 'tomorrow', 'week']);
      expect(ids('week')).toEqual(['today', 'tomorrow', 'sun', 'week']);
      expect(ids('seven')).toEqual(['today', 'tomorrow', 'sun', 'next-week', 'week']);
      expect(ids('all', true)).toEqual(['today', 'tomorrow', 'sun', 'next-week', 'later', 'week', 'someday']);
    } finally { vi.useRealTimers(); }
  });
});

describe('matrixRoots (#448)', () => {
  const settings = {
    horizon: 'all' as const, includeSomeday: true, workspace: null, startDay: 1,
    urgentRules: ['overdue', 'today'] as ('overdue' | 'today')[], importantPriorities: [1, 2] as (1 | 2)[],
    weekLabel: 'week', subtasks: true,
  };
  const ids = (list: { id: string }[]) => list.map((t) => t.id).sort();
  const today = due('2026-09-24');
  const run = (tasks: ReturnType<typeof item>[], over = {}) =>
    import('./eisenhower').then(({ matrixRoots }) => matrixRoots(tasks, {}, { ...settings, ...over }));

  it('lists a subtask due today on its own when its parent is somewhere else', async () => {
    const tasks = [
      item({ id: 'parent', priority: p(4) }),
      item({ id: 'a', parent_id: 'parent', due: today, priority: p(1) }),
      item({ id: 'b', parent_id: 'parent', due: today }),
    ];
    const { cards, promoted } = await run(tasks);
    expect(ids(cards)).toEqual(['a', 'b', 'parent']);
    expect(ids([...promoted].map((id) => ({ id })))).toEqual(['a', 'b']);
  });

  it('lists a subtask on its own even in its parent\'s quadrant', async () => {
    const tasks = [item({ id: 'parent', due: today, priority: p(3) }), item({ id: 'a', parent_id: 'parent', due: today, priority: p(3) })];
    const { cards, promoted } = await run(tasks);
    expect(ids(cards)).toEqual(['a', 'parent']);
    expect(ids([...promoted].map((id) => ({ id })))).toEqual(['a']);
  });

  it('never lifts a subtask with neither a date nor a priority', async () => {
    const tasks = [item({ id: 'parent', due: today, priority: p(1) }), item({ id: 'a', parent_id: 'parent' })];
    expect(ids((await run(tasks)).cards)).toEqual(['parent']);
  });

  it('lists the subtask when its parent is outside the chosen horizon', async () => {
    const tasks = [item({ id: 'parent', due: due('2026-12-01') }), item({ id: 'a', parent_id: 'parent', due: today })];
    expect(ids((await run(tasks, { horizon: 'today' })).cards)).toEqual(['a']);
  });

  it('shows top-level tasks only with "Show subtasks" off', async () => {
    const tasks = [item({ id: 'parent' }), item({ id: 'a', parent_id: 'parent', due: today, priority: p(1) })];
    const { cards, promoted } = await run(tasks, { subtasks: false });
    expect(ids(cards)).toEqual(['parent']);
    expect(promoted.size).toBe(0);
  });

  it('follows a subtask of a subtask by the same rule', async () => {
    const tasks = [
      item({ id: 'parent' }),
      item({ id: 'a', parent_id: 'parent', due: today, priority: p(1) }),
      item({ id: 'b', parent_id: 'a', due: today, priority: p(1) }),
    ];
    expect(ids((await run(tasks)).cards)).toEqual(['a', 'b', 'parent']);
  });
});

describe('matrixRulesFor', () => {
  it('follows the Matrix page until a page changes a setting, and only that one', async () => {
    const { matrixRulesFor } = await import('./eisenhower');
    const { defaultPreferences } = await import('@/store/prefs');
    const prefs = { ...defaultPreferences('en'), eisenhowerUrgent: ['overdue'] as ('overdue')[], eisenhowerImportant: [1] as 1[] };
    expect(matrixRulesFor(prefs).urgent).toEqual(['overdue']);
    const own = matrixRulesFor(prefs, { important: [1, 2] });
    expect(own.important).toEqual([1, 2]);
    expect(own.urgent).toEqual(['overdue']);
  });
});

describe('deadlines drive urgency (#329)', () => {
  const dl = (date: string | null) => (date ? { date, lang: 'en', string: date } : null);
  const week = due('2026-09-27');

  it.each([
    ['2026-09-24', 'today'],
    ['2026-09-25', 'tomorrow'],
    ['2026-09-26', 'after-tomorrow'],
    ['2026-10-01', 'next-seven'],
    ['2026-10-02', null],
    ['2026-09-20', null],
  ])('a deadline on %s is %s', (date, rule) => {
    expect(eisenhowerDeadlineRule(item({ deadline: dl(date) }), now)).toBe(rule);
  });

  it('a task planned later with a close deadline is urgent only when a deadline rule is on', () => {
    const task = item({ due: due('2026-10-20'), deadline: dl('2026-09-26'), priority: p(1) });
    expect(eisenhowerQuadrant(task, now, ['overdue', 'today'])).toBe('not-urgent-important');
    expect(eisenhowerQuadrant(task, now, ['overdue', 'today', 'after-tomorrow'])).toBe('urgent-important');
    expect(urgentByDeadline(task, now, ['overdue', 'today', 'after-tomorrow'])).toBe(true);
    expect(urgentByDeadline(task, now, ['overdue', 'today'])).toBe(false);
  });

  it('keeps the date rules as they were, and the earlier of date and deadline wins', () => {
    const both = item({ due: due('2026-09-24'), deadline: dl('2026-09-30') });
    expect(eisenhowerQuadrant(both, now)).toBe('urgent-not-important');
    expect(urgentByDeadline(both, now, ['overdue', 'today', 'next-seven'])).toBe(false);
    expect(eisenhowerQuadrant(item({ due: week }), now)).toBe('not-urgent-not-important');
  });

  it('counts a past deadline as overdue, and never makes a task with neither urgent', () => {
    expect(eisenhowerQuadrant(item({ due: due('2026-10-20'), deadline: dl('2026-09-20') }), now)).toBe('urgent-not-important');
    expect(eisenhowerQuadrant(item(), now, ['overdue', 'today', 'today', 'next-seven'])).toBe('not-urgent-not-important');
  });
});
