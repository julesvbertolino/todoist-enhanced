import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/db/idb', () => ({
  saveSnapshot: vi.fn(async () => {}),
  enqueue: vi.fn(async () => {}),
  dequeue: vi.fn(async () => {}),
  updateQueued: vi.fn(async () => {}),
  readQueue: vi.fn(async () => []),
}));
vi.mock('@/api/commands', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/commands')>()),
  sendCommands: vi.fn(),
}));

import * as idb from '@/db/idb';
import { command, sendCommands, updateItem, type CommandResult } from '@/api/commands';
import { emptySnapshot } from '@/domain/types';
import { item } from '@/test/items';
import { useStore } from './store';

const sent = vi.mocked(sendCommands);

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('navigator', { onLine: true });
  vi.clearAllMocks();
  const snapshot = emptySnapshot();
  snapshot.items.a = item({ id: 'a', content: 'Before' });
  snapshot.items.b = item({ id: 'b', content: 'Before too' });
  useStore.setState({ demo: false, snapshot, toasts: [], undoStack: [], pendingCount: 0, syncState: 'idle' });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/** What the screen is told: the two edits, shown at once. */
const edits = () => [
  updateItem('a', { content: 'After' }),
  updateItem('b', { content: 'After too' }),
];
const show = (snapshot: ReturnType<typeof emptySnapshot>) => ({
  ...snapshot,
  items: {
    ...snapshot.items,
    a: { ...snapshot.items.a, content: 'After' },
    b: { ...snapshot.items.b, content: 'After too' },
  },
});

describe('a change Todoist refuses (#134)', () => {
  it('rolls back a refused recurring close and explains the repeat rule', async () => {
    const close = command('item_close', { id: 'a' });
    sent.mockResolvedValue({ responses: [], failures: [{ uuid: close.uuid, error: 'Date is invalid', errorTag: 'INVALID_DATE', commandType: 'item_close' }], mapping: {}, delivered: [close.uuid], undelivered: [] });
    await useStore.getState().apply([close], (snapshot) => ({
      ...snapshot, items: { ...snapshot.items, a: { ...snapshot.items.a, checked: true } },
    }));
    expect(useStore.getState().snapshot.items.a.checked).toBe(false);
    expect(idb.dequeue).toHaveBeenCalledWith([close.uuid]);
    expect(useStore.getState().toasts[0].message).toMatch(/repeat rule|règle de répétition/);
  });
  it('is taken back on screen, taken off the queue and reported once', async () => {
    const commands = edits();
    const result: CommandResult = {
      responses: [],
      failures: commands.map((cmd) => ({ uuid: cmd.uuid, error: 'Invalid argument' })),
      mapping: {},
      delivered: commands.map((cmd) => cmd.uuid),
      undelivered: [],
    };
    sent.mockResolvedValue(result);

    await useStore.getState().apply(commands, show);

    const { items } = useStore.getState().snapshot;
    expect(items.a.content).toBe('Before');
    expect(items.b.content).toBe('Before too');
    expect(idb.dequeue).toHaveBeenCalledWith(commands.map((cmd) => cmd.uuid));
    expect(useStore.getState().toasts).toHaveLength(1);
    // A refusal is an error: a screen reader reads it out at once (#136).
    expect(useStore.getState().toasts[0].tone).toBe('error');
    expect(useStore.getState().pendingCount).toBe(0);
  });

  it('keeps what Todoist accepted, and takes back only what it refused', async () => {
    const [first, second] = edits();
    sent.mockResolvedValue({
      responses: [],
      failures: [{ uuid: second.uuid, error: 'Invalid argument' }],
      mapping: {},
      delivered: [first.uuid, second.uuid],
      undelivered: [],
    });

    await useStore.getState().apply([first, second], show);

    const { items } = useStore.getState().snapshot;
    expect(items.a.content).toBe('After');
    expect(items.b.content).toBe('Before too');
    expect(useStore.getState().toasts).toHaveLength(1);
  });

  it('leaves the change queued, and the screen as it is, when the network is lost', async () => {
    const commands = edits();
    sent.mockRejectedValue(new TypeError('Failed to fetch'));

    await useStore.getState().apply(commands, show);

    expect(useStore.getState().snapshot.items.a.content).toBe('After');
    expect(idb.dequeue).not.toHaveBeenCalled();
    expect(useStore.getState().syncState).toBe('offline');
    expect(useStore.getState().toasts).toHaveLength(0);
  });
});

describe('toasts (#136)', () => {
  it('are polite unless they say they are an error', () => {
    useStore.getState().toast('Moved to Tomorrow');
    useStore.getState().toast('Todoist refused this', undefined, { tone: 'error' });
    const [plain, refused] = useStore.getState().toasts;
    expect(plain.tone).toBeUndefined();
    expect(refused.tone).toBe('error');
  });

  it('stay 3 s when plain, 8 s with an Undo, 6 s as an error (#140)', () => {
    const { toast } = useStore.getState();
    toast('Moved to Tomorrow');
    toast('Task deleted', () => {});
    toast('Todoist refused this', undefined, { tone: 'error' });
    const messages = () => useStore.getState().toasts.map((entry) => entry.message);

    vi.advanceTimersByTime(2_999);
    expect(messages()).toHaveLength(3);
    vi.advanceTimersByTime(1);
    expect(messages()).toEqual(['Task deleted', 'Todoist refused this']);
    vi.advanceTimersByTime(3_000);
    expect(messages()).toEqual(['Task deleted']);
    vi.advanceTimersByTime(2_000);
    expect(messages()).toEqual([]);
  });

  it('putting one away by hand leaves its undo reachable, and dismissing twice is harmless (#140)', () => {
    const undone = vi.fn();
    useStore.getState().toast('Task deleted', undone);
    const [shown] = useStore.getState().toasts;

    useStore.getState().dismissToast(shown.id);
    useStore.getState().dismissToast(shown.id);
    expect(useStore.getState().toasts).toEqual([]);
    expect(useStore.getState().undoStack.map((entry) => entry.label)).toEqual(['Task deleted']);

    vi.advanceTimersByTime(10_000);
    expect(useStore.getState().toasts).toEqual([]);
  });
});
