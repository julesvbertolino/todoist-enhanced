import { test, expect, type Page } from '@playwright/test';
import { item } from '../src/test/items';
import { readFileSync } from 'node:fs';

const { version: VERSION } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string };

/** A connected account, set up and through every first run, with the given projects. */
async function openAccount(page: Page, projects: Array<Record<string, unknown>>, seenVersion = VERSION) {
  await page.route('https://api.todoist.com/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/sync')) {
      await route.fulfill({ json: { sync_token: 'test', full_sync: true,
        user: { id: 'account-test', full_name: 'Test', email: 'someone@example.test', inbox_project_id: 'inbox', start_day: 1, is_premium: true, tz_info: { timezone: 'Europe/Paris', hours: 1, minutes: 0, is_dst: 0 } },
        items: [item({ id: 'task-1', content: 'A task' })],
        projects: [{ id: 'inbox', name: 'Inbox', inbox_project: true, color: 'charcoal', child_order: 1 }, ...projects],
        sync_status: {},
      } });
    } else await route.fulfill({ json: { results: [], next_cursor: null } });
  });
  await page.goto('/');
  await page.evaluate(async (version) => {
    localStorage.setItem('tde.token', 'fictitious-test-token-only');
    localStorage.setItem('onboarded', JSON.stringify(['account-test']));
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open('todoist-enhancements', 1); request.onupgradeneeded = () => { const d = request.result; for (const [name, options] of [['snapshot', undefined], ['prefs', undefined], ['queue', { keyPath: 'uuid' }]] as const) if (!d.objectStoreNames.contains(name)) d.createObjectStore(name, options); }; request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    const tx = db.transaction('prefs', 'readwrite');
    tx.objectStore('prefs').put({ locale: 'en', onboarded: true, setupDone: true, seenVersion: version, estimateStorage: 'tag', hireNoteSeen: true }, 'preferences');
    await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
    db.close();
  }, seenVersion);
  await page.reload();
}

const manyProjects = (count: number) => Array.from({ length: count }, (_, i) => ({
  id: `p${i}`, name: `Project ${i + 1}`, color: 'charcoal', child_order: i + 2, is_archived: false, is_deleted: false, parent_id: null,
}));

test('every project is reachable by scrolling the sidebar, whatever the window height (#213)', async ({ page }) => {
  for (const height of [520, 700, 900]) {
    await page.setViewportSize({ width: 1200, height });
    await openAccount(page, manyProjects(14));
    const scroller = page.locator('.sidebar .side-scroll');
    await expect(scroller).toBeVisible();
    await scroller.evaluate((node) => { node.scrollTop = node.scrollHeight; });
    const last = page.locator('.sidebar .navitem', { hasText: 'Project 14' });
    await expect(last).toBeVisible();
    const [box, foot] = await Promise.all([last.boundingBox(), page.locator('.sidebar .side-foot').boundingBox()]);
    expect(box!.y + box!.height, `at ${height}px the last project is under the Add task area`).toBeLessThanOrEqual(foot!.y + 1);
  }
});

/* ---- #204: the Mac app ---------------------------------------------------- */

const REPO = 'https://github.com/julesvbertolino/todoist-enhanced-desktop';
const ARM = `${REPO}/releases/latest/download/Enhanced-for-Todoist-arm64.dmg`;
const INTEL = `${REPO}/releases/latest/download/Enhanced-for-Todoist-x64.dmg`;

/** Makes the browser say which computer it is on, before the app reads it. */
async function pretend(page: Page, machine: { platform: string; uaPlatform?: string; architecture?: string; touch?: number; desktopApp?: boolean }) {
  await page.addInitScript((m) => {
    Object.defineProperty(navigator, 'platform', { get: () => m.platform });
    Object.defineProperty(navigator, 'maxTouchPoints', { get: () => m.touch ?? 0 });
    Object.defineProperty(navigator, 'userAgentData', {
      get: () => m.uaPlatform ? { platform: m.uaPlatform, getHighEntropyValues: async () => ({ architecture: m.architecture }) } : undefined,
    });
    // The shell's preload adds it on DOMContentLoaded, so possibly after the first render.
    if (m.desktopApp) window.addEventListener('DOMContentLoaded', () => document.documentElement.classList.add('desktop-app'));
  }, machine);
}

