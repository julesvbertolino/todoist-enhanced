import { test, expect, go } from './demo';

type WorkspaceTestStore = {
  getState: () => { snapshot: { user: { id: string }; [key: string]: unknown }; prefs: Record<string, unknown> };
  setState: (value: Record<string, unknown>) => void;
};
test.skip(process.env.PLAYWRIGHT_DEV !== '1', 'Workspace fixtures use the development store');
test('workspace counts use server totals, members and archive paginate, and cached data survives offline navigation', async ({ demo: page }) => {
  const reads: string[] = [];
  let completed = 12;
  await page.route('https://api.todoist.com/**', async (route) => {
    const url = new URL(route.request().url()); reads.push(url.pathname + url.search);
    let response: unknown;
    if (url.pathname.endsWith('/sync')) {
      const params = new URLSearchParams(route.request().postData() ?? '');
      const resources: string[] = JSON.parse(params.get('resource_types') ?? '[]');
      if (resources.length === 1 && resources[0] === 'completed_info') {
        response = { full_sync: true, sync_token: 'counts-only', completed_info: [
          { project_id: 'site', completed_items: completed }, { project_id: 'site', section_id: 's-todo', completed_items: 4 },
        ] };
      } else {
        const commands: Array<{ uuid: string }> = JSON.parse(params.get('commands') ?? '[]');
        response = { full_sync: false, sync_token: 'fixture', sync_status: Object.fromEntries(commands.map(({ uuid }) => [uuid, 'ok'])) };
      }
    }
    else if (url.pathname.endsWith('/users')) response = url.searchParams.has('cursor')
      ? { workspace_users: [{ user_id: 'two', full_name: 'Second member', role: 'MEMBER' }], has_more: false }
      : { workspace_users: [{ user_id: 'one', full_name: 'First member', role: 'ADMIN' }], has_more: true, next_cursor: 'page2' };
    else if (url.pathname.endsWith('/archived')) response = { workspace_projects: [{ id: 'archived', name: 'Archived launch', color: 'blue' }], has_more: false };
    else if (url.pathname.endsWith('/active')) response = { workspace_projects: [{ id: 'not-joined', name: 'Visible unjoined project', color: 'green' }], has_more: false };
    else response = { results: [], next_cursor: null };
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(response) });
  });
  await page.evaluate(async () => {
    const useStore = (window as unknown as { __store: WorkspaceTestStore }).__store;
    useStore.setState({ demo: false, connected: true, syncState: 'idle', snapshot: { ...useStore.getState().snapshot, syncToken: 'fixture' }, prefs: { ...useStore.getState().prefs, setupDone: true } });
    const authPath = '/src/api/auth.ts'; const { auth } = await import(authPath);
    await auth.set('test-only-fake-token-never-sent-to-todoist');
  });
  await go(page, '#/workspace/ws-pro');
  const site = page.locator('.workspace-project').filter({ has: page.getByRole('button', { name: /^Website/ }) });
  await expect(site.locator('.workspace-meta')).toContainText('12/');
  const unjoined = page.locator('.workspace-project').filter({ hasText: 'Visible unjoined project' });
  await expect(unjoined).toContainText('—');
  await expect(page.locator('.workspace-archive')).toHaveCount(0);
  await page.getByRole('switch', { name: 'Show archived' }).click();
  await expect(page.locator('.workspace-archive')).toContainText('Archived launch');
  await page.getByRole('tab', { name: /^People/ }).click();
  await expect(page.locator('.workspace-person')).toHaveCount(2);
  expect(reads.some((url) => url.includes('workspace_id=ws-pro') && url.includes('cursor=page2'))).toBe(true);
  completed = 13;
  await page.getByRole('tab', { name: 'Projects' }).click();
  await page.evaluate(async () => {
    const useStore = (window as unknown as { __store: WorkspaceTestStore }).__store;
    useStore.setState({ snapshot: { ...useStore.getState().snapshot, syncedAt: Date.now() } });
  });
  await expect(site.locator('.workspace-meta')).toContainText('13/');
  // Wait for the full successful response to be cached before leaving the page.
  await expect.poll(() => page.evaluate(async () => {
    const path = '/src/db/idb.ts'; const { loadPrefs } = await import(path);
    const useStore = (window as unknown as { __store: WorkspaceTestStore }).__store;
    return (await loadPrefs(`workspace:${useStore.getState().snapshot.user.id}:ws-pro`))?.counts?.site;
  })).toBe(13);
  await go(page, '#/week');
  await page.evaluate(async () => {
    const useStore = (window as unknown as { __store: WorkspaceTestStore }).__store; useStore.setState({ syncState: 'offline' });
  });
  const before = reads.length;
  await go(page, '#/workspace/ws-pro');
  await expect(site.locator('.workspace-meta')).toContainText('13/');
  await expect(page.locator('.workspace-page').getByRole('status')).toContainText('cached');
  expect(reads.length).toBe(before);
  await page.getByRole('tab', { name: /^People/ }).click();
  await expect(page.locator('.workspace-person')).toHaveCount(2);
});

test('the workspace title opens its page while its caret still collapses the sidebar tree', async ({ demo: page }) => {
  const head = page.locator('.side-head').filter({ has: page.locator('.side-headbtn', { hasText: 'My projects' }) });
  const caret = head.locator('.side-disclose');
  await expect(caret).toHaveAttribute('aria-expanded', 'true');
  await caret.click();
  await expect(caret).toHaveAttribute('aria-expanded', 'false');
  await head.locator('.side-headbtn').click();
  await expect(page).toHaveURL(/#\/workspace\/personal$/);
  await expect(page.locator('.workspace-page')).toBeVisible();
});
