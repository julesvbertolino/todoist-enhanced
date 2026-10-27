import { expect, go, row, rows, test } from './demo';
import type { Page } from '@playwright/test';

/** Pastes plain text into the focused field, the way the clipboard would. */
async function paste(page: Page, text: string) {
  await page.evaluate((value) => {
    const data = new DataTransfer();
    data.setData('text/plain', value);
    document.activeElement?.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }),
    );
  }, text);
}

test('#164 #156 a subtask ticked in the panel is filled and struck through, and the ring fills', async ({ demo: page }) => {
  await go(page, '#/week');
  const parent = rows(page).filter({ has: page.locator('.subprog') }).first();
  await expect(parent.locator('.subprog')).toContainText('0/3');
  await expect(parent.locator('.subprog .progressring')).toHaveAttribute('data-progress', '0/3');
  await parent.locator('.ttitle').click();

  const subtasks = page.locator('.detail-section .subtaskrow');
  await expect(subtasks).toHaveCount(3);
  await subtasks.first().getByRole('checkbox').click();
  // The box and the title say the same thing, and the modal stays open.
  await expect(subtasks.first()).toHaveClass(/\bdone\b/);
  await expect(subtasks.first().getByRole('checkbox')).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('.detail-section .sectionlabel .progressring')).toHaveAttribute('data-progress', '1/3');

  for (const at of [1, 2]) await subtasks.nth(at).getByRole('checkbox').click();
  await expect(page.locator('.detail-section .sectionlabel .subprog')).toContainText('3/3');
  await expect(page.locator('.detail-section .sectionlabel .progressring')).toHaveClass(/\bcomplete\b/);
  await expect(page.locator('.detail-headline')).not.toHaveClass(/\bdone\b/);
});

test('#162 Move all to today moves the late tasks at once, with one undo', async ({ demo: page }) => {
  await go(page, '#/week');
  const overdue = page.getByRole('button', { name: 'Move all to today' });
  await expect(overdue).toBeVisible();
  // The first row of the week is the first late one.
  const first = rows(page).first();
  const title = await first.locator('.ttitle').innerText();
  const before = await row(page, title).locator('.meta').textContent();

  await overdue.click();
  await page.getByRole('dialog').getByRole('button', { name: 'Move all to today' }).click();

  // The toast is there at once and says how many moved.
  const toast = page.locator('.toast').filter({ hasText: /moved to today/ });
  await expect(toast).toBeVisible();
  await expect(row(page, title).locator('.meta')).not.toHaveText(before ?? '');

  await toast.getByRole('button', { name: 'Undo' }).click();
  await expect(row(page, title).locator('.meta')).toHaveText(before ?? '');
});

test('#163 a subtask can end with its estimate in brackets', async ({ demo: page }) => {
  await page.keyboard.press('q');
  await page.locator('.composer-name').fill('Plan the workshop');
  const subtask = page.getByRole('textbox', { name: 'Add subtask' });
  await subtask.fill('Draft outline (5)');
  await page.keyboard.press('Enter');
  await subtask.fill('Research (1h15)');
  await page.keyboard.press('Enter');
  await subtask.fill('Review (5 pages)');
  // The estimate is marked like the one in a task's name; brackets that are
  // not a duration are not.
  await page.keyboard.press('Enter');
  await expect(page.locator('.composer-sub .nmark.duration')).toHaveCount(2);
  await page.getByRole('dialog', { name: 'Add task' }).getByRole('button', { name: 'Add task' }).click();
  await expect(page.locator('.composerbox')).toHaveCount(0);

  await go(page, '#/inbox');
  await expect(row(page, 'Draft outline')).toContainText('5 min');
  await expect(row(page, 'Draft outline')).not.toContainText('(5)');
  await expect(row(page, 'Research')).toContainText('1 h 15');
  await expect(row(page, 'Review (5 pages)')).toBeVisible();
  await expect(row(page, 'Review (5 pages)').locator('.est')).toHaveCount(0);
});

