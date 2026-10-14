import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import {
  canStoreDurations, estimatePatch, durationMinutes, effectiveEstimate, estimateOf, formatDuration, parentEstimateWrites, parseDurationInput, readEstimate, withEstimate,
} from './estimates';
import { setEstimateStorage, type TodoistDuration } from './types';
import { item } from '@/test/items';

beforeEach(() => setEstimateStorage(null));
afterEach(() => setEstimateStorage(null));

describe('parseDurationInput', () => {
  it.each([
    ['45', 45],
    ['45 min', 45],
    ['45m', 45],
    ['90 min', 90],
    ['1h', 60],
    ['2 h', 120],
    ['1h15', 75],
    ['1 h 15', 75],
    ['1:30', 90],
    ['1.5h', 90],
    ['1,5 h', 90],
    ['1 heure', 60],
  ])('reads %j as %i minutes', (typed, minutes) => {
    expect(parseDurationInput(typed)).toBe(minutes);
  });

  it.each(['', '   ', 'soon', '0', '0 min', '1h75', '-5'])('refuses %j', (typed) => {
    expect(parseDurationInput(typed)).toBeNull();
  });
});

describe('readEstimate', () => {
  it('finds no estimate on a task without one', () => {
    expect(readEstimate(['week', 'quick'])).toEqual({
      minutes: null, raw: [], multiple: false, invalid: false,
      source: null, tagMinutes: null, durationMinutes: null, mismatch: false,
    });
  });

  it('reads est-<minutes>', () => {
    expect(readEstimate(['week', 'est-30']).minutes).toBe(30);
  });

  it('reports two estimates rather than choosing silently', () => {
    const reading = readEstimate(['est-30', 'est-45']);
    expect(reading.multiple).toBe(true);
    expect(reading.minutes).toBe(30);
  });

  it('reports an estimate that is not a positive whole number', () => {
    expect(readEstimate(['est-abc'])).toMatchObject({ minutes: null, invalid: true });
    expect(readEstimate(['est-0'])).toMatchObject({ minutes: null, invalid: true });
  });
});

describe('withEstimate', () => {
  it('replaces every estimate with a single one', () => {
    expect(withEstimate(['week', 'est-10', 'est-20'], 45)).toEqual(['week', 'est-45']);
  });

  it('strips estimates when given null', () => {
    expect(withEstimate(['week', 'est-10'], null)).toEqual(['week']);
  });
});

describe('formatDuration', () => {
  it.each([
    [45, '45 min'],
    [60, '1 h'],
    [75, '1 h 15'],
    [125, '2 h 05'],
  ])('%i minutes reads %j', (minutes, text) => {
    expect(formatDuration(minutes)).toBe(text);
  });
});

