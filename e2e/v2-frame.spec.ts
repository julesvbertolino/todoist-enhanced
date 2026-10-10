import { test, expect, go } from './demo';

/** v2: the two frames and the two backgrounds, chosen in Settings → Appearance. */
test.describe('the frame', () => {
  test('the page floats on a neutral background by default', async ({ demo: page }) => {
    const root = page.locator('html');
    await expect(root).toHaveAttribute('data-layout', 'page-float');
    await expect(root).toHaveAttribute('data-background', 'neutral');
    const radius = await page.locator('.workspace:not(.pvscale .workspace)').evaluate((n) => getComputedStyle(n).borderTopLeftRadius);
    expect(radius).toBe('20px');
  });

  test('a floating sidebar leaves the page edge to edge, and the choice is remembered', async ({ demo: page }) => {
    await go(page, '#/settings');
    await page.getByRole('radio', { name: 'Floating sidebar' }).click();
    await page.getByRole('radio', { name: 'Coloured' }).click();

    const root = page.locator('html');
    await expect(root).toHaveAttribute('data-layout', 'sidebar-float');
    await expect(root).toHaveAttribute('data-background', 'colored');
    await expect(page.locator('.sidebar:not(.pvscale .sidebar)')).toHaveCSS('position', 'absolute');
    await expect(page.locator('.workspace:not(.pvscale .workspace)')).toHaveCSS('border-top-left-radius', '0px');
    // White ink on the coloured card.
    await expect(page.locator('.sidebar .navitem').first()).toHaveCSS('color', /rgba?\(255, 255, 255/);

    expect(await page.evaluate(() => localStorage.getItem('layout'))).toBe('sidebar-float');
    expect(await page.evaluate(() => localStorage.getItem('background'))).toBe('colored');
  });

  test('every accent leaves white text readable on the coloured sidebar', async ({ demo: page }) => {
    await go(page, '#/settings');
    await page.getByRole('radio', { name: 'Coloured' }).click();
    for (const accent of ['Todoist', 'Sunflower', 'Lagoon', 'Graphite', 'Cocoa']) {
      await page.getByRole('radio', { name: accent, exact: true }).click();
      const ratio = await page.evaluate(() => {
        const gradient = document.documentElement.style.getPropertyValue('--back-gradient');
        const top = gradient.match(/#[0-9a-f]{6}/i)![0];
        const [r, g, b] = [1, 3, 5].map((i) => parseInt(top.slice(i, i + 2), 16) / 255)
          .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
        return 1.05 / (0.2126 * r + 0.7152 * g + 0.0722 * b + 0.05);
      });
      expect(ratio, accent).toBeGreaterThanOrEqual(3);
    }
  });

  test('a phone has no frame', async ({ demo: page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('.workspace:not(.pvscale .workspace)')).toHaveCSS('border-top-left-radius', '0px');
    await expect(page.locator('.sidebar:not(.pvscale .sidebar)')).toBeHidden();
  });
});
