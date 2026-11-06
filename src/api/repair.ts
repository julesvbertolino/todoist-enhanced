import { ApiError, request } from './client';
import { SYNC_RESOURCE_TYPES, type SyncResponse } from './sync';
import type { Command } from './commands';
import * as idb from '@/db/idb';

/**
 * Closing a recurring task Todoist refuses with `INVALID_DATE` (#432).
 *
 * The task's repeat text is written in one language and its `lang` says
 * another, so Todoist cannot read the rule when asked for the next date. The
 * way out is to write the same rule back with a language that reads it and
 * close again — never `item_complete`, which ends the series.
 *
 * Writing the language and closing are two writes, and the app can be closed,
 * lose the network or switch account between them. So the repair is a journal
 * kept on the device, and every write it makes carries a uuid derived from the
 * close it repairs and the step it is. Played again after a lost answer,
 * Todoist returns the answer it already gave instead of doing it twice, which
 * is what keeps a close from advancing the task two occurrences. While an
 * entry is in the journal, the original close is never sent again: the entry
 * decides. The close stays queued until the entry is settled, and an entry is
 * only settled by a repaired close or by the language being put back.
 */

const JOURNAL_KEY = 'due-repair';

/** The languages Todoist writes a due in, tried after the account's and the task's own. */
const TODOIST_LANGS = [
  'en', 'fr', 'de', 'es', 'it', 'nl', 'pt', 'pt_BR', 'da', 'fi', 'nb', 'sv', 'pl', 'ru',
  'tr', 'ja', 'ko', 'zh_CN', 'zh_TW',
];

interface StoredDue {
  string: string;
  date: string;
  timezone: string | null;
  lang: string;
}

export interface RepairEntry {
  closeUuid: string;
  itemId: string;
  userId?: string;
  /** The due as Todoist had it before the repair touched it. */
  original: StoredDue;
  phase: 'repairing' | 'restoring';
  /** Languages not tried yet. */
  remaining: string[];
  /** The language being written; it may or may not have reached Todoist. */
  attempt?: string;
}

export interface RepairContext {
  syncToken: string;
  userId?: string;
  userLang?: string;
}

export type RepairOutcome =
  | { kind: 'repaired'; response: SyncResponse }
  | { kind: 'refused'; error: string; errorTag?: string }
  | { kind: 'interrupted' };

export async function loadJournal(): Promise<RepairEntry[]> {
  return (await idb.loadPrefs<RepairEntry[]>(JOURNAL_KEY)) ?? [];
}

async function saveEntry(entry: RepairEntry): Promise<void> {
  const rest = (await loadJournal()).filter((other) => other.closeUuid !== entry.closeUuid);
  await idb.savePrefs(JOURNAL_KEY, [...rest, entry]);
}

async function dropEntry(closeUuid: string): Promise<void> {
  const rest = (await loadJournal()).filter((other) => other.closeUuid !== closeUuid);
  await idb.savePrefs(JOURNAL_KEY, rest);
}