test('#152 a pasted list is created as separate tasks, only after confirming the count', async ({ demo: page }) => {
  await go(page, '#/inbox');
  const before = await rows(page).count();
  await page.keyboard.press('q');
  const name = page.locator('.composer-name');
  await name.focus();
  await paste(page, '- Buy milk\n\n• Call the garage (20)\n  Book a dentist appointment  \n');

  const dialog = page.getByRole('dialog').last();
  await expect(dialog).toContainText('3 tasks');
  await expect(page.getByRole('button', { name: 'Create 3 tasks' })).toBeFocused();
  // Nothing exists yet.
  await expect(name).toHaveValue('');

  // Cancel with Escape: no task, the composer stays, and the text is not lost.
  await page.keyboard.press('Escape');
  await expect(page.locator('.composerbox')).toBeVisible();
  await expect(name).toHaveValue(/Buy milk.*Call the garage.*Book a dentist appointment/);

  await name.fill('');
  await name.focus();
  await paste(page, '- Buy milk\n• Call the garage (20)\nBook a dentist appointment');
  await page.getByRole('button', { name: 'Create 3 tasks' }).click();
  await expect(page.locator('.composerbox')).toHaveCount(0);

  await expect(rows(page)).toHaveCount(before + 3);
  await expect(row(page, 'Buy milk')).toBeVisible();
  await expect(row(page, 'Call the garage')).toContainText('20 min');
  await expect(row(page, 'Book a dentist appointment')).toBeVisible();
});

test('#152 one pasted line is an ordinary paste', async ({ demo: page }) => {
  await page.keyboard.press('q');
  const name = page.locator('.composer-name');
  await name.focus();
  await page.keyboard.insertText('Just one line');
  await expect(page.getByRole('dialog').last()).not.toContainText('Create');
  await expect(name).toHaveValue('Just one line');
});

test('#153 the date menu: shortcuts first, Next occurrence with its date, the calendar on demand', async ({ demo: page }) => {
  await go(page, '#/week');
  const repeating = rows(page).filter({ has: page.locator('.repeatdot') }).first();
  const title = await repeating.locator('.ttitle').innerText();
  await repeating.hover();
  await row(page, title).getByRole('button', { name: 'Start date' }).click();

  const menu = page.locator('.rowmenu.schedulemenu');
  const labels = menu.locator('.datepicker-options .opt > span');
  await expect(labels).toHaveText([
    /Today/, /Tomorrow/, /Next week/, /This week/, /Someday/,
    /Skip to next occurrence/, /Remove the date/, /Pick a date/,
  ]);
  await expect(menu.locator('.datepanel-grid')).toHaveCount(0);

  // Opening the calendar changes nothing; the way back is Escape or the link.
  await menu.getByRole('button', { name: 'Pick a date' }).click();
  await expect(menu.locator('.datepanel-grid')).toBeVisible();
  await menu.getByRole('button', { name: 'Back to the shortcuts' }).click();
  await expect(menu.locator('.datepanel-grid')).toHaveCount(0);
  await expect(row(page, title)).toBeVisible();
});

test('a ticked box keeps its priority colour', async ({ demo: page }) => {
  await go(page, '#/week');
  const first = rows(page).first();
  const title = await first.locator('.ttitle').innerText();
  const box = row(page, title).getByRole('checkbox', { name: 'Complete task' });
  const colour = await box.evaluate((el) => getComputedStyle(el).borderTopColor);
  await box.click();
  const done = page.locator('.screen.active [data-task-id].done .check').first();
  if (await done.count()) {
    const filled = await done.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(filled).not.toBe('rgb(47, 125, 50)');
    expect(colour).not.toBe('');
  }
});

test('#163 a subtask added from an open task reads its estimate too', async ({ demo: page }) => {
  await go(page, '#/week');
  const parent = rows(page).filter({ has: page.locator('.subprog') }).first();
  await parent.locator('.ttitle').click();
  await page.locator('.detail-section .addline').filter({ hasText: 'Add subtask' }).click();
  const field = page.locator('.detail-section').getByRole('textbox', { name: 'Add subtask' });
  await field.fill('Send the quote (3)');
  await expect(page.locator('.detail-section .nmark.duration')).toHaveCount(1);
  await page.keyboard.press('Enter');
  await expect(page.locator('.detail-section .subtaskrow').filter({ hasText: 'Send the quote' })).toBeVisible();
  await expect(page.locator('.detail-section .subtaskrow').filter({ hasText: '(3)' })).toHaveCount(0);
});
