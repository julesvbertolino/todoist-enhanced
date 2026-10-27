import { test, expect, go } from './demo';
import type { Page } from '@playwright/test';

test.skip(process.env.PLAYWRIGHT_DEV !== '1', 'Controlled Calendar fixtures need the development server');
const active = (page: Page) => page.locator('.screen.active');
const calendar = (page: Page) => active(page).locator('.calendar');
async function seed(page: Page) {
  await page.evaluate(() => {
    const store = (window as unknown as { __store: { getState: () => any; setState: (s: any) => void } }).__store; // eslint-disable-line @typescript-eslint/no-explicit-any
    const state = store.getState(), inbox = state.snapshot.user.inbox_project_id;
    const example = Object.values(state.snapshot.items)[0] as Record<string, unknown>;
    const now = new Date(), pad = (n: number) => String(n).padStart(2, '0');
    const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const base = { ...example, project_id: inbox, parent_id: null, labels: ['calendar-test'], priority: 4, checked: false, is_deleted: false, due: null, duration: null, responsible_uid: null, description: '' };
    const due = (time = '') => ({ date: date + time, string: date, timezone: null, lang: 'en', is_recurring: false });
    const items: Record<string, unknown> = {
      'cal-undated': { ...base, id: 'cal-undated', content: 'Plan the launch', description: 'Description hidden in the calendar sidebar' },
      'cal-second': { ...base, id: 'cal-second', content: 'Choose the photos', labels: ['calendar-test', 'est-45'] },
      'cal-timed': { ...base, id: 'cal-timed', content: 'Review the design', due: due('T10:00:00'), labels: ['calendar-test', 'est-60'] },
      'cal-repeat': { ...base, id: 'cal-repeat', content: 'Daily check', due: { ...due('T09:00:00'), string: 'every day', is_recurring: true }, labels: ['calendar-test', 'est-30'] },
      'cal-done': { ...base, id: 'cal-done', content: 'Already completed', due: due(), checked: true, completed_at: new Date().toISOString() },
      'cal-child': { ...base, id: 'cal-child', parent_id: 'cal-timed', content: 'Independent subtask', due: due('T12:00:00') },
    };
    for (let i = 0; i < 5; i++) items[`cal-all-${i}`] = { ...base, id: `cal-all-${i}`, content: `All day ${i}`, due: due() };
    store.setState({ snapshot: { ...state.snapshot, items, user: { ...state.snapshot.user, start_day: 1 } },
      prefs: { ...state.prefs, estimateStorage: 'tag', views: {} }, hireNote: false });
  });
}
async function openCalendar(page: Page, view = 'inbox') {
  await go(page, view);
  await active(page).getByRole('button', { name: /^Display(?: \d+)?$/ }).click();
  await active(page).getByRole('dialog', { name: 'Display', exact: true }).getByRole('button', { name: 'Calendar', exact: true }).click();
  // Escape puts the menu away: on a phone it is a sheet, and its scrim is over the Display button.
  await page.keyboard.press('Escape');
  await expect(calendar(page)).toBeVisible();
  await calendar(page).locator('.calendar-scroll').evaluate((el) => { el.scrollTop = 8 * 56; });
}
async function option(page: Page, name: string, value: string) {
  await active(page).getByRole('button', { name: /^Display(?: \d+)?$/ }).click();
  if (name === 'Presentation') {
    await active(page).getByRole('group', { name: 'Presentation', exact: true }).getByRole('button', { name: value, exact: true }).click();
  } else {
    await active(page).getByRole('button', { name, exact: true }).click();
    await page.getByRole('option', { name: value, exact: true }).click();
  }
  const display = active(page).getByRole('button', { name: /^Display(?: \d+)?$/ });
  if (await display.getAttribute('aria-expanded') === 'true') await display.click();
}
async function task(page: Page, id: string) {
  return page.evaluate((id) => (window as unknown as { __store: { getState: () => { snapshot: { items: Record<string, { due: { date: string; is_recurring: boolean } | null; labels: string[]; duration: unknown }> } } } }).__store.getState().snapshot.items[id], id);
}

