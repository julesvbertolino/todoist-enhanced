import { test as base, expect as baseExpect } from '@playwright/test';
import { test, expect, go, rows } from './demo';

base.describe('sign-in and the first run (third pass)', () => {
  base('the language switch stays in its corner, and the demo opens the setup', async ({ page }) => {
    await page.goto('/');
    const lang = page.locator('.signin-lang');
    await baseExpect(lang).toBeVisible();
    const box = await lang.boundingBox();
    baseExpect(box!.height).toBeLessThan(60);
    baseExpect(box!.y).toBeLessThan(40);
    await page.getByRole('button', { name: 'Explore with demo data' }).click();
    await baseExpect(page.locator('.setup')).toBeVisible();
  });

  base('a custom colour is the colour picked, exactly', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Explore with demo data' }).click();
    await page.locator('.setup').getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('radio', { name: 'Custom' }).click();
    const hex = page.getByLabel('Colour, as a hex code');
    for (const colour of ['#90ee90', '#66cc66']) {
      await hex.fill(colour);
      await hex.press('Enter');
      const accent = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());
      baseExpect(accent).toBe(colour);
    }
  });

  base('the tour can be walked back, and ends on "Skip tour"', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('skipSetup', '1'));
    await page.goto('/');
    await page.getByRole('button', { name: 'Explore with demo data' }).click();
    await page.evaluate(() => window.dispatchEvent(new Event('enhanced:tour')));
    const card = page.locator('.tour-card');
    await baseExpect(card).toBeVisible();
    await baseExpect(card.getByRole('button', { name: 'Skip tour' })).toBeVisible();
    await baseExpect(card.getByRole('button', { name: 'Back' })).toHaveCount(0);
    const first = await card.locator('h3').innerText();
    await card.getByRole('button', { name: 'Next' }).click();
    await baseExpect(card.locator('h3')).not.toHaveText(first);
    await card.getByRole('button', { name: 'Back' }).click();
    await baseExpect(card.locator('h3')).toHaveText(first);
    // Asked for again while it is up, it starts afresh instead of doing nothing.
    await card.getByRole('button', { name: 'Next' }).click();
    await page.evaluate(() => window.dispatchEvent(new Event('enhanced:tour')));
    await baseExpect(card.locator('h3')).toHaveText(first);
  });
});

test.describe('lists and the keyboard (third pass)', () => {
  test('Tab does not walk the rows of a list, and the arrows still do', async ({ demo: page }) => {
    await go(page, '#/week');
    await page.locator('body').click({ position: { x: 5, y: 5 } });
    for (let press = 0; press < 12; press += 1) {
      await page.keyboard.press('Tab');
      const onRow = await page.evaluate(() => Boolean(document.activeElement?.closest('.screen.active [data-task-id]')));
      expect(onRow, `Tab ${press + 1}`).toBe(false);
    }
    await page.locator('body').click({ position: { x: 5, y: 5 } });
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('.screen.active [data-task-id]:focus')).toHaveCount(1);
  });

  test('a section header shows its count and time as one grey pill', async ({ demo: page }) => {
    await go(page, '#/week');
    const stats = page.locator('.screen.active .group .gstats').first();
    await expect(stats).toBeVisible();
    await expect(stats.locator('.gtime')).toBeVisible();
    expect(await stats.locator('.gtime').evaluate((node) => getComputedStyle(node, '::before').content)).toContain('·');
    expect(await stats.evaluate((node) => getComputedStyle(node).borderRadius)).toBe('99px');
  });

  test('every column of a week board ends with a line that adds a task', async ({ demo: page }) => {
    await go(page, '#/week');
    await page.getByRole('button', { name: 'Display' }).click();
    await page.getByRole('button', { name: 'Board', exact: true }).click();
    await page.keyboard.press('Escape');
    const columns = page.locator('.screen.active .board .col');
    const count = await columns.count();
    expect(count).toBeGreaterThan(1);
    for (let at = 0; at < count; at += 1) {
      // "Behind schedule" is a place to look, not to add to; every other column ends with the line.
      if (await columns.nth(at).evaluate((node) => node.classList.contains('accent-late'))) continue;
      await expect(columns.nth(at).locator('.coladd'), `column ${at}`).toHaveCount(1);
    }
    // And the head of a column says its time, never what is left unestimated.
    await expect(page.locator('.screen.active .board .chead small').first()).not.toContainText('unestimated');
  });

  test('a duration set from the row opens empty, and Enter on nothing leaves it', async ({ demo: page }) => {
    await go(page, '#/week');
    const first = rows(page).first();
    const before = await first.locator('.meta').innerText();
    await first.hover();
    await first.getByRole('button', { name: 'Set an estimate' }).click();
    const field = first.getByRole('textbox');
    await expect(field).toHaveValue('');
    await field.press('Enter');
    await expect.poll(() => first.locator('.meta').innerText()).toBe(before);
  });
});

