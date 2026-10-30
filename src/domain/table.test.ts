import { describe, expect, it } from 'vitest';
import { clampColumnWidth, columnWidth, dropTableColumn, neighbourColumn, stepTableColumn, tableColumnOrder, tableColumns, toggleTableColumn } from './table';
import { pageClass } from './pageLayout';
import { defaultViewPrefs, type ViewPrefs } from './types';

describe('table columns', () => {
  const view = defaultViewPrefs('inbox');

  it('opens with the default columns, title first', () => {
    expect(tableColumns(view)).toEqual(['title', 'date', 'deadline', 'priority', 'estimate', 'labels']);
  });

  it('follows the order the user chose, the title wherever they put it', () => {
    expect(tableColumns({ ...view, tableColumns: ['labels', 'project', 'title', 'date'] }))
      .toEqual(['labels', 'project', 'title', 'date']);
  });

  it('puts the title first when a saved list does not mention it', () => {
    expect(tableColumns({ ...view, tableColumns: ['labels', 'date'] })).toEqual(['title', 'labels', 'date']);
  });

  it('ignores a column listed twice or unknown to this version', () => {
    const odd = ['date', 'date', 'gone'] as unknown as Parameters<typeof tableColumns>[0]['tableColumns'];
    expect(tableColumns({ ...view, tableColumns: odd })).toEqual(['title', 'date']);
  });
});

describe('page layout', () => {
  const view = defaultViewPrefs('inbox');

  it('keeps a list to a reading width unless it asks for the whole page', () => {
    expect(pageClass({ ...view, mode: 'list' })).toBe('page narrow');
    expect(pageClass({ ...view, mode: 'list', fullWidth: true })).toBe('page');
  });

});

describe('the order of the columns (#333)', () => {
  const prefs = (extra: Partial<ViewPrefs> = {}): ViewPrefs => ({ ...defaultViewPrefs('project:p'), ...extra });

  it('lists every column, the title first when nothing was saved', () => {
    expect(tableColumnOrder(prefs())).toEqual(['title', 'date', 'deadline', 'priority', 'estimate', 'labels', 'description', 'project', 'assignee']);
  });

  it('keeps a saved order, hidden columns included', () => {
    const order = tableColumnOrder(prefs({ tableOrder: ['project', 'date', 'labels'], tableColumns: ['title', 'date', 'labels'] }));
    expect(order.slice(0, 4)).toEqual(['title', 'project', 'date', 'labels']);
    expect(order).toHaveLength(9);
  });

  it('keeps a title that was moved, and ignores duplicates and columns that do not exist', () => {
    const order = tableColumnOrder(prefs({ tableOrder: ['date', 'title', 'date', 'nope' as never] }));
    expect(order.slice(0, 2)).toEqual(['date', 'title']);
    expect(order.filter((column) => column === 'date')).toHaveLength(1);
    expect(order).not.toContain('nope');
  });
});

describe('the column layout, from a heading or from Display (#335)', () => {
  const view = defaultViewPrefs('inbox');

  it('keeps an old layout as it was: the assignee is a column nobody has yet', () => {
    expect(tableColumns({ ...view, tableColumns: ['date', 'priority'] })).toEqual(['title', 'date', 'priority']);
    expect(tableColumns(view)).not.toContain('assignee');
    expect(tableColumnOrder(view)).toContain('assignee');
  });

  it('puts a dragged column where the one it was dropped on is, hidden columns keeping their place', () => {
    const patch = dropTableColumn(view, 'labels', 'date')!;
    expect(patch.tableOrder!.slice(0, 4)).toEqual(['title', 'labels', 'date', 'deadline']);
    expect(patch.tableColumns).toEqual(['title', 'labels', 'date', 'deadline', 'priority', 'estimate']);
    expect(dropTableColumn(view, 'date', 'date')).toBeNull();
  });

  it('lets a column go in front of the Title, and the Title go after one', () => {
    const before = { ...view, ...dropTableColumn(view, 'date', 'title')! };
    expect(tableColumns(before).slice(0, 3)).toEqual(['date', 'title', 'deadline']);
    const after = { ...view, ...dropTableColumn(view, 'title', 'deadline')! };
    expect(tableColumns(after).slice(0, 3)).toEqual(['date', 'deadline', 'title']);
    expect({ ...view, ...stepTableColumn(view, 'title', 1)! }.tableColumns!.slice(0, 2)).toEqual(['date', 'title']);
  });

  it('cannot hide the Title', () => {
    expect(toggleTableColumn(view, 'title')).toBeNull();
    const nothing = { ...view, tableColumns: [] as ViewPrefs['tableColumns'] };
    expect(tableColumns(nothing)).toEqual(['title']);
  });

  it('steps over the shown neighbour, not over a hidden column', () => {
    const hidden = { ...view, tableColumns: ['date', 'priority'] as ViewPrefs['tableColumns'] };
    expect(neighbourColumn(hidden, 'date', 1)).toBe('priority');
    expect(stepTableColumn(hidden, 'date', 1)!.tableColumns).toEqual(['title', 'priority', 'date']);
  });

  it('has no step past either edge', () => {
    expect(neighbourColumn(view, 'title', -1)).toBeNull();
    expect(neighbourColumn(view, 'labels', 1)).toBeNull();
  });

  it('hides a column and brings it back to the place it had', () => {
    const hidden = { ...view, ...toggleTableColumn(view, 'deadline')! };
    expect(tableColumns(hidden)).not.toContain('deadline');
    const back = { ...hidden, ...toggleTableColumn(hidden, 'deadline')! };
    expect(tableColumns(back)).toEqual(tableColumns(view));
  });
});

describe('column widths', () => {
  const view = defaultViewPrefs('inbox');

  it('starts from each column\'s own width and keeps the one the user pulled', () => {
    expect(columnWidth(view, 'date')).toBe(140);
    expect(columnWidth({ ...view, tableWidths: { date: 200 } }, 'date')).toBe(200);
  });

  it('keeps a width between a readable minimum and a sane maximum', () => {
    expect(clampColumnWidth(10)).toBe(56);
    expect(clampColumnWidth(5000)).toBe(640);
    expect(columnWidth({ ...view, tableWidths: { labels: 4 } }, 'labels')).toBe(56);
  });
});
