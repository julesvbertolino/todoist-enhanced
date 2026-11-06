import { addItem, updateItem, type Command, type CommandResult } from '@/api/commands';
import { fetchTask } from '@/api/tasks';
import { durationMinutes, estimatePatch } from '@/domain/estimates';
import { translate } from '@/i18n';
import type { Snapshot } from '@/domain/types';
import type { AppState } from './types';
import { patchItem } from './helpers';

/** Check server data, never the optimistic copy. Unverified writes stay in the
 * outbox; replaying their uuid is safe and lets a later read finish the check. */
export async function verifyEstimateWrites(
  get: () => AppState, set: (patch: Partial<AppState>) => void,
  commands: Command[], result: CommandResult, optimistic: Snapshot,
): Promise<{ pending: Command[]; handled: Set<string> }> {
  const pending: Command[] = [];
  const handled = new Set<string>();
  const recovery: Command[] = [];
  const patches: Array<{ id: string; item: Snapshot['items'][string]; fields: Record<string, unknown> }> = [];
  const realId = (cmd: Command) => {
    const id = cmd.temp_id ?? String(cmd.args.id);
    return result.mapping[id] ?? get().resolvedIds[id] ?? id;
  };
  // An offline outbox can carry several edits to one estimate. Only its final
  // delivered intent can be compared with the final server task.
  const last = new Map(commands.filter((c) => c.estimateMinutes !== undefined && result.delivered.includes(c.uuid)).map((c) => [realId(c), c.uuid]));
  const returned = new Map(result.responses.flatMap((r) => r.items ?? []).map((i) => [i.id, i]));
  const unread = commands.filter((cmd) => cmd.estimateMinutes !== undefined
    && last.get(realId(cmd)) === cmd.uuid && !returned.has(realId(cmd))
    && !result.failures.some((failure) => failure.uuid === cmd.uuid));
  const unreachable = new Set<string>();
  // Bound concurrency avoids 179 serial round trips without flooding Todoist.
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(4, unread.length) }, async () => {
    while (cursor < unread.length) {
      const cmd = unread[cursor++];
      const id = realId(cmd);
      try { const task = await fetchTask(id); if (task) returned.set(id, task); }
      catch { unreachable.add(id); }
    }
  }));
  for (const cmd of commands) {
    if (cmd.estimateMinutes === undefined || !result.delivered.includes(cmd.uuid)) continue;
    const localId = cmd.temp_id ?? String(cmd.args.id);
    const id = realId(cmd);
    if (last.get(id) !== cmd.uuid) continue;
    const failure = result.failures.find((f) => f.uuid === cmd.uuid);
    if (failure && !/premium|plan|subscription|duration|limit/i.test(failure.error)) continue;
    const item = returned.get(id);
    if (unreachable.has(id)) {
      // Keep the original uuid and resolved id; replays never create a duplicate.
      pending.push(cmd.temp_id && id !== localId
        ? { ...updateItem(id, { duration: cmd.args.duration }), uuid: cmd.uuid, estimateMinutes: cmd.estimateMinutes }
        : cmd);
      continue;
    }
    if (!failure && item && (cmd.estimateMinutes === null ? item.duration === null : durationMinutes(item.duration) === cmd.estimateMinutes)) {
      // fetchTask may have supplied data omitted from the incremental response.
      set({ snapshot: patchItem(get().snapshot, id, item as unknown as Record<string, unknown>) });
      continue;
    }
    if (!failure && !item) continue; // A deleted task is not recreated.
    const original = item ?? get().snapshot.items[id] ?? optimistic.items[localId];
    if (!original) continue;
    handled.add(cmd.uuid);
    const fields = estimatePatch(original, cmd.estimateMinutes, 'tag');
    if (failure && cmd.temp_id && !result.mapping[localId]) {
      const { duration: _duration, ...args } = cmd.args;
      recovery.push(addItem({ ...args, ...fields }, localId));
      patches.push({ id: localId, item: original, fields });
    } else {
      // Keep a calendar block returned by the server; fallback only writes labels.
      recovery.push(updateItem(id, fields));
      patches.push({ id, item: original, fields });
    }
  }
  if (recovery.length > 0) {
    // One message per downgrade, even for a bulk write or later offline replay.
    const notify = get().prefs.estimateStorage !== 'tag';
    get().setPrefs({ estimateStorage: 'tag' });
    Object.assign(result.mapping, await get().apply(recovery, (snapshot) => {
      const items = { ...snapshot.items };
      for (const patch of patches) items[patch.id] = { ...patch.item, ...patch.fields, id: patch.id };
      return { ...snapshot, items };
      /* Always called from inside a write's or a flush's turn with Todoist. */
    }, { inTurn: true }));
    if (notify) get().toast(translate(get().prefs.locale, commands.some((cmd) => handled.has(cmd.uuid) && cmd.estimateMinutes === null) ? 'estimates.clearFailed' : 'estimates.fallback'), undefined, { tone: 'error' });
  }
  return { pending, handled };
}
