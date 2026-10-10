import { describe, expect, it } from 'vitest';
import { parentChoices } from './projectParents';
import type { Project } from './types';

const project = (id: string, extra: Partial<Project> = {}): Project => ({
  id, name: id, color: 'charcoal', parent_id: null, child_order: 0,
  is_archived: false, is_deleted: false, is_favorite: false, ...extra,
});

const tree = (...list: Project[]) => Object.fromEntries(list.map((p) => [p.id, p]));

describe('parentChoices', () => {
  const projects = tree(
    project('inbox', { inbox_project: true }),
    project('work', { child_order: 1 }),
    project('site', { parent_id: 'work', child_order: 1 }),
    project('blog', { parent_id: 'site', child_order: 1 }),
    project('home', { child_order: 2 }),
    project('old', { child_order: 3, is_archived: true }),
    project('team', { child_order: 1, workspace_id: 'w1' }),
  );

  it('lists the tree in order with its depth, and leaves out the Inbox and what is put away', () => {
    expect(parentChoices(projects, null)).toEqual([
      { id: 'work', name: 'work', depth: 0 },
      { id: 'site', name: 'site', depth: 1 },
      { id: 'blog', name: 'blog', depth: 2 },
      { id: 'home', name: 'home', depth: 0 },
    ]);
  });

  it('stays inside the workspace', () => {
    expect(parentChoices(projects, 'w1').map((c) => c.id)).toEqual(['team']);
  });

  it('never offers the project itself or anything inside it', () => {
    expect(parentChoices(projects, null, 'site').map((c) => c.id)).toEqual(['work', 'home']);
  });

  it('offers a folder nothing to be filed in', () => {
    const withFolder = { ...projects, work: { ...projects.work, is_folder: true } };
    expect(parentChoices(withFolder, null, 'work')).toEqual([]);
    expect(parentChoices(withFolder, null, 'home').map((c) => c.id)).toContain('work');
  });
});
