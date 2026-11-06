import { test, expect, go } from './demo';

test('#103 a Logbook row opens its completed task, by click and by Enter', async ({ demo: page }) => {
  await go(page, '#/insights/logbook');
  const row = page.locator('.logrow.opens').first();
  await expect(row).toBeVisible();
  const title = (await row.locator('.logname').innerText()).trim();

  await row.click();
  await expect(page.locator('.detail-headline.done')).toBeVisible();
  await expect(page.locator('.detail-done')).toContainText('Completed on');
  await expect(page.locator('.crumbself')).toContainText(title);

  // Escape hands the keyboard back to the row it came from; Enter opens it again.
  await page.keyboard.press('Escape');
  await expect(page.locator('.detail-headline')).toHaveCount(0);
  await expect(row).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.detail-headline.done')).toBeVisible();
  await page.keyboard.press('Escape');

  // Opened, it is still not listed anywhere as an open task.
  await go(page, '#/week');
  await expect(page.locator('.screen.active .ttitle', { hasText: title })).toHaveCount(0);
});

test('#103 follow-up: arrow keys walk the Logbook rows, and unticking a one-off task drops the banner', async ({ demo: page }) => {
  await go(page, '#/insights/logbook');
  const rows = page.locator('.logrow.opens');
  await expect.poll(() => rows.count()).toBeGreaterThan(1);
  await rows.first().focus();
  await page.keyboard.press('ArrowDown');
  await expect(rows.nth(1)).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(rows.first()).toBeFocused();

  // A one-off task, unticked from its Logbook popup, is just active again.
  await rows.first().click();
  await expect(page.locator('.detail-done')).toBeVisible();
  await expect(page.locator('.detail-done')).not.toContainText('next occurrence');
  await page.locator('.detail-headline .check, .detail-headline [role=checkbox]').first().click();
  await expect(page.locator('.detail-done')).toHaveCount(0);
});
