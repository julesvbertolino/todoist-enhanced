import { test as base, expect as baseExpect } from '@playwright/test';
import { test, expect, go, rows } from './demo';

const sidebar = (page: import('@playwright/test').Page) => page.locator('.sidebar:not(.pvscale .sidebar)');

base.describe('sign-in (feedback pass)', () => {
  base('the brand line has no Todoist mark, and the token link has no accordion arrow', async ({ page }) => {
    await page.goto('/');
    await baseExpect(page.locator('.signin-brand-name .tdlogo')).toHaveCount(0);
    const marker = await page.locator('.connect-token summary').evaluate((node) => getComputedStyle(node).listStyleType);
    baseExpect(marker).toBe('none');
  });

  base('the page is exactly as tall as the window, so the brand rises with it', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 560 });
    await page.goto('/');
    const heights = await page.evaluate(() => ({ page: document.scrollingElement!.scrollHeight, window: innerHeight }));
    baseExpect(heights.page).toBeLessThanOrEqual(heights.window + 1);
    await baseExpect(page.locator('.signin-brand')).toBeVisible();
  });
});

test.describe('settings and the sidebar (feedback pass)', () => {
  test('the theme is three pictures, and the Today tick is the week layout', async ({ demo: page }) => {
    await go(page, '#/settings');
    await expect(page.getByRole('radiogroup', { name: 'Appearance' }).getByRole('radio')).toHaveCount(3);

    // Merged week: Today is not a page, so its tick is off and the sidebar does not list it.
    const today = page.locator('.navedit-label', { hasText: 'Today' }).locator('input');
    await expect(today).not.toBeChecked();
    await expect(sidebar(page).getByRole('button', { name: /^Today/ })).toHaveCount(0);
    await page.locator('.navedit-label', { hasText: 'Today' }).click();
    await expect(today).toBeChecked();
    await expect(sidebar(page).getByRole('button', { name: /^Today/ })).toBeVisible();
    await page.locator('.navedit-label', { hasText: 'Today' }).click();
    await expect(sidebar(page).getByRole('button', { name: /^Today/ })).toHaveCount(0);
  });

  test('the Inbox menu offers its link and nothing else', async ({ demo: page }) => {
    await go(page, '#/inbox');
    await page.locator('.screen.active').getByRole('button', { name: 'Project actions' }).click();
    const menu = page.getByRole('menu', { name: 'Project actions' });
    await expect(menu.getByRole('menuitem')).toHaveCount(1);
    await expect(menu.getByRole('menuitem', { name: 'Copy link' })).toBeVisible();
  });
});

test.describe('the open task (feedback pass)', () => {
  test('the duration says its name without a unit, and a comment can be written', async ({ demo: page }) => {
    await go(page, '#/project/site');
    await rows(page).first().locator('.ttitle').click();
    const dialog = page.getByRole('dialog', { name: 'Task', exact: true });
    await expect(dialog.locator('[data-prop="estimate"]')).toContainText('Duration');
    await expect(dialog.locator('.estunit')).toHaveCount(0);

    const field = dialog.getByRole('textbox', { name: 'Comment' });
    await field.fill('Call them back on Monday');
    await field.press('Enter');
    await expect(dialog.locator('.comment-body')).toContainText('Call them back on Monday');
    await expect(field).toHaveValue('');
  });
});

test.describe('controls that choose (feedback pass)', () => {
  test('a segmented control has one thumb that moves to the chosen option', async ({ demo: page }) => {
    await go(page, '#/week');
    await page.getByRole('button', { name: 'Display', exact: true }).click();
    const modes = page.getByRole('dialog', { name: 'Display' }).locator('.segmented').first();
    await expect(modes).toHaveClass(/seg-slide/);
    const x = async () => modes.evaluate((node) => (node as HTMLElement).style.getPropertyValue('--seg-x'));
    const before = await x();
    await modes.getByRole('button').nth(1).click();
    await expect.poll(x).not.toBe(before);
  });

  test('the dashboard cards are arranged by their grip', async ({ demo: page }) => {
    await go(page, '#/insights');
    await page.getByRole('button', { name: 'Edit layout' }).click();
    await expect(page.locator('.dash-grip').first()).toBeVisible();
  });
});
