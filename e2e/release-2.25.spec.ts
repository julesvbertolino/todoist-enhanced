import { expect, go, row, test } from './demo';

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
