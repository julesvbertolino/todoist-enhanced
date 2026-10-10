import { describe, expect, it } from 'vitest';
import { datedRoots, groupItems, projectTree, pullQuick, sortItems } from './selectors';
import { emptySnapshot, type Project, type Section, type Snapshot } from '@/domain/types';
import { due, item } from '@/test/items';

const project = (id: string, child_order: number, extra: Partial<Project> = {}): Project => ({
  id, name: id, color: 'grey', parent_id: null, child_order,
  is_archived: false, is_deleted: false, is_favorite: false, workspace_id: null, ...extra,
});
const section = (id: string, project_id: string, section_order: number): Section => ({
  id, project_id, name: id, section_order, is_archived: false, is_deleted: false,
});

const snapshot: Snapshot = {
  ...emptySnapshot(),
  projects: {
    inbox: project('inbox', 0, { inbox_project: true }),
    home: project('home', 1),
    folder: project('folder', 2, { is_folder: true }),
    site: project('site', 1, { parent_id: 'folder' }),
    work: project('work', 3),
  },
  sections: {
    later: section('later', 'home', 2),
    first: section('first', 'home', 1),
    design: section('design', 'site', 1),
  },
};

const labels = {
  none: '', noProject: 'No project', noSection: 'No section', noEstimate: '', noLabel: '',
  priority: (p: number) => `P${p}`, day: () => '', scheduled: '', available: '',
};

/* The case reported: grouped by project and sorted by priority, the project
   holding a P1 went to the top. */
const tasks = [
  item({ id: 'w', project_id: 'work', priority: 4 }),
  item({ id: 's', project_id: 'site', section_id: 'design', priority: 1 }),
  item({ id: 'h1', project_id: 'home', section_id: 'later', priority: 2 }),
  item({ id: 'h2', project_id: 'home', section_id: 'first', priority: 3 }),
  item({ id: 'h3', project_id: 'home', priority: 1 }),
  item({ id: 'i', project_id: 'inbox', priority: 1 }),
];
const sorted = sortItems(tasks, 'priority', () => []);
const keys = (group: Parameters<typeof groupItems>[1]) =>
  groupItems(sorted, group, snapshot, labels).map((g) => g.key);

describe('groupItems', () => {
  it('lists projects in sidebar order whatever the sort', () => {
    expect(keys('project')).toEqual(['inbox', 'home', 'site', 'work']);
  });

  it('sorts the tasks inside each project', () => {
    const home = groupItems(sorted, 'project', snapshot, labels).find((g) => g.key === 'home')!;
    expect(home.items.map((task) => task.id)).toEqual(['h2', 'h1', 'h3']);
  });

  it('lists sections by project, then section order, with no section first', () => {
    expect(keys('section')).toEqual(['none', 'first', 'later', 'design']);
  });

  it('lists priorities from P1 to P4', () => {
    expect(keys('priority')).toEqual(['p1', 'p2', 'p3', 'p4']);
  });
});

describe('sortItems by priority (#98 follow-up)', () => {
  const due = (date: string) => ({ date, is_recurring: false, string: '', lang: 'en', timezone: null });

  it('breaks a tie between same-priority tasks by their date, soonest first', () => {
    const items = [
      item({ id: 'later', priority: 4, due: due('2026-10-05') }),
      item({ id: 'sooner', priority: 4, due: due('2026-10-01') }),
      item({ id: 'undated', priority: 4 }),
    ];
    expect(sortItems(items, 'priority', () => []).map((i) => i.id))
      .toEqual(['sooner', 'later', 'undated']);
  });

  it('still puts a higher priority first, whatever its date', () => {
    const items = [
      item({ id: 'p2-soon', priority: 3, due: due('2026-10-01') }),
      item({ id: 'p1-late', priority: 4, due: due('2026-10-20') }),
    ];
    expect(sortItems(items, 'priority', () => []).map((i) => i.id)).toEqual(['p1-late', 'p2-soon']);
  });
});

