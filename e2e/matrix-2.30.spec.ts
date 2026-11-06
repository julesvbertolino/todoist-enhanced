import { test, expect, go } from './demo';
test.skip(process.env.PLAYWRIGHT_DEV !== '1', 'Uses development store fixture');

/** The cards on the page: a subtask nested under its parent's card is not one. */
const cardCount = (page: import('@playwright/test').Page) =>
  page.locator('.screen.active [data-task-id]').evaluateAll((nodes) => nodes.filter((node) => !node.closest('[data-depth]')).length);

/** Puts tasks into the demo's store, the way the matrix-scope spec does. */
const seed = (page: import('@playwright/test').Page, tasks: { id: string; content: string; parent?: string; today?: boolean; priority?: number }[]) =>
  page.evaluate(async (list) => {
    const url = performance.getEntriesByType('resource').map(e => e.name).find(s => /\/src\/store\/store\.ts(?:\?|$)/.test(s))!;
    const { useStore } = await import(url); const state = useStore.getState();
    const base = Object.values(state.snapshot.items)[0] as Record<string, unknown>;
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const added = Object.fromEntries(list.map((task) => [task.id, {
      ...base, id: task.id, content: task.content, checked: false, is_deleted: false, parent_id: task.parent ?? null, labels: [], responsible_uid: null,
      priority: task.priority ?? 1, due: task.today ? { date, string: date, timezone: null, lang: 'en', is_recurring: false } : null,
    }]));
    useStore.setState({ snapshot: { ...state.snapshot, items: { ...state.snapshot.items, ...added } } });
    useStore.getState().setPrefs({ eisenhowerEnabled: true });
  }, tasks);

test('a subtask due today is a card of its own, once, and Show subtasks off puts it away (#448)', async ({ demo: page }) => {
  await seed(page, [
    { id: 'sub-parent', content: 'Parent without a date' },
    { id: 'sub-a', content: 'Subtask A today', parent: 'sub-parent', today: true, priority: 4 },
    { id: 'sub-b', content: 'Subtask B today', parent: 'sub-parent', today: true },
  ]);
  await go(page, '#/matrix');
  for (const id of ['sub-a', 'sub-b']) await expect(page.locator(`.screen.active [data-task-id="${id}"]`)).toHaveCount(1);
  await expect(page.locator('.screen.active [data-task-id="sub-a"] .parentchip')).toContainText('Parent without a date');
  const count = await cardCount(page);
  await expect(page.locator('.sidebar').getByRole('button', { name: /Eisenhower Matrix/ }).locator('.count')).toHaveText(String(count));

  await page.getByRole('button', { name: /^Display/ }).click();
  await page.getByRole('switch', { name: 'Show subtasks' }).click();
  await expect(page.locator('.screen.active [data-task-id="sub-a"]')).toHaveCount(0);
  await expect(page.locator('.sidebar').getByRole('button', { name: /Eisenhower Matrix/ }).locator('.count')).toHaveText(String(count - 2));
});

test('the sort choice reorders every quadrant, is kept, and Reset restores the default (#447)', async ({ demo: page }) => {
  await seed(page, [
    { id: 'sort-b', content: 'Bravo sort', today: true, priority: 1 },
    { id: 'sort-a', content: 'Alpha sort', today: true, priority: 1 },
    { id: 'sort-c', content: 'Charlie sort', today: true, priority: 2 },
  ]);
  await go(page, '#/matrix');
  await expect(page.locator('.screen.active .eisenhower-page')).toBeVisible();
  const order = () => page.locator('.screen.active .quadrant.urgent-not-important [data-task-id^="sort-"]').evaluateAll((nodes) => nodes.map((n) => n.getAttribute('data-task-id')));
  expect(await order()).toEqual(['sort-c', 'sort-a', 'sort-b']);

  await page.getByRole('button', { name: /^Display/ }).click();
  await page.getByRole('button', { name: 'Sort', exact: true }).click();
  await page.getByRole('option', { name: 'Name' }).click();
  expect(await order()).toEqual(['sort-a', 'sort-b', 'sort-c']);

  await go(page, '#/week');
  await go(page, '#/matrix');
  await expect(page.locator('.screen.active .eisenhower-page')).toBeVisible();
  expect(await order()).toEqual(['sort-a', 'sort-b', 'sort-c']);

  await page.getByRole('button', { name: /^Display/ }).click();
  await page.getByRole('button', { name: 'Reset all' }).click();
  expect(await order()).toEqual(['sort-c', 'sort-a', 'sort-b']);
});

