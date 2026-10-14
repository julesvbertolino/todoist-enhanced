import { test, expect, rows } from './demo';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
const captureDir = process.env.ARTIFACT_OUTPUT_DIR ?? 'test-results/composer-captures';
async function capture(page: import('@playwright/test').Page, name: string) {
  if (!process.env.CAPTURE_COMPOSER) return;
  await mkdir(captureDir, { recursive: true });
  await page.screenshot({ path: resolve(captureDir, name), animations: 'disabled' });
}
test.skip(process.env.PLAYWRIGHT_DEV !== '1', 'Development fixtures');
async function inboxCannotAssign(page: import('@playwright/test').Page) {
  await page.evaluate(async () => {
    const path = performance.getEntriesByType('resource').map((entry) => entry.name).find((url) => /\/src\/store\/store\.ts(?:\?|$)/.test(url))!;
    const { useStore } = await import(path); const state = useStore.getState();
    const inbox = state.snapshot.user.inbox_project_id;
    useStore.setState({ snapshot: { ...state.snapshot, projects: { ...state.snapshot.projects, [inbox]: { ...state.snapshot.projects[inbox], can_assign_tasks: false } } } });
  });
}
for (const quick of [false, true]) {
  test(`${quick ? 'Quick Add' : 'Q'} hides assignment in Inbox and bounds the project picker`, async ({ demo: page }) => {
    if (quick) { await page.goto('/?quickadd'); await expect(page.locator('.composerbox')).toBeVisible(); }
    await inboxCannotAssign(page);
    if (!quick) await page.keyboard.press('q');
    const composer = page.locator('.composerbox');
    await expect(composer.getByText('Nobody', { exact: true })).toHaveCount(0);
    await capture(page, `composeur-${quick ? 'quick-add' : 'q'}.png`);
    await expect(composer.getByRole('button', { name: 'Assigned to', exact: true })).toHaveCount(0);
    await page.evaluate(async () => {
      const path = performance.getEntriesByType('resource').map((entry) => entry.name).find((url) => /\/src\/store\/store\.ts(?:\?|$)/.test(url))!;
      const { useStore } = await import(path); const state = useStore.getState();
      useStore.setState({ snapshot: { ...state.snapshot, projects: { ...state.snapshot.projects, home: { ...state.snapshot.projects.home, name: 'A very long project name '.repeat(15) } } } });
    });
    await composer.getByRole('button', { name: 'Project', exact: true }).click();
    const popup = page.locator('.listbox').filter({ has: page.getByRole('listbox', { name: 'Project', exact: true }) });
    await expect(popup).toBeVisible();
    const box = await popup.boundingBox(); expect(box!.width).toBeLessThanOrEqual(280);
    const modal = await composer.boundingBox(); expect(modal!.width).toBeLessThanOrEqual(650);
    await popup.getByRole('option', { name: /Website$/ }).click();
    const project = composer.getByRole('button', { name: 'Project', exact: true });
    const assignee = composer.getByRole('button', { name: 'Assigned to', exact: true });
    await expect(assignee).toBeVisible();
    expect(await project.evaluate((el) => el.parentElement!.nextElementSibling?.querySelector('button')?.getAttribute('aria-label'))).toBe('Assigned to');
    await capture(page, `composeur-assignee-${quick ? 'quick-add' : 'q'}.png`);
  });
}
test('tag results respond to arrows and Enter while the search field keeps focus', async ({ demo: page }) => {
  await page.keyboard.press('q');
  const composer = page.locator('.composerbox');
  await composer.getByRole('button', { name: 'Tag', exact: true }).click();
  const picker = composer.locator('.tagpicker'); const search = picker.getByRole('textbox', { name: 'Search' });
  await search.press('ArrowDown'); await search.press('ArrowDown');
  const active = picker.locator('.checkrow.active'); const label = await active.locator('span').innerText();
  const initiallyChecked = await active.getByRole('checkbox').isChecked();
  await search.press('Enter'); await expect(active.getByRole('checkbox')).toHaveJSProperty('checked', !initiallyChecked);
  await search.press('Enter'); await expect(active.getByRole('checkbox')).toHaveJSProperty('checked', initiallyChecked);
  await search.fill(label); await search.press('ArrowDown'); await search.press('Enter');
  await expect(picker.getByRole('checkbox')).toHaveJSProperty('checked', !initiallyChecked);
  await search.press('Escape'); await expect(picker).toHaveCount(0); await expect(composer).toBeVisible();
});
test('written durations work in parentheses and with for/pendant, without a due date', async ({ demo: page }) => {
  await page.keyboard.press('q'); const composer = page.locator('.composerbox');
  const title = composer.locator('textarea').first();
  for (const phrase of ['Écrire (deux heures)', 'Write (one hour thirty minutes)', 'Write for one hour', 'Écrire pendant une heure']) {
    await title.fill(phrase); await expect(composer.locator('.nmark.duration')).toBeVisible();
    await expect(composer.locator('.nmark.date')).toHaveCount(0);
  }
  await title.fill('Écrire (deux heures)'); await title.press('Meta+Enter'); await expect(composer).toHaveCount(0);
  await expect(rows(page).filter({ hasText: 'Écrire' }).first()).toContainText('2 h');
});

test('a project draft survives a snapshot refresh while the composer is open', async ({ demo: page }) => {
  await page.keyboard.press('q');
  const composer = page.getByRole('dialog', { name: 'Add task' });
  await composer.getByRole('button', { name: 'Project', exact: true }).click();
  await page.getByRole('option', { name: 'New project…' }).click();
  const sheet = page.getByRole('dialog', { name: 'New project' });
  const name = sheet.getByRole('textbox', { name: 'Project name' });
  await name.fill('Garden shed');
  await inboxCannotAssign(page); // A real sync also replaces the snapshot reference.
  await expect(name).toHaveValue('Garden shed');
  await sheet.getByRole('button', { name: 'Add project', exact: true }).click();
  await expect(sheet).toHaveCount(0);
  await expect(composer.getByRole('button', { name: 'Project', exact: true })).toContainText('Garden shed');
});
