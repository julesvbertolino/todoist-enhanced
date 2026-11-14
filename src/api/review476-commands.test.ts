import { beforeEach, describe, expect, it, vi } from 'vitest';
import { command, sendCommands } from './commands';
import { ApiError, request } from './client';

vi.mock('@/db/idb', () => ({ loadPrefs: vi.fn(async () => null), savePrefs: vi.fn(async () => {}) }));
vi.mock('./client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./client')>()),
  request: vi.fn(),
}));

const sent = vi.mocked(request);
beforeEach(() => { sent.mockReset(); });

const bodyOf = (call: number) => (sent.mock.calls[call][1] as { form: Record<string, string> }).form;

describe('a write whose sync cursor Todoist no longer knows', () => {
  it('is not a refusal of the user\'s change: it is sent again with a full cursor', async () => {
    const edit = command('item_update', { id: 'a', content: 'kept' });
    sent.mockRejectedValueOnce(new ApiError('Todoist responded 400', 400, { error_tag: 'INVALID_SYNC_TOKEN' }));
    sent.mockImplementationOnce(async () => ({ sync_token: 'fresh', full_sync: true, sync_status: { [edit.uuid]: 'ok' } }) as never);
    const result = await sendCommands('stale', [edit]);
    expect(result.failures).toEqual([]);
    expect(result.delivered).toEqual([edit.uuid]);
    expect(bodyOf(1).sync_token).toBe('*');
  });
  it('does not loop when the full cursor is refused too', async () => {
    const edit = command('item_update', { id: 'a' });
    sent.mockRejectedValue(new ApiError('Todoist responded 400', 400, { error_tag: 'INVALID_SYNC_TOKEN' }));
    const result: Awaited<ReturnType<typeof sendCommands>> | Error = await sendCommands('stale', [edit]).catch((error: Error) => error);
    expect(sent.mock.calls.length).toBeLessThanOrEqual(2);
    // Whatever the outcome, the edit must not be reported as refused and dropped.
    if (!(result instanceof Error)) expect(result.delivered).not.toContain(edit.uuid);
  });
});

describe('a command Todoist defers while a later one in the same request depends on it', () => {
  it('keeps the dependent command for the retry instead of treating its refusal as final', async () => {
    const add = command('item_add', { content: 'new', project_id: 'p' }, 'tmp-1');
    const edit = command('item_update', { id: 'tmp-1', priority: 4 });
    sent.mockResolvedValueOnce({
      sync_token: 'next',
      sync_status: {
        [add.uuid]: { error_code: 429, error: 'Too many requests', error_tag: 'RATE_LIMIT' },
        [edit.uuid]: { error_code: 22, error: 'Invalid temporary id', error_tag: 'INVALID_TEMP_ID' },
      },
    } as never);
    const result = await sendCommands('token', [add, edit]);
    expect(result.failures).toEqual([]);
    expect(result.undelivered.map((cmd) => cmd.uuid)).toEqual([add.uuid, edit.uuid]);
    expect(result.delivered).toEqual([]);
  });
});