test.describe('the composer (third pass)', () => {
  test('opens on the Inbox, and what was read from the name goes when its words do', async ({ demo: page }) => {
    await go(page, '#/week');
    await page.getByRole('button', { name: 'Add task' }).first().click();
    const box = page.locator('.composerbox');
    await expect(box.locator('.composer-chips .fselect-face').last()).toContainText('Inbox');
    const name = box.getByRole('textbox').first();
    await name.fill('Call the plumber tomorrow p1');
    await expect(box.locator('.composer-chips .fselect-face').first()).not.toHaveClass(/unset/);
    await expect(box.locator('.composer-chips .fselect-value', { hasText: 'P1' })).toBeVisible();
    await name.fill('Call the plumber');
    await expect(box.locator('.composer-chips .fselect-face').first()).toHaveClass(/unset/);
    await expect(box.locator('.composer-chips .fselect-value', { hasText: 'P1' })).toHaveCount(0);
    // No rule above the foot, and the hint is plain text.
    expect(await box.locator('.composer-actions').evaluate((node) => getComputedStyle(node).borderTopWidth)).toBe('0px');
    expect(await box.locator('.composer-hint kbd').first().evaluate((node) => getComputedStyle(node).borderTopWidth)).toBe('0px');
  });
});

test.describe('search (third pass)', () => {
  test('is one list ordered by how well things match, with no headings', async ({ demo: page }) => {
    await go(page, '#/week');
    await page.keyboard.press('/');
    await page.keyboard.type('a');
    await expect(page.locator('.sresults [role="option"]').first()).toBeVisible();
    await expect(page.locator('.sresults h4')).toHaveCount(0);
    const box = await page.locator('.sheet-search').boundingBox();
    expect(box!.width).toBeGreaterThan(600);
  });
});

