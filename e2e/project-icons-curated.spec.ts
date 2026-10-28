import { test, expect, go } from './demo';
test('project icons are searchable by related words and shown after selection', async ({ demo: page }) => {
  await go(page, '#/project/site');
  await page.getByRole('button', { name: 'Change the icon' }).click();
  const picker = page.getByRole('dialog', { name: 'Icon' });
  const search = picker.getByRole('textbox');
  await search.fill('grocery');
  const basket = picker.getByRole('button', { name: 'shopping basket' });
  await expect(basket).toBeVisible();
  await basket.click();
  await page.getByRole('button', { name: 'Change the icon' }).click();
  await expect(page.getByRole('dialog', { name: 'Icon' }).getByRole('button', { name: 'shopping basket' })).toHaveAttribute('aria-pressed', 'true');
});
