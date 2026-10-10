/**
 * Whether this account has been through the first run.
 *
 * The obvious place for this is the preferences, and the preferences are the
 * wrong place: disconnecting clears IndexedDB and resets them, so signing out
 * and back in would present the walkthrough again to somebody who has already
 * done it and already has the settings it offers to choose. Local storage
 * survives that, which is why the flag lives here rather than beside the
 * settings it is about.
 *
 * It is keyed by Todoist user id rather than being a single boolean, for the
 * other half of the same problem: a browser is not a person. A second account
 * signing in on the same machine has genuinely never seen this, and deserves
 * to be asked; the first one does not have to answer twice.
 *
 * The id is Todoist's own and is never sent anywhere — it is already in the
 * snapshot this app holds on the device.
 */

const KEY = 'onboarded';

/** Enough for every account anyone actually signs into on one machine. */
const LIMIT = 12;

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    // Blocked storage, or something else writing to the same key. Either way
    // the honest answer is "no record", and the walkthrough can be skipped.
    return [];
  }
}

/** The demo's id: it has no account to remember the Setup by (#6). */
export const DEMO_USER_ID = 'demo-user';
const DEMO_KEY = 'demo-onboarded';
/** Dev and e2e escape hatch: `localStorage.skipSetup = '1'` skips the demo's Setup. */
const SKIP_KEY = 'skipSetup';

/**
 * The demo remembers its Setup for the browser tab only: a reload inside the
 * demo does not ask again, every new "Explore with demo data" does.
 */
function demoOnboarded(): boolean {
  try {
    return sessionStorage.getItem(DEMO_KEY) === '1' || localStorage.getItem(SKIP_KEY) === '1';
  } catch { return false; }
}

/** Called when the demo is entered from the sign-in page. */
export function forgetDemoOnboarding(): void {
  try { sessionStorage.removeItem(DEMO_KEY); } catch { /* storage may be blocked */ }
}

export function hasOnboarded(userId: string | null | undefined): boolean {
  if (!userId) return true;   // Nobody to ask yet; ask once the account is known.
  if (userId === DEMO_USER_ID) return demoOnboarded();
  return read().includes(userId);
}

export function markOnboarded(userId: string | null | undefined): void {
  if (!userId) return;
  if (userId === DEMO_USER_ID) {
    try { sessionStorage.setItem(DEMO_KEY, '1'); } catch { /* storage may be blocked */ }
    return;
  }
  try {
    const next = [userId, ...read().filter((id) => id !== userId)].slice(0, LIMIT);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch { /* storage may be blocked; the walkthrough simply asks again */ }
}

/** For the About section's "show me that again". */
export function forgetOnboarding(userId: string | null | undefined): void {
  if (!userId) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(read().filter((id) => id !== userId)));
  } catch { /* ignored, as above */ }
}

/** Existing accounts are asked only after all startup overlays have settled. */
export function shouldAskEstimateStorage(state: {
  ready: boolean; settled: boolean; demo: boolean; quickAdd: boolean;
  onboarded: boolean; storage: 'tag' | 'duration' | null; busy: boolean; dismissed: boolean;
}): boolean {
  return state.ready && state.settled && state.onboarded && state.storage === null
    && !state.demo && !state.quickAdd && !state.busy && !state.dismissed;
}
