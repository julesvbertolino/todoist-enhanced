import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetIdbMemory } from '@/test/idbMemory';

vi.mock('@/db/idb', async () => (await import('@/test/idbMemory')).idbMemory());
vi.mock('@/api/commands', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/commands')>()),
  sendCommands: vi.fn(),
}));

import { sendCommands, type Command, type CommandResult } from '@/api/commands';
import { emptySnapshot } from '@/domain/types';
import { item, due } from '@/test/items';
import { defaultPreferences } from './prefs';
import { useStore } from './store';

const sent = vi.mocked(sendCommands);
const ok = (commands: Command[]): CommandResult => ({
  responses: [], failures: [], mapping: {},
  delivered: commands.map((cmd) => cmd.uuid), undelivered: [],
});

beforeEach(() => {
  vi.stubGlobal('navigator', { onLine: true });
  vi.clearAllMocks();
  resetIdbMemory();
  sent.mockImplementation(async (_token, commands) => ok(commands));
  useStore.setState({ prefs: defaultPreferences('en'), connected: false, demo: false, snapshot: emptySnapshot(), toasts: [], undoStack: [], pendingCount: 0, syncState: 'idle' });
});
afterEach(() => vi.unstubAllGlobals());

const lines = ['Buy milk', 'Call the garage', 'Book a dentist appointment'];
const list = lines.map((content) => ({ content, project_id: 'inbox', priority: 1, labels: [] }));

describe('several tasks at once (#152)', () => {
  it('are independent tasks, in the order given, sent in one request', async () => {
    await useStore.getState().createTasks(list);

    expect(sent).toHaveBeenCalledTimes(1);
    const commands = sent.mock.calls[0][1];
    expect(commands.map((cmd) => cmd.type)).toEqual(['item_add', 'item_add', 'item_add']);
    expect(commands.map((cmd) => cmd.args.content)).toEqual(lines);
    // No parent: they are not subtasks of one another or of a new task.
    expect(commands.every((cmd) => cmd.args.parent_id === undefined)).toBe(true);
  });

  it('are all on screen at once, one row each, ordered as pasted', async () => {
    await useStore.getState().createTasks(list);
    const items = Object.values(useStore.getState().snapshot.items)
      .sort((a, b) => a.child_order - b.child_order);
    expect(items.map((task) => task.content)).toEqual(lines);
    expect(items.every((task) => task.parent_id === null)).toBe(true);
  });

  it('sends nothing for an empty list', async () => {
    await useStore.getState().createTasks([]);
    expect(sent).not.toHaveBeenCalled();
  });
});

describe('estimate writes use the selected storage', () => {
  it('queues native estimates for a parent and its subtasks with read-back metadata', async () => {
    vi.stubGlobal('navigator', { onLine: false });
    useStore.setState({ prefs: { ...defaultPreferences('en'), estimateStorage: 'duration' } });
    await useStore.getState().createTask({ content: 'Parent', project_id: 'inbox', estimateMinutes: 25, subtasks: [{ content: 'Child', estimateMinutes: 10 }] });
    const tasks = Object.values(useStore.getState().snapshot.items);
    expect(tasks.map((task) => task.duration?.amount)).toEqual([25, 10]);
    expect(tasks.every((task) => !task.labels.some((l) => l.startsWith('est-')))).toBe(true);
    expect(sent).not.toHaveBeenCalled();
  });
  it('uses tags and preserves the calendar block on edit and clear', async () => {
    const snapshot = emptySnapshot();
    snapshot.items.a = item({ id: 'a', labels: ['work', 'est-25'], due: due('2026-10-06T10:00:00'), duration: { amount: 60, unit: 'minute' } });
    useStore.setState({ snapshot });
    await useStore.getState().updateTask('a', { estimateMinutes: 90 });
    expect(sent.mock.calls[0][1][0].args).toEqual({ id: 'a', labels: ['work', 'est-90'] });
    await useStore.getState().setEstimates([{ id: 'a', minutes: null }]);
    expect(useStore.getState().snapshot.items.a.duration?.amount).toBe(60);
    expect(useStore.getState().snapshot.items.a.labels).toEqual(['work']);
  });
  it('blocks duration writes for a free account, including stored preferences from another device', async () => {
    const snapshot = emptySnapshot();
    snapshot.user = { id: 'free', is_premium: false } as NonNullable<typeof snapshot.user>;
    useStore.setState({ snapshot, prefs: { ...defaultPreferences('en'), estimateStorage: 'duration' } });
    expect(useStore.getState().prefs.estimateStorage).toBe('tag');
    await useStore.getState().createTask({ content: 'Free', estimateMinutes: 25 });
    expect(sent.mock.calls[0][1][0].args).toMatchObject({ labels: ['est-25'] });
    expect(sent.mock.calls[0][1][0].args).not.toHaveProperty('duration');
  });
});

