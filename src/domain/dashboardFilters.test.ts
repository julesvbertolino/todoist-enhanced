import { describe, expect, it } from 'vitest';
import { defaultFilters, type CompletedItem } from './types';
import { matchesDashboardHistory, matchesDashboardOpen } from './dashboardFilters';
import { item } from '@/test/items';

describe('dashboard priority and tag filters', () => {
  const filters = { ...defaultFilters('dashboard'), priorities: [1] as const, labels: ['Work', 'family'] };
  const history = { id: '1', user_id: 'u', project_id: 'p', section_id: null, content: 'x', completed_at: '2026-10-28T00:00:00Z', priority: 4, labels: ['work'] } as CompletedItem;
  it('combines priority and any selected tag for open and completed tasks', () => {
    const selected = { ...filters, priorities: [...filters.priorities] };
    expect(matchesDashboardHistory(history, selected)).toBe('match');
    expect(matchesDashboardOpen(item({ priority: 4, labels: ['FAMILY'] }), selected)).toBe(true);
    expect(matchesDashboardHistory({ ...history, priority: 3 }, selected)).toBe('no-match');
    expect(matchesDashboardHistory({ ...history, labels: [] }, selected)).toBe('no-match');
  });
  it('identifies missing history data without using a current task as a substitute', () => {
    const selected = { ...filters, priorities: [...filters.priorities] };
    expect(matchesDashboardHistory({ ...history, priority: undefined }, selected)).toBe('unknown');
    expect(matchesDashboardHistory({ ...history, labels: undefined }, selected)).toBe('unknown');
    expect(matchesDashboardHistory({ ...history, labels: undefined, priority: undefined }, defaultFilters('dashboard'))).toBe('match');
  });
});
