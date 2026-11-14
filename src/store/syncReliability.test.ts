import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetIdbMemory } from '@/test/idbMemory';

vi.mock('@/db/idb', async () => (await import('@/test/idbMemory')).idbMemory());
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
import { ApiError } from '@/api/client';
import { sync, type SyncResponse } from '@/api/sync';
import { sendCommands, updateItem, type Command, type CommandResult } from '@/api/commands';
import { emptySnapshot, type TodoistUser } from '@/domain/types';
import { item } from '@/test/items';
import { useStore } from './store';
import { FULL_READ_AFTER_FAILURES, resetFailureStreak } from './sync';
import { resetSyncGate } from './syncGate';
import { clearSyncLog, syncLog, syncReport } from './syncLog';

const sent = vi.mocked(sendCommands);
const read = vi.mocked(sync);

const ok = (commands: Command[], responses: SyncResponse[] = []): CommandResult => ({
  responses, failures: [], mapping: {}, delivered: commands.map((cmd) => cmd.uuid), undelivered: [],
});

/** A promise the test settles when it chooses. */
function later<T>() {
  let settle: (value: T) => void = () => {};
  const promise = new Promise<T>((resolve) => { settle = resolve; });
  return { promise, settle };
}

const rename = (content: string) => (snapshot: ReturnType<typeof emptySnapshot>) => ({
  ...snapshot, items: { ...snapshot.items, a: { ...snapshot.items.a, content } },
});

