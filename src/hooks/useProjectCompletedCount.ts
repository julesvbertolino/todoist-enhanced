import { useDataSnapshot } from '@/hooks/useDataSnapshot';
import { useEffect, useMemo, useState } from 'react';
import { fetchCompleted } from '@/api/completed';
import { useStore } from '@/store/store';
import { buildDemoCompleted } from '@/demo/demoData';
import { completedTaskCount } from '@/domain/insights';

/**
 * How many of a project's tasks are completed, over the project's whole life,
 * counted as Todoist's own project Insights count them (#239).
 *
 * Measured on a test account against Todoist's screen: its "done" figure is
 * every completed task of the project, subtasks included, and a recurring task
 * is never in it (completing an occurrence moves the task on, it stays open).
 * That is exactly what the completed-tasks endpoint lists. `completed_info`,
 * the sync's own count, leaves subtasks out, so it is not used here.
 *
 * The history is read from the day the project was made, and read again when
 * one of its tasks is completed or reopened here. `undefined` while it loads.
 */
export function useProjectCompletedCount(projectId: string | undefined, enabled: boolean): number | undefined {
  const snapshot = useDataSnapshot();
  const connected = useStore((s) => s.connected);
  const demo = useStore((s) => s.demo);
  const locale = useStore((s) => s.prefs.locale);
  const [loaded, setLoaded] = useState<{ projectId: string; ids: string[] } | null>(null);

  const createdAt = projectId ? snapshot.projects[projectId]?.created_at : undefined;
  /* The open tasks of the project, as one string: it changes when a task is
     completed, reopened, added or moved, and not on every sync. */
  const openKey = useMemo(() => !projectId ? '' : Object.values(snapshot.items)
    .filter((item) => item.project_id === projectId && !item.checked && !item.is_deleted)
    .map((item) => item.id).sort().join(','), [snapshot.items, projectId]);
  const key = `${projectId}:${openKey}`;

  const demoCount = useMemo(() => {
    if (!demo || !projectId) return undefined;
    return completedTaskCount(buildDemoCompleted(locale).filter((entry) => entry.project_id === projectId))
      + Object.values(snapshot.items).filter((item) => item.project_id === projectId && item.checked && !item.is_deleted).length;
  }, [demo, projectId, locale, snapshot.items]);

  useEffect(() => {
    if (demo || !enabled || !connected || !projectId) return;
    const controller = new AbortController();
    /* A project Todoist gives no creation date for is read over the last year
       rather than from 2007: wrong by what is older, never by a whole sweep. */
    const since = createdAt ? new Date(createdAt) : new Date(Date.now() - 365 * 86_400_000);
    fetchCompleted(since, new Date(), controller.signal, { project_id: projectId })
      .then((items) => { if (!controller.signal.aborted) setLoaded({ projectId, ids: [...new Set(items.map((item) => item.task_id ?? item.id))] }); })
      .catch(() => { /* The figure stays pending; the 7-day card reports the failure. */ });
    return () => controller.abort();
  }, [demo, enabled, connected, projectId, createdAt, key]);

  if (demoCount !== undefined) return demoCount;
  if (!loaded || loaded.projectId !== projectId) return undefined;
  // Reflect local completions and reopenings immediately while the history
  // refresh catches up. Recurring occurrences remain open and are excluded.
  const ids = new Set(loaded.ids);
  for (const item of Object.values(snapshot.items)) {
    if (item.project_id !== projectId || item.is_deleted || item.due?.is_recurring) continue;
    if (item.checked) ids.add(item.id);
    else ids.delete(item.id);
  }
  return ids.size;
}
