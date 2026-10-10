import { describe, expect, it } from 'vitest';
import { loadTone, summariseLoad } from './load';
import { item } from '@/test/items';

describe('the tone of the header duration (#173)', () => {
  it('is neutral below 95%, amber from 95 to a full day, red beyond it', () => {
    expect(loadTone(0)).toBe('neutral');
    expect(loadTone(94)).toBe('neutral');
    expect(loadTone(95)).toBe('warn');
    expect(loadTone(100)).toBe('warn');
    expect(loadTone(101)).toBe('over');
    expect(loadTone(240)).toBe('over');
  });

  it('is neutral where there is no capacity to measure against', () => {
    expect(loadTone(null)).toBe('neutral');
  });

  it('reads the percentage the summary computes', () => {
    const tasks = [item({ id: 'a', labels: ['est-90'] }), item({ id: 'b' })];
    const none = () => [];
    // 90 of 95 minutes is 95%: amber. One task has no estimate and says so.
    const summary = summariseLoad(tasks, none, 95);
    expect(summary).toMatchObject({ taskCount: 2, estimatedMinutes: 90, unestimatedCount: 1, percentage: 95 });
    expect(loadTone(summary.percentage)).toBe('warn');
    // And 90 of 100 is still comfortable.
    expect(loadTone(summariseLoad(tasks, none, 100).percentage)).toBe('neutral');
    expect(summariseLoad(tasks, none, null).percentage).toBeNull();
  });
});