test('a Mac that cannot say its chip: the line points at the app, and the button opens both files with the steps (#204)', async ({ page }) => {
  await pretend(page, { platform: 'MacIntel' });
  await page.goto('/');
  const line = page.locator('.macapp-line');
  await expect(line).toBeVisible();
  await expect(line.getByRole('link', { name: 'Download and install' })).toHaveAttribute('href', REPO);
  await expect(line.locator('a[href$=".dmg"]')).toHaveCount(0);

  await openAccount(page, []);
  await page.goto('/#/settings');
  const card = page.locator('.macapp');
  await expect(card).toContainText('Option + Space');
  // Nothing downloads from the button itself, and the call-out starts closed.
  const button = card.getByRole('button', { name: 'Download for Mac' });
  await expect(button).toHaveAttribute('aria-expanded', 'false');
  await expect(card.locator('a[href$=".dmg"]:visible')).toHaveCount(0);
  await button.click();
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  const callout = card.locator('.maccallout');
  await expect(callout.getByRole('link', { name: 'Apple silicon (M1 and later)' })).toHaveAttribute('href', ARM);
  await expect(callout.getByRole('link', { name: 'Intel' })).toHaveAttribute('href', INTEL);
  await expect(callout).toContainText('Not sure? Apple menu, About This Mac');
  await expect(callout.locator('li')).toHaveCount(3);
  await expect(callout.locator('li').nth(0)).toContainText('drag Enhanced for Todoist into Applications');
  await expect(callout.locator('li').nth(1)).toContainText('click Done');
  await expect(callout.locator('li').nth(2)).toContainText('Open Anyway');
  await expect(callout.getByRole('link', { name: 'Details on GitHub' })).toHaveAttribute('href', `${REPO}#install-in-three-steps`);
});

test('opening the call-out scrolls it to the middle of the screen, and the button closes it again (#204)', async ({ page }) => {
  await pretend(page, { platform: 'MacIntel', uaPlatform: 'macOS', architecture: 'arm' });
  await openAccount(page, []);
  await page.setViewportSize({ width: 1200, height: 700 });
  await page.goto('/#/settings');
  const card = page.locator('.macapp');
  await card.getByRole('button', { name: 'Download for Mac' }).click();
  const callout = card.locator('.maccallout');
  await expect(callout).toBeVisible();
  await expect.poll(async () => {
    const box = (await callout.boundingBox())!;
    return Math.abs(box.y + box.height / 2 - 350);
  }, { message: 'the call-out is centred in the window' }).toBeLessThan(60);
  await card.getByRole('button', { name: 'Download for Mac' }).click();
  await expect(card.locator('a[href$=".dmg"]:visible')).toHaveCount(0);
});

test('Chrome on Apple silicon gets one Download button for the right file, and a way to the other (#204)', async ({ page }) => {
  await pretend(page, { platform: 'MacIntel', uaPlatform: 'macOS', architecture: 'arm' });
  await openAccount(page, []);
  await page.goto('/#/settings');
  const card = page.locator('.macapp');
  await card.getByRole('button', { name: 'Download for Mac' }).click();
  await expect(card.getByRole('link', { name: 'Download', exact: true })).toHaveAttribute('href', ARM);
  await expect(card.getByRole('link', { name: 'Other Mac (Intel / Apple silicon)' })).toHaveAttribute('href', `${REPO}/releases/latest`);
  await expect(card.getByRole('link', { name: 'Intel', exact: true })).toHaveCount(0);
});

test('Chrome on an Intel Mac gets the Intel file (#204)', async ({ page }) => {
  await pretend(page, { platform: 'MacIntel', uaPlatform: 'macOS', architecture: 'x86' });
  await openAccount(page, []);
  await page.goto('/#/settings');
  const card = page.locator('.macapp');
  await card.getByRole('button', { name: 'Download for Mac' }).click();
  await expect(card.getByRole('link', { name: 'Download', exact: true })).toHaveAttribute('href', INTEL);
});

for (const [name, machine] of [
  ['Windows', { platform: 'Win32', uaPlatform: 'Windows' }],
  ['Linux', { platform: 'Linux x86_64', uaPlatform: 'Linux' }],
  ['an iPhone', { platform: 'iPhone', touch: 5 }],
  ['an iPad that says it is a Mac', { platform: 'MacIntel', touch: 5 }],
] as const) {
  test(`${name} sees no download button, only the repository (#204)`, async ({ page }) => {
    await pretend(page, machine);
    await page.goto('/');
    await expect(page.locator('.connect-demo')).toBeVisible();
    await expect(page.locator('.macapp-line')).toHaveCount(0);

    await openAccount(page, []);
    await page.goto('/#/settings');
    const card = page.locator('.macapp');
    await expect(card.getByRole('link', { name: 'Mac app on GitHub' })).toHaveAttribute('href', REPO);
    await expect(card.locator('a[href$=".dmg"]')).toHaveCount(0);
  });
}

