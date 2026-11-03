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

import { sendCommands, type Command, type CommandResult } from '@/api/commands';
import { emptySnapshot, type Project } from '@/domain/types';
import { useStore } from './store';

const sent = vi.mocked(sendCommands);
const accepted = (commands: Command[]): CommandResult => ({
  responses: [], failures: [], mapping: {}, delivered: commands.map((cmd) => cmd.uuid), undelivered: [],
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('navigator', { onLine: true });
  vi.clearAllMocks();
  const snapshot = emptySnapshot();
  snapshot.projects.mine = { id: 'mine', name: 'Mine', workspace_id: null, is_archived: false } as Project;
  snapshot.projects.team = { id: 'team', name: 'Team', workspace_id: 'ws', is_archived: false } as Project;
  useStore.setState({
    demo: false, snapshot, toasts: [], undoStack: [], pendingCount: 0, syncState: 'idle',
    prefs: { ...useStore.getState().prefs, locale: 'en' },
  });
  sent.mockImplementation(async (_token, commands) => accepted(commands));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('deleting a project', () => {
  it('deletes a personal project as it always did', async () => {
    await useStore.getState().deleteProject('mine');
    expect(sent.mock.calls[0][1].map((cmd) => cmd.type)).toEqual(['project_delete']);
  });

  it('archives a workspace project first, in the same batch, because Todoist only deletes archived ones', async () => {
    await useStore.getState().deleteProject('team');
    expect(sent).toHaveBeenCalledTimes(1);
    expect(sent.mock.calls[0][1].map((cmd) => cmd.type)).toEqual(['project_archive', 'project_delete']);
  });
});
