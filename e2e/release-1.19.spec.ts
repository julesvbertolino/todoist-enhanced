import { expect, go, row, rows, test as demoTest } from './demo';
import type { Locator, Page } from '@playwright/test';

// Seed the demo on a Monday: Water the plants recurs on Mondays, and the
// fitting-task counts below must not depend on the weekday CI happens to run.
const test = demoTest.extend({
  page: async ({ page }, use) => {
    await page.clock.setFixedTime(new Date('2026-10-05T10:00:00Z'));
    await use(page);
  },
});

/** The group with this title on the page in front. */
const group = (page: Page, title: string | RegExp): Locator =>
  page.locator('.screen.active .group').filter({ has: page.locator('.gname', { hasText: title }) });

/** The titles of the tasks in a group, top to bottom. */
const titlesIn = (g: Locator): Promise<string[]> => g.locator('.ttitle').allInnerTexts();

const switchOf = (page: Page, name: string) => page.getByRole('switch', { name });

/* ---------------------------------------------------------------- #154 */

test('#154 a project leads with one Quick group, and its tasks are not listed twice', async ({ demo: page }) => {
  await go(page, '#/project/site');
  const quick = group(page, 'Quick Tasks');
  await expect(page.locator('.screen.active .group.accent-quick')).toHaveCount(1);
  // The group is first on the page, above every section.
  await expect(page.locator('.screen.active .group').first()).toHaveClass(/accent-quick/);

  // Quick tasks from two sections, each saying where it comes from.
  const reply = quick.locator('[data-task-id]').filter({ hasText: 'Reply to the printer' });
  await expect(reply.locator('.sect')).toHaveText('To do');
  const archive = quick.locator('[data-task-id]').filter({ hasText: 'Archive the old mockups' });
  await expect(archive.locator('.sect')).toHaveText('To review');

  // And nowhere else: not under their sections.
  await expect(rows(page).filter({ hasText: 'Reply to the printer' })).toHaveCount(1);
  await expect(rows(page).filter({ hasText: 'Archive the old mockups' })).toHaveCount(1);
  // No line to add a task, and the group is not a drop target.
  await expect(quick.locator('.sectionadd')).toHaveCount(0);
});

test('#154 a project with nothing quick has no Quick group', async ({ demo: page }) => {
  await go(page, '#/project/client-b');
  await expect(rows(page).first()).toBeVisible();
  await expect(page.locator('.screen.active .group.accent-quick')).toHaveCount(0);
  await expect(page.getByText('Nothing here.')).toHaveCount(0);
});

test('#154 a quick task dated next week stays in its section', async ({ demo: page }) => {
  await go(page, '#/project/site');
  await expect(group(page, 'Quick Tasks').locator('[data-task-id]').filter({ hasText: 'thank-you' })).toHaveCount(0);
  // A section's name is a field, so it is found by the id the field carries.
  const section = page.locator('.screen.active .group').filter({ has: page.locator('[data-section-name="s-todo"]') });
  await expect(section.locator('[data-task-id]').filter({ hasText: 'Send the thank-you note' })).toHaveCount(1);
});

test('#154 the Inbox, a tag and Someday lead with their quick tasks, saying where each comes from', async ({ demo: page }) => {
  // The Inbox has no quick task in the demo: one typed with its estimate makes the group appear.
  await go(page, '#/inbox');
  await expect(page.locator('.screen.active .group.accent-quick')).toHaveCount(0);
  await page.keyboard.press('q');
  await page.locator('.composer-name').fill('Pay the parking ticket (2)');
  await page.getByRole('dialog', { name: 'Add task' }).getByRole('button', { name: 'Add task' }).click();
  await expect(page.locator('.composerbox')).toHaveCount(0);
  await expect(titlesIn(group(page, 'Quick Tasks'))).resolves.toEqual(['Pay the parking ticket']);

  await go(page, '#/label/quick');
  const tagged = group(page, 'Quick Tasks');
  await expect(tagged.locator('[data-task-id]').filter({ hasText: 'Renew the library card' })).toHaveCount(1);
  await expect(tagged.locator('[data-task-id]').filter({ hasText: 'Renew the library card' }).locator('.proj'))
    .toContainText('Home');

  await go(page, '#/someday');
  const someday = group(page, 'Quick Tasks');
  await expect(someday.locator('[data-task-id]').filter({ hasText: 'Reply to the printer' }).locator('.proj'))
    .toContainText('Website');
  /* Two tasks have that name, the demo's in Home and the one typed above in the
     Inbox, which now names itself too (#175): the Home one is among them. */
  await expect(someday.locator('[data-task-id]').filter({ hasText: 'Pay the parking ticket' }).locator('.proj', { hasText: 'Home' }))
    .toHaveCount(1);
  await expect(someday.locator('[data-task-id]').filter({ hasText: 'Reply to the printer' }).locator('.sect'))
    .toHaveText('To do');
  // An old quick task is listed here, not under Gathering dust.
  await expect(someday.locator('[data-task-id]').filter({ hasText: 'Sell the old monitor' })).toHaveCount(1);
  await expect(group(page, 'Gathering dust').locator('[data-task-id]').filter({ hasText: 'Sell the old monitor' }))
    .toHaveCount(0);
});

