import { test, expect, go, row } from './demo';
import type { Page } from '@playwright/test';

// Scenario fixtures modify only the demo store, loaded from Vite's source modules.
test.skip(process.env.PLAYWRIGHT_DEV !== '1', 'Run assignment scenarios with PLAYWRIGHT_DEV=1');

async function seed(page: Page) {
  await page.evaluate(async () => {
    const modulePath = performance.getEntriesByType('resource').map((entry) => entry.name).find((url) => /\/src\/store\/store\.ts(?:\?|$)/.test(url)) ?? '/src/store/store.ts';
    const { useStore } = await import(modulePath);
    const state = useStore.getState();
    const snapshot = state.snapshot;
    const base = Object.values(snapshot.items)[0] as Record<string, unknown>;
    const date = new Date();
    const today = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    date.setDate(date.getDate() + 2);
    const future = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const items = { ...snapshot.items };
    for (const [bucket, day, labels] of [['today', today, []], ['future', future, []], ['someday', null, []], ['week', null, ['week']], ['tag', today, ['work']]] as const) {
      for (const [who, uid] of [['mine', snapshot.user.id], ['none', null], ['other', 'demo-alex']] as const) {
        const id = `203-${bucket}-${who}`;
        items[id] = { ...base, id, content: `203 ${bucket} ${who}`, project_id: 'site', section_id: null, parent_id: null,
          description: '', checked: false, is_deleted: false, priority: 4, labels: [...labels], responsible_uid: uid,
          due: day ? { date: day, string: day, timezone: null, lang: 'en', is_recurring: false } : null };
      }
    }
    items['203-child'] = { ...items['203-today-mine'], id: '203-child', content: '203 child mine', parent_id: '203-today-other' };
    useStore.setState({ snapshot: { ...snapshot, items } });
  });
}

for (const [view, bucket] of [['today', 'today'], ['week', 'week'], ['upcoming', 'future'], ['someday', 'someday'], ['label/work', 'tag']] as const) {
  test(`${view}: personal default, then everyone in Display`, async ({ demo }) => {
    await seed(demo);
    await go(demo, `#/${view}`);
    await expect(row(demo, `203 ${bucket} mine`)).toBeVisible();
    await expect(row(demo, `203 ${bucket} none`)).toBeVisible();
    await expect(row(demo, `203 ${bucket} other`)).toHaveCount(0);
    await demo.getByRole('button', { name: /^Display/ }).click();
    await demo.getByRole('button', { name: /^Assigned to:/ }).click();
    await demo.getByRole('dialog', { name: 'Assigned to', exact: true }).getByRole('button', { name: 'Everyone', exact: true }).click();
    await expect(row(demo, `203 ${bucket} other`)).toBeVisible();
  });
}

test('my same-day child remains visible when the parent belongs to someone else', async ({ demo }) => {
  await seed(demo); await go(demo, '#/today');
  await expect(row(demo, '203 child mine')).toBeVisible();
  await expect(row(demo, '203 today other')).toHaveCount(0);
});

