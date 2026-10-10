/** Tasks: creating, editing, ticking, recurring, deleting and restoring. */
import { command, addItem, type Command, completeItem, deleteItem, newUuid, reorderItems, uncompleteItem, updateItem } from '@/api/commands';
import * as idb from '@/db/idb';
import { fetchComments, fetchTask, itemFromCompleted, setCommentReaction } from '@/api/tasks';
import { isUncompletable, toTodoistPriority, type Item, type Note, type Snapshot } from '@/domain/types';
import { canStoreDurations, estimatePatch } from '@/domain/estimates';
import { toApiDate } from '@/domain/dates';
import { readTime } from '@/domain/nlp';
import { translate } from '@/i18n';
import { byChildOrder, keyBetween, keysInOrder } from '@/domain/orderKey';
import {
  UNDO_TOAST_MS, advanceDemoRecurrence, branchOf, deletionRoots, hidePending, patchItem, pendingDeletes,
  restoreOrder, schedulePersist, settleFromServer,
} from './helpers';
import type { Slice, TasksSlice } from './types';

/** A subtask created with its parent: a title, and the labels it starts with. */
interface NewSubtask { content: string; labels?: string[]; estimateMinutes?: number | null }

/**
 * One task as the screen draws it and the commands that create it.
 *
 * Built from the snapshot it will land in, so a task planned after another in
 * the same batch finds its siblings and takes its place after them.
 */
function planTask(
  snapshot: Snapshot,
  args: Record<string, unknown>,
  storage: 'tag' | 'duration',
): { commands: Command[]; items: Record<string, Item> } {
    const { estimateMinutes, ...fields } = args;
    args = estimateMinutes === undefined ? fields : { ...fields, ...estimatePatch({ labels: (fields.labels as string[]) ?? [] }, estimateMinutes as number | null, storage) };
    const tempId = newUuid();
    // The task appears at once under a temporary id; the sync response that
    // follows carries the real one and replaces it.
    const optimisticItem: Item = {
      id: tempId,
      user_id: snapshot.user?.id ?? '',
      project_id: String(args.project_id ?? snapshot.user?.inbox_project_id ?? ''),
      section_id: (args.section_id as string) ?? null,
      parent_id: (args.parent_id as string) ?? null,
      content: String(args.content ?? ''),
      description: String(args.description ?? ''),
      priority: (args.priority as 1 | 2 | 3 | 4) ?? 1,
      /* A task created from a repeat rule is sent without a date, so that
         Todoist resolves it — but the row drawn a moment later still has to
         have one to read. Today stands in until the real one comes back. */
      due: provisionalDue(args.due as Item['due']),
      deadline: (args.deadline as Item['deadline']) ?? null,
      duration: (args.duration as Item['duration']) ?? null,
      labels: (args.labels as string[]) ?? [],
      /* Last among its siblings, which is where a task just added belongs and
         where the server is about to put it. Left at 0 the row appeared at the
         top of its parent for the half second before the sync answered, and
         then jumped. */
      child_order: nextChildOrder(
        snapshot,
        (args.parent_id as string) ?? null,
        String(args.project_id ?? snapshot.user?.inbox_project_id ?? ''),
        (args.section_id as string) ?? null,
      ),
      order_key: nextOrderKey(
        snapshot,
        (args.parent_id as string) ?? null,
        String(args.project_id ?? snapshot.user?.inbox_project_id ?? ''),
        (args.section_id as string) ?? null,
      ),
      day_order: -1,
      collapsed: false,
      checked: false,
      is_deleted: false,
      added_at: new Date().toISOString(),
      completed_at: null,
      updated_at: new Date().toISOString(),
      responsible_uid: (args.responsible_uid as string) ?? null,
    };

    /* Subtasks go out in the same batch, pointing at the parent's temp id.
       Todoist resolves a temp id used as an argument inside one call, so the
       whole tree is created in a single round trip and can never half-exist. */
    const subtasks = (args.subtasks as Array<string | NewSubtask> | undefined) ?? [];
    const { subtasks: _ignored, ...parentArgs } = args;

    const children = subtasks.map((subtask) => {
      const { content, labels = [], estimateMinutes: minutes } = typeof subtask === 'string' ? { content: subtask } : subtask;
      const patch = minutes === undefined ? { labels } : estimatePatch({ labels }, minutes, storage);
      return {
        tempId: newUuid(),
        minutes,
        args: {
          content,
          project_id: parentArgs.project_id,
          parent_id: tempId,
          ...patch,
        },
      };
    });

    const optimisticChildren: Record<string, Item> = {};
    for (const child of children) {
      optimisticChildren[child.tempId] = {
        ...optimisticItem,
        id: child.tempId,
        parent_id: tempId,
        content: String(child.args.content),
        description: '',
        priority: 1,
        due: null,
        deadline: null,
        labels: (child.args.labels as string[] | undefined) ?? [],
        duration: (child.args as Partial<Item>).duration ?? null,
      };
    }

  return {
    commands: [
      { ...addItem(parentArgs, tempId), ...(storage === 'duration' && estimateMinutes !== undefined ? { estimateMinutes: estimateMinutes as number | null } : {}) },
      ...children.map((c) => ({ ...addItem(c.args, c.tempId), ...(storage === 'duration' && c.minutes !== undefined ? { estimateMinutes: c.minutes } : {}) })),
    ],
    items: { [tempId]: optimisticItem, ...optimisticChildren },
  };
}

