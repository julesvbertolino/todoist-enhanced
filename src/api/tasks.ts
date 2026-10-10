import { ApiError, request } from './client';
import type { CompletedItem, Item, Note } from '@/domain/types';

/**
 * One task read straight from Todoist, completed ones included.
 *
 * The sync only carries open tasks, so a task ticked off before this device
 * last synced is not in the snapshot. `GET /tasks/{id}` answers for it all the
 * same, with `checked: true`. Null when Todoist no longer has it (deleted).
 */
export async function fetchTask(id: string): Promise<Item | null> {
  try {
    const task = await request<Partial<Item> & { is_collapsed?: boolean }>(`/tasks/${id}`);
    return toItem(task);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 400)) return null;
    throw error;
  }
}

/** A task's comments, oldest first. */
export async function fetchComments(taskId: string): Promise<Note[]> {
  const notes: Note[] = [];
  let cursor: string | undefined;
  do {
    const page = await request<{ results?: Array<Partial<Note> & { task_id?: string }>; next_cursor?: string | null }>(
      '/comments', { query: { task_id: taskId, cursor } },
    );
    for (const note of page.results ?? []) {
      notes.push({
        ...note,
        item_id: note.item_id ?? note.task_id ?? taskId,
        project_id: note.project_id ?? null,
        is_deleted: note.is_deleted ?? false,
      } as Note);
    }
    cursor = page.next_cursor ?? undefined;
  } while (cursor);
  return notes;
}

/** Fills in what the REST answer leaves out, so every list can read it. */
function toItem(task: Partial<Item> & { is_collapsed?: boolean }): Item {
  return {
    user_id: '',
    section_id: null,
    parent_id: null,
    description: '',
    priority: 1,
    due: null,
    deadline: null,
    duration: null,
    labels: [],
    child_order: 0,
    day_order: -1,
    checked: false,
    is_deleted: false,
    added_at: null,
    completed_at: null,
    updated_at: null,
    responsible_uid: null,
    ...task,
    collapsed: task.collapsed ?? task.is_collapsed ?? false,
  } as Item;
}

/**
 * A task drawn from its Logbook entry alone: what the demo has, and what is
 * shown for a task Todoist could not be asked about.
 */
export function itemFromCompleted(entry: CompletedItem): Item {
  return toItem({
    id: entry.task_id ?? entry.id,
    user_id: entry.user_id,
    project_id: entry.project_id,
    section_id: entry.section_id,
    content: entry.content,
    labels: entry.labels ?? [],
    duration: entry.duration ?? null,
    priority: entry.priority ?? 1,
    checked: true,
    completed_at: entry.completed_at,
    note_count: entry.note_count,
  });
}

/**
 * Adds or removes the signed-in person's reaction on a comment.
 *
 * Todoist has dedicated endpoints for this (API v1, "Add Comment Reaction" and
 * "Remove Comment Reaction": `POST /comments/{id}/reactions` and
 * `POST /comments/{id}/reactions/remove`, body `{ reaction }`). The sync
 * command `note_update` does not write reactions: it was accepted and ignored,
 * so the next sync took the reaction back off the screen (#26).
 *
 * Adding returns the comment with its reactions, which is what the caller keeps.
 * Removing answers 204 with no body.
 */
export async function setCommentReaction(
  commentId: string, reaction: string, on: boolean,
): Promise<Note['reactions'] | undefined> {
  const path = `/comments/${encodeURIComponent(commentId)}/reactions${on ? '' : '/remove'}`;
  const answer = await request<Partial<Note> | null>(path, { method: 'POST', json: { reaction }, retries: 1 });
  return answer && typeof answer === 'object' ? answer.reactions : undefined;
}