test('Calendar settings, month overflow, sidebar and persisted mode', async ({ demo: page }) => {
  await seed(page); await openCalendar(page);
  await expect(calendar(page).locator('.calendar-time-column')).toHaveCount(7);
  const width = await calendar(page).locator('.calendar-main').evaluate((el) => el.getBoundingClientRect().width);
  await calendar(page).getByRole('button', { name: 'No date: 2' }).click();
  await expect(calendar(page).locator('.calendar-undated-card')).toHaveCount(2);
  expect(await calendar(page).locator('.calendar-main').evaluate((el) => el.getBoundingClientRect().width)).toBeLessThan(width - 200);
  await active(page).getByRole('button', { name: /^Display(?: \d+)?$/ }).click();
  const menu = active(page).getByRole('dialog', { name: 'Display', exact: true });
  await expect(menu.getByRole('button', { name: 'Grouping', exact: true })).toHaveCount(0);
  await expect(menu.getByRole('button', { name: 'Sort', exact: true })).toBeVisible();
  await expect(menu.getByText(/Todoist’s calendar reads native durations/)).toBeVisible();
  await active(page).getByRole('button', { name: /^Display(?: \d+)?$/ }).click();
  await option(page, 'Presentation', 'Month');
  const full = calendar(page).locator('.calendar-month-cell').filter({ has: page.locator('[data-calendar-task="cal-all-0"]') });
  expect(await full.locator('.calendar-chip').count()).toBeGreaterThan(0);
  expect(await full.locator('.calendar-chip').count()).toBeLessThanOrEqual(3);
  expect(await calendar(page).locator('.calendar-month').evaluate((el) => el.scrollHeight <= el.clientHeight + 1)).toBe(true);
  await full.getByRole('button', { name: /more/ }).click();
  await expect(page.locator('.calendar-day-popover .calendar-chip')).toHaveCount(8);
  await expect(full.locator('.calendar-chip')).not.toHaveCount(8);
  await page.locator('.calendar-day-popover').getByRole('button', { name: 'Close', exact: true }).click();
  await page.reload();
  await expect(calendar(page).locator('.calendar-month')).toBeVisible();
});

test('pointer drop schedules with a tag, resize both edges, move and undo', async ({ demo: page }) => {
  await seed(page); await openCalendar(page);
  await calendar(page).getByRole('button', { name: 'No date: 2' }).click();
  await calendar(page).locator('.calendar-scroll').evaluate((el) => { el.scrollTop = 8 * 56; });
  const handle = calendar(page).locator('[data-calendar-task="cal-undated"] .calendar-grip');
  const target = calendar(page).locator('.calendar-time-column.is-today');
  const from = (await handle.boundingBox())!, to = (await target.boundingBox())!;
  await page.mouse.move(from.x + 6, from.y + 6); await page.mouse.down();
  await page.mouse.move(to.x + 30, to.y + 10 * 56, { steps: 20 }); await page.mouse.up();
  await expect.poll(async () => (await task(page, 'cal-undated')).due?.date).toContain('T10:00:00');
  expect((await task(page, 'cal-undated')).labels).toContain('est-30');
  expect((await task(page, 'cal-undated')).duration).toBeNull();
  const block = calendar(page).locator('[data-calendar-task="cal-undated"]');
  await block.getByRole('button', { name: 'Resize end of Plan the launch' }).focus(); await page.keyboard.press('ArrowDown');
  await expect.poll(async () => (await task(page, 'cal-undated')).labels).toContain('est-45');
  await block.getByRole('button', { name: 'Resize start of Plan the launch' }).focus(); await page.keyboard.press('ArrowUp');
  await expect.poll(async () => (await task(page, 'cal-undated')).due?.date).toContain('T09:45:00');
  expect((await task(page, 'cal-undated')).labels).toContain('est-60');
  await page.keyboard.press('Meta+z');
  await expect.poll(async () => (await task(page, 'cal-undated')).due?.date).toContain('T10:00:00');
  expect((await task(page, 'cal-undated')).labels).toContain('est-45');
});

test('all-day drops remove the time, recurring moves retain the rule', async ({ demo: page }) => {
  await seed(page); await openCalendar(page);
  const source = calendar(page).locator('[data-calendar-task="cal-repeat"] .calendar-card-title');
  const target = calendar(page).locator('.calendar-all-day [data-calendar-day]').last();
  const from = (await source.boundingBox())!, to = (await target.boundingBox())!;
  await page.mouse.move(from.x + 8, from.y + 5); await page.mouse.down(); await page.mouse.move(to.x + 20, to.y + 12, { steps: 15 }); await page.mouse.up();
  await expect.poll(async () => (await task(page, 'cal-repeat')).due?.date.includes('T')).toBe(false);
  expect((await task(page, 'cal-repeat')).due?.is_recurring).toBe(true);
});

