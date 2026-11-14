import { test, expect } from './demo';

test('project icons retain their colour and custom icon without progress scans', async ({ demo: page }) => {
  const personal = page.locator('.sidebar .navitem').filter({ has: page.locator('.label', { hasText: 'Personal' }) }).first();
  const custom = page.locator('.sidebar .navitem').filter({ has: page.locator('.label', { hasText: 'Website' }) }).first();
  await expect(personal.locator('[data-project-progress]')).toHaveCount(0);
  await expect(custom.locator('[data-project-progress]')).toHaveCount(0);
  await expect(personal.locator('.hash')).toHaveText('#');
  await expect(custom.locator('.hash svg')).toBeVisible();
});

test('opening many old projects does not request history for the sidebar', async ({ demo: page }) => {
  test.skip(process.env.PLAYWRIGHT_DEV !== '1', 'Uses development store fixture');
  let historyReads = 0;
  await page.route('https://api.todoist.com/api/v1/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/tasks/completed')) historyReads++;
    await route.fulfill({ json: url.includes('/sync') ? { sync_token: 'test', full_sync: false } : { results: [], items: [], next_cursor: null } });
  });
  await page.evaluate(async () => {
    const storeUrl = performance.getEntriesByType('resource').map((e) => e.name).find((s) => /\/src\/store\/store\.ts(?:\?|$)/.test(s))!;
    const authUrl = performance.getEntriesByType('resource').map((e) => e.name).find((s) => /\/src\/api\/auth\.ts(?:\?|$)/.test(s))!;
    const { useStore } = await import(storeUrl);
    const { auth } = await import(authUrl);
    await auth.set('test-token');
    const state = useStore.getState();
    const template = Object.values(state.snapshot.projects).find((p: any) => !p.is_folder && !p.inbox_project) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    const projects = Object.fromEntries(Array.from({ length: 25 }, (_, i) => [`old-${i}`, { ...template, id: `old-${i}`, name: `Old ${i}`, description: i % 2 ? '<!-- icon:home -->' : '', created_at: '2016-01-01T00:00:00Z', parent_id: null, is_folder: false }]));
    useStore.setState({ demo: false, connected: true, syncState: 'error', snapshot: { ...state.snapshot, user: { ...state.snapshot.user, id: 'fixture' }, projects, items: {}, sections: {} } });
  });
  await expect(page.locator('.sidebar .navitem').filter({ hasText: 'Old 0' }).first()).toBeVisible();
  await page.waitForTimeout(1000);
  expect(historyReads).toBe(0);
});
