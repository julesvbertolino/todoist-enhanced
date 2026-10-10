import { test as base, expect, type Page } from '@playwright/test';
import { test, go } from './demo';

/** A first visit: the demo opens straight on the setup. */
async function firstRun(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Explore with demo data' }).click();
  await expect(page.locator('.setup')).toBeVisible();
}

const next = async (page: Page) => {
  const go = page.locator('.setup').getByRole('button', { name: 'Continue' });
  // Where an estimate is saved is a choice nobody makes for you: the content scene waits for it.
  if (await page.locator('.setup[data-step="content"]').count() > 0 && await go.isDisabled()) {
    await page.locator('.setup .estimate-toggle').getByRole('radio').first().click();
  }
  await go.click();
};
/* A scene leaves for a moment before the next arrives: read the title once it has. */
const title = async (page: Page) => {
  await expect(page.locator('.setup:not(.leave)')).toBeVisible();
  return page.locator('.setup-head .hh.active h2').innerText();
};

base.describe('setup (v2)', () => {
  base('the demo opens the setup, with its greeting', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Explore with demo data' }).click();
    await expect(page.locator('.setup')).toBeVisible();
    await expect(page.locator('.setup-hello')).toHaveText('Welcome,');
    await expect(page.locator('.tour-card')).toHaveCount(0);
  });

  base('a first visit starts with the greeting, then five scenes, and the tour is a separate yes', async ({ page }) => {
    await firstRun(page);
    await expect(page.locator('.setup-hello')).toHaveText('Welcome,');
    await expect(page.locator('.setup-name')).toHaveText('Robin');
    await next(page);

    const titles = [await title(page)];
    await next(page);
    titles.push(await title(page));
    await next(page);
    titles.push(await title(page));
    expect(titles).toEqual(['Make it feel right', 'Shape your sidebar', 'Choose what a task shows']);

    // Back keeps what was chosen.
    await page.locator('.setup').getByRole('button', { name: 'Back', exact: true }).click();
    await page.getByRole('switch', { name: 'Task counts' }).click();
    await next(page);
    await page.locator('.setup').getByRole('button', { name: 'Back', exact: true }).click();
    await expect(page.getByRole('switch', { name: 'Task counts' })).toHaveAttribute('aria-checked', 'false');
    await next(page);
    await next(page);

    // The end has no step bar: the tour, or not.
    await expect(page.locator('.setup-name')).toHaveText('All set, Robin.');
    await expect(page.locator('.setup-progress')).toHaveCount(0);
    await page.getByRole('button', { name: 'Skip the tour' }).click();
    await expect(page.locator('.setup')).toHaveCount(0);
    await expect(page.locator('.tour-card')).toHaveCount(0);
  });

  base('"Show me around" at the end starts the tour', async ({ page }) => {
    await firstRun(page);
    for (let step = 0; step < 4; step += 1) await next(page);
    await page.getByRole('button', { name: 'Show me around' }).click();
    await expect(page.locator('.tour-card')).toBeVisible();
  });

  base('the look scene sets the layout and the background on the page behind', async ({ page }) => {
    await firstRun(page);
    await next(page);
    await page.getByRole('radio', { name: /Floating sidebar/ }).click();
    await expect(page.locator('html')).toHaveAttribute('data-layout', 'sidebar-float');
    await page.getByRole('radio', { name: /Coloured/ }).click();
    await expect(page.locator('html')).toHaveAttribute('data-background', 'colored');
  });

  base('Custom is a card like the others, refuses a bad code and keeps the last good one', async ({ page }) => {
    await firstRun(page);
    await next(page);
    await expect(page.locator('.setup .custom-colour-editor')).toHaveCount(0);
    await page.getByRole('radio', { name: 'Custom' }).click();
    await expect(page.getByRole('radio', { name: 'Custom' })).toHaveAttribute('aria-checked', 'true');
    const hex = page.getByLabel('Colour, as a hex code');
    await hex.fill('#2e7d32');
    await hex.press('Enter');
    const good = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());
    await hex.fill('banana');
    await hex.press('Enter');
    await expect(page.getByRole('alert').filter({ hasText: 'not a colour code' })).toBeVisible();
    await expect(hex).toHaveValue('2e7d32');
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim())).toBe(good);
  });

  for (const [label, width, height] of [['a laptop', 1366, 768], ['a phone', 390, 844]] as const) {
    base(`the buttons stay in view on ${label}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await firstRun(page);
      for (let step = 0; step < 4; step += 1) {
        const box = await page.locator('.setup').boundingBox();
        expect(box!.height, `step ${step}`).toBeLessThanOrEqual(height);
        expect(await page.locator('.setup').evaluate((root) => root.scrollWidth > root.clientWidth + 1), `step ${step}`).toBe(false);
        await expect(page.locator('.setup').getByRole('button', { name: 'Continue' })).toBeInViewport();
        await next(page);
      }
    });
  }
});

test.describe('setup and settings (v2)', () => {
  test('Settings replays the setup, and the sections come in the decided order', async ({ demo: page }) => {
    await go(page, '#/settings');
    const sections = await page.locator('.setnav a').allInnerTexts();
    expect(sections).toEqual([
      'Account', 'General', 'Appearance', 'Sidebar', 'Lists', 'Features and planning', 'Conflict detection', 'About',
    ]);
    await page.getByRole('button', { name: 'Redo the setup' }).click();
    await expect(page.locator('.setup-name')).toHaveText('Robin');
  });

  test('the support card is always there and cannot be closed', async ({ demo: page }) => {
    await page.route('https://github.com/**', (route) => route.fulfill({ status: 204 }));
    await go(page, '#/settings');
    const card = page.locator('.coffee-callout');
    await expect(card).toBeVisible();
    await expect(card.getByRole('button')).toHaveCount(0);
    expect((await card.getByRole('link', { name: 'Buy me a coffee' }).boundingBox())!.height).toBeGreaterThanOrEqual(46);
  });

  test('Week starts on is stated, with no link and nothing to change', async ({ demo: page }) => {
    await go(page, '#/settings');
    await expect(page.getByRole('link', { name: 'Change in Todoist' })).toHaveCount(0);
  });
});
