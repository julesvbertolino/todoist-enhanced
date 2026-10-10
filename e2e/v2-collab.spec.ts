import { test, expect, go, rows } from './demo';

test.describe('notifications, sharing and assignment (v2)', () => {
  test('the bell opens Todoist notifications first when one is unread, and marking them read clears it', async ({ demo: page }) => {
    await go(page, '#/week');
    const bell = page.locator('.sidebar .side-top').getByRole('button', { name: 'Notifications' });
    await expect(bell.locator('.belldot')).toBeVisible();
    await bell.click();
    const dialog = page.getByRole('dialog', { name: 'Notifications' });
    await expect(dialog.getByRole('button', { name: /^From Todoist/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(dialog.locator('.notiflist li')).toHaveCount(2);
    await expect(dialog.locator('.notiflist li.unread')).toHaveCount(1);
    await dialog.getByRole('button', { name: 'Mark all as read' }).click();
    await expect(dialog.locator('.notiflist li.unread')).toHaveCount(0);
    await dialog.getByRole('button', { name: /^Conflicts/ }).click();
    // Conflicts and the tasks to estimate share one list now, not two tabs.
    await expect(dialog.getByRole('tab')).toHaveCount(0);
    await expect(dialog.getByRole('button', { name: /^Conflicts/ })).toHaveAttribute('aria-pressed', 'true');
  });

  test('a task of a shared project can be assigned, one of a private project cannot', async ({ demo: page }) => {
    await go(page, '#/project/site');
    await rows(page).first().locator('.ttitle').click();
    const sheet = page.locator('.overlay');
    await sheet.getByRole('button', { name: 'Assigned to' }).click();
    await page.getByRole('option', { name: 'Alex Martin' }).click();
    await expect(sheet.getByRole('button', { name: 'Assigned to' })).toContainText('Alex Martin');
    await page.keyboard.press('Escape');

    await go(page, '#/project/personal');
    await rows(page).first().locator('.ttitle').click();
    await expect(page.locator('.overlay').getByRole('button', { name: 'Assigned to' })).toHaveCount(0);
  });

  test('Share opens from the project menu, lists who has access, and refuses a bad address', async ({ demo: page }) => {
    await go(page, '#/week');
    const row = page.locator('.sidebar .navrow.sortable').filter({ hasText: 'Website' }).first();
    await row.hover();
    await row.getByRole('button', { name: 'Project actions' }).click();
    await page.getByRole('menuitem', { name: 'Share…' }).click();
    const sheet = page.getByRole('dialog', { name: 'Share' });
    await expect(sheet.locator('.sharelist')).toContainText('Alex Martin');
    await sheet.getByRole('textbox', { name: 'E-mail address' }).fill('nope');
    await sheet.getByRole('button', { name: 'Invite' }).click();
    await expect(sheet.getByRole('alert')).toBeVisible();
  });

  test('the groups of projects can be put in another order from Settings', async ({ demo: page }) => {
    await go(page, '#/settings');
    const list = page.locator('.wsgroups li');
    const first = await list.first().innerText();
    const grip = list.first().getByRole('button');
    await grip.focus();
    await page.keyboard.press('Space');
    await page.waitForTimeout(150);
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(300);
    await page.keyboard.press('Space');
    await expect.poll(() => list.first().innerText()).not.toBe(first);
  });
});
