import { afterEach, describe, expect, it, vi } from 'vitest';
import { exclusive, resetSyncGate } from './syncGate';

afterEach(() => { vi.unstubAllGlobals(); resetSyncGate(); });

describe('sync ownership', () => {
  it('requests the shared lock around each sync turn when supported', async () => {
    const lock = vi.fn(async (_name: string, callback: () => Promise<number>) => callback());
    vi.stubGlobal('navigator', { locks: { request: lock } });
    expect(await exclusive(async () => 42)).toBe(42);
    expect(lock).toHaveBeenCalledWith('todoist-enhanced-sync', expect.any(Function));
  });
  it('continues without Web Locks on older browsers', async () => {
    vi.stubGlobal('navigator', {});
    expect(await exclusive(async () => 42)).toBe(42);
  });
});
