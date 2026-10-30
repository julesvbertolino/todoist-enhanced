import { test, expect } from '@playwright/test';

test('the first setup screen can be skipped and stays skipped on reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Explore with demo data' }).click();
  const skip = page.getByRole('button', { name: 'Skip setup' });
  await expect(skip).toBeVisible();
  await skip.click();
  await expect(skip).not.toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Skip setup' })).not.toBeVisible();
});
