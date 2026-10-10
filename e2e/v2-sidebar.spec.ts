import { test, expect, go } from './demo';

const sidebar = (page: import('@playwright/test').Page) => page.locator('.sidebar:not(.pvscale .sidebar)');
const entries = (page: import('@playwright/test').Page) =>
  sidebar(page).locator('nav .navitem .label').allTextContents();

test.describe('the sidebar (v2)', () => {
  test('lists Dashboard and Logbook, and each opens its own page', async ({ demo: page }) => {
    await expect(sidebar(page).getByRole('button', { name: 'Dashboard' })).toBeVisible();
    await sidebar(page).getByRole('button', { name: 'Logbook' }).click();
    await expect(page).toHaveURL(/#\/insights\/logbook/);
    await expect(sidebar(page).getByRole('button', { name: 'Logbook' })).toHaveAttribute('aria-current', 'page');
    await expect(sidebar(page).getByRole('button', { name: 'Dashboard' })).not.toHaveAttribute('aria-current', 'page');
    await sidebar(page).getByRole('button', { name: 'Dashboard' }).click();
    await expect(sidebar(page).getByRole('button', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');
  });

  test('has the bell and the fold button beside the profile', async ({ demo: page }) => {
    const top = sidebar(page).locator('.side-top');
    await expect(top.getByRole('button', { name: 'Notifications' })).toBeVisible();
    await expect(top.getByRole('button', { name: 'Collapse sidebar' })).toBeVisible();
    await top.getByRole('button', { name: 'Notifications' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('an entry unticked in Settings leaves the sidebar, and its page stays in search', async ({ demo: page }) => {
    await go(page, '#/settings');
    await page.locator('.navedit-label', { hasText: 'Review' }).click();
    expect(await entries(page)).not.toContain('Review');
    await page.keyboard.press('Meta+k');
    await page.keyboard.type('Review');
    await expect(page.getByRole('dialog').getByText('Review').first()).toBeVisible();
  });

  test('the order is the one you drag', async ({ demo: page }) => {
    await go(page, '#/settings');
    const grip = page.getByRole('button', { name: 'Move Tags' });
    await grip.focus();
    // The keyboard sensor picks the row up a frame after the key, and each arrow is one step.
    await page.keyboard.press('Space');
    await page.waitForTimeout(150);
    for (let i = 0; i < 4; i += 1) {
      await page.keyboard.press('ArrowUp');
      await page.waitForTimeout(150);
    }
    await page.keyboard.press('Space');
    await page.waitForTimeout(150);
    const names = await entries(page);
    expect(names.indexOf('Tags')).toBeLessThan(names.indexOf('Review'));
  });

  test('counts and the search field can be switched off', async ({ demo: page }) => {
    await go(page, '#/settings');
    await page.getByRole('switch', { name: 'Task counts' }).click();
    await expect(sidebar(page).locator('.navitem .count')).toHaveCount(0);
    await page.getByRole('switch', { name: 'Search bar' }).click();
    await expect(sidebar(page).locator('.searchbtn')).toHaveCount(0);
  });

  test('folds away and comes back, and is out of the tab order while away', async ({ demo: page }) => {
    await sidebar(page).getByRole('button', { name: 'Collapse sidebar' }).click();
    await expect(sidebar(page)).toBeHidden();
    await expect(sidebar(page)).toHaveAttribute('inert', '');
    // The page now starts at the frame's edge.
    await expect.poll(() => page.locator('.workspace').evaluate((n) => n.getBoundingClientRect().left)).toBe(12);
    await page.getByRole('button', { name: 'Show sidebar' }).click();
    await expect(sidebar(page)).toBeVisible();
    await expect(sidebar(page)).not.toHaveAttribute('inert', '');
  });

  test('counts, the ⋯, group carets and folder carets end on one line', async ({ demo: page }) => {
    const right = (selector: string) => sidebar(page).locator(selector).first()
      .evaluate((n) => Math.round(n.getBoundingClientRect().right));
    const column = await right('.navitem .count');
    expect(await right('.navend')).toBe(column);
    expect(await right('.navmore')).toBe(column);
    expect(await right('.side-disclose')).toBe(column);
    expect(await right('.navitem .disclose')).toBe(column);
  });
});
