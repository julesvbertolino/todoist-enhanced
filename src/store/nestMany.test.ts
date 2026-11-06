import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetIdbMemory } from '@/test/idbMemory';

vi.mock('@/db/idb', async () => (await import('@/test/idbMemory')).idbMemory());
vi.mock('@/api/commands', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/commands')>()),
  sendCommands: vi.fn(),
}));

import { sendCommands, type Command, type CommandResult } from '@/api/commands';
import { emptySnapshot } from '@/domain/types';
import { due, item } from '@/test/items';
import { useStore } from './store';

const sent = vi.mocked(sendCommands);

const parentsOf = () => {
  const { items } = useStore.getState().snapshot;
  return Object.fromEntries(Object.values(items).map((task) => [task.id, task.parent_id]));
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('navigator', { onLine: true });
  vi.clearAllMocks();
  resetIdbMemory();
  const snapshot = emptySnapshot();
  const add = (task: ReturnType<typeof item>) => { snapshot.items[task.id] = task; };
  add(item({ id: 'A', content: 'A', child_order: 1, project_id: 'p1', labels: ['home'], priority: 4,
    due: due('2026-10-08', { string: 'every day', is_recurring: true }), description: 'keep me' }));
  add(item({ id: 'B', content: 'B', child_order: 2, project_id: 'p1' }));
  add(item({ id: 'C', content: 'C', child_order: 3, project_id: 'p1' }));
  add(item({ id: 'P', content: 'Parent', child_order: 4, project_id: 'p2', section_id: 's2' }));
  add(item({ id: 'Old', content: 'Old', parent_id: 'P', child_order: 1, project_id: 'p2', section_id: 's2' }));
  add(item({ id: 'A1', content: 'A1', parent_id: 'A', child_order: 1, project_id: 'p1' }));
  useStore.setState({
    demo: false, snapshot, toasts: [], undoStack: [], pendingCount: 0, syncState: 'idle',
    prefs: { ...useStore.getState().prefs, locale: 'en' },
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const accepted = (commands: Command[]): CommandResult => ({
  responses: [], failures: [], mapping: {}, delivered: commands.map((cmd) => cmd.uuid), undelivered: [],
});

describe('dropping a selection inside a task (#166)', () => {
  it('sends one move per picked task in order, then the numbering, as one batch', async () => {
    sent.mockImplementation(async (_token, commands) => accepted(commands));

    const done = await useStore.getState().nestMany(['A', 'B', 'C'], 'P');

    expect(done).toBe(true);
    expect(sent).toHaveBeenCalledTimes(1);
    const commands = sent.mock.calls[0][1];
    expect(commands.map((cmd) => cmd.type)).toEqual(['item_move', 'item_move', 'item_move', 'item_reorder']);
    expect(commands.slice(0, 3).map((cmd) => cmd.args)).toEqual([
      { id: 'A', parent_id: 'P' }, { id: 'B', parent_id: 'P' }, { id: 'C', parent_id: 'P' },
    ]);
    expect(commands[3].args).toEqual({
      items: [
        { id: 'Old', child_order: 1 }, { id: 'A', child_order: 2 },
        { id: 'B', child_order: 3 }, { id: 'C', child_order: 4 },
      ],
    });
  });

  it('shows them all under the target at once, in order, with the target’s place', async () => {
    sent.mockImplementation(async (_token, commands) => accepted(commands));
    await useStore.getState().nestMany(['A', 'B', 'C'], 'P');

    const { items } = useStore.getState().snapshot;
    expect(parentsOf()).toMatchObject({ A: 'P', B: 'P', C: 'P', Old: 'P' });
    const order = ['Old', 'A', 'B', 'C'].map((id) => items[id].child_order);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    // Placed where the target lives; their own subtasks follow.
    expect(items.A.project_id).toBe('p2');
    expect(items.A.section_id).toBe('s2');
    expect(items.A1.project_id).toBe('p2');
    expect(items.A1.parent_id).toBe('A');
  });

  it('changes nothing else about a moved task', async () => {
    sent.mockImplementation(async (_token, commands) => accepted(commands));
    const before = useStore.getState().snapshot.items.A;
    await useStore.getState().nestMany(['A', 'B'], 'P');
    const after = useStore.getState().snapshot.items.A;
    expect(after).toMatchObject({
      labels: before.labels, priority: before.priority, due: before.due, description: before.description,
    });
  });

  it('refuses a bad selection before writing anything', async () => {
    expect(await useStore.getState().nestMany(['A', 'P'], 'P')).toBe(false);
    expect(await useStore.getState().nestMany(['A', 'B'], 'A1')).toBe(false);
    expect(sent).not.toHaveBeenCalled();
    expect(parentsOf()).toMatchObject({ A: null, B: null, C: null });
    // Dropped inside itself is explained; a plain no-op is not.
    expect(useStore.getState().toasts.map((entry) => entry.tone)).toEqual(['error']);
  });

  it('moves a picked parent once and leaves its picked child under it', async () => {
    sent.mockImplementation(async (_token, commands) => accepted(commands));
    await useStore.getState().nestMany(['A', 'A1', 'B'], 'P');
    const ids = sent.mock.calls[0][1].filter((cmd) => cmd.type === 'item_move').map((cmd) => cmd.args.id);
    expect(ids).toEqual(['A', 'B']);
    expect(parentsOf()).toMatchObject({ A: 'P', A1: 'A', B: 'P' });
  });

  it('gives all of it back when Todoist refuses one move, and says so', async () => {
    sent.mockImplementationOnce(async (_token, commands) => ({
      ...accepted(commands),
      failures: [{ uuid: commands[1].uuid, error: 'Invalid argument' }],
    }));
    sent.mockImplementation(async (_token, commands) => accepted(commands));

    const done = await useStore.getState().nestMany(['A', 'B', 'C'], 'P');

    expect(done).toBe(false);
    expect(parentsOf()).toMatchObject({ A: null, B: null, C: null, Old: 'P' });
    // The accepted moves were taken back with a second batch of moves.
    const second = sent.mock.calls[1][1].filter((cmd) => cmd.type === 'item_move');
    expect(second.map((cmd) => cmd.args.id).sort()).toEqual(['A', 'C']);
    const tones = useStore.getState().toasts.map((entry) => entry.tone);
    expect(tones.every((tone) => tone === 'error')).toBe(true);
    expect(tones.length).toBeGreaterThan(0);
  });

  it('one undo puts every task back where it was', async () => {
    sent.mockImplementation(async (_token, commands) => accepted(commands));
    await useStore.getState().nestMany(['A', 'B'], 'P');
    const undo = useStore.getState().toasts.at(-1)?.undo;
    expect(undo).toBeTypeOf('function');
    undo?.();
    await vi.advanceTimersByTimeAsync(0);
    expect(parentsOf()).toMatchObject({ A: null, B: null, A1: 'A', Old: 'P' });
    const items = useStore.getState().snapshot.items;
    expect(items.A.project_id).toBe('p1');
    expect(items.A.section_id).toBeNull();
  });
});