/**
 * A due the rest of the app can read.
 *
 * A recurrence is sent to Todoist as a rule with no date on it, on purpose.
 * The row the app draws in the meantime still has to have one, so today fills
 * in until the sync response says where the rule actually landed. Nothing is
 * sent anywhere from here: this value never leaves the local snapshot.
 */
export const provisionalDue = (due: Item['due'] | undefined): Item['due'] => {
  if (!due) return null;
  if (due.date) return due;
  /* The rule can carry a time ("every day at 15h"), and the row should show it
     as it will be once Todoist answers: "Today 15:00", not a date with none. */
  const time = due.is_recurring ? readTime(due.string ?? '') : null;
  const today = toApiDate(new Date());
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    ...due,
    date: time ? `${today}T${pad(time.hours)}:${pad(time.minutes)}:00` : today,
    timezone: due.timezone ?? null,
  };
};

/**
 * The position a new task takes among the ones it is joining.
 *
 * Todoist appends, so the optimistic row has to append too — a row that draws
 * itself at the top and is corrected a moment later reads as a bug even when
 * the result is right.
 */
export function nextChildOrder(
  snapshot: Snapshot,
  parentId: string | null,
  projectId: string,
  sectionId: string | null,
): number {
  const siblings = Object.values(snapshot.items).filter((item) => {
    if (item.is_deleted) return false;
    if (parentId) return item.parent_id === parentId;
    return !item.parent_id && item.project_id === projectId
      && (item.section_id ?? null) === sectionId;
  });
  return siblings.reduce((top, item) => Math.max(top, item.child_order), 0) + 1;
}

/**
 * The key a new task will get from Todoist, at the end of its siblings.
 *
 * Todoist appends a new task by key when its siblings have keys, and a list
 * that sorts by key would draw an optimistic row without one wherever its
 * number happened to fall. Null where the siblings are not migrated.
 */
export function nextOrderKey(
  snapshot: Snapshot,
  parentId: string | null,
  projectId: string,
  sectionId: string | null,
): string | null {
  const siblings = Object.values(snapshot.items).filter((item) => {
    if (item.is_deleted) return false;
    if (parentId) return item.parent_id === parentId;
    return !item.parent_id && item.project_id === projectId
      && (item.section_id ?? null) === sectionId;
  });
  if (siblings.length === 0 || !siblings.every((item) => item.order_key)) return null;
  const last = siblings.sort(byChildOrder)[siblings.length - 1].order_key ?? null;
  try {
    return keyBetween(last, null);
  } catch {
    return null;
  }
}

