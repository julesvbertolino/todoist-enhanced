import { ApiError, request } from './client';
import type { CompletedItem } from '@/domain/types';
import { addDays, differenceInCalendarDays, min as earliest } from 'date-fns';

/**
 * Reading history, for Insights.
 *
 * Todoist caps how wide a single completed-tasks query may be, so a long
 * period is walked in windows and stitched back together. Each window is also
 * paginated by cursor.
 */

/**
 * How wide one completed-tasks query is.
 *
 * The v1 docs allow a range of "up to 3 months". Eighty-nine days stays inside
 * that whichever three months are meant, and makes a year five windows
 * instead of the nine it took at 42.
 */
const WINDOW_DAYS = 89;
/** The narrowest a window is halved to before a refusal is taken as final. */
const MIN_WINDOW_DAYS = 7;
const PAGE_LIMIT = 200;
/**
 * How many windows are in the air at once.
 *
 * A year is nine windows and was nine round trips end to end, each waiting for
 * the one before it to finish — which is most of why a year of Insights took
 * as long as it did. Four at a time is several times faster and still well
 * short of anything Todoist rate-limits.
 */
const CONCURRENT_WINDOWS = 4;

/** Narrows a query to one project, for a page that shows only its own. */
export interface CompletedScope {
  project_id?: string;
}

interface CompletedResponse {
  items: CompletedItem[];
  next_cursor?: string | null;
}

/** What a read of the history asks for beyond the completed tasks themselves. */
export interface CompletedOptions {
  /**
   * Counts every completion of a recurring task too (#331). Todoist's
   * by-completion-date list leaves them out, so Insights asks for them; the
   * pages that count a project's finished tasks do not, as Todoist's own
   * project figure does not.
   */
  recurring?: boolean;
}

/** An entry of the older `/tasks/completed`, which does list each occurrence. */
interface CompletionEntry {
  id: string;
  task_id: string;
  user_id: string;
  project_id: string;
  section_id: string | null;
  content: string;
  completed_at: string;
  note_count?: number;
  item_object?: (Partial<CompletedItem> & { due?: { is_recurring?: boolean } | null; parent_id?: string | null }) | null;
}

async function fetchWindow(
  since: Date,
  until: Date,
  signal?: AbortSignal,
  scope: CompletedScope = {},
): Promise<CompletedItem[]> {
  const out: CompletedItem[] = [];
  let cursor: string | undefined;

  do {
    const page = await request<CompletedResponse>('/tasks/completed/by_completion_date', {
      /* Exact instants, never bare dates (#131). A bare date is read as
         midnight UTC and the end of a range is not included, so a range that
         ended on a day left that whole day out: a day asked for as
         `since=D&until=D` was an empty window and showed nothing, the last day
         of every period was missing, and the first hours of a period in a
         zone ahead of UTC fell before it. Ranges are local start and end of
         day, so their instants are exactly the period the person sees. */
      query: {
        since: since.toISOString(),
        until: until.toISOString(),
        limit: PAGE_LIMIT,
        cursor,
        ...scope,
      },
      signal,
    });
    out.push(...(page.items ?? []));
    cursor = page.next_cursor ?? undefined;
  } while (cursor);

  return out;
}

/**
 * The completions of recurring tasks in one window (#331).
 *
 * `/tasks/completed/by_completion_date` has none of them, and the activity log
 * lists a reopened task twice; `/tasks/completed` lists each occurrence once
 * and a task completed, reopened and completed again once, as Todoist counts
 * them (measured on a test account). It has no cursor: it pages by offset, and
 * a page can hold fewer entries than asked while more follow, so the walk ends
 * on an empty page. `annotate_items` brings the task's priority, labels and
 * duration, which the history is read with.
 */
