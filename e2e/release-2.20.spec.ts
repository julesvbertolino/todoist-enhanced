import { test, expect, go, row } from './demo';
import type { Page } from '@playwright/test';
type TestItem = {
  id: string; content: string; project_id: string; section_id: string | null; parent_id: string | null;
  labels: string[]; priority: number; checked: boolean; is_deleted: boolean; description: string;
  due: { date: string; string: string; lang: string; is_recurring: boolean; timezone: string | null } | null;
  [key: string]: unknown;
};
type TestNote = { id: string; item_id: string | null; is_deleted: boolean; [key: string]: unknown };
type TestState = {
  snapshot: { items: Record<string, TestItem>; notes: Record<string, TestNote>; user: { id: string } | null; [key: string]: unknown };
  setViewPrefs: (key: string, patch: Record<string, unknown>) => void;
  sendTo: (id: string, target: Record<string, unknown>, destination: string) => Promise<void>;
};
type Store = { getState: () => TestState; setState: (patch: Partial<TestState>) => void };

test('#343 outside mouse click only dismisses tags; opening another picker switches it', async ({ demo: page }) => {
  await row(page, 'Rebuild the home page').locator('.ttitle').click();
  const tags = page.locator('[data-prop="tags"] .propadd');
  await tags.click();
  await expect(tags).toHaveAttribute('aria-expanded', 'true');
  await page.locator('.detail-body .descview').click();
  await expect(tags).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('.detail-body .descview')).toBeVisible();
  await tags.click();
  const project = page.locator('[data-prop="project"] button').first();
  await project.click();
  await expect(tags).toHaveAttribute('aria-expanded', 'false');
  await expect(project).toHaveAttribute('aria-expanded', 'true');
  await tags.click();
  await expect(project).toHaveAttribute('aria-expanded', 'false');
  await expect(tags).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(tags).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('.detail-body')).toBeVisible();
});

test('#343 date, deadline, assignee and more close on outside click without editing the description', async ({ demo: page }) => {
  await row(page, 'Rebuild the home page').locator('.ttitle').click();
  for (const prop of ['start', 'deadline', 'assignee']) {
    const trigger = page.locator(`[data-prop="${prop}"] .fselect-face`).first();
    if (!await trigger.count()) continue;
    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await page.locator('.detail-body .descview').click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('.detail-body .descview')).toBeVisible();
  }
  const more = page.locator('.detail-tools button[aria-haspopup="menu"]');
  await more.click();
  await page.locator('.detail-body .descview').click();
  await expect(more).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('.detail-body .descview')).toBeVisible();
});

test('#338 comments use Enter for lines and Cmd+Enter to send and save an edit', async ({ demo: page }) => {
  await row(page, 'Rebuild the home page').locator('.ttitle').click();
  const field = page.getByRole('textbox', { name: 'Comment', exact: true });
  const before = await page.locator('article.comment').count();
  await expect(field).toHaveAttribute('placeholder', 'Comment');
  await field.fill('Keep my draft'); await field.press('Escape');
  await expect(field).not.toBeFocused(); await expect(field).toHaveValue('Keep my draft');
  await field.fill('First line'); await field.press('Enter'); await field.pressSequentially('Second line');
  await expect(field).toHaveValue('First line\nSecond line');
  await expect(page.locator('article.comment')).toHaveCount(before);
  await field.press('Meta+Enter');
  const comment = page.locator('article.comment').last();
  await expect(comment).toContainText('Second line');
  await comment.hover(); await comment.getByRole('button', { name: 'Comment actions' }).click();
  await page.getByRole('menuitem', { name: 'Edit comment' }).click();
  const edit = comment.getByRole('textbox');
  await edit.fill('Edited'); await edit.press('Enter'); await edit.pressSequentially('Two lines');
  await expect(edit).toHaveValue('Edited\nTwo lines');
  await edit.press('Control+Enter');
  await expect(edit).toHaveCount(0);
  await expect(comment).toContainText('Two lines');
});

