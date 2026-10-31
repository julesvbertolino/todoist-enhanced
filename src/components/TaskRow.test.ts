import { describe, expect, it } from 'vitest';
import { sameRow } from './TaskRow';
import { item } from '@/test/items';
import { makeChildrenOf } from '@/store/selectors';
import type { Item } from '@/domain/types';

/** A children lookup like the one a view builds anew after every change to the account. */
const lookup = (tasks: Item[]) => {
  const index = new Map<string, Item[]>();
  for (const task of tasks) if (task.parent_id) index.set(task.parent_id, [...(index.get(task.parent_id) ?? []), task]);
  return makeChildrenOf(index);
};
const onOpen = () => undefined;

describe('when a task row is left alone (#364)', () => {
  const parent = item({ id: 'parent' });
  const child = item({ id: 'child', parent_id: 'parent' });
  const grandchild = item({ id: 'grandchild', parent_id: 'child' });
  const other = item({ id: 'other' });

  it('keeps a row whose task and subtasks are the same, though the lookup is new', () => {
    const before = { item: parent, childrenOf: lookup([parent, child, grandchild, other]), onOpen };
    const after = { item: parent, childrenOf: lookup([parent, child, grandchild, other, item({ id: 'unrelated' })]), onOpen };
    expect(sameRow(before, after)).toBe(true);
  });

  it('redraws when its own task changes', () => {
    const before = { item: parent, childrenOf: lookup([parent]), onOpen };
    expect(sameRow(before, { ...before, item: { ...parent, content: 'Renamed' } })).toBe(false);
  });

  it('redraws when a subtask, or one under it, changes', () => {
    const before = { item: parent, childrenOf: lookup([parent, child, grandchild]), onOpen };
    const renamedChild = { ...child, content: 'Renamed' };
    const renamedGrandchild = { ...grandchild, content: 'Renamed' };
    expect(sameRow(before, { ...before, childrenOf: lookup([parent, renamedChild, grandchild]) })).toBe(false);
    expect(sameRow(before, { ...before, childrenOf: lookup([parent, child, renamedGrandchild]) })).toBe(false);
    expect(sameRow(before, { ...before, childrenOf: lookup([parent, child]) })).toBe(false);
  });

  it('redraws a subtask when its siblings change', () => {
    const sibling = item({ id: 'sibling', parent_id: 'parent' });
    const before = { item: child, childrenOf: lookup([parent, child, sibling]), onOpen };
    expect(sameRow(before, { ...before, childrenOf: lookup([parent, child]) })).toBe(false);
    expect(sameRow(before, { ...before, childrenOf: lookup([parent, child, sibling]) })).toBe(true);
  });

  it('redraws when it is handed something else', () => {
    const before = { item: parent, childrenOf: lookup([parent]), onOpen };
    expect(sameRow(before, { ...before, showProject: false })).toBe(false);
    expect(sameRow(before, { ...before, onOpen: () => undefined })).toBe(false);
  });
});
