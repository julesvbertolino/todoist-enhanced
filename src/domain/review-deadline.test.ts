import { describe, expect, it } from 'vitest';
import { buildReview } from './review';
import { item } from '@/test/items';

describe('deadlines in review', () => {
  it('includes today in the daily review and this week in the weekly review', () => {
    const now = new Date(2026, 9, 7, 12);
    const today = item({ id: 'today', deadline: { date: '2026-10-07', lang: 'en' } });
    const later = item({ id: 'later', deadline: { date: '2026-10-09', lang: 'en' } });
    const input = { roots: [today, later], projects: {}, completed: [], inboxProjectId: null, now, weekStartsOn: 1 as const, quietAfterDays: 30, weeklyCapacityMinutes: 2400, childrenOf: () => [] };
    const daily = buildReview('daily', input);
    const weekly = buildReview('weekly', input);
    expect(daily.find((step) => step.id === 'today')?.items.map((task) => task.id)).toContain('today');
    expect(weekly.find((step) => step.id === 'load')?.items.map((task) => task.id)).toEqual(['today', 'later']);
  });
});
