import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./auth', () => ({
  auth: {
    getToken: vi.fn(async () => 'token'),
    renewAfterRefusal: vi.fn(async () => null as string | null),
  },
}));

import { auth } from './auth';
import { ApiError, REQUEST_TIMEOUT_MS, TimeoutError, request } from './client';

const fetchMock = vi.fn();

/** A response whose body never finishes: it waits for the request to be aborted. */
function stalledBody(signal: AbortSignal): Response {
  return {
    ok: true,
    status: 200,
    headers: new Headers(),
    text: () => new Promise<string>((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }),
  } as unknown as Response;
}

const answer = (status: number, body = '', headers: Record<string, string> = {}): Response =>
  new Response(status === 204 ? null : body, { status, headers });

beforeEach(() => {
  vi.useFakeTimers();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.mocked(auth.getToken).mockClear();
  vi.mocked(auth.renewAfterRefusal).mockReset();
  vi.mocked(auth.renewAfterRefusal).mockResolvedValue(null);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('a call that starts answering and then stalls (#127)', () => {
  it('is a timeout, not an empty success', async () => {
    fetchMock.mockImplementation(async (_url, init) => stalledBody((init as RequestInit).signal!));
    const pending = request('/sync');
    const settled = pending.then(() => 'resolved', (error: unknown) => error);

    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS + 1);
    expect(await settled).toBeInstanceOf(TimeoutError);
  });
});

describe('what a successful answer can be (#127)', () => {
  it('reads JSON', async () => {
    fetchMock.mockResolvedValue(answer(200, '{"ok":true}'));
    await expect(request('/x')).resolves.toEqual({ ok: true });
  });

  it('is undefined when the body is empty, or the status is 204', async () => {
    fetchMock.mockResolvedValueOnce(answer(200, ''));
    await expect(request('/x')).resolves.toBeUndefined();
    fetchMock.mockResolvedValueOnce(answer(204));
    await expect(request('/x')).resolves.toBeUndefined();
  });

  it('is a plain error, not a refusal, when a 200 carries something that is not JSON', async () => {
    fetchMock.mockResolvedValue(answer(200, '<html>oops</html>'));
    const error = await request('/x').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(ApiError);
    expect((error as Error).message).toMatch(/could not be read/);
  });
});

describe('the token', () => {
  it('is renewed once after a 401, and the second call uses the new one', async () => {
    vi.mocked(auth.renewAfterRefusal).mockResolvedValue('renewed');
    fetchMock
      .mockResolvedValueOnce(answer(401))
      .mockResolvedValueOnce(answer(200, '{"ok":1}'));

    await expect(request('/x')).resolves.toEqual({ ok: 1 });
    expect(auth.renewAfterRefusal).toHaveBeenCalledTimes(1);
    const bearer = (call: number) =>
      (fetchMock.mock.calls[call][1] as RequestInit & { headers: Record<string, string> }).headers.Authorization;
    expect(bearer(0)).toBe('Bearer token');
    expect(bearer(1)).toBe('Bearer renewed');
  });
});

describe('a refusal', () => {
  it.each(['FORBIDDEN', 'PERMISSION_DENIED', 'INSUFFICIENT_SCOPE'])('keeps a permission refusal (%s) separate from a bad token', (error_tag) => {
    expect(new ApiError('refused', 403, { error_tag }).isAuthError).toBe(false);
  });
  it('recognises Todoist’s explicit authentication code and revoked-token errors', () => {
    expect(new ApiError('refused', 403, { error_code: 477 }).isAuthError).toBe(true);
    expect(new ApiError('refused', 403, { error_tag: 'INVALID_TOKEN' }).isAuthError).toBe(true);
  });
  it('keeps the session on a 403 with an empty body', async () => {
    fetchMock.mockResolvedValue(answer(403));
    const error = await request('/x').catch((e: unknown) => e) as ApiError;
    expect(error.isAuthError).toBe(false);
    expect(error.isRefusal).toBe(true);
  });

  it('is a refusal on a 403 that names the plan, not the token', async () => {
    fetchMock.mockResolvedValue(answer(403, JSON.stringify({ error_tag: 'MAX_PROJECTS_LIMIT_REACHED' })));
    const error = await request('/x').catch((e: unknown) => e) as ApiError;
    expect(error.isRefusal).toBe(true);
    expect(error.isAuthError).toBe(false);
  });
});

describe('waiting to try again (#133)', () => {
  it('obeys a short Retry-After exactly', async () => {
    fetchMock
      .mockResolvedValueOnce(answer(429, '', { 'retry-after': '2' }))
      .mockResolvedValueOnce(answer(200, '{"ok":1}'));
    const done = request('/x');

    await vi.advanceTimersByTimeAsync(1_999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(2);
    await expect(done).resolves.toEqual({ ok: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not wait at all for a Retry-After past the limit: it gives up at once', async () => {
    fetchMock.mockResolvedValue(answer(429, '', { 'retry-after': '120' }));
    const error = await request('/x').catch((e: unknown) => e) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(429);
    // A 429 is not a refusal: the change stays queued and is tried again later.
    expect(error.isRefusal).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries a server error three times, then gives up', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    fetchMock.mockImplementation(async () => answer(503));
    const done = request('/x').catch((e: unknown) => e);

    await vi.advanceTimersByTimeAsync(1_000 + 2_000 + 4_000 + 1);
    const error = await done as ApiError;
    expect(error.status).toBe(503);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    vi.restoreAllMocks();
  });

  it('spreads its own backoff, so calls sent together do not come back together', async () => {
    const waits = new Set<number>();
    for (const roll of [0, 0.5, 1]) {
      fetchMock.mockReset();
      fetchMock
        .mockResolvedValueOnce(answer(503))
        .mockResolvedValueOnce(answer(200, '{}'));
      vi.spyOn(Math, 'random').mockReturnValue(roll);
      const spy = vi.spyOn(globalThis, 'setTimeout');
      const done = request('/x');
      await vi.advanceTimersByTimeAsync(2_000);
      await done;
      waits.add(spy.mock.calls.map(([, ms]) => ms as number).find((ms) => ms >= 700 && ms <= 1300)!);
      vi.restoreAllMocks();
    }
    expect(waits.size).toBe(3);
    expect([...waits].every((ms) => ms >= 799.99 && ms <= 1200.01)).toBe(true);
  });

  it('stops waiting when the caller gives up, and sends nothing more', async () => {
    fetchMock.mockResolvedValue(answer(429, '', { 'retry-after': '10' }));
    const controller = new AbortController();
    const done = request('/x', { signal: controller.signal }).catch((e: unknown) => e);

    await vi.advanceTimersByTimeAsync(100);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    controller.abort();
    const error = await done as DOMException;
    expect(error.name).toBe('AbortError');

    await vi.advanceTimersByTimeAsync(30_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('sends nothing for a caller that has already left', async () => {
    const controller = new AbortController();
    controller.abort();
    const error = await request('/x', { signal: controller.signal }).catch((e: unknown) => e) as DOMException;
    expect(error.name).toBe('AbortError');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
