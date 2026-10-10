import { test, expect, go, rows } from './demo';
import type { Page } from '@playwright/test';

const openDisplay = async (page: Page) => {
  await page.getByRole('button', { name: 'Display' }).click();
  return page.getByRole('dialog', { name: 'Display' });
};

test.describe('lists (v2)', () => {
  test('Display offers no full width: a board is always the page', async ({ demo: page }) => {
    await go(page, '#/project/site');
    const panel = await openDisplay(page);
    await panel.getByRole('button', { name: 'Board', exact: true }).click();
    await expect(panel.getByText('Full width')).toHaveCount(0);
    await expect(page.locator('.screen.active .board.fullwidth')).toBeVisible();
  });

  test('Show on each task switches the description off for every list', async ({ demo: page }) => {
    await go(page, '#/week');
    await expect(page.locator('.screen.active .tdesc').first()).toBeVisible();
    const panel = await openDisplay(page);
    await panel.getByRole('button', { name: 'Description', exact: true }).click();
    await expect(page.locator('.screen.active .tdesc')).toHaveCount(0);
    // Global: another page has none either, and Reset all does not bring it back.
    await panel.getByRole('button', { name: 'Reset all' }).click();
    await go(page, '#/project/site');
    await expect(page.locator('.screen.active .tdesc')).toHaveCount(0);
  });

  test('the chips under a title follow the order set in Display', async ({ demo: page }) => {
    await go(page, '#/week');
    const kinds = () => page.locator('.screen.active .task .meta').filter({ has: page.locator('.est') })
      .filter({ has: page.locator('.proj') }).first().evaluate((meta) =>
        Array.from(meta.children).map((c) => (c.className.match(/\b(est|proj)\b/) ?? [''])[0]).filter(Boolean));
    expect(await kinds()).toEqual(['est', 'proj']);

    const panel = await openDisplay(page);
    const chips = () => panel.locator('.detailschips .chip').allTextContents();
    // The keyboard: Alt and an arrow moves the focused chip one place.
    const estimate = panel.getByRole('button', { name: 'Estimate', exact: true }).last();
    await estimate.focus();
    for (let i = 0; i < 4; i += 1) await page.keyboard.press('Alt+ArrowRight');
    expect(await chips()).toEqual(['Description', 'Date', 'Deadline', 'Tags', 'Project', 'Estimate', 'Priority colour']);
    expect(await kinds()).toEqual(['proj', 'est']);

    // The pointer: Project is dragged in front of Date.
    const project = panel.getByRole('button', { name: 'Project', exact: true }).last();
    const from = await project.boundingBox();
    const to = await panel.getByRole('button', { name: 'Date', exact: true }).last().boundingBox();
    await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2);
    await page.mouse.down();
    await page.mouse.move(to!.x + 4, to!.y + to!.height / 2, { steps: 12 });
    await page.mouse.up();
    await expect.poll(chips).toEqual(['Description', 'Project', 'Date', 'Deadline', 'Tags', 'Estimate', 'Priority colour']);
  });

  test('a subtask pill folds the subtasks; nothing separates a task from them', async ({ demo: page }) => {
    await go(page, '#/project/site');
    const parent = rows(page).filter({ has: page.locator('.subprog') }).first();
    const subtasks = page.locator('.screen.active .task[data-depth]');
    const before = await subtasks.count();
    expect(before).toBeGreaterThan(0);
    await expect(parent).toHaveCSS('border-bottom-color', 'rgba(0, 0, 0, 0)');
    const pill = parent.locator('button.subprog');
    await expect(pill).toHaveAttribute('aria-expanded', 'true');
    await pill.click();
    await expect(pill).toHaveAttribute('aria-expanded', 'false');
    await expect.poll(() => subtasks.count()).toBeLessThan(before);
  });

  test('every group folds from a caret on its left, with its count after the title', async ({ demo: page }) => {
    await go(page, '#/week');
    const group = page.locator('.screen.active .group').first();
    await expect(group.locator('.gcaret')).toBeVisible();
    await expect(group.locator('.gtoggle .gcount')).toHaveText(/^\d+ tasks?$/);
    await expect(group.locator('.gdisclose')).toHaveCount(0);
    await group.locator('.gcaret').click();
    await expect(group.locator('[data-task-id]')).toHaveCount(0);
  });
});
