import { webcrypto } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { beginSignIn, completeSignIn } from './oauth';

describe('desktop OAuth', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('opens Todoist in the browser and exchanges only the matching return', async () => {
    const session = new Map<string, string>();
    const saved = new Map<string, string>();
    const openSignIn = vi.fn(async (_url: string) => true);
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ access_token: 'example', expires_in: 3600 })));
    const location = { origin: 'https://example.test', pathname: '/', hash: '#/week', search: '' };
    vi.stubGlobal('crypto', webcrypto);
    vi.stubGlobal('window', { location, enhancedDesktop: { openSignIn }, history: { replaceState: vi.fn() } });
    vi.stubGlobal('sessionStorage', { getItem: (key: string) => session.get(key) ?? null, setItem: (key: string, value: string) => session.set(key, value), removeItem: (key: string) => session.delete(key) });
    vi.stubGlobal('localStorage', { getItem: (key: string) => saved.get(key) ?? null, setItem: (key: string, value: string) => saved.set(key, value), removeItem: (key: string) => saved.delete(key) });
    vi.stubGlobal('fetch', fetchMock);
    expect(await beginSignIn()).toBe(true);
    const url = new URL(openSignIn.mock.calls[0][0] as string);
    expect(url.origin).toBe('https://app.todoist.com');
    expect(url.searchParams.get('state')).toMatch(/^desktop_/);
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    location.search = `?code=code-example&state=${url.searchParams.get('state')}`;
    expect(await completeSignIn()).toBe('signed-in');
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(saved.get('tde.oauth')).toContain('example');
  });
});