describe('effectiveEstimate', () => {
  const parent = item({ id: 'parent' });
  const children = [
    item({ id: 'a', parent_id: 'parent', labels: ['est-20'] }),
    item({ id: 'b', parent_id: 'parent', labels: ['est-25'] }),
    item({ id: 'done', parent_id: 'parent', labels: ['est-60'], checked: true }),
  ];
  const childrenOf = (id: string) => (id === 'parent' ? children : []);

  it("keeps the task's own estimate while a subtask has none", () => {
    const unestimated = [...children, item({ id: 'c', parent_id: 'parent' })];
    const of = (id: string) => (id === 'parent' ? unestimated : []);
    expect(effectiveEstimate({ ...parent, labels: ['est-90'] }, of))
      .toEqual({ minutes: 90, computed: false });
  });

  it("lets the subtasks' sum win once every open one has an estimate (#187)", () => {
    expect(effectiveEstimate({ ...parent, labels: ['est-90'] }, childrenOf))
      .toEqual({ minutes: 45, computed: false });
    expect(effectiveEstimate(parent, childrenOf)).toEqual({ minutes: 45, computed: false });
  });

  it('shows a partial sum as computed when the parent has no estimate', () => {
    const unestimated = [...children, item({ id: 'c', parent_id: 'parent' })];
    expect(effectiveEstimate(parent, (id) => (id === 'parent' ? unestimated : [])))
      .toEqual({ minutes: 45, computed: true });
  });

  it('follows a nested parent through its own sum', () => {
    const grand = item({ id: 'g', labels: ['est-5'] });
    const mid = item({ id: 'm', parent_id: 'g', labels: ['est-99'] });
    const leaves = [item({ id: 'l1', parent_id: 'm', labels: ['est-10'] }), item({ id: 'l2', parent_id: 'm', labels: ['est-20'] })];
    const of = (id: string) => (id === 'g' ? [mid] : id === 'm' ? leaves : []);
    expect(effectiveEstimate(grand, of)).toEqual({ minutes: 30, computed: false });
  });

  it('does not count a subtask whose figure is only a partial sum', () => {
    const grand = item({ id: 'g', labels: ['est-5'] });
    const mid = item({ id: 'm', parent_id: 'g' });
    const leaves = [item({ id: 'l1', parent_id: 'm', labels: ['est-10'] }), item({ id: 'l2', parent_id: 'm' })];
    const of = (id: string) => (id === 'g' ? [mid] : id === 'm' ? leaves : []);
    expect(effectiveEstimate(grand, of)).toEqual({ minutes: 5, computed: false });
  });

  it('lists the parents to rewrite, and only those', () => {
    const wrong = item({ id: 'p1', labels: ['est-60'] });
    const right = item({ id: 'p2', labels: ['est-30'] });
    const partial = item({ id: 'p3', labels: ['est-60'] });
    const kids: Record<string, ReturnType<typeof item>[]> = {
      p1: [item({ id: 'a', parent_id: 'p1', labels: ['est-10'] }), item({ id: 'b', parent_id: 'p1', labels: ['est-20'] })],
      p2: [item({ id: 'c', parent_id: 'p2', labels: ['est-30'] })],
      p3: [item({ id: 'd', parent_id: 'p3', labels: ['est-10'] }), item({ id: 'e', parent_id: 'p3' })],
    };
    expect(parentEstimateWrites([wrong, right, partial], (id) => kids[id] ?? []))
      .toEqual([{ id: 'p1', minutes: 30 }]);
  });
});

describe("Todoist's own duration, read beside the tag (#151)", () => {
  const minutes = (amount: number): TodoistDuration => ({ amount, unit: 'minute' });

  it('counts a duration on a task with no tag', () => {
    expect(readEstimate({ labels: [], duration: minutes(25) })).toMatchObject({ minutes: 25, source: 'duration' });
  });

  it('counts a tag on a task with no duration', () => {
    expect(readEstimate({ labels: ['est-40'], duration: null })).toMatchObject({ minutes: 40, source: 'tag' });
  });

  it("lets Todoist's duration win in duration mode", () => {
    setEstimateStorage('duration');
    expect(readEstimate({ labels: ['est-40'], duration: minutes(60) })).toMatchObject({
      minutes: 60, source: 'duration', tagMinutes: 40, durationMinutes: 60, mismatch: true,
    });
  });

  it('falls back to the tag when the duration is in days', () => {
    expect(readEstimate({ labels: ['est-40'], duration: { amount: 1, unit: 'day' } }))
      .toMatchObject({ minutes: 40, source: 'tag' });
  });

  it('sees no mismatch when both say the same', () => {
    expect(readEstimate({ labels: ['est-30'], duration: minutes(30) }).mismatch).toBe(false);
  });

  it('ignores a duration in days, and amounts that are not a positive number of minutes', () => {
    expect(durationMinutes({ amount: 2, unit: 'day' })).toBeNull();
    expect(durationMinutes(minutes(0))).toBeNull();
    expect(durationMinutes(minutes(-5))).toBeNull();
    expect(durationMinutes(minutes(Number.NaN))).toBeNull();
    expect(durationMinutes(minutes(12.6))).toBe(13);
    expect(durationMinutes(null)).toBeNull();
    expect(estimateOf({ labels: [], duration: { amount: 2, unit: 'day' } })).toBeNull();
  });

  it('never reports a duration as a second or broken estimate', () => {
    const reading = readEstimate({ labels: ['est-30'], duration: minutes(45) });
    expect(reading.multiple).toBe(false);
    expect(reading.invalid).toBe(false);
    expect(reading.raw).toEqual(['est-30']);
  });

  it('reads labels alone as tags only', () => {
    expect(readEstimate(['est-15'])).toMatchObject({ minutes: 15, durationMinutes: null });
  });

  it('sums children carrying either one under a parent without its own', () => {
    const parent = item({ id: 'p' });
    const children = [
      item({ id: 'a', parent_id: 'p', labels: ['est-10'] }),
      item({ id: 'b', parent_id: 'p', duration: minutes(20) }),
    ];
    expect(effectiveEstimate(parent, (id) => (id === 'p' ? children : []))).toEqual({ minutes: 30, computed: false });
  });

  it("uses a parent's own duration before children that are not all estimated", () => {
    const parent = item({ id: 'p', duration: minutes(50) });
    const children = [item({ id: 'a', parent_id: 'p', labels: ['est-10'] }), item({ id: 'b', parent_id: 'p' })];
    expect(effectiveEstimate(parent, (id) => (id === 'p' ? children : []))).toEqual({ minutes: 50, computed: false });
  });
});

