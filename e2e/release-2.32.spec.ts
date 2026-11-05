import { test, expect, go } from './demo';

test('#394 the tag filter starts on Any tag and builds up a selection', async ({ demo: page }) => {
  await go(page, '#/project/site');
  const active = page.locator('.screen.active');
  await active.getByRole('button', { name: /^Display/ }).click();
  const panel = page.getByRole('dialog', { name: 'Display', exact: true });
  await panel.getByRole('button', { name: /^Tags: Any tag/ }).click();
  const list = page.getByRole('dialog', { name: 'Tags', exact: true });
  await expect(list.locator('.multiselect-all')).toHaveAttribute('aria-pressed', 'true');
  await expect(list.locator('input:checked')).toHaveCount(0);
  await list.getByLabel('week').check();
  await expect(list.locator('.multiselect-all')).toHaveAttribute('aria-pressed', 'false');
  await expect(list.locator('input:checked')).toHaveCount(1);
  await list.getByLabel('week').uncheck();
  await expect(list.locator('.multiselect-all')).toHaveAttribute('aria-pressed', 'true');
  await list.getByLabel('week').check();
  await list.locator('.multiselect-all').click();
  await expect(list.locator('input:checked')).toHaveCount(0);
});

test('#358 a project beats a task that matches as well', async ({ demo: page }) => {
  await page.locator('.searchbtn').click();
  const input = page.locator('.searchfield input');
  await input.fill('web');
  const first = page.locator('.sresults [role="option"]').first();
  await expect(first).toHaveAttribute('id', /^(project|label|go)-/);
});

test('#429 the No date panel can take its tasks from elsewhere', async ({ demo: page }) => {
  await go(page, '#/upcoming');
  const active = page.locator('.screen.active');
  await active.getByRole('button', { name: /^Display/ }).click();
  await page.getByRole('dialog', { name: 'Display', exact: true }).getByRole('button', { name: 'Calendar', exact: true }).click();
  await active.getByRole('button', { name: /^Display/ }).click();
  await active.locator('.calendar').getByRole('button', { name: /^No date:/ }).click();
  const panel = active.locator('.calendar-undated');
  await expect(panel.getByRole('button', { name: /Where undated tasks come from/ })).toContainText('Everywhere');
  await expect(panel.locator('.calendar-undated-card').first()).toBeVisible();
  const everywhere = await panel.locator('.calendar-undated-card').count();
  await panel.getByRole('button', { name: /Where undated tasks come from/ }).click();
  await page.getByRole('option', { name: 'week', exact: true }).click();
  const tagged = await panel.locator('.calendar-undated-card').count();
  expect(tagged).toBeGreaterThan(0);
  expect(tagged).toBeLessThan(everywhere);
  await expect(panel.locator('h3 small')).toHaveText(String(tagged));
});

test('#419 a link to a Todoist item Enhanced has opens it here, not in a new tab', async ({ demo: page }) => {
  await go(page, '#/project/site');
  const target = await page.evaluate(() => {
    const store = (window as unknown as { __store: { getState: () => { snapshot: { items: Record<string, Record<string, unknown>> } }; setState: (s: unknown) => void } }).__store;
    const state = store.getState();
    const items = Object.values(state.snapshot.items) as unknown as Array<{ id: string; content: string; project_id: string }>;
    const linked = items.find((item) => item.content === 'Call the garage')!;
    const host = items.find((item) => item.content === 'Reply to the printer')!;
    store.setState({ snapshot: { ...state.snapshot, items: { ...state.snapshot.items,
      [host.id]: { ...host, description: `See [the garage](https://app.todoist.com/app/task/call-the-garage-${linked.id}) and [elsewhere](https://github.com/x)` } } } });
    return { host: host.id, linked: linked.id, project: linked.project_id };
  });
  let opened = 0;
  page.context().on('page', () => { opened += 1; });
  await page.locator(`.screen.active [data-task-id="${target.host}"]`).first().click();
  const detail = page.getByRole('dialog', { name: 'Task' });
  await expect(detail.getByRole('link', { name: 'the garage' })).toBeVisible();
  await detail.getByRole('link', { name: 'the garage' }).click();
  await expect(detail.getByRole('textbox', { name: /Call the garage/ }).or(detail.getByText('Call the garage').first())).toBeVisible();
  await expect(detail.getByRole('link', { name: 'the garage' })).toHaveCount(0);
  expect(opened).toBe(0);
  // Another site still opens in a new tab.
  await page.keyboard.press('Escape');
  await page.locator(`.screen.active [data-task-id="${target.host}"]`).first().click();
  const [tab] = await Promise.all([
    page.context().waitForEvent('page'),
    detail.getByRole('link', { name: 'elsewhere' }).click(),
  ]);
  await tab.close();
});