test.describe('the open task (third pass)', () => {
  test('a comment shows its time, can be edited, reacted to and deleted', async ({ demo: page }) => {
    await go(page, '#/project/site');
    await rows(page).first().locator('.ttitle').click();
    const dialog = page.getByRole('dialog', { name: 'Task', exact: true });
    const field = dialog.getByRole('textbox', { name: 'Comment' });
    await field.fill('Check the quote');
    // Once there is something to send: a grey cross to take it back, an accent arrow to send it.
    await expect(dialog.getByRole('button', { name: 'Cancel' }).first()).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Send comment' })).toBeVisible();
    await dialog.getByRole('button', { name: 'Send comment' }).click();
    const comment = dialog.locator('.comment[data-note-id]').last();
    await expect(comment).toContainText('Check the quote');
    await expect(comment.locator('time')).toContainText(/Today · \d\d:\d\d/);

    await comment.hover();
    await comment.getByRole('button', { name: 'Add a reaction' }).click();
    /* The full palette (#27): its search field has the focus, typing filters, Enter picks. */
    const palette = page.locator('.emojipalette');
    await expect(palette.getByRole('textbox', { name: 'Search emoji' })).toBeFocused();
    await page.keyboard.type('thumbs up');
    await expect(palette.getByRole('option', { name: 'thumbs up', exact: true })).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(palette).toHaveCount(0);
    await expect(comment.locator('.reactionchip')).toContainText('👍');
    await expect(comment.locator('.reactionchip')).toContainText('1');
    /* Escape puts the palette away and leaves the task open. */
    await comment.hover();
    await comment.getByRole('button', { name: 'Add a reaction' }).click();
    await expect(palette).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(palette).toHaveCount(0);
    await expect(dialog).toBeVisible();

    await comment.hover();
    await comment.getByRole('button', { name: 'Comment actions' }).click();
    await page.getByRole('menuitem', { name: 'Edit comment' }).click();
    const edit = comment.getByRole('textbox');
    await edit.fill('Check the new quote');
    await edit.press('Enter');
    await expect(comment).toContainText('Check the new quote');

    await comment.hover();
    await comment.getByRole('button', { name: 'Comment actions' }).click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Delete', exact: true }).last().click();
    await expect(dialog.locator('.comment[data-note-id]')).toHaveCount(0);
  });

  test('a task can be duplicated from its menu', async ({ demo: page }) => {
    await go(page, '#/project/site');
    const before = await rows(page).count();
    await rows(page).first().locator('.ttitle').click();
    const dialog = page.getByRole('dialog', { name: 'Task', exact: true });
    await dialog.getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitem', { name: 'Duplicate' }).or(page.getByRole('button', { name: 'Duplicate' })).first().click();
    await page.keyboard.press('Escape');
    await expect.poll(() => rows(page).count()).toBeGreaterThan(before);
  });

  test('a link in the title reads as the list shows it, and opens its Markdown when clicked', async ({ demo: page }) => {
    await go(page, '#/project/site');
    await rows(page).first().locator('.ttitle').click();
    const dialog = page.getByRole('dialog', { name: 'Task', exact: true });
    const field = dialog.getByRole('textbox', { name: 'Task' });
    await field.fill('Watch the intro ([video](https://example.com/intro))');
    await field.press('Enter');
    await expect(dialog.locator('.titleview a')).toHaveText('video');
    await expect(dialog.locator('.titleview')).toContainText('Watch the intro (video)');
    await dialog.locator('.titleview').click({ position: { x: 5, y: 5 } });
    await expect(dialog.getByRole('textbox', { name: 'Task' })).toHaveValue(/\[video\]\(https:\/\/example\.com\/intro\)/);
  });
});

test.describe('the notification window (third pass)', () => {
  test('has no rule under its title, names who it is from in bold, and says how long ago', async ({ demo: page }) => {
    await go(page, '#/week');
    await page.getByRole('button', { name: 'Notifications' }).click();
    const sheet = page.locator('.overlay.hung .sheet');
    await expect(sheet).toBeVisible();
    expect(await sheet.locator('.sheet-head').evaluate((node) => getComputedStyle(node).borderBottomWidth)).toBe('0px');
    await expect(sheet.locator('.notifline strong').first()).toBeVisible();
    await expect(sheet.locator('li small').first()).toContainText(/ago|Just now/);
    // Todoist's own news would carry Todoist's mark: a person carries a picture or initials.
    await expect(sheet.locator('.notifav').first()).toBeVisible();
  });
});

