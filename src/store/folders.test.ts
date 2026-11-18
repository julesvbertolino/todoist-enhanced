import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetIdbMemory } from '@/test/idbMemory';

vi.mock('@/db/idb', async () => (await import('@/test/idbMemory')).idbMemory());
vi.mock('@/api/commands', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/commands')>()),
  sendCommands: vi.fn(),
}));

import { sendCommands } from '@/api/commands';
import { emptySnapshot, type Project } from '@/domain/types';
import { useStore } from './store';

const sent = vi.mocked(sendCommands);
const project = (id: string, extra: Partial<Project> = {}): Project => ({
  id, name: id, color: 'charcoal', parent_id: null, child_order: 0,
  is_archived: false, is_deleted: false, is_favorite: false, workspace_id: 'w1', ...extra,
});

beforeEach(() => {
  vi.stubGlobal('navigator', { onLine: true });
  vi.clearAllMocks();
  resetIdbMemory();
  sent.mockImplementation(async (_token, commands) => ({
    responses: [], failures: [], mapping: {}, delivered: commands.map((c) => c.uuid), undelivered: [],
  }));
  const snapshot = emptySnapshot();
  snapshot.folders = {
    f1: { id: 'f1', name: 'Clients', workspace_id: 'w1', child_order: 1 },
    f2: { id: 'f2', name: 'Empty', workspace_id: 'w1', child_order: 2 },
  };
  snapshot.projects = { p1: project('p1', { folder_id: 'f1' }), p2: project('p2', { parent_id: 'p1' }), perso: project('perso', { workspace_id: null }) };
  useStore.setState({ demo: false, snapshot, toasts: [], undoStack: [], pendingCount: 0, syncState: 'idle' });
});

const lastCommands = () => sent.mock.calls.at(-1)?.[1] ?? [];

describe('team folders (#463)', () => {
  it('renames a folder with folder_update and shows the new name at once', async () => {
    await useStore.getState().renameFolder('f1', '  Customers ');
    expect(useStore.getState().snapshot.folders?.f1.name).toBe('Customers');
    expect(lastCommands()[0]).toMatchObject({ type: 'folder_update', args: { id: 'f1', workspace_id: 'w1', name: 'Customers' } });
  });

  it('ignores an empty or unchanged name', async () => {
    await useStore.getState().renameFolder('f1', '   ');
    await useStore.getState().renameFolder('f1', 'Clients');
    expect(sent).not.toHaveBeenCalled();
  });

  it('deletes an empty folder but never one that holds a project', async () => {
    await useStore.getState().deleteFolder('f1');
    expect(useStore.getState().snapshot.folders?.f1).toBeDefined();
    expect(sent).not.toHaveBeenCalled();
    await useStore.getState().deleteFolder('f2');
    expect(useStore.getState().snapshot.folders?.f2).toBeUndefined();
    expect(lastCommands()[0]).toMatchObject({ type: 'folder_delete', args: { id: 'f2', workspace_id: 'w1' } });
  });

  it('creates a project inside a folder, with no parent project', async () => {
    const id = await useStore.getState().createProject('New', 'blue', 'w1', null, { folderId: 'f2' });
    expect(lastCommands()[0]).toMatchObject({ type: 'project_add', args: { workspace_id: 'w1', folder_id: 'f2' } });
    expect(lastCommands()[0].args.parent_id).toBeUndefined();
    expect(useStore.getState().snapshot.projects[id]?.folder_id).toBe('f2');
  });

  it('keeps a parent project working: a parent wins and no folder is sent', async () => {
    await useStore.getState().createProject('Sub', 'blue', 'w1', null, { parentId: 'p1', folderId: 'f2' });
    expect(lastCommands()[0].args).toMatchObject({ parent_id: 'p1' });
    expect(lastCommands()[0].args.folder_id).toBeUndefined();
  });

  it('files an existing project in a folder, or takes it out', async () => {
    await useStore.getState().moveProjectToFolder('p2', 'f2');
    expect(useStore.getState().snapshot.projects.p2).toMatchObject({ folder_id: 'f2', parent_id: null });
    expect(lastCommands()[0]).toMatchObject({ type: 'project_update', args: { id: 'p2', folder_id: 'f2' } });
    await useStore.getState().moveProjectToFolder('p2', null);
    expect(useStore.getState().snapshot.projects.p2.folder_id).toBeNull();
  });

  it('refuses a folder of another workspace and a personal project', async () => {
    await useStore.getState().moveProjectToFolder('perso', 'f1');
    expect(sent).not.toHaveBeenCalled();
  });
});
