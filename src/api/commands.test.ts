import { beforeEach, describe, expect, it, vi } from 'vitest';
import { command, MAX_COMMANDS_PER_CALL, sendCommands } from './commands';
import { ApiError, request } from './client';
import { SYNC_RESOURCE_TYPES } from './sync';

vi.mock('./client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./client')>()),
  request: vi.fn(),
}));

const sent = vi.mocked(request);

/** Answers every batch with "ok" for each command, and maps any temp ids. */
function answerOk(mapping: Record<string, string> = {}) {
  sent.mockImplementation(async (_path, init) => {
    const batch = JSON.parse((init as { form: { commands: string } }).form.commands) as Array<{ uuid: string }>;
    return {
      sync_token: 'next',
      sync_status: Object.fromEntries(batch.map((cmd) => [cmd.uuid, 'ok'])),
      temp_id_mapping: mapping,
    } as never;
  });
}

beforeEach(() => { sent.mockReset(); });

describe('sendCommands', () => {
  it('asks for every resource a read asks for, since its token becomes the next read\'s (#467)', async () => {
    answerOk();
    await sendCommands('token', [command('item_update', { id: 'a' })]);
    const asked = JSON.parse((sent.mock.calls[0][1] as { form: { resource_types: string } }).form.resource_types);
    expect(asked).toEqual([...SYNC_RESOURCE_TYPES]);
    expect(asked).toEqual(expect.arrayContaining(['reminders', 'workspaces', 'live_notifications', 'user', 'collaborators', 'completed_info']));
  });
  it('retains an invalid date tag and identifies a refused recurring close', async () => {
    const close = command('item_close', { id: 'a' });
    sent.mockResolvedValue({ sync_token: 'next', sync_status: { [close.uuid]: { error_code: 480, error: 'Date is invalid', error_tag: 'INVALID_DATE' } } } as never);
    const result = await sendCommands('token', [close]);
    expect(result.failures).toEqual([{ uuid: close.uuid, error: 'Date is invalid', errorTag: 'INVALID_DATE', commandType: 'item_close' }]);
  });
  it('sends 250 commands in batches of at most 100', async () => {
    answerOk();
    const commands = Array.from({ length: 250 }, (_, at) => command('item_update', { id: `t${at}` }));
    const result = await sendCommands('token', commands);
    const sizes = sent.mock.calls.map(([, init]) =>
      JSON.parse((init as { form: { commands: string } }).form.commands).length);
    expect(sizes).toEqual([MAX_COMMANDS_PER_CALL, MAX_COMMANDS_PER_CALL, 50]);
    expect(result.delivered).toHaveLength(250);
    expect(result.failures).toEqual([]);
  });

  it('rewrites temp ids in later batches once Todoist has answered them', async () => {
    answerOk({ 'tmp-project': 'real-project' });
    const commands = [
      command('project_add', { name: 'New' }, 'tmp-project'),
      ...Array.from({ length: MAX_COMMANDS_PER_CALL }, () =>
        command('item_add', { content: 'x', project_id: 'tmp-project' })),
    ];
    await sendCommands('token', commands);
    const second = JSON.parse((sent.mock.calls[1][1] as { form: { commands: string } }).form.commands);
    expect(second[0].args.project_id).toBe('real-project');
  });

  it('refuses to send nothing', async () => {
    await expect(sendCommands('token', [])).rejects.toThrow();
  });
});

describe('a request Todoist refuses outright (#134)', () => {
  /* The one path a refusal takes: `sendCommands` resolves, with a failure for
     each command in the refused request. It never throws a refusal, which is
     why the callers have no branch for one. */
  it('resolves, with every command of the request as a failure that says why', async () => {
    const commands = [command('item_update', { id: 'a' }), command('item_update', { id: 'b' })];
    sent.mockRejectedValue(new ApiError('Todoist responded 400', 400, { error: 'Invalid argument' }));

    const result = await sendCommands('token', commands);

    expect(result.failures).toEqual(commands.map((cmd) => ({ uuid: cmd.uuid, error: 'Invalid argument' })));
    expect(result.delivered).toEqual(commands.map((cmd) => cmd.uuid));
    expect(result.undelivered).toEqual([]);
  });

  it('still throws a network failure when nothing had gone yet', async () => {
    sent.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(sendCommands('token', [command('item_update', { id: 'a' })])).rejects.toThrow('Failed to fetch');
  });
});

describe('estimate read-back metadata (#151)', () => {
  it('sends the native duration object but never local metadata', async () => {
    answerOk();
    await sendCommands('token', [{ ...command('item_update', { id: 'a', duration: { amount: 25, unit: 'minute' }, labels: [] }), estimateMinutes: 25 }]);
    const [wire] = JSON.parse((sent.mock.calls[0][1] as { form: { commands: string } }).form.commands);
    expect(wire.args.duration).toEqual({ amount: 25, unit: 'minute' });
    expect(wire).not.toHaveProperty('estimateMinutes');
  });
});