test('project shows everyone, identifies assignees and edits assignment in task detail', async ({ demo }) => {
  await seed(demo); await go(demo, '#/project/site');
  await expect(row(demo, '203 today other')).toBeVisible();
  await expect(row(demo, '203 today other').getByRole('img', { name: /Assigned to: Alex Martin/ })).toBeVisible();
  await row(demo, '203 today other').click();
  const detail = demo.locator('[data-prop="assignee"]');
  await detail.getByRole('button').click();
  await demo.getByRole('option', { name: /Me \(/ }).click();
  await demo.keyboard.press('Escape');
  await go(demo, '#/today');
  await expect(row(demo, '203 today other')).toBeVisible();
});

test('grouping by assignee prefills the modal and preserves project placement', async ({ demo }) => {
  await seed(demo); await go(demo, '#/project/site');
  await demo.getByRole('button', { name: /^Display/ }).click();
  await demo.getByRole('button', { name: 'Grouping', exact: true }).click();
  await demo.getByRole('option', { name: 'Assignee', exact: true }).click();
  await demo.getByRole('button', { name: /^Display/ }).click();
  const group = demo.locator('.screen.active .group').filter({ has: demo.getByRole('button', { name: /Alex Martin/ }) });
  await group.getByRole('button', { name: /Add task/ }).click();
  const dialog = demo.getByRole('dialog', { name: 'Add task', exact: true });
  await expect(dialog.getByRole('button', { name: 'Assigned to' })).toContainText('Alex Martin');
  await dialog.getByRole('textbox', { name: /Task name/ }).fill('203 created for Alex');
  await dialog.getByRole('button', { name: /Add task/, exact: false }).last().click();
  await expect(row(demo, '203 created for Alex')).toBeVisible();
  await go(demo, '#/today');
  await expect(row(demo, '203 created for Alex')).toHaveCount(0);
});

test('Eisenhower filters colleagues and supports an explicit Everyone override', async ({ demo }) => {
  await seed(demo); await go(demo, '#/matrix');
  await expect(row(demo, '203 today mine')).toBeVisible();
  await expect(row(demo, '203 today other')).toHaveCount(0);
  await demo.getByRole('button', { name: /^Display/ }).click();
  await demo.getByRole('button', { name: /^Assigned to:/ }).click();
  await demo.getByRole('dialog', { name: 'Assigned to', exact: true }).getByRole('button', { name: 'Everyone', exact: true }).click();
  await expect(row(demo, '203 today other')).toBeVisible();
});

test('Review uses its own scope and removes colleagues from the daily review', async ({ demo }) => {
  await seed(demo); await go(demo, '#/review');
  await demo.getByRole('button', { name: /^Assigned to:/ }).click();
  const picker = demo.getByRole('dialog', { name: 'Assigned to', exact: true });
  await picker.getByRole('checkbox', { name: 'Nobody', exact: true }).uncheck();
  await picker.getByRole('checkbox', { name: 'Me', exact: true }).uncheck();
  await expect(demo.locator('.screen.active .reviewrow')).toHaveCount(0);
  await picker.getByRole('button', { name: 'Everyone', exact: true }).click();
  await expect(demo.locator('.screen.active .reviewrow').first()).toBeVisible();
});

test('global search still finds a colleagues task hidden from Today', async ({ demo }) => {
  await seed(demo); await go(demo, '#/today');
  await expect(row(demo, '203 today other')).toHaveCount(0);
  await demo.getByRole('button', { name: /Search.*⌘K/ }).click();
  await demo.getByRole('searchbox', { name: /Search/i }).fill('203 today other');
  await expect(demo.getByRole('option').filter({ hasText: '203 today other' })).toBeVisible();
  await expect(demo.getByRole('option').filter({ hasText: '203 today other' }).getByRole('img', { name: /Assigned to: Alex Martin/ })).toBeVisible();
});

test('workspace dropdown supports multiple spaces and a deliberate empty selection', async ({ demo }) => {
  await seed(demo); await go(demo, '#/today');
  await demo.getByRole('button', { name: /^Display/ }).click();
  await demo.getByRole('button', { name: /^Workspaces:/ }).click();
  const picker = demo.getByRole('dialog', { name: 'Workspaces', exact: true });
  const checkboxes = picker.getByRole('checkbox');
  for (let index = 0; index < await checkboxes.count(); index++) await checkboxes.nth(index).uncheck();
  await expect(demo.locator('.screen.active [data-task-id]')).toHaveCount(0);
  await picker.getByRole('button', { name: 'Any', exact: true }).click();
  await expect(row(demo, '203 today mine')).toBeVisible();
});

test('saved Todoist filters retain colleagues tasks even when Today hides them', async ({ demo }) => {
  await seed(demo); await go(demo, '#/filter/f2');
  await expect(row(demo, '203 today other')).toBeVisible();
  await expect(row(demo, '203 today mine')).toBeVisible();
});

test('Dashboard has a personal assignee scope and an explicit empty selection clears the metrics', async ({ demo }) => {
  await seed(demo); await go(demo, '#/insights');
  await demo.getByRole('button', { name: /^Display/ }).click();
  await demo.getByRole('button', { name: /^Assigned to:/ }).click();
  const picker = demo.getByRole('dialog', { name: 'Assigned to', exact: true });
  await picker.getByRole('checkbox', { name: 'Nobody', exact: true }).uncheck();
  await picker.getByRole('checkbox', { name: 'Me', exact: true }).uncheck();
  await expect(demo.locator('[data-card="completed"] .stat-value')).toContainText('0');
});

test('hiding an assignee removes their previously selected task from bulk actions', async ({ demo }) => {
  await seed(demo); await go(demo, '#/project/site');
  await row(demo, '203 today other').click({ modifiers: ['Meta'] });
  await demo.getByRole('button', { name: /^Display/ }).click();
  await demo.getByRole('button', { name: /^Assigned to:/ }).click();
  await demo.getByRole('dialog', { name: 'Assigned to', exact: true }).getByRole('checkbox', { name: 'Alex Martin', exact: true }).uncheck();
  await expect(row(demo, '203 today other')).toHaveCount(0);
  expect(await demo.evaluate(async () => {
    const url = performance.getEntriesByType('resource').map((entry) => entry.name).find((url) => /\/src\/store\/store\.ts(?:\?|$)/.test(url))!;
    return (await import(url)).useStore.getState().selection;
  })).toEqual([]);
});

test('creating inside a section preserves the actual section and the chosen assignee', async ({ demo }) => {
  await seed(demo); await go(demo, '#/project/site');
  const section = demo.locator('.screen.active .group.has-section-slots').first();
  const sectionId = await section.locator('[data-section-name]').getAttribute('data-section-name');
  await section.getByRole('button', { name: /Add task/ }).click();
  const dialog = demo.getByRole('dialog', { name: 'Add task', exact: true });
  await dialog.getByRole('button', { name: 'Assigned to', exact: true }).click();
  await demo.getByRole('option', { name: 'Alex Martin', exact: true }).click();
  await dialog.getByRole('textbox', { name: 'Task name', exact: true }).fill('203 real section');
  await dialog.getByRole('button', { name: 'Add task', exact: true }).click();
  await expect(row(demo, '203 real section')).toBeVisible();
  const placement = await demo.evaluate(async () => {
    const url = performance.getEntriesByType('resource').map((entry) => entry.name).find((url) => /\/src\/store\/store\.ts(?:\?|$)/.test(url))!;
    const state = (await import(url)).useStore.getState();
    const tasks = Object.values(state.snapshot.items) as Array<{ content: string; project_id: string; section_id: string | null; responsible_uid: string | null }>;
    const task = tasks.find((task) => task.content === '203 real section')!;
    return { project: task.project_id, section: task.section_id, assignee: task.responsible_uid };
  });
  expect(placement).toEqual({ project: 'site', section: sectionId, assignee: 'demo-alex' });
});

test('changing the composer project clears an ineligible assignee and keeps the draft', async ({ demo }) => {
  await seed(demo); await go(demo, '#/project/site');
  await demo.locator('.sidebar').getByRole('button', { name: 'Add task', exact: true }).click();
  const dialog = demo.getByRole('dialog', { name: 'Add task', exact: true });
  await dialog.getByRole('textbox', { name: 'Task name', exact: true }).fill('203 change project');
  await dialog.getByRole('button', { name: 'Assigned to', exact: true }).click();
  await demo.getByRole('option', { name: 'Alex Martin', exact: true }).click();
  await dialog.getByRole('button', { name: 'Project', exact: true }).click();
  await demo.getByRole('option', { name: /^#?\s*Personal$/, exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Assigned to', exact: true })).toHaveCount(0);
  await expect(dialog.getByRole('textbox', { name: 'Task name', exact: true })).toHaveValue('203 change project');
  await expect(demo.getByText(/The assignee is not eligible/)).toBeVisible();
});

test('profile photo stays centred before the more menu and its dropdown fits the viewport', async ({ demo }) => {
  await seed(demo);
  await demo.route('https://dcff1xvirvpfp.cloudfront.net/photo-test_small.jpg', (route) => route.fulfill({
    contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="35" height="35"><rect width="35" height="35" fill="#7ba4cb"/><circle cx="17" cy="12" r="7" fill="#eee"/><circle cx="17" cy="32" r="12" fill="#eee"/></svg>',
  }));
  await demo.evaluate(async () => {
    const url = performance.getEntriesByType('resource').map((entry) => entry.name).find((url) => /\/src\/store\/store\.ts(?:\?|$)/.test(url))!;
    const { useStore } = await import(url); const state = useStore.getState();
    useStore.setState({ snapshot: { ...state.snapshot, collaborators: { ...state.snapshot.collaborators, 'demo-alex': { ...state.snapshot.collaborators['demo-alex'], image_id: 'photo-test' } } } });
  });
  await go(demo, '#/project/site');
  const task = row(demo, '203 today other');
  const avatar = task.getByRole('img', { name: 'Assigned to: Alex Martin' });
  await expect(avatar.locator('img')).toBeVisible();
  await expect.poll(() => avatar.locator('img').evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  // #386: the row's actions sit on the title's first line, not the middle of the whole row.
  const before = (await avatar.boundingBox())!; const title = (await task.locator('.ttitle').first().boundingBox())!;
  expect(Math.abs(before.y + before.height / 2 - title.y - Math.min(title.height, 22) / 2)).toBeLessThan(4);
  await task.hover();
  const after = (await avatar.boundingBox())!;
  expect(Math.abs(before.x - after.x)).toBeLessThan(1);
  expect((await task.locator('.row-more').boundingBox())!.x).toBeGreaterThan(after.x);
  await task.getByRole('button', { name: 'Assigned to', exact: true }).click();
  await expect(demo.getByRole('option', { name: 'Alex Martin', exact: true }).locator('img')).toBeVisible();
  const popup = (await demo.locator('.popover.listbox').boundingBox())!;
  expect(popup.x + popup.width).toBeLessThanOrEqual(demo.viewportSize()!.width - 7);
  const face = task.getByRole('button', { name: 'Assigned to', exact: true });
  expect(await face.evaluate((node) => getComputedStyle(node).boxShadow)).toBe('none');
  expect(await face.evaluate((node) => getComputedStyle(node).borderRadius)).toBe('50%');
});

test('assigning from row hover changes the task without reloading the page', async ({ demo }) => {
  await seed(demo); await go(demo, '#/project/site');
  const started = await demo.evaluate(() => performance.timeOrigin);
  const task = row(demo, '203 today none'); await task.hover();
  await task.getByRole('button', { name: 'Assigned to', exact: true }).click();
  await demo.getByRole('option', { name: 'Alex Martin', exact: true }).click();
  await expect(task.getByRole('img', { name: 'Assigned to: Alex Martin' })).toBeVisible();
  await go(demo, '#/today'); await expect(row(demo, '203 today none')).toHaveCount(0);
  expect(await demo.evaluate(() => performance.timeOrigin)).toBe(started);
});

test('Upcoming extension is hidden when there is no further work and exposes the extended date when there is', async ({ demo }) => {
  await seed(demo); await go(demo, '#/upcoming');
  await expect(demo.getByRole('button', { name: 'Show 15 more days' })).toHaveCount(0);
  await demo.evaluate(async () => {
    const url = performance.getEntriesByType('resource').map((entry) => entry.name).find((url) => /\/src\/store\/store\.ts(?:\?|$)/.test(url))!;
    const { useStore } = await import(url); const state = useStore.getState();
    const date = new Date(); date.setDate(date.getDate() + 20);
    const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const item = state.snapshot.items['203-future-mine'];
    useStore.setState({ snapshot: { ...state.snapshot, items: { ...state.snapshot.items, beyond: { ...item, id: 'beyond', content: '203 beyond horizon', due: { ...item.due, date: day } } } } });
  });
  await expect(row(demo, '203 beyond horizon')).toHaveCount(0);
  await demo.getByRole('button', { name: 'Show 15 more days' }).click();
  await expect(row(demo, '203 beyond horizon')).toBeVisible();
  await expect(demo.getByText(/^Showing dates through/)).toBeVisible();
});

test('selecting every assignee or workspace restores the all summary and removes the filter count', async ({ demo }) => {
  await seed(demo);
  await demo.evaluate(async () => {
    const url = performance.getEntriesByType('resource').map((entry) => entry.name).find((url) => /\/src\/store\/store\.ts(?:\?|$)/.test(url))!;
    const { useStore } = await import(url); const state = useStore.getState();
    useStore.setState({ snapshot: { ...state.snapshot, workspaces: { team: { id: 'team', name: 'Test team' } } } });
  });
  await go(demo, '#/project/site');
  await demo.getByRole('button', { name: /^Display/ }).click();
  for (const label of ['Assigned to', 'Workspaces']) {
    if (label === 'Workspaces') {
      await go(demo, '#/today');
      await demo.getByRole('button', { name: /^Display/ }).click();
    }
    const trigger = demo.getByRole('button', { name: new RegExp(`^${label}:`) });
    await trigger.click();
    const choices = demo.getByRole('dialog', { name: label, exact: true });
    await expect(choices.locator('.multiselect-all')).toBeVisible();
    const first = choices.getByRole('checkbox').first();
    await first.uncheck();
    await expect(demo.locator('.displaycount')).toHaveText('1');
    await first.check();
    await expect(demo.locator('.displaycount')).toHaveCount(0);
    await expect(trigger).toHaveAccessibleName(`${label}: ${label === 'Assigned to' ? 'Everyone' : 'Any'}`);
    await trigger.click();
  }
});

for (const view of ['review', 'insights']) {
  test(`${view}: filters overlay content and Everyone reflects the selection`, async ({ demo }) => {
    await seed(demo); await go(demo, `#/${view}`);
    if (view === 'insights') await demo.getByRole('button', { name: /^Display/ }).click();
    const trigger = demo.getByRole('button', { name: /^Assigned to:/ });
    const before = (await trigger.boundingBox())!;
    const height = await demo.locator('.screen.active').evaluate((node) => node.scrollHeight);
    await trigger.click();
    const picker = demo.getByRole('dialog', { name: 'Assigned to', exact: true });
    const everyone = picker.getByRole('button', { name: 'Everyone', exact: true });
    await expect(everyone).toHaveAttribute('aria-pressed', 'false');
    expect(await picker.evaluate((node) => getComputedStyle(node).position)).toBe('fixed');
    expect(await demo.locator('.screen.active').evaluate((node) => node.scrollHeight)).toBe(height);
    expect((await trigger.boundingBox())!.y).toBe(before.y);
    await everyone.click();
    await expect(everyone).toHaveAttribute('aria-pressed', 'true');
    await demo.keyboard.press('Escape');
    await expect(picker).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });
}

test('matrix uses workspace multiselect with images and filters across several spaces', async ({ demo }) => {
  await seed(demo); await go(demo, '#/matrix');
  await demo.getByRole('button', { name: /^Display/ }).click();
  const workspace = demo.getByRole('button', { name: /^Workspaces:/ });
  const assignee = demo.getByRole('button', { name: /^Assigned to:/ });
  expect((await workspace.boundingBox())!.y).toBeLessThan((await assignee.boundingBox())!.y);
  await workspace.click();
  const picker = demo.getByRole('dialog', { name: 'Workspaces', exact: true });
  const choices = picker.getByRole('checkbox');
  expect(await choices.count()).toBeGreaterThan(1);
  await expect(picker.locator('.workspace-avatar').first()).toBeVisible();
  for (let index = 0; index < await choices.count(); index++) await choices.nth(index).uncheck();
  await expect(picker.getByRole('button', { name: 'Any', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await expect(row(demo, '203 today mine')).toHaveCount(0);
  await picker.getByRole('button', { name: 'Any', exact: true }).click();
  await expect(picker.getByRole('button', { name: 'Any', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(row(demo, '203 today mine')).toBeVisible();
  await demo.keyboard.press('Escape');
  await expect(demo.getByRole('dialog', { name: 'Display', exact: true })).toBeVisible();
});

test('Review avatar follows the title on the same line', async ({ demo }) => {
  await seed(demo);
  await demo.evaluate(async () => {
    const url = performance.getEntriesByType('resource').map((entry) => entry.name).find((url) => /\/src\/store\/store\.ts(?:\?|$)/.test(url))!;
    const { useStore } = await import(url); const state = useStore.getState();
    const date = new Date(); date.setDate(date.getDate() - 1);
    const yesterday = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    const item = state.snapshot.items['203-today-other'];
    useStore.setState({ snapshot: { ...state.snapshot, items: { ...state.snapshot.items, [item.id]: { ...item, due: { ...item.due, date: yesterday } } } } });
  });
  await go(demo, '#/review');
  await demo.getByRole('button', { name: /^Assigned to:/ }).click();
  await demo.getByRole('dialog', { name: 'Assigned to', exact: true }).getByRole('button', { name: 'Everyone', exact: true }).click();
  await demo.keyboard.press('Escape');
  const title = demo.locator('.review-title-line').filter({ hasText: '203 today other' }).first();
  await expect(title).toBeVisible();
  const text = (await title.locator('.ttitle').boundingBox())!;
  const avatar = (await title.locator('.assignee-badge').boundingBox())!;
  expect(avatar.x).toBeGreaterThanOrEqual(text.x + text.width);
  expect(Math.abs(avatar.y + avatar.height / 2 - text.y - text.height / 2)).toBeLessThan(2);
});

test('Upcoming contextual composer recognises dans un mois over its prefilled date', async ({ demo }) => {
  await seed(demo); await go(demo, '#/upcoming');
  await demo.locator('.screen.active').getByRole('button', { name: 'Add task', exact: true }).first().click();
  const dialog = demo.getByRole('dialog', { name: 'Add task', exact: true });
  await dialog.getByRole('textbox', { name: 'Task name', exact: true }).fill('Faire ceci dans un mois');
  const expected = await demo.evaluate(() => {
    const today = new Date(); const day = today.getDate();
    today.setDate(1); today.setMonth(today.getMonth() + 1);
    const last = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    today.setDate(Math.min(day, last));
    return `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  });
  await dialog.getByRole('button', { name: 'Add task', exact: true }).click();
  const due = await demo.evaluate(async () => {
    const url = performance.getEntriesByType('resource').map((entry) => entry.name).find((url) => /\/src\/store\/store\.ts(?:\?|$)/.test(url))!;
    const { useStore } = await import(url);
    const items = Object.values(useStore.getState().snapshot.items) as Array<{ content: string; due?: { date: string } | null }>;
    return items.find((item) => item.content === 'Faire ceci')?.due?.date;
  });
  expect(due).toBe(expected);
});
