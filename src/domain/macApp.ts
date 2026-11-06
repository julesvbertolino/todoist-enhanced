import { compareVersions } from './changelog';
/**
 * Whether to offer the Mac app, and which file.
 *
 * A browser cannot be trusted to say which Mac it runs on: Safari and Chrome
 * both put "Intel" in the user agent on Apple silicon. Only Chromium can be
 * asked (`userAgentData`); everywhere else the answer is "not sure", and the
 * card then offers both files rather than guess wrong.
 */
export type MacArch = 'arm64' | 'x64';

export interface BrowserEnv {
  /** `navigator.userAgentData.platform`, Chromium only. */
  uaPlatform?: string;
  /** `navigator.platform`, the fallback everywhere else. */
  platform?: string;
  maxTouchPoints?: number;
}

/** A Mac computer. An iPad can report itself as a Mac, but it has a touch screen and a Mac does not. */
export function isMacComputer(env: BrowserEnv): boolean {
  const mac = env.uaPlatform ? env.uaPlatform === 'macOS' : /Mac/.test(env.platform ?? '');
  return mac && (env.maxTouchPoints ?? 0) <= 1;
}

/** The file for a Chromium "architecture" hint (`arm` or `x86`), or null when it is anything else. */
export function archFromHint(architecture: string | undefined): MacArch | null {
  if (architecture === 'arm') return 'arm64';
  if (architecture === 'x86') return 'x64';
  return null;
}

/**
 * Whether the Mac app that is running is older than the newest one published.
 * An app that does not say its version (before 1.1.1) counts as 1.1.0.
 */
export function macAppNeedsUpdate(installed: string | null | undefined, latest: string): boolean {
  const have = installed && /^\d+(\.\d+){0,2}$/.test(installed.trim()) ? installed.trim() : '1.1.0';
  return compareVersions(have, latest) < 0;
}