test('future occurrences, completed tasks, subtasks and coloration', async ({ demo: page }) => {
  await seed(page); await openCalendar(page); await option(page, 'Presentation', 'Month');
  await active(page).getByRole('button', { name: /^Display(?: \d+)?$/ }).click();
  const menu = active(page).getByRole('dialog', { name: 'Display', exact: true });
  await menu.getByRole('switch', { name: 'Future occurrences', exact: true }).click();
  await menu.getByRole('switch', { name: 'Completed tasks', exact: true }).click();
  await active(page).getByRole('button', { name: /^Display(?: \d+)?$/ }).click();
  await expect(calendar(page).locator('.is-forecast').first()).toBeVisible();
  // Month cells can be collapsed, so use week to see the local completed task.
  await option(page, 'Presentation', 'Week');
  await expect(calendar(page).locator('[data-calendar-task="cal-done"]')).toHaveClass(/is-completed/);
  await expect(calendar(page).locator('[data-calendar-task="cal-child"]')).toBeVisible();
  await active(page).getByRole('button', { name: /^Display(?: \d+)?$/ }).click();
  await menu.getByRole('switch', { name: 'Show subtasks', exact: true }).click();
  await active(page).getByRole('button', { name: /^Display(?: \d+)?$/ }).click();
  await expect(calendar(page).locator('[data-calendar-task="cal-child"]')).toHaveCount(0);
  await option(page, 'Coloration', 'Project');
  expect(await calendar(page).locator('[data-calendar-task="cal-timed"]').evaluate((el) => getComputedStyle(el).borderLeftWidth)).toBe('0px');
});

test('week and upcoming navigate independently of their list windows; label, filter and project offer Calendar', async ({ demo: page }) => {
  await seed(page);
  for (const view of ['week', 'upcoming']) {
    await openCalendar(page, view); await expect(calendar(page).locator('[data-calendar-task="cal-timed"]')).toBeVisible();
    await calendar(page).getByRole('button', { name: 'Next period', exact: true }).click();
    await expect(calendar(page).locator('[data-calendar-task="cal-timed"]')).toHaveCount(0);
    await calendar(page).getByRole('button', { name: 'Today', exact: true }).click();
    await expect(calendar(page).locator('[data-calendar-task="cal-timed"]')).toBeVisible();
  }
  const project = await page.evaluate(() => (window as unknown as { __store: { getState: () => { snapshot: { user: { inbox_project_id: string } } } } }).__store.getState().snapshot.user.inbox_project_id);
  await openCalendar(page, `project/${project}`);
  await expect(calendar(page).locator('[data-calendar-task="cal-timed"]')).toBeVisible();
});

