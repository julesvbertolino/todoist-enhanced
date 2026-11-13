import { test, expect, go } from './demo';

test('empty lists explain the view and preserve the correct add action', async ({ demo: page }) => {
  await page.evaluate(() => {
    const store = (window as unknown as { __store: { getState: () => any; setState: (v: any) => void } }).__store; // eslint-disable-line @typescript-eslint/no-explicit-any
    const state = store.getState();
    store.setState({ snapshot: { ...state.snapshot, items: {}, sections: {} }, prefs: { ...state.prefs, views: {} }, hireNote: false });
  });
  for (const [route, title] of [['#/today', 'Nothing planned for today'], ['#/week', 'Nothing planned this week'], ['#/month', 'Nothing planned this month'], ['#/someday', 'Nothing saved for someday'], ['#/inbox', 'Your inbox is clear'], ['#/project/home', 'No tasks in this project'], ['#/label/quick', 'No tasks with this tag']]) {
    await go(page, route);
    await expect(page.locator('.screen.active .project-empty h2')).toHaveText(title);
    await expect(page.locator('.screen.active .project-empty-cta')).toBeVisible();
  }
  await go(page, '#/filter/f1');
  await expect(page.locator('.screen.active .project-empty h2')).toHaveText('No matching tasks');
  await expect(page.locator('.screen.active .project-empty-cta')).toHaveCount(0);
  await go(page, '#/project/home');
  await page.locator('.screen.active .project-empty-cta').click();
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('the project picker keeps all colours visible', async ({ demo: page }) => {
  await go(page, '#/project/home');
  await page.getByRole('button', { name: 'Change the icon' }).click();
  const picker = page.locator('.ptitle-icons');
  await expect(picker.getByRole('radio')).toHaveCount(20);
  for (const radio of await picker.getByRole('radio').all()) await expect(radio).toBeInViewport();
  await page.screenshot({ path: 'test-results/project-picker-476.png' });
});

test('a free account sees the deadline explanation from the usual composer button', async ({ demo: page }) => {
  await page.route('https://api.todoist.com/**', (route) => route.fulfill({ json: route.request().url().includes('/sync') ? { sync_token: 'test', full_sync: false } : { results: [], items: [], next_cursor: null } }));
  await page.evaluate(() => {
    const store = (window as unknown as { __store: { getState: () => any; setState: (v: any) => void } }).__store; // eslint-disable-line @typescript-eslint/no-explicit-any
    const state = store.getState();
    localStorage.setItem('tde.token', 'synthetic-test-token');
    store.setState({ demo: false, connected: true, settingsChecked: true, prefs: { ...state.prefs, setupDone: true, onboarded: true }, snapshot: { ...state.snapshot, user: { ...state.snapshot.user, is_premium: false, premium_status: 'not_premium' } } });
  });
  await page.locator('.sidebar').getByRole('button', { name: 'Add task', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Deadline' }).click();
  const notice = page.locator('.deadline-pro-notice');
  await expect(notice).toContainText('Pro or Business is required to set a deadline.');
  const link = notice.getByRole('link', { name: 'See Todoist plans' });
  await expect(link).toHaveAttribute('href', 'https://www.todoist.com/pricing');
  expect(await link.evaluate((node) => node.parentElement?.tagName)).toBe('P');
});
