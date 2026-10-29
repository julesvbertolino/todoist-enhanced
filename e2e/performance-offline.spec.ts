import { test, expect } from '@playwright/test';

test.use({ serviceWorkers: 'allow' });

test('pre-cached pages and the description editor open offline', async ({ page, context }) => {
  test.skip(process.env.PLAYWRIGHT_DEV === '1', 'The service worker is tested against the production build');
  await page.addInitScript(() => localStorage.setItem('skipSetup', '1'));
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await page.getByRole('button', { name: 'Explore with demo data' }).click();
  await expect(page.locator('.screen.active [data-task-id]').first()).toBeVisible();
  await context.setOffline(true);
  for (const route of ['review', 'insights', 'settings', 'workspace/personal', 'labels', 'filters', 'matrix']) {
    await page.evaluate((view) => { window.location.hash = `#/${view}`; }, route);
    await expect(page.locator('.screen.active .ptitle').first()).toBeVisible();
  }
  await page.evaluate(() => { window.location.hash = '#/week'; });
  await page.keyboard.press('q');
  await expect(page.locator('.descedit.composer .cm-content')).toBeVisible();
  await context.setOffline(false);
});
