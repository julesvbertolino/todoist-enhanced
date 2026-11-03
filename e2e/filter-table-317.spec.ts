import { test, expect, go } from './demo';

test('table keeps the separate comma filter groups and their own matching children', async ({ demo: page }) => {
  await page.evaluate(() => {
    const store = (window as unknown as { __store: { getState: () => any; setState: (value: any) => void } }).__store; // eslint-disable-line @typescript-eslint/no-explicit-any
    const state = store.getState(), sample = Object.values(state.snapshot.items)[0] as Record<string, unknown>;
    const today = new Date(), yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
    const date = (day: Date) => `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    const due = (day: Date) => ({ date: date(day), lang: 'en', timezone: null, string: date(day), is_recurring: false });
    const parent = { ...sample, id: 'filter-parent', content: 'Overdue parent only', parent_id: null, checked: false, is_deleted: false, due: due(yesterday), labels: [] };
    const child = { ...parent, id: 'filter-child', content: 'Today child only', parent_id: parent.id, due: due(today) };
    store.setState({ snapshot: { ...state.snapshot, items: { [parent.id]: parent, [child.id]: child } }, prefs: { ...state.prefs, views: {} } });
    store.getState().setViewPrefs('filter:f3', { mode: 'table', group: 'none' });
  });
  await go(page, '#/filter/f3');
  const groups = page.locator('.screen.active .task-table .group');
  await expect(groups).toHaveCount(2);
  await expect(groups.nth(0)).toContainText('overdue');
  await expect(groups.nth(0).locator('.ttitle')).toHaveText(['Overdue parent only']);
  await expect(groups.nth(1)).toContainText('today');
  await expect(groups.nth(1).locator('.ttitle')).toHaveText(['Today child only']);
  await page.evaluate(() => {
    const store = (window as unknown as { __store: { getState: () => any } }).__store; // eslint-disable-line @typescript-eslint/no-explicit-any
    store.getState().setViewPrefs('filter:f3', { mode: 'board', group: 'none' });
  });
  const columns = page.locator('.screen.active .board .col');
  await expect(columns).toHaveCount(2);
  await expect(columns.nth(0)).toContainText('overdue');
  await expect(columns.nth(0).locator('.ttitle')).toHaveText(['Overdue parent only']);
  await expect(columns.nth(1)).toContainText('today');
  await expect(columns.nth(1).locator('.ttitle')).toHaveText(['Today child only']);
  await expect(columns.locator('.coladd')).toHaveCount(0);
  await page.evaluate(() => {
    const store = (window as unknown as { __store: { getState: () => any } }).__store; // eslint-disable-line @typescript-eslint/no-explicit-any
    store.getState().setViewPrefs('filter:f3', { mode: 'table', group: 'none' });
  });
  await page.evaluate(() => {
    const store = (window as unknown as { __store: { getState: () => any; setState: (value: any) => void } }).__store; // eslint-disable-line @typescript-eslint/no-explicit-any
    const state = store.getState();
    store.setState({ snapshot: { ...state.snapshot, items: { ...state.snapshot.items, 'filter-child': { ...state.snapshot.items['filter-child'], checked: true } } } });
  });
  await expect(groups).toHaveCount(2);
  await expect(groups.nth(1).locator('.ttitle')).toHaveCount(0);
});
