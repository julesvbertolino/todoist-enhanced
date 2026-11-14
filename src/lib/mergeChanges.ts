/** Three-way merge: keep the remote value where this window made no change.
 * Objects merge recursively; arrays and scalar values are atomic. */
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const equal = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);

export function mergePreferenceChanges<T>(base: T, local: T, remote: T): T {
  if (equal(base, local)) return remote;
  if (!object(base) || !object(local) || !object(remote)) return local;
  const merged: Record<string, unknown> = { ...remote };
  for (const key of new Set([...Object.keys(base), ...Object.keys(local)])) {
    if (!(key in local)) {
      if (key in base) delete merged[key];
    } else if (!(key in base)) {
      merged[key] = local[key];
    } else {
      merged[key] = mergePreferenceChanges(base[key], local[key], remote[key]);
    }
  }
  return merged as T;
}
