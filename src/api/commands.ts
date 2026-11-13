import { resolveCommandIds } from './commandIds';
export { resolveCommandIds } from './commandIds';
import { ApiError, pauseForServer, request } from './client';
import { SYNC_RESOURCE_TYPES, type SyncResponse } from './sync';
import { loadJournal, repairClose, type RepairContext } from './repair';

/**
 * Writes to Todoist.
 *
 * Every change the app makes is expressed as a sync command and sent through
 * this queue. Commands carry a uuid so Todoist can discard a duplicate if a
 * retry goes through twice, which makes the queue safe to replay after the
 * network comes back.
 */

export interface Command {
  type: string;
  uuid: string;
  args: Record<string, unknown>;
  temp_id?: string;
  /** Local read-back metadata, retained in the outbox and never sent to Todoist. */
  estimateMinutes?: number | null;
}

export const newUuid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function command(type: string, args: Record<string, unknown>, tempId?: string): Command {
  const cmd: Command = { type, uuid: newUuid(), args };
  if (tempId) {
    cmd.temp_id = tempId;
    cmd.args = { ...args, temp_id: undefined };
  }
  return cmd;
}

/** Todoist accepts up to 100 commands in one call. */
export const MAX_COMMANDS_PER_CALL = 100;
/**
 * And a request body of at most 1 MiB. A hundred ordinary commands never come
 * near it, but a batch built from long descriptions — restoring a deleted
 * branch, writing the settings — could, so a request is also cut by size.
 */
const MAX_BODY_BYTES = 900_000;

export interface CommandResult {
  /** Todoist's answers, one per request, in the order they were sent. */
  responses: SyncResponse[];
  /** Commands Todoist received and refused, with the reason it gave. */
  failures: Array<{ uuid: string; error: string; errorTag?: string; commandType?: string }>;
  /** Every temporary id Todoist resolved, across all the requests. */
  mapping: Record<string, string>;
  /** The uuids of the commands Todoist received, accepted or refused. */
  delivered: string[];
  /**
   * Commands that never left because the network failed part-way, rewritten
   * with the ids resolved before it did. They belong back in the queue.
   */
  undelivered: Command[];
  /** Why the undelivered ones did not go. */
  error?: unknown;
}

/** Whether a command names, in an identifier field, one of these temporary ids. */
function dependsOn(cmd: Command, tempIds: Set<string>): boolean {
  const probe = Object.fromEntries([...tempIds].map((id) => [id, `\u0000${id}`]));
  return JSON.stringify(resolveCommandIds([cmd], probe)[0].args) !== JSON.stringify(cmd.args);
}

/** The form is percent-encoded on the wire; UTF-8 JSON size alone is smaller. */
function encodedSize(commands: Command[], token: string): number {
  const form = new URLSearchParams({
    sync_token: token,
    resource_types: JSON.stringify(SYNC_RESOURCE_TYPES),
    commands: JSON.stringify(commands.map(({ estimateMinutes: _estimate, ...cmd }) => cmd)),
  });
  return new TextEncoder().encode(form.toString()).length;
}

/** Cuts a list into ordered requests, including percent-encoding and metadata. */
function chunk(commands: Command[], token: string): Command[][] {
  const chunks: Command[][] = [];
  let current: Command[] = [];
  for (const cmd of commands) {
    const next = [...current, cmd];
    if (current.length && (next.length > MAX_COMMANDS_PER_CALL || encodedSize(next, token) > MAX_BODY_BYTES)) {
      chunks.push(current);
      current = [cmd];
    } else current = next;
  }
  if (current.length) chunks.push(current);
  return chunks;
}

/**
 * Sends every command, as many requests as it takes.
 *
 * It used to send the first hundred and say nothing about the rest, which the
 * callers then took off the queue as if they had gone. Requests go one after
 * the other, in order, each carrying the sync token the previous one returned
 * and the ids it resolved, because a later command can name something an
 * earlier one created.
 *
 * A request Todoist refuses outright is a refusal of each command in it, and
 * the next request still goes. A request the network loses stops the run: if
 * nothing had gone yet the error is thrown as before, and otherwise what went
 * is returned with what did not, for the caller to queue again.
 */
