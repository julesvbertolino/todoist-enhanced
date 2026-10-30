import { describe, expect, it } from 'vitest';
import { shouldAskEstimateStorage, completeSetupWithEstimate, hasOnboarded } from './onboarding';
import { vi } from 'vitest';

it('records setup for the account when an estimate method is confirmed', () => {
  const storage = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) });
  try {
    const save = vi.fn();
    completeSetupWithEstimate('one', 'duration', true, save);
    expect(hasOnboarded('one')).toBe(true);
    expect(hasOnboarded('two')).toBe(false);
    expect(save).toHaveBeenCalledWith({ onboarded: true, setupDone: true, estimateStorage: 'duration' });
    completeSetupWithEstimate('one', 'duration', false, save);
    expect(save).toHaveBeenLastCalledWith({ onboarded: true, setupDone: true, estimateStorage: 'tag' });
  } finally { vi.unstubAllGlobals(); }
});
const ready = { ready: true, settled: true, demo: false, quickAdd: false, onboarded: true, storage: null, busy: false, dismissed: false } as const;
describe('estimate choice after startup', () => {
  it('asks an existing account only after startup overlays have settled', () => {
    expect(shouldAskEstimateStorage(ready)).toBe(true);
    for (const patch of [{ ready: false }, { settled: false }, { onboarded: false }, { demo: true }, { quickAdd: true }, { busy: true }, { dismissed: true }, { storage: 'tag' as const }, { storage: 'duration' as const }]) {
      expect(shouldAskEstimateStorage({ ...ready, ...patch })).toBe(false);
    }
  });
});
