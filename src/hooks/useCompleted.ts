import { matchesAssignee } from '@/domain/assignees';
import { PERSONAL_WORKSPACE } from '@/store/selectors';
import { viewPrefs } from '@/store/prefs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchCompleted } from '@/api/completed';
import { useStore } from '@/store/store';
import { buildDemoCompleted } from '@/demo/demoData';
import { previousRange, type Range } from '@/domain/periods';
import { matchesDashboardHistory } from '@/domain/dashboardFilters';
import type { CompletedItem } from '@/domain/types';

const NONE: CompletedItem[] = [];

interface Loaded {
  /** The window these items answer, so they are never shown for another. */
  key: string;
  data: CompletedItem[];
  previous: CompletedItem[];
}

/**
 * Reads completed tasks for a range, and for the range of the same length
 * before it.
 *
 * History is fetched on demand rather than kept in sync: it only changes at
 * the moment a task is completed, and Insights is the only place that needs it.
 *
 * The window asked for is twice the range, because every chart that compares
 * "this month" to "last month" would otherwise need a second round trip to say
 * anything. The result is split at the range's start before it is returned.
 *
 * What comes back always belongs to the range asked for: while the next one is
 * loading, or after it failed, the last one's values are not handed out under
 * the new one's name, and an answer that arrives after the person has moved on
 * is dropped.
 */
export function useCompleted(range: Range, enabled: boolean, viewKey?: string) {
  const snapshot = useStore((state) => state.snapshot);
  const prefs = useStore((state) => state.prefs);
  const connected = useStore((s) => s.connected);
  const demo = useStore((s) => s.demo);
  const locale = useStore((s) => s.prefs.locale);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState<{ key: string; message: string } | null>(null);
  const [attempt, setAttempt] = useState(0);

  // Dates are compared by value: a fresh object with the same instant is the
  // same request, and must not fetch again.
  const sinceMs = range.since.getTime();
  const untilMs = range.until.getTime();
  const key = `${sinceMs}:${untilMs}`;

  useEffect(() => {
    if (!enabled || !connected) return;

    const controller = new AbortController();
    const current = { since: new Date(sinceMs), until: new Date(untilMs) };
    const earlier = previousRange(current);

    const split = (items: CompletedItem[]) => {
      const inside: CompletedItem[] = [];
      const before: CompletedItem[] = [];
      for (const item of items) {
        const at = new Date(item.completed_at).getTime();
        if (at > untilMs) continue;
        if (at >= sinceMs) inside.push(item);
        else if (at >= earlier.since.getTime()) before.push(item);
      }
      setLoaded({ key, data: inside, previous: before });
      setFailed(null);
    };

    if (demo) {
      split(buildDemoCompleted(locale));
      return;
    }

    setFailed(null);
    fetchCompleted(earlier.since, current.until, controller.signal)
      .then((items) => { if (!controller.signal.aborted) split(items); })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setFailed({ key, message: err instanceof Error ? err.message : 'unknown' });
      });

    return () => controller.abort();
  }, [sinceMs, untilMs, key, enabled, connected, demo, locale, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const ready = loaded?.key === key;
  const error = failed?.key === key ? failed.message : null;

  const scoped = useMemo(() => {
    let missingFilterData = 0;
    const inScope = (items: CompletedItem[]) => !viewKey ? items : items.filter((entry) => {
      const filters = viewPrefs(prefs, viewKey).filters;
      const projectId = entry.project_id ?? snapshot.items[entry.task_id ?? entry.id]?.project_id;
      const workspace = projectId ? snapshot.projects[projectId]?.workspace_id ?? PERSONAL_WORKSPACE : PERSONAL_WORKSPACE;
      const common = (!filters.workspaces.length || filters.workspaces.includes(workspace)) &&
        matchesAssignee({ responsible_uid: entry.responsible_uid === undefined
          ? snapshot.items[entry.task_id ?? entry.id]?.responsible_uid ?? null : entry.responsible_uid }, filters.assignees, snapshot);
      if (!common) return false;
      if (viewKey !== 'dashboard') return true;
      const match = matchesDashboardHistory(entry, filters);
      if (match === 'unknown') missingFilterData++;
      return match === 'match';
    });
    const data = ready ? inScope(loaded.data) : NONE;
    const previous = ready ? inScope(loaded.previous) : NONE;
    return { data, previous, missingFilterData };
  }, [loaded, ready, snapshot, prefs, viewKey]);
  return {
    data: scoped.data,
    previous: scoped.previous,
    missingFilterData: scoped.missingFilterData,
    loading: enabled && connected && !ready && error === null,
    error,
    retry,
  };
}