test('the matrix is a homepage choice, and reads as the week once it is switched off (#449)', async ({ demo: page }) => {
  const prefs = (patch: Record<string, unknown>) => page.evaluate(async (next) => {
    const url = performance.getEntriesByType('resource').map(e => e.name).find(s => /\/src\/store\/store\.ts(?:\?|$)/.test(s))!;
    const { useStore } = await import(url);
    useStore.getState().setPrefs(next);
  }, patch);
  await prefs({ eisenhowerEnabled: true });
  await go(page, '#/settings');
  await page.getByRole('button', { name: 'Homepage' }).click();
  await page.getByRole('option', { name: 'Eisenhower Matrix' }).click();
  await expect(page.getByRole('button', { name: 'Homepage' })).toContainText('Eisenhower Matrix');

  await prefs({ eisenhowerEnabled: false });
  await expect(page.getByRole('button', { name: 'Homepage' })).toContainText('This week');
  await page.getByRole('button', { name: 'Homepage' }).click();
  await expect(page.getByRole('option', { name: 'Eisenhower Matrix' })).toHaveCount(0);
});

test('the matrix is a layout of a project and keeps the global rules (#450)', async ({ demo: page }) => {
  await seed(page, [{ id: 'lay-a', content: 'Layout urgent today', today: true, priority: 4 }]);
  const project = await page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').map(e => e.name).find(s => /\/src\/store\/store\.ts(?:\?|$)/.test(s))!;
    const { useStore } = await import(url); const state = useStore.getState();
    const id = (Object.values(state.snapshot.projects) as { id: string; inbox_project?: boolean }[]).find((p) => !p.inbox_project)!.id;
    const first = state.snapshot.items['lay-a'];
    useStore.setState({ snapshot: { ...state.snapshot, items: { ...state.snapshot.items, 'lay-a': { ...first, project_id: id } } } });
    return id;
  });
  await go(page, `#/project/${project}`);
  await page.getByRole('button', { name: /^Display/ }).click();
  await page.locator('.display-modes').getByRole('button', { name: 'Matrix' }).click();
  await expect(page.locator('.screen.active .quadrant')).toHaveCount(4);
  await expect(page.locator('.screen.active .quadrant.urgent-important [data-task-id="lay-a"]')).toHaveCount(1);

  /* The rules of the Matrix page are in this Display panel too, and moving one moves the card. */
  await expect(page.getByRole('heading', { name: 'What makes a task urgent' })).toBeVisible();
  await page.locator('.displaypanel .chiprow').first().getByRole('button', { name: 'Today' }).click();
  await expect(page.locator('.screen.active .quadrant.not-urgent-important [data-task-id="lay-a"]')).toHaveCount(1);

  /* The page keeps its own rules: the Matrix page is untouched, and the page can follow it again. */
  await go(page, '#/matrix');
  await expect(page.locator('.screen.active .quadrant.urgent-important [data-task-id="lay-a"]')).toHaveCount(1);
  await go(page, `#/project/${project}`);
  await expect(page.locator('.screen.active .quadrant.not-urgent-important [data-task-id="lay-a"]')).toHaveCount(1);
  await page.getByRole('button', { name: /^Display/ }).click();
  await page.getByRole('button', { name: 'Follow the Matrix page again' }).click();
  await expect(page.locator('.screen.active .quadrant.urgent-important [data-task-id="lay-a"]')).toHaveCount(1);
});

test('a subtask with a date of its own is a card even in its parent\'s quadrant (#448)', async ({ demo: page }) => {
  await seed(page, [
    { id: 'same-parent', content: 'Parent today', today: true, priority: 2 },
    { id: 'same-sub', content: 'Subtask today', parent: 'same-parent', today: true, priority: 2 },
  ]);
  await go(page, '#/matrix');
  await expect(page.locator('.screen.active .quadrant [data-task-id="same-sub"] .parentchip')).toContainText('Parent today');
});
