import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/db/idb', () => ({
  saveSnapshot: vi.fn(async () => {}),
  reserveSnapshot: vi.fn(async () => ({ epoch: 'test', revision: 1 })),
  enqueue: vi.fn(async () => {}),
  dequeue: vi.fn(async () => {}),
}));

import * as idb from '@/db/idb';
import { flushPersist, schedulePersist } from './helpers';
import { emptySnapshot, type Snapshot } from '@/domain/types';
import { item } from '@/test/items';

const withTask = (content: string): Snapshot => {
  const snapshot = emptySnapshot();
  snapshot.items.task = item({ id: 'task', content });
  return snapshot;
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(idb.saveSnapshot).mockClear();
  flushPersist();
  vi.mocked(idb.saveSnapshot).mockClear();
});
afterEach(() => vi.useRealTimers());

describe('the copy kept on the device (#132)', () => {
  it('is written once, at the end of the wait, with the last change', () => {
    schedulePersist(withTask('first'));
    schedulePersist(withTask('second'));
    expect(idb.saveSnapshot).not.toHaveBeenCalled();

    vi.advanceTimersByTime(400);
    expect(idb.saveSnapshot).toHaveBeenCalledTimes(1);
    expect(vi.mocked(idb.saveSnapshot).mock.calls[0][0].items.task.content).toBe('second');
  });

  it('is written at once when the page is being left, and not a second time by the timer', () => {
    schedulePersist(withTask('first'));
    schedulePersist(withTask('second'));
    flushPersist();

    expect(idb.saveSnapshot).toHaveBeenCalledTimes(1);
    expect(vi.mocked(idb.saveSnapshot).mock.calls[0][0].items.task.content).toBe('second');

    vi.advanceTimersByTime(1000);
    expect(idb.saveSnapshot).toHaveBeenCalledTimes(1);
  });

  it('writes nothing when nothing is waiting', () => {
    flushPersist();
    schedulePersist(withTask('only'));
    vi.advanceTimersByTime(400);
    flushPersist();
    expect(idb.saveSnapshot).toHaveBeenCalledTimes(1);
  });
});

describe('the demo never reaches the device (#132)', () => {
  it('deleting a task in the demo writes no copy', async () => {
    const { useStore } = await import('./store');
    const snapshot = withTask('A demo task');
    useStore.setState({ demo: true, snapshot });
    await useStore.getState().removeTasks(['task']);

    vi.advanceTimersByTime(1000);
    flushPersist();
    expect(idb.saveSnapshot).not.toHaveBeenCalled();
    expect(idb.enqueue).not.toHaveBeenCalled();
  });
});
