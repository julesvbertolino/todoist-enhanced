/**
 * The Product Hunt launch invitation (LaunchPopup).
 *
 * Everything that makes it temporary is here: the address, the last day it is
 * shown and the key under which a device remembers having seen it.
 */
export const LAUNCH = {
  /** A new key for a new invitation: a device that saw an earlier one is asked again. */
  id: 'producthunt-2026-11',
  url: 'https://www.producthunt.com/products/enhanced-for-todoist',
  /** The first day it is no longer shown, as a calendar date (UTC). */
  until: '2026-11-08',
} as const;

const storageKey = `tde.launch.${LAUNCH.id}`;

/**
 * Whether the invitation is still within its days. A browser driven by a test
 * is never asked, or a dialog would land in the middle of every journey; a
 * test of the invitation itself sets `tde.launch.force`.
 */
export function launchIsOn(now: Date = new Date()): boolean {
  if (now.toISOString().slice(0, 10) >= LAUNCH.until) return false;
  if (typeof navigator !== 'undefined' && navigator.webdriver) {
    try { return localStorage.getItem('tde.launch.force') === '1'; } catch { return false; }
  }
  return true;
}

export function launchWasSeen(): boolean {
  try {
    return localStorage.getItem(storageKey) !== null;
  } catch {
    // Storage blocked: better not to ask than to ask at every visit.
    return true;
  }
}

/** Remembered from the moment it is put up, so closing the tab does not bring it back. */
export function rememberLaunch(): void {
  try {
    localStorage.setItem(storageKey, new Date().toISOString());
  } catch { /* blocked: launchWasSeen already says seen */ }
}
