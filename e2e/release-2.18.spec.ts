import { test, expect, go, row, rows } from './demo';

test('#238 a parent folds its subtasks from a chevron after its title, and stays folded', async ({ demo: page }) => {
  const parent = row(page, 'Rebuild the home page');
  await expect(rows(page).filter({ hasText: 'Write the copy' })).toHaveCount(1);

  const chevron = parent.getByRole('button', { name: 'Hide subtasks' });
  await chevron.click();
  await expect(rows(page).filter({ hasText: 'Write the copy' })).toHaveCount(0);
  await expect(parent.getByRole('button', { name: 'Show subtasks' })).toHaveAttribute('aria-expanded', 'false');

  // Another parent is untouched, and the fold is the task's own: it outlives a change of page.
  await go(page, '#/upcoming');
  await go(page, '#/week');
  await expect(rows(page).filter({ hasText: 'Write the copy' })).toHaveCount(0);

  await row(page, 'Rebuild the home page').getByRole('button', { name: 'Show subtasks' }).click();
  await expect(rows(page).filter({ hasText: 'Write the copy' })).toHaveCount(1);
});

test('#238 the chevron stays in view next to a title that runs past two lines', async ({ demo: page }) => {
  const parent = row(page, 'Rebuild the home page');
  await parent.locator('.ttitle').evaluate((node) => {
    node.textContent = 'Rebuild the home page with three blocks, one idea per block, visuals that follow the brand guide, copy reviewed by the whole team and approved before it goes live online';
  });
  const box = await parent.getByRole('button', { name: 'Hide subtasks' }).boundingBox();
  const rowBox = await parent.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x + box!.width).toBeLessThanOrEqual(rowBox!.x + rowBox!.width);
  await expect(parent.getByRole('button', { name: 'Hide subtasks' })).toBeVisible();
});

test('#254 typing @ in a shared task comment suggests its people, and an e-mail stays text', async ({ demo: page }) => {
  await go(page, '#/week');
  await row(page, 'Rebuild the home page').locator('.ttitle').click();
  const field = page.getByRole('textbox', { name: 'Comment', exact: true });
  await expect(page.locator('.comment-notify')).toContainText('Notify:');
  await field.click();
  await field.pressSequentially('Hi @Mart');
  const list = page.getByRole('listbox', { name: 'Mention someone' });
  await expect(list.getByRole('option')).toHaveCount(1);
  await expect(list.getByRole('option')).toContainText('Alex Martin');
  await page.keyboard.press('Enter');
  await expect(field).toHaveValue('Hi @Alex Martin ');
  await field.pressSequentially('mail anne@example.com');
  await expect(list).toHaveCount(0);
  await page.keyboard.press('Meta+Enter');
  await expect(page.locator('.comment .md .mention').last()).toHaveText('@Alex Martin');
});
