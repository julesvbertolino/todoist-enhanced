import { test, expect } from './demo';

test.skip(process.env.PLAYWRIGHT_DEV !== '1', 'Controlled development fixtures');
test('the composer highlights and saves only dates in its selected language', async ({ demo: page }) => {
  await page.evaluate(() => {
    const store = (window as unknown as { __store: { getState: () => { setPrefs: (patch: { locale: string }) => void } } }).__store;
    store.getState().setPrefs({ locale: 'fr' });
  });
  await page.keyboard.press('q');
  const title = page.locator('.composerbox textarea').first();
  await title.fill('Appeler mon client');
  await expect(page.locator('.composerbox .nmark.date')).toHaveCount(0);
  await title.fill('Appeler mon client demain');
  await expect(page.locator('.composerbox .nmark.date')).toHaveText('demain');
  await title.press('Meta+Enter');
  await expect(page.locator('.composerbox')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => {
    const store = (window as unknown as { __store: { getState: () => { snapshot: { items: Record<string, { content: string; due?: { date: string } }> } } } }).__store;
    return Object.values(store.getState().snapshot.items).find((item) => item.content === 'Appeler mon client')?.due?.date;
  })).toBeTruthy();
});

test('an English month offset keeps its highlight and creates the clamped due date', async ({ demo: page }) => {
  await page.clock.install({ time: new Date(2028, 0, 31, 12) });
  await page.keyboard.press('q');
  const title = page.locator('.composerbox textarea').first();
  await title.fill('Prepare release next month');
  await expect(page.locator('.composerbox .nmark.date')).toHaveText('next month');
  await title.press('Meta+Enter');
  await expect(page.locator('.composerbox')).toHaveCount(0);
  const date = await page.evaluate(() => {
    const store = (window as unknown as { __store: { getState: () => { snapshot: { items: Record<string, { content: string; due?: { date: string } }> } } } }).__store;
    return Object.values(store.getState().snapshot.items).find((item) => item.content === 'Prepare release')?.due?.date;
  });
  expect(date).toBe('2028-02-29');
});
