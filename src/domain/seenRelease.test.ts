import { afterEach, describe, expect, it, vi } from 'vitest';
import { latestSeenRelease, markReleaseSeen } from './seenRelease';
afterEach(() => vi.unstubAllGlobals());
describe('release acknowledgement per account', () => {
  it('survives a stale remote comment and persists the acknowledgement', () => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => store.set(key, value) });
    markReleaseSeen('seen-account', '2.7.0');
    expect(latestSeenRelease('seen-account', '2.6.0')).toBe('2.7.0');
    expect(JSON.parse(store.get('seen-releases')!)['seen-account']).toBe('2.7.0');
    expect(latestSeenRelease('other-account', '2.6.0')).toBe('2.6.0');
    expect(latestSeenRelease('seen-account', '2.8.0')).toBe('2.8.0');
    markReleaseSeen('seen-account', '2.5.0');
    expect(latestSeenRelease('seen-account', null)).toBe('2.7.0');
  });
  it('uses storage from an earlier session and ignores malformed entries', () => {
    vi.stubGlobal('localStorage', { getItem: () => '{"earlier-account":"2.10.0","bad":"garbage"}' });
    expect(latestSeenRelease('earlier-account', '2.9.0')).toBe('2.10.0');
    expect(latestSeenRelease('bad', null)).toBeNull();
  });
  it('prevents repeats within a session if storage is blocked, and excludes the demo', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('Blocked'); }, setItem: () => { throw new Error('Blocked'); } });
    markReleaseSeen('blocked-account', '2.7.0');
    expect(latestSeenRelease('blocked-account', '2.6.0')).toBe('2.7.0');
    markReleaseSeen('demo-user', '2.7.0');
    expect(latestSeenRelease('demo-user', '2.6.0')).toBe('2.6.0');
  });
});
