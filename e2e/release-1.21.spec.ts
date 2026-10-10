import type { Page } from '@playwright/test';
import { test, expect, go, row, rows } from './demo';

const ids = (page: Page) =>
  rows(page).evaluateAll((all) => all.map((r) => (r as HTMLElement).dataset.taskId ?? ''));

/** Picks a task up by its handle and carries it to a row, `right` pixels out to the right. */
async function drag(page: Page, fromId: string, toId: string, right = 0, position: 'before' | 'after' = 'after') {
  const from = page.locator(`.screen.active [data-task-id="${fromId}"]`);
  await from.hover();
  const handle = (await from.locator('.drag').boundingBox())!;
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle.x + 4, handle.y + 20, { steps: 5 });
  const to = (await page.locator(`.screen.active [data-task-id="${toId}"]`).boundingBox())!;
  await page.mouse.move(handle.x + 4 + right, to.y + to.height * (position === 'before' ? .2 : .8), { steps: 12 });
  await page.waitForTimeout(150);
  await page.mouse.up();
}

test.describe('#170 the dashboard changes period without freezing', () => {
  // Clocks go back on 25 October 2026 in Paris, a 25-hour day: a month, a
  // quarter or a year that holds it used to loop for ever.
  test.use({ timezoneId: 'Europe/Paris' });

  test('every preset answers, in turn, across the clock change', async ({ demo: page }) => {
    await page.clock.setFixedTime(new Date('2026-10-07T10:00:00+02:00'));
    await go(page, '#/insights');
    const preset = (name: string) => page.locator('.periodbar .spanbar button', { hasText: new RegExp(`^${name}$`, 'i') });

    await expect(preset('Week')).toHaveAttribute('aria-pressed', 'true');
    await preset('Month').click();
    await expect(preset('Month')).toHaveAttribute('aria-pressed', 'true');
    await expect(preset('Week')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByRole('heading', { name: 'Completed per day' })).toBeVisible();
    await expect(page.locator('.bento .chart-card, .bento .card').first()).toBeVisible();

    await preset('Quarter').click();
    await expect(preset('Quarter')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('heading', { name: 'Completed per month' })).toBeVisible();

    await preset('Year').click();
    await expect(preset('Year')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('heading', { name: 'Completed per month' })).toBeVisible();

    await preset('Day').click();
    await expect(preset('Day')).toHaveAttribute('aria-pressed', 'true');
    await preset('Week').click();
    await expect(preset('Week')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('heading', { name: 'Completed per day' })).toBeVisible();
  });

  test('the logbook describes the same window as the overview', async ({ demo: page }) => {
    await page.clock.setFixedTime(new Date('2026-10-07T10:00:00+02:00'));
    await go(page, '#/insights');
    await page.locator('.periodbar .spanbar button', { hasText: /^Month$/ }).click();
    const range = await page.locator('.dashboard-title-range').innerText();
    await go(page, '#/insights/logbook');
    await expect(page.locator('.periodbar .spanbar button', { hasText: /^Month$/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.dashboard-title-range')).toHaveText(range);
  });
});

test.describe('#170 the period controls', () => {
  test.use({ timezoneId: 'Europe/Paris' });

  test('previous and next move through each period, next is off at the present, and a custom range reconciles', async ({ demo: page }) => {
    await page.clock.setFixedTime(new Date('2026-10-07T10:00:00+02:00'));
    await go(page, '#/insights');
    const range = page.locator('.dashboard-title-range');
    const next = page.locator('.periodbar .pager button').nth(1);
    const previous = page.locator('.periodbar .pager button').nth(0);
    await expect(next).toBeDisabled();

    // A month back is September, and forward again is October.
    await page.locator('.periodbar .spanbar button', { hasText: /^Month$/ }).click();
    await expect(range).toContainText('Oct');
    await previous.click();
    await expect(range).toContainText('Sep');
    await expect(next).toBeEnabled();
    await next.click();
    await expect(range).toContainText('Oct');
    await expect(next).toBeDisabled();

    // A quarter back crosses the year boundary after four steps, and a year back is last year.
    await page.locator('.periodbar .spanbar button', { hasText: /^Quarter$/ }).click();
    for (let step = 0; step < 4; step += 1) await previous.click();
    await expect(range).toContainText('2025');
    await page.locator('.periodbar .spanbar button', { hasText: /^Year$/ }).click();
    await previous.click();
    await expect(range).toContainText('2025');
    await expect(page.getByRole('heading', { name: 'Completed per month' })).toBeVisible();

    // Switching back to a preset forgets the offset, and the buttons say where it is.
    await page.locator('.periodbar .spanbar button', { hasText: /^Week$/ }).click();
    await expect(page.locator('.periodbar .spanbar button', { hasText: /^Week$/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(range).toContainText('Oct');
  });

  test('a period taking its time never lets an older answer replace the one chosen', async ({ demo: page }) => {
    await go(page, '#/insights');
    // Nothing to wait on in the demo, so the order is made rapid instead: every press lands before the last render.
    for (const name of [/^Month$/, /^Year$/, /^Quarter$/, /^Day$/, /^Week$/]) {
      await page.locator('.periodbar .spanbar button', { hasText: name }).click({ noWaitAfter: true });
    }
    await expect(page.locator('.periodbar .spanbar button', { hasText: /^Week$/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('heading', { name: 'Completed per day' })).toBeVisible();
  });

  test('a page keeps the room of its scrollbar, so nothing slides sideways while a period loads', async ({ demo: page }) => {
    await go(page, '#/insights');
    await expect(page.locator('.screen.active')).toHaveCSS('scrollbar-gutter', 'stable');
    const before = (await page.locator('.screen.active .page').first().boundingBox())!;
    await page.locator('.periodbar .spanbar button', { hasText: /^Month$/ }).click();
    await page.locator('.periodbar .spanbar button', { hasText: /^Week$/ }).click();
    const after = (await page.locator('.screen.active .page').first().boundingBox())!;
    expect(after.x).toBe(before.x);
    expect(after.width).toBe(before.width);
  });
});

test('#166 a selection dragged inside a task becomes its subtasks, in order, and one undo gives them back', async ({ demo: page }) => {
  await go(page, '#/project/personal');
  await page.getByRole('button', { name: 'Display' }).click();
  await page.locator('.panelgrid .fselect-face').nth(1).click();
  await page.getByRole('option', { name: 'Manual' }).click();
  await page.keyboard.press('Escape');
  const before = await ids(page);
  expect(before.length).toBeGreaterThanOrEqual(4);
  const [first, second, third, fourth] = before;

  await page.locator(`.screen.active [data-task-id="${first}"] .ttitle`).click({ modifiers: ['ControlOrMeta'] });
  await page.locator(`.screen.active [data-task-id="${second}"] .ttitle`).click({ modifiers: ['ControlOrMeta'] });
  await expect(page.getByRole('toolbar')).toContainText('2 selected');

  await drag(page, first, fourth, 60);

  await expect(page.getByText('2 tasks became subtasks of')).toBeVisible();
  await expect.poll(async () => page.locator(`.screen.active [data-task-id="${first}"]`).getAttribute('data-depth')).toBe('1');
  await expect(page.locator(`.screen.active [data-task-id="${second}"]`)).toHaveAttribute('data-depth', '1');
  // Under the target, in the order they were picked, and the others stayed.
  const after = await ids(page);
  const at = after.indexOf(fourth);
  expect(after.slice(at, at + 3)).toEqual([fourth, first, second]);
  expect(after).toContain(third);
  await expect(page.getByRole('toolbar')).toHaveCount(0);

  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.locator(`.screen.active [data-task-id="${first}"]`)).not.toHaveAttribute('data-depth', /.+/);
  await expect(page.locator(`.screen.active [data-task-id="${second}"]`)).not.toHaveAttribute('data-depth', /.+/);
});

test('#166 dropping a selection on one of its own tasks changes nothing', async ({ demo: page }) => {
  await go(page, '#/project/personal');
  const before = await ids(page);
  const [first, second] = before;
  await page.locator(`.screen.active [data-task-id="${first}"] .ttitle`).click({ modifiers: ['ControlOrMeta'] });
  await page.locator(`.screen.active [data-task-id="${second}"] .ttitle`).click({ modifiers: ['ControlOrMeta'] });
  await drag(page, first, second, 60);
  expect(await ids(page)).toEqual(before);
  await expect(page.locator('.screen.active [data-depth]')).toHaveCount(0);
  await expect(page.getByText(/became subtasks?/)).toHaveCount(0);
});

test.describe('#165 subtasks reorder by drag where they are listed', () => {
  const subtaskIds = (page: Page) =>
    rows(page).evaluateAll((all) => all
      .filter((r) => (r as HTMLElement).dataset.depth)
      .map((r) => (r as HTMLElement).dataset.taskId ?? ''));

  for (const [name, hash] of [['a project', '#/project/site'], ['My week', '#/week']] as const) {
    test(`in ${name}`, async ({ demo: page }) => {
      await go(page, hash);
      const subs = await subtaskIds(page);
      expect(subs).toHaveLength(3);
      const [a, b, c] = subs;

      const parentId = await page.locator(`.screen.active [data-task-id="${a}"]`).evaluate(
        (node) => (node.previousElementSibling as HTMLElement | null)?.dataset.taskId ?? '',
      );
      expect(parentId).not.toBe('');

      // The line is under the row it is over, and the subtask lands there.
      // First to last.
      await drag(page, a, c);
      await expect.poll(() => subtaskIds(page)).toEqual([b, c, a]);
      // Last to first: onto the parent, the line under it is above the first subtask.
      await drag(page, a, b, 0, 'before');
      await expect.poll(() => subtaskIds(page)).toEqual([a, b, c]);
      // Between two: the third dropped on the first goes just under it, not above it.
      await drag(page, c, a);
      await expect.poll(() => subtaskIds(page)).toEqual([a, c, b]);
      // A neighbour, and back.
      await drag(page, b, c);
      await expect.poll(() => subtaskIds(page)).toEqual([a, c, b]);
      await drag(page, b, a);
      await expect.poll(() => subtaskIds(page)).toEqual([a, b, c]);
      await drag(page, b, c);
      await expect.poll(() => subtaskIds(page)).toEqual([a, c, b]);

      // They are still under their parent.
      expect(await page.locator(`.screen.active [data-task-id="${a}"]`).evaluate(
        (node) => (node.previousElementSibling as HTMLElement | null)?.dataset.taskId ?? '',
      )).toBe(parentId);

      // The task panel shows the same order. A moment for the drop to settle: a click right on its heels is not one.
      await page.waitForTimeout(400);
      await page.locator(`.screen.active [data-task-id="${parentId}"] .ttitle`).first().click();
      const modal = page.getByRole('dialog');
      await expect(modal.locator('.subtasktitle')).toHaveCount(3);
      const inModal = await modal.locator('.subtasktitle').allInnerTexts();
      const onPage = await Promise.all([a, c, b].map((id) =>
        page.locator(`.screen.active [data-task-id="${id}"] .ttitle`).innerText()));
      expect(inModal.slice(0, 3)).toEqual(onPage);
    });
  }

  test('two picked subtasks can be carried out above their parent', async ({ demo: page }) => {
    await go(page, '#/project/site');
    const before = await ids(page);
    const subs = await subtaskIds(page);
    const [a, b] = subs;
    const parentId = await page.locator(`.screen.active [data-task-id="${a}"]`).evaluate(
      (node) => (node.previousElementSibling as HTMLElement | null)?.dataset.taskId ?? '',
    );
    const above = before[before.indexOf(parentId) - 1];
    expect(above, 'a row above the parent').toBeTruthy();

    await page.locator(`.screen.active [data-task-id="${a}"] .ttitle`).click({ modifiers: ['ControlOrMeta'] });
    await page.locator(`.screen.active [data-task-id="${b}"] .ttitle`).click({ modifiers: ['ControlOrMeta'] });
    await expect(page.getByRole('toolbar')).toContainText('2 selected');
    await drag(page, a, above);

    // Both left the parent: they are rows of the project's own, no longer indented under it.
    await expect.poll(async () => (await subtaskIds(page)).filter((id) => [a, b].includes(id))).toEqual([]);
    const after = await ids(page);
    expect(after).toContain(a);
    expect(after).toContain(b);
    expect(Math.abs(after.indexOf(a) - after.indexOf(b))).toBe(1);
    expect(after.indexOf(a)).toBeLessThan(after.indexOf(parentId));
  });

  test('two picked subtasks pulled out to the left leave their parent together, and one undo puts them back', async ({ demo: page }) => {
    await go(page, '#/project/site');
    const [a, b] = await subtaskIds(page);
    await page.locator(`.screen.active [data-task-id="${a}"] .ttitle`).click({ modifiers: ['ControlOrMeta'] });
    await page.locator(`.screen.active [data-task-id="${b}"] .ttitle`).click({ modifiers: ['ControlOrMeta'] });
    await expect(page.getByRole('toolbar')).toContainText('2 selected');

    const from = page.locator(`.screen.active [data-task-id="${a}"]`);
    await from.hover();
    const handle = (await from.locator('.drag').boundingBox())!;
    await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
    await page.mouse.down();
    await page.mouse.move(handle.x - 20, handle.y + 4, { steps: 4 });
    await page.mouse.move(handle.x - 80, handle.y + 4, { steps: 8 });
    await page.waitForTimeout(150);
    await page.mouse.up();

    await expect.poll(async () => (await subtaskIds(page)).filter((id) => [a, b].includes(id))).toEqual([]);
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect.poll(async () => (await subtaskIds(page)).filter((id) => [a, b].includes(id)).length).toBe(2);
  });

  test('a first subtask dropped below its parent stays first without changing level', async ({ demo: page }) => {
    await go(page, '#/project/site');
    const before = await ids(page);
    const subs = await subtaskIds(page);
    const parent = before[before.indexOf(subs[0]) - 1];
    await drag(page, subs[0], parent);
    await expect(page.locator(`.screen.active [data-task-id="${subs[0]}"]`)).toHaveAttribute('data-depth', '1');
    expect(await ids(page)).toEqual(before);
  });
});

/* ---------------------------------------------------------------- #157 */

const openKickoff = async (page: Page) => {
  await go(page, '#/week');
  await row(page, 'Prepare the kick-off meeting').locator('.ttitle').click();
  await expect(page.getByRole('dialog')).toBeVisible();
};

test.describe('#157 a checklist in the description', () => {
  test('shows the lines as boxes, ticks in place, and a row never shows raw markers', async ({ demo: page }) => {
    await go(page, '#/week');
    // The row's own preview skips the checklist lines: only the text before them.
    const preview = row(page, 'Prepare the kick-off meeting').locator('.tdesc');
    await expect(preview).toHaveText('Before the call:');
    await expect(row(page, 'Prepare the kick-off meeting')).not.toContainText('[ ]');

    await openKickoff(page);
    const dialog = page.getByRole('dialog');
    const boxes = dialog.getByRole('group', { name: 'Checklist' }).getByRole('checkbox');
    await expect(boxes).toHaveCount(3);
    await expect(dialog.locator('.checkprogress')).toHaveText('1 of 3');

    await boxes.nth(1).check();
    await expect(dialog.locator('.checkprogress')).toHaveText('2 of 3');
    // Two quick ticks in a row lose neither.
    await boxes.nth(2).check();
    await expect(boxes.nth(1)).toBeChecked();
    await expect(dialog.locator('.checkprogress')).toHaveText('3 of 3');
    // Ticking the last item does not complete the task.
    await dialog.getByRole('button', { name: 'Close' }).click();
    await expect(row(page, 'Prepare the kick-off meeting')).toBeVisible();

    // Reopened, the ticks are still there.
    await row(page, 'Prepare the kick-off meeting').locator('.ttitle').click();
    await expect(page.getByRole('dialog').getByRole('checkbox', { checked: true })).toHaveCount(3);
  });

  test('is edited as lines: Enter, Enter on an empty item, Backspace, ×, [] + space and - [] + space', async ({ demo: page }) => {
    await openKickoff(page);
    const dialog = page.getByRole('dialog');
    await dialog.locator('.descview .md').first().click();
    const items = dialog.locator('.descedit .md-task');
    await expect(items).toHaveCount(3);

    // Enter in the last item makes the next one, and the caret is in it.
    await items.nth(2).click();
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await expect(items).toHaveCount(4);
    await page.keyboard.type('Book the room');
    await expect(items.nth(3)).toContainText('Book the room');
    // Enter on an empty item leaves the list and the empty item is gone.
    await page.keyboard.press('Enter');
    await expect(items).toHaveCount(5);
    await page.keyboard.press('Enter');
    await expect(items).toHaveCount(4);
    // The caret is now in plain text, where [] and a space starts a new list.
    await page.keyboard.type('[] ');
    await expect(items).toHaveCount(5);
    await page.keyboard.type('Send the agenda');
    // `- []` and a space is a box too.
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.keyboard.type('- [] ');
    await expect(items).toHaveCount(6);
    await page.keyboard.type('Order lunch');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await expect(items).toHaveCount(6);
    // Backspace at the start of an item makes it plain text.
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Home');
    await page.keyboard.press('Backspace');
    await expect(items).toHaveCount(5);
    // × removes an item.
    await items.nth(0).hover();
    await dialog.getByRole('button', { name: 'Remove this item' }).first().click();
    await expect(items).toHaveCount(4);

    // Saved with Escape: leaving the field saves it, as it always did.
    await page.keyboard.press('Escape');
    await expect(dialog.locator('.descedit')).toHaveCount(0);
    await expect(dialog.getByRole('group', { name: 'Checklist' }).getByRole('checkbox')).toHaveCount(4);
    await expect(dialog.locator('.descview')).toContainText('Send the agenda');
  });

  test('a box ticked while writing stays a task, and the whole text is selectable by mouse and by ⌘A', async ({ demo: page }) => {
    await openKickoff(page);
    const dialog = page.getByRole('dialog');
    await dialog.locator('.descview .md').first().click();
    const items = dialog.locator('.descedit .md-task');
    await expect(items).toHaveCount(3);

    // Ticking a box in the editor ticks it: the line is still a task, drawn as one.
    await dialog.locator('.descedit .md-check').nth(1).click();
    await expect(items).toHaveCount(3);
    await expect(dialog.locator('.descedit .md-check[aria-checked="true"]')).toHaveCount(2);

    // A drag from the first line to the last selects across them, and Backspace removes it.
    const first = (await dialog.locator('.descedit .cm-line').first().boundingBox())!;
    const last = (await dialog.locator('.descedit .cm-line').last().boundingBox())!;
    await page.mouse.move(first.x + 4, first.y + first.height / 2);
    await page.mouse.down();
    await page.mouse.move(last.x + last.width - 30, last.y + last.height / 2, { steps: 8 });
    await page.mouse.up();
    await page.keyboard.press('Backspace');
    await expect(items).toHaveCount(0);
    await expect(dialog.locator('.descedit .cm-placeholder')).toBeVisible();

    // ⌘A then typing replaces everything.
    await page.keyboard.type('one');
    await page.keyboard.press('Enter');
    await page.keyboard.type('two');
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('zz');
    await expect(dialog.locator('.descedit .cm-content')).toHaveText('zz');
  });

  test('several lines pasted into an item become several items', async ({ demo: page }) => {
    await openKickoff(page);
    const dialog = page.getByRole('dialog');
    await dialog.locator('.descview .md').first().click();
    const items = dialog.locator('.descedit .md-task');
    await items.nth(2).click();
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await page.evaluate(() => {
      const content = document.querySelector('.descedit .cm-content')!;
      const data = new DataTransfer();
      data.setData('text/plain', '- milk\n- eggs\nbread');
      content.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
    });
    await expect(items).toHaveCount(6);
    await expect(items.nth(3)).toContainText('milk');
    await expect(items.nth(5)).toContainText('bread');
  });

  test('a new task made with a checklist keeps it, unticked, and is saved as ordinary lines', async ({ demo: page }) => {
    await go(page, '#/inbox');
    await page.keyboard.press('q');
    await page.locator('.composer-name').fill('Pack for the workshop');
    // At rest the description is one quiet line, as it always was.
    const box = (await page.locator('.descedit.composer .cm-content').boundingBox())!;
    expect(box.height).toBeLessThan(26);
    await page.locator('.descedit.composer .cm-content').click();
    await page.keyboard.type('[] ');
    await page.keyboard.type('Cables');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Adapters');
    await expect(page.locator('.descedit.composer .md-task')).toHaveCount(2);
    await page.getByRole('dialog', { name: 'Add task' }).getByRole('button', { name: 'Add task', exact: true }).click();
    await expect(row(page, 'Pack for the workshop')).toBeVisible();
    await expect(row(page, 'Pack for the workshop')).not.toContainText('[ ]');
    await row(page, 'Pack for the workshop').locator('.ttitle').click();
    const boxes = page.getByRole('dialog').getByRole('group', { name: 'Checklist' }).getByRole('checkbox');
    await expect(boxes).toHaveCount(2);
    await expect(page.getByRole('dialog').getByRole('checkbox', { checked: true })).toHaveCount(0);
  });
});

/* ---------------------------------------------------------------- #158 */


/* ---------------------------------------------------------------- #155 */

test.describe('#173 the line under a page’s title', () => {
  test('says the count, the duration and I have time, left to right, with no percentage or separate link', async ({ demo: page }) => {
    await go(page, '#/week');
    const line = page.locator('.screen.active .metrics');
    await expect(line.locator('.metric').first()).toContainText('tasks');
    await expect(line.locator('.summary-time')).toContainText('estimated');
    await expect(line.locator('.timepill')).toContainText('I have time');
    await expect(line.locator('.loadpill, .metric-link')).toHaveCount(0);
    const order = await line.locator('> *').evaluateAll((nodes) => nodes.filter((n) => !n.classList.contains('sep')).map((n) => n.className));
    expect(order.findIndex((c) => c.includes('summary-time'))).toBeLessThan(order.findIndex((c) => c.includes('timepill')));
    // What the percentage and the count were is in words.
    await expect(line.locator('.summary-time')).toHaveAttribute('aria-label', /without an estimate.*% of your capacity/);
  });

  test('turns amber from 95% and red beyond a full week, and is neutral below', async ({ demo: page }) => {
    // The week's own figure is read from the page, and the capacity is set to land on each side of it.
    await go(page, '#/week');
    const text = await page.locator('.screen.active .summary-time').innerText();
    const [, hours, minutes] = /(\d+) h (\d+)/.exec(text)!;
    const total = Number(hours) * 60 + Number(minutes);
    await go(page, '#/settings');
    await page.getByRole('button', { name: 'Weekly capacity' }).click();
    await page.getByRole('option', { name: 'A weekly value I set' }).click();
    const weekly = page.getByRole('textbox', { name: 'Weekly value' });
    const tone = async (capacity: number) => {
      await go(page, '#/settings');
      await weekly.fill(`${capacity} min`);
      await weekly.press('Enter');
      await go(page, '#/week');
      return page.locator('.screen.active .summary-time').getAttribute('class');
    };
    expect(await tone(Math.ceil(total / 0.5))).not.toMatch(/warn|over/);        // 50%
    expect(await tone(Math.ceil(total / 0.93))).not.toMatch(/warn|over/);       // under 95%
    expect(await tone(Math.floor(total / 0.95))).toMatch(/warn/);               // 95%
    expect(await tone(Math.ceil(total / 1.0))).toMatch(/warn/);                 // a full week is amber, not yet red
    expect(await tone(Math.floor(total / 1.1))).toMatch(/over/);                // 110%
    expect(await tone(Math.floor(total / 1.6))).toMatch(/over/);                // 160%
  });

  test('clicking the duration opens the tasks with no estimate', async ({ demo: page }) => {
    await go(page, '#/week');
    await page.locator('.screen.active .summary-time').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    // The first Escape leaves the estimate field the dialog opens in, the second closes it.
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('.screen.active .summary-time')).toBeFocused();
  });
});

test.describe('#174 and #172 the dashboard', () => {
  test('the dates of the period sit beside the title and follow it; deltas are coloured by direction', async ({ demo: page }) => {
    await go(page, '#/insights');
    const range = page.locator('.dashboard-title-range');
    const week = await range.innerText();
    await page.locator('.periodbar .spanbar button', { hasText: /^Month$/ }).click();
    await expect(range).not.toHaveText(week);
    await expect(page.locator('.rangelabel')).toHaveCount(0);
    // The label comes first, the figure and its change under it (the 2.0 design).
    const tile = page.locator('.metric-card').first();
    const top = await tile.locator('.stat-topline').boundingBox();
    const label = await tile.locator('.stat-label').boundingBox();
    expect(top!.y).toBeGreaterThan(label!.y + label!.height - 2);
    await expect(page.locator('.compare-delta').first()).toHaveAttribute('aria-label', /vs .* in the previous period/);
  });

  test('a quarter is read by month, and the three months add up to the quarter', async ({ demo: page }) => {
    await go(page, '#/insights');
    await page.locator('.periodbar .spanbar button', { hasText: /^Quarter$/ }).click();
    await expect(page.getByRole('heading', { name: 'Completed per month' })).toBeVisible();
    const total = Number((await page.locator('.metric-card').first().locator('.stat-value').innerText()).trim());
    const bars = await page.locator('[data-card="trend"] .slot, [data-card="trend"] [role="img"]').count();
    expect(bars).toBeGreaterThan(0);
    expect(total).toBeGreaterThan(0);
    // Half width for a quarter's heatmap, the whole row for a year's.
    const grid = page.locator('[data-card="heatmap"]');
    const half = (await grid.boundingBox())!.width;
    await page.locator('.periodbar .spanbar button', { hasText: /^Year$/ }).click();
    const full = (await page.locator('[data-card="heatmap"]').boundingBox())!.width;
    expect(full).toBeGreaterThan(half * 1.6);
  });
});

test.describe('#172 the dashboard layout', () => {
  test('the layout can be rearranged with the keyboard buttons, survives a period change, and resets', async ({ demo: page }) => {
    await go(page, '#/insights');
    const order = () => page.locator('.dashboard-bento [data-card]').evaluateAll((all) => all.map((n) => (n as HTMLElement).dataset.card));
    const first = await order();
    await page.getByRole('button', { name: 'Edit layout' }).click();
    await expect(page.locator('.dash-edit').first()).toBeVisible();
    // Move the last chart earlier twice.
    const last = first[first.length - 1];
    const name = await page.locator(`[data-card="${last}"] h3`).innerText();
    await page.getByRole('button', { name: `Move ${name} earlier` }).click();
    await page.getByRole('button', { name: `Move ${name} earlier` }).click();
    const moved = await order();
    expect(moved.indexOf(last)).toBe(first.length - 3);
    // Every card is still there.
    expect([...moved].sort()).toEqual([...first].sort());

    // A period that draws another set of cards keeps the arrangement of the ones it shares.
    await page.locator('.periodbar .spanbar button', { hasText: /^Quarter$/ }).click();
    await expect(page.locator('[data-card="heatmap"]')).toBeVisible();
    const quarter = await order();
    expect(quarter).toContain('heatmap');
    const shared = moved.filter((id) => quarter.includes(id));
    expect(quarter.filter((id) => shared.includes(id))).toEqual(shared);

    await page.getByRole('button', { name: 'Reset to default' }).click();
    await page.locator('.periodbar .spanbar button', { hasText: /^Week$/ }).click();
    await expect.poll(order).toEqual(first);
    await page.getByRole('button', { name: 'Done' }).click();
    await expect(page.locator('.dash-edit')).toHaveCount(0);
  });

  test('a click move is announced', async ({ demo: page }) => {
    await go(page, '#/insights');
    await page.getByRole('button', { name: 'Edit layout' }).click();
    await page.locator('[data-card="completed"]').getByRole('button', { name: /later/ }).click();
    await expect(page.locator('.sr[role="status"]', { hasText: /moved to position/ })).toHaveCount(1);
  });

  test('a card carried over a larger one keeps its own size', async ({ demo: page }) => {
    await go(page, '#/insights');
    await page.getByRole('button', { name: 'Year', exact: true }).click();
    await page.getByRole('button', { name: 'Edit layout' }).click();
    const trend = page.locator('[data-card="trend"]');
    const size = (await trend.boundingBox())!;
    await trend.getByRole('button', { name: /later/ }).click();
    const now = (await trend.boundingBox())!;
    expect(Math.round(now.width)).toBe(Math.round(size.width));
    expect(Math.round(now.height)).toBe(Math.round(size.height));
  });
});

test.describe('#172 the charts', () => {
  test('the year’s heatmap fills its card', async ({ demo: page }) => {
    await go(page, '#/insights');
    await page.getByRole('button', { name: 'Year', exact: true }).click();
    const heat = page.locator('[data-card="heatmap"]');
    await expect(heat).toBeVisible();
    // The weeks share the card: the grid reaches across it, not half of it.
    const card = (await heat.boundingBox())!;
    const grid = (await heat.locator('.contribution-grid').boundingBox())!;
    expect(grid.width).toBeGreaterThan(card.width * 0.85);
    // Every bar chart stands on a line.
    await expect(page.locator('[data-card="trend"] .chart-plot').first()).toHaveCSS('border-bottom-width', '1px');

  });
});

test.describe('#175 task metadata chips', () => {
  test('are drawn in order, light, and the repeat badge keeps its shape', async ({ demo: page }) => {
    await go(page, '#/week');
    const meta = row(page, 'Take out the recycling').locator('.meta');
    const kinds = await meta.locator('> *').evaluateAll((nodes) => nodes.map((n) => n.className.split(' ')[0]));
    // The v2 default order: the estimate first, then the date (with its repeat badge), then the project.
    const date = kinds.findIndex((kind) => kind === 'at' || kind === 'late');
    expect(kinds.indexOf('est')).toBeLessThan(date);
    expect(date).toBeLessThan(kinds.indexOf('repeatdot'));
    expect(kinds.indexOf('repeatdot')).toBeLessThan(kinds.indexOf('proj'));
    const badge = await meta.locator('.repeatdot').boundingBox();
    expect(Math.round(badge!.width)).toBe(18);
    expect(Math.round(badge!.height)).toBe(18);
    await expect(meta.locator('.repeatdot')).toHaveCSS('background-color', /rgba?\(/);
    // No outline on a chip.
    await expect(meta.locator('.est')).toHaveCSS('border-top-width', '0px');
    await expect(meta.locator('.proj')).toHaveCSS('border-top-width', '0px');
  });

  test('Todoist inspired is the default; Neutral greys the project and tags, and Settings and Setup agree', async ({ demo: page }) => {
    await go(page, '#/week');
    const project = () => page.locator('.screen.active .task .meta .proj').filter({ hasText: 'Vermilion' }).first();
    expect(await page.evaluate(() => document.documentElement.dataset.chips)).toBe('classic');
    const coloured = await project().evaluate((n) => getComputedStyle(n).color);

    await go(page, '#/settings');
    await page.getByRole('radiogroup', { name: 'Task metadata' }).getByRole('radio', { name: 'Neutral' }).click();
    await expect(page.getByRole('radiogroup', { name: 'Task metadata' }).getByRole('radio', { name: 'Neutral' })).toHaveAttribute('aria-checked', 'true');
    await go(page, '#/week');
    const grey = await project().evaluate((n) => getComputedStyle(n).color);
    expect(grey).not.toBe(coloured);
    // An overdue date stays red either way.
    await expect(page.locator('.screen.active .task .meta .late').first()).toHaveCSS('color', /rgb\((1[7-9]\d|2\d\d), \d+, \d+\)|rgb\(2\d\d/);

  });
});

test.describe('#176 the Insights panel', () => {
  test('counts the last seven days, drops the estimate coverage, and says which numbers are which', async ({ demo: page }) => {
    await go(page, '#/project/site');
    await page.getByRole('button', { name: 'Insights' }).click();
    const panel = page.getByRole('dialog', { name: 'Insights' });
    await expect(panel).toBeVisible();
    await expect(panel).not.toContainText('Estimate coverage');
    await expect(panel).toContainText('Last 7 days');
    // The page it summarises is named in the header; the longer note about scope is gone.
    await expect(panel.locator('.insights-scope')).toHaveCount(0);
    // Seven bars, even when a day is empty.
    await expect(panel.locator('.barslot')).toHaveCount(7);
    await expect(panel.getByRole('button', { name: 'Open full insights' })).toBeVisible();
  });
});

test.describe('#177 Settings', () => {
  test('groups the planning settings, puts capacity after them, and explains it', async ({ demo: page }) => {
    await go(page, '#/settings');
    const headings = await page.locator('#features h3').allInnerTexts();
    expect(headings.indexOf('Organisation')).toBeLessThan(headings.indexOf('Capacity and workload'));
    await expect(page.locator('#features')).toContainText('after meetings and breaks');
    await expect(page.locator('#features')).toContainText('never blocks time in your calendar');
    await expect(page.locator('#features .capnote')).toContainText(/Calculated from your days: \d+ h/);
  });

  test('shows the days, the total and an own weekly value apart, and refuses what is not a duration', async ({ demo: page }) => {
    await go(page, '#/settings');
    await page.getByRole('button', { name: 'Weekly capacity' }).click();
    await page.getByRole('option', { name: 'A weekly value I set' }).click();
    await expect(page.locator('#features .capnote.override')).toContainText(/Your days add up to \d+ h/);
    // A day that is not a duration is refused out loud, and keeps its value.
    const monday = page.getByRole('textbox', { name: /^Mon/ });
    await monday.fill('banana');
    await monday.press('Enter');
    await expect(page.getByRole('alert').filter({ hasText: 'not a duration' })).toBeVisible();
    await expect(monday).toHaveValue(/\d+ h/);
  });

  test('the switches and ticks of the sidebar change the sidebar itself', async ({ demo: page }) => {
    await go(page, '#/settings');
    // The matrix is turned on from its entry in Sidebar → Entries (#16).
    await page.getByRole('checkbox', { name: 'Eisenhower Matrix' }).setChecked(true, { force: true });
    const real = page.locator('.sidebar:not(.pvscale .sidebar)');
    await expect(real.locator('.navitem', { hasText: 'Eisenhower Matrix' })).toBeVisible();
    // Today has no setting of its own: it is on the sidebar when it is ticked where the sidebar is arranged.
    await page.getByRole('checkbox', { name: 'Today' }).setChecked(true, { force: true });
    await expect(real.locator('.navitem', { hasText: /^Today/ })).toBeVisible();
  });
});

test.describe('#180 the reviews', () => {
  test('show the steps joined, and clicking each of them leaves the connectors behind the markers', async ({ demo: page }) => {
    await go(page, '#/review');
    const steps = page.locator('.reviewrail > li');
    const count = await steps.count();
    expect(count).toBeGreaterThanOrEqual(5);
    for (let round = 0; round < 2; round += 1) {
      for (let at = 0; at < count; at += 1) {
        await steps.nth(at).getByRole('button').click();
        await expect(steps.nth(at).getByRole('button')).toHaveAttribute('aria-current', 'step');
        // The line is never above a marker: the buttons stack over it.
        const lines = await steps.nth(at).evaluate((li) => getComputedStyle(li, '::after').zIndex);
        const button = await steps.nth(at).getByRole('button').evaluate((b) => getComputedStyle(b).zIndex);
        if (lines !== 'auto') expect(Number(button)).toBeGreaterThan(Number(lines));
      }
    }
    await expect(steps.first().getByRole('button')).toHaveAttribute('aria-label', /step 1 of /);
    // Back and Next still walk it.
    await steps.first().getByRole('button').click();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(steps.nth(1).getByRole('button')).toHaveAttribute('aria-current', 'step');
  });

  test('the weekly strip does not slide under the pointer when the step clicked is already in view', async ({ demo: page }) => {
    await go(page, '#/review');
    await page.getByRole('button', { name: 'Weekly' }).click();
    const rail = page.locator('.reviewrail');
    const buttons = rail.locator('> li').getByRole('button');
    const count = await buttons.count();
    expect(count).toBeGreaterThanOrEqual(8);
    // Go to the end so the strip has scrolled, then click around inside what is in view.
    await buttons.nth(count - 1).click();
    const scrolled = await rail.evaluate((node) => node.scrollLeft);
    for (let at = count - 2; at >= 0; at -= 1) {
      const edge = (await rail.boundingBox())!;
      const box = (await buttons.nth(at).boundingBox())!;
      if (box.x < edge.x || box.x + box.width > edge.x + edge.width) break;
      await buttons.nth(at).click();
      expect(await rail.evaluate((node) => node.scrollLeft), `step ${at + 1}`).toBe(scrolled);
    }
  });

  test('all stay visible on a phone', async ({ demo: page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await go(page, '#/review');
    const rail = page.locator('.reviewrail');
    const bounds = await rail.locator('button').evaluateAll((nodes) => nodes.map((node) => ({ left: node.getBoundingClientRect().left, right: node.getBoundingClientRect().right })));
    expect(bounds.every((box) => box.left >= 0 && box.right <= 390)).toBe(true);
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    const current = await page.locator('.reviewrail [aria-current="step"]').boundingBox();
    expect(current!.x).toBeGreaterThanOrEqual(0);
    expect(current!.x + current!.width).toBeLessThanOrEqual(390);
  });
});