/** The same text always gives the same uuid, so a replayed step is recognised by Todoist. */
export function stepUuid(base: string, step: string): string {
  const text = `${base}:${step}`;
  const words = [0x811c9dc5, 0x01000193, 0x9e3779b1, 0x85ebca6b].map((seed) => {
    let hash = seed >>> 0;
    for (let at = 0; at < text.length; at += 1) {
      hash = Math.imul(hash ^ text.charCodeAt(at), 0x01000193 + (seed & 0xff)) >>> 0;
    }
    return hash.toString(16).padStart(8, '0');
  });
  const hex = words.join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

const setDue = (id: string, due: StoredDue, lang: string, uuid: string): Command => ({
  type: 'item_update',
  uuid,
  args: {
    id,
    due: {
      /* Without `is_recurring`, Todoist reads the rewrite as a one-off date
         and the close that follows ends the series (measured on #432). */
      string: due.string, date: due.date, lang, is_recurring: true,
      ...(due.timezone ? { timezone: due.timezone } : {}),
    },
  },
});

/** With the caller's sync token, so the answer carries the task as it now stands. */
const post = (commands: Command[], syncToken = '*', resources: string[] = []) =>
  request<SyncResponse>('/sync', {
    method: 'POST',
    form: {
      sync_token: syncToken,
      resource_types: JSON.stringify(resources),
      commands: JSON.stringify(commands),
    },
  });

interface ServerDue { string: string; date: string; timezone: string | null; lang: string; is_recurring: boolean }

/** Todoist's own copy of a task's due: the screen's may already show the next date. */
async function readDue(id: string): Promise<ServerDue | null> {
  const task = await request<{ due?: ServerDue | null }>(`/tasks/${encodeURIComponent(id)}`);
  return task.due ?? null;
}

/** Everything but the network failing means the question has an answer. */
const isNetwork = (error: unknown) => !(error instanceof ApiError && error.isRefusal);

/**
 * Puts the language back, unless someone else has touched the task since.
 * `false` when the network failed and it is still to do.
 */
async function restore(entry: RepairEntry): Promise<boolean> {
  try {
    const current = await readDue(entry.itemId);
    const untouched = current
      && current.string === entry.original.string
      && current.date === entry.original.date
      && current.lang !== entry.original.lang;
    if (untouched) {
      await post([setDue(entry.itemId, entry.original, entry.original.lang,
        stepUuid(entry.closeUuid, 'restore'))]);
    }
  } catch (error) {
    if (isNetwork(error)) return false;
    // The task is gone or Todoist refuses to read it: there is nothing left to put back.
  }
  await dropEntry(entry.closeUuid);
  return true;
}

const sameAccount = (entry: RepairEntry, ctx: RepairContext) =>
  !entry.userId || !ctx.userId || entry.userId === ctx.userId;

/**
 * Repairs a refused close, or carries on a repair a previous run did not finish.
 * An entry that belongs to another account is left as it is.
 */
export async function repairClose(
  close: Command,
  ctx: RepairContext,
  refusal: { error: string; errorTag?: string },
): Promise<RepairOutcome> {
  const itemId = String(close.args.id);
  let entry = (await loadJournal()).find((candidate) => candidate.closeUuid === close.uuid);

  if (entry && !sameAccount(entry, ctx)) return { kind: 'interrupted' };

  if (!entry) {
    let due: ServerDue | null;
    try {
      due = await readDue(itemId);
    } catch (error) {
      return isNetwork(error) ? { kind: 'interrupted' } : { kind: 'refused', ...refusal };
    }
    if (!due?.is_recurring) return { kind: 'refused', ...refusal };
    const order = [ctx.userLang, due.lang, ...TODOIST_LANGS]
      .filter((lang): lang is string => !!lang && lang !== due.lang);
    entry = {
      closeUuid: close.uuid,
      itemId,
      ...(ctx.userId ? { userId: ctx.userId } : {}),
      original: { string: due.string, date: due.date, timezone: due.timezone, lang: due.lang },
      phase: 'repairing',
      remaining: [...new Set(order)],
    };
    await saveEntry(entry);
  }

  let last: { error: string; errorTag?: string } = refusal;
  while (entry.phase === 'repairing') {
    const lang = entry.attempt ?? entry.remaining.shift();
    if (!lang) { entry.phase = 'restoring'; break; }
    entry.attempt = lang;
    await saveEntry(entry);

    const updateUuid = stepUuid(entry.closeUuid, `update:${lang}`);
    const closeUuid = stepUuid(entry.closeUuid, `close:${lang}`);
    let response: SyncResponse;
    try {
      response = await post([
        setDue(entry.itemId, entry.original, lang, updateUuid),
        { type: 'item_close', uuid: closeUuid, args: { id: entry.itemId } },
      /* Its answer's token becomes the snapshot's: it must carry every
         resource a read does, or what changed meanwhile is skipped (#467). */
      ], ctx.syncToken, [...SYNC_RESOURCE_TYPES]);
    } catch (error) {
      if (isNetwork(error)) return { kind: 'interrupted' };
      entry.phase = 'restoring';
      break;
    }

    const status = response.sync_status ?? {};
    const closed = status[closeUuid];
    if (closed === 'ok') {
      await dropEntry(entry.closeUuid);
      return { kind: 'repaired', response };
    }
    entry.attempt = undefined;
    if (closed && closed.error_tag === 'INVALID_DATE' && status[updateUuid] === 'ok') {
      last = { error: closed.error, errorTag: closed.error_tag };
      await saveEntry(entry);
      continue;
    }
    const failed = [status[updateUuid], closed]
      .find((value): value is Exclude<typeof value, 'ok' | undefined> => !!value && value !== 'ok');
    if (failed) last = { error: failed.error, errorTag: failed.error_tag };
    entry.phase = 'restoring';
  }

  await saveEntry(entry);
  if (!(await restore(entry))) return { kind: 'interrupted' };
  return { kind: 'refused', ...last };
}

/**
 * Settles entries whose close is no longer queued — the account was left, or
 * the queue was cleared — by putting their language back.
 */
export async function settleOrphans(ctx: RepairContext, queued: Set<string>): Promise<void> {
  for (const entry of await loadJournal()) {
    if (queued.has(entry.closeUuid) || !entry.userId || entry.userId !== ctx.userId) continue;
    await restore(entry);
  }
}
