import { test, expect, go } from './demo';

test('#394 the tag filter starts on Any tag and builds up a selection', async ({ demo: page }) => {
  await go(page, '#/project/site');
  const active = page.locator('.screen.active');
  await active.getByRole('button', { name: /^Display/ }).click();
  const panel = page.getByRole('dialog', { name: 'Display', exact: true });
  await panel.getByRole('button', { name: /^Tags: Any tag/ }).click();
  const list = page.getByRole('dialog', { name: 'Tags', exact: true });
  const any = list.getByLabel('Any tag');
  await expect(any).toBeChecked();
  await expect(list.locator('input:checked')).toHaveCount(1);
  await list.getByLabel('week').check();
  await expect(any).not.toBeChecked();
  await expect(list.getByLabel('week')).toBeChecked();
  await list.getByLabel('week').uncheck();
  await expect(any).toBeChecked();
  await list.getByLabel('week').check();
  await any.check();
  await expect(list.getByLabel('week')).not.toBeChecked();
  await expect(any).toBeChecked();
});

test('#358 a project beats a task that matches as well', async ({ demo: page }) => {
  await page.locator('.searchbtn').click();
  const input = page.locator('.searchfield input');
  await input.fill('web');
  const first = page.locator('.sresults [role="option"]').first();
  await expect(first).toHaveAttribute('id', /^(project|label|go)-/);
});

test('#429 only the planning pages choose where the No date panel looks', async ({ demo: page }) => {
  const openPanel = async (hash: string) => {
    await go(page, hash);
    const active = page.locator('.screen.active');
    await active.getByRole('button', { name: /^Display/ }).click();
    await page.getByRole('dialog', { name: 'Display', exact: true }).getByRole('button', { name: 'Calendar', exact: true }).click();
    await active.getByRole('button', { name: /^Display/ }).click();
    await active.locator('.calendar').getByRole('button', { name: /^No date:/ }).click();
    return active.locator('.calendar-undated');
  };
  // A project is a place of its own: its calendar lists its own undated tasks, with nothing to choose.
  const project = await openPanel('#/project/site');
  await expect(project.locator('.calendar-source')).toHaveCount(0);
  await expect(project.locator('.calendar-undated-card').first()).toBeVisible();
  // This week can look at the page or everywhere.
  const week = await openPanel('#/week');
  const source = week.getByRole('group', { name: 'Where undated tasks come from' });
  await expect(source.getByRole('button', { name: 'This page' })).toHaveAttribute('aria-pressed', 'true');
  const here = await week.locator('.calendar-undated-card').count();
  await source.getByRole('button', { name: 'Everywhere' }).click();
  await expect(source.getByRole('button', { name: 'Everywhere' })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => week.locator('.calendar-undated-card').count()).toBeGreaterThan(here);
  await expect(week.locator('h3 small')).toHaveText(String(await week.locator('.calendar-undated-card').count()));
  // Upcoming only lists dated tasks, so its panel always looks everywhere.
  const upcoming = await openPanel('#/upcoming');
  await expect(upcoming.locator('.calendar-source')).toHaveCount(0);
  await expect(upcoming.locator('.calendar-undated-card').first()).toBeVisible();
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

test.describe('#360', () => {
test.use({ viewport: { width: 600, height: 1800 } });
test('in a narrow window a section is pulled by its heading, with no grip', async ({ demo: page }) => {
  await go(page, '#/project/site');
  const names = () => page.locator('.screen.active .gnamefield, .screen.active .gnamearea').evaluateAll((els) => els.map((e) => (e as HTMLTextAreaElement).value));
  await expect(page.locator('.screen.active .sectiondrag:visible')).toHaveCount(0);
  expect(await names()).toEqual(['To do', 'In progress', 'To review']);
  const heads = page.locator('.screen.active .ghead:has(.sectiondrag)');
  await expect(heads).toHaveCount(3);
  await page.waitForTimeout(800);
  await heads.nth(0).scrollIntoViewIfNeeded();
  const first = (await heads.nth(0).boundingBox())!;
  const last = (await heads.nth(2).boundingBox())!;
  const x = first.x + 120;
  await page.mouse.move(x, first.y + first.height / 2);
  await page.mouse.down();
  for (let step = 1; step <= 15; step++) await page.mouse.move(x, first.y + first.height / 2 + (last.y - 40 - first.y - first.height / 2) * step / 15);
  await page.mouse.up();
  await expect.poll(names).toEqual(['In progress', 'To do', 'To review']);
});
});

test('#413 the setup starts with Inbox, this week, this month, Upcoming and Someday', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Explore with demo data' }).click();
  const setup = page.locator('.setup');
  await expect(setup).toBeVisible();
  const list = setup.locator('.navedit-list');
  for (let step = 0; step < 4 && !(await list.first().isVisible()); step++) {
    await setup.getByRole('button', { name: /^Continue/ }).click();
  }
  await expect(list.first()).toBeVisible();
  const on = await setup.locator('.navedit-row').evaluateAll((rows) => rows.filter((row) => (row.querySelector('input[type=checkbox]') as HTMLInputElement | null)?.checked).map((row) => row.textContent ?? ''));
  expect(on.map((label) => ['Inbox', 'Anytime this week', 'Anytime this month', 'Upcoming', 'Someday'].find((name) => label.startsWith(name)) ?? label))
    .toEqual(['Inbox', 'Anytime this week', 'Anytime this month', 'Upcoming', 'Someday']);
  expect(on).toHaveLength(5);
});

test('the Product Hunt invitation appears once, then never again', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('skipSetup', '1');
    localStorage.setItem('e2eLegacyDemo', '1');
    localStorage.setItem('tde.launch.force', '1');
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Explore with demo data' }).click();
  const popup = page.getByRole('dialog', { name: 'Give Enhanced a free upvote on Product Hunt' });
  await expect(popup).toBeVisible({ timeout: 12_000 });
  await expect(popup.getByRole('link', { name: 'Upvote for free' })).toHaveAttribute('href', /producthunt\.com/);
  await popup.getByRole('button', { name: 'Not now' }).click();
  await expect(popup).toHaveCount(0);
  // Seen once is seen for good on this device, whatever was clicked.
  await page.reload();
  await expect(page.locator('.screen.active')).toBeVisible();
  await page.waitForTimeout(6500);
  await expect(page.getByRole('dialog', { name: 'Give Enhanced a free upvote on Product Hunt' })).toHaveCount(0);
});
