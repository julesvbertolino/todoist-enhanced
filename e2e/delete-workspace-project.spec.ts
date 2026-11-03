import { test, expect } from './demo';

test('deleting a workspace project asks Archive or Delete, and Delete archives then deletes', async ({ demo: page }) => {
  const row = page.locator('.sidebar .navrow', { hasText: 'Website' }).first();
  await row.hover();
  await row.getByRole('button', { name: 'Project actions' }).click();
  await page.getByRole('menuitem', { name: /^Delete/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('can’t be deleted yet');
  await expect(dialog.getByRole('button', { name: 'Archive' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Delete' }).click();
  await expect(page.locator('.sidebar').getByText('Website', { exact: true })).toHaveCount(0);
});
