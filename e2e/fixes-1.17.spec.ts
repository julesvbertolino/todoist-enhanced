import { test as bare } from '@playwright/test';
import { expect, go, row, test } from './demo';

test('#143 a date typed with a time keeps the time', async ({ demo: page }) => {
  await page.keyboard.press('q');
  await page.locator('.composer-name').fill('Call the plumber');

  const face = page.locator('.composer-chips .datefield button').first();
  await face.click();
  await page.locator('.datepanel input').fill('tomorrow at 14:30');
  // The line under the field says what will be kept, time included.
  await expect(page.locator('.datepanel .pickerreading')).toContainText('14:30');
  await page.keyboard.press('Enter');
  await expect(face).toContainText('14:30');

  await page.keyboard.press('ControlOrMeta+Enter');
  await expect(page.locator('.composerbox')).toHaveCount(0);

  await go(page, '#/upcoming');
  await expect(row(page, 'Call the plumber')).toContainText('14:30');
});

test('#143 a deadline is a day: the time typed there is said to be left out', async ({ demo: page }) => {
  await page.keyboard.press('q');
  await page.locator('.composer-name').fill('Send the quote');
  await page.getByRole('button', { name: 'Deadline' }).click();
  await page.locator('.datepanel input').fill('tomorrow at 14:30');
  await expect(page.locator('.datepanel .pickerreading')).toContainText('takes a day only');
  await page.keyboard.press('Enter');
  await expect(page.locator('.datepanel')).toHaveCount(0);
});

test('#144 an address is not a priority: only what is typed beside it is read', async ({ demo: page }) => {
  await page.keyboard.press('q');
  const name = page.locator('.composer-name');
  await name.fill('Read https://example.com/p1');
  await expect(page.locator('.namefield .nmark.priority')).toHaveCount(0);
  await name.fill('Read https://example.com p1');
  await expect(page.locator('.namefield .nmark.priority')).toHaveCount(1);
});

/*
 * The demo saves in the same breath, so a real double click never catches it
 * mid-save. Two events in one task do: the second arrives before the first
 * one's promise has settled, which is exactly the window a slow save leaves open.
 */
test('#142 two clicks on Add in the same moment create one task, not two', async ({ demo: page }) => {
  await page.keyboard.press('q');
  await page.locator('.composer-name').fill('Book the train');
  await page.getByRole('button', { name: 'Add task', exact: true }).last()
    .evaluate((button: HTMLElement) => { button.click(); button.click(); });
  await expect(page.locator('.composerbox')).toHaveCount(0);

  await go(page, '#/inbox');
  await expect(page.locator('.screen.active [data-task-id]').filter({ hasText: 'Book the train' })).toHaveCount(1);
});

test('#142 Cmd+Enter pressed twice in the same moment creates one task', async ({ demo: page }) => {
  await page.keyboard.press('q');
  const name = page.locator('.composer-name');
  await name.fill('Renew the passport');
  await name.evaluate((field: HTMLElement) => {
    const press = () => field.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, metaKey: true, bubbles: true }),
    );
    press();
    press();
  });
  await expect(page.locator('.composerbox')).toHaveCount(0);

  await go(page, '#/inbox');
  await expect(page.locator('.screen.active [data-task-id]').filter({ hasText: 'Renew the passport' })).toHaveCount(1);
});

test('#145 the title Save and Cancel buttons answer Enter and Space', async ({ demo: page }) => {
  const first = await page.locator('.screen.active [data-task-id] .ttitle').first().innerText();
  await row(page, first).click();
  const field = page.locator('.detail-content .titlefield');
  await expect(field).toBeVisible();

  // Cancel, with Space: the title comes back as it was.
  await field.fill(`${first} edited`);
  const cancel = page.locator('.titleactions').getByRole('button', { name: 'Cancel' });
  await cancel.focus();
  await page.keyboard.press('Space');
  await expect(field).toHaveValue(first);
  await expect(page.locator('.titleactions')).toHaveCount(0);

  // Save, with Enter: the new title is kept, once.
  await field.fill(`${first} edited`);
  const save = page.locator('.titleactions').getByRole('button', { name: 'Save' });
  await save.focus();
  await page.keyboard.press('Enter');
  await expect(field).toHaveValue(`${first} edited`);
  await expect(page.locator('.titleactions')).toHaveCount(0);

  // And the mouse still works.
  // End stops at a visual line break when the title wraps; set the draft
  // explicitly so this checks the Save button regardless of viewport width.
  await field.fill(`${first} edited again`);
  await page.locator('.titleactions').getByRole('button', { name: 'Save' }).click();
  await expect(field).toHaveValue(`${first} edited again`);
});

