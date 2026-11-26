import { test, expect, go, rows } from './demo';

test('title and description save and cancel together', async ({ demo: page }) => {
  await go(page, '#/inbox');
  await rows(page).first().locator('.ttitle').click();
  const title = page.getByRole('textbox', { name: 'Task', exact: true });
  await page.locator('.descview').click();
  const description = page.locator('.descedit .cm-content');
  await expect(description).toBeFocused();
  await expect(page.locator('.titleactions')).toBeVisible();
  const originalTitle = await title.inputValue();
  await title.fill('Changed title');
  await description.fill('Changed description');
  await page.locator('.titleactions .primary').click();
  await expect(page.locator('.descview')).toContainText('Changed description');
  await expect(title).toHaveValue('Changed title');
  await title.click();
  await title.fill('Discard title');
  await page.locator('.descedit .cm-content').fill('Discard description');
  await page.keyboard.press('Escape');
  await expect(title).toHaveValue('Changed title');
  await expect(page.locator('.descview')).toContainText('Changed description');
  expect(originalTitle).not.toBe('Changed title');
});

test('rich pasted links remain in the description after saving', async ({ demo: page }) => {
  await go(page, '#/inbox');
  await rows(page).first().locator('.ttitle').click();
  await page.locator('.descview').click();
  const editor = page.locator('.descedit .cm-content');
  await editor.fill('');
  await editor.evaluate((element) => {
    const data = new DataTransfer();
    data.setData('text/plain', 'Read notes and ticket');
    data.setData('text/html', 'Read <a href="https://example.com/notes">notes</a> and <a href="https://example.com/ticket">ticket</a>');
    element.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: data }));
  });
  await page.locator('.titleactions .primary').click();
  const links = page.locator('.descview a');
  await expect(links).toHaveCount(2);
  await expect(links.nth(0)).toHaveAttribute('href', 'https://example.com/notes');
  await expect(links.nth(1)).toHaveAttribute('href', 'https://example.com/ticket');
});

test('breadcrumb displays punctuation in a pasted linked title', async ({ demo: page }) => {
  await go(page, '#/inbox');
  await rows(page).first().locator('.ttitle').click();
  const title = page.getByRole('textbox', { name: 'Task', exact: true });
  await title.click();
  await title.fill('[d&rsquo;organisation &#8211; test](https://example.com)');
  await expect(page.locator('.crumbhere[aria-current="page"]')).toHaveText('d’organisation – test');
  await page.locator('.titleactions .primary').click();
  await expect(page.locator('.crumbhere[aria-current="page"]')).toHaveText('d’organisation – test');
});

test('ending a linked focus session keeps an unfinished title and description', async ({ demo: page }) => {
  await go(page, '#/inbox');
  await rows(page).first().locator('.ttitle').click();
  const detail = page.getByRole('dialog').filter({ has: page.locator('.pomo-control') });
  await detail.locator('.pomo-main').click();
  if (!await page.locator('.pomo-fs').isVisible()) await detail.locator('.pomo-pause').last().click();
  const focus = page.locator('.pomo-fs');
  await expect(focus).toBeVisible();
  await focus.locator('.pomo-fs-title').fill('Focus draft title');
  await focus.locator('.descedit .cm-content').fill('Focus draft description');
  await focus.locator('.pomo-fs-controls .btn').last().click();
  await expect(focus).toHaveCount(0);
  const saved = rows(page).filter({ hasText: 'Focus draft title' });
  await expect(saved).toBeVisible();
  await saved.locator('.ttitle').click();
  await expect(page.locator('.descview')).toContainText('Focus draft description');
});

test('arrow keys move between title and description at their boundaries', async ({ demo: page }) => {
  await go(page, '#/inbox');
  await rows(page).first().locator('.ttitle').click();
  const title = page.getByRole('textbox', { name: 'Task', exact: true });
  await title.click();
  await title.fill('A title');
  await title.press('End');
  await title.press('ArrowDown');
  const description = page.locator('.descedit .cm-content');
  await expect(description).toBeFocused();
  await description.press('ArrowUp');
  await expect(title).toBeFocused();
  await expect(page.locator('.titleactions')).toBeVisible();
});

test('rich pasted links remain in the task title', async ({ demo: page }) => {
  await go(page, '#/inbox');
  await rows(page).first().locator('.ttitle').click();
  const title = page.getByRole('textbox', { name: 'Task', exact: true });
  await title.click();
  await title.fill('');
  await title.evaluate((element) => {
    const data = new DataTransfer();
    data.setData('text/plain', 'Notes and ticket');
    data.setData('text/html', '<a href="https://example.com/notes">Notes</a> and <a href="https://example.com/ticket">ticket</a>');
    element.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: data }));
  });
  await page.locator('.titleactions .primary').click();
  const links = page.locator('.titleview a');
  await expect(links).toHaveCount(2);
  await expect(links.nth(0)).toHaveAttribute('href', 'https://example.com/notes');
  await expect(links.nth(1)).toHaveAttribute('href', 'https://example.com/ticket');
});
