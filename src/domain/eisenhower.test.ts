import { describe, expect, it } from 'vitest';
import { eisenhowerQuadrant, eisenhowerUrgencyRule } from './eisenhower';
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
