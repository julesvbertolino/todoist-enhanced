import { test, expect, go } from './demo';

test('today and upcoming include open tasks on their deadline day', async ({ demo: page }) => {
  await page.evaluate(() => {
    const store = (window as unknown as { __store: { getState: () => any; setState: (value: any) => void } }).__store; // eslint-disable-line @typescript-eslint/no-explicit-any
    const state = store.getState(), sample = Object.values(state.snapshot.items)[0] as Record<string, unknown>;
    const now = new Date(), tomorrow = new Date(); tomorrow.setDate(now.getDate() + 1);
    const format = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const due = (d: Date) => ({ date: format(d), lang: 'en', timezone: null, string: format(d), is_recurring: false });
    const base = { ...sample, parent_id: null, checked: false, is_deleted: false, description: '', labels: [] };
    const a = { ...base, id: 'deadline-today', content: 'Deadline today 438', due: null, deadline: { date: format(now), lang: 'en' } };
    const b = { ...base, id: 'deadline-tomorrow', content: 'Start today deadline tomorrow 438', due: due(now), deadline: { date: format(tomorrow), lang: 'en' } };
    const c = { ...base, id: 'deadline-duplicate', content: 'Both tomorrow 438', due: due(tomorrow), deadline: { date: format(tomorrow), lang: 'en' } };
    store.setState({ snapshot: { ...state.snapshot, items: { [a.id]: a, [b.id]: b, [c.id]: c } } });
  });
  await go(page, '#/today');
  await expect(page.locator('.screen.active [data-task-id="deadline-today"]')).toBeVisible();
  await expect(page.locator('.screen.active [data-task-id="deadline-tomorrow"]')).toBeVisible();
  await go(page, '#/upcoming');
  await expect(page.locator('.screen.active [data-task-id="deadline-tomorrow"]')).toBeVisible();
  await expect(page.locator('.screen.active [data-task-id="deadline-duplicate"]')).toHaveCount(1);
});
