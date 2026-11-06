import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, request } from './client';
import { applySync, sync, FOLDER_REFRESH_INTERVAL_MS } from './sync';
import { emptySnapshot } from '@/domain/types';
vi.mock('./client', async (importOriginal) => ({ ...(await importOriginal<typeof import('./client')>()), request: vi.fn() }));
const team = { id: 'team', name: 'Team' };
const folder = { id: 'folder', name: 'Clients', workspace_id: 'team', child_order: 1 };
beforeEach(() => vi.resetAllMocks());
describe('native team folder reads', () => {
  it('paginates the REST collection even when incremental sync carries no workspace changes', async () => {
    vi.mocked(request).mockResolvedValueOnce({ full_sync: false, sync_token: 'next' })
      .mockResolvedValueOnce({ results: [folder], next_cursor: 'next-page' })
      .mockResolvedValueOnce({ results: [{ ...folder, id: 'second' }], next_cursor: null });
    const response = await sync('old', undefined, { team });
    expect(response.folders?.map((f) => f.id)).toEqual(['folder', 'second']);
    expect(vi.mocked(request).mock.calls[2][0]).toContain('cursor=next-page');
    expect(vi.mocked(request).mock.calls[1][0]).toContain('workspace_id=team');
  });
  it('refreshes renames and removes deleted folders without dropping other teams', () => {
    const old = { ...emptySnapshot(), folders: { folder, other: { ...folder, id: 'other', workspace_id: 'other-team' } } };
    const renamed = applySync(old, { full_sync: false, sync_token: 'next', folders: [{ ...folder, name: 'Renamed' }], refreshedFolderWorkspaces: ['team'] });
    expect(renamed.folders?.folder.name).toBe('Renamed');
    const deleted = applySync(renamed, { full_sync: false, sync_token: 'next2', folders: [], refreshedFolderWorkspaces: ['team'] });
    expect(Object.keys(deleted.folders ?? {})).toEqual(['other']);
  });
  it('keeps a workspace\'s folders, and the rest of the read, when its folders cannot be read (#466)', async () => {
    const other = { id: 'other-team', name: 'Other' };
    vi.mocked(request).mockImplementation(async (path: string) => {
      if (path === '/sync') return { full_sync: false, sync_token: 'next', items: [{ id: 'task' }], workspaces: [team, other] };
      if (path.includes('workspace_id=team')) throw new ApiError('Todoist responded 403', 403, { error_tag: 'FORBIDDEN' });
      return { results: [{ ...folder, id: 'theirs', workspace_id: 'other-team' }], next_cursor: null };
    });
    const response = await sync('old', undefined, { team, 'other-team': other });
    expect(response.sync_token).toBe('next');
    expect(response.items).toEqual([{ id: 'task' }]);
    expect(response.refreshedFolderWorkspaces).toEqual(['other-team']);
    expect(response.failedFolderWorkspaces?.map((failure) => failure.id)).toEqual(['team']);
    // Applied: the unread workspace keeps the folders it had, the other is replaced.
    const before = { ...emptySnapshot(), folders: { folder, stale: { ...folder, id: 'stale', workspace_id: 'other-team' } } };
    const after = applySync(before, response);
    expect(Object.keys(after.folders ?? {}).sort()).toEqual(['folder', 'theirs']);
  });
  it('does not present a failed folder read as a successful empty collection', async () => {
    vi.mocked(request).mockResolvedValueOnce({ full_sync: true, sync_token: 'next', workspaces: [team] }).mockRejectedValueOnce(new Error('Offline'));
    const response = await sync('*');
    expect(response.refreshedFolderWorkspaces).toEqual([]);
    expect(response.failedFolderWorkspaces?.map((failure) => failure.id)).toEqual(['team']);
    // A full read from scratch, seeded with the folders known, keeps that workspace's.
    const after = applySync({ ...emptySnapshot(), folders: { folder } }, response);
    expect(Object.keys(after.folders ?? {})).toEqual(['folder']);
  });
  it('still fails the read when the folder read says the token is no longer valid', async () => {
    vi.mocked(request).mockResolvedValueOnce({ full_sync: true, sync_token: 'next', workspaces: [team] })
      .mockRejectedValueOnce(new ApiError('Todoist responded 401', 401));
    await expect(sync('*')).rejects.toBeInstanceOf(ApiError);
  });
  it('reuses folders between polls but refreshes after ten minutes or a workspace change', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-01-01T12:00:00Z'));
      vi.mocked(request).mockResolvedValueOnce({ full_sync: true, sync_token: 'a', workspaces: [team] })
        .mockResolvedValueOnce({ results: [folder], next_cursor: null });
      await sync('*');
      vi.mocked(request).mockResolvedValueOnce({ full_sync: false, sync_token: 'b' });
      const quiet = await sync('a', undefined, { team });
      expect(quiet.refreshedFolderWorkspaces).toBeUndefined();
      expect(request).toHaveBeenCalledTimes(3);
      vi.advanceTimersByTime(FOLDER_REFRESH_INTERVAL_MS);
      vi.mocked(request).mockResolvedValueOnce({ full_sync: false, sync_token: 'c' })
        .mockResolvedValueOnce({ results: [], next_cursor: null });
      const refreshed = await sync('b', undefined, { team });
      expect(refreshed.refreshedFolderWorkspaces).toEqual(['team']);
      vi.mocked(request).mockResolvedValueOnce({ full_sync: false, sync_token: 'd', workspaces: [team] })
        .mockResolvedValueOnce({ results: [folder], next_cursor: null });
      const changed = await sync('c', undefined, { team });
      expect(changed.folders).toEqual([folder]);
    } finally { vi.useRealTimers(); }
  });

});
