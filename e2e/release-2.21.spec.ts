import { expect, go, row, test } from './demo';
import type { Page } from '@playwright/test';

const active = (page: Page) => page.locator('.screen.active');

async function openTable(page: Page, hash: string) {
  await go(page, hash);
  const display = active(page).getByRole('button', { name: /^Display(?: \d+)?$/ });
  await display.click();
  await active(page).getByRole('dialog', { name: 'Display', exact: true }).getByRole('button', { name: 'Table', exact: true }).click();
  await display.click();
  await expect(active(page).locator('.task-table')).toBeVisible();
}

const headings = (page: Page) => active(page).locator('.table-head .head-sort').allInnerTexts();
const menuOf = (page: Page, name: string) => active(page).locator('.table-head').getByRole('button', { name: `Column options (${name})` });

test('#283 the Todoist short forms are read as dates', async ({ demo: page }) => {
  await go(page, '#/inbox');
  await page.keyboard.press('q');
  await page.locator('.composer-name').fill('Pay the invoice tmr');
  await expect(page.locator('.composer-name')).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(row(page, 'Pay the invoice')).toBeVisible();
});

test('#344 a long thread can be turned over for a moment, and starts as written again', async ({ demo: page }) => {
  await go(page, '#/inbox');
  await active(page).locator('[data-task-id] .ttitle').first().click();
  const dialog = page.getByRole('dialog', { name: 'Task', exact: true });
  const field = dialog.getByPlaceholder('Comment');
  const toggle = dialog.getByRole('button', { name: 'Newest first' });
  const texts = ['First note', 'Second note', 'Third note'];
  for (const text of texts) {
    await field.fill(text);
    await field.press('Control+Enter');
    await expect(dialog.locator('.comment .md', { hasText: text })).toBeVisible();
    await page.waitForTimeout(1100);
  }
  await expect(toggle).toHaveCount(0);
  await field.fill('Fourth note');
  await field.press('Control+Enter');
  await expect(dialog.locator('.comment .md', { hasText: 'Fourth note' })).toBeVisible();
  const written = () => dialog.locator('article.comment .md').allInnerTexts();
  expect(await written()).toEqual([...texts, 'Fourth note']);
  await toggle.click();
  expect(await written()).toEqual(['Fourth note', 'Third note', 'Second note', 'First note']);
  await toggle.click();
  expect(await written()).toEqual([...texts, 'Fourth note']);
  /* Nothing is remembered: turned over, then another task and back, it is as written. */
  await toggle.click();
  await page.keyboard.press('Escape');
  await active(page).locator('[data-task-id] .ttitle').first().click();
  expect(await written()).toEqual([...texts, 'Fourth note']);
});

