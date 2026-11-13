import { beforeEach, describe, expect, it, vi } from 'vitest';
import { request } from './client';
import { fetchCompleted } from './completed';
import { invalidateHistory } from './sharedRead';

vi.mock('./client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./client')>()),
  request: vi.fn(),
}));
const sent = vi.mocked(request);

const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
  });
  invalidateHistory();
  sent.mockReset();
  sent.mockResolvedValue({ items: [], next_cursor: null } as never);
  store.set('tde.account', 'u1');
});

describe('history reads shared between consumers', () => {
  it('serves two consumers that ask "until now" a few milliseconds apart from one request', async () => {
    const since = new Date('2026-01-01T00:00:00Z');
    const now = Math.floor(Date.now() / 10_000) * 10_000;
    await fetchCompleted(since, new Date(now + 100));
    const first = sent.mock.calls.length;
    await fetchCompleted(since, new Date(now + 250));
    expect(sent.mock.calls.length).toBe(first);
  });

  it('does not reuse a different fixed historical range', async () => {
    const since = new Date('2026-01-01T00:00:00Z');
    await fetchCompleted(since, new Date('2026-01-02T10:00:00.100Z'));
    const first = sent.mock.calls.length;
    await fetchCompleted(since, new Date('2026-01-02T10:00:00.250Z'));
    expect(sent.mock.calls.length).toBeGreaterThan(first);
  });
});
