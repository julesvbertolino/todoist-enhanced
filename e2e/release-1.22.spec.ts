import { expect, go, test } from './demo';

const sectionBox = (page: import('@playwright/test').Page, name: string) =>
  page.locator('.screen.active .group').filter({ has: page.locator(`input.gname[value="${name}"]`) });

test('a section header shows its count after the title and offers a menu (#185)', async ({ demo: page }) => {
  await go(page, '#/project/site');
  const group = sectionBox(page, 'To do');
  await expect(group.locator('.gtoggle .gcount')).toHaveText(/^\d+ tasks?$/);
  // One menu button replaces the trash button.
  await expect(group.getByRole('button', { name: 'Delete section' })).toHaveCount(0);

  const more = group.getByRole('button', { name: 'Section actions' });
  await more.focus();
  await page.keyboard.press('Enter');
  const menu = page.getByRole('menu', { name: 'Section actions' });
  await expect(menu.getByRole('menuitem')).toHaveText(['Edit', 'Move to…', 'Duplicate', 'Archive', 'Delete section']);
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
  await expect(more).toBeFocused();
});

test('duplicate, archive and delete a section from its menu (#185)', async ({ demo: page }) => {
  await go(page, '#/project/site');
  const open = async (name: string, item: string) => {
    await sectionBox(page, name).getByRole('button', { name: 'Section actions' }).click();
    await page.getByRole('menuitem', { name: item }).click();
  };

  await open('To do', 'Duplicate');
  await expect(sectionBox(page, 'To do (copy)')).toHaveCount(1);

  await open('To do (copy)', 'Archive');
  await page.getByRole('dialog').getByRole('button', { name: 'Archive' }).click();
  await expect(sectionBox(page, 'To do (copy)')).toHaveCount(0);

  await open('In progress', 'Delete section');
  await page.getByRole('dialog').getByRole('button', { name: 'Delete section' }).click();
  await expect(sectionBox(page, 'In progress')).toHaveCount(0);
});

test('the fold arrow is left of the title and a folded section stays folded (#185)', async ({ demo: page }) => {
  await go(page, '#/project/site');
  const group = sectionBox(page, 'To do');
  const caret = group.getByRole('button', { name: 'Collapse the section' });
  const title = group.locator('input.gname');
  expect((await caret.boundingBox())!.x).toBeLessThan((await title.boundingBox())!.x);

  await caret.click();
  await expect(group.locator('.task')).toHaveCount(0);
  await page.reload();
  await expect(sectionBox(page, 'To do').locator('.task')).toHaveCount(0);
});

test('Add section puts the cursor in the name with the text selected (#186)', async ({ demo: page }) => {
  await go(page, '#/project/home');
  await page.locator('.screen.active').getByRole('button', { name: 'Add section' }).first().click();
  const field = page.locator('.screen.active').getByRole('textbox', { name: 'Section name' }).first();
  await expect(field).toBeFocused();
  await expect.poll(() => field.evaluate((el: HTMLInputElement) => [el.selectionStart, el.selectionEnd, el.value.length]))
    .toEqual([0, 'Untitled section'.length, 'Untitled section'.length]);
  await page.keyboard.type('Garage');
  await expect(field).toHaveValue('Garage');
});

test('closing a task opened with the mouse leaves no focus ring, the keyboard keeps it (#183)', async ({ demo: page }) => {
  await go(page, '#/project/site');
  const task = page.locator('.screen.active [data-task-id]').first();
  const id = await task.getAttribute('data-task-id');
  await task.locator('.ttitle').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  const back = page.locator(`.screen.active [data-task-id="${id}"]`);
  await expect(back).toBeFocused();
  await expect(back).toHaveAttribute('data-pointer-focus', '');
  // The first key brings the ring back.
  await page.keyboard.press('j');
  await expect(page.locator('[data-pointer-focus]')).toHaveCount(0);
});