test.describe('settings and the panels (third pass)', () => {
  test('the metadata choices share a line, the open-in choice is two pictures, and there is no website link', async ({ demo: page }) => {
    await go(page, '#/settings');
    const cards = page.locator('#lists .chipscard');
    const tops = await cards.evaluateAll((nodes) => nodes.map((node) => Math.round(node.getBoundingClientRect().top)));
    expect(new Set(tops).size).toBe(1);
    await expect(page.locator('#lists .openchoice').getByRole('radio')).toHaveCount(2);
    await expect(page.getByRole('link', { name: 'Open the website' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Today and My week' })).toHaveCount(0);
    await expect(page.locator('.coffee-callout').getByRole('link', { name: 'Buy me a coffee' })).toBeVisible();
  });

  test('Insights and "I have time" are the same panel, on the same ground', async ({ demo: page }) => {
    await go(page, '#/week');
    await page.getByRole('button', { name: 'I have time' }).click();
    const time = await page.locator('.timepanel').boundingBox();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Insights' }).click();
    const insights = await page.locator('.side-sheet').boundingBox();
    // Insights is a little narrower (#29): 340 px against 380.
    expect(time!.width - insights!.width).toBeGreaterThan(30);
    expect(Math.abs(time!.y - insights!.y)).toBeLessThan(2);
    expect(Math.abs(time!.height - insights!.height)).toBeLessThan(2);
    await expect(page.locator('.insights-scope')).toHaveCount(0);
  });
});

test.describe('the Eisenhower matrix and the tags (third pass)', () => {
  test('quadrants are columns of cards, in the grid and in the list', async ({ demo: page }) => {
    await go(page, '#/settings');
    await page.getByRole('checkbox', { name: 'Eisenhower Matrix' }).setChecked(true, { force: true });
    await go(page, '#/matrix');
    await expect(page.locator('.quadrant .taskwrap').first()).toBeVisible();
    expect(await page.locator('.quadrant .gheadblock').first().evaluate((node) => getComputedStyle(node).borderBottomWidth)).toBe('0px');
  });

  test('the new-tag field is a pill', async ({ demo: page }) => {
    await go(page, '#/labels');
    expect(await page.locator('.tagadd').evaluate((node) => getComputedStyle(node).borderRadius)).toBe('999px');
  });
});

test.describe('the review (third pass)', () => {
  test('a row choice keeps its thumb and slides it', async ({ demo: page }) => {
    await go(page, '#/review');
    const choices = page.locator('.reviewrow .reviewactions').first();
    const handle = await choices.elementHandle();
    await choices.getByRole('button').nth(1).click();
    await expect(choices.getByRole('button').nth(1)).toHaveAttribute('aria-pressed', 'true');
    await choices.getByRole('button').nth(2).click();
    await expect(choices.getByRole('button').nth(2)).toHaveAttribute('aria-pressed', 'true');
    // The same element: the row was not rebuilt, so the thumb could travel.
    expect(await handle!.evaluate((node) => node.isConnected)).toBe(true);
    expect(await choices.evaluate((node) => getComputedStyle(node, '::before').borderRadius)).toBe('999px');
  });
});

test.describe('the dashboard layout (third pass)', () => {
  test('a card held by its grip is dropped where the layout shows it, and the page never scrolls sideways', async ({ demo: page }) => {
    await go(page, '#/insights');
    await page.getByRole('button', { name: 'Edit layout' }).click();
    const cards = page.locator('.dashboard-bento .card[data-card]');
    const order = () => cards.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-card')));
    const before = await order();
    const grip = cards.first().locator('.dash-grip');
    const from = (await grip.boundingBox())!;
    const target = (await cards.nth(2).boundingBox())!;
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + 40, from.y + 40, { steps: 4 });
    await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 12 });
    // While it is held, the cards already show the order they would leave.
    await expect.poll(order).not.toEqual(before);
    // Far to the right of the window, the page does not follow.
    await page.mouse.move(page.viewportSize()!.width - 2, target.y + 20, { steps: 6 });
    await page.waitForTimeout(700);
    expect(await page.evaluate(() => document.scrollingElement!.scrollLeft)).toBe(0);
    await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 6 });
    await page.mouse.up();
    await expect.poll(order).not.toEqual(before);
    expect(new Set(await order())).toEqual(new Set(before));
  });
});

test.describe('the tags page (third pass)', () => {
  test('the other tags step aside while one is carried', async ({ demo: page }) => {
    await go(page, '#/labels');
    const rowsOf = page.locator('.taglist .tagcard');
    if (await rowsOf.count() < 3) test.skip();
    const grip = rowsOf.first().locator('.tagcard-grip');
    const from = (await grip.boundingBox())!;
    const target = (await rowsOf.nth(2).boundingBox())!;
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + 20, from.y + 20, { steps: 4 });
    await page.mouse.move(target.x + 60, target.y + target.height / 2, { steps: 12 });
    await expect.poll(() => rowsOf.nth(1).evaluate((node) => node.style.transform)).toContain('translateY');
    await page.mouse.up();
  });
});
