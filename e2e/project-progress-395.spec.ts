import { test, expect } from './demo';
test('project ring shows open share and leaves custom icons alone', async ({ demo: page }) => {
  const personal = page.locator('.sidebar .navitem').filter({ has: page.locator('.label', { hasText: 'Personal' }) }).first();
  const ring = personal.locator('[data-project-progress]');
  await expect(ring).toBeVisible();
  const value = await ring.getAttribute('data-project-progress');
  expect(value).toMatch(/^\d+\/\d+$/);
  const [open, total] = value!.split('/').map(Number);
  expect(open).toBeLessThanOrEqual(total);
  const custom = page.locator('.sidebar .navitem').filter({ has: page.locator('.label', { hasText: 'Website' }) }).first();
  await expect(custom.locator('[data-project-progress]')).toHaveCount(0);
});

test('checking and undoing tasks updates the project ring immediately', async ({ demo: page }) => {
  test.skip(process.env.PLAYWRIGHT_DEV !== '1', 'Uses development store fixture');
  await page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').map(e => e.name).find(s => /\/src\/store\/store\.ts(?:\?|$)/.test(s))!;
    const { useStore } = await import(url); const state = useStore.getState();
    const project = (Object.values(state.snapshot.projects) as Array<Record<string, unknown>>).find(p => !p.is_folder && !p.inbox_project)!;
    const base = (Object.values(state.snapshot.items) as Array<Record<string, unknown>>).find(i => !i.is_deleted)!;
    const items = { ...state.snapshot.items };
    for (const n of [1, 2, 3]) items[`ring-${n}`] = { ...base, id: `ring-${n}`, content: `Ring task ${n}`, project_id: 'ring-test', parent_id: n === 1 ? null : 'ring-1', section_id: null, checked: false, is_deleted: false, due: null, labels: [], responsible_uid: null };
    useStore.setState({ snapshot: { ...state.snapshot, projects: { ...state.snapshot.projects, 'ring-test': { ...project, id: 'ring-test', name: 'Ring test', color: 'green', description: '', parent_id: null, folder_id: null, is_favorite: false, is_folder: false } }, items } });
  });
  const ring = page.locator('.sidebar .navitem').filter({ has: page.locator('.label', { hasText: 'Ring test' }) }).locator('[data-project-progress]');
  await expect(ring).toHaveAttribute('data-project-progress', '0/3');
  await expect(ring).toHaveCSS('color', 'rgb(41, 148, 56)');
  await page.evaluate(() => { location.hash = '#/project/ring-test'; });
  const titleRing = page.locator('.screen.active .ptitle-mark [data-project-progress]');
  await expect(titleRing).toHaveAttribute('data-project-progress', '0/3');
  await expect(ring).toHaveCSS('color', 'rgb(41, 148, 56)');
  const child2 = page.locator('.screen.active [data-task-id="ring-2"]');
  const child3 = page.locator('.screen.active [data-task-id="ring-3"]');
  await expect(child2).toBeVisible();
  await child2.getByRole('checkbox').click();
  await child3.getByRole('checkbox').click();
  await expect(ring).toHaveAttribute('data-project-progress', '2/3');
  await expect(titleRing).toHaveAttribute('data-project-progress', '2/3');
  await expect(titleRing.locator('.project-progress-fill')).toHaveCSS('stroke', 'none');
  await expect(ring.locator('.project-progress-fill')).toHaveCSS('stroke', 'none');
  await page.locator('.screen.active [data-task-id="ring-1"]').getByRole('checkbox').click();
  await expect(ring).toHaveAttribute('data-project-progress', '3/3');
  await expect(titleRing).toHaveAttribute('data-project-progress', '3/3');
  await page.evaluate(() => { location.hash = '#/week'; });
  await expect(ring).toHaveAttribute('data-project-progress', '3/3');
  await page.evaluate(() => { location.hash = '#/project/ring-test'; });
  await expect(ring).toHaveAttribute('data-project-progress', '3/3');
  await page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').map(e => e.name).find(s => /\/src\/store\/store\.ts(?:\?|$)/.test(s))!;
    const { useStore } = await import(url); await useStore.getState().toggleTask('ring-3');
  });
  await expect(ring).toHaveAttribute('data-project-progress', '2/3');
});

test('connected project keeps its full indicator while navigating and refreshing history', async ({ demo: page }) => {
  test.skip(process.env.PLAYWRIGHT_DEV !== '1', 'Uses development store fixture');
  await page.route('https://api.todoist.com/api/v1/**', async route => {
    if (route.request().url().includes('/tasks/completed/by_completion_date')) {
      await new Promise(resolve => setTimeout(resolve, 250));
      await route.fulfill({ headers: { 'Access-Control-Allow-Origin': '*' }, json: { items: [{ id: 'real-1', task_id: 'real-1' }, { id: 'real-2', task_id: 'real-2' }, { id: 'real-3', task_id: 'real-3' }] } });
    } else await route.fulfill({ json: { sync_token: 'test', sync_status: {}, items: [] } });
  });
  await page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').map(e => e.name).find(s => /\/src\/store\/store\.ts(?:\?|$)/.test(s))!;
    const { useStore } = await import(url); const authUrl = performance.getEntriesByType('resource').map(e => e.name).find(s => /\/src\/api\/auth\.ts(?:\?|$)/.test(s))!; const { auth } = await import(authUrl); await auth.set('test-token');
    const state = useStore.getState();
    const template = (Object.values(state.snapshot.projects) as Array<Record<string, unknown>>).find(p => !p.is_folder && !p.inbox_project)!;
    const project = { ...template, id: 'real-test', name: 'Connected test', description: '', parent_id: null, folder_id: null, is_favorite: false, is_folder: false, created_at: new Date(Date.now() - 86400000).toISOString() };
    useStore.setState({ demo: false, connected: true, syncState: 'error', snapshot: { ...state.snapshot, user: { ...state.snapshot.user, id: 'connected-user' }, projects: { 'real-test': project }, items: {}, sections: {}, completedProjectCounts: {} } });
  });
  const ring = page.locator('.sidebar .navitem').filter({ has: page.locator('.label', { hasText: 'Connected test' }) }).locator('[data-project-progress]');
  await expect(ring).toHaveAttribute('data-project-progress', '3/3');
  await page.evaluate(() => { location.hash = '#/project/real-test'; });
  await expect(ring).toHaveAttribute('data-project-progress', '3/3');
  await expect(ring.locator('circle.project-progress-fill')).toBeVisible();
  await page.evaluate(() => { location.hash = '#/week'; });
  await expect(ring).toHaveAttribute('data-project-progress', '3/3');
});