test('#154 a board leads with a blue read-only Quick column, and My week looks as it did', async ({ demo: page }) => {
  await go(page, '#/week');
  const before = await page.locator('.screen.active .group').evaluateAll(
    (groups) => groups.map((g) => g.querySelector('.gname')?.textContent ?? ''),
  );
  expect(before.slice(0, 3)).toEqual(['Behind schedule', 'Quick Tasks', 'Today']);

  await go(page, '#/project/site');
  await page.getByRole('button', { name: 'Display' }).click();
  await page.getByRole('button', { name: 'Board', exact: true }).click();
  await page.keyboard.press('Escape');
  const board = page.locator('.screen.active .board');
  await expect(board).toBeVisible();
  // The first column is Quick, in blue, with the cards that say their section.
  const quick = board.locator('.col.accent-quick');
  await expect(quick).toHaveCount(1);
  await expect(board.locator('.col').first()).toHaveClass(/accent-quick/);
  await expect(quick.locator('.chead strong')).toHaveText('Quick Tasks');
  await expect(quick.locator('.sect').first()).toBeVisible();
  // Listed once; and, like every column of a board, it ends with the line that adds a task.
  await expect(board.locator('.col').filter({ hasText: 'Reply to the printer' })).toHaveCount(1);
  await expect(quick.locator('.coladd')).toHaveCount(1);
  const colour = await quick.locator('.chead strong').evaluate((el) => getComputedStyle(el).color);
  expect(colour).not.toBe(await board.locator('.col:not(.accent-quick) .chead-title').first().locator('strong, input, .gnamewrap').first().evaluate((el) => getComputedStyle(el).color));
});

test('#154 an empty section offers the add line in place, without saying nothing is here', async ({ demo: page }) => {
  await go(page, '#/project/client-b');
  // A section made empty: a new one, as nothing is in it.
  await page.getByRole('button', { name: 'Add section' }).first().click();
  const fresh = page.locator('.screen.active .group').filter({ has: page.locator('input.gnamefield') }).first();
  await expect(fresh.locator('.sectionadd')).toBeVisible();
  await expect(fresh.getByText('Nothing here.')).toHaveCount(0);
});

test('#154 an empty tag page has its add line', async ({ demo: page }) => {
  await go(page, '#/label/automation');
  // Complete its one task so the page is empty.
  await rows(page).first().getByRole('checkbox').click();
  await expect(rows(page)).toHaveCount(0);
  await expect(page.locator('.screen.active .sectionadd')).toBeVisible();
});

test('⌘A then ⌘⌫ deletes the selection with no task under the cursor', async ({ demo: page }) => {
  await go(page, '#/inbox');
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('ControlOrMeta+Backspace');
  await expect(page.getByRole('dialog')).toContainText(/Delete/);
});

