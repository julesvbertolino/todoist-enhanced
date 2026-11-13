import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const { version: VERSION } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string };

test.use({ serviceWorkers: 'allow' });
test.skip(process.env.PLAYWRIGHT_DEV === '1', 'Offline reload requires the production service worker.');

test('closing setup and choosing estimate storage completes setup, including offline reload', async ({ page, context }) => {
  const marker = 'Enhanced for Todoist · settings (edited by the app, please leave as is)';
  let content = `${marker}\n\n${JSON.stringify({ onboarded: true, setupDone: false, estimateStorage: null, seenVersion: VERSION })}`;
  let syncRequests = 0;
  const user = { id: 'account-test', full_name: 'Test User', inbox_project_id: 'inbox', is_premium: true, karma: 0 };
  const note = () => ({ id: 'settings', project_id: 'inbox', item_id: null, content, posted_at: '2026-01-01T00:00:00Z', posted_uid: user.id, is_deleted: false, file_attachment: null });
  await page.addInitScript(() => {
    localStorage.setItem('tde.token', 'test_token_not_a_real_credential');
    localStorage.setItem('onboarded', JSON.stringify(['account-test']));
  });
  await page.route('https://api.todoist.com/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/sync')) {
      syncRequests += 1;
      const form = new URLSearchParams(route.request().postData() ?? '');
      const commands = JSON.parse(form.get('commands') ?? '[]') as Array<{ uuid: string; type: string; args: { content?: string } }>;
      for (const command of commands) if (command.type === 'note_update' && command.args.content) content = command.args.content;
      await route.fulfill({ json: { sync_token: 'sync-token', full_sync: true, user, project_notes: [note()], projects: [{ id: 'inbox', name: 'Inbox', inbox_project: true, color: 'grey', child_order: 1 }], items: [], sections: [], labels: [], filters: [], workspaces: [], sync_status: Object.fromEntries(commands.map((command) => [command.uuid, 'ok'])) } });
      return;
    }
    if (url.pathname.endsWith('/comments')) {
      await route.fulfill({ json: { results: [note()], next_cursor: null } });
      return;
    }
    await route.fulfill({ json: { results: [], next_cursor: null } });
  });
  await page.goto('/');
  const setup = page.getByRole('dialog', { name: 'Setting up' });
  await expect(setup).toBeVisible();
  await page.keyboard.press('Escape');
  const storage = page.getByRole('dialog', { name: 'Where to store estimates' });
  await expect(storage).toBeVisible();
  await storage.getByRole('button', { name: 'Save this choice' }).click();
  await expect(storage).not.toBeVisible();
  await expect.poll(() => content).toContain('"setupDone":true');
  /* An offline reload is served by the service worker, which installs after the first load and
     controls the page only from the next one: wait for it, and load once online, so the test does
     not race the worker's installation. */
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'This week', exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  const beforeOffline = syncRequests;
  await context.setOffline(true);
  try {
    await page.reload();
    await expect(page.getByRole('heading', { name: 'This week', exact: true })).toBeVisible();
    await expect(setup).not.toBeVisible();
  } finally { await context.setOffline(false); }
  await expect.poll(() => syncRequests).toBeGreaterThan(beforeOffline);
  await expect(setup).not.toBeVisible();
});
