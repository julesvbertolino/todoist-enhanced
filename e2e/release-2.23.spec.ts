import { expect, go, test } from './demo';

test('secondary text has more contrast while hints and dark theme keep their colours', async ({ demo: page }) => {
  await expect(page.locator('html')).toHaveCSS('--faint', '#6b6b6b');
  await page.getByRole('button', { name: 'Add task', exact: true }).first().click();
  await expect(page.locator('.composer-name')).toHaveCSS('color', /.+/);
  const placeholder = await page.locator('.composer-name').evaluate((input) => getComputedStyle(input, '::placeholder').color);
  expect(placeholder).toBe('rgb(128, 128, 128)');
  await page.keyboard.press('Escape');
  await go(page, '#/settings');
  await page.getByRole('radio', { name: 'Dark', exact: true }).click();
  expect((await page.locator('html').evaluate((root) => getComputedStyle(root).getPropertyValue('--faint'))).trim()).toBe('#999999');
});

test('project picker uses a short hint in English and French', async ({ demo: page }) => {
  await page.getByRole('button', { name: 'Add task', exact: true }).first().click();
  await page.locator('.composer-name').fill('#');
  await expect(page.locator('.namepicker-placeholder')).toHaveText('Project or section…');
  await page.locator('.composer-name').fill('');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Add task' })).toHaveCount(0);
  await go(page, '#/settings');
  await page.getByRole('radiogroup', { name: 'Language' }).getByRole('radio', { name: 'Français' }).click();
  await go(page, '#/week');
  await page.getByRole('button', { name: 'Ajouter une tâche', exact: true }).first().click();
  await page.locator('.composer-name').fill('#');
  await expect(page.locator('.namepicker-placeholder')).toHaveText('Projet ou section…');
});

test('the full chart column is an accessible target even for zero values', async ({ demo: page }) => {
  await go(page, '#/insights');
  const chart = page.locator('.chart').filter({ has: page.locator('button.barslot') }).first();
  const slots = chart.locator('button.barslot');
  await expect(slots.first()).toBeVisible();
  const zero = slots.filter({ has: page.locator('.bar[style*="height: 2%"]') }).first();
  await expect(zero).toBeVisible();
  const box = (await zero.boundingBox())!;
  const mark = (await zero.locator('.bar').boundingBox())!;
  expect(box.height).toBeGreaterThan(mark.height * 3);
  await page.mouse.click(box.x + box.width / 2, box.y + 8);
  await expect(chart.locator('.chart-readout')).toContainText((await zero.getAttribute('aria-label'))!.split(':')[0]);
  await zero.focus();
  await expect(zero).toBeFocused();
});
