import { expect, go, test } from './demo';

test('Review stops mutating classes while idle', async ({ demo: page }) => {
  await go(page, '#/review');
  await expect(page.locator('.reviewactions').first()).toBeVisible();
  await page.waitForTimeout(500);
  const mutations = await page.evaluate(() => new Promise<number>((resolve) => {
    let count = 0;
    const observer = new MutationObserver((records) => { count += records.length; });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'], subtree: true });
    setTimeout(() => { observer.disconnect(); resolve(count); }, 1000);
  }));
  expect(mutations).toBeLessThan(10);
});

test('long task names keep their highlight aligned after horizontal scrolling', async ({ demo: page }) => {
  await page.keyboard.press('q');
  const field = page.locator('.namefield input').first();
  await expect(field).toBeVisible();
  await field.fill('A very long task name '.repeat(12) + ' tomorrow');
  await field.press('End');
  await expect.poll(() => field.evaluate((input) => {
    const mirror = input.parentElement?.querySelector<HTMLElement>('.namemirror');
    return mirror ? Math.abs(mirror.scrollLeft - input.scrollLeft) : Number.POSITIVE_INFINITY;
  })).toBeLessThanOrEqual(1);
});

test('text entered while the description editor loads is retained', async ({ demo: page }) => {
  test.skip(process.env.PLAYWRIGHT_DEV !== '1', 'The development module is delayed explicitly');
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/src/components/MarkdownEditor.tsx*', async (route) => { await gate; await route.continue(); });
  await page.locator('.screen.active [data-task-id]').first().locator('.ttitle').click();
  await page.locator('.descview').click();
  const fallback = page.locator('.descedit.detail textarea');
  await expect(fallback).toBeFocused();
  await fallback.fill('Text entered before the editor arrived');
  release();
  const editor = page.locator('.descedit.detail .cm-content');
  await expect(editor).toHaveText('Text entered before the editor arrived');
  await expect(editor).toBeFocused();
});

test('a link shortcut pressed while the editor loads opens with the selected text', async ({ demo: page }) => {
  test.skip(process.env.PLAYWRIGHT_DEV !== '1', 'The development module is delayed explicitly');
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/src/components/MarkdownEditor.tsx*', async (route) => { await gate; await route.continue(); });
  await page.locator('.screen.active [data-task-id]').first().locator('.ttitle').click();
  await page.locator('.descview').click();
  const fallback = page.locator('.descedit.detail textarea');
  await expect(fallback).toBeFocused();
  await fallback.fill('selected words');
  await fallback.press('ControlOrMeta+a');
  await fallback.press('ControlOrMeta+k');
  await expect(page.getByRole('dialog', { name: 'Search', exact: true })).toHaveCount(0);
  release();
  const link = page.getByRole('dialog', { name: 'Link', exact: true });
  await expect(link).toBeVisible();
  await expect(link.getByRole('textbox', { name: 'Text to display' })).toHaveValue('selected words');
});

test('Escape saves a description while the editor is still loading', async ({ demo: page }) => {
  test.skip(process.env.PLAYWRIGHT_DEV !== '1', 'The development module is delayed explicitly');
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/src/components/MarkdownEditor.tsx*', async (route) => { await gate; await route.continue(); });
  await page.locator('.screen.active [data-task-id]').first().locator('.ttitle').click();
  await page.locator('.descview').click();
  const fallback = page.locator('.descedit.detail textarea');
  await fallback.fill('Saved before loading');
  await fallback.press('Escape');
  await expect(page.locator('.descview')).toHaveText('Saved before loading');
  release();
});

test('data changes still reach task rows when the sync timestamp changes', async ({ demo: page }) => {
  test.skip(process.env.PLAYWRIGHT_DEV !== '1', 'The simulated sync uses the development store');
  const id = await page.locator('.screen.active [data-task-id]').first().getAttribute('data-task-id');
  expect(id).toBeTruthy();
  await page.evaluate((taskId) => {
    const store = (window as unknown as { __store: { getState(): { snapshot: { items: Record<string, Record<string, unknown>>; syncedAt: number } }; setState(patch: unknown): void } }).__store;
    const snapshot = store.getState().snapshot;
    store.setState({ snapshot: { ...snapshot, syncedAt: Date.now(), items: { ...snapshot.items, [taskId!]: { ...snapshot.items[taskId!], content: 'Changed by another device' } } } });
  }, id);
  await expect(page.locator(`[data-task-id="${id}"] .ttitle`).first()).toHaveText('Changed by another device');
  await page.evaluate(() => {
    const store = (window as unknown as { __store: { getState(): { snapshot: { syncedAt: number } }; setState(patch: unknown): void } }).__store;
    const snapshot = store.getState().snapshot;
    store.setState({ snapshot: { ...snapshot, syncedAt: Date.now() + 1000 } });
  });
  await expect(page.locator(`[data-task-id="${id}"] .ttitle`).first()).toHaveText('Changed by another device');
});

test('emoji picker loads the needed language and keeps bilingual French search', async ({ demo: page }) => {
  test.skip(process.env.PLAYWRIGHT_DEV !== '1', 'Checks development module requests');
  const requests: string[] = [];
  page.on('request', (request) => { if (request.url().includes('emojibase-data/')) requests.push(request.url()); });
  await go(page, '#/project/site');
  const taskId = await page.locator('.screen.active [data-task-id]').first().getAttribute('data-task-id');
  await page.locator(`.screen.active [data-task-id="${taskId}"] .ttitle`).first().click();
  const dialog = page.getByRole('dialog', { name: 'Task', exact: true });
  await dialog.getByRole('textbox', { name: 'Comment' }).fill('A comment for emoji');
  await dialog.getByRole('button', { name: 'Send comment' }).click();
  const comment = dialog.locator('.comment[data-note-id]').last();
  await comment.hover();
  await comment.getByRole('button', { name: 'Add a reaction' }).click();
  await expect(page.locator('.emojipalette').getByRole('textbox', { name: 'Search emoji' })).toBeVisible();
  await expect.poll(() => requests.some((url) => url.includes('/en/compact.json'))).toBe(true);
  expect(requests.some((url) => url.includes('/fr/compact.json'))).toBe(false);
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    const store = (window as unknown as { __store: { getState(): { setPrefs(prefs: { locale: string }): void } } }).__store;
    store.getState().setPrefs({ locale: 'fr' });
  });
  const frenchComment = page.locator('.comment[data-note-id]').last();
  await frenchComment.hover();
  await frenchComment.getByRole('button', { name: 'Réagir' }).click();
  const search = page.locator('.emojipalette').getByRole('textbox', { name: 'Chercher un emoji' });
  await search.fill('heart');
  await expect(page.locator('.emojipalette [role="option"]').first()).toBeVisible();
  await search.fill('coeur');
  await expect(page.locator('.emojipalette [role="option"]').first()).toBeVisible();
  await expect.poll(() => requests.some((url) => url.includes('/fr/compact.json'))).toBe(true);
});
