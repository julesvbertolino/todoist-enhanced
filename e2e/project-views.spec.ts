import { test, expect, go, rows } from './demo';
import type { Page } from '@playwright/test';

/** Saved views of a project (#333): pills under the header, each with its own layout, grouping and filters. */
const pills = (page: Page) => page.locator('.screen.active .vtabs [role="tab"]');
const panel = (page: Page) => page.locator('.anchored');
const windowOf = (page: Page) => page.locator('.anchored');

/** Fills the panel that adds a view and creates it. */
async function newView(page: Page, name: string, layout: string, before?: () => Promise<void>) {
  await page.getByRole('button', { name: 'Add a view' }).click();
  await windowOf(page).locator(`.display-modes button[title="${layout}"]`).click();
  await windowOf(page).getByRole('textbox', { name: 'Name' }).fill(name);
  await before?.();
  await windowOf(page).getByRole('button', { name: 'Create the view' }).click();
  await expect(windowOf(page)).toHaveCount(0);
}
/** Opens the panel of the view in front, by pressing its pill. */
const editFront = (page: Page) => page.locator('.screen.active .vtabs-list .vtab.on [role="tab"]').click();

test.describe('saved views of a project', () => {
  test.beforeEach(async ({ demo: page }) => { await go(page, '#/project/site'); });

  test('a project starts with one view and a plus', async ({ demo: page }) => {
    await expect(pills(page)).toHaveText(['Main view']);
    await expect(page.getByRole('button', { name: 'Add a view' })).toBeVisible();
  });

  test('a new view has its own layout and filters, and the first view is left as it was', async ({ demo: page }) => {
    const all = await rows(page).count();
    await newView(page, 'Urgent', 'Board', async () => {
      await windowOf(page).getByRole('button', { name: /Priority/ }).click();
      await page.locator('.multiselect-options label', { hasText: 'P1' }).click();
      await page.keyboard.press('Escape');
    });

    // The new view is in front and nothing stays open.
    await expect(pills(page)).toHaveText(['Main view', 'Urgent']);
    await expect(panel(page)).toHaveCount(0);
    await expect(page.locator('.screen.active .board')).toBeVisible();
    expect(await rows(page).count()).toBeLessThan(all);

    await pills(page).first().click();
    await expect(page.locator('.screen.active .board')).toHaveCount(0);
    await expect(rows(page)).toHaveCount(all);
  });

  test('the views, their settings and the one in front survive a reload', async ({ demo: page }) => {
    await newView(page, 'Focus', 'List', async () => {
      await windowOf(page).getByRole('button', { name: /Priority/ }).click();
      await page.locator('.multiselect-options label', { hasText: 'P1' }).click();
      await page.keyboard.press('Escape');
    });
    const focused = await rows(page).count();

    await page.reload();
    await expect(pills(page)).toHaveText(['Main view', 'Focus']);
    await go(page, '#/project/site');
    await pills(page).filter({ hasText: 'Focus' }).click();
    await expect(rows(page)).toHaveCount(focused);
  });

  test('a view can be renamed, duplicated and deleted, and the last one cannot', async ({ demo: page }) => {
    await newView(page, 'Draft', 'List');

    // A double click or F2 on the pill does not rename it: the name is edited in the panel.
    await pills(page).filter({ hasText: 'Draft' }).dblclick();
    await page.keyboard.press('F2');
    await expect(page.locator('.vtabs input')).toHaveCount(0);
    if (await panel(page).count() === 0) await editFront(page);
    await panel(page).getByRole('textbox', { name: 'Name' }).fill('Plan');
    await panel(page).getByRole('button', { name: 'Done' }).click();
    await expect(pills(page)).toHaveText(['Main view', 'Plan']);

    await editFront(page);
    await panel(page).getByRole('button', { name: 'Duplicate this view' }).click();
    await expect(pills(page)).toHaveText(['Main view', 'Plan', 'Plan (copy)']);

    await editFront(page);
    await panel(page).getByRole('button', { name: 'Delete this view' }).click();
    await page.getByRole('button', { name: 'Delete this view', exact: true }).or(page.getByRole('button', { name: 'Delete', exact: true })).last().click();
    await expect(pills(page)).toHaveText(['Main view', 'Plan']);

    // Only one view left to delete once the others are gone: the button refuses.
    await editFront(page);
    await panel(page).getByRole('button', { name: 'Delete this view' }).click();
    await page.getByRole('button', { name: 'Delete this view', exact: true }).or(page.getByRole('button', { name: 'Delete', exact: true })).last().click();
    await editFront(page);
    await expect(panel(page).getByRole('button', { name: /at least one view/ })).toHaveAttribute('aria-disabled', 'true');
  });

  test('the panel points at its pill, and the pill stays marked while it is open', async ({ demo: page }) => {
    await editFront(page);
    await expect(panel(page).locator('.anchored-arrow')).toBeVisible();
    await expect(page.locator('.vtab.open')).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(panel(page)).toHaveCount(0);
    await expect(page.locator('.vtab.open')).toHaveCount(0);
  });

  test('the keyboard moves between views and reorders them', async ({ demo: page }) => {
    await newView(page, 'Second', 'List');
    await pills(page).filter({ hasText: 'Second' }).focus();
    await page.keyboard.press('ArrowLeft');
    await expect(pills(page).first()).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('Alt+Shift+ArrowRight');
    await expect(pills(page)).toHaveText(['Second', 'Main view']);
  });

  test('create and edit offer the same fields', async ({ demo: page }) => {
    const fields = async (scope: ReturnType<typeof panel>) => scope.locator('.dfields h5, .dfields .panelgrid label, .dfields .display-modes button, .dfields .fselect-face, .dfields .panelrow span').allInnerTexts();
    await page.getByRole('button', { name: 'Add a view' }).click();
    const creating = await fields(windowOf(page));
    await windowOf(page).getByRole('button', { name: 'Cancel' }).click();
    await editFront(page);
    expect(await fields(panel(page))).toEqual(creating);
  });

  test('the panel header holds the actions as icons: reset, duplicate, delete, done', async ({ demo: page }) => {
    await editFront(page);
    await expect(panel(page).locator('.vactions .vround')).toHaveCount(4);
    await expect(panel(page).locator('.vactions .vround')).toHaveText(['', '', '', '']);
  });

  test('adding a view uses the same dropdown as editing one, hanging from the plus', async ({ demo: page }) => {
    await page.getByRole('button', { name: 'Add a view' }).click();
    await expect(windowOf(page).locator('.anchored-arrow')).toBeVisible();
    await expect(page.locator('.sheet')).toHaveCount(0);
    await expect(windowOf(page).locator('.vactions .vround')).toHaveCount(3);
  });

  test('a pill has the same padding on both sides and no icon to open it', async ({ demo: page }) => {
    const sides = await pills(page).first().evaluate((el) => {
      const box = el.getBoundingClientRect();
      const kids = Array.from(el.children).map((child) => child.getBoundingClientRect());
      return { left: kids[0].left - box.left, right: box.right - kids[kids.length - 1].right, svgs: el.querySelectorAll('svg').length };
    });
    expect(Math.abs(sides.left - sides.right)).toBeLessThanOrEqual(2);
    expect(sides.svgs).toBe(1);
  });

  test('the columns of a table open at the side with a switch and a handle for each', async ({ demo: page }) => {
    await newView(page, 'Grid', 'Table');
    await page.locator('.screen.active').getByRole('button', { name: /^Display/ }).click();
    const display = page.getByRole('dialog', { name: 'Display', exact: true });
    await display.getByRole('button', { name: /^Columns/ }).click();
    const side = page.locator('.sidemenu');
    await expect(side).toBeVisible();
    const [panelBox, sideBox] = [await display.boundingBox(), await side.boundingBox()];
    expect(sideBox!.x + sideBox!.width).toBeLessThanOrEqual(panelBox!.x);
    // Every column has a handle, the title and the hidden ones too.
    await expect(side.locator('button.colgrip')).toHaveCount(9);
    await side.getByRole('switch', { name: 'Description' }).click();
    await expect(side.getByRole('switch', { name: 'Description' })).toHaveAttribute('aria-checked', 'true');
    const before = await side.locator('.colrow .collabel').allInnerTexts();
    await side.getByRole('button', { name: 'Move Start date' }).focus();
    await page.keyboard.press('Alt+ArrowDown');
    const after = await side.locator('.colrow .collabel').allInnerTexts();
    expect(after).not.toEqual(before);

    // A hidden column can be moved, and switched on it returns to the place it was given.
    await side.getByRole('button', { name: 'Move Project' }).focus();
    for (let i = 0; i < 6; i += 1) await page.keyboard.press('Alt+ArrowUp');
    expect((await side.locator('.colrow .collabel').allInnerTexts())[1]).toBe('Project');
    await side.getByRole('switch', { name: 'Project' }).click();
    const headers = await page.locator('.screen.active .table-head .head-sort').allInnerTexts();
    expect(headers.findIndex((text) => /Project/.test(text))).toBe(1);
  });

  test('a long panel scrolls to its last line', async ({ demo: page }) => {
    await page.setViewportSize({ width: 1280, height: 600 });
    await editFront(page);
    const body = panel(page).locator('.anchored-body');
    await body.evaluate((el) => { el.scrollTop = el.scrollHeight; });
    await expect(panel(page).getByText('Show completed tasks')).toBeInViewport();
  });
});
