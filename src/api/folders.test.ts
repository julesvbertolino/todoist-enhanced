import { beforeEach, describe, expect, it, vi } from 'vitest';
import { request } from './client';
import { applySync, sync } from './sync';
import { emptySnapshot } from '@/domain/types';
vi.mock('./client', () => ({ request: vi.fn() }));
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
  it('does not present a failed folder read as a successful empty collection', async () => {
    vi.mocked(request).mockResolvedValueOnce({ full_sync: true, sync_token: 'next', workspaces: [team] }).mockRejectedValueOnce(new Error('Offline'));
    await expect(sync('*')).rejects.toThrow('Offline');
  });
});
