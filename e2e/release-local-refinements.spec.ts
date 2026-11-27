import { test, expect, go } from './demo';

test('renaming a section with spaces never collapses it; the header still toggles', async ({ demo: page }) => {
  await go(page, '#/project/site');
  const group = page.locator('.screen.active .group').filter({ has: page.locator('[data-section-name="s-todo"]') });
  const field = group.locator('[data-section-name="s-todo"]');
  const toggle = group.locator('.gcaret');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await field.click();
  await field.fill('A section with spaces');
  await field.press('Enter');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await field.click();
  await field.fill('Another name with spaces');
  await page.locator('.screen.active .ptitle').click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await group.locator('.ghead').click({ position: { x: 300, y: 4 } });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await group.locator('.gcaret').click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
});

test('composer asks before discarding and preserves the draft when cancelled', async ({ demo: page }) => {
  await page.keyboard.press('q');
  await page.locator('.composer-name').fill('Keep this draft');
  await page.locator('.composer-cancel').click();
  const confirmation = page.getByRole('dialog', { name: 'Discard this task?' });
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole('button', { name: 'Keep editing' }).click();
  await expect(page.locator('.composer-name')).toHaveValue('Keep this draft');
  await page.locator('.composer-cancel').click();
  await confirmation.getByRole('button', { name: 'Discard task' }).click();
  await expect(page.locator('.composerbox')).toHaveCount(0);
});

test('subtasks expose the task menu from the overflow button and right click', async ({ demo: page }) => {
  await go(page, '#/project/site');
  await page.locator('.screen.active [data-task-id]').filter({ hasText: 'Rebuild the home page' }).first().locator('.ttitle').click();
  const subtask = page.locator('.detail-section .subtaskrow').first();
  await expect(subtask).toBeVisible();
  await subtask.hover();
  await subtask.getByRole('button', { name: 'More actions' }).click();
  const menu = page.locator('.popover.rowmenu');
  await expect(menu).toBeVisible();
  const buttonLabels = await menu.locator('button').allTextContents();
  await page.keyboard.press('Escape');
  await subtask.click({ button: 'right' });
  await expect(menu).toBeVisible();
  expect(await menu.locator('button').allTextContents()).toEqual(buttonLabels);
});

test('project selection has search in composer and task details', async ({ demo: page }) => {
  await page.keyboard.press('q');
  const composer = page.getByRole('dialog', { name: 'Add task' });
  await composer.getByRole('button', { name: 'Project' }).click();
  await expect(page.locator('.pickersearch input')).toBeVisible();
  await page.locator('.pickersearch input').fill('Website');
  await expect(page.getByRole('option', { name: /Website/ }).first()).toBeVisible();
  await page.keyboard.press('Escape');
  await composer.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.locator('.screen.active [data-task-id] .ttitle').first().click();
  await page.locator('.detail-side [data-prop="project"] button').click();
  await expect(page.locator('.pickersearch input')).toBeVisible();
});

test('checkboxes stay aligned when editing an open subtask', async ({ demo: page }) => {
  await go(page, '#/project/site');
  await page.locator('.screen.active [data-task-id]').filter({ hasText: 'Rebuild the home page' }).first().locator('.ttitle').click();
  const headBox = (await page.locator('.detail-headline .check').boundingBox())!;
  expect(headBox.width).toBe(16);
  const subtask = page.locator('.detail-section .subtaskrow').first();
  await subtask.hover();
  await subtask.getByRole('button', { name: 'Edit subtask' }).click();
  const checkbox = (await subtask.locator('.check').boundingBox())!;
  const input = (await subtask.locator('.subtaskedit').boundingBox())!;
  expect(Math.abs(checkbox.y + checkbox.height / 2 - input.y - input.height / 2)).toBeLessThanOrEqual(2);
});

test('dashboard header follows its cards at wide viewport', async ({ demo: page }) => {
  await page.setViewportSize({ width: 1920, height: 1000 });
  await go(page, '#/insights');
  const header = (await page.locator('.dashboard-page > .phead').boundingBox())!;
  const cards = (await page.locator('.dashboard-bento').boundingBox())!;
  expect(Math.abs(header.x - cards.x)).toBeLessThan(2);
  expect(Math.abs(header.width - cards.width)).toBeLessThan(2);
});

test('the composer fieldset has no browser default padding', async ({ demo: page }) => {
  await page.keyboard.press('q');
  await expect(page.locator('.composer-fields')).toHaveCSS('padding-left', '0px');
  await expect(page.locator('.composer-fields')).toHaveCSS('border-left-width', '0px');
});

