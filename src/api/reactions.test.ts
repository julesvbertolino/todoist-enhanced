import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./auth', () => ({
  auth: {
    getToken: vi.fn(async () => 'token'),
    renewAfterRefusal: vi.fn(async () => null as string | null),
  },
}));

import { setCommentReaction } from './tasks';

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('setCommentReaction', () => {
  it('adds through the reactions endpoint and keeps what Todoist answers', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: 'c1', reactions: { '👍': ['me'] } }), { status: 200 }));
    await expect(setCommentReaction('c1', '👍', true)).resolves.toEqual({ '👍': ['me'] });
    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(String(url)).toBe('https://api.todoist.com/api/v1/comments/c1/reactions');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ reaction: '👍' });
  });

  it('removes through the remove endpoint, which answers with no body', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(setCommentReaction('c1', '👍', false)).resolves.toBeUndefined();
    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(String(url)).toBe('https://api.todoist.com/api/v1/comments/c1/reactions/remove');
    expect(JSON.parse(init.body as string)).toEqual({ reaction: '👍' });
  });

  it('throws when Todoist refuses, so the caller can roll back', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: 'Not found' }), { status: 404 }));
    await expect(setCommentReaction('c1', '👍', true)).rejects.toThrow();
  });
});