beforeEach(() => {
  vi.stubGlobal('navigator', { onLine: true });
  vi.clearAllMocks();
  resetIdbMemory();
  resetSyncGate();
  resetFailureStreak();
  clearSyncLog();
  sent.mockImplementation(async (_token, commands) => ok(commands));
  const snapshot = emptySnapshot();
  snapshot.user = { id: 'me' } as TodoistUser;
  snapshot.syncToken = 'kept';
  snapshot.filters = {};
  snapshot.items.a = item({ id: 'a', content: 'Before' });
  useStore.setState({ demo: false, connected: true, snapshot, toasts: [], pendingCount: 0, syncState: 'idle' });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('a sync that keeps failing (#466)', () => {
  it('reads everything again when Todoist refuses the token the device kept', async () => {
    read.mockRejectedValueOnce(new ApiError('Todoist responded 400', 400, { error_tag: 'INVALID_SYNC_TOKEN' }))
      .mockResolvedValueOnce({ sync_token: 'fresh', full_sync: true, items: [item({ id: 'b', content: 'From Todoist' })] });
    await useStore.getState().refresh();
    expect(read.mock.calls.map((call) => call[0])).toEqual(['kept', '*']);
    const state = useStore.getState();
    expect(state.syncState).toBe('idle');
    expect(state.snapshot.syncToken).toBe('fresh');
    expect(Object.keys(state.snapshot.items)).toEqual(['b']);
    expect(syncLog().at(-1)).toMatchObject({ step: 'read', kind: 'refused', status: 400, tag: 'INVALID_SYNC_TOKEN' });
  });

  it('does not start from scratch during an outage', async () => {
    const outage = () => new ApiError('Todoist responded 503', 503);
    read.mockRejectedValue(outage());
    for (let i = 0; i < FULL_READ_AFTER_FAILURES; i += 1) await useStore.getState().refresh();
    expect(useStore.getState().syncState).toBe('error');
    read.mockReset();
    read.mockRejectedValueOnce(outage()).mockRejectedValueOnce(outage());
    await useStore.getState().refresh();
    await useStore.getState().refresh();
    expect(read.mock.calls.map((call) => call[0])).toEqual(['kept', 'kept']);
  });

  it('does not reread everything because the network was lost a few times', async () => {
    read.mockRejectedValue(new TypeError('Failed to fetch'));
    for (let i = 0; i < FULL_READ_AFTER_FAILURES + 1; i += 1) await useStore.getState().refresh();
    expect(read.mock.calls.every((call) => call[0] === 'kept')).toBe(true);
    expect(useStore.getState().syncState).toBe('offline');
  });

  it('does not start a read when sending the outbox is rate limited', async () => {
    await idb.enqueue([updateItem('a', { content: 'Pending' })], 'me');
    sent.mockRejectedValueOnce(new ApiError('Limited', 429));
    await useStore.getState().refresh();
    expect(read).not.toHaveBeenCalled();
    expect(await idb.readQueue()).toHaveLength(1);
    expect(useStore.getState().syncState).not.toBe('idle');
  });

  it('does not reread everything for a rate limit', async () => {
    read.mockRejectedValueOnce(new ApiError('Todoist responded 429', 429));
    await useStore.getState().refresh();
    expect(read).toHaveBeenCalledTimes(1);
    expect(useStore.getState().syncState).toBe('error');
  });

  it('notes a workspace whose folders could not be read, and still syncs', async () => {
    read.mockResolvedValueOnce({ sync_token: 'next', full_sync: false, failedFolderWorkspaces: [{ id: 'team', error: new ApiError('Todoist responded 403', 403) }] });
    await useStore.getState().refresh();
    expect(useStore.getState().syncState).toBe('idle');
    expect(syncLog().at(-1)).toMatchObject({ step: 'folders', kind: 'refused', status: 403 });
  });
});

describe('a write and a read at the same time (#468)', () => {
  it('sends a change once, even when a poll starts while it is being sent', async () => {
    const answer = later<CommandResult>();
    sent.mockImplementationOnce(() => answer.promise);
    read.mockResolvedValue({ sync_token: 'next', full_sync: false });
    const commands = [updateItem('a', { content: 'After' })];
    const writing = useStore.getState().apply(commands, rename('After'));
    await vi.waitFor(() => expect(sent).toHaveBeenCalledTimes(1));

    const polling = useStore.getState().refresh();
    await Promise.resolve();
    // The poll waits for the write: it neither flushes the same change nor reads yet.
    expect(read).not.toHaveBeenCalled();

    answer.settle(ok(commands));
    await writing;
    await polling;
    expect(sent).toHaveBeenCalledTimes(1);
    expect(read).toHaveBeenCalledTimes(1);
    expect(await idb.readQueue()).toEqual([]);
    expect(useStore.getState().pendingCount).toBe(0);
  });

  it('leaves a waiting write\'s change to that write when a poll empties the outbox first', async () => {
    const first = later<CommandResult>();
    const a = [updateItem('a', { content: 'One' })];
    sent.mockImplementationOnce(() => first.promise);
    read.mockResolvedValue({ sync_token: 'next', full_sync: false });
    const writingA = useStore.getState().apply(a, rename('One'));
    await vi.waitFor(() => expect(sent).toHaveBeenCalledTimes(1));

    // A poll queues up behind it, then a second change behind the poll.
    const polling = useStore.getState().refresh();
    const b = [updateItem('a', { content: 'Two' })];
    const writingB = useStore.getState().apply(b, rename('Two'));
    await vi.waitFor(async () => expect((await idb.readQueue()).map((cmd) => cmd.uuid)).toContain(b[0].uuid));

    first.settle(ok(a));
    await Promise.all([writingA, polling, writingB]);
    const sentUuids = sent.mock.calls.flatMap((call) => call[1].map((cmd) => cmd.uuid));
    expect(sentUuids.filter((uuid) => uuid === b[0].uuid)).toHaveLength(1);
    expect(useStore.getState().snapshot.items.a.content).toBe('Two');
    expect(useStore.getState().pendingCount).toBe(0);
  });

  it('keeps a change on screen when a read that started before it comes back after', async () => {
    const answer = later<SyncResponse>();
    read.mockImplementationOnce(() => answer.promise);
    const polling = useStore.getState().refresh();
    await vi.waitFor(() => expect(read).toHaveBeenCalledTimes(1));

    const commands = [updateItem('a', { content: 'After' })];
    const writing = useStore.getState().apply(commands, rename('After'));
    expect(useStore.getState().snapshot.items.a.content).toBe('After');

    // Todoist answers the read with the task as it was before the change.
    answer.settle({ sync_token: 'read', full_sync: false, items: [item({ id: 'a', content: 'Before' })] });
    await polling;
    expect(useStore.getState().snapshot.items.a.content).toBe('After');

    await writing;
    expect(sent).toHaveBeenCalledTimes(1);
    // The write went out only once the read had landed.
    expect(sent.mock.invocationCallOrder[0]).toBeGreaterThan(read.mock.invocationCallOrder[0]);
    // Sent with the token the read left, not the one from before it.
    expect(sent.mock.calls[0][0]).toBe('read');
    expect(useStore.getState().snapshot.items.a.content).toBe('After');
  });

  it('does not restore an old snapshot when a read finishes after sign-out', async () => {
    const answer = later<SyncResponse>();
    read.mockImplementationOnce(() => answer.promise);
    const polling = useStore.getState().refresh();
    await vi.waitFor(() => expect(read).toHaveBeenCalledTimes(1));
    const signingOut = useStore.getState().disconnect();
    answer.settle({ sync_token: 'old', full_sync: false, items: [item({ id: 'old' })] });
    await Promise.all([polling, signingOut]);
    expect(useStore.getState().connected).toBe(false);
    expect(useStore.getState().snapshot.items.old).toBeUndefined();
  });

  it('leaves a change made offline to the next flush, and counts it from the outbox', async () => {
    vi.stubGlobal('navigator', { onLine: false });
    await useStore.getState().apply([updateItem('a', { content: 'Offline' })], rename('Offline'));
    expect(useStore.getState().pendingCount).toBe(1);
    vi.stubGlobal('navigator', { onLine: true });
    read.mockResolvedValue({ sync_token: 'next', full_sync: false });
    await useStore.getState().refresh();
    expect(sent).toHaveBeenCalledTimes(1);
    expect(useStore.getState().pendingCount).toBe(0);
  });
});

describe('the details a bug report carries (#469)', () => {
  it('say what failed and when, and nothing of the tasks themselves', async () => {
    read.mockRejectedValueOnce(new ApiError('Todoist responded 503', 503, { error_tag: 'SERVICE_UNAVAILABLE' }));
    await useStore.getState().refresh();
    const report = syncReport({
      version: '9.9.9', userAgent: 'Test', state: 'error', syncedAt: 0,
      queue: [{ type: 'item_update', attempts: 2 }, { type: 'item_update', attempts: 1 }],
    });
    expect(report).toContain('Enhanced for Todoist 9.9.9');
    expect(report).toContain('read server 503 SERVICE_UNAVAILABLE');
    expect(report).toContain('Changes waiting: 2 (item_update ×2; most attempts 2)');
    expect(report).not.toContain('Before');
  });
});