export async function sendCommands(
  syncToken: string,
  allCommands: Command[],
  account: Omit<RepairContext, 'syncToken'> = {},
): Promise<CommandResult> {
  const commands = allCommands;
  if (commands.length === 0) {
    throw new Error('sendCommands called with no commands');
  }

  /* A close whose repair is under way is the repair's to finish: sending it
     again could advance the task a second time (#432). */
  const resuming = new Set((await loadJournal()).map((entry) => entry.closeUuid));
  const held = commands.filter((cmd) => resuming.has(cmd.uuid));

  const result: CommandResult = {
    responses: [], failures: [], mapping: {}, delivered: [], undelivered: [],
  };
  let token = syncToken;
  const chunks = chunk(commands.filter((cmd) => !resuming.has(cmd.uuid)), token);

  for (let at = 0; at < chunks.length; at += 1) {
    const batch = chunks[at].map((cmd) =>
      at === 0 ? cmd : { ...cmd, args: resolveCommandIds([cmd], result.mapping)[0].args });

    if (encodedSize(batch, token) > MAX_BODY_BYTES) {
      // A single oversized command is rejected locally with a visible reason;
      // unrelated commands in following chunks still have their turn.
      if (batch.length === 1) {
        result.failures.push({ uuid: batch[0].uuid, error: 'This change is too large to send to Todoist.' });
        result.delivered.push(batch[0].uuid);
        continue;
      }
      result.undelivered = chunks.slice(at).flat();
      result.error = new Error('Encoded request is too large');
      return result;
    }
    try {
      const response = await request<SyncResponse>('/sync', {
        method: 'POST',
        form: {
          sync_token: token,
          /* Everything a read asks for: the token this answer returns is kept
             for the next read, and a token moved past a change the answer did
             not carry means that change is never read (#467). */
          resource_types: JSON.stringify(SYNC_RESOURCE_TYPES),
          commands: JSON.stringify(batch.map(({ estimateMinutes: _estimate, ...cmd }) => cmd)),
        },
      });
      // A 200 response is not an acknowledgement of commands it does not name.
      // Keep the entire ambiguous batch with the original UUIDs: Todoist can
      // deduplicate a retry if it processed a command before the answer was lost.
      const status = response?.sync_status;
      const missingMapping = batch.some((cmd) => cmd.temp_id && status?.[cmd.uuid] === 'ok'
        && typeof response?.temp_id_mapping?.[cmd.temp_id] !== 'string');
      const valid = typeof response?.sync_token === 'string' && response.sync_token.length > 0
        && status && typeof status === 'object'
        && batch.every((cmd) => {
          const entry = status[cmd.uuid];
          if (entry === 'ok') {
            // A successful creation is not safely settled until its real id
            // is known. Replaying the same UUID must never strand dependents.
            return !cmd.temp_id || typeof response.temp_id_mapping?.[cmd.temp_id] === 'string';
          }
          return entry && typeof entry === 'object' && typeof entry.error === 'string';
        });
      if (!valid) {
        result.undelivered = chunks.slice(at).flat()
          .map((cmd) => ({ ...cmd, args: resolveCommandIds([cmd], result.mapping)[0].args }));
        result.error = new Error(missingMapping
          ? 'Todoist did not return an identifier for a confirmed creation'
          : 'Todoist did not acknowledge every command');
        return result;
      }
      result.responses.push(response);
      Object.assign(result.mapping, response.temp_id_mapping ?? {});
      const transient = new Set<string>();
      /* A command that names something a deferred command was to create fails
         for that reason alone: it is deferred with it, not refused for good. */
      const deferredTempIds = new Set<string>();
      let transientStatus = 503;
      for (const cmd of batch) {
        const status = response.sync_status?.[cmd.uuid];
        if (!status || status === 'ok') continue;
        const throttled = status.error_code === 429 || /RATE_LIMIT|TOO_MANY_REQUESTS/i.test(status.error_tag ?? '');
        const serverFailure = status.error_code >= 500 && status.error_code <= 599;
        if (throttled || serverFailure || (deferredTempIds.size > 0 && dependsOn(cmd, deferredTempIds))) {
          transient.add(cmd.uuid);
          if (cmd.temp_id) deferredTempIds.add(cmd.temp_id);
          if (throttled) {
            transientStatus = 429;
            const extra = status as typeof status & { error_extra?: { retry_after?: number } };
            pauseForServer((extra.error_extra?.retry_after ?? 1) * 1000);
          }
          continue;
        }
        result.failures.push({ uuid: cmd.uuid, error: status.error,
          ...(status.error_tag ? { errorTag: status.error_tag } : {}),
          ...(status.error_tag === 'INVALID_DATE' && cmd.type === 'item_close' ? { commandType: cmd.type } : {}) });
      }
      token = response.sync_token ?? token;
      if (transient.size) {
        result.delivered.push(...batch.filter((cmd) => !transient.has(cmd.uuid)).map((cmd) => cmd.uuid));
        result.undelivered = [...batch.filter((cmd) => transient.has(cmd.uuid)), ...chunks.slice(at + 1).flat()]
          .map((cmd) => ({ ...cmd, args: resolveCommandIds([cmd], result.mapping)[0].args }));
        result.error = new ApiError('Todoist temporarily deferred a command', transientStatus);
        await repairRefusedCloses(result, commands, held, { ...account, syncToken: token });
        return result;
      }
    } catch (error) {
      /* The cursor this device kept is unknown to Todoist. That says nothing
         about the change: send it again with a full cursor, once. */
      if (error instanceof ApiError && error.isInvalidSyncToken && token !== '*') {
        token = '*';
        at -= 1;
        continue;
      }
      if (error instanceof ApiError && error.status === 413 && batch.length > 1) {
        // A proxy can enforce a lower limit than Todoist. Split and retry
        // the same UUIDs in order instead of treating every edit as refused.
        const middle = Math.ceil(batch.length / 2);
        chunks.splice(at, 1, batch.slice(0, middle), batch.slice(middle));
        at -= 1;
        continue;
      }
      if (error instanceof ApiError && error.isRefusal && !error.isInvalidSyncToken) {
        for (const cmd of batch) result.failures.push({ uuid: cmd.uuid, error: error.detail });
      } else {
        if (at === 0) throw error;
        result.undelivered = chunks.slice(at).flat()
          .map((cmd) => ({ ...cmd, args: resolveCommandIds([cmd], result.mapping)[0].args }));
        result.error = error;
        return result;
      }
    }
    result.delivered.push(...batch.map((cmd) => cmd.uuid));
  }

  await repairRefusedCloses(result, commands, held, { ...account, syncToken: token });
  return result;
}

