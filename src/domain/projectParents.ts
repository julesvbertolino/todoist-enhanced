import type { Folder, Project } from './types';

export interface ParentChoice {
  id: string;
  name: string;
  /** How far down the tree it sits, so a list can indent it. */
  depth: number;
}

/**
 * The projects a project may be filed under, in tree order.
 *
 * The same rules `nestProject` enforces when it moves one, so the sheet never
 * offers what the store would refuse: the same workspace, never the project
 * itself or anything inside it, never the Inbox or something put away. A
 * folder is a good parent (holding projects is what a folder is) but cannot be
 * filed inside anything, so it is offered none.
 */
export function parentChoices(
  projects: Record<string, Project>,
  workspaceId: string | null,
  projectId?: string,
): ParentChoice[] {
  const self = projectId ? projects[projectId] : undefined;
  if (self?.is_folder) return [];

  const live = Object.values(projects).filter((project) =>
    !project.is_archived && !project.is_deleted && !project.inbox_project
    && (project.workspace_id ?? null) === workspaceId);

  const childrenOf = new Map<string | null, Project[]>();
  for (const project of live) {
    const key = project.parent_id && projects[project.parent_id] ? project.parent_id : null;
    childrenOf.set(key, [...(childrenOf.get(key) ?? []), project]);
  }
  for (const list of childrenOf.values()) list.sort((a, b) => a.child_order - b.child_order);

  const choices: ParentChoice[] = [];
  const walk = (parent: string | null, depth: number) => {
    for (const project of childrenOf.get(parent) ?? []) {
      // The project's own branch is skipped whole: nothing in it may be its parent.
      if (project.id === projectId) continue;
      choices.push({ id: project.id, name: project.name, depth });
      walk(project.id, depth + 1);
    }
  };
  walk(null, 0);
  return choices;
}

/**
 * The folders of a workspace a project can be created in, in the order the
 * sidebar draws them (#463). A folder is a place for projects, never a parent
 * project and never a task destination, so it is offered here and nowhere else.
 */
export function folderChoices(
  folders: Record<string, Folder> | undefined,
  workspaceId: string | null,
): Array<{ id: string; name: string }> {
  if (!workspaceId) return [];
  return Object.values(folders ?? {})
    .filter((folder) => !folder.is_deleted && folder.workspace_id === workspaceId)
    .sort((a, b) => (a.child_order ?? a.default_order ?? 0) - (b.child_order ?? b.default_order ?? 0))
    .map((folder) => ({ id: folder.id, name: folder.name }));
}
