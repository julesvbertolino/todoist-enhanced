import { test, expect, go } from './demo';

test('unestimated durations are staged until Save and Cancel discards them', async ({ demo: page }) => {
  await go(page, '#/week');
  const open = async () => {
    await page.locator('.screen.active .summary-time').click();
    return page.getByRole('dialog', { name: 'Without an estimate' });
  };
  let sheet = await open();
  const title = await sheet.locator('.estname .ttitle').first().innerText();
  await sheet.locator('.durationfield button').first().click();
  await page.locator('.durationpanel').getByRole('button', { name: '15 min', exact: true }).click();
  await expect(sheet.locator('.estfoot-tally')).toContainText('15 min');
  await sheet.getByRole('button', { name: 'Cancel' }).click();
  sheet = await open();
  await expect(sheet.locator('.estname .ttitle').filter({ hasText: title })).toBeVisible();
  await sheet.locator('.durationfield button').first().click();
  await page.locator('.durationpanel').getByRole('button', { name: '15 min', exact: true }).click();
  await sheet.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(sheet).toHaveCount(0);
  await expect(page.locator('.screen.active .summary-time')).toBeDisabled();
  await expect(page.locator('.screen.active [data-task-id]').filter({ hasText: title }).first()).toContainText('15 min');
});

test('the guided tour points to the Pomodoro button', async ({ demo: page }) => {
  await go(page, '#/week');
  await page.evaluate(() => window.dispatchEvent(new Event('enhanced:tour')));
  const card = page.locator('.tour-card');
  await expect(card).toBeVisible();
  for (let step = 0; step < 10; step += 1) {
    if ((await card.locator('h3').innerText()) === 'Focus with Pomodoro') break;
    await card.getByRole('button', { name: 'Next' }).click();
  }
  await expect(card.locator('h3')).toHaveText('Focus with Pomodoro');
  await expect(page.locator('.screen.active [data-tour="pomodoro"]')).toBeVisible();
  await expect(page.locator('.tour-hole')).toBeVisible();
});

test('selected priorities are named in Display', async ({ demo: page }) => {
  await go(page, '#/week');
  await page.getByRole('button', { name: 'Display', exact: true }).click();
  const filter = page.getByRole('button', { name: /Priority: Any priority/ });
  await filter.click();
  const popup = page.getByRole('dialog', { name: 'Priority' });
  await popup.getByLabel('P4').uncheck();
  await expect(page.getByRole('button', { name: /Priority: P1, P2, P3/ })).toBeVisible();
});
