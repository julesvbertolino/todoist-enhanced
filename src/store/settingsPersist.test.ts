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
import { sync } from '@/api/sync';
import { sendCommands, type Command, type CommandResult } from '@/api/commands';
import { emptySnapshot, type Note, type TodoistUser } from '@/domain/types';
import { useStore } from './store';
import { defaultPreferences, readSettingsComment, settingsCommentContent } from './prefs';
import { loadPrefsDirty, prefsDirtySince, PREFS_DIRTY_KEY, resetPrefsDirty } from './preferences';
import { resetSyncGate } from './syncGate';
import { resetFailureStreak } from './sync';

const sent = vi.mocked(sendCommands);
const read = vi.mocked(sync);
const ok = (commands: Command[]): CommandResult => ({
  responses: [], failures: [], mapping: {}, delivered: commands.map((cmd) => cmd.uuid), undelivered: [],
});

/** The account's settings comment, as written by a device at `savedAt`. */
function accountSays(hour12: boolean, savedAt: number): Note {
  return {
    id: 'settings', project_id: 'inbox', item_id: null, is_deleted: false, file_attachment: null,
    posted_at: '2026-01-01T00:00:00Z', posted_uid: 'me',
    content: settingsCommentContent({ ...defaultPreferences('en'), hour12 }, savedAt),
  } as unknown as Note;
}

/** What the last settings write sent to Todoist says about the clock. */
function writtenHour12(): boolean | undefined {
  const writes = sent.mock.calls.flatMap((call) => call[1]).filter((cmd) => cmd.type === 'note_update');
  const last = writes.at(-1);
  return last ? readSettingsComment(String(last.args.content))?.hour12 : undefined;
}

/** A relaunch: the mark left on the device by the last session is read back. */
async function relaunchWithMark(since: number | null) {
  vi.mocked(idb.loadPrefs).mockImplementation(async (key: string) => (key === PREFS_DIRTY_KEY ? since : null) as never);
  await loadPrefsDirty();
}

beforeEach(() => {
  vi.stubGlobal('navigator', { onLine: true });
  vi.stubGlobal('window', {
    setTimeout: (fn: () => void, ms?: number) => setTimeout(fn, ms),
    clearTimeout: (id: ReturnType<typeof setTimeout>) => clearTimeout(id),
  });
  vi.clearAllMocks();
  resetIdbMemory();
  resetSyncGate();
  resetFailureStreak();
  resetPrefsDirty();
  sent.mockImplementation(async (_token, commands) => ok(commands));
  read.mockResolvedValue({ sync_token: 'next', full_sync: false });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

function start(localHour12: boolean, comment: Note) {
  const snapshot = emptySnapshot();
  snapshot.user = { id: 'me', inbox_project_id: 'inbox' } as TodoistUser;
  snapshot.syncToken = 'kept';
  snapshot.filters = {};
  snapshot.notes = { [comment.id]: comment };
  useStore.setState({
    demo: false, connected: true, snapshot, toasts: [], pendingCount: 0, syncState: 'idle',
    settingsChecked: true, prefs: { ...defaultPreferences('en'), hour12: localHour12, onboarded: true },
  });
}

describe('a setting changed just before the app closed', () => {
  it('is kept at the next launch, and written to the account, rather than replaced by the older one', async () => {
    start(true, accountSays(false, 1_000));
    await relaunchWithMark(2_000);
    await useStore.getState().refresh();
    expect(useStore.getState().prefs.hour12).toBe(true);
    await vi.waitFor(() => expect(writtenHour12()).toBe(true));
    expect(prefsDirtySince()).toBeNull();
  });

  it('gives way to settings another device wrote after it', async () => {
    start(true, accountSays(false, 3_000));
    await relaunchWithMark(2_000);
    await useStore.getState().refresh();
    expect(useStore.getState().prefs.hour12).toBe(false);
    expect(prefsDirtySince()).toBeNull();
  });

  it('without a mark, the account decides, as before', async () => {
    start(true, accountSays(false, 1_000));
    await relaunchWithMark(null);
    await useStore.getState().refresh();
    expect(useStore.getState().prefs.hour12).toBe(false);
  });

  it('is marked the moment it is made, before its write goes out', () => {
    start(false, accountSays(false, 1_000));
    useStore.getState().setPrefs({ hour12: true });
    expect(prefsDirtySince()).not.toBeNull();
    expect(idb.savePrefs).toHaveBeenCalledWith(PREFS_DIRTY_KEY, expect.any(Number));
  });
});

describe('a setting changed while the settings are being written', () => {
  it('is written too, once the write under way is done', async () => {
    start(false, accountSays(false, 1_000));
    let release: () => void = () => {};
    sent.mockImplementationOnce((_token, commands) => new Promise((resolve) => { release = () => resolve(ok(commands)); }));
    useStore.setState({ prefs: { ...useStore.getState().prefs, hour12: true } });
    const first = useStore.getState().ensurePreferencesTask(true);
    await vi.waitFor(() => expect(sent).toHaveBeenCalledTimes(1));

    // A second change while the first is still on its way.
    useStore.setState({ prefs: { ...useStore.getState().prefs, weekLabel: 'semaine' } });
    await useStore.getState().ensurePreferencesTask(true);
    release();
    await first;

    await vi.waitFor(() => expect(sent).toHaveBeenCalledTimes(2));
    const last = sent.mock.calls[1][1].find((cmd) => cmd.type === 'note_update');
    expect(readSettingsComment(String(last?.args.content))?.weekLabel).toBe('semaine');
  });
});
