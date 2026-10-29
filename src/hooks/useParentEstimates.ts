import { useDataSnapshot } from '@/hooks/useDataSnapshot';
import { useEffect, useRef } from 'react';
import { useStore } from '@/store/store';
import { childIndex, makeChildrenOf, openItems } from '@/store/selectors';
import { parentEstimateWrites } from '@/domain/estimates';

/**
 * Keeps a parent's own estimate equal to the sum of its subtasks' when every
 * open subtask has one (#187), so Todoist shows what the app does.
 *
 * The write is an ordinary estimate edit and goes through the same queue. It
 * waits for the app to be quiet (nothing waiting to be sent), so a poll that
 * brings back an older copy of a parent cannot start a second write, and it
 * never asks twice for the same figure: a change Todoist refused is not sent
 * again on every refresh.
 */
export function useParentEstimates() {
  const snapshot = useDataSnapshot();
  const storage = useStore((s) => s.prefs.estimateStorage);
  /* Not while something is being dragged: a write landing mid-gesture
     redraws the list under the pointer and the drop goes astray. */
  const quiet = useStore((s) => s.ready && s.pendingCount === 0 && s.draggingTaskId === null && s.draggingSectionId === null);
  const setEstimates = useStore((s) => s.setEstimates);
  const asked = useRef(new Map<string, number>());

  useEffect(() => {
    if (!quiet) return;
    const timer = window.setTimeout(() => {
      const childrenOf = makeChildrenOf(childIndex(snapshot));
      const writes = parentEstimateWrites(openItems(snapshot), childrenOf);
      const live = new Set(writes.map((w) => w.id));
      for (const id of [...asked.current.keys()]) if (!live.has(id)) asked.current.delete(id);
      const fresh = writes.filter((w) => asked.current.get(w.id) !== w.minutes);
      if (fresh.length === 0) return;
      for (const w of fresh) asked.current.set(w.id, w.minutes);
      void setEstimates(fresh);
    }, 600);
    return () => window.clearTimeout(timer);
    /* `storage` changes which figure a task reads as its own. */
  }, [snapshot, storage, quiet, setEstimates]);
}
