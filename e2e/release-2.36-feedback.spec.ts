import { test, expect, go } from './demo';

test('an empty project keeps section creation and exposes it in the project menu', async ({ demo: page }) => {
  test.skip(process.env.PLAYWRIGHT_DEV !== '1', 'Uses a controlled project fixture');
  await page.evaluate(() => {
    const store = (window as unknown as { __store: { getState: () => any; setState: (value: any) => void } }).__store; // eslint-disable-line @typescript-eslint/no-explicit-any
    const state = store.getState();
    store.setState({ snapshot: { ...state.snapshot, items: {}, sections: {} }, prefs: { ...state.prefs, views: {} }, hireNote: false });
  });
  await go(page, '#/project/home');
  const active = page.locator('.screen.active');
  await expect(active.locator('.project-empty')).toHaveCount(0);
  await expect(active.getByRole('button', { name: 'Add section', exact: true })).toBeAttached();
  await active.getByRole('button', { name: 'Project actions' }).click();
  await page.getByRole('menu', { name: 'Project actions' }).getByRole('menuitem', { name: 'Add section' }).click();
  await expect(page.getByRole('dialog', { name: 'Add section' })).toHaveCount(0);
  const field = active.getByRole('textbox', { name: 'Section name' }).last();
  await expect(field).toBeFocused();
  await field.fill('Ideas');
  await field.press('Enter');
  await expect(field).toHaveValue('Ideas');
});

test('the current changelog contains this release independently of 2.35', async ({ demo: page }) => {
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('enhanced:changelog', { detail: { versions: ['2.36.0'] } })));
  const dialog = page.getByRole('dialog', { name: 'What’s new since your last visit' });
  await expect(dialog).toContainText('Uncompletable tasks are easier to use');
  await expect(dialog).toContainText('Upcoming view refinements');
  await expect(dialog.locator('[data-changelog-preview="uncompletableMenu"] img')).toBeVisible();
  await expect(dialog).not.toContainText('Choose your own tag for');
});

test('a project sidebar menu opens inline section creation in that project', async ({ demo: page }) => {
  const project = page.locator('.sidebar').getByRole('button', { name: 'Project actions' }).first();
  await project.locator('../..').locator('.navitem').hover();
  await project.click();
  await page.getByRole('menu', { name: 'Project actions' }).getByRole('menuitem', { name: 'Add section' }).click();
  await expect(page).toHaveURL(/#\/project\//);
  const field = page.locator('.screen.active').getByRole('textbox', { name: 'Section name' }).last();
  await expect(field).toBeFocused();
  await field.fill('Planning');
  await field.press('Enter');
  await expect(field).toHaveValue('Planning');
});
