import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { arrangeDrop, descendantsOf, dropMutation, moveArgs, placementFor, placementForPage, planNestMany } from './dnd';
import { weekLabel } from './types';
import { due, item } from '@/test/items';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-24T09:00:00'));
});
afterEach(() => vi.useRealTimers());

describe('moveArgs', () => {
  /* Regression #64/#65: Todoist's item_move takes exactly one destination,
     and sending both moved nothing. */
  it('sends only the section when there is one', () => {
    expect(moveArgs({ project_id: 'p', section_id: 's' })).toEqual({ section_id: 's' });
  });

  it('sends only the project otherwise', () => {
    expect(moveArgs({ project_id: 'p', section_id: null })).toEqual({ project_id: 'p' });
    expect(moveArgs({ project_id: 'p' })).toEqual({ project_id: 'p' });
  });
});

describe('placementFor', () => {
  it('dates Today and Quick for today, and tags Quick', () => {
    expect(placementFor({ kind: 'today' })).toEqual({ date: '2026-09-24' });
    expect(placementFor({ kind: 'quick' })).toEqual({ date: '2026-09-24', labels: ['quick'] });
  });

  it('labels Anytime this week, and carries nothing into Someday', () => {
    expect(placementFor({ kind: 'anytime' })).toEqual({ labels: [weekLabel()] });
    expect(placementFor({ kind: 'someday' })).toEqual({});
  });

  it('places into a project, and a section inside it', () => {
    expect(placementFor({ kind: 'section', projectId: 'p', sectionId: 's' }))
      .toEqual({ projectId: 'p', sectionId: 's' });
    expect(placementFor({ kind: 'section', projectId: 'p', sectionId: null }))
      .toEqual({ projectId: 'p' });
  });
});

describe('dropMutation', () => {
  it('dates a task for today and drops the week label', () => {
    const task = item({ labels: [weekLabel(), 'home'] });
    expect(dropMutation(task, { kind: 'today' })?.update).toMatchObject({
      due: { date: '2026-09-24', is_recurring: false },
      labels: ['home'],
    });
  });

  it('keeps the rule of a repeating task dropped on another day', () => {
    const task = item({ due: due('2026-09-21', { string: 'every monday', is_recurring: true }) });
    const update = dropMutation(task, { kind: 'day', date: new Date('2026-09-30T00:00:00') })?.update;
    expect(update?.due).toEqual({
      date: '2026-09-30', timezone: null, string: 'every monday', lang: 'en', is_recurring: true,
    });
  });

  it('keeps the time of day when moving to another day', () => {
    const task = item({ due: due('2026-09-24T09:30:00') });
    const update = dropMutation(task, { kind: 'day', date: new Date('2026-09-25T00:00:00') })?.update;
    expect((update?.due as { date: string }).date).toBe('2026-09-25T09:30:00');
  });

  it('takes the date off and tags the week for Anytime', () => {
    const task = item({ due: due('2026-09-24') });
    expect(dropMutation(task, { kind: 'anytime' })).toEqual({
      update: { due: null, labels: [weekLabel()] },
    });
  });

  it('does nothing for a task dropped where it already is', () => {
    const task = item({ project_id: 'p', section_id: 's' });
    expect(dropMutation(task, { kind: 'project', projectId: 'p' })).toBeNull();
    expect(dropMutation({ ...task, section_id: null }, { kind: 'project', projectId: 'p' }))
      .toBeNull();
    expect(dropMutation(task, { kind: 'section', projectId: 'p', sectionId: 's' })).toBeNull();
  });

  it('moves a task with no section to another project, whether it is picked as a project or as a section target (#205)', () => {
    const task = item({ project_id: 'p', section_id: null });
    expect(dropMutation(task, { kind: 'section', projectId: 'q', sectionId: null }))
      .toEqual({ move: { project_id: 'q', section_id: null } });
    expect(dropMutation(task, { kind: 'section', projectId: 'p', sectionId: null })).toBeNull();
    expect(dropMutation(task, { kind: 'project', projectId: 'q' }))
      .toEqual({ move: { project_id: 'q' } });
  });

  it('moves a task out of its section to the project it lives in', () => {
    const task = item({ project_id: 'p', section_id: 's' });
    expect(dropMutation(task, { kind: 'section', projectId: 'p', sectionId: null }))
      .toEqual({ move: { project_id: 'p', section_id: null } });
  });

  it('lifts a subtask out when dropped on its own project', () => {
    const task = item({ project_id: 'p', parent_id: 'parent' });
    expect(dropMutation(task, { kind: 'project', projectId: 'p' }))
      .toEqual({ move: { project_id: 'p' } });
  });

  it('adds a label without replacing the others, and only once', () => {
    const task = item({ labels: ['home'] });
    expect(dropMutation(task, { kind: 'label', label: 'errand' }))
      .toEqual({ update: { labels: ['home', 'errand'] } });
    expect(dropMutation(task, { kind: 'label', label: 'Home' })).toBeNull();
  });

  it('never makes a task a favourite', () => {
    expect(dropMutation(item(), { kind: 'favourites' })).toBeNull();
  });
});

