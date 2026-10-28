import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchCompleted } from '@/api/completed';
import { buildDemoCompleted } from '@/demo/demoData';
import { isUncompletable, type Snapshot } from '@/domain/types';
import { useStore } from '@/store/store';

type Entry = { key: string; ids: string[] };

/** Read project history in bounded batches; keep the last answer while it refreshes. */
export function useProjectCompletionCounts(snapshot: Snapshot): Record<string, number> {
  const demo = useStore(s => s.demo);
  const connected = useStore(s => s.connected);
  const locale = useStore(s => s.prefs.locale);
  const account = snapshot.user?.id ?? '';
  const cache = useRef<{ account: string; entries: Record<string, Entry> }>({ account, entries: {} });
  const [, update] = useState(0);
  if (cache.current.account !== account) cache.current = { account, entries: {} };
  const projects = useMemo(() => {
    const openByProject: Record<string, string[]> = {};
    for (const item of Object.values(snapshot.items)) {
      if (!item.checked && !item.is_deleted && !isUncompletable(item)) (openByProject[item.project_id] ??= []).push(item.id);
    }
    return Object.values(snapshot.projects).filter(p => !p.is_deleted && !p.is_archived && !p.is_folder && !p.inbox_project)
      .map(p => ({ id: p.id, createdAt: p.created_at, key: (openByProject[p.id] ?? []).sort().join(',') }));
  }, [snapshot.items, snapshot.projects]);
  const signature = JSON.stringify(projects);
  useEffect(() => {
    if (demo || !connected || !account) return;
    const controller = new AbortController();
    const queue = (JSON.parse(signature) as typeof projects).filter(p => cache.current.entries[p.id]?.key !== p.key);
    const work = async () => {
      for (;;) {
        const project = queue.shift();
        if (!project || controller.signal.aborted) return;
        try {
          const since = project.createdAt ? new Date(project.createdAt) : new Date(Date.now() - 365 * 86_400_000);
          const history = await fetchCompleted(since, new Date(), controller.signal, { project_id: project.id });
          if (controller.signal.aborted || cache.current.account !== account) return;
          cache.current.entries[project.id] = { key: project.key, ids: [...new Set(history.map(item => item.task_id ?? item.id))] };
          update(v => v + 1);
        } catch {
          // Keep any previous result rather than blink or report zero.
        }
      }
    };
    void work(); void work();
    return () => controller.abort();
  }, [signature, demo, connected, account]);

  const result: Record<string, number> = {};
  const idsByProject: Record<string, Set<string>> = {};
  if (demo) {
    for (const p of projects) idsByProject[p.id] = new Set();
    for (const item of buildDemoCompleted(locale)) idsByProject[item.project_id]?.add(item.task_id ?? item.id);
  } else {
    for (const [id, entry] of Object.entries(cache.current.entries)) idsByProject[id] = new Set(entry.ids);
  }
  for (const item of Object.values(snapshot.items)) {
    const ids = idsByProject[item.project_id];
    if (!ids || item.is_deleted || item.due?.is_recurring || isUncompletable(item)) continue;
    if (item.checked) ids.add(item.id); else ids.delete(item.id);
  }
  for (const [id, ids] of Object.entries(idsByProject)) result[id] = ids.size;
  return result;
}
