import { test as base, expect, type Locator, type Page } from '@playwright/test';

/**
 * A page with the demo open, and a watch on the console: any error logged
 * while a journey runs fails it, whatever the journey was checking.
 */
export const test = base.extend<{ demo: Page }>({
  demo: async ({ page }, use) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));

    // The demo account has been through the first run, so no tour stands in front.
    await page.addInitScript(() => {
      localStorage.setItem('skipSetup', '1');
    });
    await page.goto('/');
    await page.getByRole('button', { name: 'Explore with demo data' }).click();
    await expect(rows(page).first()).toBeVisible();

    await use(page);
    expect(errors, 'errors in the console').toEqual([]);
  },
});

export { expect };

/** The task rows on the page in front. */
export const rows = (page: Page): Locator => page.locator('.screen.active [data-task-id]');

/** A task row by its title. */
export const row = (page: Page, title: string): Locator =>
  rows(page).filter({ has: page.locator('.ttitle', { hasText: title }) }).first();

/** The titles of the rows on the page in front, top to bottom. */
export const titles = (page: Page): Promise<string[]> =>
  page.locator('.screen.active [data-task-id] .ttitle').allInnerTexts();

/**
 * The titles of the one-off tasks on the page, top to bottom. A repeating
 * task ticked off rolls on to its next date rather than closing, so it has
 * nothing for an undo to reopen; journeys about undo leave those out. Which
 * demo tasks come first depends on the time of day.
 */
export const oneOffTitles = (page: Page): Promise<string[]> =>
  page.locator('.screen.active [data-task-id]')
    .filter({ hasNot: page.locator('.repeatdot') })
    .locator('.ttitle')
    .allInnerTexts();

/** Goes to a page by its address, the way a sidebar click does, without reloading. */
export async function go(page: Page, hash: string): Promise<void> {
  await page.evaluate((to) => { window.location.hash = to; }, hash);
  await expect(page.locator('.screen.active')).toBeVisible();
  if (hash === '#/settings') await expect(page.locator('.screen.active #features')).toBeVisible();
  if (hash === '#/review') await expect(page.locator('.screen.active .reviewrail')).toBeVisible();
  if (hash === '#/insights') await expect(page.locator('.screen.active .ptitle')).toBeVisible();
}

/**
 * Types the name into the "New project" sheet and waits for "Add project" to
 * come alive. The sheet takes focus as it opens; on a slow runner a fill sent
 * before that has settled can be answered after the button was last checked.
 */
export async function fillProjectName(sheet: Locator, name: string): Promise<void> {
  const field = sheet.getByRole('textbox', { name: 'Project name' });
  await expect(field).toBeFocused();
  await field.fill(name);
  await expect(field).toHaveValue(name);
  await expect(sheet.getByRole('button', { name: 'Add project', exact: true })).toBeEnabled();
}
