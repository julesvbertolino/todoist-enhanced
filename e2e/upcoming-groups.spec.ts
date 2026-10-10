import { test, expect, go } from './demo';

test('#98 Upcoming groups by day, week or month, in the list and on the board', async ({ demo: page }) => {
  await go(page, '#/upcoming');
  await page.getByRole('button', { name: 'Display' }).click();
  const groupSelect = page.locator('.panelgrid .fselect-face').first();
  await expect(groupSelect).toHaveText(/Day/);
  await groupSelect.click();
  await expect(page.getByRole('option')).toHaveText(['Day', 'Week', 'Month']);
  await page.getByRole('option', { name: 'Week' }).click();

  await expect(page.locator('.screen.active')).toContainText(/This week|Next week|Week of/);

  const display = page.getByRole('button', { name: 'Display' });
  const board = page.getByRole('button', { name: 'Board', exact: true }).first();
  if (!(await board.isVisible())) await display.click();
  await board.click();
  await page.keyboard.press('Escape');
  const titles = page.locator('.screen.active .board .col .chead strong');
  await expect(titles.first()).toHaveText(/This week|Next week|Week of/);
});
