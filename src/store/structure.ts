/** Projects, sections and labels: creating, ordering, nesting, archiving, deleting. */
import { command, type Command, moveItem, newUuid } from '@/api/commands';
import type { Snapshot } from '@/domain/types';
import { translate } from '@/i18n';
import { patchParent } from '@/domain/order';
import { byChildOrder, bySectionOrder, keyBetween, keysInOrder } from '@/domain/orderKey';
import type { Slice, StructureSlice } from './types';

/**
 * Where a section added at `index` among `existing` goes.
 *
 * Where every section has a key, the new one takes a key between its two
 * neighbours and nothing else is written. Otherwise everything from `index`
 * down moves one place, which is `shifted`.
 */
function placeSection<T extends { order_key?: string | null }>(
  existing: T[], index: number,
): { orderKey: string | null; shifted: T[] } {
  let orderKey: string | null = null;
  try {
    if (!existing.every((section) => section.order_key)) throw new Error('unmigrated');
    orderKey = keyBetween(existing[index - 1]?.order_key ?? null, existing[index]?.order_key ?? null);
  } catch {
    orderKey = null;
  }
  return { orderKey, shifted: orderKey ? [] : existing.slice(index) };
}

export const createStructureSlice: Slice<StructureSlice> = (_set, get) => ({
  async createLabel(name, color = 'charcoal') {
    const trimmed = name.trim();
    if (!trimmed) return;

    // Todoist tag names carry no spaces, and neither does the @ syntax.
    const clean = trimmed.replace(/\s+/g, '-');
    const existing = Object.values(get().snapshot.labels).find(
      (label) => label.name.toLowerCase() === clean.toLowerCase(),
    );
    if (existing) return;

    const tempId = newUuid();
    const order = Object.keys(get().snapshot.labels).length + 1;
    await get().apply(
      [{ type: 'label_add', uuid: newUuid(), temp_id: tempId, args: { name: clean, color } }],
      (snapshot) => ({
        ...snapshot,
        labels: {
          ...snapshot.labels,
          [tempId]: {
            id: tempId, name: clean, color,
            item_order: order, is_favorite: false, is_deleted: false,
          },
        },
      }),
    );
  },
  async setLabelFavourite(id, favourite) {
    await get().apply(
      [command('label_update', { id, is_favorite: favourite })],
      (snapshot) => {
        const label = snapshot.labels[id];
        if (!label) return snapshot;
        return {
          ...snapshot,
          labels: { ...snapshot.labels, [id]: { ...label, is_favorite: favourite } },
        };
      },
    );
  },
  async reorderLabels(ids) {
    const order = Object.fromEntries(ids.map((id, index) => [id, index + 1]));
    const keys = keysInOrder(ids.length);
    await get().apply(
      [command('label_update_orders', { id_order_mapping: order })],
      (snapshot) => {
        const labels = { ...snapshot.labels };
        ids.forEach((id, index) => {
          /* A fresh run of keys as well as the numbers, so the list sorts one
             way until Todoist's own keys come back with its answer. */
          if (labels[id]) labels[id] = { ...labels[id], item_order: index + 1, order_key: keys[index] };
        });
        return { ...snapshot, labels };
      },
    );
  },
  /* Every sibling is sent, not only the ones whose number changes: once
     Todoist orders by `order_key`, the old numbers are no longer a reliable
     picture of the current order to diff against. */
  async reorderProjects(ids) {
    const projects = get().snapshot.projects;
    const listed = ids.filter((id) => projects[id]);
    const current = Object.values(projects)
      .filter((project) => listed.includes(project.id))
      .sort(byChildOrder)
      .map((project) => project.id);
    if (listed.length === 0 || listed.join() === current.join()) return;

    const orders = listed.map((id, index) => ({ id, child_order: index + 1 }));
    const keys = keysInOrder(listed.length);
    await get().apply([command('project_reorder', { projects: orders })], (snapshot) => {
      const next = { ...snapshot.projects };
      listed.forEach((id, index) => {
        if (next[id]) next[id] = { ...next[id], child_order: index + 1, order_key: keys[index] };
      });
      return { ...snapshot, projects: next };
    });
  },
  async nestProject(id, parentId) {
    const projects = get().snapshot.projects;
    const project = projects[id];
    if (!project) return;
    if ((project.parent_id ?? null) === parentId) return;

    /* A project cannot be moved inside itself or inside something it already
       contains: Todoist would refuse it, and the sidebar would be drawing a
       branch with no root while it waited to find out. */
    if (parentId) {
      const parent = projects[parentId];
      /* A folder is a perfectly good parent — holding projects is the whole of
         what a folder is — but it cannot itself be filed inside something. */
      if (!parent || project.is_folder) return;
      if ((parent.workspace_id ?? null) !== (project.workspace_id ?? null)) return;
      for (let at: string | null = parentId; at; at = projects[at]?.parent_id ?? null) {
        if (at === id) return;
      }
    }

    const before = project.parent_id ?? null;
    const patch = (to: string | null) => (snapshot: Snapshot): Snapshot => {
      if (!snapshot.projects[id]) return snapshot;
      return { ...snapshot, projects: patchParent(snapshot.projects, id, to) };
    };

    /* Todoist reads a missing parent_id as "leave it where it is" and an
       explicit null as "move it to the top", so null is sent rather than omitted. */
    await get().apply([command('project_move', { id, parent_id: parentId })], patch(parentId));

    get().toast(
      parentId
        ? translate(get().prefs.locale, 'project.nestedIn', {
            name: project.name, parent: projects[parentId]?.name ?? '',
          })
        : translate(get().prefs.locale, 'project.movedToTop', { name: project.name }),
      () => void get().apply(
        [command('project_move', { id, parent_id: before })],
        patch(before),
      ),
    );
  },
  async moveProjectToWorkspace(id, workspaceId) {
    const project = get().snapshot.projects[id];
    if (!project || (project.workspace_id ?? null) === workspaceId) return;
    const before = project.workspace_id ?? null;
    /* A project that changes space leaves its parent behind: the branch it was in does not exist there. */
    const patch = (to: string | null) => (snapshot: Snapshot): Snapshot => {
      const own = snapshot.projects[id];
      if (!own) return snapshot;
      return {
        ...snapshot,
        projects: { ...snapshot.projects, [id]: { ...own, workspace_id: to, parent_id: null } },
      };
    };
    const move = (to: string | null) => command(
      to ? 'project_move_to_workspace' : 'project_move_to_personal',
      to ? { project_id: id, workspace_id: to } : { project_id: id },
    );
    await get().apply([move(workspaceId)], patch(workspaceId));
    get().toast(
      translate(get().prefs.locale, 'project.movedToSpace', {
        name: project.name,
        space: workspaceId
          ? get().snapshot.workspaces[workspaceId]?.name ?? ''
          : translate(get().prefs.locale, 'nav.myProjects'),
      }),
      () => void get().apply([move(before)], patch(before)),
    );
  },
  async createProject(name, color, workspaceId = null, anchor = null, extra = {}) {
    const tempId = newUuid();
    const snapshot = get().snapshot;
    const neighbour = anchor ? snapshot.projects[anchor.siblingId] : undefined;
    /* A parent chosen in the sheet that is not the neighbour's own wins, and
       the position goes with it: "next to" something in another branch means
       nothing. */
    const sibling = neighbour && (extra.parentId === undefined || (neighbour.parent_id ?? null) === extra.parentId)
      ? neighbour : undefined;

    /* Todoist reads the absence of workspace_id as the personal space, so the
       key is left off entirely rather than sent as null. */
    const args: Record<string, unknown> = { name, color };
    if (workspaceId) args.workspace_id = workspaceId;
    if (sibling?.parent_id) args.parent_id = sibling.parent_id;
    if (extra.parentId) args.parent_id = extra.parentId;
    if (extra.description) args.description = extra.description;
    if (extra.favourite) args.is_favorite = true;
    if (extra.viewStyle) args.view_style = extra.viewStyle;

    const commands: Command[] = [];

    /* "Above" and "below" mean a position among the siblings, which is a
       child_order. The new project is given the one it should hold, and every
       sibling from there down is pushed one place to make room — with their
       real ids, so no command has to resolve a temp id to do its work. */
    let childOrder = Object.keys(snapshot.projects).length;
    let orderKey: string | null = null;
    if (sibling) {
      const siblings = Object.values(snapshot.projects)
        .filter((project) =>
          !project.is_archived &&
          !project.is_deleted &&
          !project.inbox_project &&
          (project.parent_id ?? null) === (sibling.parent_id ?? null) &&
          (project.workspace_id ?? null) === (sibling.workspace_id ?? null))
        .sort(byChildOrder);

      const at = siblings.findIndex((project) => project.id === sibling.id);
      const insertAt = anchor?.position === 'above' ? at : at + 1;
      childOrder = insertAt + 1;

      /* Where every sibling has a key, the new project takes one between its
         two neighbours and nothing else moves. Otherwise the siblings below
         are pushed down one number, the way it was always done. */
      try {
        if (!siblings.every((project) => project.order_key)) throw new Error('unmigrated');
        orderKey = keyBetween(
          siblings[insertAt - 1]?.order_key ?? null,
          siblings[insertAt]?.order_key ?? null,
        );
      } catch {
        orderKey = null;
        const shifted = siblings.slice(insertAt).map((project, offset) => ({
          id: project.id,
          child_order: insertAt + offset + 2,
        }));
        if (shifted.length > 0) {
          commands.push(command('project_reorder', { projects: shifted }));
        }
      }
    }
    if (orderKey) args.order_key = orderKey;
    else args.child_order = childOrder;

    commands.unshift({ type: 'project_add', uuid: newUuid(), args, temp_id: tempId });

    const mapping = await get().apply(commands, (current) => ({
      ...current,
      projects: {
        ...current.projects,
        [tempId]: {
          id: tempId, name, color,
          parent_id: extra.parentId ?? sibling?.parent_id ?? null,
          child_order: childOrder,
          order_key: orderKey,
          description: extra.description ?? '',
          is_archived: false, is_deleted: false,
          is_favorite: extra.favourite ?? false,
          ...(extra.viewStyle ? { view_style: extra.viewStyle } : {}),
          workspace_id: sibling ? (sibling.workspace_id ?? null) : workspaceId,
        },
      },
    }));
    return mapping[tempId] ?? tempId;
  },
  async archiveProject(id) {
    const project = get().snapshot.projects[id];
    if (!project) return;
    await get().apply([command('project_archive', { id })], (snapshot) => ({
      ...snapshot,
      projects: { ...snapshot.projects, [id]: { ...project, is_archived: true } },
    }));
    get().toast(translate(get().prefs.locale, 'project.archived', { name: project.name }));
  },
  async deleteProject(id) {
    const snapshot = get().snapshot;
    const project = snapshot.projects[id];
    if (!project) return;

    await get().apply([command('project_delete', { id })], (current) => {
      const projects = { ...current.projects };
      const sections = { ...current.sections };
      const items = { ...current.items };
      delete projects[id];
      // The tasks and sections go with it, so the screen must not keep them.
      for (const section of Object.values(sections)) {
        if (section.project_id === id) delete sections[section.id];
      }
      for (const item of Object.values(items)) {
        if (item.project_id === id) delete items[item.id];
      }
      return { ...current, projects, sections, items };
    });
    get().toast(translate(get().prefs.locale, 'project.deleted', { name: project.name }));
  },
  async duplicateProject(id, name) {
    const snapshot = get().snapshot;
    const source = snapshot.projects[id];
    if (!source) return;

    const projectTempId = newUuid();
    const commands: Command[] = [{
      type: 'project_add',
      uuid: newUuid(),
      temp_id: projectTempId,
      args: {
        name,
        color: source.color,
        ...(source.workspace_id ? { workspace_id: source.workspace_id } : {}),
        ...(source.description ? { description: source.description } : {}),
      },
    }];

    /* Sections first, so the tasks that belong to one have somewhere to land.
       Todoist resolves a temp id used as an argument inside the same call, so
       the whole copy is one round trip and can never half-exist. */
    const sectionTempIds = new Map<string, string>();
    for (const section of Object.values(snapshot.sections)
      .filter((s) => s.project_id === id && !s.is_archived && !s.is_deleted)
      .sort(bySectionOrder)) {
      const tempId = newUuid();
      sectionTempIds.set(section.id, tempId);
      commands.push({
        type: 'section_add',
        uuid: newUuid(),
        temp_id: tempId,
        args: { name: section.name, project_id: projectTempId },
      });
    }

    for (const item of Object.values(snapshot.items)
      .filter((i) => i.project_id === id && !i.checked && !i.is_deleted)
      .sort(byChildOrder)) {
      commands.push({
        type: 'item_add',
        uuid: newUuid(),
        temp_id: newUuid(),
        args: {
          content: item.content,
          description: item.description || undefined,
          project_id: projectTempId,
          section_id: item.section_id ? sectionTempIds.get(item.section_id) : undefined,
          priority: item.priority,
          labels: item.labels,
          due: item.due ?? undefined,
        },
      });
    }

    await get().apply(commands, (current) => ({
      ...current,
      projects: {
        ...current.projects,
        [projectTempId]: {
          ...source,
          id: projectTempId,
          name,
          is_favorite: false,
          child_order: source.child_order + 1,
        },
      },
    }));
    get().toast(translate(get().prefs.locale, 'project.duplicated', { name }));
  },
  async updateProjectFields(id, args) {
    await get().apply([command('project_update', { id, ...args })], (snapshot) => {
      const project = snapshot.projects[id];
      if (!project) return snapshot;
      return { ...snapshot, projects: { ...snapshot.projects, [id]: { ...project, ...args } } };
    });
  },
  async createSection(projectId, index, name, wantedId) {
    const tempId = wantedId ?? newUuid();

    /* The new section takes the clicked position, and everything from there
       down moves one place. Giving it the same order as an existing section
       and hoping the sort works it out is how it ended up at the bottom. */
    const existing = Object.values(get().snapshot.sections)
      .filter((s) => s.project_id === projectId && !s.is_archived && !s.is_deleted)
      .sort(bySectionOrder);

    /* Todoist refuses a section with no name. It is created under a
       placeholder the field then selects, so typing replaces it. */
    const untitled = name?.trim() || translate(get().prefs.locale, 'section.untitled');

    const { orderKey, shifted } = placeSection(existing, index);
    const commands = [
      {
        type: 'section_add',
        uuid: newUuid(),
        temp_id: tempId,
        args: orderKey
          ? { name: untitled, project_id: projectId, order_key: orderKey }
          : { name: untitled, project_id: projectId, section_order: index },
      },
      ...shifted.map((section, offset) =>
        command('section_update', { id: section.id, section_order: index + offset + 1 })),
    ];

    await get().apply(commands, (snapshot) => {
      const sections = { ...snapshot.sections };
      shifted.forEach((section, offset) => {
        sections[section.id] = { ...section, section_order: index + offset + 1 };
      });
      sections[tempId] = {
        id: tempId, project_id: projectId, name: untitled,
        section_order: index, order_key: orderKey, is_archived: false, is_deleted: false,
      };
      return { ...snapshot, sections };
    });

    return tempId;
  },
  async moveSection(id, index) {
    const snapshot = get().snapshot;
    const section = snapshot.sections[id];
    if (!section) return;

    const others = Object.values(snapshot.sections)
      .filter((s) => s.project_id === section.project_id && s.id !== id
        && !s.is_archived && !s.is_deleted)
      .sort(bySectionOrder);

    /* Where every section has a key, the moved one takes a key between its
       new neighbours: one write, and the undo-free act it always was. */
    if ([section, ...others].every((s) => s.order_key)) {
      try {
        const orderKey = keyBetween(
          others[index - 1]?.order_key ?? null,
          others[index]?.order_key ?? null,
        );
        if (orderKey === section.order_key) return;
        await get().apply(
          [command('section_update', { id, order_key: orderKey })],
          (snap) => ({
            ...snap,
            sections: { ...snap.sections, [id]: { ...snap.sections[id], order_key: orderKey } },
          }),
        );
        return;
      } catch {
        /* keys out of order: renumber below, as before */
      }
    }

    // The order the list should end up in, then one command per section that
    // actually moved — a whole-list rewrite would churn every row.
    const ordered = [...others.slice(0, index), section, ...others.slice(index)];
    const changed = ordered
      .map((s, order) => ({ section: s, order }))
      .filter(({ section: s, order }) => s.section_order !== order);
    if (changed.length === 0) return;

    await get().apply(
      changed.map(({ section: s, order }) =>
        command('section_update', { id: s.id, section_order: order })),
      (snap) => {
        const sections = { ...snap.sections };
        const keys = keysInOrder(ordered.length);
        ordered.forEach((s, order) => {
          sections[s.id] = { ...sections[s.id], section_order: order, order_key: keys[order] };
        });
        return { ...snap, sections };
      },
    );
  },
  async archiveSection(id) {
    const section = get().snapshot.sections[id];
    if (!section) return;
    await get().apply([command('section_archive', { id })], (snapshot) => ({
      ...snapshot,
      sections: { ...snapshot.sections, [id]: { ...section, is_archived: true } },
    }));
    get().toast(
      translate(get().prefs.locale, 'section.archived', { name: section.name }),
      () => {
        void get().apply([command('section_unarchive', { id })], (snapshot) => ({
          ...snapshot,
          sections: { ...snapshot.sections, [id]: { ...snapshot.sections[id], is_archived: false } },
        }));
      },
    );
  },
  async moveSectionToProject(id, projectId) {
    const snapshot = get().snapshot;
    const section = snapshot.sections[id];
    const target = snapshot.projects[projectId];
    if (!section || !target || section.project_id === projectId) return;
    const last = Math.max(
      -1,
      ...Object.values(snapshot.sections)
        .filter((s) => s.project_id === projectId && !s.is_archived && !s.is_deleted)
        .map((s) => s.section_order),
    );
    await get().apply([command('section_move', { id, project_id: projectId })], (current) => {
      const items = { ...current.items };
      /* Todoist takes the tasks along; the screen must not leave them behind. */
      for (const item of Object.values(items)) {
        if (item.section_id === id) items[item.id] = { ...item, project_id: projectId };
      }
      return {
        ...current,
        items,
        sections: {
          ...current.sections,
          [id]: { ...current.sections[id], project_id: projectId, section_order: last + 1, order_key: null },
        },
      };
    });
    get().toast(translate(get().prefs.locale, 'section.moved', { name: section.name, project: target.name }));
  },
  async duplicateSection(id, name) {
    const snapshot = get().snapshot;
    const source = snapshot.sections[id];
    if (!source) return;

    const siblings = Object.values(snapshot.sections)
      .filter((s) => s.project_id === source.project_id && !s.is_archived && !s.is_deleted)
      .sort(bySectionOrder);
    const index = siblings.findIndex((s) => s.id === id) + 1;
    const { orderKey, shifted } = placeSection(siblings, index);

    /* One batch, so the copy can never half-exist: Todoist resolves a temp id
       used as an argument inside the same call. Open tasks only, with their
       subtasks kept under the copy of their parent. */
    const tempId = newUuid();
    const commands: Command[] = [
      {
        type: 'section_add',
        uuid: newUuid(),
        temp_id: tempId,
        args: orderKey
          ? { name, project_id: source.project_id, order_key: orderKey }
          : { name, project_id: source.project_id, section_order: index },
      },
      ...shifted.map((section, offset) =>
        command('section_update', { id: section.id, section_order: index + offset + 1 })),
    ];

    const open = Object.values(snapshot.items)
      .filter((i) => i.section_id === id && !i.checked && !i.is_deleted);
    const ids = new Set(open.map((i) => i.id));
    const tempOf = new Map<string, string>(open.map((i) => [i.id, newUuid()]));
    const depth = (item: (typeof open)[number]): number => {
      let d = 0;
      for (let at = item; at.parent_id && ids.has(at.parent_id); at = snapshot.items[at.parent_id]) d += 1;
      return d;
    };
    for (const item of [...open].sort((a, b) => depth(a) - depth(b) || byChildOrder(a, b))) {
      commands.push({
        type: 'item_add',
        uuid: newUuid(),
        temp_id: tempOf.get(item.id)!,
        args: {
          content: item.content,
          description: item.description || undefined,
          project_id: source.project_id,
          section_id: tempId,
          parent_id: item.parent_id && ids.has(item.parent_id) ? tempOf.get(item.parent_id) : undefined,
          priority: item.priority,
          labels: item.labels,
          due: item.due ?? undefined,
          duration: item.duration ?? undefined,
        },
      });
    }

    await get().apply(commands, (current) => {
      const sections = { ...current.sections };
      shifted.forEach((section, offset) => {
        sections[section.id] = { ...section, section_order: index + offset + 1 };
      });
      sections[tempId] = {
        id: tempId, project_id: source.project_id, name,
        section_order: index, order_key: orderKey, is_archived: false, is_deleted: false,
      };
      /* The copies are on screen at once, under the ids they will be given. */
      const items = { ...current.items };
      for (const original of open) {
        const copyId = tempOf.get(original.id)!;
        items[copyId] = {
          ...original,
          id: copyId,
          section_id: tempId,
          parent_id: original.parent_id && ids.has(original.parent_id) ? tempOf.get(original.parent_id)! : null,
          day_order: -1,
          added_at: null,
          completed_at: null,
          updated_at: null,
        };
      }
      return { ...current, sections, items };
    });
    get().toast(translate(get().prefs.locale, 'section.duplicated', { name }));
  },
  async removeSection(id) {
    /* Todoist deletes a section's tasks with it. The tasks are moved to the
       project's root first, in the same batch, so only the section goes. */
    const section = get().snapshot.sections[id];
    const orphans = Object.values(get().snapshot.items)
      .filter((item) => item.section_id === id && !item.is_deleted);
    const moves = section
      ? orphans.map((item) => moveItem(item.id, { project_id: section.project_id }))
      : [];
    await get().apply([...moves, command('section_delete', { id })], (snapshot) => {
      const sections = { ...snapshot.sections };
      delete sections[id];
      const items = { ...snapshot.items };
      for (const item of orphans) {
        items[item.id] = { ...items[item.id], section_id: null };
      }
      return { ...snapshot, sections, items };
    });
  },
  async updateSectionFields(id, args) {
    await get().apply([command('section_update', { id, ...args })], (snapshot) => {
      const section = snapshot.sections[id];
      if (!section) return snapshot;
      return { ...snapshot, sections: { ...snapshot.sections, [id]: { ...section, ...args } } };
    });
  },
});