test('#154 the Quick group stays on top whatever the page is grouped by', async ({ demo: page }) => {
  await go(page, '#/project/site');
  await page.getByRole('button', { name: 'Display' }).click();
  await page.locator('.panelgrid .fselect-face').first().click();
  await page.getByRole('option', { name: 'Priority' }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.screen.active .group').first()).toHaveClass(/accent-quick/);
  await expect(page.locator('.screen.active .group.accent-quick')).toHaveCount(1);
});

test('#154 the switch in Settings turns the Quick group off everywhere', async ({ demo: page }) => {
  await go(page, '#/settings');
  const quickSwitch = switchOf(page, 'Show the quick tasks group');
  await expect(quickSwitch).toHaveAttribute('aria-checked', 'true');
  await quickSwitch.click();

  for (const hash of ['#/week', '#/inbox', '#/someday', '#/project/site', '#/label/quick']) {
    await go(page, hash);
    await expect(page.locator('.screen.active .group.accent-quick'), hash).toHaveCount(0);
  }

  await go(page, '#/settings');
  await switchOf(page, 'Show the quick tasks group').click();
  await go(page, '#/project/site');
  await expect(page.locator('.screen.active .group.accent-quick')).toHaveCount(1);
  await go(page, '#/week');
  await expect(page.locator('.screen.active .group.accent-quick')).toHaveCount(1);
});

test('#154 the keyboard walks through the Quick group and on into the next group', async ({ demo: page }) => {
  await go(page, '#/project/site');
  const quick = group(page, 'Quick Tasks');
  const count = await quick.locator('[data-task-id]').count();
  expect(count).toBeGreaterThan(1);

  await page.keyboard.press('ArrowDown');
  for (let at = 1; at < count; at += 1) await page.keyboard.press('ArrowDown');
  // Past the last quick task is the first task below it.
  await expect(quick.locator('[data-task-id]').last()).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.screen.active [data-task-id]:focus')).not.toHaveCount(0);
  await expect(quick.locator('[data-task-id]:focus')).toHaveCount(0);
});

test('#154 in French the group and the settings hint say where it appears', async ({ demo: page }) => {
  await go(page, '#/settings');
  await page.getByRole('radiogroup', { name: 'Language' }).getByRole('radio', { name: 'Français' }).click();
  await go(page, '#/project/site');
  await expect(page.locator('.screen.active .group.accent-quick .gname')).toHaveText('Tâches rapides');
  await expect(page.locator('.screen.active .group.accent-quick .sect').first()).toBeVisible();
});

/* ---------------------------------------------------------------- #161 */

test('#161 Someday gathers the old tasks under Quick, with their age', async ({ demo: page }) => {
  await go(page, '#/someday');
  const groups = page.locator('.screen.active .group');
  await expect(groups.nth(0)).toHaveClass(/accent-quick/);
  await expect(groups.nth(1)).toHaveClass(/accent-dust/);

  const dust = group(page, 'Gathering dust');
  await expect(dust.locator('.gsub')).toHaveText('over 3 months');
  // Oldest first, each with its age in the meta line.
  await expect(titlesIn(dust)).resolves.toEqual([
    'Learn the basics of woodworking', 'Repaint the hallway', 'Digitise the family albums', 'Write the book outline',
  ]);
  await expect(dust.locator('[data-task-id]').first().locator('.dustage')).toHaveText(/added 1[01] months ago|added 9 months ago/);
  // Recent tasks stay below, outside it.
  await expect(dust.locator('[data-task-id]').filter({ hasText: 'Check the backups' })).toHaveCount(0);
  await expect(rows(page).filter({ hasText: 'Check the backups' })).toHaveCount(1);
});

test('#161 This week commits the task to the week, with a toast and an undo', async ({ demo: page }) => {
  await go(page, '#/someday');
  const dust = group(page, 'Gathering dust');
  const task = dust.locator('[data-task-id]').filter({ hasText: 'Repaint the hallway' });
  await task.hover();
  await task.getByRole('button', { name: 'This week' }).click();

  await expect(page.locator('.toast').filter({ hasText: /Moved to My week/ })).toBeVisible();
  await expect(rows(page).filter({ hasText: 'Repaint the hallway' })).toHaveCount(0);

  await go(page, '#/week');
  await expect(group(page, 'Anytime this week').locator('[data-task-id]').filter({ hasText: 'Repaint the hallway' })).toHaveCount(1);

  await page.locator('.toast').getByRole('button', { name: /Undo/ }).first().click();
  await go(page, '#/someday');
  await expect(group(page, 'Gathering dust').locator('[data-task-id]').filter({ hasText: 'Repaint the hallway' })).toHaveCount(1);
});

test('#161 Keep takes the task out of the group but not out of Someday; Delete asks and can be undone', async ({ demo: page }) => {
  await go(page, '#/someday');
  const total = await rows(page).count();
  const dust = group(page, 'Gathering dust');

  const kept = dust.locator('[data-task-id]').filter({ hasText: 'Learn the basics' });
  await kept.hover();
  await kept.getByRole('button', { name: 'Keep' }).click();
  await expect(page.locator('.toast').filter({ hasText: 'Kept in Someday' })).toBeVisible();
  await expect(dust.locator('[data-task-id]').filter({ hasText: 'Learn the basics' })).toHaveCount(0);
  // Still in Someday, listed once, outside the group.
  await expect(rows(page)).toHaveCount(total);
  await expect(rows(page).filter({ hasText: 'Learn the basics' })).toHaveCount(1);
  // It stays out when the page is left and come back to.
  await go(page, '#/inbox');
  await go(page, '#/someday');
  await expect(group(page, 'Gathering dust').locator('[data-task-id]').filter({ hasText: 'Learn the basics' })).toHaveCount(0);

  // Delete: confirmed first, then gone with an undo that brings it back.
  const hallway = group(page, 'Gathering dust').locator('[data-task-id]').filter({ hasText: 'Repaint the hallway' });
  await hallway.hover();
  await hallway.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
  await expect(rows(page).filter({ hasText: 'Repaint the hallway' })).toHaveCount(0);
  await page.locator('.toast').filter({ hasText: 'Repaint the hallway' }).getByRole('button', { name: /Undo/ }).click();
  await expect(rows(page).filter({ hasText: 'Repaint the hallway' })).toHaveCount(1);
});

test('#161 the settings hide the group and change the delay', async ({ demo: page }) => {
  await go(page, '#/settings');
  const delay = page.getByRole('button', { name: 'Tasks gather dust after' });
  await expect(delay).toContainText('3 months');

  await delay.click();
  await page.getByRole('option', { name: '6 months' }).click();
  await go(page, '#/someday');
  // 4 months old is no longer old enough at 6; the others still are.
  await expect(titlesIn(group(page, 'Gathering dust'))).resolves.toEqual([
    'Learn the basics of woodworking', 'Repaint the hallway', 'Digitise the family albums',
  ]);
  await expect(group(page, 'Gathering dust').locator('.gsub')).toHaveText('over 6 months');

  await go(page, '#/settings');
  await switchOf(page, 'Show the Gathering dust group').click();
  await go(page, '#/someday');
  await expect(page.locator('.screen.active .group.accent-dust')).toHaveCount(0);
  // Not hidden away: the tasks are still on the page.
  await expect(rows(page).filter({ hasText: 'Learn the basics of woodworking' })).toHaveCount(1);
});

test('#161 no other page shows the group', async ({ demo: page }) => {
  for (const hash of ['#/inbox', '#/week', '#/upcoming', '#/project/personal', '#/project/home', '#/label/quick']) {
    await go(page, hash);
    await expect(page.locator('.screen.active .group.accent-dust'), hash).toHaveCount(0);
  }
});

test('#161 the keyboard reaches the actions, and Shift+K keeps the task under the cursor', async ({ demo: page }) => {
  await go(page, '#/someday');
  const dust = group(page, 'Gathering dust');
  const first = dust.locator('[data-task-id]').first();
  await first.focus();
  // With the row focused its three actions can be tabbed to.
  await expect(first.getByRole('button', { name: 'This week' })).toBeVisible();

  const title = await first.locator('.ttitle').innerText();
  await page.keyboard.press('Shift+K');
  await expect(page.locator('.toast').filter({ hasText: 'Kept in Someday' })).toBeVisible();
  await expect(dust.locator('[data-task-id]').filter({ hasText: title })).toHaveCount(0);

  // The shortcut lives in the row's menu and in the shortcuts sheet.
  const next = group(page, 'Gathering dust').locator('[data-task-id]').first();
  await next.focus();
  await page.keyboard.press('.');
  await expect(page.locator('.rowmenu').getByRole('button', { name: /Keep in Someday/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.keyboard.press('?');
  await expect(page.getByRole('dialog')).toContainText('Keep in Someday');
});

test('#161 in French the group has its name and its ages', async ({ demo: page }) => {
  await go(page, '#/settings');
  await page.getByRole('radiogroup', { name: 'Language' }).getByRole('radio', { name: 'Français' }).click();
  await go(page, '#/someday');
  const dust = group(page, 'Elles prennent la poussière');
  await expect(dust).toHaveCount(1);
  await expect(dust.locator('.gsub')).toHaveText('depuis plus de 3 mois');
  await expect(dust.locator('.dustage').first()).toHaveText(/ajoutée il y a \d+ mois/);
});

/* ---------------------------------------------------------------- #159 */

const pill = (page: Page) => page.locator('.screen.active .timepill');
const panel = (page: Page) => page.locator('.timepanel');

test('#159 the pill follows the load figure on the pages that list tasks, and is absent elsewhere', async ({ demo: page }) => {
  for (const hash of ['#/week', '#/project/site', '#/label/quick', '#/inbox', '#/someday']) {
    await go(page, hash);
    await expect(pill(page), hash).toHaveCount(1);
    await expect(pill(page), hash).toContainText('I have time');
  }
  // Right after the duration, which is the last thing on the line before it (#173).
  await go(page, '#/week');
  const metrics = await page.locator('.screen.active .metrics > *').evaluateAll(
    (nodes) => nodes.map((node) => node.className),
  );
  const durationAt = metrics.findIndex((name) => name.includes('summary-time'));
  const pillAt = metrics.findIndex((name) => name.includes('timepill'));
  expect(durationAt).toBeGreaterThanOrEqual(0);
  expect(pillAt).toBeGreaterThan(durationAt);
  expect(metrics.some((name) => name.includes('loadpill') || name.includes('metric-link'))).toBe(false);

  for (const hash of ['#/upcoming', '#/insights', '#/review']) {
    await go(page, hash);
    await expect(page.locator('.screen.active .timepill'), hash).toHaveCount(0);
  }
});

test('#159 choosing 15 minutes lists what fits and leaves the page behind alone', async ({ demo: page }) => {
  await go(page, '#/week');
  const before = await rows(page).evaluateAll((nodes) => nodes.map((node) => (node as HTMLElement).dataset.taskId));

  await pill(page).getByRole('button', { name: 'I have time' }).click();
  await expect(panel(page)).toBeVisible();
  // Nothing is filtered until a duration is chosen.
  await expect(panel(page).locator('[aria-pressed="true"]')).toHaveCount(2); // the scope and the order
  await expect(panel(page).locator('.timerow')).toHaveCount(0);

  await panel(page).getByRole('button', { name: '15 min', exact: true }).click();
  // The pill always reads "I have time" (#30): the duration lives in the panel.
  await expect(pill(page)).toContainText('I have time');
  await expect(panel(page).locator('.timesummary')).toContainText('3 tasks of 15 min or less');

  // One list, each row saying when it is due (v2): the three due today.
  await expect(panel(page).locator('.timegroup')).toHaveCount(0);
  await expect(panel(page).locator('.timerow').filter({ has: page.locator('.timewhere', { hasText: /^Today/ }) })).toHaveCount(3);
  // A task above the limit is not listed.
  await expect(panel(page).locator('.timerow').filter({ hasText: 'Read the quarterly report' })).toHaveCount(0);
  // Where it lives, as a second line, and its time on the right.
  const water = panel(page).locator('.timerow').filter({ hasText: 'Water the plants' });
  await expect(water.locator('.timewhere')).toHaveText('Today · Home');
  await expect(water.locator('.timeest')).toHaveText('5 min');

  // The page behind is exactly as it was.
  const after = await rows(page).evaluateAll((nodes) => nodes.map((node) => (node as HTMLElement).dataset.taskId));
  expect(after.filter((id) => !String(id).startsWith('x'))).toEqual(before);
});

test('#159 everywhere looks past the page, and back', async ({ demo: page }) => {
  await go(page, '#/inbox');
  await pill(page).getByRole('button', { name: 'I have time' }).click();
  await panel(page).getByRole('button', { name: '15 min', exact: true }).click();
  const here = await panel(page).locator('.timerow').count();

  await panel(page).getByRole('button', { name: 'Everywhere', exact: true }).click();
  const everywhere = await panel(page).locator('.timerow').count();
  expect(everywhere).toBeGreaterThan(here);
  await expect(panel(page).locator('.timerow').filter({ hasText: 'Reply to the printer' })).toHaveCount(1);

  await panel(page).getByRole('button', { name: /^In / }).click();
  await expect(panel(page).locator('.timerow')).toHaveCount(here);
});

test('#159 completing a result removes it and updates the summary', async ({ demo: page }) => {
  await go(page, '#/week');
  await pill(page).getByRole('button', { name: 'I have time' }).click();
  await panel(page).getByRole('button', { name: '15 min', exact: true }).click();
  await expect(panel(page).locator('.timesummary')).toContainText('3 tasks');
  const subtotal = panel(page).locator('.timesummary');
  const before = await subtotal.innerText();

  await panel(page).locator('.timerow').filter({ hasText: 'Water the plants' }).getByRole('checkbox').click();
  await expect(panel(page).locator('.timerow').filter({ hasText: 'Water the plants' })).toHaveCount(0);
  await expect(panel(page).locator('.timesummary')).toContainText('2 tasks');
  expect(await subtotal.innerText()).not.toBe(before);
});

test('#159 tasks with no estimate are counted, and the link opens the estimate pass for them', async ({ demo: page }) => {
  await go(page, '#/week');
  await pill(page).getByRole('button', { name: 'I have time' }).click();
  await panel(page).getByRole('button', { name: '30 min', exact: true }).click();
  const foot = panel(page).locator('.timefoot');
  await expect(foot).toContainText('without an estimate set aside');

  await foot.getByRole('button', { name: 'Estimate them' }).click();
  const dialog = page.getByRole('dialog').last();
  await expect(dialog).toBeVisible();
  // The pass lists exactly what was set aside, not the page's whole backlog.
  const asked = Number((await foot.innerText()).match(/\d+/)?.[0]);
  expect(asked).toBeGreaterThan(0);
  await expect(dialog.locator('.estrow')).toHaveCount(asked);
});

test('#159 when nothing fits it says so and suggests the next duration', async ({ demo: page }) => {
  await go(page, '#/project/client-b');
  await pill(page).getByRole('button', { name: 'I have time' }).click();
  await panel(page).getByRole('button', { name: '5 min', exact: true }).click();
  await expect(panel(page).locator('.timenothing')).toContainText('Nothing fits in 5 min.');
  // The only task that could be done is the three-hour one: the 15-minute one is dated in three days.
  await expect(panel(page).locator('.timenothing')).toContainText('Try 3 h.');
});

test('#159 it can be typed, cleared, and closed with the pill, the cross and Escape', async ({ demo: page }) => {
  await go(page, '#/week');
  await pill(page).getByRole('button', { name: 'I have time' }).click();
  const custom = panel(page).getByLabel('Another duration');
  await custom.fill('1h15');
  await custom.press('Enter');
  await expect(panel(page).locator('.timesummary')).toBeVisible();

  // Closing ends the choice (#30): the pill reads "I have time" and the next
  // opening starts with no duration.
  await pill(page).locator('.timepill-main').click();
  await expect(panel(page)).toHaveCount(0);
  await expect(pill(page)).toContainText('I have time');
  await pill(page).locator('.timepill-main').click();
  await expect(panel(page).getByLabel('Another duration')).toHaveValue('');

  // Escape closes it.
  await page.keyboard.press('Escape');
  await expect(panel(page)).toHaveCount(0);
  await expect(pill(page)).toContainText('I have time');

  // Something that is not a duration is refused, not guessed at.
  await pill(page).locator('.timepill-main').click();
  await panel(page).getByLabel('Another duration').fill('soon');
  await panel(page).getByLabel('Another duration').press('Enter');
  await expect(panel(page).getByLabel('Another duration')).toHaveAttribute('aria-invalid', 'true');
  await expect(pill(page)).toContainText('I have time');
});

test('#159 going to a page with no pill puts the panel away and forgets the duration', async ({ demo: page }) => {
  await go(page, '#/week');
  await pill(page).getByRole('button', { name: 'I have time' }).click();
  await panel(page).getByRole('button', { name: '15 min', exact: true }).click();
  await go(page, '#/upcoming');
  await expect(panel(page)).toHaveCount(0);
  // Put away, the choice is over (#30).
  await go(page, '#/inbox');
  await expect(panel(page)).toHaveCount(0);
  await expect(pill(page)).toContainText('I have time');
  await pill(page).locator('.timepill-main').click();
  await expect(panel(page).locator('.timechoice.on')).toHaveCount(0);
});

test('#159 one right-hand panel at a time, and a reload forgets the duration', async ({ demo: page }) => {
  await go(page, '#/week');
  await pill(page).getByRole('button', { name: 'I have time' }).click();
  await panel(page).getByRole('button', { name: '10 min', exact: true }).click();
  await expect(panel(page)).toBeVisible();

  await page.getByRole('button', { name: 'Insights' }).click();
  await expect(panel(page)).toHaveCount(0);
  await expect(page.locator('.side-sheet')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.side-sheet')).toHaveCount(0);

  await page.reload();
  await expect(rows(page).first()).toBeVisible();
  await expect(pill(page)).toContainText('I have time');
});

test('#159 the keyboard walks the results and ticks one', async ({ demo: page }) => {
  await go(page, '#/week');
  await pill(page).getByRole('button', { name: 'I have time' }).click();
  await panel(page).getByRole('button', { name: '15 min', exact: true }).click();
  const results = panel(page).locator('.timerow');
  await results.first().focus();
  await page.keyboard.press('ArrowDown');
  await expect(results.nth(1)).toBeFocused();
  const title = await results.nth(1).locator('.ttitle').innerText();
  await page.keyboard.press('e');
  await expect(panel(page).locator('.timerow').filter({ hasText: title })).toHaveCount(0);
});

test('#159 a result opens the task, and the panel stays', async ({ demo: page }) => {
  await go(page, '#/week');
  await pill(page).getByRole('button', { name: 'I have time' }).click();
  await panel(page).getByRole('button', { name: '15 min', exact: true }).click();
  await panel(page).locator('.timerow').filter({ hasText: 'Water the plants' }).locator('.ttitle').click();
  await expect(page.locator('.detail-headline')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(panel(page)).toBeVisible();
});

test('#159 on a phone the panel is a full-screen sheet with 44px choices', async ({ demo: page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await go(page, '#/week');
  await pill(page).getByRole('button', { name: 'I have time' }).click();
  // Measured once the panel has finished sliding in.
  await expect(panel(page)).toHaveCSS('opacity', '1');
  await expect.poll(async () => (await panel(page).boundingBox())?.width).toBe(390);
  await expect.poll(async () => (await panel(page).getByRole('button', { name: '15 min', exact: true }).boundingBox())?.height)
    .toBeGreaterThanOrEqual(44);
});

test('#159 in French and in dark', async ({ demo: page }) => {
  await go(page, '#/settings');
  await page.getByRole('radiogroup', { name: 'Language' }).getByRole('radio', { name: 'Français' }).click();
  await page.emulateMedia({ colorScheme: 'dark' });
  await go(page, '#/week');
  await expect(pill(page)).toContainText('J’ai du temps');
  await pill(page).getByRole('button', { name: 'J’ai du temps' }).click();
  await expect(panel(page)).toContainText('Qu’est-ce que je peux faire en…');
  await panel(page).getByRole('button', { name: '15 min', exact: true }).click();
  await expect(panel(page).locator('.timesummary')).toContainText('tâches de 15 min ou moins');
});

/* ------------------------------------------------------------- the tour */

test('#159 the tour of a new account has a stop for I have time', async ({ demo: page }) => {
  await go(page, '#/settings');
  await page.evaluate(() => window.dispatchEvent(new Event('enhanced:tour')));
  const card = page.locator('.tour-card');
  await expect(card).toBeVisible();
  const seen: string[] = [];
  for (let step = 0; step < 8; step += 1) {
    seen.push(await card.locator('h3').innerText());
    const next = card.getByRole('button', { name: /Next|Done/ });
    if ((await next.innerText()).includes('Done')) break;
    await next.click();
  }
  expect(seen).toContain('I have time');
});

test('#159 Show me, after an update, runs the tour over what the update brought', async ({ demo: page }) => {
  await go(page, '#/inbox');
  await page.evaluate(() => window.dispatchEvent(
    new CustomEvent('enhanced:changelog', { detail: { versions: ['1.19.0'] } }),
  ));
  const dialog = page.getByRole('dialog', { name: /What.s new in/ });
  await expect(dialog.getByRole('button', { name: 'Show me' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Show me' }).click();

  // On My week, with the stop for what 1.19 brought and nothing else.
  await expect(page).toHaveURL(/#\/week/);
  const card = page.locator('.tour-card');
  await expect(card.locator('h3')).toHaveText('I have time');
  await expect(card.getByRole('button', { name: 'Done' })).toBeVisible();
  await card.getByRole('button', { name: 'Done' }).click();
  // No first-run dialog follows an update's tour.
  await expect(page.locator('.tour-card')).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: 'Setting up' })).toHaveCount(0);
});

test('#159 the history in Settings offers the whole tour, not Show me', async ({ demo: page }) => {
  await go(page, '#/settings');
  await page.evaluate(() => window.dispatchEvent(new Event('enhanced:changelog')));
  const dialog = page.getByRole('dialog', { name: 'Changelog' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Show me', exact: true })).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: 'Show me the tour' })).toBeVisible();
});

/* The list rows still open their task from the group, and the group completes. */
test('#154 a task in the Quick group opens, and completing the last one removes the group', async ({ demo: page }) => {
  await go(page, '#/inbox');
  await page.keyboard.press('q');
  await page.locator('.composer-name').fill('Pay the parking ticket (2)');
  await page.getByRole('dialog', { name: 'Add task' }).getByRole('button', { name: 'Add task' }).click();
  const quick = group(page, 'Quick Tasks');
  await quick.locator('.ttitle').first().click();
  await expect(page.locator('.detail-headline')).toBeVisible();
  await page.keyboard.press('Escape');

  await row(page, 'Pay the parking ticket').getByRole('checkbox').click();
  await expect(page.locator('.screen.active .group.accent-quick')).toHaveCount(0);
});

/* ---------------------------------------------------------------- #151 */

test('#151 a duration set in Todoist counts as an estimate, with no tag', async ({ demo: page }) => {
  // Two demo tasks carry Todoist's own duration and no estimate tag.
  await go(page, '#/week');
  await expect(row(page, 'Back up the photos').locator('.est')).toContainText('30 min');
  await go(page, '#/project/personal');
  await expect(row(page, 'Plan the time off').locator('.est')).toContainText('30 min');
  // No tag is shown for it, and the task is not offered for estimating.
  await expect(row(page, 'Plan the time off').locator('.tag')).toHaveCount(0);

  await go(page, '#/week');
  await pill(page).getByRole('button', { name: 'I have time' }).click();
  await panel(page).getByRole('button', { name: '30 min', exact: true }).click();
  await expect(panel(page).locator('.timerow').filter({ hasText: 'Back up the photos' })).toHaveCount(1);
  await expect(panel(page).locator('.timerow').filter({ hasText: 'Back up the photos' }).locator('.timeest'))
    .toHaveText('30 min');
});

test('#159 the pill is lit only while the panel is open, and a new session starts clean', async ({ demo: page }) => {
  await go(page, '#/week');
  await pill(page).getByRole('button', { name: 'I have time' }).click();
  await panel(page).getByRole('button', { name: '10 min', exact: true }).click();
  await expect(pill(page)).toHaveClass(/\bon\b/);

  // Insights takes the right-hand place: the pill is no longer lit.
  await page.getByRole('button', { name: 'Insights' }).click();
  await expect(panel(page)).toHaveCount(0);
  await expect(pill(page)).not.toHaveClass(/\bon\b/);
  await page.keyboard.press('Escape');

  // Leaving the demo and coming back asks nothing of the new account.
  await page.getByRole('button', { name: 'Leave demo' }).click();
  await page.getByRole('button', { name: 'Explore with demo data' }).click();
  await expect(pill(page)).toContainText('I have time');
});

test('#159 the list can be ordered by duration or by priority', async ({ demo: page }) => {
  await go(page, '#/week');
  await pill(page).getByRole('button', { name: 'I have time' }).click();
  await panel(page).getByRole('button', { name: '30 min', exact: true }).click();
  const first = () => panel(page).locator('.timelist .timeest').allInnerTexts();
  const byDuration = (await first()).map((t) => parseInt(t, 10));
  expect([...byDuration].sort((a, b) => a - b)).toEqual(byDuration);
  await panel(page).getByRole('button', { name: 'Priority first' }).click();
  await expect(panel(page).getByRole('button', { name: 'Priority first' })).toHaveAttribute('aria-pressed', 'true');
});
