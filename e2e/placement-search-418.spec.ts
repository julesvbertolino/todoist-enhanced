import { test, expect, go } from './demo';

test('search results keep sections associated with their project', async ({ demo: page }) => {
  await go(page, '#/week');
  await page.getByRole('button', { name: 'Add task', exact: true }).first().click();
  const composer = page.getByRole('dialog', { name: 'Add task' });
  const place = composer.getByRole('button', { name: 'Project' });
  await place.click();
  const popup = page.locator('.composer-place-menu');
  await expect(popup.locator('.sectionopt')).not.toHaveCount(0);
  const search = popup.getByRole('textbox');
  await search.fill('website');
  const options = popup.getByRole('option');
  await expect(options.first()).toContainText('Website');
  const section = options.filter({ hasText: 'In progress' });
  await expect(section).toContainText('Website');
  await expect(section).not.toHaveClass(/sectionopt/);
  await section.click();
  await expect(place).toContainText('Website / In progress');
  await place.click();
  await expect(popup.locator('.sectionopt')).not.toHaveCount(0);
});
