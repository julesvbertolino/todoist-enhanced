import { beforeEach, describe, expect, it, vi } from 'vitest';
import { command, sendCommands } from './commands';
import { ApiError, request } from './client';
import { loadJournal } from './repair';

vi.mock('./client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./client')>()),
  request: vi.fn(),
}));

const store = new Map<string, unknown>();
vi.mock('@/db/idb', () => ({
  loadPrefs: async (key: string) => store.get(key) ?? null,
  savePrefs: async (key: string, value: unknown) => { store.set(key, value); },
}));

const sent = vi.mocked(request);

interface Due { string: string; date: string; lang: string; timezone: null; is_recurring: boolean }
type Wire = { type: string; uuid: string; args: { id: string; due?: { lang: string; string: string; date: string } } };

/**
 * A Todoist that behaves as the issue measured: a Dutch rule is only readable
 * under "nl", and a close under any other language is refused. It remembers the
 * answer to every uuid, as Todoist does, and counts the closes it really did.
 */
function todoist(initial: Partial<Due> = {}) {
  const base: Due = { string: 'elke zondag', date: '2026-11-01', lang: 'en', timezone: null, is_recurring: true, ...initial };
  const dues: Record<string, Due> = {};
  const dueOf = (id: string) => (dues[id] ??= { ...base });
  const state = {
    get due() { return dueOf('a'); },
    set due(value: Due) { dues.a = value; },
    closes: 0,
    log: [] as Wire[],
    answers: new Map<string, unknown>(),
    readable: 'nl',
    down: false,
    failOn: undefined as undefined | ((cmd: Wire) => boolean),
    onGet: undefined as undefined | (() => void),
  };
  sent.mockImplementation((async (path: string, init?: { form?: { commands: string } }) => {
    if (state.down) throw new TypeError('offline');
    if (!init?.form) {
      state.onGet?.();
      return { due: { ...dueOf(decodeURIComponent(path.split('/').pop()!)) } };
    }
    const commands = JSON.parse(init.form.commands) as Wire[];
    const sync_status: Record<string, unknown> = {};
    for (const cmd of commands) {
      if (state.failOn?.(cmd)) throw new TypeError('connection lost');
      state.log.push(cmd);
      if (state.answers.has(cmd.uuid)) { sync_status[cmd.uuid] = state.answers.get(cmd.uuid); continue; }
      let answer: unknown = 'ok';
      const task = dueOf(cmd.args.id);
      if (cmd.type === 'item_update' && cmd.args.due) dues[cmd.args.id] = { ...task, ...cmd.args.due };
      if (cmd.type === 'item_close') {
        if (task.lang !== state.readable) {
          answer = { error_code: 480, error: 'Date is invalid', error_tag: 'INVALID_DATE' };
        } else {
          state.closes += 1;
          dues[cmd.args.id] = { ...task, date: `next-${state.closes}` };
        }
      }
      state.answers.set(cmd.uuid, answer);
      sync_status[cmd.uuid] = answer;
    }
    return { sync_token: 'next', sync_status } as never;
  }) as never);
  return state;
}

const types = (state: ReturnType<typeof todoist>) => state.log.map((cmd) => cmd.type);

beforeEach(() => { sent.mockReset(); store.clear(); });

