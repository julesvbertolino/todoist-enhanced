import { confirmUndatedMove } from '@/domain/confirmUndatedMove';
/** Tasks going somewhere: sent to a place, moved, and changed many at a time. */
import { type Command, moveItem, reorderItems, updateItem } from '@/api/commands';
import type { Item, Snapshot } from '@/domain/types';
import { translate } from '@/i18n';
import { descendantsOf, dropMutation, moveArgs, planNestMany } from '@/domain/dnd';
import { byChildOrder, keysInOrder } from '@/domain/orderKey';
import { patchItem } from './helpers';
import type { Slice, TasksMoveSlice } from './types';

export const createTasksMoveSlice: Slice<TasksMoveSlice> = (_set, get) => ({
  async sendTo(id, target, destination) {
    const item = get().snapshot.items[id];
    if (!item) return;
    if (!await confirmUndatedMove([item], target, get().prefs.locale)) return;
    const mutation = dropMutation(item, target);
    if (!mutation) return;

    // Captured before the change so the undo can put every field back.
    const before = {
      due: item.due,
      labels: item.labels,
      project_id: item.project_id,
      section_id: item.section_id,
      parent_id: item.parent_id,
    };
    const patch = (fields: Record<string, unknown>) => (snapshot: Snapshot): Snapshot => {
      const current = snapshot.items[id];
      if (!current) return snapshot;
      return { ...snapshot, items: { ...snapshot.items, [id]: { ...current, ...fields } } };
    };

    if (mutation.update) {
      await get().apply([updateItem(id, mutation.update)], patch(mutation.update));
    } else if (mutation.move) {
      // One destination, and a move to a project or a section lands at its top level.
      await get().apply(
        [moveItem(id, moveArgs(mutation.move))],
        patch({ ...mutation.move, parent_id: null }),
      );
    }

    /* A move is undone by a move, the same way DragProvider undoes a drop:
       `item_update` takes no project or section, so sending them there put the
       task back on screen and left it where it was on the server. */
    const undo = !mutation.move
      ? updateItem(id, { due: before.due, labels: before.labels })
      : before.parent_id
        ? moveItem(id, { parent_id: before.parent_id })
        : moveItem(id, moveArgs({ project_id: before.project_id, section_id: before.section_id }));

    /* A null destination asks for no toast. In a review the row answering the
       question is the feedback — it leaves the list, or its button lights up —
       and a message about a change you can see is a message in the way. */
    if (destination === null) return;
    get().toast(
      translate(get().prefs.locale, 'task.movedTo', { destination }),
      () => void get().apply([undo], patch(before)),
    );
  },
  /**
   * The same destination, for a set of tasks.
   *
   * One request, one toast and one undo: a selection you moved on purpose is a
   * single decision, and taking it back a task at a time would be absurd.
   */
  async sendManyTo(ids, target, destination) {
    const snapshot = get().snapshot;
    if (!await confirmUndatedMove(ids.map((id) => snapshot.items[id]).filter(Boolean), target, get().prefs.locale)) return;
    const changes = ids
      .map((id) => {
        const item = snapshot.items[id];
        if (!item) return null;
        const mutation = dropMutation(item, target);
        if (!mutation?.update) return null;
        return {
          id,
          update: mutation.update,
          before: { due: item.due, labels: item.labels },
        };
      })
      .filter((change): change is NonNullable<typeof change> => change !== null);

    if (changes.length === 0) return;

    const patchAll = (
      fields: (change: (typeof changes)[number]) => Record<string, unknown>,
    ) => (current: Snapshot): Snapshot =>
      changes.reduce((acc, change) => patchItem(acc, change.id, fields(change)), current);

    await get().apply(
      changes.map((change) => updateItem(change.id, change.update)),
      patchAll((change) => change.update),
    );

    if (destination === null) return;
    get().toast(
      translate(get().prefs.locale, 'task.movedManyTo', {
        count: changes.length, destination,
      }),
      () => void get().apply(
        changes.map((change) => updateItem(change.id, change.before)),
        patchAll((change) => change.before as unknown as Record<string, unknown>),
      ),
    );
  },
  async updateMany(ids, fieldsFor, message) {
    const snapshot = get().snapshot;
    const changes = ids
      .map((id) => {
        const item = snapshot.items[id];
        if (!item) return null;
        const update = fieldsFor(item);
        if (!update) return null;
        // Only the keys being written, so the undo puts back what was taken
        // and touches nothing a sync may have changed in the meantime.
        const before = Object.fromEntries(
          Object.keys(update).map((key) => [key, (item as unknown as Record<string, unknown>)[key]]),
        );
        return { id, update, before };
      })
      .filter((change): change is NonNullable<typeof change> => change !== null);

    if (changes.length === 0) return;

    const patchAll = (
      fields: (change: (typeof changes)[number]) => Record<string, unknown>,
    ) => (current: Snapshot): Snapshot =>
      changes.reduce((acc, change) => patchItem(acc, change.id, fields(change)), current);

    /* The screen changes the moment `apply` starts, so the toast says so
       then rather than after the round trip (#162). Its undo waits for that
       write to settle first: sent earlier, it could reach Todoist before the
       change it undoes, and be undone by it. */
    const done = get().apply(
      changes.map((change) => updateItem(change.id, change.update)),
      patchAll((change) => change.update),
    );

    get().toast(message, async () => {
      await done;
      await get().apply(
        changes.map((change) => updateItem(change.id, change.before)),
        patchAll((change) => change.before),
      );
    });
    await done;
  },
  /**
   * A selection, into a project.
   *
   * `item_move` rather than `item_update`: a project is where a task lives,
   * not a field on it, and the section has to go with it — a section id from
   * the old project would leave the task in a place its new project has no
   * name for.
   */
  async moveMany(ids, target, destination) {
    const snapshot = get().snapshot;
    const changes = ids
      .map((id) => {
        const item = snapshot.items[id];
        if (!item || (item.project_id === target.project_id
          && (item.section_id ?? null) === target.section_id)) return null;
        return {
          id,
          before: {
            project_id: item.project_id,
            section_id: item.section_id,
            parent_id: item.parent_id,
          },
        };
      })
      .filter((change): change is NonNullable<typeof change> => change !== null);

    if (changes.length === 0) return;

    const patchAll = (
      fields: (change: (typeof changes)[number]) => Record<string, unknown>,
    ) => (current: Snapshot): Snapshot =>
      changes.reduce((acc, change) => patchItem(acc, change.id, fields(change)), current);

    /* `item_move` to a project or a section lifts a subtask out from under its
       parent, so the snapshot says so too. */
    await get().apply(
      changes.map((change) => moveItem(change.id, moveArgs(target))),
      patchAll(() => ({
        project_id: target.project_id,
        section_id: target.section_id,
        parent_id: null,
      })),
    );

    /* The way back takes one destination, like the way there: `item_move`
       refuses a project and a section together. A task that was a subtask
       goes back under its parent, which also puts it back in the parent's
       project and section; one whose parent has gone since goes back to where
       it stood. */
    const back = (change: (typeof changes)[number]): Command => {
      const { parent_id: parentId, project_id: projectId, section_id: sectionId } = change.before;
      return parentId && get().snapshot.items[parentId]
        ? moveItem(change.id, { parent_id: parentId })
        : moveItem(change.id, moveArgs({ project_id: projectId, section_id: sectionId }));
    };

    get().toast(
      translate(get().prefs.locale, 'task.movedManyTo', {
        count: changes.length, destination,
      }),
      () => void get().apply(
        changes.map(back),
        patchAll((change) => change.before as unknown as Record<string, unknown>),
      ),
    );
  },
  /**
   * A selection, dropped inside one task.
   *
   * Every picked task becomes a direct subtask of the target, in the order it
   * was given, as one batch with one toast and one undo. The moves and the
   * numbering that fixes their order go out together, and if Todoist refuses
   * any of the moves the ones it accepted are put back: the drop looked like
   * one act, so it never stays half done.
   */
  async nestMany(ids, parentId) {
    const { snapshot } = get();
    const parent = snapshot.items[parentId];
    const plan = planNestMany(snapshot.items, ids, parentId);
    const locale = get().prefs.locale;
    if (!parent || !plan.ok) {
      if (parent && !plan.ok && (plan.reason === 'inside-itself' || plan.reason === 'too-deep')) {
        get().toast(
          translate(locale, 'drop.cannotNest', { name: parent.content }), undefined, { tone: 'error' },
        );
      }
      return false;
    }

    const moving = plan.ids;
    const movingSet = new Set(moving);
    const siblings = Object.values(snapshot.items)
      .filter((other) => other.parent_id === parentId && !other.is_deleted && !movingSet.has(other.id))
      .sort(byChildOrder)
      .map((other) => other.id);
    const arranged = [...siblings, ...moving];
    const keys = keysInOrder(arranged.length);
    const numbered = arranged.map((id, index) => ({ id, child_order: index + 1 }));

    // Everything the numbering touches, so the undo can put it back exactly.
    const was = (id: string) => {
      const task = snapshot.items[id];
      return {
        id, parent_id: task.parent_id, project_id: task.project_id, section_id: task.section_id,
        child_order: task.child_order, order_key: task.order_key ?? null,
      };
    };
    const before = arranged.map(was);

    const below = moving.flatMap((id) => descendantsOf(snapshot.items, id));
    const place = (current: Snapshot): Snapshot => {
      const items = { ...current.items };
      moving.forEach((id) => {
        if (items[id]) {
          items[id] = {
            ...items[id], parent_id: parentId,
            project_id: parent.project_id, section_id: parent.section_id,
          } as Item;
        }
      });
      for (const id of below) {
        if (items[id]) items[id] = { ...items[id], project_id: parent.project_id, section_id: parent.section_id } as Item;
      }
      arranged.forEach((id, index) => {
        if (items[id]) items[id] = { ...items[id], child_order: index + 1, order_key: keys[index] };
      });
      return { ...current, items };
    };
    const restore = (only: string[]) => (current: Snapshot): Snapshot => {
      const items = { ...current.items };
      const keep = new Set(only);
      for (const entry of before) {
        if (!keep.has(entry.id) && !siblings.includes(entry.id)) continue;
        if (!items[entry.id]) continue;
        items[entry.id] = {
          ...items[entry.id],
          parent_id: entry.parent_id, project_id: entry.project_id, section_id: entry.section_id,
          child_order: entry.child_order, order_key: entry.order_key,
        } as Item;
      }
      for (const id of below) {
        const owner = snapshot.items[id];
        if (items[id] && owner) {
          items[id] = { ...items[id], project_id: owner.project_id, section_id: owner.section_id } as Item;
        }
      }
      return { ...current, items };
    };
    const back = (entry: ReturnType<typeof was>): Command => {
      const home = entry.parent_id && get().snapshot.items[entry.parent_id];
      return home
        ? moveItem(entry.id, { parent_id: entry.parent_id! })
        : moveItem(entry.id, moveArgs({ project_id: entry.project_id, section_id: entry.section_id }));
    };
    const renumber = () => reorderItems(before.map(({ id, child_order }) => ({ id, child_order })));

    await get().apply(
      [...moving.map((id) => moveItem(id, { parent_id: parentId })), reorderItems(numbered)],
      place,
    );

    const now = get().snapshot.items;
    const stuck = moving.filter((id) => now[id]?.parent_id === parentId);
    if (stuck.length !== moving.length) {
      if (stuck.length > 0) {
        await get().apply(
          [...before.filter((entry) => stuck.includes(entry.id)).map(back), renumber()],
          restore(stuck),
        );
      }
      get().toast(translate(locale, 'drop.nestFailed', { name: parent.content }), undefined, { tone: 'error' });
      return false;
    }

    get().toast(
      translate(locale, 'drop.nestedMany', { count: moving.length, name: parent.content }),
      () => void get().apply(
        [...before.filter((entry) => movingSet.has(entry.id)).map(back), renumber()],
        restore(moving),
      ),
    );
    return true;
  },
  /**
   * Sends a task to one place.
   *
   * `item_move` takes a project or a section, never both, and the one it is
   * given settles the other: a task sent to a project is no longer in any of
   * its sections, and a task sent to a section is in that section's project.
   * The command carries the destination alone, so the snapshot has to say the
   * rest or the task keeps drawing where it used to be until the next sync
   * quietly puts it back.
   */
  async moveTask(id, target) {
    const { sections } = get().snapshot;
    const settled = target.section_id
      ? { ...target, project_id: sections[target.section_id]?.project_id ?? target.project_id }
      : { ...target, section_id: null };
    await get().apply([moveItem(id, target)], (snapshot) => patchItem(snapshot, id, settled));
  },
});
