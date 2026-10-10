import { expect, go, row, rows, test } from './demo';

test('#117 a saved title opens as plain text; only what is typed is read', async ({ demo: page }) => {
  const title = await rows(page).first().locator('.ttitle').innerText();
  await row(page, title).click();
  const field = page.locator('.detail-content .titlefield');
  await expect(field).toBeVisible();

  // Typed now, "daily" is read — Backspace turns the reading down, Enter saves it as words.
  await field.click();
  await page.keyboard.press('End');
  await page.keyboard.type(' daily');
  await expect(page.locator('.detail-content .nmark')).toHaveCount(1);
  await page.keyboard.press('Backspace');
  await expect(page.locator('.detail-content .nmark')).toHaveCount(0);
  await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');
  await expect(page.locator('.detail-top')).toHaveCount(0);

  // Opened again, the saved word is a word: nothing marked, nothing to take out.
  await row(page, `${title} daily`).click();
  await expect(field).toHaveValue(`${title} daily`);
  await expect(page.locator('.detail-content .nmark')).toHaveCount(0);

  // What is typed after it is still read.
  await field.click();
  await page.keyboard.press('End');
  await page.keyboard.type(' p1');
  await expect(page.locator('.detail-content .nmark.priority')).toHaveCount(1);
});

test('#116 a task ticked off from its panel leaves the review step it was opened from', async ({ demo: page }) => {
  await go(page, '#/review');
  const list = page.locator('.screen.active .reviewlist .reviewrow');
  // The first step that lists tasks with their own checkbox.
  for (let at = 0; at < 8 && (await list.filter({ has: page.locator('[role="checkbox"]') }).count()) === 0; at += 1) {
    await page.getByRole('button', { name: 'Next', exact: true }).click();
  }
  const first = list.filter({ has: page.locator('[role="checkbox"]') }).first();
  const name = await first.locator('.ttitle').innerText();
  await first.locator('.reviewname').click();
  await page.locator('.detail-headline [role="checkbox"]').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.detail-top')).toHaveCount(0);
  await expect(list.filter({ hasText: name })).toHaveCount(0);
});

test('#108 a project board adds a section from its last column', async ({ demo: page }) => {
  await go(page, '#/project/site');
  await page.getByRole('button', { name: 'Display' }).click();
  await page.getByRole('button', { name: 'Board', exact: true }).click();
  await page.keyboard.press('Escape');

  const board = page.locator('.screen.active .board');
  const add = board.getByRole('button', { name: 'Add section' });
  await add.click();
  // Escape makes nothing.
  await page.keyboard.press('Escape');
  // A section's name is a field in its column's heading, so it can be renamed there.
  const names = () => board.locator('.col:not(.accent-quick) .chead-title').evaluateAll((titles) => titles.map(
    (title) => title.querySelector('input')?.value ?? title.querySelector('.gnamewrap, strong')?.textContent ?? '',
  ));
  await expect.poll(names).toEqual(['To do', 'In progress', 'To review']);

  await add.click();
  await page.keyboard.type('Launch');
  await page.keyboard.press('Enter');
  await expect.poll(names).toEqual(['To do', 'In progress', 'To review', 'Launch']);

  // The same section in the list.
  await page.getByRole('button', { name: 'Display' }).click();
  await page.getByRole('button', { name: 'List' }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.screen.active [data-section-name]').last()).toHaveValue('Launch');
});

test('#110 the row menu and the bulk bar show the same date picker', async ({ demo: page }) => {
  const labels = (scope: import('@playwright/test').Locator) =>
    scope.locator('.datepicker-options .opt > span').allInnerTexts();

  const [first, second] = await rows(page).locator('.ttitle').allInnerTexts();
  await row(page, first).focus();
  await page.keyboard.press('ControlOrMeta+s');
  const rowMenu = page.locator('.rowmenu.schedulemenu');
  await expect(rowMenu.locator('.datepicker')).toBeVisible();
  const fromRow = await labels(rowMenu);
  await page.keyboard.press('Escape');

  await row(page, first).click({ modifiers: ['ControlOrMeta'] });
  await row(page, second).click({ modifiers: ['ControlOrMeta'] });
  await page.getByRole('toolbar').getByRole('button', { name: 'Date' }).click();
  const bulk = page.getByRole('menu', { name: 'Date' });
  await expect(bulk.locator('.datepicker')).toBeVisible();
  const fromBulk = (await labels(bulk)).map((l) => l.trim());
  const choices = ['Today', 'Tomorrow', 'Next week', 'This week', 'Someday'];
  // The same choices in the same order, ending in "Pick a date"; the row
  // menu adds what only a task can do (remove its date) between the two (#153).
  expect(fromRow.map((l) => l.trim()).slice(0, 5)).toEqual(choices);
  expect(fromBulk).toEqual([...choices, 'Pick a date']);
  expect(fromRow.map((l) => l.trim()).at(-1)).toBe('Pick a date');
});

test('#115 the changelog opens from Settings, in the app', async ({ demo: page }) => {
  // Settings shows the author's avatar from GitHub; this journey is not about it.
  await page.route('https://github.com/**', (route) => route.fulfill({ status: 204 }));
  await go(page, '#/settings');
  await page.getByRole('button', { name: 'See the changes' }).click();
  const dialog = page.getByRole('dialog', { name: 'Changelog' });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.whatsnew-release').first()).toContainText('Version');
  await expect(dialog.locator('.whatsnew-change.new').first()).toContainText('🆕');
  await expect(dialog.getByRole('button', { name: 'Got it' })).toBeFocused();
  // A version picker jumps to a release.
  await dialog.getByRole('button', { name: 'Versions' }).click();
  await page.getByRole('option', { name: 'Version 1.12.0', exact: true }).click();
  await expect(dialog.getByRole('region', { name: 'Version 1.12.0' })).toBeInViewport();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});

test('a tag typed in the composer is one tag, not one per letter', async ({ demo: page }) => {
  await page.keyboard.press('q');
  const name = page.locator('.composer-name');
  await expect(name).toBeFocused();
  // Typed a letter at a time, the way a person types it.
  await page.keyboard.type('Water the plants @week', { delay: 20 });
  await page.keyboard.press('Escape'); // closes the @ list, not the composer
  const pills = page.locator('.composer-chips .tagchip');
  await expect(pills).toHaveCount(1);
  await expect(pills.first()).toHaveText('week');

  // Taking the pill off turns the reading down: nothing is left to save.
  await pills.first().click();
  await expect(pills).toHaveCount(0);
  await expect(page.locator('.namefield .nmark.label')).toHaveCount(0);
});
