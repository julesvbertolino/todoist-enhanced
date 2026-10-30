import { expect, go, row, rows, test } from './demo';
import type { Page } from '@playwright/test';

type TestItem = { id: string; content: string; labels: string[]; [key: string]: unknown };
type TestState = {
  snapshot: { items: Record<string, TestItem>; [key: string]: unknown };
  setViewPrefs: (key: string, patch: Record<string, unknown>) => void;
};
type Store = { getState: () => TestState; setState: (patch: Partial<TestState>) => void };

test('#380 an icon-only button says what it is when the pointer rests on it', async ({ demo: page }) => {
  const caret = page.locator('.side-disclose').first();
  await caret.hover();
  await expect(page.locator('.icontip')).toHaveText(/^Collapse /);
  await page.mouse.move(700, 400);
  await expect(page.locator('.icontip')).toHaveCount(0);
});

test('#376 every day of Upcoming carries its date', async ({ demo: page }) => {
  await go(page, '#/upcoming');
  const names = page.locator('.screen.active .gname');
  await expect(names.first()).toBeVisible();
  for (const name of await names.allInnerTexts()) expect(name, name).toMatch(/\d/);
});

test('#408 a task\'s tags are chips with their own way out', async ({ demo: page }) => {
  await row(page, 'Rebuild the home page').locator('.ttitle').click();
  const chips = page.locator('.detail-side .tagpill');
  await expect(chips.first()).toBeVisible();
  const before = await chips.count();
  await expect(chips.first().locator('.tagremove')).toBeVisible();
  await chips.first().locator('.tagremove').click();
  await expect(chips).toHaveCount(before - 1);
});

test('#388 the checkbox is level with the first line of the title', async ({ demo: page }) => {
  const gap = await page.locator('.screen.active .task[data-task-id]').first().evaluate((task) => {
    const range = document.createRange();
    range.selectNodeContents(task.querySelector('.ttitle')!);
    const line = range.getClientRects()[0];
    const box = task.querySelector('.check')!.getBoundingClientRect();
    return Math.abs(line.top + line.height / 2 - (box.top + box.height / 2));
  });
  expect(gap).toBeLessThan(0.75);
});

