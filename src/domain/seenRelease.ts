import { compareVersions } from './changelog';

const KEY = 'seen-releases';
const memory = new Map<string, string>();
const valid = (version: unknown): version is string => typeof version === 'string' && /^\d+\.\d+\.\d+$/.test(version);
function read(): Record<string, string> {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return data && typeof data === 'object' && !Array.isArray(data)
      ? Object.fromEntries(Object.entries(data).filter(([, version]) => valid(version))) as Record<string, string> : {};
  } catch { return {}; }
}
/** A stale settings comment must not make this account read a release again. */
export function latestSeenRelease(userId: string | null | undefined, remote: string | null): string | null {
  if (!userId || userId === 'demo-user') return remote;
  const candidates = [remote, read()[userId], memory.get(userId)].filter(valid);
  return candidates.sort(compareVersions).at(-1) ?? null;
}
export function markReleaseSeen(userId: string | null | undefined, version: string): void {
  if (!userId || userId === 'demo-user' || !valid(version)) return;
  const latest = latestSeenRelease(userId, version)!;
  memory.set(userId, latest);
  try { localStorage.setItem(KEY, JSON.stringify({ ...read(), [userId]: latest })); } catch { /* memory still prevents repeats this session */ }
}
