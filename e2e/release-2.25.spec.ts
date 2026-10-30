import { expect, go, row, rows, test } from './demo';
import type { Page } from '@playwright/test';

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
