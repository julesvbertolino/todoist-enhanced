import { expect, go, test } from './demo';

test('after an update, What’s new says "since your last visit" and labels each change with its version (#227, #336)', async ({ demo: page }) => {
  await go(page, '#/inbox');
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('enhanced:changelog', { detail: { versions: ['2.3.0'] } })));
  const dialog = page.getByRole('dialog', { name: 'What’s new since your last visit' });
  await expect(dialog.getByRole('heading', { name: 'What’s new since your last visit' })).toBeVisible();
  await expect(dialog.locator('.whatsnew-version').first()).toContainText('2.3.0');
  await expect(dialog.locator('.whatsnew-release')).toHaveCount(0);
});

test('typing right after opening the project icon picker filters the icons (#211)', async ({ demo: page }) => {
  await go(page, '#/project/site');
  await page.getByRole('button', { name: 'Change the icon' }).click();
  const picker = page.getByRole('dialog', { name: 'Icon' });
  await expect(picker.getByRole('textbox')).toBeFocused();
  await page.keyboard.type('star');
  await expect(picker.getByRole('textbox')).toHaveValue('star');
  await expect(page.getByRole('dialog', { name: 'Search' })).toHaveCount(0);
});

test('the favourite star on the Filters list is always there and toggles in one click (#217)', async ({ demo: page }) => {
  await go(page, '#/filters');
  const cards = page.locator('.screen.active .tagcard');
  const stars = cards.locator('.tagcard-star');
  await expect(stars).toHaveCount(await cards.count());
  const star = stars.first();
  const before = await star.getAttribute('aria-pressed');
  await star.click();
  await expect(star).not.toHaveAttribute('aria-pressed', before ?? 'false');
});

test('the favourite star on the Tags list toggles in one click (#217)', async ({ demo: page }) => {
  await go(page, '#/labels');
  const star = page.locator('.screen.active .tagcard .tagcard-star').first();
  const before = await star.getAttribute('aria-pressed');
  await star.click();
  await expect(star).not.toHaveAttribute('aria-pressed', before ?? 'false');
});