export const createTasksSlice: Slice<TasksSlice> = (set, get) => ({
  logbookEntry: null,
  setLogbookEntry(entry) {
    set({ logbookEntry: entry });
  },
  async loadTask(id) {
    const state = get();
    if (state.snapshot.items[id]) return 'ready';
    const entry = state.logbookEntry;
    const fallback = entry && (entry.task_id ?? entry.id) === id ? itemFromCompleted(entry) : null;

    /* Kept in the snapshot, ticked: every list already leaves a ticked task
       out, a project's "show completed" is where it belongs anyway, and the
       panel, its edits and its untick then work on it as on any other. Once
       opened, it opens again offline. */
    const keep = (item: Item, notes: Note[] = []) => {
      set((current) => {
        const snapshot = {
          ...current.snapshot,
          items: { ...current.snapshot.items, [item.id]: item },
          notes: { ...current.snapshot.notes, ...Object.fromEntries(notes.map((note) => [note.id, note])) },
        };
        // The demo is never written to the slot a real account's copy lives in.
        if (!current.demo) schedulePersist(snapshot);
        return { snapshot };
      });
    };

    if (state.demo) {
      if (!fallback) return 'gone';
      keep(fallback);
      return 'ready';
    }
    if (!navigator.onLine) return 'offline';
    try {
      const item = await fetchTask(id);
      if (!item || item.is_deleted) return 'gone';
      const notes = await fetchComments(id).catch(() => []);
      keep(item, notes);
      return 'ready';
    } catch {
      return 'offline';
    }
  },
  async addComment(itemId, content, attachment = null) {
    const text = content.trim();
    if ((!text && !attachment) || !get().snapshot.items[itemId]) return false;
    const tempId = newUuid();
    const mapping = await get().apply(
      [{
        type: 'note_add', uuid: newUuid(), temp_id: tempId,
        args: { item_id: itemId, content: text, ...(attachment ? { file_attachment: attachment } : {}) },
      }],
      (snapshot) => ({
        ...snapshot,
        notes: {
          ...snapshot.notes,
          [tempId]: {
            id: tempId, item_id: itemId, project_id: null, content: text,
            posted_at: new Date().toISOString(), posted_uid: snapshot.user?.id ?? '',
            is_deleted: false, file_attachment: attachment,
          } as Note,
        },
      }),
    );
    /* A refused comment is taken off the screen (revertRefused): say so to
       the field, which then gives the words back (#28). */
    return Boolean(mapping[tempId] || get().snapshot.notes[tempId] || get().snapshot.notes[get().resolvedIds[tempId] ?? '']);
  },
  async updateComment(id, content) {
    const note = get().snapshot.notes[id];
    const text = content.trim();
    if (!note || (!text && !note.file_attachment) || text === note.content) return;
    await get().apply(
      [command('note_update', { id, content: text })],
      (snapshot) => ({ ...snapshot, notes: { ...snapshot.notes, [id]: { ...note, content: text } } }),
    );
  },
  async deleteComment(id) {
    const note = get().snapshot.notes[id];
    if (!note) return;
    await get().apply(
      [command('note_delete', { id })],
      (snapshot) => ({ ...snapshot, notes: { ...snapshot.notes, [id]: { ...note, is_deleted: true } } }),
    );
  },
  /* Reactions have their own endpoints at Todoist (see `setCommentReaction`): the change shows at once,
     is sent straight away rather than through the sync queue, and is rolled back with a word if Todoist
     refuses it or cannot be reached. */
  async toggleReaction(id, emoji) {
    const note = get().snapshot.notes[id];
    const me = get().snapshot.user?.id;
    if (!note || !me) return;
    const before = note.reactions ?? null;
    const reactions = { ...(before ?? {}) };
    const who = reactions[emoji] ?? [];
    const on = !who.includes(me);
    const next = on ? [...who, me] : who.filter((uid) => uid !== me);
    if (next.length > 0) reactions[emoji] = next;
    else delete reactions[emoji];
    const put = (value: Note['reactions']) => set((state) => {
      const current = state.snapshot.notes[id];
      if (!current) return {};
      return { snapshot: { ...state.snapshot, notes: { ...state.snapshot.notes, [id]: { ...current, reactions: value } } } };
    });
    put(reactions);
    if (get().demo) return;
    try {
      const saved = await setCommentReaction(get().resolvedIds[id] ?? id, emoji, on);
      if (saved !== undefined) put(saved);
    } catch {
      put(before);
      get().toast(translate(get().prefs.locale, 'comment.reactionFailed'), undefined, { tone: 'error' });
    }
  },
  async duplicateTask(id) {
    const { snapshot } = get();
    const item = snapshot.items[id];
    if (!item) return;
    const open = branchOf([id], snapshot.items).filter((entry) => !entry.checked || entry.id === id);
    await get().restoreTasks(open.map((entry) => ({ ...entry, checked: false, completed_at: null })), []);
  },
  async updateTask(id, args) {
    const item = get().snapshot.items[id];
    if (!item) return;
    const { estimateMinutes: minutes, ...fields } = args;
    const storage = get().prefs.estimateStorage === 'duration' && canStoreDurations(get().snapshot.user) ? 'duration' : 'tag';
    const patch = minutes === undefined ? fields : { ...fields, ...estimatePatch({ labels: (fields.labels as string[]) ?? item.labels }, minutes as number | null, storage) };
    const cmd = updateItem(id, patch);
    if (storage === 'duration' && minutes !== undefined) cmd.estimateMinutes = minutes as number | null;
    await get().apply([cmd], (snapshot) => patchItem(snapshot, id, patch));
  },
  /**
   * Gives a task a repeat rule.
   *
   * Two different objects, deliberately. What goes to Todoist is the rule and
   * nothing else, because Todoist resolves where the rule lands and a date
   * sent from here would pin the first occurrence to this device's guess at
   * it. What goes into the local snapshot has to be a complete due all the
   * same — every list in the app reads `due.date`, and one without it takes
   * the page down — so it keeps the date the task is already sitting on until
   * the sync response arrives with the one the rule really resolves to.
   */
  async setRecurrence(id, rule) {
    const item = get().snapshot.items[id];
    if (!item) return;

    const due = { string: rule.string, lang: rule.lang, is_recurring: true };
    const local = {
      due: {
        ...due,
        date: item.due?.date ?? toApiDate(new Date()),
        timezone: item.due?.timezone ?? null,
      },
    };

    await get().apply([updateItem(id, { due })], (snapshot) => patchItem(snapshot, id, local));
    /* Only Todoist knows the date the rule resolves to. Its answer to the
       update brings it, and the task comes back with a new `updated_at`; one
       that did not come back is fetched. */
    const stamp = item.updated_at;
    await settleFromServer(get, id, (current) => current.updated_at === stamp);
  },
  async setEstimates(entries) {
    const { snapshot, prefs } = get();
    const storage = prefs.estimateStorage === 'duration' && canStoreDurations(snapshot.user) ? 'duration' : 'tag';
    const changes = entries.filter(({ id }) => snapshot.items[id]).map(({ id, minutes }) => ({
      id, minutes, patch: estimatePatch(snapshot.items[id], minutes, storage),
    }));
    if (changes.length === 0) return;
    await get().apply(
      changes.map(({ id, minutes, patch }) => ({ ...updateItem(id, patch), ...(storage === 'duration' ? { estimateMinutes: minutes } : {}) })),
      (current) => changes.reduce((acc, { id, patch }) => patchItem(acc, id, patch), current),
    );
  },
  async toggleTask(id) {
    const item = get().snapshot.items[id];
    if (!item || isUncompletable(item)) return;

    /* `item_close` is Todoist's official recurrence-aware completion command.
       Todoist computes the next date from the rule; sending the current due
       back through item_update_date_complete made the old occurrence bounce
       between dates and occasionally remain checked. */
    if (!item.checked && item.due?.is_recurring) {
      const demo = get().demo;
      await get().apply([command('item_close', { id })], (snapshot) =>
        demo ? advanceDemoRecurrence(snapshot, id) : patchItem(snapshot, id, { checked: true }));
      /* Todoist's answer to the close is the task on its next date, unticked.
         A task still ticked here is one that answer did not carry. */
      await settleFromServer(get, id, (current) => current.checked);
      return;
    }
    const checked = !item.checked;
    const cmd = checked ? completeItem(id) : uncompleteItem(id);
    const done = get().apply([cmd], (snapshot) => patchItem(snapshot, id, { checked }));

    /* No toast: ticking something off is the most common act in the app and a
       message after every one would be a message after everything. It is still
       the thing people most often wish they could take back, so the step is
       recorded and Cmd+Z reaches it — recorded at once, not after Todoist has
       answered, or a quick Cmd+Z undid whatever came before. The way back
       waits for the way there, so the two can never cross on the network. */
    get().pushUndo(item.content, async () => {
      await done;
      const back = checked ? uncompleteItem(id) : completeItem(id);
      await get().apply([back], (snapshot) => patchItem(snapshot, id, { checked: !checked }));
    });
    await done;
  },
  async completeTasks(ids) {
    const snapshot = get().snapshot;
    const items = [...new Set(ids)]
      .map((id) => snapshot.items[id])
      .filter((item): item is Item => !!item && !item.checked && !isUncompletable(item));
    if (items.length === 0) return;
    const recurring = items.filter((item) => item.due?.is_recurring);
    const plain = items.filter((item) => !item.due?.is_recurring);
    const demo = get().demo;

    const done = get().apply(
      [
        ...recurring.map((item) => command('item_close', { id: item.id })),
        ...plain.map((item) => completeItem(item.id)),
      ],
      (current) => items.reduce((acc, item) => (item.due?.is_recurring && demo
        ? advanceDemoRecurrence(acc, item.id)
        : patchItem(acc, item.id, { checked: true })), current),
    );

    /* One step back for the whole selection. A recurring task has already
       rolled on to its next date and has nothing to reopen, so the undo puts
       back the one-off tasks, which is what the toast counts. */
    const label = translate(get().prefs.locale, 'task.completedMany', { count: items.length });
    if (plain.length > 0) {
      get().toast(label, async () => {
        await done;
        await get().apply(
          plain.map((item) => uncompleteItem(item.id)),
          (current) => plain.reduce((acc, item) => patchItem(acc, item.id, { checked: false }), current),
        );
      });
    } else {
      get().toast(label);
    }
    await done;
    const stillTicked = recurring.find((item) => get().snapshot.items[item.id]?.checked);
    if (stillTicked) await settleFromServer(get, stillTicked.id, (current) => current.checked);
  },
  async removeTask(id) {
    await get().removeTasks([id]);
  },
  /**
   * Deletes tasks, and offers them back.
   *
   * The rows go at once; the deletion itself waits for the toast to go (see
   * `pendingDeletes`). Undo inside that window cancels it and puts back the
   * same tasks. After it — Cmd+Z reaches further back than a toast lasts —
   * the deletion has gone out and Todoist has no undelete, so the branch is
   * rebuilt instead, as close to the original as the API allows, and the toast
   * says it is a copy.
   *
   * Subtasks go with their parent when Todoist deletes it, so they are
   * captured too: a branch comes back whole or not at all.
   */
  async removeTasks(ids) {
    const snapshot = get().snapshot;
    /* What the person picked, and what has to be sent: a subtask picked with
       its parent goes with it and is not deleted a second time (#126). */
    const picked = [...new Set(ids.filter((id) => snapshot.items[id]))];
    const wanted = deletionRoots(picked, snapshot.items);
    if (wanted.length === 0) return;

    // Every descendant, so the whole branch comes back rather than its top.
    const doomed = branchOf(wanted, snapshot.items);
    // Their comments too, for the copy a late undo has to make.
    const doomedIds = new Set(doomed.map((item) => item.id));
    const notes = Object.values(snapshot.notes)
      .filter((note) => !note.is_deleted && note.item_id && doomedIds.has(note.item_id));

    const commands = wanted.map(deleteItem);
    const key = newUuid();
    const commit = () => {
      const pending = pendingDeletes.get(key);
      if (!pending) return;
      pendingDeletes.delete(key);
      /* The rows are already gone; this only sends the deletion (and, in the
         demo, only forgets it). */
      void get().apply(pending.commands, (current) => current);
    };

    pendingDeletes.set(key, {
      timer: setTimeout(commit, UNDO_TOAST_MS),
      commands,
      items: doomed,
      queued: false,
    });
    set({ snapshot: hidePending(get().snapshot) });
    if (!get().demo) schedulePersist(get().snapshot);

    /* The message counts the tasks that were selected, so it still says what
       the person did. */
    const label = picked.length === 1
      ? translate(get().prefs.locale, 'task.deletedOne', { name: snapshot.items[picked[0]].content })
      : translate(get().prefs.locale, 'task.deletedMany', { count: picked.length });

    get().toast(label, () => {
      const pending = pendingDeletes.get(key);
      if (pending) {
        // Never sent: the same tasks come straight back.
        clearTimeout(pending.timer);
        pendingDeletes.delete(key);
        if (pending.queued) void idb.dequeue(pending.commands.map((c) => c.uuid));
        const items = { ...get().snapshot.items };
        for (const item of pending.items) items[item.id] = item;
        set({ snapshot: { ...get().snapshot, items } });
        if (!get().demo) schedulePersist(get().snapshot);
        return;
      }
      // Already sent: Todoist has no undelete, so a copy is the best there is.
      void get().restoreTasks(doomed, notes).then(() => {
        get().toast(translate(get().prefs.locale, 'task.restoredAsCopy', {
          count: picked.length,
        }));
      });
    });
  },
  async restoreTasks(items, notes = []) {
    if (items.length === 0) return;

    /* Parents first, so a child's new parent id is known — or at least sent as
       a temp id in the same call, which Todoist resolves inside one request.
       The caller hands the branch over parent-first (`branchOf`); the list is
       only made free of repeats here, since one id twice is two `item_add`s
       sharing a temp id. */
    const ordered = restoreOrder(items);
    const tempIds = new Map(ordered.map((item) => [item.id, newUuid()]));

    const commands = ordered.map((item) => addItem({
      content: item.content,
      description: item.description || undefined,
      project_id: item.project_id,
      section_id: item.section_id ?? undefined,
      parent_id: item.parent_id ? (tempIds.get(item.parent_id) ?? item.parent_id) : undefined,
      priority: item.priority,
      labels: item.labels,
      due: item.due ?? undefined,
      deadline: item.deadline ?? undefined,
      duration: item.duration ?? undefined,
      responsible_uid: item.responsible_uid ?? undefined,
      child_order: item.child_order,
    }, tempIds.get(item.id)!));

    /* The comments come back on the copies, oldest first, attachments
       included: a file already uploaded to Todoist is linked, not re-sent. */
    const noteCommands = [...notes]
      .sort((a, b) => a.posted_at.localeCompare(b.posted_at))
      .filter((note) => note.item_id && tempIds.has(note.item_id))
      .map((note) => command('note_add', {
        item_id: tempIds.get(note.item_id!)!,
        content: note.content,
        ...(note.file_attachment ? { file_attachment: note.file_attachment } : {}),
      }));
    commands.push(...noteCommands);

    await get().apply(commands, (current) => {
      const restored = { ...current.items };
      for (const item of ordered) {
        const tempId = tempIds.get(item.id)!;
        restored[tempId] = {
          ...item,
          id: tempId,
          parent_id: item.parent_id ? (tempIds.get(item.parent_id) ?? item.parent_id) : null,
        };
      }
      return { ...current, items: restored };
    });
  },
  async createTask(args) {
    await get().createTasks([args]);
  },
  /**
   * Several independent tasks, in one request (#152).
   *
   * Each is built exactly as `createTask` builds one, and all of them go out
   * in a single `apply`: the screen shows them at once, Todoist answers once,
   * and a command it refuses is taken back on its own while the rest stay.
   * That is the whole of "partly succeeded", and nothing here can be sent a
   * second time, so nothing is created twice.
   */
  async createTasks(list) {
    const commands: Command[] = [];
    const created: Record<string, Item> = {};
    for (const args of list) {
      const { snapshot } = get();
      const planned = planTask({ ...snapshot, items: { ...snapshot.items, ...created } }, args, get().prefs.estimateStorage === 'duration' && canStoreDurations(snapshot.user) ? 'duration' : 'tag');
      commands.push(...planned.commands);
      Object.assign(created, planned.items);
    }
    if (commands.length === 0) return;
    await get().apply(commands, (current) => ({
      ...current,
      items: { ...current.items, ...created },
    }));
  },
  async setTaskLabels(id, labels) {
    await get().updateTask(id, { labels });
  },
  async setTaskPriority(id, priority) {
    await get().updateTask(id, { priority: toTodoistPriority(priority) });
  },
  /**
   * Advances a recurring task to its next occurrence.
   *
   * Todoist has no skip command: closing a recurring task is what rolls the
   * series forward, which is exactly what the menu offers here.
   */
  async skipOccurrence(id) {
    const item = get().snapshot.items[id];
    if (!item?.due?.is_recurring) return;
    const demo = get().demo;
    await get().apply([command('item_close', { id })], (snapshot) =>
      demo ? advanceDemoRecurrence(snapshot, id) : patchItem(snapshot, id, { checked: true }));
    await settleFromServer(get, id, (current) => current.checked);
  },
  async skipOccurrences(ids) {
    const recurring = [...new Set(ids)].filter(
      (id) => get().snapshot.items[id]?.due?.is_recurring,
    );
    if (recurring.length === 0) return 0;
    const demo = get().demo;
    await get().apply(
      recurring.map((id) => command('item_close', { id })),
      (snapshot) => recurring.reduce(
        (current, id) => demo
          ? advanceDemoRecurrence(current, id)
          : patchItem(current, id, { checked: true }),
        snapshot,
      ),
    );
    /* One incremental sync at most, whatever the size of the selection: the
       first task still ticked is enough to say the answer was incomplete. */
    const stillTicked = recurring.find((id) => get().snapshot.items[id]?.checked);
    if (stillTicked) await settleFromServer(get, stillTicked, (current) => current.checked);
    return recurring.length;
  },
  async reorderSubtasks(ids) {
    const items = get().snapshot.items;
    const listed = ids.filter((id) => items[id]);
    const current = Object.values(items)
      .filter((item) => listed.includes(item.id))
      .sort(byChildOrder)
      .map((item) => item.id);
    if (listed.length === 0 || listed.join() === current.join()) return;

    const orders = listed.map((id, index) => ({ id, child_order: index + 1 }));
    const keys = keysInOrder(listed.length);
    await get().apply([reorderItems(orders)], (snapshot) => {
      const next = { ...snapshot.items };
      listed.forEach((id, index) => {
        if (next[id]) next[id] = { ...next[id], child_order: index + 1, order_key: keys[index] };
      });
      return { ...snapshot, items: next };
    });
  },
});