test('#340 a picture waits as a grey pill and shows inline, with a download button, once sent', async ({ demo: page }) => {
  await go(page, '#/inbox');
  await active(page).locator('[data-task-id] .ttitle').first().click();
  const dialog = page.getByRole('dialog', { name: 'Task', exact: true });
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  await dialog.locator('.comment-tools input[type=file]').setInputFiles([{ name: 'pixel.png', mimeType: 'image/png', buffer: png }]);
  await expect(dialog.locator('.comment-attached', { hasText: 'pixel.png' })).toBeVisible();
  await expect(dialog.locator('.comment-attached img')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Send' }).click();
  const image = dialog.locator('.comment-image').first();
  await expect(image.locator('img')).toBeVisible();
  await image.hover();
  await expect(image.getByRole('link', { name: /Download/ })).toBeVisible();
});

test('#340 a GIF pasted anywhere in the task joins the comment', async ({ demo: page }) => {
  await go(page, '#/inbox');
  await active(page).locator('[data-task-id] .ttitle').first().click();
  const dialog = page.getByRole('dialog', { name: 'Task', exact: true });
  const paste = (into: string) => page.evaluate((selector) => {
    const data = new DataTransfer();
    data.items.add(new File([new Uint8Array([71, 73, 70, 56, 57, 97])], 'funny.gif', { type: 'image/gif' }));
    (document.querySelector(selector) ?? document.body).dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
  }, into);
  await dialog.getByPlaceholder('Comment').focus();
  await paste('.comment-field');
  await expect(dialog.locator('.comment-attached', { hasText: 'funny.gif' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await paste('body');
  await expect(dialog.locator('.comment-attached', { hasText: 'funny.gif' })).toBeVisible();
});

test('#340 several files wait together and are posted one comment each, the words with the first', async ({ demo: page }) => {
  await go(page, '#/inbox');
  await active(page).locator('[data-task-id] .ttitle').first().click();
  const dialog = page.getByRole('dialog', { name: 'Task', exact: true });
  await dialog.locator('.comment-tools input[type=file]').setInputFiles([
    { name: 'plan.pdf', mimeType: 'application/pdf', buffer: Buffer.from('a') },
    { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('b') },
    { name: 'budget.pdf', mimeType: 'application/pdf', buffer: Buffer.from('c') },
  ]);
  await expect(dialog.locator('.comment-attached')).toHaveCount(3);
  await dialog.getByRole('button', { name: /Remove the file \(notes\.txt\)/ }).click();
  await expect(dialog.locator('.comment-attached')).toHaveCount(2);
  await dialog.getByPlaceholder('Comment').fill('Here they are');
  await dialog.getByRole('button', { name: 'Send' }).click();
  await expect(dialog.locator('article.comment')).toHaveCount(2);
  await expect(dialog.locator('article.comment', { hasText: 'Here they are' }).locator('.comment-file')).toContainText('plan.pdf');
  await expect(dialog.locator('article.comment .comment-file', { hasText: 'budget.pdf' })).toBeVisible();
});

test('#346 AMOLED turns the page and sidebar pure black, only while dark', async ({ demo: page }) => {
  await go(page, '#/settings');
  const appearance = active(page);
  await appearance.getByRole('radio', { name: /^Dark$/ }).click();
  await appearance.getByRole('radio', { name: /AMOLED/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-dark', 'amoled');
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(0, 0, 0)');
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--sidebar').trim())).toBe('#000');
  await appearance.getByRole('radio', { name: /^Classic$/ }).click();
  await expect(page.locator('html')).not.toHaveAttribute('data-dark', /.*/);
  await appearance.getByRole('radio', { name: /AMOLED/ }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-dark', 'amoled');
  await appearance.getByRole('radio', { name: /^Light$/ }).click();
  await expect(page.locator('html')).not.toHaveAttribute('data-dark', /.*/);
  await expect(appearance.getByRole('radiogroup', { name: 'Dark style' })).toHaveCount(0);
});

test('#336 after an update, the missed releases are one list, pictures first then new things, each with its version', async ({ demo: page }) => {
  await go(page, '#/inbox');
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('enhanced:changelog', { detail: { versions: ['2.20.0', '2.21.0'] } })));
  const dialog = page.getByRole('dialog', { name: 'What’s new since your last visit' });
  await expect(dialog.locator('.whatsnew-release')).toHaveCount(0);
  /* Pictures lead; inside the pictures and inside the rest, new, better, fixed. */
  const entries = await dialog.locator('.whatsnew-feed > li').evaluateAll((items) => items.map((item) => ({
    picture: item.classList.contains('whatsnew-illustrated'),
    kind: item.classList.contains('new') ? 0 : item.classList.contains('design') ? 1 : 2,
  })));
  expect(entries.length).toBeGreaterThan(8);
  const pictures = entries.filter((entry) => entry.picture);
  expect(pictures.length).toBeGreaterThan(1);
  expect(entries.slice(0, pictures.length).every((entry) => entry.picture)).toBe(true);
  for (const group of [pictures, entries.filter((entry) => !entry.picture)]) {
    expect(group.map((entry) => entry.kind)).toEqual(group.map((entry) => entry.kind).sort((a, b) => a - b));
  }
  /* The newest release leads, with its own pure black picture. */
  await expect(dialog.locator('.whatsnew-feed > li').first()).toContainText('pure black');
  await expect(dialog.locator('.whatsnew-feed > li').first().locator('.changelog-preview')).toBeVisible();
  const versions = await dialog.locator('.whatsnew-version').allInnerTexts();
  expect(new Set(versions)).toEqual(new Set(['Version 2.20.0', 'Version 2.21.0']));
});

test('#335 a heading sorts and reverses; its chevron filters, moves and hides the column', async ({ demo: page }) => {
  await openTable(page, '#/inbox');
  const head = active(page).locator('.table-head');
  const titles = () => active(page).locator('.task-table .task:not([data-depth]) .ttitle').allTextContents();
  await head.getByRole('button', { name: /^Title/ }).click();
  await expect(head.locator('[aria-sort="ascending"]')).toHaveCount(1);
  const up = await titles();
  await head.getByRole('button', { name: /^Title/ }).click();
  await expect(head.locator('[aria-sort="descending"]')).toHaveCount(1);
  expect(await titles()).toEqual([...up].reverse());
  expect(await page.locator('.tablemenu').count()).toBe(0);

  await menuOf(page, 'Priority').click({ force: true });
  const menu = page.getByRole('menu', { name: 'Priority' });
  await menu.getByRole('menuitemcheckbox', { name: 'P1' }).click();
  await expect(menu.getByRole('button', { name: 'Clear' })).toBeVisible();
  await expect(head.locator('.head-filtered .head-dot')).toHaveCount(1);
  await menu.getByRole('menuitem', { name: 'Move left' }).click();
  expect((await headings(page)).slice(0, 3)).toEqual(['Title', 'Start date', 'Priority']);
  await menuOf(page, 'Priority').click({ force: true });
  await page.getByRole('menu', { name: 'Priority' }).getByRole('menuitem', { name: 'Hide column' }).click();
  expect(await headings(page)).not.toContain('Priority');
});

test('#335 the Title has no menu, and the edges of the row cannot be passed', async ({ demo: page }) => {
  await openTable(page, '#/project/site');
  await expect(menuOf(page, 'Title')).toHaveCount(0);
  /* The Title is a column like the others now: Start date may step in front of it. */
  await menuOf(page, 'Start date').click({ force: true });
  await expect(page.getByRole('menu', { name: 'Start date' }).getByRole('menuitem', { name: 'Move left' })).toBeEnabled();
  await page.keyboard.press('Escape');
  await menuOf(page, 'Tags').click({ force: true });
  await expect(page.getByRole('menu', { name: 'Tags' }).getByRole('menuitem', { name: 'Move right' })).toBeDisabled();
});

test('#335 dragging a heading moves the column and opens no menu; Display follows', async ({ demo: page }) => {
  await openTable(page, '#/project/site');
  const head = active(page).locator('.table-head');
  const before = (await headings(page)).map((name) => name.replace(/ [↑↓]$/, ''));
  const sorted = () => head.locator('[aria-sort]:not([aria-sort="none"])').evaluateAll((cells) => cells.map((cell) => `${cell.textContent}:${cell.getAttribute('aria-sort')}`));
  const sortedBefore = await sorted();
  const from = await head.locator('.head-sort', { hasText: 'Tags' }).boundingBox();
  const to = await head.locator('.head-sort', { hasText: 'Start date' }).boundingBox();
  await page.mouse.move(from!.x + 20, from!.y + 15);
  await page.mouse.down();
  await page.mouse.move(to!.x + 10, to!.y + 15, { steps: 12 });
  await page.mouse.up();
  const after = (await headings(page)).map((name) => name.replace(/ [↑↓]$/, ''));
  expect(after[1]).toBe('Tags');
  expect(after).not.toEqual(before);
  await expect(page.locator('.tablemenu')).toHaveCount(0);
  expect(await sorted()).toEqual(sortedBefore);
  await page.reload();
  expect((await headings(page)).map((name) => name.replace(/ [↑↓]$/, ''))[1]).toBe('Tags');
});

test('#335 the assignee column is a person icon with its own name, off by default', async ({ demo: page }) => {
  await openTable(page, '#/project/site');
  expect(await headings(page)).not.toContain('Assigned to');
  const display = active(page).getByRole('button', { name: /^Display(?: \d+)?$/ });
  await display.click();
  await active(page).getByRole('dialog', { name: 'Display', exact: true }).getByRole('button', { name: /^Columns/ }).click();
  await page.locator('.sidemenu').getByRole('switch', { name: 'Assigned to' }).click();
  await page.keyboard.press('Escape');
  const heading = active(page).locator('.table-head .head-sort[title^="Assigned to"]');
  await expect(heading).toHaveAttribute('title', /^Assigned to/);
  await expect(heading).toHaveText('');
  await expect(active(page).locator('.table-assignee').first()).toBeVisible();
});
