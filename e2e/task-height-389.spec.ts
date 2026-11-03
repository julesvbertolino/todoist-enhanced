import { test, expect, go } from './demo';

test.skip(process.env.PLAYWRIGHT_DEV !== '1', 'Run npm run e2e:release for the controlled development fixtures');

test('title-only list rows are shorter, while table and phone rows remain usable', async ({ demo: page }) => {
  await page.evaluate(() => {
    const store = (window as unknown as { __store: { getState: () => any; setState: (value: any) => void } }).__store; // eslint-disable-line @typescript-eslint/no-explicit-any
    const state = store.getState(), sample = Object.values(state.snapshot.items)[0] as Record<string, unknown>;
    const task = { ...sample, id: 'short-389', content: 'Title only 389', parent_id: null, project_id: state.snapshot.user.inbox_project_id, checked: false, is_deleted: false, description: '', labels: [], due: null, deadline: null, duration: null };
    store.setState({ snapshot: { ...state.snapshot, items: { [task.id]: task } } });
  });
  await go(page, '#/inbox');
  const row = page.locator('.screen.active [data-task-id="short-389"]');
  await expect(row).toBeVisible();
  const listHeight = await row.evaluate((el) => el.getBoundingClientRect().height);
  expect(listHeight).toBeGreaterThanOrEqual(44);
  expect(listHeight).toBeLessThan(62);
  await row.hover();
  await expect(row.locator('.trow-actions')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await row.evaluate((el) => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  await page.evaluate(() => {
    const store = (window as unknown as { __store: { getState: () => any } }).__store; // eslint-disable-line @typescript-eslint/no-explicit-any
    const state = store.getState();
    state.setViewPrefs(`project:${state.snapshot.user.inbox_project_id}`, { mode: 'table', group: 'none' });
  });
  await expect(page.locator('.screen.active .task-table')).toBeVisible();
  expect(await row.evaluate((el) => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(58);
});