test('#146 Upcoming moves its range on at midnight, without leaving the page', async ({ demo: page }) => {
  // Ten seconds before midnight, in the page's own clock.
  const evening = new Date();
  evening.setHours(23, 59, 50, 0);
  await page.clock.install({ time: evening });

  await go(page, '#/upcoming');
  await page.getByRole('button', { name: 'Display' }).click();
  await page.getByRole('button', { name: 'Board', exact: true }).first().click();
  await page.keyboard.press('Escape');

  const heads = page.locator('.screen.active .board .col .chead strong');
  await expect(heads.first()).toHaveText('Tomorrow');
  const before = await heads.allInnerTexts();
  expect(before.length).toBeGreaterThanOrEqual(15);

  // Midnight passes with the view open.
  await page.clock.runFor(20_000);

  // The first column is tomorrow again, and the range has gained a day at its far end.
  await expect(heads.first()).toHaveText('Tomorrow');
  await expect.poll(async () => (await heads.allInnerTexts()).at(-1)).not.toBe(before.at(-1));
  expect(await heads.count()).toBe(before.length);
});

test('#124 a custom accent follows the device when it switches to dark', async ({ demo: page }) => {
  await go(page, '#/settings');
  await page.getByRole('radio', { name: /Automatic/ }).click();
  // Custom is a card like the others; its two controls appear under the cards once it is chosen.
  await page.getByRole('radio', { name: 'Custom' }).click();
  const hex = page.getByLabel('Colour, as a hex code');
  await hex.fill('#2e7d32');
  await hex.press('Enter');

  const accent = () => page.evaluate(() => {
    const root = document.documentElement;
    /* `--accent` itself is the picked colour in both schemes; the tints and the
       ink around it are what the scheme changes. */
    const style = getComputedStyle(root);
    return {
      scheme: root.dataset.theme,
      accent: ['--accent-soft', '--accent-wash', '--sidebar'].map((token) => style.getPropertyValue(token).trim()).join(' '),
    };
  });

  await page.emulateMedia({ colorScheme: 'light' });
  await expect.poll(async () => (await accent()).scheme).toBe('light');
  const light = await accent();
  expect(light.accent).not.toBe('');

  // The device goes dark with the app open: the accent is redone for dark surfaces.
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect.poll(async () => (await accent()).scheme).toBe('dark');
  await expect.poll(async () => (await accent()).accent).not.toBe(light.accent);
  const dark = await accent();

  // And back again.
  await page.emulateMedia({ colorScheme: 'light' });
  await expect.poll(async () => (await accent()).accent).toBe(light.accent);
  expect(dark.accent).not.toBe(light.accent);
});

test('#125 a dialog opened over the task panel takes the keyboard alone', async ({ demo: page }) => {
  const first = await page.locator('.screen.active [data-task-id] .ttitle').first().innerText();
  await row(page, first).click();
  const field = page.locator('.detail-content .titlefield');
  await expect(field).toHaveValue(first);

  // ⌘⌫ asks "Delete this task?" over the panel.
  await page.keyboard.press('ControlOrMeta+Backspace');
  const confirm = page.locator('.confirmbox');
  await expect(confirm).toBeVisible();
  const del = confirm.getByRole('button', { name: 'Delete' });
  const cancel = confirm.getByRole('button', { name: 'Cancel' });

  // The panel's own keys stay quiet behind it: no walking to the next task.
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('j');
  await expect(field).toHaveValue(first);

  // Tab goes round the two buttons, Delete included.
  await expect(del).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(cancel).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(del).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(cancel).toBeFocused();

  // Escape puts the question away and leaves the panel where it was.
  await page.keyboard.press('Escape');
  await expect(confirm).toHaveCount(0);
  await expect(field).toHaveValue(first);
  await expect(page.locator('.detail-top')).toBeVisible();

  // The same from a search opened over the panel.
  await page.keyboard.press('ControlOrMeta+k');
  const search = page.locator('.sheet-search');
  await expect(search).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(search).toHaveCount(0);
  await expect(page.locator('.detail-top')).toBeVisible();

  // One Escape left: the panel closes as it always did.
  await page.keyboard.press('Escape');
  await expect(page.locator('.detail-top')).toHaveCount(0);
});

