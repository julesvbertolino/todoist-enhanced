import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { freshAccessToken, forgetCredentials, readCredentials } from './oauth';

const values = new Map<string, string>();
const fetchMock = vi.fn();
const credentials = (overrides = {}) => ({ accessToken: 'old-access', refreshToken: 'old-refresh', expiresAt: 0, ...overrides });
const save = (value = credentials()) => values.set('tde.oauth', JSON.stringify(value));
beforeEach(() => {
  values.clear(); save(); fetchMock.mockReset();
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) });
  vi.stubGlobal('navigator', {});
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());
describe('refreshing a rotating session (#348)', () => {
  it('stores both rotated tokens', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ access_token: 'new', refresh_token: 'rotated', expires_in: 3600 })));
    expect(await freshAccessToken()).toBe('new');
    expect(readCredentials()?.refreshToken).toBe('rotated');
  });
  it.each([400, 401, 429, 500])('keeps the session on an unconfirmed %s error', async (status) => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: 'temporarily_unavailable' }), { status }));
    await expect(freshAccessToken()).rejects.toThrow();
    expect(readCredentials()).toEqual(credentials());
  });
  it('ends a confirmed invalid grant', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 400 }));
    expect(await freshAccessToken()).toBeNull();
    expect(readCredentials()).toBeNull();
  });
  it('keeps credentials after network or malformed success failures', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('offline'));
    await expect(freshAccessToken()).rejects.toThrow();
    expect(readCredentials()).toEqual(credentials());
    fetchMock.mockResolvedValueOnce(new Response('{}'));
    await expect(freshAccessToken()).rejects.toThrow();
    expect(readCredentials()).toEqual(credentials());
  });
  it('shares an in-flight refresh', async () => {
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({ access_token: 'new', refresh_token: 'rotated' })));
    expect(await Promise.all([freshAccessToken(), freshAccessToken()])).toEqual(['new', 'new']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('uses a newer token when an old request receives a delayed 401', async () => {
    save(credentials({ accessToken: 'new-access', expiresAt: Date.now() + 3_600_000 }));
    expect(await freshAccessToken(true, 'old-access')).toBe('new-access');
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('renews a newer token too when a long sleep has expired it', async () => {
    save(credentials({ accessToken: 'newer-but-expired', expiresAt: Date.now() - 3_600_000 }));
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ access_token: 'awake', refresh_token: 'awake-refresh', expires_in: 3600 })));
    expect(await freshAccessToken(true, 'old-access')).toBe('awake');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('reads credentials again after waiting for another tab’s lock', async () => {
    vi.stubGlobal('navigator', { locks: { request: async (_name: string, run: () => Promise<unknown>) => {
      save(credentials({ accessToken: 'other-tab', refreshToken: 'other-refresh', expiresAt: Date.now() + 3_600_000 }));
      return run();
    } } });
    expect(await freshAccessToken(true, 'old-access')).toBe('other-tab');
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('times out a frozen refresh without deleting credentials', async () => {
    vi.useFakeTimers();
    try {
      fetchMock.mockImplementation((_url, options: RequestInit) => new Promise((_resolve, reject) => {
        options.signal!.addEventListener('abort', () => reject(new Error('aborted')));
      }));
      const result = freshAccessToken().catch((error: unknown) => error);
      await vi.advanceTimersByTimeAsync(20_001);
      expect(await result).toBeInstanceOf(Error);
      expect(readCredentials()).toEqual(credentials());
    } finally { vi.useRealTimers(); }
  });
  it('does not overwrite another tab or a manual disconnect during refresh', async () => {
    fetchMock.mockImplementation(async () => { forgetCredentials(); return new Response(JSON.stringify({ access_token: 'new', refresh_token: 'rotated' })); });
    expect(await freshAccessToken()).toBeNull();
    expect(readCredentials()).toBeNull();
  });
  it('does not erase a newer session when the old grant is refused', async () => {
    fetchMock.mockImplementation(async () => { save(credentials({ accessToken: 'other', refreshToken: 'other-refresh' })); return new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 400 }); });
    expect(await freshAccessToken()).toBe('other');
    expect(readCredentials()?.refreshToken).toBe('other-refresh');
  });
});
