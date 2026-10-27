import { afterEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ update: vi.fn(), callbacks: {} as { onNeedRefresh: () => void } }));
vi.mock('virtual:pwa-register', () => ({ registerSW: (callbacks: typeof state.callbacks) => { state.callbacks = callbacks; return state.update; } }));
/* Outside a component, the hook just reads the current value. */
vi.mock('react', () => ({ useSyncExternalStore: (_subscribe: unknown, get: () => boolean) => get() }));
import { applyUpdate, dismissUpdateCard, useUpdateCard, useUpdateReady, watchAppUpdate } from './appUpdate';
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.clearAllMocks(); });
it('offers an update without reloading an idle page; only the explicit action activates it once', () => {
  vi.stubEnv('DEV', false);
  const serviceWorker = new EventTarget(); const reload = vi.fn();
  vi.stubGlobal('navigator', { serviceWorker });
  vi.stubGlobal('window', { location: { reload } });
  watchAppUpdate();
  expect(useUpdateReady()).toBe(false);
  state.callbacks.onNeedRefresh(); state.callbacks.onNeedRefresh();
  expect(useUpdateReady()).toBe(true);
  expect(useUpdateCard()).toBe(true);
  dismissUpdateCard();
  expect(useUpdateCard()).toBe(false);
  expect(useUpdateReady()).toBe(true);
  expect(state.update).not.toHaveBeenCalled();
  serviceWorker.dispatchEvent(new Event('controllerchange'));
  expect(reload).not.toHaveBeenCalled();
  applyUpdate(); applyUpdate();
  expect(state.update).toHaveBeenCalledTimes(1);
  serviceWorker.dispatchEvent(new Event('controllerchange'));
  expect(reload).toHaveBeenCalledTimes(1);
});
