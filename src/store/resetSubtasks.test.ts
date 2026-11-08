import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetIdbMemory } from '@/test/idbMemory';

vi.mock('@/db/idb', async () => (await import('@/test/idbMemory')).idbMemory());
vi.mock('@/api/commands', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/commands')>()),
  sendCommands: vi.fn(),
}));
vi.mock('@/api/userSettings', () => ({ readResetSubtasks: vi.fn() }));

import { sendCommands } from '@/api/commands';
import { readResetSubtasks } from '@/api/userSettings';
import { emptySnapshot } from '@/domain/types';
import { item } from '@/test/items';
import { subtasksToReset } from './helpers';
import { useStore } from './store';

const sent = vi.mocked(sendCommands);
const setting = vi.mocked(readResetSubtasks);
const weekly = { date: '2026-11-08', string: 'every sunday', lang: 'en', is_recurring: true } as never;

beforeEach(() => {
  vi.stubGlobal('navigator', { onLine: true });
  vi.clearAllMocks();
  resetIdbMemory();
  sent.mockImplementation(async (_token, commands) => ({ responses: [], failures: [], mapping: {}, delivered: commands.map((c) => c.uuid), undelivered: [] }));
  const snapshot = emptySnapshot();
  snapshot.items.review = item({ id: 'review', content: 'Weekly review', due: weekly });
  snapshot.items.inbox = item({ id: 'inbox', parent_id: 'review', checked: true });
  snapshot.items.plan = item({ id: 'plan', parent_id: 'review', checked: false });
  snapshot.items.deep = item({ id: 'deep', parent_id: 'plan', checked: true });
  snapshot.items.other = item({ id: 'other', checked: true });
  useStore.setState({ refresh: vi.fn(async () => {}), demo: false, snapshot, toasts: [], undoStack: [], pendingCount: 0, syncState: 'idle' });
});
afterEach(() => vi.unstubAllGlobals());

const types = () => sent.mock.calls.flatMap(([, commands]) => commands.map((c) => `${c.type}:${String(c.args.id)}`));

describe('subtasksToReset', () => {
  it('finds ticked subtasks at any depth, and nothing outside the tree', () => {
    expect(subtasksToReset(['review'], useStore.getState().snapshot.items).sort()).toEqual(['deep', 'inbox']);
  });
});

describe('completing a recurring task with subtasks', () => {
  it('unticks its subtasks when "Reset sub-tasks" is on, as Todoist does', async () => {
    setting.mockResolvedValue(true);
    await useStore.getState().toggleTask('review');
    expect(types()).toEqual(['item_close:review', 'item_uncomplete:inbox', 'item_uncomplete:deep']);
    const items = useStore.getState().snapshot.items;
    expect(items.inbox.checked).toBe(false);
    expect(items.deep.checked).toBe(false);
    expect(items.other.checked).toBe(true);
  });

  it('leaves them ticked when the setting is off', async () => {
    setting.mockResolvedValue(false);
    await useStore.getState().toggleTask('review');
    expect(types()).toEqual(['item_close:review']);
    expect(useStore.getState().snapshot.items.inbox.checked).toBe(true);
  });

  it('resets them too when completed from a selection', async () => {
    setting.mockResolvedValue(true);
    await useStore.getState().completeTasks(['review']);
    expect(types()).toEqual(['item_close:review', 'item_uncomplete:inbox', 'item_uncomplete:deep']);
  });

  it('does not ask for the setting when there is nothing to reset', async () => {
    useStore.setState((s) => ({ snapshot: { ...s.snapshot, items: { review: s.snapshot.items.review } } }));
    await useStore.getState().toggleTask('review');
    expect(setting).not.toHaveBeenCalled();
  });
});
