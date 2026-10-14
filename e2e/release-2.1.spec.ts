import { expect, go, rows, test } from './demo';

test('a task with no section moves to another project from its row menu (#205)', async ({ demo: page }) => {
  // The Inbox has no sections, so its tasks have none either.
  await go(page, '#/inbox');
  const first = rows(page).first();
  await expect(first).toBeVisible();
  const id = await first.getAttribute('data-task-id');

  await first.hover();
  await first.getByRole('button', { name: 'Move to project' }).click();
  const menu = page.locator('.rowmenu');
  const destination = menu.locator('button.opt:not(.sectionopt)[aria-checked="false"]').first();
  const name = (await destination.innerText()).replace('#', '').trim();
  await destination.click();

  await expect(page.getByText(`Moved to ${name}`)).toBeVisible();
  await expect(page.locator(`.screen.active [data-task-id="${id}"]`)).toHaveCount(0);
});

test('a label with an emoji or an accent in its name opens its own page (#196)', async ({ demo: page }) => {
  await go(page, '#/labels');
  await page.locator('.screen.active .phead').getByRole('button', { name: 'New tag' }).click();
  const input = page.getByPlaceholder('Name a new tag, e.g. errand');
  await input.fill('🏠Café');
  await input.press('Enter');
  const card = page.locator('.screen.active .tagcard-open', { hasText: '🏠Café' });
  await expect(card).toBeVisible();
  await card.click();
  // The page is the label's own, not a page for a name that does not exist.
  await expect(page.getByRole('textbox', { name: 'Rename tag' })).toHaveValue('🏠Café');
  expect(new URL(page.url()).hash).toBe(`#/label/${encodeURIComponent('🏠Café')}`);
});

test('the sidebar editor says whether My week holds today\u2019s tasks (#195)', async ({ demo: page }) => {
  await go(page, '#/settings');
  await page.getByRole('button', { name: 'Sidebar' }).click();
  const week = page.locator('.navedit-row').filter({ has: page.getByText('My week', { exact: true }) });
  const today = page.locator('.navedit-row').filter({ has: page.getByText('Today', { exact: true }) });
  await expect(week).toContainText('Includes today\u2019s tasks');
  const height = (await week.boundingBox())!.height;

  await today.locator('input').check({ force: true });
  await expect(week).toContainText('Includes today\u2019s tasks');
  // The list does not move when the tick is turned.
  expect((await week.boundingBox())!.height).toBe(height);

  await today.locator('input').uncheck({ force: true });
  await expect(week).toContainText('Includes today\u2019s tasks');
});

test('the Inbox is drawn as a project, so its sections can be added and shown', async ({ demo: page }) => {
  await go(page, '#/inbox');
  const screen = page.locator('.screen.active');
  await expect(screen.getByRole('heading', { name: 'Inbox' }).first()).toBeVisible();
  await screen.getByRole('button', { name: 'Add section' }).first().click();
  const field = screen.getByRole('textbox', { name: 'Section name' }).first();
  await expect(field).toBeFocused();
  await page.keyboard.type('Waiting');
  await page.keyboard.press('Enter');
  await expect(screen.locator('.gnamegrow[data-value="Waiting"]')).toHaveCount(1);
});

test('the Display menu offers only the tags of the page in front', async ({ demo: page }) => {
  const tagsOf = async () => {
    await page.locator('.screen.active').getByRole('button', { name: 'Display' }).click();
    const menu = page.locator('.popover').filter({ has: page.getByRole('heading', { name: 'Tags' }) });
    const names = await menu.locator('.chiprow.scroll .chip').allInnerTexts();
    await page.keyboard.press('Escape');
    return names.map((n) => n.trim());
  };
  await go(page, '#/inbox');
  const inbox = await tagsOf();
  await go(page, '#/week');
  const week = await tagsOf();
  // The demo has four tags in all; a page offers the ones its own tasks carry.
  expect(inbox).toEqual(['quick']);
  expect(week).toEqual(['quick', 'week']);
});

test('the Move to project menu keeps its width when a section has a very long name', async ({ demo: page }) => {
  await go(page, '#/project/site');
  const title = page.locator('.screen.active textarea.gname').first();
  await title.fill('A very long section name '.repeat(12));
  await title.press('Enter');

  await go(page, '#/inbox');
  const first = page.locator('.screen.active [data-task-id]').first();
  await first.hover();
  await first.getByRole('button', { name: 'Move to project' }).click();
  const menu = page.locator('.rowmenu');
  await expect(menu).toBeVisible();
  const box = (await menu.boundingBox())!;
  expect(box.width).toBeLessThanOrEqual(360);
  expect(box.width).toBeGreaterThanOrEqual(250);
  // The long name is cut with an ellipsis, not allowed to run out of the menu.
  const cut = await menu.locator('.movelabel').evaluateAll((labels) => labels.some((l) => l.scrollWidth > l.clientWidth));
  expect(cut).toBe(true);
});
