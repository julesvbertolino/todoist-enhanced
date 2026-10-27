import { describe, expect, it } from 'vitest';
import { dropTableColumn, neighbourColumn, stepTableColumn, tableColumnOrder, tableColumns, toggleTableColumn } from './table';
import { pageClass } from './pageLayout';
import { defaultViewPrefs, type ViewPrefs } from './types';

describe('table columns', () => {
  const view = defaultViewPrefs('inbox');

  it('opens with the default columns, title first', () => {
    expect(tableColumns(view)).toEqual(['title', 'date', 'deadline', 'priority', 'estimate', 'labels']);
  });

  it('follows the order the user chose, and keeps the title first', () => {
    expect(tableColumns({ ...view, tableColumns: ['labels', 'project', 'title', 'date'] }))
      .toEqual(['title', 'labels', 'project', 'date']);
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

  it('lists every column but the title, the shown ones first when nothing was saved', () => {
    expect(tableColumnOrder(prefs())).toEqual(['date', 'deadline', 'priority', 'estimate', 'labels', 'description', 'project', 'assignee']);
  });

  it('keeps a saved order, hidden columns included', () => {
    const order = tableColumnOrder(prefs({ tableOrder: ['project', 'date', 'labels'], tableColumns: ['title', 'date', 'labels'] }));
    expect(order.slice(0, 3)).toEqual(['project', 'date', 'labels']);
    expect(order).toHaveLength(8);
  });

  it('ignores the title, duplicates and columns that do not exist', () => {
    const order = tableColumnOrder(prefs({ tableOrder: ['title', 'date', 'date', 'nope' as never] }));
    expect(order.filter((column) => column === 'date')).toHaveLength(1);
    expect(order).not.toContain('title');
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
    expect(patch.tableOrder!.slice(0, 3)).toEqual(['labels', 'date', 'deadline']);
    expect(patch.tableColumns).toEqual(['labels', 'date', 'deadline', 'priority', 'estimate']);
    expect(dropTableColumn(view, 'date', 'date')).toBeNull();
  });

  it('never moves the Title, nor moves another column in front of it', () => {
    expect(dropTableColumn(view, 'title', 'date')).toBeNull();
    expect(dropTableColumn(view, 'date', 'title')).toBeNull();
    expect(stepTableColumn(view, 'title', 1)).toBeNull();
    expect(toggleTableColumn(view, 'title')).toBeNull();
  });

  it('steps over the shown neighbour, not over a hidden column', () => {
    const hidden = { ...view, tableColumns: ['date', 'priority'] as ViewPrefs['tableColumns'] };
    expect(neighbourColumn(hidden, 'date', 1)).toBe('priority');
    expect(stepTableColumn(hidden, 'date', 1)!.tableColumns).toEqual(['priority', 'date']);
  });

  it('has no step past either edge', () => {
    expect(neighbourColumn(view, 'date', -1)).toBeNull();
    expect(neighbourColumn(view, 'labels', 1)).toBeNull();
  });

  it('hides a column and brings it back to the place it had', () => {
    const hidden = { ...view, ...toggleTableColumn(view, 'deadline')! };
    expect(tableColumns(hidden)).not.toContain('deadline');
    const back = { ...hidden, ...toggleTableColumn(hidden, 'deadline')! };
    expect(tableColumns(back)).toEqual(tableColumns(view));
  });
});