describe('closing a recurring task whose rule and language disagree (#432)', () => {
  it('writes the language back that Todoist reads, closes once, and never completes', async () => {
    const server = todoist();
    const close = command('item_close', { id: 'a' });
    const result = await sendCommands('token', [close], { userId: 'u', userLang: 'fr' });

    expect(result.failures).toEqual([]);
    expect(result.delivered).toContain(close.uuid);
    expect(server.closes).toBe(1);
    expect(server.due.lang).toBe('nl');
    expect(types(server)).not.toContain('item_complete');
    expect(await loadJournal()).toEqual([]);
  });

  it('puts the original language back when no language reads the rule', async () => {
    const server = todoist({ string: 'gibberish' });
    server.readable = 'none';
    const close = command('item_close', { id: 'a' });
    const result = await sendCommands('token', [close], { userId: 'u', userLang: 'fr' });

    expect(server.closes).toBe(0);
    expect(server.due.lang).toBe('en');
    expect(result.failures).toEqual([
      { uuid: close.uuid, error: 'Date is invalid', errorTag: 'INVALID_DATE', commandType: 'item_close' },
    ]);
    expect(await loadJournal()).toEqual([]);
  });

  it('does not retry any other refusal', async () => {
    const server = todoist();
    sent.mockReset();
    sent.mockResolvedValue({
      sync_status: { x: { error_code: 15, error: 'Invalid argument', error_tag: 'INVALID_ARGUMENT' } },
    } as never);
    const close = command('item_close', { id: 'a' });
    sent.mockResolvedValue({
      sync_status: { [close.uuid]: { error_code: 15, error: 'Invalid argument', error_tag: 'INVALID_ARGUMENT' } },
    } as never);
    const result = await sendCommands('token', [close]);
    expect(sent).toHaveBeenCalledTimes(1);
    expect(result.failures).toHaveLength(1);
    expect(server.closes).toBe(0);
  });

  it('leaves a task that is not recurring alone', async () => {
    const server = todoist({ is_recurring: false });
    const close = command('item_close', { id: 'a' });
    const result = await sendCommands('token', [close]);
    expect(result.failures).toHaveLength(1);
    expect(types(server)).toEqual(['item_close']);
  });

  it('keeps the close queued when the network drops between the write and the answer, then finishes without a second close', async () => {
    const server = todoist();
    const close = command('item_close', { id: 'a' });
    // The first repair request reaches Todoist and is applied, but its answer is lost.
    let cut = true;
    const real = sent.getMockImplementation()!;
    sent.mockImplementation((async (path: string, init?: { form?: { commands: string } }) => {
      const answer = await real(path, init as never);
      if (cut && init?.form && JSON.parse(init.form.commands).length === 2) {
        cut = false;
        throw new TypeError('answer lost');
      }
      return answer;
    }) as never);

    const first = await sendCommands('token', [close], { userId: 'u' });
    expect(first.undelivered.map((cmd) => cmd.uuid)).toEqual([close.uuid]);
    expect(first.delivered).not.toContain(close.uuid);
    expect(await loadJournal()).toHaveLength(1);

    const before = server.log.length;
    const second = await sendCommands('token', [close], { userId: 'u' });
    expect(second.failures).toEqual([]);
    expect(second.delivered).toContain(close.uuid);
    expect(server.closes).toBe(1);
    // The original close was not sent again: only the replayed repair steps went.
    expect(server.log.slice(before).every((cmd) => cmd.uuid !== close.uuid)).toBe(true);
    expect(await loadJournal()).toEqual([]);
  });

  it('resumes a restore that could not go while Todoist was unreachable', async () => {
    const server = todoist({ string: 'gibberish' });
    server.readable = 'none';
    const close = command('item_close', { id: 'a' });
    // Cut the line at the restore: the third language-less write.
    server.failOn = (cmd) => cmd.type === 'item_update' && cmd.args.due?.lang === 'en' && server.due.lang !== 'en';
    const first = await sendCommands('token', [close], { userId: 'u' });
    expect(first.undelivered.map((cmd) => cmd.uuid)).toEqual([close.uuid]);
    expect(server.due.lang).not.toBe('en');
    expect((await loadJournal())[0].phase).toBe('restoring');

    server.failOn = undefined;
    const second = await sendCommands('token', [close], { userId: 'u' });
    expect(server.due.lang).toBe('en');
    expect(second.failures).toHaveLength(1);
    expect(second.delivered).toContain(close.uuid);
    expect(await loadJournal()).toEqual([]);
  });

  it('does not overwrite a due someone else changed in the meantime', async () => {
    const server = todoist({ string: 'gibberish' });
    server.readable = 'none';
    const close = command('item_close', { id: 'a' });
    // Another client moves the task just before the restore reads it.
    let reads = 0;
    server.onGet = () => {
      reads += 1;
      if (reads === 2) server.due = { ...server.due, date: '2026-12-24', lang: 'fr' };
    };
    await sendCommands('token', [close], { userId: 'u' });
    expect(server.due).toMatchObject({ date: '2026-12-24', lang: 'fr' });
  });

  it('repairs each broken task of a bulk close and still closes the others', async () => {
    const server = todoist();
    const a = command('item_close', { id: 'a' });
    const b = command('item_close', { id: 'b' });
    const result = await sendCommands('token', [a, b], { userId: 'u', userLang: 'nl' });
    expect(result.failures).toEqual([]);
    expect(result.delivered).toEqual(expect.arrayContaining([a.uuid, b.uuid]));
    expect(server.closes).toBe(2);
  });

  it('a refusal of the whole request is not mistaken for a lost network', async () => {
    const close = command('item_close', { id: 'a' });
    sent.mockRejectedValue(new ApiError('Bad request', 400));
    const result = await sendCommands('token', [close]);
    expect(result.failures).toHaveLength(1);
  });
});