describe('sortItems in a list drawn from several projects (#182)', () => {
  const today = due('2026-10-08');
  const ids = (list: ReturnType<typeof item>[], sort: 'priority' | 'due' | 'alphabetical' = 'priority') =>
    sortItems(list, sort, () => [], 'day', snapshot, true).map((i) => i.id);

  it('puts the project listed higher in the sidebar first at equal priority and date', () => {
    const list = [
      item({ id: 'work', project_id: 'work', priority: 3, due: today, added_at: '2026-01-01T00:00:00Z' }),
      item({ id: 'home', project_id: 'home', priority: 3, due: today, added_at: '2026-02-01T00:00:00Z' }),
      item({ id: 'inbox', project_id: 'inbox', priority: 3, due: today, added_at: '2026-03-01T00:00:00Z' }),
      item({ id: 'site', project_id: 'site', priority: 3, due: today, added_at: '2026-04-01T00:00:00Z' }),
    ];
    // Inbox leads, then the sidebar from top to bottom, a nested project right after its folder.
    expect(ids(list)).toEqual(['inbox', 'home', 'site', 'work']);
    expect(ids(list, 'due')).toEqual(['inbox', 'home', 'site', 'work']);
  });

  it('keeps priority and date ahead of the project', () => {
    const list = [
      item({ id: 'home-p3', project_id: 'home', priority: 3, due: today }),
      item({ id: 'work-p4', project_id: 'work', priority: 4, due: today }),
      item({ id: 'work-sooner', project_id: 'work', priority: 3, due: due('2026-10-07') }),
    ];
    expect(ids(list)).toEqual(['work-p4', 'work-sooner', 'home-p3']);
  });

  it('keeps a hand-made order ahead of the project', () => {
    const list = [
      item({ id: 'home', project_id: 'home', priority: 3, due: today }),
      item({ id: 'work', project_id: 'work', priority: 3, due: today, day_order: 1 }),
    ];
    expect(ids(list)).toEqual(['work', 'home']);
  });

  it('keeps the order within one project, and other sorts untouched', () => {
    const list = [
      item({ id: 'b', content: 'b', project_id: 'work', priority: 3, due: today, added_at: '2026-02-01T00:00:00Z' }),
      item({ id: 'a', content: 'a', project_id: 'home', priority: 3, due: today, added_at: '2026-03-01T00:00:00Z' }),
      item({ id: 'c', content: 'c', project_id: 'home', priority: 3, due: today, added_at: '2026-01-01T00:00:00Z' }),
    ];
    expect(ids(list)).toEqual(['c', 'a', 'b']);
    expect(ids(list, 'alphabetical')).toEqual(['a', 'b', 'c']);
  });

  it('leaves the order of arrival alone when the page does not ask for projects', () => {
    const list = [
      item({ id: 'work', project_id: 'work', priority: 3, due: today, added_at: '2026-01-01T00:00:00Z' }),
      item({ id: 'home', project_id: 'home', priority: 3, due: today, added_at: '2026-02-01T00:00:00Z' }),
    ];
    expect(sortItems(list, 'priority', () => [], 'day', snapshot).map((i) => i.id)).toEqual(['work', 'home']);
  });

  it('puts a project that is not in the sidebar after the others', () => {
    const list = [
      item({ id: 'ghost', project_id: 'gone', priority: 3, due: today }),
      item({ id: 'work', project_id: 'work', priority: 3, due: today }),
    ];
    expect(ids(list)).toEqual(['work', 'ghost']);
  });
});

