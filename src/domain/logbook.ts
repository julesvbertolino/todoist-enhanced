import { format } from 'date-fns';
import { estimateOf } from './estimates';
import { toDisplayPriority, type CompletedItem } from './types';

/** What the Logbook is cut into. */
export type LogGroup = 'day' | 'month' | 'project' | 'priority';
/** What the rows inside each cut are ordered by. */
export type LogSort = 'date' | 'priority';

export const LOG_GROUPS: readonly LogGroup[] = ['day', 'month', 'project', 'priority'];
export const LOG_SORTS: readonly LogSort[] = ['date', 'priority'];

export interface LogCut {
  /** Stable, and what the cuts are ordered by when they are not by size. */
  key: string;
  /** The completion that stands for the cut (days and months), to be said in words by the caller. */
  at: Date | null;
  projectId: string | null;
  priority: 1 | 2 | 3 | 4 | null;
  rows: CompletedItem[];
  /** The estimates of the rows that have one, added up. */
  minutes: number;
}

const priorityOf = (task: CompletedItem) => toDisplayPriority(task.priority ?? 1);
const minutesOf = (task: CompletedItem) =>
  estimateOf({ labels: task.labels ?? [], duration: task.duration }) ?? 0;

/**
 * The completed tasks, cut and ordered the way the Logbook shows them.
 *
 * Days and months read newest first, priorities from P1 down, projects the
 * most finished first. Within a cut the rows follow the sort: latest
 * completion first, or highest priority first with the latest breaking ties.
 * Nothing here knows a language: the caller says days, months and projects in
 * words.
 */
export function cutLogbook(rows: CompletedItem[], group: LogGroup, sort: LogSort): LogCut[] {
  const cuts = new Map<string, LogCut>();
  for (const task of rows) {
    const at = new Date(task.completed_at);
    let key: string;
    let priority: LogCut['priority'] = null;
    if (group === 'project') key = task.project_id;
    else if (group === 'priority') { priority = priorityOf(task); key = `p${priority}`; }
    else if (group === 'month') key = format(at, 'yyyy-MM');
    else key = format(at, 'yyyy-MM-dd');

    const cut = cuts.get(key);
    if (cut) {
      cut.rows.push(task);
      cut.minutes += minutesOf(task);
    } else {
      cuts.set(key, {
        key,
        at: group === 'day' || group === 'month' ? at : null,
        projectId: group === 'project' ? task.project_id : null,
        priority,
        rows: [task],
        minutes: minutesOf(task),
      });
    }
  }

  const latest = (a: CompletedItem, b: CompletedItem) => b.completed_at.localeCompare(a.completed_at);
  const rowOrder = sort === 'priority'
    ? (a: CompletedItem, b: CompletedItem) => priorityOf(a) - priorityOf(b) || latest(a, b)
    : latest;
  const ordered = [...cuts.values()].map((cut) => ({ ...cut, rows: [...cut.rows].sort(rowOrder) }));

  if (group === 'day' || group === 'month') return ordered.sort((a, b) => b.key.localeCompare(a.key));
  if (group === 'priority') return ordered.sort((a, b) => a.key.localeCompare(b.key));
  return ordered.sort((a, b) => b.rows.length - a.rows.length || a.key.localeCompare(b.key));
}