describe('a day with a time typed in a date picker (#143)', () => {
  const day = new Date('2026-09-30T00:00:00');

  it('gives every task the time that was typed, replacing the one it had', () => {
    const timed = item({ due: due('2026-09-25T09:00:00') });
    const plain = item({ due: null });
    expect(dropMutation(timed, { kind: 'day', date: day, time: '14:30:00' })?.update)
      .toMatchObject({ due: { date: '2026-09-30T14:30:00' } });
    expect(dropMutation(plain, { kind: 'day', date: day, time: '14:30:00' })?.update)
      .toMatchObject({ due: { date: '2026-09-30T14:30:00' } });
  });

  it('keeps the time a task already has when no time was typed', () => {
    const timed = item({ due: due('2026-09-25T09:00:00') });
    expect(dropMutation(timed, { kind: 'day', date: day })?.update)
      .toMatchObject({ due: { date: '2026-09-30T09:00:00' } });
  });

  it('moves one occurrence of a repeating task and keeps its rule', () => {
    const repeating = item({
      due: due('2026-09-25T09:00:00', { is_recurring: true, string: 'every day at 9' }),
    });
    expect(dropMutation(repeating, { kind: 'day', date: day, time: '14:30:00' })?.update)
      .toMatchObject({
        due: { date: '2026-09-30T14:30:00', is_recurring: true, string: 'every day at 9' },
      });
  });
});

describe('planNestMany (#166)', () => {
  const tree = () => {
    const make = (id: string, over: Partial<ReturnType<typeof item>> = {}) => [id, item({ id, content: id, ...over })] as const;
    return Object.fromEntries([
      make('A', { child_order: 1 }), make('B', { child_order: 2 }), make('C', { child_order: 3 }),
      make('Parent', { child_order: 4 }),
      make('A1', { parent_id: 'A', child_order: 1 }),
      make('A1a', { parent_id: 'A1', child_order: 1 }),
      make('Old', { parent_id: 'Parent', child_order: 1 }),
    ]);
  };

  it('keeps the order it was given', () => {
    expect(planNestMany(tree(), ['A', 'B', 'C'], 'Parent')).toEqual({ ok: true, ids: ['A', 'B', 'C'] });
    expect(planNestMany(tree(), ['C', 'A'], 'Parent')).toEqual({ ok: true, ids: ['C', 'A'] });
  });

  it('is the single-task answer for one task', () => {
    expect(planNestMany(tree(), ['B'], 'Parent')).toEqual({ ok: true, ids: ['B'] });
  });

  it('refuses a target that is one of the picked tasks', () => {
    expect(planNestMany(tree(), ['A', 'Parent'], 'Parent')).toEqual({ ok: false, reason: 'target-picked' });
  });

  it('refuses a drop inside itself or any task below it', () => {
    expect(planNestMany(tree(), ['A', 'B'], 'A1')).toEqual({ ok: false, reason: 'inside-itself' });
    expect(planNestMany(tree(), ['A', 'B'], 'A1a')).toEqual({ ok: false, reason: 'inside-itself' });
  });

  it('moves only the highest of a picked parent and its child', () => {
    expect(planNestMany(tree(), ['A', 'A1', 'B'], 'Parent')).toEqual({ ok: true, ids: ['A', 'B'] });
    expect(planNestMany(tree(), ['A1a', 'A', 'A1'], 'Parent')).toEqual({ ok: true, ids: ['A'] });
  });

  it('leaves out a task already directly under the target, and has nothing to do when all are', () => {
    expect(planNestMany(tree(), ['Old', 'B'], 'Parent')).toEqual({ ok: true, ids: ['B'] });
    expect(planNestMany(tree(), ['Old'], 'Parent')).toEqual({ ok: false, reason: 'nothing' });
  });

  it('refuses the whole drop when one task would go past the depth Todoist keeps', () => {
    const deep = tree();
    deep.D1 = item({ id: 'D1', parent_id: 'Parent', child_order: 2 });
    deep.D2 = item({ id: 'D2', parent_id: 'D1' });
    deep.D3 = item({ id: 'D3', parent_id: 'D2' });
    // D3 sits at depth 3 under Parent, so A, whose own subtasks are two deep, cannot follow it.
    expect(planNestMany(deep, ['B', 'A'], 'D3')).toEqual({ ok: false, reason: 'too-deep' });
  });

  it('ignores ids that no longer exist', () => {
    expect(planNestMany(tree(), ['gone', 'B'], 'Parent')).toEqual({ ok: true, ids: ['B'] });
  });
});