describe('pullQuick (#154)', () => {
  const now = new Date(2026, 9, 7, 12, 0, 0);
  const none = () => [];
  const page = [
    item({ id: 'a', labels: ['est-4'], priority: 1, child_order: 3 }),
    item({ id: 'b', labels: ['est-2'], priority: 4, child_order: 2 }),
    item({ id: 'c', labels: ['est-30'], child_order: 1 }),
    item({ id: 'later', labels: ['est-2'], due: due('2026-10-20') }),
  ];

  it('takes the quick tasks that can be done now and leaves the rest in order', () => {
    const { quick, rest } = pullQuick(page, true, 'manual', none, 'project', snapshot, now);
    expect(quick.map((task) => task.id)).toEqual(['b', 'a']);
    expect(rest.map((task) => task.id)).toEqual(['c', 'later']);
  });

  it("sorts the group the way the page's Display sort asks", () => {
    const { quick } = pullQuick(page, true, 'priority', none, 'project', snapshot, now);
    expect(quick.map((task) => task.id)).toEqual(['b', 'a']);
    const alphabetical = pullQuick(
      [item({ id: 'z', content: 'Zed', labels: ['est-2'] }), item({ id: 'y', content: 'Ay', labels: ['est-2'] })],
      true, 'alphabetical', none, 'project', snapshot, now,
    );
    expect(alphabetical.quick.map((task) => task.id)).toEqual(['y', 'z']);
  });

  it('takes nothing when the Quick group is off', () => {
    const { quick, rest } = pullQuick(page, false, 'manual', none, 'project', snapshot, now);
    expect(quick).toEqual([]);
    expect(rest).toBe(page);
  });
});

describe('the order of the project groups', () => {
  const account = (): Snapshot => ({
    ...emptySnapshot(),
    workspaces: { w1: { id: 'w1', name: 'Studio' }, w2: { id: 'w2', name: 'Client' } },
    projects: {
      a: { id: 'a', name: 'Mine', color: 'red', parent_id: null, child_order: 1, is_archived: false, is_deleted: false, is_favorite: false },
      b: { id: 'b', name: 'S', color: 'red', parent_id: null, child_order: 1, is_archived: false, is_deleted: false, is_favorite: false, workspace_id: 'w1' },
      c: { id: 'c', name: 'C', color: 'red', parent_id: null, child_order: 1, is_archived: false, is_deleted: false, is_favorite: false, workspace_id: 'w2' },
    },
  });
  const keys = (order?: string[]) => projectTree(account(), order).map((g) => g.workspaceId ?? 'personal');

  it('leads with the personal space until the person says otherwise', () => {
    expect(keys()).toEqual(['personal', 'w1', 'w2']);
  });

  it('follows the order given, and puts a group not placed yet after the ones that are', () => {
    expect(keys(['w2', 'personal', 'w1'])).toEqual(['w2', 'personal', 'w1']);
    expect(keys(['w2'])).toEqual(['w2', 'personal', 'w1']);
    expect(keys(['gone', 'w1'])).toEqual(['w1', 'personal', 'w2']);
  });
});

describe('datedRoots (#1)', () => {
  const snap = (items: ReturnType<typeof item>[]): Snapshot => ({ ...emptySnapshot(), items: Object.fromEntries(items.map((i) => [i.id, i])) });

  it('lifts a dated subtask whose parent has no date', () => {
    const parent = item({ id: 'p', due: null, labels: [] });
    const a = item({ id: 'a', parent_id: 'p', due: due('2026-10-10') });
    const b = item({ id: 'b', parent_id: 'p', due: null });
    expect(datedRoots([parent, a, b], snap([parent, a, b])).map((i) => i.id)).toEqual(['p', 'a']);
  });

  it('lifts a subtask dated today under a parent dated tomorrow', () => {
    const parent = item({ id: 'p', due: due('2999-01-02') });
    const a = item({ id: 'a', parent_id: 'p', due: due('2999-01-01') });
    expect(datedRoots([parent, a], snap([parent, a])).map((i) => i.id)).toEqual(['p', 'a']);
  });

  it('leaves a subtask under its parent on the same day, so nothing shows twice', () => {
    const parent = item({ id: 'p', due: due('2999-01-02') });
    const a = item({ id: 'a', parent_id: 'p', due: due('2999-01-02') });
    expect(datedRoots([parent, a], snap([parent, a])).map((i) => i.id)).toEqual(['p']);
  });
});

describe('projectTree keeps empty spaces (#13)', () => {
  it('shows a workspace with no project, and the personal space with none', () => {
    const tree = projectTree({ ...emptySnapshot(), workspaces: { w1: { id: 'w1', name: 'Studio' } } });
    expect(tree.map((g) => [g.workspaceId, g.roots.length])).toEqual([[null, 0], ['w1', 0]]);
  });
});
