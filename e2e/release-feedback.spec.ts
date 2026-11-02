import { test, expect, go } from './demo';
import type { Page } from '@playwright/test';
const active = (page: Page) => page.locator('.screen.active');
async function pasteImage(page: Page) {
  await page.getByRole('textbox', { name: 'Task name', exact: true }).evaluate((node) => {
    const clipboard = new DataTransfer();
    clipboard.items.add(new File([new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,1,0,0,0,1,8,6,0,0,0,31,21,196,137,0,0,0,11,73,68,65,84,120,156,99,0,1,0,0,5,0,1,13,10,45,180,0,0,0,0,73,69,78,68,174,66,96,130])], 'clipboard.png', { type: 'image/png' }));
    node.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: clipboard }));
  });
}
test.skip(process.env.PLAYWRIGHT_DEV !== '1', 'Composer attachment state and Quick Add use controlled development fixtures');
for (const quick of [false, true]) test(`pasted images are visible, removable and saved as comments in ${quick ? 'Electron Quick Add' : 'Q composer'}`, async ({ demo: page }) => {
  if (quick) await page.goto('/?quickadd');
  else await page.keyboard.press('q');
  const dialog = page.getByRole('dialog', { name: 'Add task', exact: true });
  await expect(dialog).toBeVisible();
  await pasteImage(page);
  await expect(dialog.locator('.composer-attachment')).toHaveCount(1);
  await expect(dialog.getByRole('button', { name: 'Add task', exact: true })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Remove clipboard.png' }).click();
  await expect(dialog.locator('.composer-attachment')).toHaveCount(0);
  await pasteImage(page);
  await dialog.getByRole('textbox', { name: 'Task name', exact: true }).fill('Clipboard image acceptance');
  await dialog.getByRole('button', { name: 'Add task', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  if (quick) {
    const result = await page.evaluate(() => {
      const state = (window as unknown as { __store: { getState: () => { snapshot: { items: Record<string, { id: string; content: string }>; notes: Record<string, { item_id: string; file_attachment?: { file_name: string } }> } } } }).__store.getState();
      const tasks = Object.values(state.snapshot.items).filter((task) => task.content === 'Clipboard image acceptance');
      return { tasks: tasks.length, images: Object.values(state.snapshot.notes).filter((note) => note.item_id === tasks[0]?.id).map((note) => note.file_attachment?.file_name) };
    });
    expect(result).toEqual({ tasks: 1, images: ['clipboard.png'] });
    return;
  }
  await go(page, '#/inbox');
  await active(page).locator('.ttitle').filter({ hasText: 'Clipboard image acceptance' }).click();
  await expect(page.locator('article.comment')).toHaveCount(1);
  await expect(page.locator('article.comment img').last()).toBeVisible();
});

test('Table mode choices stack their icons, priorities have flags and row colour persists', async ({ demo: page }) => {
  await go(page, '#/project/site');
  const display = active(page).getByRole('button', { name: /^Display(?: \d+)?$/ });
  await display.click();
  const menu = page.getByRole('dialog', { name: 'Display', exact: true });
  await expect(menu.locator('.display-modes button')).toHaveCount(4);
  expect(await menu.locator('.display-modes button').first().evaluate((node) => getComputedStyle(node).flexDirection)).toBe('column');
  await menu.getByRole('button', { name: 'Table', exact: true }).click();
  await expect(menu.getByRole('button', { name: 'Reverse sort' })).toHaveCount(0);
  await display.click();
  const table = active(page).locator('.task-table');
  await expect(table.locator('.table-priority-mark').first()).toBeVisible();
  await expect(table.locator('[data-table-colored]')).toHaveCount(0);
  await display.click();
  await menu.getByRole('button', { name: 'Colour each row', exact: true }).click();
  await page.getByRole('option', { name: 'Priority colours', exact: true }).click();
  await display.click();
  await expect(table.locator('[data-table-colored]').first()).toBeVisible();
  const rootX = await table.locator('.task:not([data-depth]) > .check').first().evaluate((node) => node.getBoundingClientRect().left);
  const childX = await table.locator('.task[data-depth] > .check').first().evaluate((node) => node.getBoundingClientRect().left);
  expect(childX).toBeGreaterThan(rootX + 15);
  await page.reload();
  await expect(table.locator('[data-table-colored]').first()).toBeVisible();
});

test('comma filter lists keep a matching child separate from a parent in another list', async ({ demo: page }) => {
  await page.evaluate(() => {
    const store = (window as unknown as { __store: { getState: () => any; setState: (value: any) => void } }).__store; // eslint-disable-line @typescript-eslint/no-explicit-any
    const state = store.getState(), sample = Object.values(state.snapshot.items)[0] as Record<string, unknown>;
    const today = new Date(), yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
    const date = (day: Date) => `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    const due = (day: Date) => ({ date: date(day), lang: 'en', timezone: null, string: date(day), is_recurring: false });
    const parent = { ...sample, id: 'filter-parent', content: 'Overdue parent only', parent_id: null, checked: false, is_deleted: false, due: due(yesterday), labels: [] };
    const child = { ...parent, id: 'filter-child', content: 'Today child only', parent_id: parent.id, due: due(today) };
    store.setState({ snapshot: { ...state.snapshot, items: { [parent.id]: parent, [child.id]: child } }, prefs: { ...state.prefs, views: {} } });
  });
  await go(page, '#/filter/f3');
  const groups = active(page).locator('.group');
  await expect(groups).toHaveCount(2);
  await expect(groups.nth(0).locator('.ttitle')).toHaveText(['Overdue parent only']);
  await expect(groups.nth(1).locator('.ttitle')).toHaveText(['Today child only']);
  // Keep the query's second list even after its only matching task disappears.
  await page.evaluate(() => {
    const store = (window as unknown as { __store: { getState: () => any; setState: (value: any) => void } }).__store; // eslint-disable-line @typescript-eslint/no-explicit-any
    const state = store.getState();
    store.setState({ snapshot: { ...state.snapshot, items: { ...state.snapshot.items, 'filter-child': { ...state.snapshot.items['filter-child'], checked: true } } } });
  });
  await expect(groups).toHaveCount(2);
  await expect(groups.nth(1).locator('.ttitle')).toHaveCount(0);
  await expect(groups.nth(1)).toContainText('Today');
});

test('a refused attachment retries its comment without creating another task', async ({ demo: page }) => {
  await page.evaluate(() => {
    const store = (window as unknown as { __store: { getState: () => any; setState: (value: any) => void } }).__store; // eslint-disable-line @typescript-eslint/no-explicit-any
    const original = store.getState().addComment;
    let first = true;
    store.setState({ addComment: async (...args: unknown[]) => { if (first) { first = false; return false; } return original(...args); } });
  });
  await page.keyboard.press('q');
  const dialog = page.getByRole('dialog', { name: 'Add task', exact: true });
  await dialog.getByRole('textbox', { name: 'Task name', exact: true }).fill('Retry attachment safely');
  await pasteImage(page);
  await dialog.getByRole('button', { name: 'Add task', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Retry attachments', exact: true })).toBeVisible();
  await expect(dialog.getByRole('textbox', { name: 'Task name', exact: true })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Retry attachments', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  const result = await page.evaluate(() => {
    const state = (window as unknown as { __store: { getState: () => any } }).__store.getState(); // eslint-disable-line @typescript-eslint/no-explicit-any
    const tasks = Object.values(state.snapshot.items).filter((item: any) => item.content === 'Retry attachment safely') as Array<{ id: string }>; // eslint-disable-line @typescript-eslint/no-explicit-any
    return { tasks: tasks.length, notes: Object.values(state.snapshot.notes).filter((note: any) => note.item_id === tasks[0].id).length }; // eslint-disable-line @typescript-eslint/no-explicit-any
  });
  expect(result).toEqual({ tasks: 1, notes: 1 });
});


test('resize edge stays transparent, view choices are rounded rectangles and drag handle has room', async ({ demo: page }) => {
  const edge = page.getByRole('separator', { name: 'Resize sidebar' });
  await edge.hover();
  await expect(edge).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(edge).toHaveCSS('cursor', 'col-resize');
  const display = active(page).getByRole('button', { name: /^Display(?: \d+)?$/ });
  await display.click();
  const menu = page.getByRole('dialog', { name: 'Display', exact: true });
  await expect(menu.locator('.display-modes')).toHaveCSS('border-radius', '12px');
  await expect(menu.locator('.display-modes button').first()).toHaveCSS('border-radius', '8px');
  expect(await menu.locator('.display-modes').evaluate((node) => getComputedStyle(node, '::before').borderRadius)).toBe('8px');
  await menu.getByRole('button', { name: 'Table', exact: true }).click();
  await display.click();
  const row = active(page).locator('.task-table .task').first();
  await row.hover();
  const drag = (await row.locator('.drag').boundingBox())!;
  const check = (await row.locator(':scope > .check').boundingBox())!;
  expect(check.x - (drag.x + drag.width)).toBeGreaterThanOrEqual(8);
});

test('filter date grouping combines old dates and deadline-only tasks into Overdue', async ({ demo: page }) => {
  await page.evaluate(() => {
    const store = (window as unknown as { __store: { getState: () => any; setState: (value: any) => void } }).__store; // eslint-disable-line @typescript-eslint/no-explicit-any
    const state = store.getState(), sample = Object.values(state.snapshot.items)[0] as Record<string, unknown>;
    const base = { ...sample, parent_id: null, checked: false, is_deleted: false, priority: 4, labels: [], due: null, deadline: null };
    const due = (date: string) => ({ date, lang: 'en', timezone: null, string: date, is_recurring: false });
    const tasks = [
      { ...base, id: 'past-one', content: 'First past day', due: due('2020-01-01') },
      { ...base, id: 'past-two', content: 'Second past day', due: due('2020-02-01') },
      { ...base, id: 'past-deadline', content: 'Deadline without planned date', deadline: { date: '2020-03-01', lang: 'en' } },
      { ...base, id: 'no-date', content: 'No date' },
    ];
    store.setState({ snapshot: { ...state.snapshot, items: Object.fromEntries(tasks.map((task) => [task.id, task])) } });
    store.getState().setViewPrefs('filter:f2', { mode: 'list', group: 'day' });
  });
  await go(page, '#/filter/f2');
  const groups = active(page).locator('.group');
  await expect(groups).toHaveCount(2);
  await expect(groups.first()).toContainText('Overdue');
  await expect(groups.first().locator('.ttitle')).toHaveCount(3);
  await expect(groups.last().locator('.ttitle')).toHaveText(['No date']);
});


test('2.11 features and the composer image entry have deliberate changelog illustrations', async ({ demo: page }) => {
  await page.evaluate(() => window.dispatchEvent(new Event('enhanced:changelog')));
  const release = page.locator('#whatsnew-2-11-0');
  await expect(release).toBeVisible();
  await expect(release.locator('.whatsnew-change.new')).toHaveCount(3);
  await expect(release.locator('[data-changelog-preview="table"]')).toBeVisible();
  await expect(release.locator('[data-changelog-preview="sidebarResize"]')).toBeVisible();
  await expect(release.locator('.whatsnew-change.new [data-changelog-preview="composerImage"]')).toBeVisible();
  await expect(release.locator('.whatsnew-change.design [data-changelog-preview="viewChoices"]')).toBeVisible();
  await expect(release.locator('.whatsnew-change.design .changelog-preview')).toHaveCount(1);
  await expect(release.locator('.whatsnew-change.fix .changelog-preview')).toHaveCount(0);
  await release.locator('[data-changelog-preview="composerImage"]').screenshot({ path: '../../outputs/changelog-composeur-image.png' });
  await release.locator('.whatsnew-change.new').first().screenshot({ path: '../../outputs/changelog-table.png' });
  await release.locator('.whatsnew-change.new').nth(1).screenshot({ path: '../../outputs/changelog-barre-laterale.png' });
});
