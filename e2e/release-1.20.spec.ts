import { test as accountTest } from '@playwright/test';
import { item } from '../src/test/items';
import { VERSION } from '../src/app-info';
import { test, expect, go, row } from './demo';

test('estimate conversion previews, converts and becomes idempotent in both directions', async ({ demo: page }) => {
  await go(page, '#/settings');
  await page.getByRole('radio', { name: 'As a Todoist duration', exact: true }).click();
  await expect(page.getByRole('radio', { name: 'As a Todoist duration', exact: true })).toHaveAttribute('aria-checked', 'true');
  await page.screenshot({ path: '../../outputs/estimate-storage-1.20.png' });
  await page.getByRole('button', { name: /Convert \d+ open estimates to durations/ }).click();
  const preview = page.getByRole('dialog', { name: 'Preview estimate conversion' });
  await expect(preview).toContainText('Completed tasks are excluded.');
  await preview.getByRole('button', { name: 'Convert these tasks' }).click();
  await expect(preview.getByRole('status')).toContainText('verified');
  await page.screenshot({ path: '../../outputs/estimate-conversion-1.20.png' });
  await preview.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Convert 0 open estimates to durations' })).toBeDisabled();
  await page.getByRole('radio', { name: 'As a tag', exact: true }).click();
  await page.getByRole('button', { name: /Convert \d+ open estimates to tags/ }).click();
  await preview.getByRole('button', { name: 'Convert these tasks' }).click();
  await expect(preview.getByRole('status')).toContainText('verified');
  await preview.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Convert 0 open estimates to tags' })).toBeDisabled();
});

test('shorthand creates an estimated task in duration mode without asking the demo again', async ({ demo: page }) => {
  await go(page, '#/settings');
  await page.getByRole('radio', { name: 'As a Todoist duration', exact: true }).click();
  await go(page, '#/inbox');
  await page.keyboard.press('q');
  await page.locator('.composer-name').fill('Duration sample (25)');
  await page.getByRole('dialog', { name: 'Add task' }).getByRole('button', { name: 'Add task', exact: true }).click();
  await expect(row(page, 'Duration sample')).toContainText('25');
  await go(page, '#/settings');
  await expect(page.getByRole('button', { name: /Convert \d+ open estimates to durations/ })).not.toContainText('0 open');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('storage and calendar warnings stay visible on a phone', async ({ demo: page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await go(page, '#/settings');
  await expect(page.getByText('Estimates stay independent from calendar blocks. Works on every plan.')).toBeVisible();
  await page.getByRole('radio', { name: 'As a Todoist duration', exact: true }).click();
  await expect(page.getByText(/On timed tasks, editing it resizes the calendar block/)).toBeVisible();
});

test('selected tasks receive an estimate together and a background click clears them', async ({ demo: page }) => {
  await go(page, '#/project/site');
  const picked = page.locator('.screen.active [data-task-id]').filter({ hasNot: page.locator('.subprogress') });
  const first = picked.nth(0); const second = picked.nth(1);
  await first.click({ modifiers: ['ControlOrMeta'] });
  await second.click({ modifiers: ['ControlOrMeta'] });
  const toolbar = page.getByRole('toolbar');
  await toolbar.getByRole('button', { name: 'Duration', exact: true }).click();
  await page.locator('.bulk-estimate input').fill('1h15');
  await page.getByRole('button', { name: 'Apply to selection' }).click();
  await expect(toolbar).toContainText('2 selected');
  await expect(page.locator('.screen.active [data-task-id][aria-selected="true"]')).toHaveCount(2);
  await expect(page.locator('.screen.active [data-task-id][aria-selected="true"]').first()).toContainText('1 h 15');
  await expect(page.locator('.screen.active [data-task-id][aria-selected="true"]').last()).toContainText('1 h 15');
  await page.locator('body').click({ position: { x: 5, y: 5 } });
  await expect(toolbar).toHaveCount(0);
});

test('a new tag can be created and attached from task details', async ({ demo: page }) => {
  await go(page, '#/inbox');
  await page.locator('.screen.active [data-task-id] .ttitle').first().click();
  const detail = page.getByRole('dialog', { name: 'Task', exact: true });
  await detail.getByRole('button', { name: 'Tags', exact: true }).click();
  const picker = detail.getByRole('dialog', { name: 'Tags', exact: true });
  await picker.getByRole('textbox', { name: 'Search' }).fill('new test tag');
  await picker.getByRole('button', { name: 'Create “new-test-tag”' }).click();
  await expect(detail.locator('.pills')).toContainText('new-test-tag');
  await picker.getByRole('textbox', { name: 'Search' }).fill('new-test-tag');
  await expect(picker.getByRole('button', { name: /Create/ })).toHaveCount(0);
  await expect(picker.getByRole('checkbox')).toBeChecked();
});

accountTest('initial choice offers conversion, with verified and pending rows scoped to the conversion', async ({ page }) => {
  const tasks = Array.from({ length: 45 }, (_, i) => item({ id: `task-${i}`, content: `Estimate ${i}`, labels: ['est-25'] }));
  await page.route('https://api.todoist.com/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/sync')) {
      const form = new URLSearchParams(route.request().postData() ?? '');
      const commands = JSON.parse(form.get('commands') ?? '[]') as Array<{ uuid: string; type: string; args: Record<string, unknown> }>;
      for (const cmd of commands) {
        if (cmd.type === 'item_update') {
          const task = tasks.find((task) => task.id === cmd.args.id);
          if (task) Object.assign(task, cmd.args);
        }
      }
      await route.fulfill({ json: { sync_token: 'test', full_sync: commands.length === 0,
        user: { id: 'account-test', full_name: 'Test', email: 'test@example.test', inbox_project_id: 'inbox', start_day: 1, is_premium: true, tz_info: { timezone: 'Europe/Paris', hours: 1, minutes: 0, is_dst: 0 } },
        items: commands.length ? [] : tasks,
        projects: [{ id: 'inbox', name: 'Inbox', inbox_project: true, color: 'charcoal', child_order: 1 }],
        sync_status: Object.fromEntries(commands.map((cmd) => [cmd.uuid, 'ok'])),
      } });
    } else if (url.pathname.includes('/tasks/')) {
      const id = url.pathname.split('/').pop();
      if (id === 'task-44') await route.abort('failed');
      else await route.fulfill({ json: tasks.find((task) => task.id === id) });
    } else await route.fulfill({ json: { results: [], next_cursor: null } });
  });
  await page.goto('/');
  await page.evaluate(async (version) => {
    localStorage.setItem('tde.token', 'fictitious-test-token-only');
    localStorage.setItem('onboarded', JSON.stringify(['account-test']));
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open('todoist-enhancements', 1); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    const tx = db.transaction('prefs', 'readwrite');
    tx.objectStore('prefs').put({ locale: 'en', onboarded: true, setupDone: true, seenVersion: version, estimateStorage: null }, 'preferences');
    await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
    db.close();
  }, VERSION);
  await page.reload();
  const choice = page.getByRole('dialog', { name: 'Where to store estimates', exact: true });
  await expect(choice).toBeVisible();
  await expect(choice.getByRole('radio', { name: 'As a Todoist duration', exact: true })).toContainText('Recommended');
  await choice.getByRole('radio', { name: 'As a Todoist duration', exact: true }).click();
  await expect(choice.getByRole('radio', { name: 'As a Todoist duration', exact: true })).toHaveAttribute('aria-checked', 'true');
  await choice.getByRole('button', { name: 'Save and preview conversion' }).click();
  const preview = page.getByRole('dialog', { name: 'Preview estimate conversion', exact: true });
  await preview.getByRole('button', { name: 'Convert these tasks' }).click();
  await expect(preview.locator('li[data-state="done"]')).toHaveCount(44);
  await expect(preview.locator('li[data-state="queued"]')).toHaveCount(1);
  await expect(preview.getByRole('status')).toContainText('44 / 45 verified');
  await expect(preview.getByRole('status')).toContainText('1 pending');
});