test('#337 a live comment counter opens the discussion and can be hidden', async ({ demo: page }) => {
  const task = row(page, 'Rebuild the home page');
  await task.locator('.ttitle').click();
  await page.getByRole('textbox', { name: 'Comment', exact: true }).fill('Counter test');
  await page.getByRole('button', { name: 'Send comment' }).click();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  const counter = task.locator('.task-comments');
  await expect(counter).toContainText('1');
  await counter.click();
  await expect(page.getByRole('textbox', { name: 'Comment', exact: true })).toBeFocused();
  await expect(page.locator('article.comment')).toContainText('Counter test');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Display', exact: true }).click();
  await page.locator('.detailschips').getByRole('button', { name: 'Comments', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(counter).toHaveCount(0);
});

test('#322 priorities and date shortcuts are directly available in the context menu', async ({ demo: page }) => {
  const task = row(page, 'Rebuild the home page');
  await task.click({ button: 'right' });
  const menu = page.getByRole('menu').last();
  await expect(menu.getByRole('button', { name: 'P2', exact: true })).toBeVisible();
  await expect(menu.getByRole('button', { name: 'Tomorrow', exact: true })).toBeVisible();
  await expect(menu.getByRole('button', { name: 'This weekend', exact: true })).toBeVisible();
  await menu.getByRole('button', { name: 'P1', exact: true }).click();
  await expect(task.locator('.check').first()).toHaveClass(/p1/);
});


async function board(page: Page, sort = 'priority') {
  test.skip(process.env.PLAYWRIGHT_DEV !== '1', 'Controlled store scenarios');
  await page.evaluate((sort) => {
    const store = (window as unknown as { __store: Store }).__store;
    const state = store.getState(), snapshot = state.snapshot;
    const base = Object.values(snapshot.items)[0];
    const items = Object.fromEntries(Object.entries(snapshot.items).filter(([, it]) => it.project_id !== 'site'));
    for (const [id, step, priority] of [['board-a', '', 3], ['board-b', '', 2], ['board-c', 'step-in-progress', 4]] as const) {
      items[id] = { ...base, id, content: id, project_id: 'site', section_id: 's-todo', parent_id: null,
        labels: step ? [step] : [], priority, checked: false, is_deleted: false, due: null, description: '' };
    }
    store.setState({ snapshot: { ...snapshot, items } });
    store.getState().setViewPrefs('project:site', { mode: 'board', group: 'step', sort: sort as 'priority' | 'manual' });
  }, sort);
  await go(page, '#/project/site');
}

test('#350 an automatic sort shades the column and stays automatic after a real drop', async ({ demo: page }) => {
  await board(page);
  const source = page.locator('[data-task-id="board-a"]'), target = page.locator('[data-task-id="board-c"]');
  const a = (await source.boundingBox())!, b = (await target.boundingBox())!;
  await page.mouse.move(a.x + 70, a.y + 12); await page.mouse.down();
  await page.mouse.move(a.x + 80, a.y + 12, { steps: 5 });
  await page.mouse.move(b.x + 80, b.y + 12, { steps: 20 });
  await expect(target.locator('xpath=ancestor::section[1]')).toHaveClass(/sorted-drop/);
  await expect(page.locator('.board .dropbar')).toHaveCount(0);
  await page.mouse.up();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __store: Store }).__store.getState().snapshot.items['board-a'].labels)).toContain('step-in-progress');
  await expect(page.locator('.sorted-drop')).toHaveCount(0);
});

test('#349 mouse rectangle selects cards instead of text and Escape cancels it', async ({ demo: page }) => {
  await board(page);
  const col = page.locator('.board .col').first();
  const r = (await col.boundingBox())!;
  await page.mouse.move(r.x + 2, r.y + 2); await page.mouse.down();
  await page.mouse.move(r.x + r.width - 3, r.y + r.height - 3, { steps: 15 });
  await expect(page.locator('.board-selection-box')).toHaveCount(1);
  await expect(col.locator('[aria-selected="true"]')).toHaveCount(2);
  await page.mouse.move(r.x + 10, r.y + 10, { steps: 10 });
  await expect(col.locator('[aria-selected="true"]')).toHaveCount(0);
  await page.mouse.move(r.x + r.width - 3, r.y + r.height - 3, { steps: 10 });
  await page.mouse.up();
  await expect(col.locator('[aria-selected="true"]')).toHaveCount(2);
  expect(await page.evaluate(() => window.getSelection()?.toString())).toBe('');
  await page.mouse.move(r.x + 2, r.y + 2); await page.mouse.down();
  await page.mouse.move(r.x + 25, r.y + 25, { steps: 5 });
  await page.keyboard.press('Escape'); await page.mouse.up();
  await expect(page.locator('.board-selection-box')).toHaveCount(0);
});

