import { colorValue } from './colors';
import { isOverdue, isToday } from './dates';
import type { Item, TableColumn, SortKey, ViewPrefs } from './types';
import type { TranslationKey } from '@/i18n';
import type { IconName } from '@/components/Icon';
export const TABLE_COLUMNS: TableColumn[] = ['title', 'date', 'deadline', 'priority', 'estimate', 'labels', 'description', 'project', 'assignee'];
const known = (list: readonly TableColumn[] | undefined): TableColumn[] =>
  (list ?? []).filter((column, at, all) => TABLE_COLUMNS.includes(column) && all.indexOf(column) === at);

/** The columns that are shown, in the order they read. The title is always one of them: it leads unless the user moved it. */
export const tableColumns = (prefs: ViewPrefs): TableColumn[] => {
  const chosen = known(prefs.tableColumns ?? TABLE_COLUMNS.slice(0, 6));
  return chosen.includes('title') ? chosen : ['title', ...chosen];
};
/** Every column, the title included, shown or not, in the order Display lists them: the saved order, then any it has not met. */
export const tableColumnOrder = (prefs: ViewPrefs): TableColumn[] => {
  const saved = known(prefs.tableOrder);
  /* An order saved before the title could move has no title in it: it leads. */
  const order = saved.includes('title') ? [...saved] : ['title' as TableColumn, ...saved];
  /* A column shown but missing from the saved order (an older setting) takes its place among the shown ones. */
  for (const column of tableColumns(prefs)) if (!order.includes(column)) order.push(column);
  for (const column of TABLE_COLUMNS) if (!order.includes(column)) order.push(column);
  return order;
};
export const tableColumnLabel: Record<TableColumn, TranslationKey> = {
  title: 'table.title', date: 'detail.startDate', deadline: 'detail.deadline', priority: 'detail.priority',
  estimate: 'detail.estimate', labels: 'detail.labels', description: 'detail.description', project: 'detail.project',
  assignee: 'detail.assignee',
};
/** What each column is, drawn beside its name where the columns are listed (#401). */
export const tableColumnIcon: Record<TableColumn, IconName> = {
  title: 'checkbox', date: 'calendar', deadline: 'deadline', priority: 'flag', estimate: 'clock',
  labels: 'tag', description: 'file', project: 'project', assignee: 'user',
};
export const tableColumnSort: Record<TableColumn, SortKey> = {
  title: 'alphabetical', date: 'due', deadline: 'deadline', priority: 'priority', estimate: 'estimate-asc',
  labels: 'label', description: 'description', project: 'project', assignee: 'assignee',
};

/**
 * A layout as it is saved: the full order, hidden columns included, and the
 * shown ones read in that same order. Every way of changing the columns (the
 * Display submenu, a drag on a heading, the heading's menu) ends here, so they
 * can never disagree (#335). The title is always shown, wherever it sits.
 */
export const tableLayoutPatch = (order: TableColumn[], on: TableColumn[]): Pick<ViewPrefs, 'tableOrder' | 'tableColumns'> =>
  ({ tableOrder: order, tableColumns: order.filter((column) => column === 'title' || on.includes(column)) });

/** Puts `column` where `over` is: what a drag does. Null when nothing moves. */
export function dropTableColumn(prefs: ViewPrefs, column: TableColumn, over: TableColumn): ReturnType<typeof tableLayoutPatch> | null {
  if (column === over) return null;
  const order = tableColumnOrder(prefs);
  const from = order.indexOf(column);
  const to = order.indexOf(over);
  if (from < 0 || to < 0) return null;
  const next = [...order];
  next.splice(to, 0, next.splice(from, 1)[0]);
  return tableLayoutPatch(next, tableColumns(prefs));
}

/** The shown column next to `column`, on its left (-1) or right (1); null at the edge. */
export function neighbourColumn(prefs: ViewPrefs, column: TableColumn, by: -1 | 1): TableColumn | null {
  const shown = tableColumns(prefs);
  const at = shown.indexOf(column);
  return at < 0 ? null : shown[at + by] ?? null;
}

/** One step left or right among the shown columns, hidden ones keeping their own place in the order. */
export const stepTableColumn = (prefs: ViewPrefs, column: TableColumn, by: -1 | 1) => {
  const neighbour = neighbourColumn(prefs, column, by);
  return neighbour ? dropTableColumn(prefs, column, neighbour) : null;
};

/** Switches a column off or on; the Title cannot be hidden. */
export function toggleTableColumn(prefs: ViewPrefs, column: TableColumn): ReturnType<typeof tableLayoutPatch> | null {
  if (column === 'title') return null;
  const on = tableColumns(prefs);
  return tableLayoutPatch(tableColumnOrder(prefs), on.includes(column) ? on.filter((one) => one !== column) : [...on, column]);
}

export const COLUMN_MIN = 56;
export const COLUMN_MAX = 640;
/** The width a column starts with, before the user pulls its edge. The title has a floor and takes the rest. */
export const defaultColumnWidth = (column: TableColumn): number =>
  column === 'title' ? 240 : column === 'description' ? 240 : column === 'labels' || column === 'project' ? 160
    : column === 'assignee' ? 56 : column === 'date' ? 140 : column === 'deadline' ? 130 : 110;
export const clampColumnWidth = (width: number): number => Math.min(COLUMN_MAX, Math.max(COLUMN_MIN, Math.round(width)));

/** One column's width with the user's choice applied. */
export const columnWidth = (prefs: ViewPrefs, column: TableColumn): number =>
  clampColumnWidth(prefs.tableWidths?.[column] ?? defaultColumnWidth(column));

/** A row tint never replaces selection or the keyboard cursor. */
export function tableRowColor(item: Item, coloration: ViewPrefs['tableColoration'], projectColor?: string): string | undefined {
  if (coloration === 'priority') return `var(--p${5 - item.priority})`;
  if (coloration === 'project') return colorValue(projectColor);
  if (coloration === 'date' && item.due) return isOverdue(item) ? 'var(--late)' : isToday(item) ? 'var(--date-today)' : 'var(--date-week)';
  return undefined;
}