test('bulk selection creates and attaches a tag to every selected task', async ({ demo: page }) => {
  await go(page, '#/project/site');
  const tasks = page.locator('.screen.active [data-task-id]');
  await tasks.nth(0).click({ modifiers: ['ControlOrMeta'] });
  await tasks.nth(1).click({ modifiers: ['ControlOrMeta'] });
  await page.getByRole('toolbar').getByRole('button', { name: 'Tags', exact: true }).click();
  const menu = page.getByRole('menu', { name: 'Tags', exact: true });
  await menu.getByRole('textbox', { name: 'Search' }).fill('bulk-new-tag');
  await menu.getByRole('button', { name: 'Create “bulk-new-tag”' }).click();
  await expect(menu.getByRole('checkbox').last()).toBeChecked();
  await page.keyboard.press('Escape');
  await expect(page.locator('.screen.active [data-task-id][aria-selected="true"]').first()).toContainText('bulk-new-tag');
  await expect(page.locator('.screen.active [data-task-id][aria-selected="true"]').last()).toContainText('bulk-new-tag');
});

test('the composer creates a tag; Display only filters by the tags that exist', async ({ demo: page }) => {
  await go(page, '#/inbox');
  await page.keyboard.press('q');
  const composer = page.getByRole('dialog', { name: 'Add task', exact: true });
  await page.locator('.composer-name').fill('Tagged sample');
  await composer.getByRole('button', { name: 'Tag', exact: true }).click();
  const picker = composer.getByRole('dialog', { name: 'Tags', exact: true });
  await picker.getByRole('textbox', { name: 'Search' }).fill('composer-new-tag');
  await picker.getByRole('button', { name: 'Create “composer-new-tag”' }).click();
  await page.keyboard.press('Escape');
  await composer.getByRole('button', { name: 'Add task', exact: true }).click();
  await expect(row(page, 'Tagged sample')).toContainText('composer-new-tag');
});
