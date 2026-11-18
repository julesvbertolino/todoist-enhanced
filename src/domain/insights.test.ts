import { describe, expect, it } from 'vitest';
import { completedSince, completedTaskCount, completionBuckets, projectProgress, summariseInsights } from './insights';
import { rangeFor } from './periods';
import { emptySnapshot, type CompletedItem } from './types';

const done = (overrides: Partial<CompletedItem>): CompletedItem => ({
  id: overrides.id ?? 'c',
  user_id: 'me',
  project_id: 'inbox',
  section_id: null,
  content: 'Done',
  completed_at: '2026-10-05T10:00:00Z',
  ...overrides,
});

describe('completed estimated time (#151)', () => {
  it("counts a completed task's own duration like its tag, and est-* never as a tag", () => {
    const summary = summariseInsights([
      done({ id: 'tag', labels: ['est-20', 'home'] }),
      done({ id: 'duration', duration: { amount: 40, unit: 'minute' } }),
      done({ id: 'days', duration: { amount: 1, unit: 'day' } }),
      done({ id: 'bare' }),
    ], [], emptySnapshot(), new Date('2026-10-05T12:00:00Z'));

    expect(summary.completedMinutes).toBe(60);
    expect(summary.completedWithoutEstimate).toBe(2);
  });
});

describe('completions per bucket (#174)', () => {
  const at = (iso: string) => done({ completed_at: new Date(iso).toISOString() });

  it('reads a quarter by month with totals that add up, zero months included', () => {
    const range = rangeFor('quarter', 0, null, 1, new Date(2026, 9, 7));
    const items = [at('2026-10-02T09:00:00'), at('2026-10-30T20:00:00'), at('2026-12-31T23:30:00')];
    const months = completionBuckets(items, range, 'month');
    expect(months.map((m) => m.key)).toEqual(['2026-10', '2026-11', '2026-12']);
    expect(months.map((m) => m.value)).toEqual([2, 0, 1]);
    expect(months.reduce((sum, m) => sum + m.value, 0)).toBe(items.length);
  });

  it('keeps hours out of it: the same items read by day add up to the same total', () => {
    const range = rangeFor('month', 0, null, 1, new Date(2026, 9, 7));
    const items = [at('2026-10-02T09:00:00'), at('2026-10-02T17:00:00'), at('2026-10-25T01:30:00')];
    const days = completionBuckets(items, range, 'day');
    expect(days).toHaveLength(31);
    expect(days.find((d) => d.key === '2026-10-02')?.value).toBe(2);
    expect(days.reduce((sum, d) => sum + d.value, 0)).toBe(3);
  });
});

describe('project progress (#239)', () => {
  const open = (id: string, parent_id: string | null = null) => ({ id, parent_id, content: 'Task' } as never);

  it("takes the completed total from Todoist's count and counts every open task, subtasks included", () => {
    expect(projectProgress(3, [open('a'), open('s1', 'a'), open('s2', 'a')])).toEqual({ completed: 3, active: 3, percentage: 50 });
  });

  it('excludes uncompletable tasks from progress', () => {
    expect(projectProgress(1, [open('a'), { id: 'n', content: '* Reference' } as never])).toEqual({ completed: 1, active: 1, percentage: 50 });
  });

  it('has no figure until the count has loaded, instead of reading 0%', () => {
    expect(projectProgress(undefined, [open('a')])).toBeNull();
  });

  it('is 0% for a project with nothing in it, not a division by zero', () => {
    expect(projectProgress(0, [])).toEqual({ completed: 0, active: 0, percentage: 0 });
  });

  it('counts completions of the calendar week from its first day, inclusive', () => {
    const entries = [done({ completed_at: '2026-10-18T23:59:00' }), done({ completed_at: '2026-10-19T00:00:00' }), done({ completed_at: '2026-10-22T09:00:00' })];
    expect(completedSince(entries, new Date('2026-10-19T00:00:00'))).toBe(2);
  });
});

describe('completed tasks of a project (#239)', () => {
  it('counts a task completed twice, after a reopen, once', () => {
    expect(completedTaskCount([
      done({ id: 'e1', task_id: 'b' }), done({ id: 'e2', task_id: 'b' }), done({ id: 'e3', task_id: 'a' }),
    ])).toBe(2);
  });
});

describe('uncompletable tasks in statistics', () => {
  it('excludes past completions when the current open task is now uncompletable', () => {
    const snapshot = emptySnapshot();
    snapshot.items.standing = { id: 'standing', content: '* Reference' } as never;
    const summary = summariseInsights([done({ id: 'event', task_id: 'standing', content: 'Reference' })], [], snapshot);
    expect(summary.completedCount).toBe(0);
  });

  it('excludes marked tasks from counts, progress, and completed time', () => {
    const summary = summariseInsights(
      [done({ id: 'one', labels: ['est-20'] }), done({ id: 'note', content: '* Old note', labels: ['est-60'] })],
      [{ content: 'Work', labels: [], duration: null }, { content: '* Reference', labels: ['est-90'], duration: null }] as never,
      emptySnapshot(),
    );
    expect(summary).toMatchObject({ completedCount: 1, completedMinutes: 20, activeCount: 1, progressPercentage: 50 });
  });
});
