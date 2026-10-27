import { useSyncExternalStore } from 'react';
import { registerSW } from 'virtual:pwa-register';

/** How often an open app asks whether a new version was deployed. */
const CHECK_EVERY_MS = 30 * 60 * 1000;

/* A new build waiting for the person's go-ahead. A card announces it once,
   over a quiet line at the foot of the sidebar, where the app's own state
   already lives; the line stays after the card is put away. Nothing reloads
   until the person chooses to. Left alone, the waiting build takes over the
   next time the app is opened. */
let ready = false;
/* The card that announces it is answered once: "Later" puts it away for this
   page, and the line and the dots stay. */
let dismissed = false;
let apply: (() => void) | null = null;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const emit = () => listeners.forEach((listener) => listener());
const offer = () => {
  if (ready) return;
  ready = true;
  emit();
};

/** Whether a new version is waiting for the person's go-ahead. */
export function useUpdateReady(): boolean {
  return useSyncExternalStore(subscribe, () => ready, () => false);
}

/** Whether the card announcing the new version is still waiting for an answer. */
export function useUpdateCard(): boolean {
  return useSyncExternalStore(subscribe, () => ready && !dismissed, () => false);
}

/** "Later": the card goes away, the line at the foot of the sidebar stays. */
export function dismissUpdateCard(): void {
  if (dismissed) return;
  dismissed = true;
  emit();
}

/** Moves to the waiting version: the one way a new build reloads the page. */
export function applyUpdate(): void {
  apply?.();
}

/** Install updates only after the user explicitly chooses to. */
export function watchAppUpdate(): void {
  if (import.meta.env.DEV) {
    /* There is no service worker in development: the browser tests offer a
       version by hand, and see whether the line asked for it. */
    Object.assign(window, { __offerUpdate: () => { apply = () => Object.assign(window, { __updateApplied: true }); offer(); } });
    return;
  }
  if (!('serviceWorker' in navigator)) return;
  /* Hands over to the waiting build, and reloads once it is in control. The
     plugin's own reload did not fire for a worker found by a later update
     check, so the page listens for the change of controller itself. */
  let applying = false;
  apply = () => {
    if (applying) return;
    applying = true;
    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true });
    void update(false);
  };
  const update = registerSW({
    immediate: true,
    onNeedRefresh: offer,
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      const check = () => { if (navigator.onLine) void registration.update().catch(() => undefined); };
      setInterval(check, CHECK_EVERY_MS);
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
    },
  });
}