test('#126 deleting a parent picked with its subtasks deletes the branch once, and Undo brings it back once', async ({ demo: page }) => {
  // A parent with two subtasks, made in the composer.
  await page.keyboard.press('q');
  await page.locator('.composer-name').fill('Plan the trip');
  const sub = page.getByLabel('Add subtask', { exact: true });
  await sub.fill('Book the train');
  await sub.press('Enter');
  await sub.fill('Book the hotel');
  await sub.press('Enter');
  await page.getByRole('button', { name: 'Add task', exact: true }).last().click();
  await expect(page.locator('.composerbox')).toHaveCount(0);

  await go(page, '#/inbox');
  const branch = page.locator('.screen.active [data-task-id]').filter({ hasText: /Plan the trip|Book the (train|hotel)/ });
  await expect(branch).toHaveCount(3);

  // ⌘A picks every row on the page, subtasks included; the bar asks, then deletes.
  await page.keyboard.press('ControlOrMeta+a');
  await page.getByRole('toolbar').getByRole('button', { name: 'Delete' }).click();
  await page.locator('.confirmbox').getByRole('button', { name: 'Delete' }).click();
  await expect(branch).toHaveCount(0);
  // One message, and not a refusal.
  await expect(page.locator('.toasts .toast')).toHaveCount(1);
  await expect(page.locator('.toasts .toast')).not.toContainText(/refused|not saved/i);

  // Undo within the window puts each task back once.
  await page.locator('.toasts .toast').getByRole('button', { name: 'Undo' }).click();
  await expect(branch).toHaveCount(3);
  await expect(page.locator('.screen.active [data-task-id]').filter({ hasText: 'Book the train' })).toHaveCount(1);
});

test('#130 in the demo, ticking a daily 14:00 task brings it back tomorrow at 14:00', async ({ demo: page }) => {
  const daily = page.locator('.screen.active [data-task-id]')
    .filter({ has: page.locator('.repeatdot') })
    .filter({ hasText: '14:00' })
    .first();
  await expect(daily).toBeVisible();
  const title = await daily.locator('.ttitle').innerText();
  await daily.locator('[role="checkbox"]').click();
  // A ticked row is held for a moment, then leaves the day it was on.
  await expect(page.locator('.screen.active [data-task-id]').filter({ hasText: title }).filter({ hasText: '14:00' })).toHaveCount(0);

  await go(page, '#/upcoming');
  const next = page.locator('.screen.active [data-task-id]')
    .filter({ has: page.locator('.ttitle', { hasText: title }) })
    .first();
  // It is back, with its time, and Upcoming only lists days after today.
  await expect(next).toContainText('14:00');
});

/* The two below start on the connect screen, so they use a bare page: the
   `demo` fixture opens the demo itself and fails on anything logged. */
bare('#128 with site storage blocked, the connect screen appears and the demo still opens', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('skipSetup', '1');
    Object.defineProperty(window, 'sessionStorage', {
      get() { throw new DOMException('The operation is insecure.', 'SecurityError'); },
    });
  });
  await page.goto('/');
  // Not stuck on "Loading…": the connect screen is there.
  const signIn = page.getByRole('button', { name: 'Connect with Todoist' });
  await expect(signIn).toBeVisible();

  // Signing in cannot come back without storage: it says so, and stays.
  await signIn.click();
  await expect(page.getByRole('alert')).toContainText("blocking this site's storage");
  await expect(page).toHaveURL(/localhost/);
  await expect(signIn).toBeEnabled();

  // The demo still opens (it is only not remembered on reload).
  await page.getByRole('button', { name: 'Explore with demo data' }).click();
  await expect(page.locator('.screen.active [data-task-id]').first()).toBeVisible();
});

bare('#128 a crash while drawing shows a message and a Reload button, not a white page', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('skipSetup', '1');
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Explore with demo data' }).click();
  await expect(page.locator('.screen.active [data-task-id]').first()).toBeVisible();

  // Something in the page breaks while it is being drawn.
  await page.evaluate(() => {
    Intl.DateTimeFormat = function broken() { throw new Error('boom'); } as unknown as typeof Intl.DateTimeFormat;
    window.location.hash = '#/upcoming';
  });

  const alert = page.getByRole('alert');
  await expect(alert).toContainText('Something went wrong');
  await expect(alert.getByRole('button', { name: 'Reload' })).toBeVisible();
  await expect(alert.getByRole('link', { name: 'Tell us what happened' })).toBeVisible();
});

