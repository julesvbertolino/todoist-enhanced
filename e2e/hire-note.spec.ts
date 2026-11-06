import { test, expect, type Page } from '@playwright/test';
import { item } from '../src/test/items';
import { readFileSync } from 'node:fs';

const { version: VERSION } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string };

/** A connected account whose address is `email`, already through every first run. */
async function openAs(page: Page, email: string, hireNoteSeen = false) {
  const day = (offset: number) => ({ date: new Date(Date.now() + offset * 864e5).toLocaleDateString('en-CA'), string: 'x', is_recurring: false, timezone: null, lang: 'en' });
  const tasks = [
    item({ id: 'task-1', content: 'Review pull request', due: day(0) }),
    item({ id: 'task-2', content: 'Plan the trip', due: day(3) }),
    item({ id: 'task-3', content: 'Sort the photos' }),
  ];
  await page.route('https://api.todoist.com/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/sync')) {
      await route.fulfill({ json: { sync_token: 'test', full_sync: true,
        user: { id: 'account-test', full_name: 'Test', email, inbox_project_id: 'inbox', start_day: 1, is_premium: true, tz_info: { timezone: 'Europe/Paris', hours: 1, minutes: 0, is_dst: 0 } },
        items: tasks,
        projects: [{ id: 'inbox', name: 'Inbox', inbox_project: true, color: 'charcoal', child_order: 1 }],
        sync_status: {},
      } });
    } else await route.fulfill({ json: { results: [], next_cursor: null } });
  });
  await page.goto('/');
  await page.evaluate(async ({ version, seen }) => {
    localStorage.setItem('tde.token', 'fictitious-test-token-only');
    localStorage.setItem('onboarded', JSON.stringify(['account-test']));
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open('todoist-enhancements', 1); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    const tx = db.transaction('prefs', 'readwrite');
    tx.objectStore('prefs').put({ locale: 'en', onboarded: true, setupDone: true, pomodoroAsked: true, seenVersion: version, estimateStorage: 'tag', eisenhowerEnabled: true, hireNoteSeen: seen }, 'preferences');
    await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
    db.close();
  }, { version: VERSION, seen: hireNoteSeen });
  await page.reload();
}

test('a Todoist address sees the note once, on Today, and it opens like a task', async ({ page }) => {
  await openAs(page, 'someone@todoist.com');
  await page.goto('/#/today');
  const note = page.locator('.hirenote');
  await expect(note).toContainText('Hire Jules at Todoist');
  await note.click();
  const dialog = page.getByRole('dialog', { name: 'Hire Jules at Todoist' });
  await expect(dialog.getByRole('link', { name: 'Email' })).toHaveAttribute('href', /^mailto:jules\.bertolino@alias-digital\.fr\?subject=/);
  await expect(dialog.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute('href', 'https://www.linkedin.com/in/julesbertolino/');
  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(dialog).toHaveCount(0);
  // The cross closes the card; the note stays until it is ticked or dismissed.
  await expect(note).toHaveCount(1);
  await note.getByRole('button', { name: 'Dismiss' }).click();
  await expect(note).toHaveCount(0);

  // Once means once: a reload does not bring it back.
  await page.reload();
  await expect(page.locator('.screen.active .page')).toBeVisible();
  await expect(page.locator('.hirenote')).toHaveCount(0);
});

test('ticking the note puts it away', async ({ page }) => {
  await openAs(page, 'Someone@Doist.com');
  await page.goto('/#/today');
  await page.locator('.hirenote [role="checkbox"]').click();
  await expect(page.locator('.hirenote')).toHaveCount(0);
});

test('nobody else sees it', async ({ page }) => {
  await openAs(page, 'someone@example.test');
  await page.goto('/#/today');
  await expect(page.locator('.screen.active .page')).toBeVisible();
  await expect(page.locator('.hirenote')).toHaveCount(0);
});

test('an account that has already seen it does not see it again', async ({ page }) => {
  await openAs(page, 'someone@todoist.com', true);
  await page.goto('/#/today');
  await expect(page.locator('.screen.active .page')).toBeVisible();
  await expect(page.locator('.hirenote')).toHaveCount(0);
});

test('wherever it opens, the note is on the page, and on This week it sits in the Today group', async ({ page }) => {
  await openAs(page, 'someone@todoist.com');
  await page.goto('/#/week');
  const note = page.locator('.screen.active .hirenote');
  await expect(note).toHaveCount(1);
  await expect(page.locator('.screen.active .group', { hasText: 'Today' }).locator('.hirenote')).toHaveCount(1);
  for (const route of ['someday', 'upcoming', 'inbox', 'labels', 'filters', 'review', 'insights', 'settings']) {
    await page.goto(`/#/${route}`);
    await expect(page.locator('.screen.active .hirenote'), route).toHaveCount(1);
  }
});

test('the note lines up with the tasks around it', async ({ page }) => {
  await openAs(page, 'someone@todoist.com');
  await page.goto('/#/week');
  const note = page.locator('.screen.active .hirenote');
  await expect(note).toBeVisible();
  const task = page.locator('.screen.active [data-task-id]').first();
  const [a, b] = await Promise.all([note.boundingBox(), task.boundingBox()]);
  expect(Math.abs((a?.x ?? 0) - (b?.x ?? 99))).toBeLessThan(1);
  expect(Math.abs((a?.width ?? 0) - (b?.width ?? 99))).toBeLessThan(1);
});

test('on the task pages the note is a row of a section, never a banner above them', async ({ page }) => {
  await openAs(page, 'someone@todoist.com');
  for (const route of ['upcoming', 'someday', 'inbox']) {
    await page.goto(`/#/${route}`);
    await expect(page.locator('.screen.active .group .hirenote'), route).toHaveCount(1);
    await expect(page.locator('.screen.active .phead + .hirenote, .screen.active .metrics + .hirenote'), route).toHaveCount(0);
  }
  await page.goto('/#/matrix');
  await expect(page.locator('.screen.active .quadrant').first().locator('.taskwrap .hirenote')).toHaveCount(1);
});

test('the email pill copies the address and says so', async ({ page }) => {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await openAs(page, 'someone@todoist.com');
  await page.goto('/#/today');
  await page.locator('.hirenote').click();
  const dialog = page.getByRole('dialog', { name: 'Hire Jules at Todoist' });
  await dialog.locator('.hirepill-mail').hover();
  await dialog.getByRole('button', { name: 'Copy the email address' }).click();
  await expect(dialog.getByText('Copied')).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('jules.bertolino@alias-digital.fr');
});

test('email pill has no spare room on the right at rest', async ({ page }) => {
  await openAs(page, 'someone@todoist.com');
  await page.goto('/#/today');
  await page.locator('.hirenote').click();
  const pill = page.locator('.hirepill-mail');
  const link = pill.locator('a');
  const [p, l] = await Promise.all([pill.boundingBox(), link.boundingBox()]);
  // Padding is 12px a side: the link ends 12px before the pill does, not more.
  expect(Math.round((p!.x + p!.width) - (l!.x + l!.width))).toBe(12);
});
