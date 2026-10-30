import { beforeEach, describe, expect, it, vi } from 'vitest';
import { emptySnapshot, type Note } from '@/domain/types';
import { SETTINGS_COMMENT_MARKER } from './prefs';

vi.mock('@/api/client', async (original) => ({
  ...(await original<typeof import('@/api/client')>()),
  request: vi.fn(),
}));

import { request } from '@/api/client';
import { readAccountSettings } from './sync';

const account = () => ({
  ...emptySnapshot(),
  user: { id: 'user-1', inbox_project_id: 'inbox' } as ReturnType<typeof emptySnapshot>['user'],
});
const note = (content: string): Note => ({
  id: 'one', item_id: null, project_id: 'inbox', content,
  posted_at: '2026-01-01T00:00:00Z', posted_uid: 'user-1', is_deleted: false, file_attachment: null,
});

beforeEach(() => vi.resetAllMocks());

describe('reading account settings before setup', () => {
  it('waits for the actual settings comment before returning', async () => {
    let resolve!: (value: unknown) => void;
    vi.mocked(request).mockReturnValue(new Promise((done) => { resolve = done; }));
    const pending = readAccountSettings(account());
    let settled = false;
    void pending.then(() => { settled = true; });
    await Promise.resolve();
    expect(settled).toBe(false);
    resolve({ results: [note(`${SETTINGS_COMMENT_MARKER}\n\n{"onboarded":true,"setupDone":true}`)] });
    expect((await pending)?.notes.one).toBeDefined();
  });

  it('returns unknown on a failed or unreadable settings lookup', async () => {
    vi.mocked(request).mockRejectedValueOnce(new Error('offline'));
    expect(await readAccountSettings(account())).toBeNull();
    vi.mocked(request).mockResolvedValueOnce({ results: [note(`${SETTINGS_COMMENT_MARKER}\n\n{`)] });
    expect(await readAccountSettings(account())).toBeNull();
  });

  it('recognises a successful empty lookup for a new account', async () => {
    vi.mocked(request).mockResolvedValueOnce({ results: [] });
    expect(await readAccountSettings(account())).not.toBeNull();
  });

  it('uses a readable cached settings comment without another request', async () => {
    const cached = note(`${SETTINGS_COMMENT_MARKER}\n\n{"onboarded":true,"setupDone":true}`);
    const snapshot = { ...account(), notes: { one: cached } };
    expect(await readAccountSettings(snapshot)).toEqual(snapshot);
    expect(request).not.toHaveBeenCalled();
  });

  it('never treats an unreadable cached comment as a new account', async () => {
    const snapshot = { ...account(), notes: { one: note(`${SETTINGS_COMMENT_MARKER}\n\n{`) } };
    expect(await readAccountSettings(snapshot)).toBeNull();
    expect(request).not.toHaveBeenCalled();
  });
});
