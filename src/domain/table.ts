import { colorValue } from './colors';
import { isOverdue, isToday } from './dates';
import type { Item, TableColumn, SortKey, ViewPrefs } from './types';
import type { TranslationKey } from '@/i18n';
import type { IconName } from '@/components/Icon';
export const TABLE_COLUMNS: TableColumn[] = ['title', 'date', 'deadline', 'priority', 'estimate', 'labels', 'description', 'project', 'assignee'];
/** The title always leads; the others follow in the order the user put them. */
export const tableColumns = (prefs: ViewPrefs): TableColumn[] => {
  const chosen = (prefs.tableColumns ?? TABLE_COLUMNS.slice(0, 6)).filter((column, at, all) =>
    column !== 'title' && TABLE_COLUMNS.includes(column) && all.indexOf(column) === at);
  return ['title', ...chosen];
};
/** Every column but the title, in the order Display lists them: the saved order, then any it has not met. */
export const tableColumnOrder = (prefs: ViewPrefs): Exclude<TableColumn, 'title'>[] => {
  const shown = tableColumns(prefs).filter((column): column is Exclude<TableColumn, 'title'> => column !== 'title');
  const saved = (prefs.tableOrder ?? []).filter((column, at, all): column is Exclude<TableColumn, 'title'> =>
    column !== 'title' && TABLE_COLUMNS.includes(column) && all.indexOf(column) === at);
  /* A column shown but missing from the saved order (an older setting) takes its place among the shown ones. */
  const order = [...saved];
  for (const column of shown) if (!order.includes(column)) order.push(column);
  for (const column of TABLE_COLUMNS) if (column !== 'title' && !order.includes(column)) order.push(column);
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

type Movable = Exclude<TableColumn, 'title'>;

/**
 * A layout as it is saved: the full order, hidden columns included, and the
 * shown ones read in that same order. Every way of changing the columns (the
 * Display submenu, a drag on a heading, the heading's menu) ends here, so they
 * can never disagree (#335).
 */
export const tableLayoutPatch = (order: Movable[], on: Movable[]): Pick<ViewPrefs, 'tableOrder' | 'tableColumns'> =>
  ({ tableOrder: order, tableColumns: order.filter((column) => on.includes(column)) });

const shownMovable = (prefs: ViewPrefs): Movable[] =>
  tableColumns(prefs).filter((column): column is Movable => column !== 'title');

/** Puts `column` where `over` is: what a drag does. Null when nothing moves, or the Title is involved. */
export function dropTableColumn(prefs: ViewPrefs, column: TableColumn, over: TableColumn): ReturnType<typeof tableLayoutPatch> | null {
  if (column === 'title' || over === 'title' || column === over) return null;
  const order = tableColumnOrder(prefs);
  const from = order.indexOf(column);
  const to = order.indexOf(over);
  if (from < 0 || to < 0) return null;
  const next = [...order];
  next.splice(to, 0, next.splice(from, 1)[0]);
  return tableLayoutPatch(next, shownMovable(prefs));
}

/** The shown column next to `column`, on its left (-1) or right (1); null at the edge or for the Title. */
export function neighbourColumn(prefs: ViewPrefs, column: TableColumn, by: -1 | 1): Movable | null {
  if (column === 'title') return null;
  const shown = shownMovable(prefs);
  return shown[shown.indexOf(column) + by] ?? null;
}

/** One step left or right among the shown columns, hidden ones keeping their own place in the order. */
export const stepTableColumn = (prefs: ViewPrefs, column: TableColumn, by: -1 | 1) => {
  const neighbour = neighbourColumn(prefs, column, by);
  return neighbour ? dropTableColumn(prefs, column, neighbour) : null;
};

/** Switches a column off or on; the Title cannot be hidden. */
export function toggleTableColumn(prefs: ViewPrefs, column: TableColumn): ReturnType<typeof tableLayoutPatch> | null {
  if (column === 'title') return null;
  const on = shownMovable(prefs);
  return tableLayoutPatch(tableColumnOrder(prefs), on.includes(column) ? on.filter((one) => one !== column) : [...on, column]);
}

/** A row tint never replaces selection or the keyboard cursor. */
export function tableRowColor(item: Item, coloration: ViewPrefs['tableColoration'], projectColor?: string): string | undefined {
  if (coloration === 'priority') return `var(--p${5 - item.priority})`;
  if (coloration === 'project') return colorValue(projectColor);
  if (coloration === 'date' && item.due) return isOverdue(item) ? 'var(--late)' : isToday(item) ? 'var(--date-today)' : 'var(--date-week)';
  return undefined;
}
