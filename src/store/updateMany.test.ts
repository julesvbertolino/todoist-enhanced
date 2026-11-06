import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetIdbMemory } from '@/test/idbMemory';

vi.mock('@/db/idb', async () => (await import('@/test/idbMemory')).idbMemory());
vi.mock('@/api/commands', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/commands')>()),
  sendCommands: vi.fn(),
}));

import { sendCommands, type Command, type CommandResult } from '@/api/commands';
import { emptySnapshot } from '@/domain/types';
import { item } from '@/test/items';
import { useStore } from './store';

const sent = vi.mocked(sendCommands);

const ok = (commands: Command[]): CommandResult => ({
  responses: [], failures: [], mapping: {},
  delivered: commands.map((cmd) => cmd.uuid), undelivered: [],
});

/** A request that answers only when the test says so. */
function slowRequest() {
  let release: () => void = () => {};
  sent.mockImplementationOnce((_token, commands) => new Promise((resolve) => {
    release = () => resolve(ok(commands));
  }));
  return () => release();
}

const ids = Array.from({ length: 12 }, (_, i) => `t${i}`);

beforeEach(() => {
  vi.stubGlobal('navigator', { onLine: true });
  vi.clearAllMocks();
  resetIdbMemory();
  sent.mockImplementation(async (_token, commands) => ok(commands));
  const snapshot = emptySnapshot();
  for (const id of ids) {
    snapshot.items[id] = item({
      id,
      due: { date: '2026-10-01', is_recurring: false, string: 'Oct 1', lang: 'en', timezone: null },
      labels: ['week', 'home'],
    });
  }
  useStore.setState({ demo: false, snapshot, toasts: [], undoStack: [], pendingCount: 0, syncState: 'idle' });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const moveAll = () => useStore.getState().updateMany(
  ids,
  (task) => ({
    due: { ...task.due!, date: '2026-10-05', string: 'Oct 5' },
    labels: task.labels.filter((label) => label !== 'week'),
  }),
  '12 tasks moved to today',
);

describe('a change across a selection (#162)', () => {
  it('goes out as one request and is on screen, with its toast, before Todoist answers', async () => {
    const release = slowRequest();
    const pending = moveAll();
    // The request goes out once the change has its turn with Todoist (#468).
    await vi.waitFor(() => expect(sent).toHaveBeenCalledTimes(1));

    const state = useStore.getState();
    expect(ids.every((id) => state.snapshot.items[id].due?.date === '2026-10-05')).toBe(true);
    expect(ids.every((id) => state.snapshot.items[id].labels.join() === 'home')).toBe(true);
    expect(state.toasts.map((toast) => toast.message)).toEqual(['12 tasks moved to today']);

    release();
    await pending;
    expect(sent).toHaveBeenCalledTimes(1);
    expect(sent.mock.calls[0][1]).toHaveLength(12);
  });

  it('sends its undo only once the change it undoes has been sent', async () => {
    const release = slowRequest();
    const pending = moveAll();
    // The request goes out once the change has its turn with Todoist (#468).
    await vi.waitFor(() => expect(sent).toHaveBeenCalledTimes(1));

    const undo = useStore.getState().toasts[0].undo!;
    undo();
    await Promise.resolve();
    expect(sent).toHaveBeenCalledTimes(1);

    release();
    await pending;
    await vi.waitFor(() => expect(sent).toHaveBeenCalledTimes(2));
    const restored = useStore.getState().snapshot.items;
    expect(ids.every((id) => restored[id].due?.date === '2026-10-01')).toBe(true);
    expect(ids.every((id) => restored[id].labels.join() === 'week,home')).toBe(true);
    // The undo is one request too.
    expect(sent.mock.calls[1][1]).toHaveLength(12);
  });
});
