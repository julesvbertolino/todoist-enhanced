import { test, expect } from './demo';

test('a quick date choice in the composer closes the picker, as a deadline does', async ({ demo: page }) => {
  await page.keyboard.press('q');
  const composer = page.locator('.composerbox');
  await expect(composer).toBeVisible();
  await composer.locator('.datefield button').first().click();
  const picker = page.locator('.datepanel');
  await expect(picker).toBeVisible();
  await picker.getByRole('button', { name: /^Today/ }).click();
  await expect(picker).toHaveCount(0);
});
