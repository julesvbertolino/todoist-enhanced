import { CursorGuard } from './pagination';
import { request } from './client';
import type { Project } from '@/domain/types';
export interface WorkspaceMember {
  user_id: string; full_name: string; user_email: string; role: string; is_deleted?: boolean;
}
export async function fetchWorkspaceCollection<T>(path: string, field: 'results' | 'workspace_projects' | 'workspace_users', signal?: AbortSignal): Promise<T[]> {
  const all: T[] = [];
  let cursor: string | undefined;
  const guard = new CursorGuard();
  do {
    const query = new URLSearchParams(path.split('?')[1]);
    query.set('limit', '100');
    if (cursor) query.set('cursor', cursor);
    const page = await request<{ results?: T[]; workspace_projects?: T[]; workspace_users?: T[]; next_cursor?: string; has_more?: boolean }>(`${path.split('?')[0]}?${query}`, { signal });
    if (!Array.isArray(page[field])) throw new Error('Invalid workspace response');
    all.push(...page[field]!);
    if (page.has_more && !page.next_cursor) throw new Error('Missing workspace cursor');
    if (cursor && page.next_cursor === cursor) throw new Error('Repeated workspace cursor');
    if (page.has_more !== false) guard.next(page.next_cursor);
    cursor = page.has_more === false ? undefined : page.next_cursor;
  } while (cursor);
  return all;
}
export const fetchWorkspaceArchive = (id: string, signal?: AbortSignal): Promise<Project[]> =>
  id === 'personal' ? fetchWorkspaceCollection('/projects/archived', 'results', signal)
    : fetchWorkspaceCollection(`/workspaces/${encodeURIComponent(id)}/projects/archived`, 'workspace_projects', signal);

export async function fetchProjectCounts(signal?: AbortSignal): Promise<Record<string, number>> {
  const result = await request<{ completed_info: Array<{ project_id?: string; section_id?: string; item_id?: string; completed_items: number }> }>('/sync', {
    method: 'POST', form: { sync_token: '*', resource_types: JSON.stringify(['completed_info']) }, signal,
  });
  if (!Array.isArray(result.completed_info)) throw new Error('Invalid completion counts');
  return Object.fromEntries(result.completed_info.filter((info) => info.project_id && !info.section_id && !info.item_id && Number.isFinite(info.completed_items))
    .map((info) => [info.project_id!, info.completed_items]));
}

export const updateWorkspaceRole = (workspaceId: string, userId: string, role: string): Promise<unknown> =>
  request(`/workspaces/${encodeURIComponent(workspaceId)}/users/${encodeURIComponent(userId)}`, { method: 'POST', json: { role } });