describe('estimate storage (#151)', () => {
  it('defaults to tags, leaving a calendar duration independent', () => {
    expect(readEstimate(item({ labels: ['est-20'], duration: { amount: 60, unit: 'minute' } })))
      .toMatchObject({ minutes: 20, source: 'tag', mismatch: true });
  });
  it.each(['tag', 'duration'] as const)('reads either source as fallback in %s mode', (storage) => {
    setEstimateStorage(storage);
    expect(estimateOf(item({ labels: ['est-20'] }))).toBe(20);
    expect(estimateOf(item({ duration: { amount: 45, unit: 'minute' } }))).toBe(45);
  });
  it('tag writes and clearing never return a duration key, including a day-unit calendar block', () => {
    const task = item({ labels: ['work', 'est-10'], duration: { amount: 2, unit: 'day' } });
    expect(estimatePatch(task, 25, 'tag')).toEqual({ labels: ['work', 'est-25'] });
    expect(estimatePatch(task, null, 'tag')).toEqual({ labels: ['work'] });
    expect(task.duration).toEqual({ amount: 2, unit: 'day' });
  });
  it('duration writes remove legacy tags and clearing removes both', () => {
    const task = item({ labels: ['work', 'est-10', 'est-bad'] });
    expect(estimatePatch(task, 1500, 'duration')).toEqual({ labels: ['work'], duration: { amount: 1500, unit: 'minute' } });
    expect(estimatePatch(task, null, 'duration')).toEqual({ labels: ['work'], duration: null });
    expect(() => estimatePatch(task, -5, 'duration')).toThrow();
  });
  it('allows unknown plans and team members, but forbids explicitly free accounts', () => {
    expect(canStoreDurations(null)).toBe(true);
    expect(canStoreDurations({})).toBe(true);
    expect(canStoreDurations({ is_premium: true, premium_status: 'current_personal_plan' })).toBe(true);
    expect(canStoreDurations({ is_premium: false, premium_status: 'not_premium' })).toBe(false);
    expect(canStoreDurations({ is_premium: false, premium_status: 'teams_business_member' })).toBe(true);
    expect(canStoreDurations({ is_premium: false, premium_status: 'future_plan' })).toBe(true);
    expect(canStoreDurations({ is_premium: false })).toBe(false);
  });
});

describe('durations written in words', () => {
  it.each([['deux heures', 120], ['one hour', 60], ['one hour thirty minutes', 90], ['quinze minutes', 15], ['une heure', 60]])('reads %s', (text, minutes) => {
    expect(parseDurationInput(String(text))).toBe(minutes);
  });
});
