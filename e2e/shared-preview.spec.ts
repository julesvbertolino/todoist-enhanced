import { test, expect } from './demo';
import { resolve } from 'node:path';
test('shared preview has explicit versioned Open Graph and Twitter image metadata', async ({ demo: page }) => {
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og-image-2\.png$/);
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute('content', /\/og-image-2\.png$/);
  const response = await page.request.get('/og-image-2.png');
  expect(response.ok()).toBe(true);
  expect(response.headers()['content-type']).toContain('image/png');
  const png = await response.body();
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(630);
});
test('capture the demo-only shared preview', async ({ demo: page }) => {
  test.skip(process.env.CAPTURE_OG !== '1', 'Explicit asset generation only');
  await page.setViewportSize({ width: 1200, height: 630 });
  await expect(page.locator('.phead')).toBeVisible();
  await page.getByRole('button', { name: /^Behind schedule/ }).click();
  await page.mouse.move(1199, 0);
  await page.screenshot({ path: resolve('public/og-image-2.png'), animations: 'disabled' });
});