test('#332 cancelling keeps a series; confirming an undated move has an exact Undo', async ({ demo: page }) => {
  test.skip(process.env.PLAYWRIGHT_DEV !== '1', 'Controlled store scenarios');
  await page.evaluate(() => {
    const store = (window as unknown as { __store: Store }).__store;
    const state = store.getState();
    const item = Object.values(state.snapshot.items).find((it) => it.due?.is_recurring)!;
    (window as unknown as { recurringTestId: string }).recurringTestId = item.id;
    void state.sendTo(item.id, { kind: 'anytime' }, 'Anytime this week');
  });
  const confirmation = page.getByRole('dialog', { name: 'Stop repeating and move?' });
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole('button', { name: 'Cancel', exact: true }).click();
  const before = await page.evaluate(() => { const w = window as unknown as { __store: Store; recurringTestId: string }; return w.__store.getState().snapshot.items[w.recurringTestId].due; });
  expect(before?.is_recurring).toBe(true);
  await page.evaluate(() => { const w = window as unknown as { __store: Store; recurringTestId: string }; void w.__store.getState().sendTo(w.recurringTestId, { kind: 'someday' }, 'Someday'); });
  await confirmation.getByRole('button', { name: 'Stop repeating and move', exact: true }).click();
  await expect.poll(() => page.evaluate(() => { const w = window as unknown as { __store: Store; recurringTestId: string }; return w.__store.getState().snapshot.items[w.recurringTestId].due; })).toBeNull();
  await page.getByRole('button', { name: /^Undo —/ }).click();
  expect(await page.evaluate(() => { const w = window as unknown as { __store: Store; recurringTestId: string }; return w.__store.getState().snapshot.items[w.recurringTestId].due; })).toEqual(before);
});

test('#337 comment counters appear in Table and react to sync deletion', async ({ demo: page }) => {
  test.skip(process.env.PLAYWRIGHT_DEV !== '1', 'Controlled store scenarios');
  await page.evaluate(() => {
    const store = (window as unknown as { __store: Store }).__store;
    const state = store.getState();
    const item = Object.values(state.snapshot.items).find((it) => it.content === 'Rebuild the home page')!;
    const note = { id: 'count-note', item_id: item.id, project_id: null, content: 'A synced comment', posted_at: new Date().toISOString(), posted_uid: state.snapshot.user!.id, file_attachment: null, is_deleted: false };
    store.setState({ snapshot: { ...state.snapshot, notes: { ...state.snapshot.notes, [note.id]: note } } });
    state.setViewPrefs('project:site', { mode: 'table' });
  });
  await go(page, '#/project/site');
  const badge = row(page, 'Rebuild the home page').locator('.task-comments');
  await expect(badge).toHaveText('1');
  await page.evaluate(() => {
    const store = (window as unknown as { __store: Store }).__store, state = store.getState();
    store.setState({ snapshot: { ...state.snapshot, notes: { ...state.snapshot.notes, 'count-note': { ...state.snapshot.notes['count-note'], is_deleted: true } } } });
  });
  await expect(badge).toHaveCount(0);
});