async function fetchRecurringWindow(
  since: Date,
  until: Date,
  signal?: AbortSignal,
  scope: CompletedScope = {},
): Promise<CompletedItem[]> {
  const out: CompletedItem[] = [];
  for (let offset = 0; ; offset += PAGE_LIMIT) {
    const page = await request<{ items?: CompletionEntry[] }>('/tasks/completed', {
      query: {
        since: since.toISOString(),
        until: until.toISOString(),
        limit: PAGE_LIMIT,
        offset,
        annotate_items: 'true',
        ...scope,
      },
      signal,
    });
    const entries = page.items ?? [];
    if (entries.length === 0) return out;
    for (const entry of entries) {
      const task = entry.item_object;
      if (!task?.due?.is_recurring) continue;
      out.push({
        id: entry.task_id,
        task_id: entry.task_id,
        user_id: entry.user_id,
        project_id: entry.project_id,
        section_id: entry.section_id,
        content: entry.content,
        completed_at: entry.completed_at,
        note_count: entry.note_count,
        labels: task.labels,
        duration: task.duration,
        priority: task.priority,
        responsible_uid: task.responsible_uid,
      });
    }
  }
}

/** The same completion to the second, whichever endpoint reported it. */
const completionKey = (item: CompletedItem) => `${item.task_id ?? item.id}:${item.completed_at.slice(0, 19)}`;

/**
 * Cuts a period into consecutive windows of at most `days`.
 *
 * Contiguous on instants: each window ends where the next begins, so no
 * moment of the period is left between two of them. Something completed
 * exactly on a boundary is fetched twice, and `unique` takes the repeat out.
 */
export function windowsOf(since: Date, until: Date, days: number): Array<{ since: Date; until: Date }> {
  const windows: Array<{ since: Date; until: Date }> = [];
  let cursorDate = since;
  while (cursorDate < until) {
    const windowEnd = earliest([addDays(cursorDate, days), until]);
    windows.push({ since: cursorDate, until: windowEnd });
    cursorDate = windowEnd;
  }
  return windows;
}

/** The same completion once, however many windows reached it. */
function unique(items: CompletedItem[]): CompletedItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.id}:${item.completed_at}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * One window, narrowed if Todoist says it is too wide.
 *
 * The range the endpoint accepts is a documented number that has already
 * moved once. If it moves again, a refusal about the range halves the window
 * and tries again, so the page gets slower rather than empty.
 */
async function fetchRange(
  since: Date,
  until: Date,
  days: number,
  signal?: AbortSignal,
  scope: CompletedScope = {},
  options: CompletedOptions = {},
): Promise<CompletedItem[]> {
  try {
    const main = await fetchWindow(since, until, signal, scope);
    if (!options.recurring) return main;
    /* An older endpoint: if Todoist retires it, the history is what it was
       before this, not an error page. */
    const extra = await fetchRecurringWindow(since, until, signal, scope).catch((error: unknown) => {
      if (signal?.aborted) throw error;
      return [] as CompletedItem[];
    });
    const known = new Set(main.map(completionKey));
    return [...main, ...extra.filter((item) => !known.has(completionKey(item)))];
  } catch (error) {
    const narrower = Math.floor(days / 2);
    if (!(error instanceof ApiError) || error.status !== 400 || narrower < MIN_WINDOW_DAYS) throw error;
    const results: CompletedItem[] = [];
    for (const window of windowsOf(since, until, narrower)) {
      results.push(...await fetchRange(window.since, window.until, narrower, signal, scope, options));
    }
    return unique(results);
  }
}

export async function fetchCompleted(
  since: Date,
  until: Date,
  signal?: AbortSignal,
  scope: CompletedScope = {},
  options: CompletedOptions = {},
): Promise<CompletedItem[]> {
  const span = differenceInCalendarDays(until, since);
  if (span <= WINDOW_DAYS) return fetchRange(since, until, WINDOW_DAYS, signal, scope, options);

  // Work out every window first, then fetch them a few at a time.
  const windows = windowsOf(since, until, WINDOW_DAYS);

  const results: CompletedItem[] = [];
  for (let at = 0; at < windows.length; at += CONCURRENT_WINDOWS) {
    const batch = windows.slice(at, at + CONCURRENT_WINDOWS);
    const pages = await Promise.all(
      batch.map((window) => fetchRange(window.since, window.until, WINDOW_DAYS, signal, scope, options)),
    );
    for (const page of pages) results.push(...page);
  }

  // Windows meet at a boundary instant, so what is completed on one is in two.
  return unique(results);
}
