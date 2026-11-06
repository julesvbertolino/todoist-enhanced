import { ApiError, request } from './client';
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

/** Replaces every temporary id that Todoist has resolved, wherever it sits in a command's arguments. */
function resolveIds(value: unknown, mapping: Record<string, string>): unknown {
  if (typeof value === 'string') return mapping[value] ?? value;
  if (Array.isArray(value)) return value.map((entry) => resolveIds(entry, mapping));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [mapping[key] ?? key, resolveIds(entry, mapping)]),
    );
  }
  return value;
}

/** Cuts a list of commands into requests Todoist will accept, keeping their order. */
function chunk(commands: Command[]): Command[][] {
  const chunks: Command[][] = [];
  let current: Command[] = [];
  let bytes = 0;
  for (const cmd of commands) {
    const size = new TextEncoder().encode(JSON.stringify(cmd)).length;
    if (current.length > 0
      && (current.length >= MAX_COMMANDS_PER_CALL || bytes + size > MAX_BODY_BYTES)) {
      chunks.push(current);
      current = [];
      bytes = 0;
    }
    current.push(cmd);
    bytes += size;
  }
  if (current.length > 0) chunks.push(current);
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
  const chunks = chunk(commands.filter((cmd) => !resuming.has(cmd.uuid)));

  for (let at = 0; at < chunks.length; at += 1) {
    const batch = chunks[at].map((cmd) =>
      at === 0 ? cmd : { ...cmd, args: resolveIds(cmd.args, result.mapping) as Command['args'] });

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
      result.responses.push(response);
      Object.assign(result.mapping, response.temp_id_mapping ?? {});
      for (const [uuid, status] of Object.entries(response.sync_status ?? {})) {
        if (status !== 'ok') {
          const cmd = batch.find((candidate) => candidate.uuid === uuid);
          result.failures.push({ uuid, error: status.error,
            ...(status.error_tag ? { errorTag: status.error_tag } : {}),
            ...(status.error_tag === 'INVALID_DATE' && cmd?.type === 'item_close' ? { commandType: cmd.type } : {}) });
        }
      }
      token = response.sync_token ?? token;
    } catch (error) {
      if (error instanceof ApiError && error.isRefusal) {
        for (const cmd of batch) result.failures.push({ uuid: cmd.uuid, error: error.detail });
      } else {
        if (at === 0) throw error;
        result.undelivered = chunks.slice(at).flat()
          .map((cmd) => ({ ...cmd, args: resolveIds(cmd.args, result.mapping) as Command['args'] }));
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
