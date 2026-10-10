import { describe, expect, it } from 'vitest';
import { cutLogbook } from './logbook';
import type { CompletedItem } from './types';

const done = (id: string, completed_at: string, extra: Partial<CompletedItem> = {}): CompletedItem => ({
  id, user_id: 'me', project_id: 'inbox', section_id: null, content: id, completed_at, ...extra,
});

const rows = [
  done('a', '2026-10-05T10:00:00', { priority: 1, labels: ['est-30'] }),
  done('b', '2026-10-05T15:00:00', { priority: 4, project_id: 'work' }),
  done('c', '2026-09-20T09:00:00', { priority: 4, project_id: 'work', duration: { amount: 60, unit: 'minute' } }),
  done('d', '2026-09-21T09:00:00', { project_id: 'work' }),
];

describe('the Logbook', () => {
  it('reads days newest first, and adds up what each day estimated', () => {
    const days = cutLogbook(rows, 'day', 'date');
    expect(days.map((d) => d.key)).toEqual(['2026-10-05', '2026-09-21', '2026-09-20']);
    expect(days[0].minutes).toBe(30);
    expect(days[2].minutes).toBe(60);
  });

  it('cuts by month, newest first', () => {
    const months = cutLogbook(rows, 'month', 'date');
    expect(months.map((m) => [m.key, m.rows.length])).toEqual([['2026-10', 2], ['2026-09', 2]]);
  });

  it('cuts by project with the most finished first, and by priority from P1', () => {
    expect(cutLogbook(rows, 'project', 'date').map((c) => c.projectId)).toEqual(['work', 'inbox']);
    expect(cutLogbook(rows, 'priority', 'date').map((c) => c.priority)).toEqual([1, 4]);
  });

  it('puts the highest priority first inside a cut when sorted by priority, the latest breaking ties', () => {
    const [october] = cutLogbook(rows, 'month', 'priority');
    expect(october.rows.map((r) => r.id)).toEqual(['b', 'a']);
    const [, september] = cutLogbook(rows, 'month', 'priority');
    expect(september.rows.map((r) => r.id)).toEqual(['c', 'd']);
    const [latest] = cutLogbook(rows, 'month', 'date');
    expect(latest.rows.map((r) => r.id)).toEqual(['b', 'a']);
  });

  it('is empty when nothing was finished', () => {
    expect(cutLogbook([], 'day', 'date')).toEqual([]);
  });
});