/** A project's page as a table, set the way a person does it: Display, then Table. */
async function openTable(page: Page) {
  await go(page, '#/project/site');
  await page.getByRole('button', { name: 'Display', exact: true }).click();
  await page.locator('.display-modes').getByRole('button', { name: 'Table', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.task-table')).toBeVisible();
  await page.mouse.click(300, 20);
}

test('table: every heading has an icon, and a column can sit before the title', async ({ demo: page }) => {
  await openTable(page);
  const heads = page.locator('.table-head > div');
  expect(await page.locator('.table-head .head-icon').count()).toBe(await heads.count());
  await expect(heads.first()).toHaveClass(/head-title/);
  const start = heads.nth(1).locator('.head-sort');
  const title = heads.first().locator('.head-sort');
  const [from, to] = [(await start.boundingBox())!, (await title.boundingBox())!];
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + 4, to.y + to.height / 2, { steps: 12 });
  await page.mouse.up();
  await expect(heads.first()).not.toHaveClass(/head-title/);
  await expect(heads.first()).toContainText('Start date');
  const task = page.locator('.screen.active .task-table .task[data-task-id]').first();
  const [cell, check] = [(await task.locator('.table-cell').first().boundingBox())!, (await task.locator('.check').boundingBox())!];
  expect(cell.x).toBeLessThan(check.x);
});

test('table: a column is resized by pulling its edge, and double-clicking gives it back its width', async ({ demo: page }) => {
  await openTable(page);
  const head = page.locator('.table-head > div').nth(1);
  const before = (await head.boundingBox())!.width;
  const handle = (await head.locator('.head-resize').boundingBox())!;
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle.x + handle.width / 2 + 60, handle.y + handle.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect.poll(async () => Math.round((await head.boundingBox())!.width)).toBe(Math.round(before) + 60);
  await head.locator('.head-resize').dblclick();
  await expect.poll(async () => Math.round((await head.boundingBox())!.width)).toBe(Math.round(before));
});

test('table: a subtask names its parent, and long text wraps when asked', async ({ demo: page }) => {
  await openTable(page);
  const sub = page.locator('.task-table .task[data-depth]').first();
  await expect(sub.locator('.parentchip')).toBeVisible();
  const parent = await page.locator('.task-table .task:not([data-depth])').filter({ has: page.locator('.subprog') }).first().locator('.ttitle').innerText();
  await expect(sub.locator('.parentchip-name')).toHaveText(parent);
  await expect(page.locator('.task-table')).not.toHaveClass(/wrap/);
  await page.getByRole('button', { name: 'Display', exact: true }).click();
  await page.getByRole('switch', { name: 'Wrap long text' }).click();
  await expect(page.locator('.task-table')).toHaveClass(/wrap/);
});

test('#392 the duration is a property like its neighbours, and E opens its chooser', async ({ demo: page }) => {
  await rows(page).first().click();
  const face = page.locator('[data-prop="estimate"] .fselect-face');
  await expect(face).toBeVisible();
  await page.keyboard.press('e');
  const input = page.locator('.durationpanel input');
  await expect(input).toBeFocused();
  await page.locator('.durationpanel').getByRole('button', { name: '30 min', exact: true }).click();
  await expect(face).toContainText('30 min');
});

test('#380 a task\'s hover actions are named at once', async ({ demo: page }) => {
  const task = page.locator('.screen.active .task[data-task-id]').first();
  await task.hover();
  const action = task.locator('.trow-end').getByRole('button', { name: 'Start date', exact: true });
  await action.hover();
  await expect(page.locator('.icontip')).toBeVisible({ timeout: 700 });
  await expect(action).not.toHaveAttribute('title', /.+/);
});

test('a checklist item that is still empty keeps the cursor at its start', async ({ demo: page }) => {
  await go(page, '#/week');
  await row(page, 'Prepare the kick-off meeting').locator('.ttitle').click();
  await page.locator('.descview .md').first().click();
  await expect(page.locator('.descedit .cm-content')).toBeFocused();
  await page.keyboard.press('Meta+ArrowDown');
  await page.keyboard.press('Control+End');
  await page.keyboard.press('Enter');
  await page.keyboard.type('[] ');
  const item = page.locator('.descedit .cm-line.md-task').last();
  await expect(item).toBeVisible();
  const [line, cursor] = [(await item.boundingBox())!, (await page.locator('.descedit .cm-cursor').boundingBox())!];
  expect(cursor.x - line.x).toBeLessThan(40);
});

test('#411 the cursor of an empty description in the composer is not clipped by its scroller', async ({ demo: page }) => {
  await page.getByRole('button', { name: 'Add task', exact: true }).first().click();
  await page.locator('.descedit.composer .cm-content').click();
  const cursor = page.locator('.descedit.composer .cm-cursor');
  await expect(cursor).toHaveCount(1);
  const [at, scroller] = [(await cursor.boundingBox())!, (await page.locator('.descedit.composer .cm-scroller').boundingBox())!];
  expect(at.x).toBeGreaterThanOrEqual(scroller.x);
});

test('table: checkbox, title and cells share one line, and the sort arrow is not the accent colour', async ({ demo: page }) => {
  await openTable(page);
  const tasks = page.locator('.task-table .task[data-task-id]');
  for (let at = 0; at < Math.min(await tasks.count(), 8); at += 1) {
    const centres = await tasks.nth(at).evaluate((task) => {
      const mid = (el: Element | null) => { const r = el?.getBoundingClientRect(); return r ? r.top + r.height / 2 : NaN; };
      return [mid(task.querySelector('.check')), mid(task.querySelector('.ttitle')), mid(task.querySelector('.subprog')), mid(task.querySelector('.parentchip')), mid(task.querySelector('.table-cell'))].filter((n) => !Number.isNaN(n));
    });
    for (const centre of centres) expect(Math.abs(centre - centres[0])).toBeLessThan(0.75);
  }
  await page.locator('.table-head .head-sort').nth(2).click();
  const same = await page.locator('.table-head .head-arrow').evaluate((arrow) => {
    const probe = document.createElement('i');
    probe.style.color = 'var(--accent)';
    document.body.appendChild(probe);
    const accent = getComputedStyle(probe).color;
    probe.remove();
    return getComputedStyle(arrow).color === accent;
  });
  expect(same).toBe(false);
});

test('a task\'s hover duration opens the same dropdown as the task window', async ({ demo: page }) => {
  const task = page.locator('.screen.active .task[data-task-id]').first();
  await task.hover();
  await task.locator('.trow-end').getByRole('button', { name: 'Set an estimate' }).click();
  const panel = page.locator('.durationbody');
  await expect(panel.getByRole('button', { name: '30 min', exact: true })).toBeVisible();
  await expect(panel.locator('input')).toBeFocused();
  await panel.getByRole('button', { name: '30 min', exact: true }).click();
  await expect(page.locator('.durationbody')).toHaveCount(0);
});

test('table: a sorted heading always shows its arrow, and a column cannot be pulled narrower than its heading', async ({ demo: page }) => {
  await openTable(page);
  const head = page.locator('.table-head > div').filter({ hasText: 'Start date' });
  await head.locator('.head-sort').click();
  const arrow = head.locator('.head-arrow');
  await expect(arrow).toBeVisible();
  const [a, h] = [(await arrow.boundingBox())!, (await head.boundingBox())!];
  expect(a.x + a.width).toBeLessThanOrEqual(h.x + h.width + 0.5);
  const handle = (await head.locator('.head-resize').boundingBox())!;
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle.x - 200, handle.y + handle.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(arrow).toBeVisible();
  const narrow = (await head.boundingBox())!.width;
  expect(narrow).toBeGreaterThan(100);
});

test('table: a narrow Tags column shows one whole tag and a count that includes the rest', async ({ demo: page }) => {
  test.skip(process.env.PLAYWRIGHT_DEV !== '1', 'Controlled store scenarios');
  await page.evaluate(() => {
    const store = (window as unknown as { __store: Store }).__store;
    const state = store.getState();
    const item = Object.values(state.snapshot.items).find((it) => it.content === 'Rebuild the home page')!;
    store.setState({ snapshot: { ...state.snapshot, items: { ...state.snapshot.items, [item.id]: { ...item, labels: ['alpha', 'beta', 'gamma', 'delta'] } } } });
    state.setViewPrefs('project:site', { mode: 'table', tableColumns: ['title', 'labels'], tableWidths: { labels: 110 } });
  });
  await go(page, '#/project/site');
  const cell = row(page, 'Rebuild the home page').locator('.table-labels');
  await expect(cell.locator('.tag').first()).toBeVisible();
  await expect(cell.locator('.tag:visible')).toHaveCount(1);
  await expect(cell.locator('.tag-more-narrow')).toHaveText('+3');
  const [chip, box] = [(await cell.locator('.tag').first().boundingBox())!, (await cell.boundingBox())!];
  expect(chip.x + chip.width).toBeLessThanOrEqual(box.x + box.width + 1);
});
