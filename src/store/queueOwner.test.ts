import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ queue: [] as Array<Record<string, unknown>> }));

vi.mock('@/db/idb', () => ({
  readQueue: vi.fn(async () => [...db.queue]),
  dequeue: vi.fn(async (uuids: string[]) => {
    db.queue = db.queue.filter((cmd) => !uuids.includes(cmd.uuid as string));
  }),
  updateQueued: vi.fn(async () => {}),
  enqueue: vi.fn(async () => {}),
  saveSnapshot: vi.fn(async () => {}),
  savePrefs: vi.fn(async () => {}),
  loadPrefs: vi.fn(async () => null),
}));
vi.mock('@/api/auth', () => ({
  auth: { isConnected: () => true, set: vi.fn(async () => {}), disconnect: vi.fn(async () => {}) },
}));
vi.mock('@/api/sync', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/sync')>()),
  sync: vi.fn(),
}));
vi.mock('@/api/commands', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/commands')>()),
  sendCommands: vi.fn(),
}));

import * as idb from '@/db/idb';
import { sync } from '@/api/sync';
import { sendCommands } from '@/api/commands';
import { emptySnapshot, type TodoistUser, type Note } from '@/domain/types';
import { useStore } from './store';
import { defaultPreferences, SETTINGS_COMMENT_MARKER } from './prefs';

const asUser = (id: string) => ({ id } as TodoistUser);
const queued = (uuid: string, userId?: string) => ({
  type: 'item_update', uuid, args: { id: `task-${uuid}`, content: 'Edited offline' },
  queuedAt: 1, attempts: 0, ...(userId ? { userId } : {}),
});

