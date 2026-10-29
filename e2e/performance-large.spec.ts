import { expect, go, test } from './demo';

test('a large project stays usable when opening and editing tasks', async ({ demo: page }) => {
  test.skip(process.env.PLAYWRIGHT_DEV !== '1', 'Large fixture uses the development store');
  await page.evaluate(() => {
    const store = (window as unknown as { __store: { getState(): { snapshot: { items: Record<string, Record<string, unknown>> } }; setState(patch: unknown): void } }).__store;
    const snapshot = store.getState().snapshot;
    const base = Object.values(snapshot.items).find((task) => task.project_id === 'home' && !task.parent_id)!;
    const items = { ...snapshot.items };
    for (let index = 0; index < 1000; index++) {
      const id = `performance-${index}`;
      items[id] = { ...base, id, content: `Performance task ${index}`, parent_id: null, checked: false };
    }
    store.setState({ snapshot: { ...snapshot, items } });
  });
  await go(page, '#/project/home');
  await expect(page.locator('.screen.active [data-task-id="performance-999"]')).toHaveCount(1);
  await page.keyboard.press('q');
  await expect(page.locator('.composerbox')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.locator('.screen.active').evaluate((screen) => { screen.scrollTop = screen.scrollHeight; });
  await expect(page.locator('.screen.active [data-task-id="performance-999"]')).toBeAttached();
});