describe('descendantsOf', () => {
  it('lists every level below a task', () => {
    const items = {
      a: item({ id: 'a' }), b: item({ id: 'b', parent_id: 'a' }), c: item({ id: 'c', parent_id: 'b' }),
      d: item({ id: 'd' }),
    };
    expect(descendantsOf(items, 'a').sort()).toEqual(['b', 'c']);
    expect(descendantsOf(items, 'd')).toEqual([]);
  });
});

describe('arrangeDrop (#165)', () => {
  const order = (shown: string[], item: string, row: string, siblings = ['a', 'b', 'c', 'd']) =>
    arrangeDrop(siblings, shown, item, row)?.next;

  it('takes the place of the row it is dropped on, going down or up', () => {
    const all = ['a', 'b', 'c', 'd'];
    expect(order(all, 'a', 'd')).toEqual(['b', 'c', 'd', 'a']);
    expect(order(all, 'd', 'a')).toEqual(['d', 'a', 'b', 'c']);
    expect(order(all, 'b', 'c')).toEqual(['a', 'c', 'b', 'd']);
    expect(order(all, 'c', 'b')).toEqual(['a', 'c', 'b', 'd']);
  });

  it('leaves the order alone when a task is dropped where it already is', () => {
    const result = arrangeDrop(['a', 'b', 'c'], ['a', 'b', 'c'], 'b', 'b');
    expect(result?.next).toEqual(result?.arranged);
  });

  it('keeps the places of the siblings a filter hides', () => {
    // b is hidden before c: moving a below c leaves b just where it was.
    expect(order(['a', 'c', 'd'], 'a', 'c')).toEqual(['b', 'c', 'a', 'd']);
    // Moving d above c puts it right there and b still does not move.
    expect(order(['a', 'c', 'd'], 'd', 'c')).toEqual(['a', 'b', 'd', 'c']);
  });

  it('puts a task that is not a sibling before the row, or after it when asked', () => {
    expect(arrangeDrop(['a', 'b'], ['a', 'b'], 'x', 'b')?.next).toEqual(['a', 'x', 'b']);
    expect(arrangeDrop(['a', 'b'], ['a', 'b'], 'x', 'b', true)?.next).toEqual(['a', 'b', 'x']);
  });

  it('answers nothing for a row outside the siblings', () => {
    expect(arrangeDrop(['a', 'b'], ['a', 'b'], 'a', 'zzz')).toBeNull();
  });
});

describe('placementForPage: what Q opens the composer with', () => {
  const now = new Date(2026, 9, 12, 10, 0);
  it('carries the page: its project, the Inbox, Today, its tag', () => {
    expect(placementForPage({ view: 'project', id: 'p1' }, 'inbox', now)).toEqual({ projectId: 'p1' });
    expect(placementForPage({ view: 'inbox' }, 'inbox', now)).toEqual({ projectId: 'inbox' });
    expect(placementForPage({ view: 'today' }, 'inbox', now)).toEqual({ date: '2026-10-12' });
    expect(placementForPage({ view: 'label', id: 'waiting' }, 'inbox', now)).toEqual({ labels: ['waiting'] });
    expect(placementForPage({ view: 'week' }, 'inbox', now)).toEqual({ labels: [weekLabel()] });
  });
  it('fixes nothing from a page that fixes nothing', () => {
    expect(placementForPage({ view: 'upcoming' }, 'inbox', now)).toEqual({});
    expect(placementForPage({ view: 'filter', id: 'f1' }, 'inbox', now)).toEqual({});
  });
});

describe('the Later drop', () => {
  it('tags a task later, clears its date, and swaps out the week tag', () => {
    const task = item({ labels: [weekLabel(), 'home'], due: due('2026-09-30') });
    expect(dropMutation(task, { kind: 'later' })?.update).toEqual({ due: null, labels: ['home', 'later'] });
  });

  it('takes the later tag off when a task gets a day or goes to Someday', () => {
    const task = item({ labels: ['later', 'home'] });
    expect(dropMutation(task, { kind: 'today' })?.update).toMatchObject({ labels: ['home'] });
    expect(dropMutation(task, { kind: 'someday' })?.update).toEqual({ due: null, labels: ['home'] });
  });

  it('swaps the later tag for the week tag', () => {
    const task = item({ labels: ['later'] });
    expect(dropMutation(task, { kind: 'anytime' })?.update).toEqual({ due: null, labels: [weekLabel()] });
  });

  it('opens the composer with the tag', () => {
    expect(placementFor({ kind: 'later' })).toEqual({ labels: ['later'] });
  });
});
