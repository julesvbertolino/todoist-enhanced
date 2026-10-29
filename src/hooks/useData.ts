import { useDataSnapshot } from '@/hooks/useDataSnapshot';
import { assigneeItems, matchesAssignee } from '@/domain/assignees';
import { viewPrefs } from '@/store/prefs';
import { useEffect, useMemo } from 'react';
import { useStore } from '@/store/store';
import { childIndex, makeChildrenOf, openItems, PERSONAL_WORKSPACE } from '@/store/selectors';
import type { Item } from '@/domain/types';

/**
 * The derived reading of the snapshot every view needs: the open tasks, and a
 * way to reach a task's children. Recomputed only when the snapshot changes.
 */
export function useData(viewKey?: string) {
  const prefs = useStore((s) => s.prefs);
  const storage = useStore((s) => s.prefs.estimateStorage);
  const snapshot = useDataSnapshot();

  const selected = useStore((state) => state.selection);
  const selection = viewKey ? viewPrefs(prefs, viewKey).filters.assignees : null;
  useEffect(() => {
    if (!viewKey || selection == null || selected.length === 0) return;
    const retained = selected.filter((id) => snapshot.items[id] && matchesAssignee(snapshot.items[id], selection, snapshot));
    if (retained.length === selected.length) return;
    const state = useStore.getState();
    useStore.setState({ selection: retained, selectionAnchor: state.selectionAnchor && retained.includes(state.selectionAnchor) ? state.selectionAnchor : null });
  }, [viewKey, selection, snapshot, selected]);

  return useMemo(() => {
    void storage; // Changing precedence invalidates derived totals and groups.
    const selection = viewKey ? viewPrefs(prefs, viewKey).filters.assignees : null;
    const scoped = selection == null ? snapshot.items : assigneeItems(snapshot, selection);
    const workspaces = viewKey ? viewPrefs(prefs, viewKey).filters.workspaces : [];
    const visibleSnapshot = { ...snapshot, items: workspaces.length ? Object.fromEntries(Object.entries(scoped).filter(([, item]) => workspaces.includes(snapshot.projects[item.project_id]?.workspace_id ?? PERSONAL_WORKSPACE))) : scoped };
    const index = childIndex(visibleSnapshot);
    const childrenOf = makeChildrenOf(index);
    const items = openItems(visibleSnapshot);
    const byId = (id: string): Item | undefined => snapshot.items[id];
    return { snapshot, items, childrenOf, byId, childIndex: index };
  }, [snapshot, storage, prefs, viewKey]);
}