test('#322 a phone action sheet keeps direct priority and date buttons inside the screen', async ({ demo: page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const task = row(page, 'Rebuild the home page');
  await task.click({ button: 'right' });
  const menu = page.locator('.rowsheet .rowmenu');
  await expect(menu.getByRole('button', { name: 'P2', exact: true })).toBeVisible();
  await expect(menu.getByRole('button', { name: 'Tomorrow', exact: true })).toBeVisible();
  const r = (await menu.boundingBox())!;
  expect(r.x).toBeGreaterThanOrEqual(0);
  expect(r.x + r.width).toBeLessThanOrEqual(391);
  await menu.getByRole('button', { name: 'P2', exact: true }).click();
  await expect(menu).toHaveCount(0);
});

test('#322 rescheduling a series preserves its rule and does not complete it', async ({ demo: page }) => {
  test.skip(process.env.PLAYWRIGHT_DEV !== '1', 'Controlled store scenarios');
  await page.evaluate(() => {
    const store = (window as unknown as { __store: Store }).__store, state = store.getState();
    const item = Object.values(state.snapshot.items).find((it) => it.content === 'Rebuild the home page')!;
    store.setState({ snapshot: { ...state.snapshot, items: { ...state.snapshot.items, [item.id]: {
      ...item, due: { date: '2026-01-01', string: 'every day', lang: 'en', is_recurring: true, timezone: null },
    } } } });
  });
  await row(page, 'Rebuild the home page').click({ button: 'right' });
  await page.locator('.rowmenu').getByRole('button', { name: 'Postpone', exact: true }).click();
  const saved = await page.evaluate(() => {
    const items = (window as unknown as { __store: Store }).__store.getState().snapshot.items;
    return Object.values(items).find((it) => it.content === 'Rebuild the home page')!;
  });
  expect(saved.due?.is_recurring).toBe(true);
  expect(saved.due?.string).toBe('every day');
  expect(saved.checked).toBe(false);
  expect(saved.due?.date).not.toBe('2026-01-01');
});

test('#350 an empty automatic column keeps its geometry while entering and leaving', async ({ demo: page }) => {
  await board(page);
  const target = page.locator('.board .col').filter({ has: page.locator('.empty') }).first();
  const before = (await target.boundingBox())!;
  const source = (await page.locator('[data-task-id="board-a"]').boundingBox())!;
  await page.mouse.move(source.x + 70, source.y + 12); await page.mouse.down();
  await page.mouse.move(source.x + 80, source.y + 12, { steps: 5 });
  for (const dy of [35, before.height - 12, 45]) {
    await page.mouse.move(before.x + before.width / 2, before.y + dy, { steps: 10 });
    await expect(target).toHaveClass(/sorted-drop/);
    const after = (await target.boundingBox())!;
    expect(after.height).toBeCloseTo(before.height, 0);
  }
  await page.keyboard.press('Escape'); await page.mouse.up();
});

test('#343 selected tags keep their order when the server changes the labels array', async ({ demo: page }) => {
  test.skip(process.env.PLAYWRIGHT_DEV !== '1', 'Controlled store scenario');
  await row(page, 'Rebuild the home page').locator('.ttitle').click();
  await page.evaluate(() => {
    const store = (window as unknown as { __store: Store }).__store, state = store.getState();
    const item = Object.values(state.snapshot.items).find(it => it.content === 'Rebuild the home page')!;
    store.setState({ snapshot: { ...state.snapshot, items: { ...state.snapshot.items, [item.id]: { ...item, labels: ['quick', 'week', 'waiting'] } } } });
  });
  const tags = page.locator('.detail-side .tagpill');
  const before = await tags.allTextContents();
  await page.evaluate(() => {
    const store = (window as unknown as { __store: Store }).__store, state = store.getState();
    const item = Object.values(state.snapshot.items).find(it => it.content === 'Rebuild the home page')!;
    store.setState({ snapshot: { ...state.snapshot, items: { ...state.snapshot.items, [item.id]: { ...item, labels: [...item.labels].reverse() } } } });
  });
  await expect(tags).toHaveText(before);
});

test('opening Quick add then Escape does not navigate or reload the project', async ({ demo: page }) => {
  await go(page, '#/project/site');
  await expect(page.locator('.screen.active')).toBeVisible();
  let reloads = 0;
  page.on('framenavigated', frame => { if (frame === page.mainFrame()) reloads += 1; });
  await page.keyboard.press('q');
  await expect(page.locator('.composerbox')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.composerbox')).toHaveCount(0);
  await page.waitForTimeout(4000);
  expect(reloads).toBe(0);
  await expect(page).toHaveURL(/#\/project\/site$/);
});

test('#349 the rectangle starts from the margins, the header and the gap under short columns', async ({ demo: page }) => {
  await board(page);
  const screen = (await page.locator('.screen.active').boundingBox())!;
  const col = (await page.locator('.board .col').first().boundingBox())!;
  const head = (await page.locator('.screen.active h1').first().boundingBox())!;
  const starts = [
    { x: screen.x + screen.width - 8, y: col.y + 60, name: 'right margin' },
    { x: screen.x + 8, y: col.y + 60, name: 'left margin' },
    { x: screen.x + screen.width / 2, y: head.y + head.height + 6, name: 'header' },
  ];
  for (const start of starts) {
    await page.mouse.move(start.x, start.y); await page.mouse.down();
    await page.mouse.move(col.x + col.width / 2, col.y + 90, { steps: 12 });
    await expect(page.locator('.board-selection-box'), start.name).toHaveCount(1);
    await expect(page.locator('.board .col').first().locator('[aria-selected="true"]'), start.name).not.toHaveCount(0);
    await page.mouse.up();
    await page.mouse.click(screen.x + screen.width - 8, col.y + 4);
    await expect(page.locator('.board [aria-selected="true"]'), `${start.name} cleared`).toHaveCount(0);
  }
});

test('#343 the task menu sets Deadline between two separators', async ({ demo: page }) => {
  await row(page, 'Rebuild the home page').click({ button: 'right' });
  const deadline = page.getByRole('button', { name: 'Deadline', exact: true });
  const [above, button, below] = await deadline.evaluate((node) => {
    const rule = (el: Element | null) => el?.tagName === 'HR';
    return [rule(node.previousElementSibling), node.tagName === 'BUTTON', rule(node.nextElementSibling)];
  });
  expect([above, button, below]).toEqual([true, true, true]);
  const mark = page.getByRole('button', { name: 'Open in Todoist' }).locator('svg');
  await expect(mark).toHaveCSS('stroke', 'none');
  const grey = await page.evaluate(() => {
    const probe = document.createElement('span');
    probe.style.color = 'var(--muted)';
    document.body.append(probe);
    const colour = getComputedStyle(probe).color;
    probe.remove();
    return colour;
  });
  await expect(mark).toHaveCSS('fill', grey);
});

test('#338 a typing comment frame is greyer, a long comment scrolls past the buttons', async ({ demo: page }) => {
  await row(page, 'Rebuild the home page').locator('.ttitle').click();
  const field = page.getByRole('textbox', { name: 'Comment', exact: true });
  const box = page.locator('.comment-new .comment-box');
  const idle = await box.evaluate((node) => getComputedStyle(node).borderColor);
  await field.fill(Array.from({ length: 14 }, (_, i) => `Line ${i + 1}`).join('\n'));
  await expect(field).toBeFocused();
  const typing = await box.evaluate((node) => getComputedStyle(node).borderColor);
  expect(typing).not.toBe(idle);
  await expect(box).toHaveCSS('box-shadow', 'none');
  await field.press('Escape');
  await expect(field).not.toBeFocused();
  await expect.poll(() => box.evaluate((node) => getComputedStyle(node).borderColor)).toBe(idle);
  const scroller = page.locator('.comment-new .comment-row');
  const sizes = await scroller.evaluate((node) => ({ scrolls: node.scrollHeight > node.clientHeight, overflow: getComputedStyle(node).overflowY }));
  expect(sizes).toEqual({ scrolls: true, overflow: 'auto' });
  const tools = (await page.locator('.comment-new .comment-tools').boundingBox())!, frame = (await scroller.boundingBox())!;
  expect(tools.x + tools.width).toBeLessThanOrEqual(frame.x + frame.width - 4);
  expect(tools.y + tools.height).toBeLessThanOrEqual(frame.y + frame.height + 1);
  await expect(page.locator('.comment-new .comment-field')).toHaveCSS('overflow-y', 'hidden');
});

test('a new version is announced once over the sidebar line, and floats where that line is hidden', async ({ demo: page }) => {
  test.skip(process.env.PLAYWRIGHT_DEV !== '1', 'Controlled store scenario');
  const offer = () => page.evaluate(() => (window as unknown as { __offerUpdate: () => void }).__offerUpdate());
  const applied = () => page.evaluate(() => (window as unknown as { __updateApplied?: boolean }).__updateApplied);
  await expect(page.locator('.updatebtn, .updatecard')).toHaveCount(0);
  await offer();
  const line = page.locator('.updatebtn').first();
  const card = page.locator('.updatecard:not(.floating)');
  await expect(line).toBeVisible();
  await expect(card).toBeVisible();
  await expect(card).toContainText('New version available');
  await expect(page.locator('.toast')).toHaveCount(0);
  await expect(page.locator('.updatecard.floating')).toHaveCount(0);
  // The card points at the line: it sits right above it, as wide as it.
  const [c, l] = [(await card.boundingBox())!, (await line.boundingBox())!];
  expect(c.y + c.height).toBeLessThan(l.y);
  expect(Math.abs(c.x - l.x)).toBeLessThan(2);
  // Typing carries on: the card never takes the keyboard.
  await expect(card.locator(':focus')).toHaveCount(0);
  await card.getByRole('button', { name: 'Later' }).click();
  await expect(page.locator('.updatecard')).toHaveCount(0);
  await expect(line).toBeVisible();
  expect(await applied()).toBeUndefined();
  await line.click();
  expect(await applied()).toBe(true);
});

test('the floating announcement on a phone and with a collapsed sidebar', async ({ demo: page }) => {
  test.skip(process.env.PLAYWRIGHT_DEV !== '1', 'Controlled store scenario');
  await page.getByRole('button', { name: 'Collapse sidebar' }).click();
  await page.evaluate(() => (window as unknown as { __offerUpdate: () => void }).__offerUpdate());
  const floating = page.locator('.updatecard.floating');
  await expect(floating).toBeVisible();
  await expect(page.getByRole('button', { name: 'Show sidebar' }).locator('.belldot')).toHaveCount(1);
  await page.getByRole('button', { name: 'Show sidebar' }).click();
  await expect(floating).toHaveCount(0);
  await expect(page.locator('.updatecard:not(.floating)')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(floating).toBeVisible();
  const [card, nav] = [(await floating.boundingBox())!, (await page.locator('.mobile-nav').boundingBox())!];
  expect(card.y + card.height).toBeLessThanOrEqual(nav.y - 8);
  await expect(page.getByRole('button', { name: 'Open navigation' }).locator('.belldot')).toHaveCount(1);
  await floating.getByRole('button', { name: 'Later' }).click();
  await expect(floating).toHaveCount(0);
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.locator('.browse .updatebtn')).toBeVisible();
  await expect(page.locator('.browse .updatecard')).toHaveCount(0);
});

test('#347 a task two days late or more says how late, with the date in its tooltip', async ({ demo: page }) => {
  test.skip(process.env.PLAYWRIGHT_DEV !== '1', 'Controlled store scenario');
  const store = await page.evaluate(() => {
    const state = (window as unknown as { __store: Store }).__store.getState();
    const day = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
    const ids = Object.values(state.snapshot.items).filter((i) => !i.checked && !i.parent_id).slice(0, 4).map((i) => i.id);
    [1, 3, 20, 90].forEach((n, k) => { const it = state.snapshot.items[ids[k]]; it.due = { date: day(n), string: '', lang: 'en', is_recurring: false, timezone: null }; });
    (window as unknown as { __store: Store }).__store.setState({ snapshot: { ...state.snapshot, items: { ...state.snapshot.items } } });
    return ids.map((id) => state.snapshot.items[id].content);
  });
  await go(page, 'week');
  const chip = (title: string) => row(page, title).locator('.late');
  await expect(chip(store[0])).toHaveText('Yesterday');
  await expect(chip(store[1])).toHaveText('3d late');
  await expect(chip(store[2])).toHaveText('20d late');
  await expect(chip(store[3])).toHaveText('90d late');
  await expect(chip(store[1]).locator('[title]')).toHaveAttribute('title', /\S/);
});

test('#339 an opened subtask says so above its title and opens its parent', async ({ demo: page }) => {
  test.skip(process.env.PLAYWRIGHT_DEV !== '1', 'Controlled store scenario');
  const sub = await page.evaluate(() => {
    const items = Object.values((window as unknown as { __store: Store }).__store.getState().snapshot.items);
    const child = items.find((i) => i.parent_id && !i.checked && !items.find((p) => p.id === i.parent_id)?.parent_id)!;
    return { id: child.id, title: child.content, parent: child.parent_id!, project: child.project_id };
  });
  await go(page, `#/project/${sub.project}`);
  await page.locator(`.screen.active [data-task-id="${sub.parent}"] .ttitle`).first().click();
  const shown = page.locator('.crumbself .crumbhere');
  const parentTitle = (await shown.innerText()).trim();
  await expect(page.locator('.subtaskof')).toHaveCount(0);
  await page.locator('.subtasktitle').filter({ hasText: sub.title.slice(0, 10) }).first().click();
  const line = page.locator('.subtaskof');
  await expect(line).toContainText('Subtask of');
  await expect(line.getByRole('button')).toHaveText(parentTitle);
  await line.getByRole('button').click();
  await expect(shown).toHaveText(parentTitle);
  await expect(page.locator('.subtaskof')).toHaveCount(0);
});
