import { CursorGuard } from './pagination';
import { request } from './client';

/**
 * A query cut at its top-level commas.
 *
 * In Todoist a comma splits a filter into several lists shown one under the
 * other (`today, overdue` is two lists). `GET /tasks/filter` refuses commas,
 * so each part is asked for on its own. A comma inside parentheses, or
 * escaped as `\,` in a name, is part of the query and is not a split.
 */
export function splitQuery(query: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (let at = 0; at < query.length; at += 1) {
    const char = query[at];
    if (char === '\\' && at + 1 < query.length) {
      current += char + query[at + 1];
      at += 1;
      continue;
    }
    if (char === '(') depth += 1;
    if (char === ')') depth = Math.max(0, depth - 1);
    if (char === ',' && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  parts.push(current);
  return parts.map((part) => part.trim()).filter(Boolean);
}

/** The most Todoist sends per page. */
const PAGE_SIZE = 200;

/**
 * The ids of the tasks one query matches, in the order Todoist returns them.
 *
 * Todoist evaluates the query, so the answer is exactly what its own app
 * shows. `lang` is the language the query is written in (a French account
 * writes `aujourd'hui`); Todoist reads English as well whatever it says.
 */
export async function fetchFilterIds(
  query: string, lang?: string, signal?: AbortSignal,
): Promise<string[]> {
  const ids: string[] = [];
  let cursor: string | undefined;
  const guard = new CursorGuard();
  do {
    const page = await request<{ results?: Array<{ id: string }>; next_cursor?: string | null }>(
      '/tasks/filter', { query: { query, lang, cursor, limit: PAGE_SIZE }, signal },
    );
    for (const task of page.results ?? []) ids.push(task.id);
    guard.next(page.next_cursor);
    cursor = page.next_cursor ?? undefined;
  } while (cursor);
  return ids;
}
