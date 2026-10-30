import { afterEach, beforeEach, expect, it, vi } from 'vitest';

vi.mock('@/db/idb', () => ({
  readQueue: vi.fn(async () => []), enqueue: vi.fn(async () => {}), saveSnapshot: vi.fn(async () => {}),
  savePrefs: vi.fn(async () => {}), loadPrefs: vi.fn(async () => null),
}));

import * as idb from '@/db/idb';
import { emptySnapshot, type Note } from '@/domain/types';
import { SETTINGS_COMMENT_MARKER, defaultPreferences } from './prefs';
import { useStore } from './store';

beforeEach(() => {
  vi.stubGlobal('navigator', { onLine: false });
  vi.stubGlobal('window', { setTimeout: () => 0, clearTimeout: () => {} });
  vi.clearAllMocks();
});
afterEach(() => vi.unstubAllGlobals());

it('queues a change to an existing settings comment when offline', async () => {
  const comment: Note = {
    id: 'comment', item_id: null, project_id: 'inbox', posted_at: '2026-01-01T00:00:00Z',
    posted_uid: 'user', is_deleted: false, file_attachment: null,
    content: `${SETTINGS_COMMENT_MARKER}\n\n{"onboarded":true,"setupDone":false}`,
  };
  const snapshot = { ...emptySnapshot(), user: { id: 'user', inbox_project_id: 'inbox' } as ReturnType<typeof emptySnapshot>['user'], notes: { comment } };
  useStore.setState({ snapshot, prefs: { ...defaultPreferences('en'), onboarded: true, setupDone: true }, connected: true, demo: false, settingsChecked: false, pendingCount: 0 });
  await useStore.getState().ensurePreferencesTask(true);
  expect(idb.enqueue).toHaveBeenCalled();
  const commands = vi.mocked(idb.enqueue).mock.calls[0][0];
  expect(commands.some((command) => command.type === 'note_update' && command.args.id === 'comment')).toBe(true);
});

it('does not create settings when the account state could not be read', async () => {
  const snapshot = { ...emptySnapshot(), user: { id: 'user', inbox_project_id: 'inbox' } as ReturnType<typeof emptySnapshot>['user'] };
  useStore.setState({ snapshot, connected: true, demo: false, settingsChecked: false });
  await useStore.getState().ensurePreferencesTask(true);
  expect(idb.enqueue).not.toHaveBeenCalled();
});
