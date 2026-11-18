import { describe, expect, it } from 'vitest';
import { loadTone, summariseLoad, unestimatedWorkload } from './load';
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

describe('a subtask listed on its own as well as under its parent (#405)', () => {
  it('is counted once in the time', () => {
    const parent = item({ id: 'p', labels: ['est-30'] });
    const child = item({ id: 'c', parent_id: 'p', labels: ['est-30'] });
    const childrenOf = (id: string) => (id === 'p' ? [child] : []);
    expect(summariseLoad([parent, child], childrenOf, null)).toMatchObject({ taskCount: 2, estimatedMinutes: 30 });
    expect(summariseLoad([child], childrenOf, null)).toMatchObject({ taskCount: 1, estimatedMinutes: 30 });
  });
});

describe('uncompletable tasks in load', () => {
  it('does not count them or their estimates, including when nested under a normal task', () => {
    const normal = item({ id: 'normal', labels: ['est-30'] });
    const note = item({ id: 'note', content: '* Reference', labels: ['est-60'] });
    const child = item({ id: 'child', content: '* Reminder', labels: ['est-90'], parent_id: 'normal' });
    const childrenOf = (id: string) => id === 'normal' ? [child] : [];
    expect(summariseLoad([normal, note], childrenOf, 60)).toMatchObject({ taskCount: 1, estimatedMinutes: 30, unestimatedCount: 0, percentage: 50 });
  });
});

it('keeps a normal descendant under an uncompletable heading in the load', () => {
  const parent = item({ id: 'p' });
  const heading = item({ id: 'h', content: '* Heading', parent_id: 'p', labels: ['est-80'] });
  const child = item({ id: 'c', parent_id: 'h', labels: ['est-20'] });
  const childrenOf = (id: string) => id === 'p' ? [heading] : id === 'h' ? [child] : [];
  expect(summariseLoad([parent, heading, child], childrenOf, null)).toMatchObject({ taskCount: 2, estimatedMinutes: 20 });
});


it('includes ordinary children of a standing parent even when only the parent is listed', () => {
  const heading = item({ id: 'heading', content: '* Heading', labels: ['est-90'] });
  const child = item({ id: 'c', parent_id: 'heading', labels: ['est-20'] });
  expect(summariseLoad([heading], (id) => id === 'heading' ? [child] : [], null)).toMatchObject({ taskCount: 0, estimatedMinutes: 20 });
});


it('offers the unestimated child of a standing parent for estimation', () => {
  const heading = item({ id: 'heading', content: '* Heading' });
  const child = item({ id: 'child', parent_id: 'heading' });
  const childrenOf = (id: string) => id === 'heading' ? [child] : [];
  expect(summariseLoad([heading], childrenOf, null).unestimatedCount).toBe(1);
  expect(unestimatedWorkload([heading], childrenOf).map((task) => task.id)).toEqual(['child']);
});
