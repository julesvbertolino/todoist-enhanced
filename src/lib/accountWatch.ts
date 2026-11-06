/**
 * Which Todoist account this device is signed in to, kept where every window
 * of the app can read it.
 *
 * The desktop app runs the site in two windows at once, the main one and the
 * Quick Add one, and they share the device's storage and its queue of waiting
 * changes. Each window holds its own copy of the account in memory. After the
 * main window signs in as someone else, the Quick Add window still believed in
 * the old account while the token it sent came from the shared storage, so a
 * task could land in either account depending on which window sent it.
 *
 * Every window writes the account it is on here, reloads when another window
 * changes it, and refuses to send while its own copy disagrees with it.
 */

export const ACCOUNT_KEY = 'tde.account';

/** The account the device last signed in to, or null when there is none or storage is blocked. */
export function accountOnDevice(): string | null {
  try {
    return localStorage.getItem(ACCOUNT_KEY);
  } catch {
    return null;
  }
}

/** Whether a window on `current` may send: yes when the device has no opinion or agrees. */
export function mayWriteAs(current: string | number | null | undefined, onDevice: string | null): boolean {
  if (current === null || current === undefined || !onDevice) return true;
  return String(current) === onDevice;
}

/** Whether a change of the shared account, made by another window, means this window must start over. */
export function mustReload(current: string | number | null | undefined, changedTo: string | null): boolean {
  if (current === null || current === undefined) return false;
  return changedTo === null || String(current) !== changedTo;
}

interface Watched {
  getState: () => { ready: boolean; connected: boolean; demo: boolean; snapshot: { user: { id: string | number } | null } };
  subscribe: (listener: () => void) => () => void;
}

/** Starts keeping the shared account in step with this window, and this window in step with it. */
export function watchAccount(store: Watched): () => void {
  const sync = () => {
    const { ready, connected, demo, snapshot } = store.getState();
    if (!ready || demo) return;
    try {
      const id = snapshot.user?.id;
      if (connected && id !== undefined && id !== null) {
        if (localStorage.getItem(ACCOUNT_KEY) !== String(id)) localStorage.setItem(ACCOUNT_KEY, String(id));
      } else if (!connected) {
        localStorage.removeItem(ACCOUNT_KEY);
      }
    } catch { /* storage blocked: there is no second window to disagree with */ }
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key !== ACCOUNT_KEY) return;
    const { demo, snapshot } = store.getState();
    if (demo) return;
    if (mustReload(snapshot.user?.id, event.newValue)) window.location.reload();
  };
  const unsubscribe = store.subscribe(sync);
  window.addEventListener('storage', onStorage);
  sync();
  return () => { unsubscribe(); window.removeEventListener('storage', onStorage); };
}

interface WindowState {
  ready: boolean;
  connected: boolean;
  demo: boolean;
  snapshot: { user: { id: string | number } | null };
}

/**
 * Whether a window kept open in the background (the desktop app's Quick Add)
 * no longer matches what the device is signed in to, and must load again
 * before anything is typed in it. Checked each time it is shown: the storage
 * event that reloads it can be missed (the demo ignores it, a window that was
 * not signed in has no account to compare), and a task sent from a window in
 * the wrong state lands in the wrong place or nowhere.
 */
export function outOfStep(state: WindowState, device: { signedIn: boolean; account: string | null }): boolean {
  if (!state.ready) return false;
  // The demo, or the sign-in page, while the device has an account.
  if (state.demo || !state.connected) return device.signedIn;
  // An account, while the device has signed out.
  if (!device.signedIn) return true;
  return !mayWriteAs(state.snapshot.user?.id, device.account);
}
