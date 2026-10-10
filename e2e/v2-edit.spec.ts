import { test, expect, go, rows } from './demo';

test.describe('editing a task (v2)', () => {
  test('a task opens as a window until Settings says a panel', async ({ demo: page }) => {
    await go(page, '#/week');
    await rows(page).first().locator('.ttitle').click();
    await expect(page.locator('.overlay .sheet .detail-top')).toBeVisible();
    await expect(page.locator('.overlay .side-sheet')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(page.locator('.overlay')).toHaveCount(0);

    await go(page, '#/settings');
    // Where a task opens is chosen from two pictures, not from a list.
    await page.getByRole('radio', { name: 'Side panel' }).click();

    await go(page, '#/week');
    await rows(page).first().locator('.ttitle').click();
    const panel = page.locator('.overlay .side-sheet');
    await expect(panel.locator('.detail-top')).toBeVisible();
    // One column: the properties sit under the task rather than beside it.
    const main = await panel.locator('.detail-main').boundingBox();
    const side = await panel.locator('.detail-side').boundingBox();
    expect(side!.y).toBeGreaterThan(main!.y + main!.height - 1);

    await page.keyboard.press('Escape');
    await expect(page.locator('.overlay')).toHaveCount(0);
  });

  test('a project is filed under its parent from the sheet, new or existing', async ({ demo: page }) => {
    await go(page, '#/week');
    await page.getByRole('button', { name: 'Add project' }).first().click();
    const sheet = page.getByRole('dialog', { name: 'New project' });
    await sheet.getByRole('textbox', { name: 'Project name' }).fill('Photo studio');
    await sheet.getByRole('textbox', { name: 'Description' }).fill('Prints, frames and a spring show.');
    // Twenty colours, Todoist's own, ending on the two the sheet used to leave out.
    await expect(sheet.getByRole('radio')).toHaveCount(20);
    await sheet.getByRole('radio', { name: 'Taupe' }).click();
    await sheet.getByRole('button', { name: 'Parent project' }).click();
    await page.getByRole('option', { name: /Personal$/ }).click();
    await sheet.getByRole('button', { name: 'Add project', exact: true }).click();
    await expect(sheet).toHaveCount(0);

    const hashX = async (name: string) => page.locator('.sidebar .navrow.sortable')
      .filter({ hasText: name }).first().locator('.hash').evaluate((el) => el.getBoundingClientRect().x);
    expect(await hashX('Photo studio')).toBeGreaterThan(await hashX('Personal'));

    // Existing: the same field takes it back to the top.
    const row = page.locator('.sidebar .navrow.sortable').filter({ hasText: 'Photo studio' }).first();
    await row.hover();
    await row.getByRole('button', { name: 'Project actions' }).click();
    await page.getByRole('menuitem', { name: 'Edit project' }).click();
    const edit = page.getByRole('dialog', { name: 'Edit project' });
    await expect(edit.getByRole('button', { name: 'Parent project' })).toContainText('Personal');
    await edit.getByRole('button', { name: 'Parent project' }).click();
    await page.getByRole('option', { name: /^None$/ }).click();
    await edit.getByRole('button', { name: 'Save' }).click();
    await expect(edit).toHaveCount(0);
    expect(await hashX('Photo studio')).toBe(await hashX('Personal'));
  });

  test('the open task sets its priority with four soft pills', async ({ demo: page }) => {
    await go(page, '#/week');
    await rows(page).first().locator('.ttitle').click();
    const group = page.locator('.overlay').getByRole('radiogroup', { name: 'Priority' });
    await expect(group.getByRole('radio')).toHaveCount(4);
    await group.getByRole('radio', { name: 'P1' }).click();
    await expect(group.getByRole('radio', { name: 'P1' })).toHaveAttribute('aria-checked', 'true');
    await expect(group.getByRole('radio', { name: 'P4' })).toHaveAttribute('aria-checked', 'false');
  });

  test('the composer can start a new project and come back with it chosen', async ({ demo: page }) => {
    await go(page, '#/week');
    await page.getByRole('button', { name: 'Add task', exact: true }).first().click();
    const composer = page.getByRole('dialog', { name: 'Add task' });
    await composer.getByRole('button', { name: 'Project' }).click();
    await page.getByRole('option', { name: 'New project…' }).click();
    const sheet = page.getByRole('dialog', { name: 'New project' });
    await sheet.getByRole('textbox', { name: 'Project name' }).fill('Garden shed');
    await sheet.getByRole('button', { name: 'Add project', exact: true }).click();
    await expect(sheet).toHaveCount(0);
    await expect(composer.getByRole('button', { name: 'Project' })).toContainText('Garden shed');
  });

  test('a project remembers the view it opens in', async ({ demo: page }) => {
    await go(page, '#/week');
    await page.getByRole('button', { name: 'Add project' }).first().click();
    const sheet = page.getByRole('dialog', { name: 'New project' });
    await sheet.getByRole('textbox', { name: 'Project name' }).fill('Board first');
    await sheet.getByRole('group', { name: 'Default view' }).getByRole('button', { name: 'Board' }).click();
    await sheet.getByRole('button', { name: 'Add project', exact: true }).click();
    await page.locator('.sidebar').getByText('Board first').first().click();
    await expect(page.locator('.board').first()).toBeVisible();
  });
});