/** Todoist as it answers a sign-in: the whole account, then what changed since. */
function todoistAnswersAs(userId: string) {
  vi.mocked(sync)
    .mockResolvedValueOnce({ sync_token: 'full', full_sync: true, user: asUser(userId) })
    .mockResolvedValue({ sync_token: 'next', full_sync: false });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('navigator', { onLine: true });
  vi.stubGlobal('window', { setTimeout: () => 0 });
  vi.clearAllMocks();
  vi.mocked(sendCommands).mockImplementation(async (_token, commands) => ({
    responses: [], failures: [], mapping: {},
    delivered: commands.map((cmd) => cmd.uuid), undelivered: [],
  }));
  db.queue = [];
  const cached = emptySnapshot();
  cached.user = asUser('u1');
  useStore.setState({ demo: false, snapshot: cached, toasts: [], pendingCount: 0, syncState: 'idle' });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('changes waiting for one account, and another one signs in (#129)', () => {
  it('publishes the signed-in user together with their saved setup state', async () => {
    const user = { id: 'u2', inbox_project_id: 'inbox' } as TodoistUser;
    const note = { id: 'setting', project_id: 'inbox', item_id: null, is_deleted: false,
      posted_at: '2026-01-01T00:00:00Z', posted_uid: 'u2', file_attachment: null,
      content: `${SETTINGS_COMMENT_MARKER}\n\n{"onboarded":true,"setupDone":true}` } as Note;
    vi.mocked(sync).mockResolvedValueOnce({ sync_token: 'full', full_sync: true, user, project_notes: [note] })
      .mockResolvedValueOnce({ sync_token: 'next', full_sync: false });
    useStore.setState({ prefs: defaultPreferences('en'), settingsChecked: false });
    const published: Array<{ done: boolean; checked: boolean }> = [];
    const stop = useStore.subscribe((state) => {
      if (state.snapshot.user?.id === 'u2') published.push({ done: state.prefs.setupDone, checked: state.settingsChecked });
    });
    await useStore.getState().refresh(true, { legacyOwner: 'u1' });
    stop();
    expect(published.length).toBeGreaterThan(0);
    expect(published.every((state) => state.done && state.checked)).toBe(true);
  });
  it('are not sent, are taken off the queue, and are reported once', async () => {
    db.queue = [queued('a', 'u1'), queued('b', 'u1')];
    todoistAnswersAs('u2');

    await useStore.getState().refresh(true, { legacyOwner: 'u1' });

    expect(sendCommands).not.toHaveBeenCalled();
    expect(db.queue).toEqual([]);
    const { toasts, pendingCount } = useStore.getState();
    expect(toasts).toHaveLength(1);
    expect(toasts[0].message).toBe('2 changes made offline with another Todoist account were not sent.');
    expect(pendingCount).toBe(0);
  });

  it('are sent, once, when the same person signs in again, with nothing to say about it', async () => {
    db.queue = [queued('a', 'u1'), queued('b', 'u1')];
    todoistAnswersAs('u1');

    await useStore.getState().refresh(true, { legacyOwner: 'u1' });

    expect(sendCommands).toHaveBeenCalledTimes(1);
    const [, sent] = vi.mocked(sendCommands).mock.calls[0];
    expect(sent.map((cmd) => cmd.uuid)).toEqual(['a', 'b']);
    // Todoist gets the command and nothing else: no account, no bookkeeping.
    expect(sent[0]).toEqual({ type: 'item_update', uuid: 'a', args: { id: 'task-a', content: 'Edited offline' } });
    expect(db.queue).toEqual([]);
    expect(useStore.getState().toasts).toHaveLength(0);
  });

  it('reads the account once in full, then only what changed', async () => {
    db.queue = [queued('a', 'u1')];
    todoistAnswersAs('u1');

    await useStore.getState().refresh(true, { legacyOwner: 'u1' });

    expect(vi.mocked(sync).mock.calls.map(([token]) => token)).toEqual(['*', 'full']);
  });

  it('sets aside only the other account\'s changes when both are in the queue', async () => {
    db.queue = [queued('mine', 'u2'), queued('theirs', 'u1')];
    todoistAnswersAs('u2');

    await useStore.getState().refresh(true, { legacyOwner: 'u1' });

    expect(vi.mocked(sendCommands).mock.calls[0][1].map((cmd) => cmd.uuid)).toEqual(['mine']);
    expect(useStore.getState().toasts).toHaveLength(1);
  });

  it('follows the cached copy for changes queued before accounts were recorded', async () => {
    db.queue = [queued('old')];
    todoistAnswersAs('u2');
    await useStore.getState().refresh(true, { legacyOwner: 'u1' });
    expect(sendCommands).not.toHaveBeenCalled();
    expect(db.queue).toEqual([]);

    db.queue = [queued('old')];
    vi.mocked(sync).mockReset();
    todoistAnswersAs('u1');
    await useStore.getState().refresh(true, { legacyOwner: 'u1' });
    expect(sendCommands).toHaveBeenCalledTimes(1);
  });
});

describe('connecting with an API token (#129)', () => {
  it('sets another account\'s changes aside, and sends nothing of them', async () => {
    db.queue = [queued('a', 'u1')];
    vi.mocked(sync).mockResolvedValue({ sync_token: 'full', full_sync: true, user: asUser('u2') });

    const ok = await useStore.getState().connect('a'.repeat(40));

    expect(ok).toBe(true);
    expect(sendCommands).not.toHaveBeenCalled();
    expect(db.queue).toEqual([]);
    expect(useStore.getState().toasts).toHaveLength(1);
  });
});

describe('an ordinary sync', () => {
  it('still sends what is queued, and holds back a change recorded for another account', async () => {
    db.queue = [queued('here', 'u1'), queued('elsewhere', 'u2')];
    vi.mocked(sync).mockResolvedValue({ sync_token: 'next', full_sync: false });

    await useStore.getState().refresh();

    expect(vi.mocked(sendCommands).mock.calls[0][1].map((cmd) => cmd.uuid)).toEqual(['here']);
    // Not dropped: deciding whose it is belongs to the sign-in.
    expect(db.queue.map((cmd) => cmd.uuid)).toEqual(['elsewhere']);
    expect(idb.dequeue).toHaveBeenCalledWith(['here']);
  });
});
