import { useStore } from '@/store/store';
import type { Snapshot } from '@/domain/types';
import type { AppState } from '@/store/types';

/** Subscribe to account data, leaving the sync cursor and timestamp to sync UI. */
let previous: Snapshot | undefined;
function selectDataSnapshot(state: AppState): Snapshot {
  const next = state.snapshot;
  if (previous === next) return next;
  if (previous && Object.keys(previous).length === Object.keys(next).length && (Object.keys(next) as (keyof Snapshot)[]).every((key) =>
    key === 'syncToken' || key === 'syncedAt' || previous![key] === next[key])) return previous;
  previous = next;
  return next;
}
export function useDataSnapshot(): Snapshot {
  return useStore(selectDataSnapshot);
}
