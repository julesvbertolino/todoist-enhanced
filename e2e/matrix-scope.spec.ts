import { test, expect, go } from './demo';
test.skip(process.env.PLAYWRIGHT_DEV !== '1', 'Uses development store fixture');
test('matrix date scope changes the visible tasks and sidebar count', async ({ demo: page }) => {
  await page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').map(e => e.name).find(s => /\/src\/store\/store\.ts(?:\?|$)/.test(s))!;
    const { useStore } = await import(url); const state = useStore.getState();
    const base = Object.values(state.snapshot.items)[0] as Record<string, unknown>;
    const now = new Date(); now.setDate(now.getDate() + 30);
    const date = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    useStore.setState({ snapshot: { ...state.snapshot, items: { ...state.snapshot.items, 'future-scope': { ...base, id: 'future-scope', content: 'Future scope test', checked: false, is_deleted: false, parent_id: null, labels: [], responsible_uid: null, due: { date, string: date, timezone: null, lang: 'en', is_recurring: false } } } } });
    useStore.getState().setPrefs({ eisenhowerEnabled: true, eisenhowerHorizon: 'today' });
  });
  await go(page, '#/matrix');
  await expect(page.locator('.screen.active [data-task-id="future-scope"]')).toHaveCount(0);
  await page.getByRole('button', { name: /^Display/ }).click();
  await page.getByRole('button', { name: 'Show until' }).click();
  await page.getByRole('option', { name: 'All future dates' }).click();
  await expect(page.locator('.screen.active [data-task-id="future-scope"]')).toBeVisible();
  const matrixCount = await page.locator('.screen.active [data-task-id]').count();
  await expect(page.locator('.sidebar').getByRole('button', { name: /Eisenhower Matrix/ }).locator('.count')).toHaveText(String(matrixCount));
  await expect(page.locator('.sidebar').getByRole('button', { name: 'Upcoming' }).locator('.count')).toHaveCount(0);
});