test('the desktop app itself shows neither the card nor the line (#204)', async ({ page }) => {
  await pretend(page, { platform: 'MacIntel', uaPlatform: 'macOS', architecture: 'arm', desktopApp: true });
  await page.goto('/');
  await expect(page.locator('.connect-demo')).toBeVisible();
  await expect(page.locator('.macapp-line')).toBeHidden();

  await openAccount(page, []);
  await page.goto('/#/settings');
  await expect(page.locator('#about')).toBeAttached();
  await expect(page.locator('.macapp')).toBeHidden();
});

/* ---- #194: who can access a project ---------------------------------------- */

const LOGO = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="#246fe0"/></svg>')}`;

type Sent = Array<{ type: string; args: Record<string, unknown> }>;

/** A connected account with one workspace, recording the commands the app sends. */
async function openWorkspaceAccount(page: Page, options: { refuse?: string } = {}) {
  const sent: Sent = [];
  const projects = [
    { id: 'inbox', name: 'Inbox', inbox_project: true, color: 'charcoal', child_order: 1 },
    { id: 'plain', name: 'Plain', color: 'charcoal', child_order: 2, access: { visibility: 'restricted', configuration: {} } },
    { id: 'client', name: 'Client work', color: 'blue', child_order: 3, workspace_id: 'w1', access: { visibility: 'team', configuration: {} } },
    { id: 'odd', name: 'Odd one', color: 'red', child_order: 4, workspace_id: 'w1', access: { visibility: 'organisation', configuration: {} } },
  ];
  await page.route('https://api.todoist.com/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    if (!url.pathname.endsWith('/sync')) return route.fulfill({ json: { results: [], next_cursor: null } });
    const commands = JSON.parse(new URLSearchParams(route.request().postData() ?? '').get('commands') ?? '[]') as Array<{ uuid: string; type: string; args: Record<string, unknown>; temp_id?: string }>;
    for (const command of commands) sent.push({ type: command.type, args: command.args });
    await route.fulfill({ json: {
      sync_token: 'test', full_sync: commands.length === 0,
      sync_status: Object.fromEntries(commands.map((command) => [command.uuid, options.refuse && command.args.access
        ? { error: options.refuse, error_code: 1, http_code: 403 } : 'ok'])),
      temp_id_mapping: Object.fromEntries(commands.filter((command) => command.temp_id && !(options.refuse && command.args.access)).map((command) => [command.temp_id!, `real-${command.temp_id}`])),
      ...(commands.length === 0 ? {
        user: { id: 'account-test', full_name: 'Test', email: 'someone@example.test', inbox_project_id: 'inbox', start_day: 1, is_premium: true, tz_info: { timezone: 'Europe/Paris', hours: 1, minutes: 0, is_dst: 0 } },
        workspaces: [{ id: 'w1', name: 'Studio', logo_big: LOGO, properties: { default_access_level: 'team' } }],
        items: [item({ id: 'task-1', content: 'A task' })],
        projects,
      } : {}),
    } });
  });
  await page.goto('/');
  await page.evaluate(async (version) => {
    localStorage.setItem('tde.token', 'fictitious-test-token-only');
    localStorage.setItem('onboarded', JSON.stringify(['account-test']));
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open('todoist-enhancements', 1); request.onupgradeneeded = () => { const d = request.result; for (const [name, options] of [['snapshot', undefined], ['prefs', undefined], ['queue', { keyPath: 'uuid' }]] as const) if (!d.objectStoreNames.contains(name)) d.createObjectStore(name, options); }; request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    const tx = db.transaction('prefs', 'readwrite');
    tx.objectStore('prefs').put({ locale: 'en', onboarded: true, setupDone: true, seenVersion: version, estimateStorage: 'tag', hireNoteSeen: true }, 'preferences');
    await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
    db.close();
  }, VERSION);
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.reload();
  await expect(page.locator('.sidebar .navitem', { hasText: 'Client work' })).toBeVisible();
  return sent;
}

async function editProject(page: Page, name: string) {
  const row = page.locator('.sidebar .navrow.sortable').filter({ hasText: name }).first();
  await row.hover();
  await row.getByRole('button', { name: 'Project actions' }).click();
  await page.getByRole('menuitem', { name: 'Edit project' }).click();
  return page.getByRole('dialog', { name: 'Edit project' });
}

const access = (sheet: ReturnType<Page['getByRole']>) => sheet.getByRole('radiogroup', { name: 'Who can access' });

