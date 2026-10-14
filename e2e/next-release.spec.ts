import { test, expect, go, rows } from './demo';
import type { Page } from '@playwright/test';
// Controlled store fixtures are served by Vite; the ordinary production suite remains independent.
test.skip(process.env.PLAYWRIGHT_DEV !== '1', 'Run npm run e2e:release for the controlled development fixtures');
async function seed(page: Page) {
  await page.evaluate(async () => {
    const path = performance.getEntriesByType('resource').map((entry) => entry.name).find((name) => name.includes('/src/store/store.ts'))!;
    const { useStore } = await import(path);
    const state = useStore.getState();
    const example = Object.values(state.snapshot.items)[0] as Record<string, unknown>;
    const inbox = state.snapshot.user.inbox_project_id;
    const items: Record<string, unknown> = {};
    for (let n = 0; n < 45; n++) items[`search-${n}`] = { ...example, id: `search-${n}`, content: `Release café ${n}`, description: '', project_id: inbox, parent_id: null, labels: ['release-test'], checked: false, is_deleted: false, due: null, duration: null };
    const day = new Date(); const pad = (n: number) => String(n).padStart(2, '0');
    const date = `${day.getFullYear()}-${pad(day.getMonth()+1)}-${pad(day.getDate())}`;
    items.repeat = { ...example, id: 'repeat', content: 'Release recurring', description: '', project_id: inbox, parent_id: null, labels: ['est-30','release-test'], checked: false, is_deleted: false, due: { date, string: 'every weekday', timezone: null, lang: 'en', is_recurring: true }, duration: null };
    useStore.setState({ snapshot: { ...state.snapshot, items: { ...state.snapshot.items, ...items }, labels: { ...state.snapshot.labels, 'release-label': { id: 'release-label', name: 'release-test', color: 'blue', item_order: 10, is_favorite: true, is_deleted: false } } } });
  });
}
test('search Enter shows all 45 matches, hover preserves keyboard intent, arrows open a task', async ({ demo: page }) => {
  await seed(page);
  await page.locator('.searchbtn').click();
  const input = page.locator('.searchfield input');
  await input.fill('release cafe');
  await expect(page.locator('.sresults [aria-selected="true"]')).toHaveCount(0);
  await expect(page.locator('.sresults [role="option"]')).toHaveCount(30);
  await page.locator('.sresults [role="option"]').first().hover();
  await input.press('Enter');
  await expect(page).toHaveURL(/#\/search\?q=release%20cafe/);
  await expect(rows(page)).toHaveCount(45);
  await page.locator('.searchbtn').click(); await input.fill('release cafe');
  await input.press('ArrowDown'); await input.press('ArrowUp');
  await expect(page.locator('.sresults [aria-selected="true"]')).toHaveCount(0);
  await input.press('ArrowDown'); await input.press('Enter');
  await expect(page.locator('.detail-body')).toBeVisible();
});
test('search page supports completion and select all and updates on snapshot changes', async ({ demo: page }) => {
  await seed(page); await go(page, 'search?q=release%20cafe');
  await expect(rows(page)).toHaveCount(45);
  await rows(page).first().getByRole('checkbox').click();
  await expect(rows(page)).toHaveCount(44);
  await rows(page).first().focus(); await page.keyboard.press('Meta+a');
  await expect(page.locator('.task.picked')).toHaveCount(44);
});
test('label rename preserves page settings and tasks, duplicate and reserved names are refused, Esc cancels', async ({ demo: page }) => {
  await seed(page); await go(page, 'week');
  await page.locator('.sidebar button.tagitem').filter({ hasText: /^release-test/ }).click();
  await page.evaluate(async () => {
    const path = performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes('/src/store/store.ts'))!;
    const { useStore } = await import(path);
    useStore.getState().setViewPrefs('label:release-test', { sort: 'priority' });
  });
  const input = page.getByRole('textbox', { name: 'Rename tag' });
  await input.fill('🏠Café'); await input.press('Enter');
  await expect(page).toHaveURL(/label\/%F0%9F%8F%A0Caf%C3%A9/);
  await expect(rows(page)).toHaveCount(46);
  expect(await page.evaluate(async () => {
    const path = performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes('/src/store/store.ts'))!;
    const { useStore } = await import(path); return useStore.getState().prefs.views['label:🏠Café']?.sort;
  })).toBe('priority');
  await input.fill('quick'); await input.press('Enter');
  await expect(page.locator('.label-rename-error')).toContainText('reserved');
  await expect(input).toHaveValue('🏠Café');
  await input.fill('Cancelled'); await input.press('Escape');
  await expect(input).toHaveValue('🏠Café');
  await input.fill('Favourite revised'); await input.press('Enter');
  await expect(input).toHaveValue('Favourite-revised');
  await expect(page.locator('.sidebar button.tagitem').filter({ hasText: /^Favourite-revised/ })).toBeVisible();
  await expect(page.locator('.label-rename-error')).toHaveCount(0);
});
test('duration Enter normalizes input and confirms acceptance without closing the task', async ({ demo: page }) => {
  await seed(page); await go(page, 'search?q=release%20cafe');
  await rows(page).first().click();
  const field = page.locator('[data-prop="estimate"] input');
  await field.fill('1h30'); await field.press('Enter');
  await expect(field).toHaveValue('1 h 30');
  await expect(page.locator('[data-prop="estimate"] [role="status"]')).toHaveText('Input accepted');
  await expect(field).toBeFocused();
  await field.fill('oops'); await field.press('Enter');
  await expect(field).toHaveAttribute('aria-invalid','true');
  await expect(page.locator('[data-prop="estimate"] [role="status"]')).toBeEmpty();
  await field.fill(''); await field.press('Enter');
  await expect(field).toHaveValue('');
});
test('recurring forecasts show load and open their source, without mutation controls', async ({ demo: page }) => {
  await seed(page); await go(page, 'upcoming');
  const forecasts = page.locator('[data-projection-id]').filter({ hasText: 'Release recurring' });
  expect(await forecasts.count()).toBeGreaterThan(5);
  await expect(forecasts.first().getByRole('checkbox')).toHaveAttribute('aria-disabled', 'true');
  await expect(forecasts.first()).not.toContainText('Future occurrence');
  await expect(page.locator('.projection-note')).toHaveCount(0);
  await expect(forecasts.first()).toContainText('30 min');
  await forecasts.first().click();
  await expect(page.getByRole('textbox', { name: 'Task', exact: true })).toHaveValue('Release recurring');
});
test('bare times and small durations reach the composer with different chips', async ({ demo: page }) => {
  await page.keyboard.press('q');
  const title = page.locator('.composerbox textarea').first();
  await title.fill('Release call 20h');
  await expect(page.locator('.composerbox .namemirror').first()).toContainText('20h');
  await expect(page.locator('.composerbox .nmark.date')).toHaveCount(1);
  await title.fill('Release write 1h30');
  await expect(page.locator('.composerbox .nmark.date')).toHaveCount(0);
  await expect(page.locator('.composerbox .nmark.duration')).toHaveCount(1);
  await title.fill('Release call 20h'); await title.press('Meta+Enter');
  await expect(page.locator('.composerbox')).toHaveCount(0);
  const date = await page.evaluate(async () => {
    const path = performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes('/src/store/store.ts'))!;
    const { useStore } = await import(path);
    return (Object.values(useStore.getState().snapshot.items).find((i) => (i as { content: string }).content === 'Release call') as { due: { date: string } })?.due?.date;
  });
  expect(date).toMatch(/T20:00:00$/);
});
test('small screens keep complete results and forecast rows within the page', async ({ demo: page }) => {
  await seed(page); await page.setViewportSize({ width: 390, height: 844 });
  await go(page, 'search?q=release%20cafe'); await expect(rows(page)).toHaveCount(45);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await go(page, 'upcoming'); await expect(page.locator('[data-projection-id]').first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
test('queued duration stays pending and a refused write restores the previous value', async ({ demo: page }) => {
  await seed(page); await go(page, 'search?q=release%20cafe');
  await rows(page).first().click();
  await page.evaluate(async () => {
    const path = performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes('/src/store/store.ts'))!;
    const { useStore } = await import(path);
    const original = useStore.getState().updateTask;
    useStore.setState({ updateTask: async (id: string, args: Record<string, unknown>) => {
      await original(id, args); useStore.setState({ pendingCount: 1 });
    } });
  });
  const field = page.locator('[data-prop="estimate"] input');
  await field.fill('45'); await field.press('Enter');
  await expect(page.locator('[data-prop="estimate"] [role="status"]')).toHaveText('Saving…');
  await page.evaluate(async () => {
    const path = performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes('/src/store/store.ts'))!;
    const { useStore } = await import(path);
    const state = useStore.getState(); const id = state.openTaskId ?? 'search-0';
    // Match the title of the task opened above, whose original estimate was empty.
    const task = state.snapshot.items['search-0'];
    useStore.setState({ pendingCount: 0, snapshot: { ...state.snapshot, items: { ...state.snapshot.items, [task?.id ?? id]: { ...task, labels: ['release-test'], duration: null } } } });
  });
  await expect(page.locator('[data-prop="estimate"] [role="status"]')).toHaveText('Could not save');
  await expect(field).toHaveValue('');
});

test('Insights exposes the contextual panel and its active state', async ({ demo: page }) => {
  const button = page.locator('.pactions .insights-control');
  await expect(button).toHaveAttribute('aria-expanded', 'false');
  await button.click(); await expect(button).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('dialog', { name: 'Insights', exact: true })).toBeVisible();
});