/**
 * A recurring task Todoist will not close because it cannot read the rule's
 * language is repaired here, below every way of ticking a task (#432). What
 * the network interrupts goes back to the queue with its journal.
 */
async function repairRefusedCloses(
  result: CommandResult,
  commands: Command[],
  held: Command[],
  ctx: RepairContext,
): Promise<void> {
  const byUuid = new Map(commands.map((cmd) => [cmd.uuid, cmd]));
  const targets = [
    ...result.failures
      .filter((failure) => failure.errorTag === 'INVALID_DATE' && failure.commandType === 'item_close')
      .map((failure) => ({ cmd: byUuid.get(failure.uuid), refusal: failure, fresh: true })),
    ...held.map((cmd) => ({ cmd, refusal: { error: 'Date is invalid', errorTag: 'INVALID_DATE' }, fresh: false })),
  ];
  for (const { cmd, refusal, fresh } of targets) {
    if (!cmd) continue;
    const outcome = await repairClose(cmd, ctx, refusal);
    if (fresh) result.failures = result.failures.filter((failure) => failure.uuid !== cmd.uuid);
    if (outcome.kind === 'interrupted') {
      result.delivered = result.delivered.filter((uuid) => uuid !== cmd.uuid);
      result.undelivered.push(cmd);
      result.error ??= new Error('Repair interrupted');
      continue;
    }
    if (!result.delivered.includes(cmd.uuid)) result.delivered.push(cmd.uuid);
    if (outcome.kind === 'repaired') {
      result.responses.push(outcome.response);
      Object.assign(result.mapping, outcome.response.temp_id_mapping ?? {});
    } else {
      result.failures.push({
        uuid: cmd.uuid, error: outcome.error,
        ...(outcome.errorTag ? { errorTag: outcome.errorTag } : {}),
        ...(outcome.errorTag === 'INVALID_DATE' ? { commandType: 'item_close' } : {}),
      });
    }
  }
}

/* ---------- The commands the product actually issues ---------- */

export const updateItem = (id: string, args: Record<string, unknown>): Command =>
  command('item_update', { id, ...args });

export const addItem = (args: Record<string, unknown>, tempId: string): Command => {
  const cmd: Command = { type: 'item_add', uuid: newUuid(), args, temp_id: tempId };
  return cmd;
};

export const completeItem = (id: string): Command => command('item_complete', { id });
export const uncompleteItem = (id: string): Command => command('item_uncomplete', { id });
export const deleteItem = (id: string): Command => command('item_delete', { id });

export const moveItem = (
  id: string,
  target: { project_id?: string; section_id?: string | null; parent_id?: string | null },
): Command => command('item_move', { id, ...target });

export const reorderItems = (items: Array<{ id: string; child_order: number }>): Command =>
  command('item_reorder', { items });

/**
 * The order of tasks in a list made of several projects.
 *
 * `child_order` is counted inside one project, so it has nothing to say about
 * a week drawn from five of them. `day_order` is the number Todoist keeps for
 * exactly that list, and its own Today view reads it.
 */
export const updateDayOrders = (orders: Record<string, number>): Command =>
  command('item_update_day_orders', { ids_to_orders: orders });

export const updateProject = (id: string, args: Record<string, unknown>): Command =>
  command('project_update', { id, ...args });