test('a new workspace project is sent with its access only when it is not the workspace default (#194)', async ({ page }) => {
  const sent = await openWorkspaceAccount(page);
  await page.getByRole('button', { name: 'Add project' }).first().click();
  let sheet = page.getByRole('dialog', { name: 'New project' });
  await sheet.getByRole('button', { name: 'Workspace' }).click();
  await page.getByRole('option', { name: 'Studio' }).click();
  await expect(access(sheet).locator('strong')).toHaveText(['Restricted', 'Team', 'Public']);
  await expect(access(sheet).getByRole('radio', { name: 'Team' })).toBeChecked();
  await expect(sheet).toContainText('Everyone in the workspace can see and edit it.');
  await sheet.getByRole('textbox', { name: 'Project name' }).fill('Default access');
  await sheet.getByRole('button', { name: 'Add project', exact: true }).click();
  await expect(sheet).toHaveCount(0);
  await expect.poll(() => sent.find((c) => c.type === 'project_add')?.args.workspace_id).toBe('w1');
  expect(sent.find((c) => c.type === 'project_add')!.args).not.toHaveProperty('access');

  await page.getByRole('button', { name: 'Add project' }).first().click();
  sheet = page.getByRole('dialog', { name: 'New project' });
  await sheet.getByRole('button', { name: 'Workspace' }).click();
  await page.getByRole('option', { name: 'Studio' }).click();
  await access(sheet).getByRole('radio', { name: 'Restricted' }).click();
  await expect(sheet).toContainText('Only the people you invite to the project.');
  await sheet.getByRole('textbox', { name: 'Project name' }).fill('Invite only');
  await sheet.getByRole('button', { name: 'Add project', exact: true }).click();
  await expect.poll(() => sent.filter((c) => c.type === 'project_add').length).toBe(2);
  expect(sent.filter((c) => c.type === 'project_add')[1].args).toMatchObject({ name: 'Invite only', access: { visibility: 'restricted' } });
});

test('a personal project offers Restricted and Public, not Team (#194)', async ({ page }) => {
  const sent = await openWorkspaceAccount(page);
  await page.getByRole('button', { name: 'Add project' }).first().click();
  const sheet = page.getByRole('dialog', { name: 'New project' });
  await expect(access(sheet).locator('strong')).toHaveText(['Restricted', 'Public']);
  await expect(access(sheet).getByRole('radio', { name: 'Restricted' })).toBeChecked();
  await access(sheet).getByRole('radio', { name: 'Public' }).click();
  await expect(sheet).toContainText('Anyone with the link can see it.');
  await sheet.getByRole('textbox', { name: 'Project name' }).fill('Shared link');
  await sheet.getByRole('button', { name: 'Add project', exact: true }).click();
  await expect.poll(() => sent.find((c) => c.type === 'project_add')?.args.access).toEqual({ visibility: 'public' });
});

test('editing a project changes its access only when the choice changes (#194)', async ({ page }) => {
  const sent = await openWorkspaceAccount(page);
  let sheet = await editProject(page, 'Client work');
  await expect(access(sheet).getByRole('radio', { name: 'Team' })).toBeChecked();
  await sheet.getByRole('textbox', { name: 'Project name' }).fill('Client work 2');
  await sheet.getByRole('button', { name: 'Save' }).click();
  await expect.poll(() => sent.some((c) => c.type === 'project_update')).toBe(true);
  expect(sent.find((c) => c.type === 'project_update')!.args).not.toHaveProperty('access');

  sheet = await editProject(page, 'Client work 2');
  await access(sheet).getByRole('radio', { name: 'Restricted' }).click();
  await sheet.getByRole('button', { name: 'Save' }).click();
  await expect.poll(() => sent.filter((c) => c.type === 'project_update').length).toBe(2);
  expect(sent.filter((c) => c.type === 'project_update')[1].args).toMatchObject({ id: 'client', access: { visibility: 'restricted' } });
});

test('a value Todoist added that this app does not know is shown as it is, and kept (#194)', async ({ page }) => {
  const sent = await openWorkspaceAccount(page);
  const sheet = await editProject(page, 'Odd one');
  await expect(access(sheet).locator('strong')).toHaveText(['Restricted', 'Team', 'Public', 'organisation']);
  await expect(access(sheet).getByRole('radio', { name: 'organisation' })).toBeChecked();
  await sheet.getByRole('textbox', { name: 'Project name' }).fill('Odd one out');
  await sheet.getByRole('button', { name: 'Save' }).click();
  await expect.poll(() => sent.some((c) => c.type === 'project_update')).toBe(true);
  expect(sent.find((c) => c.type === 'project_update')!.args).not.toHaveProperty('access');
});

