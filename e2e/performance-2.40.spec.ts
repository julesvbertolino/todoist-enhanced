import { expect, go, rows, test } from './demo';

test('dialogs are drawn outside the page, and typing a title leaves the field’s text alone (#366, #367)', async ({ demo: page }) => {
  await page.keyboard.press('q');
  const field = page.locator('.composerbox textarea.composer-name');
  await expect(field).toBeVisible();
  /* Inside `.app`, every change in a dialog restyled the rows behind it. */
  expect(await page.locator('.overlay.open').evaluate((overlay) => overlay.parentElement === document.body)).toBe(true);
  await field.evaluate((el) => {
    (window as unknown as { textNodeChanges: number }).textNodeChanges = 0;
    new MutationObserver((records) => { (window as unknown as { textNodeChanges: number }).textNodeChanges += records.length; })
      .observe(el, { childList: true, characterData: true, subtree: true });
  });
  await field.pressSequentially('Buy milk tomorrow', { delay: 20 });
  await expect(field).toHaveValue('Buy milk tomorrow');
  await expect(page.locator('.composerbox .namemirror mark')).toHaveCount(1);
  expect(await page.evaluate(() => (window as unknown as { textNodeChanges: number }).textNodeChanges)).toBe(0);
  // The field's own undo still has every letter.
  await field.press('ControlOrMeta+z');
  await expect(field).not.toHaveValue('Buy milk tomorrow');
});

test('a row draws its action icons when pointed at or focused, and nothing moves (#365)', async ({ demo: page }) => {
  await page.mouse.move(1, 1);
  const first = rows(page).first();
  const icons = first.locator('.trow-actions > button svg');
  await expect(icons).toHaveCount(0);
  await expect(first.locator('.trow-actions > button')).not.toHaveCount(0);
  const before = await first.locator('.ttitle').boundingBox();
  await first.hover();
  await expect(icons).not.toHaveCount(0);
  await expect(first.locator('.drag svg')).toHaveCount(1);
  expect(await first.locator('.ttitle').boundingBox()).toEqual(before);

  // The keyboard reaches a row the pointer never touched.
  await page.mouse.move(1, 1);
  await page.keyboard.press('j');
  await page.keyboard.press('j');
  const focused = page.locator('.screen.active [data-task-id]:focus');
  await expect(focused).toHaveCount(1);
  await expect(focused.locator('.trow-actions > button svg')).not.toHaveCount(0);
});

test('the sidebar marks the page that was clicked, and the page follows (#514)', async ({ demo: page }) => {
  await go(page, '#/week');
  const someday = page.locator('.navitem').filter({ hasText: /^Someday/ }).first();
  await someday.click();
  await expect(someday).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('.screen.active .ptitle')).toContainText('Someday');
  await expect(rows(page).first()).toBeVisible();
});

test('opening a task keeps every row of the page as it was (#367)', async ({ demo: page }) => {
  await go(page, '#/week');
  const titles = page.locator('.screen.active [data-task-id] .ttitle');
  const count = await titles.count();
  await titles.nth(1).click();
  await expect(page.locator('.overlay.open')).toBeVisible();
  expect(await page.locator('.overlay.open').evaluate((overlay) => overlay.parentElement === document.body)).toBe(true);
  await expect(titles).toHaveCount(count);
  await page.keyboard.press('Escape');
  await expect(page.locator('.overlay.open')).toHaveCount(0);
});

test('while the next page loads, list keys leave the page being left alone and the sidebar keeps its keys (#514)', async ({ demo: page }) => {
  await go(page, '#/project/home');
  const id = await rows(page).first().getAttribute('data-task-id');
  expect(id).toBeTruthy();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route(/ReviewView[^/]*\.(js|tsx)/, async (route) => { await gate; await route.continue(); });
  const screen = page.locator('.screen.active');
  const nav = (name: RegExp) => page.locator('.navitem').filter({ hasText: name }).first();
  const focusedRow = page.locator('.screen.active [data-task-id]:focus');

  const review = nav(/^Review/);
  await review.click();
  // The destination is marked at once, while the project is still the page on screen.
  await expect(review).toHaveAttribute('aria-current', 'page');
  await expect(screen).toHaveAttribute('data-route', 'project:home');

  // J then E would tick the first task of the project being left.
  await page.keyboard.press('j');
  await page.keyboard.press('e');
  // `g` then J is a destination that does not exist, not a cursor on the old list.
  await page.keyboard.press('g');
  await page.keyboard.press('j');
  await expect(focusedRow).toHaveCount(0);

  // Tab still moves the focus on from the sidebar item.
  await review.focus();
  await page.keyboard.press('Tab');
  expect(await review.evaluate((el) => el === document.activeElement)).toBe(false);

  // Enter and Space still choose another destination.
  const someday = nav(/^Someday/);
  await someday.focus();
  await page.keyboard.press('Enter');
  await expect(someday).toHaveAttribute('aria-current', 'page');
  await expect(screen).toHaveAttribute('data-route', 'someday');
  await review.click();
  await expect(review).toHaveAttribute('aria-current', 'page');
  const inbox = nav(/^Inbox/);
  await inbox.focus();
  await page.keyboard.press(' ');
  await expect(inbox).toHaveAttribute('aria-current', 'page');
  await expect(screen).toHaveAttribute('data-route', 'inbox');

  release();
  await go(page, '#/project/home');
  const row = page.locator(`.screen.active [data-task-id="${id}"]`).first();
  await expect(row).toBeVisible();
  await expect(row.locator('.check')).toHaveAttribute('aria-checked', 'false');
});