test('phone week falls back to 3 days; undated sheet and accessible scheduling work offline', async ({ demo: page }) => {
  await seed(page); await page.setViewportSize({ width: 390, height: 844 }); await openCalendar(page);
  await expect(calendar(page).locator('.calendar-time-column')).toHaveCount(3);
  await calendar(page).getByRole('button', { name: 'No date: 2' }).click();
  await expect(calendar(page).locator('.calendar-undated')).toBeVisible();
  await calendar(page).locator('[data-calendar-task="cal-undated"] .calendar-schedule').click();
  await page.context().setOffline(true);
  await page.getByRole('dialog', { name: 'Schedule Plan the launch' }).getByRole('button', { name: 'Schedule', exact: true }).click();
  await expect.poll(async () => (await task(page, 'cal-undated')).due?.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  await page.getByRole('button', { name: 'Close undated tasks' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('pointer resizing changes both edges in 15-minute steps', async ({ demo: page }) => {
  await seed(page); await openCalendar(page);
  const block = calendar(page).locator('[data-calendar-task="cal-timed"]');
  const end = (await block.locator('.calendar-resize.end').boundingBox())!;
  await page.mouse.move(end.x + end.width / 2, end.y + 3); await page.mouse.down();
  await page.mouse.move(end.x + end.width / 2, end.y + 31, { steps: 10 }); await page.mouse.up();
  await expect.poll(async () => (await task(page, 'cal-timed')).labels).toContain('est-90');
  const start = (await block.locator('.calendar-resize.start').boundingBox())!;
  await page.mouse.move(start.x + start.width / 2, start.y + 3); await page.mouse.down();
  await page.mouse.move(start.x + start.width / 2, start.y - 11, { steps: 10 }); await page.mouse.up();
  await expect.poll(async () => (await task(page, 'cal-timed')).labels).toContain('est-105');
  expect((await task(page, 'cal-timed')).due?.date).toContain('T09:45:00');
});

test('sorting orders the sidebar and all-day row; month drops set date only', async ({ demo: page }) => {
  await seed(page); await openCalendar(page);
  await calendar(page).getByRole('button', { name: 'No date: 2' }).click();
  await option(page, 'Sort', 'Name');
  await expect(calendar(page).locator('.calendar-undated-card .calendar-card-title')).toHaveText(['Choose the photos', 'Plan the launch']);
  await expect(calendar(page).locator('.calendar-all-day .calendar-card-title')).toHaveText(['All day 0', 'All day 1', 'All day 2', 'All day 3', 'All day 4']);
  await option(page, 'Presentation', 'Month');
  const from = (await calendar(page).locator('[data-calendar-task="cal-second"] .calendar-grip').boundingBox())!;
  const to = (await calendar(page).locator('.calendar-month-cell').first().boundingBox())!;
  await page.mouse.move(from.x + 6, from.y + 6); await page.mouse.down(); await page.mouse.move(to.x + 20, to.y + 20, { steps: 15 }); await page.mouse.up();
  await expect.poll(async () => (await task(page, 'cal-second')).due?.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect((await task(page, 'cal-second')).labels).toContain('est-45');
});

test('demo preview works in dark French and a tag page; now line stays in today and gutter', async ({ demo: page }) => {
  await seed(page); await openCalendar(page, 'label/calendar-test');
  await expect(calendar(page).locator('[data-calendar-task="cal-timed"]')).toBeVisible();
  await expect(calendar(page).locator('.calendar-now-line')).toHaveCount(1);
  await expect(calendar(page).locator('.calendar-gutter .calendar-now-label')).toHaveCount(1);
  await calendar(page).getByRole('button', { name: 'No date: 2' }).click();
  await page.screenshot({ path: '../../outputs/calendar-week.png', fullPage: true });
  await page.evaluate(() => {
    const store = (window as unknown as { __store: { getState: () => { setPrefs: (s: Record<string, unknown>) => void } } }).__store;
    store.getState().setPrefs({ theme: 'dark' });
  });
  await page.screenshot({ path: '../../outputs/calendar-dark.png', fullPage: true });
  await option(page, 'Presentation', '3 days');
  await expect(calendar(page).locator('.calendar-time-column')).toHaveCount(3);
  await page.screenshot({ path: '../../outputs/calendar-3-days.png', fullPage: true });
  await option(page, 'Presentation', 'Month');
  await page.screenshot({ path: '../../outputs/calendar-month.png', fullPage: true });
  await page.evaluate(() => (window as unknown as { __store: { getState: () => { setPrefs: (s: Record<string, unknown>) => void } } }).__store.getState().setPrefs({ locale: 'fr' }));
  await expect(calendar(page).getByRole('button', { name: /Sans date/ })).toBeVisible();
  await page.screenshot({ path: '../../outputs/calendar-francais.png', fullPage: true });
});

test('saved filters keep their query scope when expanding subtasks', async ({ demo: page }) => {
  await seed(page);
  await page.evaluate(() => {
    const store = (window as unknown as { __store: { getState: () => any; setState: (s: any) => void } }).__store; // eslint-disable-line @typescript-eslint/no-explicit-any
    const state = store.getState();
    store.setState({ snapshot: { ...state.snapshot, items: { ...state.snapshot.items, 'cal-child': { ...state.snapshot.items['cal-child'], priority: 1 } } } });
  });
  await openCalendar(page, 'filter/f2');
  await expect(calendar(page).locator('[data-calendar-task="cal-timed"]')).toBeVisible();
  await expect(calendar(page).locator('[data-calendar-task="cal-child"]')).toHaveCount(0);
});

test('selecting an empty slot opens the composer with day, time, estimate and tag', async ({ demo: page }) => {
  await seed(page); await openCalendar(page, 'label/calendar-test');
  // Fixtures schedule tasks today; choose another day so this slot is empty on Mondays too.
  const column = calendar(page).locator('.calendar-time-column:not(.is-today)').first();
  const date = await column.getAttribute('data-calendar-day');
  const box = (await column.boundingBox())!;
  await page.mouse.move(box.x + 30, box.y + 10 * 56); await page.mouse.down();
  await page.mouse.move(box.x + 30, box.y + 10.5 * 56, { steps: 8 }); await page.mouse.up();
  const composer = page.locator('.composerbox');
  await expect(composer).toBeVisible();
  await composer.locator('.namefield [contenteditable="true"], .namefield textarea').fill('Created from calendar');
  await composer.getByRole('button', { name: 'Add task', exact: true }).click();
  const created = await page.evaluate(() => Object.values((window as any).__store.getState().snapshot.items).find((item: any) => item.content === 'Created from calendar') as any); // eslint-disable-line @typescript-eslint/no-explicit-any
  expect(created.due.date).toBe(`${date}T10:00:00`);
  expect(created.labels).toContain('calendar-test');
  expect(created.labels).toContain('est-30');
});

test('the composer understands an exact clock span and stores its estimate as a tag', async ({ demo: page }) => {
  await seed(page); await page.keyboard.press('q');
  const composer = page.locator('.composerbox');
  await composer.locator('[contenteditable="true"], textarea').first().fill('Rendez-vous demain de 12h à 12h12');
  await composer.getByRole('button', { name: 'Add task', exact: true }).click();
  const created = await page.evaluate(() => Object.values((window as any).__store.getState().snapshot.items).find((item: any) => item.content === 'Rendez-vous') as any); // eslint-disable-line @typescript-eslint/no-explicit-any
  expect(created.due.date).toContain('T12:00:00');
  expect(created.labels).toContain('est-12');
  expect(created.duration).toBeNull();
});

test('priority sorts undated cards and consecutive blocks keep a visible gap', async ({ demo: page }) => {
  await seed(page);
  await page.evaluate(() => {
    const store = (window as any).__store; const state = store.getState(); // eslint-disable-line @typescript-eslint/no-explicit-any
    const items = { ...state.snapshot.items, 'cal-undated': { ...state.snapshot.items['cal-undated'], priority: 1 }, 'cal-second': { ...state.snapshot.items['cal-second'], priority: 4 } };
    items.following = { ...items['cal-timed'], id: 'following', content: 'Next meeting', due: { ...items['cal-timed'].due, date: items['cal-timed'].due.date.replace('10:00', '11:00') } };
    store.setState({ snapshot: { ...state.snapshot, items } });
  });
  await openCalendar(page); await calendar(page).getByRole('button', { name: 'No date: 2' }).click();
  await option(page, 'Sort', 'Name'); await option(page, 'Sort', 'Priority');
  await expect(calendar(page).locator('.calendar-undated-card .calendar-card-title')).toHaveText(['Choose the photos', 'Plan the launch']);
  const a = (await calendar(page).locator('[data-calendar-task="cal-timed"]').boundingBox())!;
  const b = (await calendar(page).locator('[data-calendar-task="following"]').boundingBox())!;
  expect(b.y - a.y - a.height).toBeGreaterThanOrEqual(2);
  expect(await calendar(page).locator('[data-calendar-task="cal-timed"]').evaluate((el) => getComputedStyle(el).userSelect)).toBe('none');
});

for (const mode of ['Calendar', 'List', 'Board']) {
  test(`right-click reuses the task actions in ${mode}`, async ({ demo: page }) => {
    await seed(page); await openCalendar(page);
    if (mode !== 'Calendar') {
      await active(page).getByRole('button', { name: /^Display/ }).click();
      await active(page).getByRole('dialog', { name: 'Display', exact: true }).getByRole('button', { name: mode, exact: true }).click();
      await active(page).getByRole('button', { name: /^Display/ }).click();
    }
    const card = mode === 'Calendar' ? calendar(page).locator('[data-calendar-task="cal-timed"]') : active(page).locator('[data-task-id="cal-timed"]');
    await card.click({ button: 'right' });
    const menu = page.locator('.rowmenu[role="menu"]');
    for (const name of ['Edit task', 'Tomorrow', 'P2', 'Deadline', 'Move to project', 'Duplicate']) await expect(menu.getByRole('button', { name, exact: true })).toBeVisible();
    await page.locator('.rowmenu').getByRole('button', { name: 'P2', exact: true }).click();
    expect((await page.evaluate(() => (window as any).__store.getState().snapshot.items['cal-timed'].priority))).toBe(3); // eslint-disable-line @typescript-eslint/no-explicit-any
  });
}

test('completed checks are centred, short adjacent tasks stay separate and Display fits the calendar', async ({ demo: page }) => {
  await seed(page);
  await page.evaluate(() => {
    const store = (window as any).__store, state = store.getState(), base = state.snapshot.items['cal-timed']; // eslint-disable-line @typescript-eslint/no-explicit-any
    const first = { ...base, id: 'short-first', content: 'Short appointment', labels: ['est-12'], due: { ...base.due, date: base.due.date.replace('10:00', '12:00') } };
    const next = { ...base, id: 'short-next', content: 'Next appointment', labels: ['est-30'], due: { ...base.due, date: base.due.date.replace('10:00', '12:12') } };
    store.setState({ snapshot: { ...state.snapshot, items: { ...state.snapshot.items, [first.id]: first, [next.id]: next } } });
  });
  await openCalendar(page);
  const a = (await calendar(page).locator('[data-calendar-task="short-first"]').boundingBox())!;
  const b = (await calendar(page).locator('[data-calendar-task="short-next"]').boundingBox())!;
  expect(b.y - a.y - a.height).toBeGreaterThanOrEqual(2);
  await active(page).getByRole('button', { name: /^Display/ }).click();
  const menu = active(page).getByRole('dialog', { name: 'Display', exact: true });
  await expect(menu.getByRole('group', { name: 'Presentation' })).toBeVisible();
  await expect(menu.getByText('Show on each task', { exact: true })).toHaveCount(0);
  await menu.getByRole('switch', { name: 'Completed tasks', exact: true }).click();
  await page.screenshot({ path: '../../outputs/calendar-display-refined.png', fullPage: true });
  await active(page).getByRole('button', { name: /^Display/ }).click();
  const check = calendar(page).locator('[data-calendar-task="cal-done"] .check');
  const outer = (await check.boundingBox())!, inner = (await check.locator('svg').boundingBox())!;
  expect(Math.abs((outer.x + outer.width / 2) - (inner.x + inner.width / 2))).toBeLessThan(1);
  expect(Math.abs((outer.y + outer.height / 2) - (inner.y + inner.height / 2))).toBeLessThan(1);
  await calendar(page).getByRole('button', { name: 'No date: 2' }).click();
  await page.screenshot({ path: '../../outputs/calendar-refined.png', fullPage: true });
  await page.goto('/docs/mockups/2.10.0/changelog-propositions.html');
  await expect(page.locator('.choices .choice')).toHaveCount(10);
  await page.screenshot({ path: '../../outputs/changelog-propositions.png', fullPage: true });
});


test('month outside click only dismisses overflow; next click creates', async ({ demo: page }) => {
  await seed(page); await openCalendar(page); await option(page, 'Presentation', 'Month');
  const full = calendar(page).locator('.calendar-month-cell').filter({ has: page.locator('[data-calendar-task="cal-all-0"]') });
  await full.getByRole('button', { name: /more/ }).click();
  const empty = calendar(page).locator('.calendar-month-cell').filter({ hasNot: page.locator('.calendar-card') }).first();
  await empty.click({ position: { x: 30, y: 60 } });
  await expect(page.locator('.calendar-day-popover')).toHaveCount(0);
  await expect(page.locator('.composer')).toHaveCount(0);
  await empty.click({ position: { x: 30, y: 60 } });
  await expect(page.locator('[data-editor="composer"]')).toBeVisible();
});

test('calendar context submenus return to actions, including the duration editor', async ({ demo: page }) => {
  await seed(page); await openCalendar(page);
  await calendar(page).locator('[data-calendar-task="cal-timed"]').click({ button: 'right' });
  for (const name of ['Deadline', 'Pick a date', 'Move to project', 'Set an estimate']) {
    const menu = page.locator('.rowmenu[role="menu"]');
    await menu.getByRole('button', { name, exact: true }).click();
    await expect(menu.getByRole('button', { name: 'Back', exact: true })).toBeVisible();
    await menu.getByRole('button', { name: 'Back', exact: true }).click();
    await expect(menu.getByRole('button', { name: 'Edit task', exact: true })).toBeVisible();
  }
});

test('sidebar contains title and duration; sort stays on one line and forecasts are identified', async ({ demo: page }) => {
  await seed(page); await openCalendar(page);
  await calendar(page).getByRole('button', { name: 'No date: 2' }).click();
  await expect(calendar(page).getByText('Description hidden in the calendar sidebar')).toHaveCount(0);
  await active(page).getByRole('button', { name: /^Display/ }).click();
  const menu = active(page).getByRole('dialog', { name: 'Display', exact: true });
  const field = await menu.getByRole('button', { name: 'Sort', exact: true }).boundingBox();
  expect(field!.height).toBeLessThan(50);
  await menu.getByRole('switch', { name: 'Future occurrences', exact: true }).click();
  await active(page).getByRole('button', { name: /^Display/ }).click();
  const forecast = calendar(page).locator('.is-forecast').first();
  await expect(forecast.locator('.calendar-forecast-mark')).toBeVisible();
  await expect(forecast.getByRole('checkbox')).toHaveCount(0);
});

test('full changelog keeps its history visible and current footer actions', async ({ demo: page }) => {
  await go(page, '#/settings');
  await page.getByRole('button', { name: 'Changelog', exact: true }).click();
  const dialog = page.locator('.whatsnew');
  await expect(dialog.locator('[data-changelog-preview="calendar"]')).toBeVisible();
  expect(await dialog.locator('.whatsnew-release').count()).toBeGreaterThan(20);
  expect(await dialog.locator('.whatsnew-badge').count()).toBe(await dialog.locator('.whatsnew-change').count());
  await expect(dialog.locator('[data-changelog-preview="assign"]')).toHaveCount(1);
  await expect(dialog.locator('[data-changelog-preview="subtasks"]')).toHaveCount(1);
  await expect(dialog.locator('details')).toHaveCount(0);
  await expect(dialog.getByRole('link', { name: 'Buy me a coffee' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Got it' })).toBeVisible();
  await page.screenshot({ path: '../../outputs/changelog-complet-2.10.0.png', fullPage: true });
  await dialog.locator('.whatsnew-body').evaluate((el) => { el.scrollTop = 370; });
  await page.screenshot({ path: '../../outputs/changelog-historique-2.10.0.png', fullPage: true });
  await page.evaluate(() => { const s = (window as any).__store; s.setState({ prefs: { ...s.getState().prefs, locale: 'fr' } }); }); // eslint-disable-line @typescript-eslint/no-explicit-any
  await expect(dialog.locator('.whatsnew-illustrated').filter({ hasText: 'Vue Calendrier' }).first()).toBeVisible();
  await dialog.locator('.whatsnew-body').evaluate((el) => { el.scrollTop = 0; });
  await page.screenshot({ path: '../../outputs/changelog-complet-fr-2.10.0.png', fullPage: true, animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(dialog.getByRole('button', { name: 'Compris', exact: true })).toBeVisible();
  expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.screenshot({ path: '../../outputs/changelog-mobile-2.10.0.png', fullPage: true, animations: 'disabled' });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.evaluate(() => { const s = (window as any).__store; s.setState({ prefs: { ...s.getState().prefs, theme: 'dark' } }); }); // eslint-disable-line @typescript-eslint/no-explicit-any
  await page.screenshot({ path: '../../outputs/changelog-sombre-2.10.0.png', fullPage: true, animations: 'disabled' });
});

test('calendar cards open from title and body without confusing clicks with drags', async ({ demo: page }) => {
  await seed(page); await openCalendar(page);
  const card = calendar(page).locator('[data-calendar-task="cal-timed"]');
  await card.locator('.calendar-card-title').click();
  await expect(page.locator('.detail-content')).toBeVisible();
  await page.locator('.detail-top').getByRole('button', { name: 'Close', exact: true }).click();
  await card.locator('small').click();
  await expect(page.locator('.detail-content')).toBeVisible();
  await page.locator('.detail-top').getByRole('button', { name: 'Close', exact: true }).click();
  await calendar(page).locator('[data-calendar-task="cal-all-0"] .calendar-card-title').click();
  await expect(page.locator('.detail-content')).toBeVisible();
  await page.locator('.detail-top').getByRole('button', { name: 'Close', exact: true }).click();
  await calendar(page).getByRole('button', { name: 'No date: 2' }).click();
  await calendar(page).locator('[data-calendar-task="cal-undated"] small').click();
  await expect(page.locator('.detail-content')).toBeVisible();
});

test('priority and estimate context menus stay compact', async ({ demo: page }) => {
  await seed(page); await openCalendar(page);
  await calendar(page).locator('[data-calendar-task="cal-timed"]').click({ button: 'right' });
  const priority = page.locator('.task-priority-shortcuts');
  await expect(priority.locator('h5')).toHaveCount(0);
  expect((await priority.boundingBox())!.height).toBeLessThan(220);
  await page.screenshot({ path: '../../outputs/calendar-priority-compact.png', fullPage: true });
  await page.locator('.rowmenu').getByRole('button', { name: 'Set an estimate', exact: true }).click();
  const estimate = page.locator('.estimatesheet');
  expect((await estimate.boundingBox())!.height).toBeLessThan(250);
  expect((await estimate.boundingBox())!.width).toBeLessThan(260);
  await page.screenshot({ path: '../../outputs/calendar-estimate-compact.png', fullPage: true });
});

test('update window links to full changelog and keeps actions over a bounded blur', async ({ demo: page }) => {
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('enhanced:changelog', { detail: { versions: ['2.10.0'] } })));
  const updated = page.getByRole('dialog', { name: 'What’s new since your last visit', exact: true });
  await expect(updated.locator('.whatsnew-release')).toHaveCount(1);
  await expect(updated.getByRole('link', { name: 'Buy me a coffee' })).toBeVisible();
  await expect(updated.getByRole('button', { name: 'Got it', exact: true })).toBeVisible();
  await page.screenshot({ path: '../../outputs/changelog-since-last-visit.png', fullPage: true, animations: 'disabled' });
  await updated.getByRole('button', { name: 'See changelog', exact: true }).click();
  const history = page.getByRole('dialog', { name: 'Changelog', exact: true });
  expect(await history.locator('.whatsnew-release').count()).toBeGreaterThan(20);
  await expect(history.getByRole('button', { name: 'See changelog', exact: true })).toHaveCount(0);
  const titles = history.locator('.whatsnew-title');
  const sizes = await titles.evaluateAll((els) => els.slice(0, 3).map((el) => getComputedStyle(el).fontSize));
  expect(new Set(sizes).size).toBe(1);
  expect((await history.locator('[data-changelog-preview="calendar"]').boundingBox())!.height).toBeLessThan(190);
  const blur = await history.locator('.whatsnew-foot').evaluate((el) => ({
    filter: getComputedStyle(el, '::before').backdropFilter,
    bottom: el.getBoundingClientRect().bottom,
    dialogBottom: el.closest('.sheet')!.getBoundingClientRect().bottom,
  }));
  expect(blur.filter).toContain('blur');
  expect(Math.abs(blur.bottom - blur.dialogBottom)).toBeLessThan(2);
  await page.screenshot({ path: '../../outputs/changelog-compact-blur.png', fullPage: true, animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 844 });
  await history.getByRole('button', { name: 'Got it', exact: true }).click();
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('enhanced:changelog', { detail: { versions: ['2.10.0'] } })));
  await expect(updated.getByRole('button', { name: 'See changelog', exact: true })).toBeVisible();
  await expect(updated.getByRole('button', { name: 'Got it', exact: true })).toBeVisible();
  await expect(updated.getByRole('link', { name: 'Buy me a coffee' })).toBeVisible();
  await page.screenshot({ path: '../../outputs/changelog-since-last-visit-mobile.png', fullPage: true, animations: 'disabled' });
});

test('historical features show relevant previews, in English even when the app is in French', async ({ demo: page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await go(page, '#/settings');
  await page.getByRole('button', { name: 'Changelog', exact: true }).click();
  const history = page.locator('.whatsnew');
  await expect(history.locator('.whatsnew-illustrated').first()).toBeVisible();
  expect(await history.locator('.whatsnew-illustrated').count()).toBeGreaterThan(20);
  expect(await history.locator('.whatsnew-change.design.whatsnew-illustrated').count()).toBeGreaterThan(0);
  await expect(history.locator('.whatsnew-change.fix.whatsnew-illustrated')).toHaveCount(0);
  expect(await history.locator('.whatsnew-change.design .changelog-preview').count()).toBe(await history.locator('.whatsnew-change.design.whatsnew-illustrated').count());
  await expect(history.locator('.whatsnew-change.fix .changelog-preview')).toHaveCount(0);
  await history.getByRole('button', { name: 'Versions', exact: true }).click();
  await page.getByRole('option', { name: 'Version 2.2.0', exact: true }).click();
  const sidebar = history.locator('#whatsnew-2-2-0 [data-changelog-preview="sidebarFilters"]');
  await expect(sidebar).toBeInViewport();
  await expect(sidebar).toContainText('Filters');
  await expect(sidebar).toContainText('Favourites');
  await page.screenshot({ path: '../../outputs/changelog-filtres-historique.png', fullPage: true, animations: 'disabled' });
  const overflow = await history.locator('.whatsnew-illustrated').evaluateAll((rows) => rows.filter((row) => row.scrollWidth > row.clientWidth + 1).length);
  expect(overflow).toBe(0);
  await page.evaluate(() => { const s = (window as any).__store; s.setState({ prefs: { ...s.getState().prefs, locale: 'fr' } }); }); // eslint-disable-line @typescript-eslint/no-explicit-any
  // The pictures stay in English whatever the language of the text around them.
  await expect(sidebar).toContainText('Filters');
  await expect(sidebar).toContainText('Favourites');
  await history.getByRole('button', { name: 'Versions', exact: true }).click();
  await page.getByRole('option', { name: 'Version 2.2.0', exact: true }).click();
  await page.screenshot({ path: '../../outputs/changelog-filtres-francais.png', fullPage: true, animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 844 });
  await sidebar.scrollIntoViewIfNeeded();
  await expect(sidebar).toBeInViewport();
  expect(await history.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.screenshot({ path: '../../outputs/changelog-filtres-mobile.png', fullPage: true, animations: 'disabled' });
});


test('every changelog entry has a title, old big features have a picture in the same frame and project default view renders', async ({ demo: page }) => {
  await go(page, '#/settings');
  await page.getByRole('button', { name: 'Changelog', exact: true }).click();
  const history = page.locator('.whatsnew');
  await expect(history.locator('.whatsnew-title').first()).toBeVisible();
  expect(await history.locator('.whatsnew-title').count()).toBe(await history.locator('.whatsnew-change').count());
  const old = history.locator('.whatsnew-release[id^="whatsnew-1-"], .whatsnew-release[id^="whatsnew-0-"]');
  expect(await old.locator('.changelog-preview').count()).toBeGreaterThan(10);
  const frames = await history.locator('.changelog-preview').evaluateAll((els) => els.map((el) => `${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`));
  expect(new Set(frames).size).toBe(1);
  await history.getByRole('button', { name: 'Versions', exact: true }).click();
  await page.getByRole('option', { name: 'Version 2.0.0', exact: true }).click();
  const example = history.locator('[data-changelog-preview="projectView"]');
  await example.scrollIntoViewIfNeeded();
  await expect(example).toContainText('Default view');
  await expect(example).toContainText('List');
  await expect(example).toContainText('Board');
  expect((await example.boundingBox())!.width).toBeGreaterThan(250);
});