test('#136 a toast is announced: it lands in a live region already in the page', async ({ demo: page }) => {
  // The regions exist before any toast does.
  await expect(page.locator('.toasts [role="status"][aria-live="polite"]')).toHaveCount(1);
  await expect(page.locator('.toasts [role="alert"][aria-live="assertive"]')).toHaveCount(1);

  // Delete a task: the message is read out, and Undo says what it undoes.
  const first = await page.locator('.screen.active [data-task-id] .ttitle').first().innerText();
  await row(page, first).focus();
  await page.keyboard.press('ControlOrMeta+Backspace');
  await page.locator('.confirmbox').getByRole('button', { name: 'Delete' }).click();

  const status = page.locator('.toasts [role="status"]');
  await expect(status).toContainText(first);
  await expect(status.getByRole('button', { name: new RegExp(`^Undo — .*${first}`) })).toBeVisible();
});

test('#140 every toast has a close button; closing one keeps its undo, and plain ones go by themselves sooner', async ({ demo: page }) => {
  const first = await page.locator('.screen.active [data-task-id] .ttitle').first().innerText();
  await row(page, first).focus();
  await page.keyboard.press('ControlOrMeta+Backspace');
  await page.locator('.confirmbox').getByRole('button', { name: 'Delete' }).click();

  // Undo, then the close button: both reachable from the keyboard.
  const toast = page.locator('.toasts .toast');
  await expect(toast).toHaveCount(1);
  const undo = toast.getByRole('button', { name: /^Undo/ });
  const close = toast.getByRole('button', { name: 'Close' });
  await undo.focus();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();

  // Closing only puts the toast away: the task stays gone...
  await page.keyboard.press('Enter');
  await expect(toast).toHaveCount(0);
  await expect(page.locator('.screen.active [data-task-id]').filter({ hasText: first })).toHaveCount(0);

  // ...and ⌘Z inside the window brings the same task back.
  await page.locator('body').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('ControlOrMeta+z');
  await expect(page.locator('.screen.active [data-task-id]').filter({ hasText: first })).toHaveCount(1);
});

test('#130 follow-up: a task typed with "every day at 3pm" shows Today 15:00', async ({ demo: page }) => {
  await page.keyboard.press('q');
  await page.locator('.composer-name').fill('Water the plants every day at 3pm');
  await page.keyboard.press('ControlOrMeta+Enter');
  await expect(page.locator('.composerbox')).toHaveCount(0);
  await go(page, '#/week');
  await expect(row(page, 'Water the plants')).toContainText('15:00');
});

test('#135 follow-up: @@link0@@ typed in the composer stays text, with no tag', async ({ demo: page }) => {
  await page.keyboard.press('q');
  await page.locator('.composer-name').fill('Fill @@link0@@ in');
  await expect(page.locator('.composer-chips .tagchip')).toHaveCount(0);
  await expect(page.locator('.namefield .nmark.label')).toHaveCount(0);
  await page.keyboard.press('ControlOrMeta+Enter');
  await expect(page.locator('.composerbox')).toHaveCount(0);
  await go(page, '#/inbox');
  await expect(row(page, 'Fill @@link0@@ in')).toBeVisible();
});

test('the changelog lists every release\'s lines from the most visible to the least (#148)', async ({ demo: page }) => {
  await page.route('https://github.com/**', (route) => route.fulfill({ status: 204 }));
  await go(page, '#/settings');
  await page.getByRole('button', { name: 'See the changes' }).click();
  const dialog = page.getByRole('dialog', { name: 'Changelog' });
  const releases = dialog.locator('.whatsnew-release');
  await expect(releases.first()).toBeVisible();

  // New things, then redesigns, then fixes, even though the file could list
  // them in any order; whichever release is on top.
  const rank: Record<string, number> = { new: 0, design: 1, fix: 2 };
  for (const at of [0, 1, 2]) {
    const kinds = await releases.nth(at).locator('.whatsnew-change')
      .evaluateAll((els) => els.map((el) => el.classList[1]));
    expect(kinds.length).toBeGreaterThan(0);
    expect(kinds).toEqual([...kinds].sort((x, y) => rank[x] - rank[y]));
  }
});
