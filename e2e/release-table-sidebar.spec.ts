import { test, expect, go } from './demo';
const active = (page: import('@playwright/test').Page) => page.locator('.screen.active');

test('sidebar width supports keyboard, reset, reload and narrow windows', async ({ demo: page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const handle = page.getByRole('separator', { name: 'Resize sidebar' });
  await handle.focus();
  await handle.press('End');
  await expect(handle).toHaveAttribute('aria-valuenow', '520');
  await page.reload();
  await expect(handle).toHaveAttribute('aria-valuenow', '520');
  await page.setViewportSize({ width: 850, height: 900 });
  await expect(handle).toHaveAttribute('aria-valuenow', '383');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1440, height: 900 });
  await handle.dblclick();
  await expect(handle).toHaveAttribute('aria-valuenow', '248');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(handle).toHaveCount(0);
});

test('table keeps task actions, editable cells, column preferences and sorting', async ({ demo: page }) => {
  await go(page, 'inbox');
  const display = active(page).getByRole('button', { name: /^Display(?: \d+)?$/ });
  await display.click();
  const menu = active(page).getByRole('dialog', { name: 'Display', exact: true });
  await menu.getByRole('button', { name: 'Table', exact: true }).click();
  await menu.getByRole('button', { name: /^Columns/ }).click();
  await page.locator('.sidemenu').getByRole('switch', { name: 'Description' }).click();
  await page.keyboard.press('Escape');
  await display.click();
  const table = active(page).locator('.task-table');
  await expect(table).toBeVisible();
  await expect(table.locator('.table-description').first()).toBeAttached();
  const header = table.locator('.table-head');
  /* A heading sorts, and again reverses (#335). */
  await header.getByRole('button', { name: /^Title/ }).click();
  const titles = await table.locator('.task:not([data-depth]) .ttitle').allTextContents();
  expect(titles.length).toBeGreaterThan(1);
  await header.getByRole('button', { name: /^Title/ }).click();
  expect(await table.locator('.task:not([data-depth]) .ttitle').allTextContents()).toEqual([...titles].reverse());
  const row = table.locator('.task').first();
  await row.locator('.table-priority').getByRole('button').click();
  await page.getByRole('option', { name: 'P1', exact: true }).click();
  await row.locator('.table-estimate input').fill('45');
  await row.locator('.table-estimate input').press('Enter');
  await page.reload();
  await expect(table).toBeVisible();
  await expect(table.locator('.table-description').first()).toBeAttached();
  await table.locator('.task').first().locator('.ttitle').click();
  await expect(page.getByRole('dialog', { name: 'Task', exact: true })).toBeVisible();
});

test('project table preserves sections, children alignment, adding and mobile scrolling', async ({ demo: page }) => {
  await go(page, '#/project/site');
  const display = active(page).getByRole('button', { name: /^Display(?: \d+)?$/ });
  await display.click();
  await active(page).getByRole('dialog', { name: 'Display', exact: true }).getByRole('button', { name: 'Table', exact: true }).click();
  await display.click();
  const table = active(page).locator('.task-table');
  await expect(table.locator('.group')).toHaveCount(4);
  await expect(table.locator('.sectionadd').first()).toBeVisible();
  const cells = table.locator('.table-date');
  const x = await cells.evaluateAll((nodes) => nodes.map((node) => Math.round(node.getBoundingClientRect().left)));
  expect(new Set(x).size).toBe(1);
  await table.locator('.sectionadd').first().click();
  await expect(page.getByRole('dialog', { name: 'Add task', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 390, height: 844 });
  const scroller = active(page).locator('.table-scroll');
  await scroller.evaluate((node) => { node.scrollLeft = 400; });
  expect(await scroller.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
  expect(await table.locator('.ttitle').first().evaluate((node) => node.getBoundingClientRect().left)).toBeGreaterThanOrEqual(0);
});

test('table supports bulk keyboard selection and dragging between rows', async ({ demo: page }) => {
  await go(page, '#/project/personal');
  const display = active(page).getByRole('button', { name: /^Display(?: \d+)?$/ });
  await display.click();
  const menu = active(page).getByRole('dialog', { name: 'Display', exact: true });
  await menu.getByRole('button', { name: 'Table', exact: true }).click();
  await menu.locator('.panelgrid .fselect-face').nth(1).click();
  await page.getByRole('option', { name: 'Default', exact: true }).click();
  await display.click();
  const table = active(page).locator('.task-table');
  const tasks = table.locator('.task:not([data-depth])');
  const ids = () => tasks.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-task-id')));
  const original = await ids();
  await tasks.nth(0).locator('.ttitle').click({ modifiers: ['ControlOrMeta'] });
  await tasks.nth(1).locator('.ttitle').click({ modifiers: ['ControlOrMeta'] });
  await expect(page.getByRole('toolbar')).toContainText('2 selected');
  await page.keyboard.press('Escape');
  await tasks.nth(0).hover();
  const from = (await tasks.nth(0).locator('.drag').boundingBox())!;
  const to = (await tasks.nth(2).boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + 4, to.y + to.height / 2, { steps: 12 });
  await page.mouse.up();
  await expect.poll(ids).not.toEqual(original);
});

test('sidebar pointer resizing follows both floating layouts and survives folding', async ({ demo: page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const handle = page.getByRole('separator', { name: 'Resize sidebar' });
  for (const layout of ['page-float', 'sidebar-float']) {
    await go(page, '#/settings');
    await page.getByRole('radio', { name: layout === 'sidebar-float' ? 'Floating sidebar' : 'Floating page' }).click();
    await handle.dblclick();
    const edge = (await handle.boundingBox())!;
    await page.mouse.move(edge.x + edge.width / 2, edge.y + 80);
    await page.mouse.down();
    await page.mouse.move(edge.x + edge.width / 2 + 150, edge.y + 80, { steps: 10 });
    await page.mouse.up();
    await expect(handle).toHaveAttribute('aria-valuenow', layout === 'sidebar-float' ? '418' : '398');
    await page.getByRole('button', { name: 'Collapse sidebar', exact: true }).click();
    await expect(handle).toHaveCount(0);
    await page.getByRole('button', { name: 'Show sidebar', exact: true }).click();
    await expect(handle).toHaveAttribute('aria-valuenow', layout === 'sidebar-float' ? '418' : '398');
  }
});
