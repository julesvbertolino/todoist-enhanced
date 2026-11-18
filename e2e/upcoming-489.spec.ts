import { test, expect, go } from './demo';
import type { Page } from '@playwright/test';
type TestState = { snapshot: { items: Record<string, Record<string, unknown>>; user: { inbox_project_id: string } | null; [key: string]: unknown }; setViewPrefs: (key: string, patch: Record<string, string>) => void };
type TestStore = { getState: () => TestState; setState: (value: Partial<TestState>) => void };

test.skip(process.env.PLAYWRIGHT_DEV !== '1', 'Controlled development fixtures');
async function seed(page: Page, mode: 'list' | 'board' | 'table', group: 'day' | 'week' | 'month') {
  await page.evaluate(({ mode, group }) => {
    const store = (window as unknown as { __store: TestStore }).__store;
    const state = store.getState();
    const sample = Object.values(state.snapshot.items)[0];
    const date = (offset: number) => {
      const d = new Date(); d.setDate(d.getDate() + offset);
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    };
    const make = (id: string, offset: number) => ({ ...sample, id, content: `Upcoming ${id}`, parent_id: null, project_id: state.snapshot.user!.inbox_project_id, labels: [], checked: false, is_deleted: false, deadline: null, due: { date: date(offset), string: date(offset), lang: 'en', timezone: null, is_recurring: false } });
    const values = [make('late-489', -2), make('today-489', 0), make('future-489', 2)];
    store.setState({ snapshot: { ...state.snapshot, items: Object.fromEntries(values.map((item) => [item.id, item])) } });
    store.getState().setViewPrefs('upcoming', { mode, group });
  }, { mode, group });
  await go(page, '#/upcoming');
}
for (const [mode, group] of [['list','day'], ['board','day'], ['table','day'], ['list','week'], ['board','month'], ['table','week']] as const) {
  test(`shows overdue and today before future tasks in ${mode} grouped by ${group}`, async ({ demo: page }) => {
    await seed(page, mode, group);
    const active = page.locator('.screen.active');
    const late = active.locator('[data-task-id="late-489"]');
    const today = active.locator('[data-task-id="today-489"]');
    const future = active.locator('[data-task-id="future-489"]');
    await expect(late).toHaveCount(1); await expect(today).toHaveCount(1); await expect(future).toHaveCount(1);
    const order = await active.locator('[data-task-id]').evaluateAll((rows) => rows.map((row) => row.getAttribute('data-task-id')));
    expect(order.indexOf('late-489')).toBeLessThan(order.indexOf('today-489'));
    expect(order.indexOf('today-489')).toBeLessThan(order.indexOf('future-489'));
    await expect(active.getByRole('button', { name: 'Move all to today' })).toBeVisible();
    await expect(active.locator('.metrics')).toContainText('3 tasks');
  });
}

test('moving overdue tasks to today updates their group', async ({ demo: page }) => {
  await seed(page, 'list', 'day');
  await page.locator('.screen.active').getByRole('button', { name: 'Move all to today' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Move all to today' }).click();
  await expect(page.locator('.screen.active').getByRole('button', { name: 'Move all to today' })).toHaveCount(0);
  await expect(page.locator('.screen.active [data-task-id="late-489"]')).toBeVisible();
});

test('shows empty days and extends them even without future tasks', async ({ demo: page }) => {
  await seed(page, 'list', 'day');
  const active = page.locator('.screen.active');
  const groups = active.locator('.mode .group');
  const before = await groups.count();
  expect(before).toBeGreaterThanOrEqual(8);
  await expect(active.getByRole('button', { name: 'Show 7 more days' })).toBeVisible();
  await active.getByRole('button', { name: 'Show 7 more days' }).click();
  await expect(groups).toHaveCount(before + 7);
});

for (const [mode, group] of [['list', 'month'], ['board', 'month'], ['table', 'week']] as const) {
  test(`shows empty ${group} periods in ${mode}`, async ({ demo: page }) => {
    await seed(page, mode, group);
    const active = page.locator('.screen.active');
    const periods = mode === 'board' ? active.locator('.board .col') : active.locator('.group');
    expect(await periods.count()).toBeGreaterThanOrEqual(5);
    const next = active.getByRole('button', { name: group === 'month' ? 'Show 90 more days' : 'Show 28 more days' });
    await expect(next).toBeVisible();
    const before = await periods.count();
    await next.click();
    await expect.poll(() => periods.count()).toBeGreaterThan(before);
  });
}

test('board Today button returns to the current day after paging forward', async ({ demo: page }) => {
  await go(page, '#/upcoming');
  await page.getByRole('button', { name: 'Display' }).click();
  await page.getByRole('button', { name: 'Board', exact: true }).click();
  const board = page.locator('.screen.active .board');
  await page.getByRole('button', { name: 'Next columns' }).click();
  await expect.poll(() => board.evaluate((element) => element.scrollLeft)).toBeGreaterThan(100);
  await page.locator('.screen.active .boardnav').getByRole('button', { name: 'Today' }).click();
  await expect.poll(() => board.evaluate((element) => element.scrollLeft)).toBeLessThan(400);
});