test('moving a project to another workspace hides the choice, since it takes that place\'s default (#194)', async ({ page }) => {
  await openWorkspaceAccount(page);
  const sheet = await editProject(page, 'Plain');
  await expect(access(sheet)).toBeVisible();
  await sheet.getByRole('button', { name: 'Workspace' }).click();
  await page.getByRole('option', { name: 'Studio' }).click();
  await expect(access(sheet)).toHaveCount(0);
  await sheet.getByRole('button', { name: 'Workspace' }).click();
  await page.getByRole('option', { name: /My projects/ }).click();
  await expect(access(sheet).getByRole('radio', { name: 'Restricted' })).toBeChecked();
});

test('when Todoist refuses Public, the person is told and the sheet does not pretend (#194)', async ({ page }) => {
  await openWorkspaceAccount(page, { refuse: 'Feature disabled' });
  await page.getByRole('button', { name: 'Add project' }).first().click();
  const sheet = page.getByRole('dialog', { name: 'New project' });
  await access(sheet).getByRole('radio', { name: 'Public' }).click();
  await sheet.getByRole('textbox', { name: 'Project name' }).fill('Not allowed');
  await sheet.getByRole('button', { name: 'Add project', exact: true }).click();
  await expect(page.locator('.toast', { hasText: 'Feature disabled' })).toBeVisible();
  await expect(page.locator('.sidebar .navitem', { hasText: 'Not allowed' })).toHaveCount(0);
});

test('each choice has its mark: a lock, the workspace picture, a globe, and a sentence under its title (#194)', async ({ page }) => {
  await openWorkspaceAccount(page);
  const sheet = await editProject(page, 'Client work');
  const tiles = access(sheet).getByRole('radio');
  await expect(tiles).toHaveCount(3);
  await expect(tiles.nth(0).locator('.accessmark svg')).toBeVisible();
  await expect(tiles.nth(1).locator('.accessmark img')).toHaveAttribute('src', LOGO);
  await expect(tiles.nth(2).locator('.accessmark svg')).toBeVisible();
  await expect(tiles.nth(0)).toContainText('Only the people you invite to the project.');
  await expect(tiles.nth(1)).toContainText('Everyone in the workspace can see and edit it.');
  await expect(tiles.nth(2)).toContainText('Anyone with the link can see it.');
  // Tall enough for a sentence, not a thin toggle.
  expect((await tiles.nth(1).boundingBox())!.height).toBeGreaterThan(90);
});

/* ---- the update window and the tour ---------------------------------------- */

test('after an update that did not change the tour, the window offers no tour button (2.5.0)', async ({ page }) => {
  await openAccount(page, [], '2.4.0');
  const dialog = page.locator('.whatsnew');
  await expect(dialog).toContainText('Choose who can access a project');
  await expect(dialog.getByRole('button', { name: /tour/i })).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: 'Show me', exact: true })).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: 'Got it' })).toBeVisible();
});


test('acknowledged changelog stays closed after stale settings sync and reload', async ({ page }) => {
  test.skip(process.env.PLAYWRIGHT_DEV !== '1', 'Controlled Vite store fixture');
  await openAccount(page, [], '2.6.0');
  const dialog = page.locator('.whatsnew');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Got it' }).click();
  await expect(dialog).toHaveCount(0);
  await page.route('https://api.todoist.com/api/v1/sync', async (route) => {
    await route.fulfill({ json: { full_sync: false, sync_token: 'stale', sync_status: {}, project_notes: [{
      id: 'old-settings', project_id: 'inbox', item_id: null, is_deleted: false, posted_at: '2026-10-14T00:00:00Z',
      content: 'Enhanced for Todoist · settings (edited by the app, please leave as is)\n\n' + JSON.stringify({ savedAt: Date.now() + 60000, seenVersion: '2.6.0', onboarded: true, setupDone: true, estimateStorage: 'tag', hireNoteSeen: true }),
    }] } });
  });
  await expect.poll(() => page.evaluate(async () => {
    const path = performance.getEntriesByType('resource').map((entry) => entry.name).find((url) => /\/src\/store\/preferences\.ts(?:\?|$)/.test(url))!;
    return (await import(path)).preferencesWriteTimer;
  })).toBeNull();
  await page.evaluate(async (version) => {
    const path = performance.getEntriesByType('resource').map((entry) => entry.name).find((url) => /\/src\/store\/store\.ts(?:\?|$)/.test(url))!;
    const { useStore } = await import(path);
    await useStore.getState().refresh(); await useStore.getState().refresh();
    if (useStore.getState().prefs.seenVersion !== version) throw new Error('Stale settings restored an older acknowledgement');
  }, VERSION);
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.sidebar')).toBeVisible();
  await expect(dialog).toHaveCount(0);
});