test('a context menu uses available viewport height', async ({ demo: page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await go(page, '#/project/site');
  await page.locator('.screen.active [data-task-id]').filter({ hasText: 'Rebuild the home page' }).first().locator('.ttitle').click();
  const subtask = page.locator('.detail-section .subtaskrow').first();
  await subtask.click({ button: 'right' });
  const menu = page.locator('.popover.rowmenu');
  await expect(menu).toBeVisible();
  const dims = await menu.evaluate(el => ({ height: el.clientHeight, content: el.scrollHeight }));
  expect(dims.content - dims.height).toBeLessThanOrEqual(2);
});

test('the local 2.39 changelog is available from What’s new', async ({ demo: page }) => {
  await page.evaluate(() => window.dispatchEvent(new Event('enhanced:changelog')));
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('2.39.0');
  await expect(dialog).toContainText('Task composer refinements');
});

test('dashboard date controls align with its content', async ({ demo: page }) => {
  await page.setViewportSize({ width: 1920, height: 1000 });
  await go(page, '#/insights');
  const controls = (await page.locator('.dashboard-page > .periodbar').boundingBox())!;
  const cards = (await page.locator('.dashboard-bento').boundingBox())!;
  expect(Math.abs(controls.x - cards.x)).toBeLessThan(2);
  expect(Math.abs(controls.width - cards.width)).toBeLessThan(2);
});

test('priority thumb follows all four buttons without drifting', async ({ demo: page }) => {
  await go(page, '#/project/site');
  await page.locator('.screen.active [data-task-id]').filter({ hasText: 'Rebuild the home page' }).first().locator('.ttitle').click();
  const group = page.locator('.detail-side .priopills');
  for (const value of [1, 2, 3, 4]) {
    await group.getByRole('radio', { name: `P${value}` }).click();
    await expect(group).toHaveAttribute('data-priority', String(value));
    await expect.poll(() => group.evaluate((el) => {
      const selected = el.querySelector<HTMLElement>('[aria-checked="true"]')!;
      const pseudo = getComputedStyle(el, '::before');
      const translate = new DOMMatrixReadOnly(pseudo.transform).m41;
      return Math.abs((parseFloat(pseudo.left) + translate) - selected.offsetLeft);
    })).toBeLessThan(1.5);
  }
});

test('section chevrons use the gutter, stay quiet on hover and delay their tooltip', async ({ demo: page }) => {
  await go(page, '#/project/site');
  for (const selector of ['.group.accent-quick', '.group:has([data-section-name="s-todo"])']) {
    const group = page.locator('.screen.active').locator(selector).first();
    const caret = group.locator('.gcaret');
    await expect(caret).toBeVisible();
    const c = (await caret.boundingBox())!;
    const box = (await group.locator('.task .check').first().boundingBox())!;
    expect(c.x + c.width).toBeLessThanOrEqual(box.x);
    await caret.hover();
    await expect(caret).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(page.locator('.icontip')).toHaveCount(0);
    await expect(page.locator('.icontip')).toBeVisible({ timeout: 2000 });
    await page.mouse.move(5, 5);
  }
});

test('editing a task dims the sidebar and content until saved', async ({ demo: page }) => {
  await go(page, '#/project/site');
  await page.locator('.screen.active [data-task-id]').filter({ hasText: 'Rebuild the home page' }).first().locator('.ttitle').click();
  await page.locator('.detail-headline .titlefield').click();
  await expect(page.locator('.detail-side')).toHaveCSS('opacity', '0.38');
  await expect(page.locator('.detail-section.boxed')).toHaveCSS('opacity', '0.38');
  await page.keyboard.press('Escape');
  await expect(page.locator('.detail-side')).toHaveCSS('opacity', '1');
});

test('subtasks use the selected light background in an open task', async ({ demo: page }) => {
  await go(page, '#/project/site');
  await page.locator('.screen.active [data-task-id]').filter({ hasText: 'Rebuild the home page' }).first().locator('.ttitle').click();
  const card = page.locator('.detail-main .detail-section.boxed');
  await expect(card).toHaveCSS('background-color', await page.locator('.detail-side').evaluate(el => getComputedStyle(el).backgroundColor));
  await expect(card.locator('.subtaskrow')).toHaveCount(3);
});

test('notification avatars do not show action badges', async ({ demo: page }) => {
  await page.evaluate(() => {
    const store = (window as unknown as { __store: { getState: () => { snapshot: Record<string, unknown> }; setState: (v: unknown) => void } }).__store;
    const snapshot = store.getState().snapshot;
    store.setState({ snapshot: { ...snapshot, notifications: {
      a: { id: 'a', is_unread: true, notification_type: 'item_assigned', from_name: 'Alex', item_content: 'A task' },
      b: { id: 'b', is_unread: false, notification_type: 'note_added', from_name: 'Marie', item_content: 'A note' },
    } } });
  });
  await page.locator('[data-tour="notifications"]').click();
  await expect(page.locator('.notiflist li')).toHaveCount(2);
  await expect(page.locator('.notiflist .notifbadge')).toHaveCount(0);
  await expect(page.locator('.notiflist li.unread .notifdot')).toBeVisible();
});

test('sidebar disclosure chevron points down when open and right when closed', async ({ demo: page }) => {
  const control = page.locator('.sidebar .side-disclose').first();
  const icon = control.locator('.disclosure-chevron');
  await expect(control).toHaveAttribute('aria-expanded', 'true');
  await expect(icon).toHaveCSS('transform', 'none');
  await control.click();
  await expect(control).toHaveAttribute('aria-expanded', 'false');
  await expect(icon).toHaveCSS('transform', 'matrix(0, -1, 1, 0, 0, 0)');
  await control.click();
  await expect(control).toHaveAttribute('aria-expanded', 'true');
});
