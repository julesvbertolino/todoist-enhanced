import { test, expect, row } from './demo';

test('the context menu marks and unmarks a task without losing its title', async ({ demo: page }) => {
  const task = row(page, 'Rebuild the home page');
  const group = task.locator('xpath=ancestor::section[contains(@class,"group")][1]');
  const before = Number.parseInt(await group.locator('.gcount').innerText(), 10);
  await task.click({ button: 'right' });
  await page.getByRole('menu').last().getByRole('button', { name: 'Make uncompletable' }).click();
  await expect(task).toHaveAttribute('data-uncompletable', '');
  await expect(group.locator('.gcount')).toContainText(String(before - 1));
  await expect(task.getByRole('checkbox')).toHaveCount(0);
  expect((await task.locator(':scope > .tmain').boundingBox())!.width).toBeGreaterThan(120);
  await expect(task.locator('.ttitle')).toContainText('Rebuild the home page');
  await task.click({ button: 'right' });
  await page.getByRole('menu').last().getByRole('button', { name: 'Make completable' }).click();
  await expect(task.getByRole('checkbox').first()).toBeVisible();
  await expect(task).not.toHaveAttribute('data-uncompletable', '');
});

test('task detail menu can undo an uncompletable task', async ({ demo: page }) => {
  const task = row(page, 'Rebuild the home page');
  await task.click({ button: 'right' });
  await page.getByRole('menu').last().getByRole('button', { name: 'Make uncompletable' }).click();
  await task.click();
  const dialog = page.getByRole('dialog').last();
  await expect(dialog.locator('.detail-headline').getByRole('checkbox', { name: 'Complete task' })).toHaveCount(0);
  await expect(dialog.getByRole('textbox', { name: 'Task' })).toHaveValue('Rebuild the home page');
  await dialog.getByRole('textbox', { name: 'Task' }).click();
  await expect(dialog.getByRole('textbox', { name: 'Task' })).toHaveValue('* Rebuild the home page');
  expect((await dialog.locator('.detail-headline .detail-content').boundingBox())!.width).toBeGreaterThan(120);
  await dialog.getByRole('button', { name: 'More actions' }).click();
  await dialog.getByRole('button', { name: 'Make completable' }).click();
  await expect(dialog.locator('.detail-headline').getByRole('checkbox', { name: 'Complete task' })).toBeVisible();
});

test('a standing task keeps its state after editing and spans the table checkbox column', async ({ demo: page }) => {
  const task = row(page, 'Rebuild the home page');
  await task.click({ button: 'right' });
  await page.getByRole('menu').last().getByRole('button', { name: 'Make uncompletable' }).click();
  await task.click();
  const dialog = page.getByRole('dialog', { name: 'Task' });
  await dialog.getByRole('textbox', { name: 'Task' }).fill('* Homepage reference');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  const standing = row(page, 'Homepage reference');
  await expect(standing).toHaveAttribute('data-uncompletable', '');
  await page.getByRole('button', { name: 'Display', exact: true }).click();
  await page.locator('.display-modes').getByRole('button', { name: 'Table', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.task-table')).toBeVisible();
  const tableRow = page.locator('.task-table [data-uncompletable]').filter({ hasText: 'Homepage reference' }).first();
  await expect(tableRow.locator(':scope > .tmain')).toHaveCSS('grid-column-start', 'span 2');
  await expect(tableRow.getByRole('checkbox')).toHaveCount(0);
});
