import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/db/idb', () => ({
  loadPrefs: vi.fn(async () => null),
  loadSnapshot: vi.fn(async () => (await import('@/domain/types')).emptySnapshot()),
  readQueue: vi.fn(async () => []),
  saveSnapshot: vi.fn(async () => {}), reserveSnapshot: vi.fn(async () => ({ epoch: 'test', revision: 1 })),
  clearAll: vi.fn(async () => {}),
  clearSession: vi.fn(async () => {}),
  claimLegacyQueue: vi.fn(async () => {}),
}));

import * as idb from '@/db/idb';
import { useStore } from './store';

/** Session storage as a browser that blocks site data has it: touching it throws. */
function blockSessionStorage() {
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    get() { throw new DOMException('The operation is insecure.', 'SecurityError'); },
  });
}

beforeEach(() => {
  vi.stubGlobal('window', { location: { search: '', hash: '', pathname: '/' }, history: { replaceState() {} } });
  vi.stubGlobal('navigator', { language: 'en-US', onLine: true });
  useStore.setState({ ready: false, connected: false, demo: false, syncError: null });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('starting up when the browser blocks site storage (#128)', () => {
  it('finishes, so the connect screen can appear', async () => {
    blockSessionStorage();
    await useStore.getState().init();

    expect(useStore.getState().ready).toBe(true);
    expect(useStore.getState().connected).toBe(false);
  });

  it('opens the demo even though it cannot be remembered', () => {
    blockSessionStorage();
    expect(() => useStore.getState().startDemo()).not.toThrow();
    expect(useStore.getState().demo).toBe(true);
  });

  it('leaves without throwing', async () => {
    blockSessionStorage();
    await expect(useStore.getState().disconnect()).resolves.toBeUndefined();
  });
});

describe('starting up when something else goes wrong (#128)', () => {
  it('still finishes, and keeps what went wrong as the sync error', async () => {
    vi.mocked(idb.readQueue).mockRejectedValueOnce(new Error('IndexedDB is unavailable'));
    await useStore.getState().init();

    expect(useStore.getState().ready).toBe(true);
    expect(useStore.getState().syncError).toMatch(/IndexedDB is unavailable/);
  });
});
