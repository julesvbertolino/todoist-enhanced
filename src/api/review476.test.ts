import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** Independent review of #476: defects found by reading the first implementation. */
vi.mock('./auth', () => ({
  auth: { getToken: vi.fn(async () => 'token'), renewAfterRefusal: vi.fn(async () => null as string | null) },
}));

import { REQUEST_TIMEOUT_MS, request, resetRetryPauses } from './client';

const fetchMock = vi.fn();
beforeEach(() => {
  resetRetryPauses();
  vi.useFakeTimers();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('the request deadline starts when the request is sent, not when it queues', () => {
  it('does not report a timeout for a call that only waited behind a slow one', async () => {
    let first = true;
    fetchMock.mockImplementation(async () => {
      if (first) {
        first = false;
        // A long upload ahead in the shared network turn: it has a 120 s deadline of its own.
        await new Promise((resolve) => setTimeout(resolve, 30_000));
        return new Response('{}', { status: 200 });
      }
      return new Response('{"ok":true}', { status: 200 });
    });
    const slow = request('/uploads', { method: 'POST', timeoutMs: 120_000, retries: 0 });
    await vi.advanceTimersByTimeAsync(1);
    const quick = request('/sync').then(() => 'sent', (error: unknown) => (error as Error).name);
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS + 20_000);
    await slow;
    expect(await quick).toBe('sent');
  });
});