describe('assignment creation and refusal (#203)', () => {
  function shared() {
    const snapshot = emptySnapshot();
    snapshot.user = { id: 'me', full_name: 'Me', inbox_project_id: 'inbox' } as NonNullable<typeof snapshot.user>;
    snapshot.collaborators.a = { id: 'a', full_name: 'Alice', email: '', image_id: null };
    snapshot.collaboratorStates = [{ project_id: 'p', user_id: 'a', state: 'active' }];
    useStore.setState({ snapshot });
    return snapshot;
  }
  it('writes the chosen person and real section; subtasks do not inherit an unsent assignee', async () => {
    shared();
    const saved = await useStore.getState().createTask({ content: 'Assigned', project_id: 'p', section_id: 's', responsible_uid: 'a', subtasks: ['Child'] });
    expect(saved).toBe(true);
    const commands = sent.mock.calls[0][1];
    expect(commands[0].args).toMatchObject({ project_id: 'p', section_id: 's', responsible_uid: 'a' });
    const tasks = Object.values(useStore.getState().snapshot.items);
    expect(tasks.find((task) => task.content === 'Assigned')?.responsible_uid).toBe('a');
    expect(tasks.find((task) => task.content === 'Child')?.responsible_uid).toBeNull();
    expect(commands[1].args).not.toHaveProperty('responsible_uid');
  });
  it('rejects a cross-project/ineligible assignee before sending anything', async () => {
    shared();
    const saved = await useStore.getState().createTask({ content: 'Invalid', project_id: 'other', responsible_uid: 'a' });
    expect(saved).toBe(false);
    expect(sent).not.toHaveBeenCalled();
    expect(Object.values(useStore.getState().snapshot.items)).toHaveLength(0);
  });
  it('reports false when the server refuses the creation, so the composer can retain its draft', async () => {
    shared();
    sent.mockImplementation(async (_token, commands) => ({ ...ok(commands), failures: commands.map((cmd) => ({ uuid: cmd.uuid, error: 'Forbidden' })) }));
    const saved = await useStore.getState().createTask({ content: 'Refused', project_id: 'p', responsible_uid: 'a' });
    expect(saved).toBe(false);
    expect(Object.values(useStore.getState().snapshot.items)).toHaveLength(0);
    expect(useStore.getState().toasts.length).toBeGreaterThan(0);
  });
  it('retains a single queued creation offline without resubmitting it', async () => {
    shared(); vi.stubGlobal('navigator', { onLine: false });
    expect(await useStore.getState().createTask({ content: 'Queued', project_id: 'p', responsible_uid: 'a' })).toBe(true);
    expect(sent).not.toHaveBeenCalled();
    expect(Object.values(useStore.getState().snapshot.items)).toHaveLength(1);
    expect(useStore.getState().pendingCount).toBe(1);
  });
  it('rolls back a refused reassignment and keeps the original responsible person', async () => {
    const snapshot = shared(); snapshot.items.task = item({ id: 'task', project_id: 'p', responsible_uid: 'me' });
    useStore.setState({ snapshot });
    sent.mockImplementation(async (_token, commands) => ({ ...ok(commands), failures: commands.map((cmd) => ({ uuid: cmd.uuid, error: 'Forbidden' })) }));
    await useStore.getState().assignTask('task', 'a');
    expect(useStore.getState().snapshot.items.task.responsible_uid).toBe('me');
    expect(useStore.getState().toasts.length).toBeGreaterThan(0);
  });
});
