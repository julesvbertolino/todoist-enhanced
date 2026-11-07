import { test, expect, go } from './demo';
import type { Page } from '@playwright/test';

const openCalendar = async (page: Page) => {
  await go(page, 'week');
  const active = page.locator('.screen.active');
  const display = active.getByRole('button', { name: /^Display(?: \d+)?$/ });
  await display.click();
  await active.getByRole('dialog', { name: 'Display', exact: true }).getByRole('button', { name: 'Calendar', exact: true }).click();
  await display.click();
  return active;
};

const dayOf = (page: Page, id: string) =>
  page.locator(`.screen.active [data-calendar-task="${id}"]`).evaluate((node) => node.closest('[data-calendar-day]')?.getAttribute('data-calendar-day'));

test('#323 ⌘-click picks calendar events, dragging one moves them all, Esc clears', async ({ demo: page }) => {
  const calendar = await openCalendar(page);
  const chips = calendar.locator('.calendar-all-day .calendar-chip');
  const first = chips.nth(0), second = chips.nth(1), third = chips.nth(2);
  const ids = await Promise.all([first, second, third].map((chip) => chip.getAttribute('data-calendar-task')));
  const before = await Promise.all(ids.map((id) => dayOf(page, id!)));

  await first.click({ modifiers: ['Meta'] });
  await second.click({ modifiers: ['Meta'] });
  await third.click({ modifiers: ['Meta'] });
  await expect(calendar.locator('.calendar-card.is-picked')).toHaveCount(3);
  await expect(page.getByText('3 selected')).toBeVisible();
  /* A plain click on a card still opens it, it does not pick it. */
  await expect(page.getByRole('dialog', { name: /./ })).toHaveCount(0);

  const box = (await first.boundingBox())!;
  /* Far enough to see, near enough that the others stay in the week: the first shift, by day, that keeps all three
     inside the days on screen (a fixed two days pushed one off the week on a Saturday). */
  const visibleDays = await calendar.locator('.calendar-all-day [data-calendar-day]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-calendar-day')!));
  const shiftBy = (day: string, days: number) => new Date(Date.parse(day) + days * 86400000).toISOString().slice(0, 10);
  const days = [2, -2, 1, -1, 3, -3].find((n) => before.every((day) => visibleDays.includes(shiftBy(day!, n))))!;
  const targetDay = shiftBy(before[0]!, days);
  const target = calendar.locator(`.calendar-all-day [data-calendar-day="${targetDay}"]`);
  const targetBox = (await target.boundingBox())!;
  await page.mouse.move(box.x + 30, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 12 });
  await page.mouse.up();

  const offset = (day: string, from: string) => Math.round((Date.parse(day) - Date.parse(from)) / 86400000);
  const shift = offset(targetDay, before[0]!);
  await expect.poll(async () => dayOf(page, ids[0]!)).toBe(targetDay);
  for (let i = 1; i < 3; i += 1) {
    await expect.poll(async () => offset((await dayOf(page, ids[i]!))!, before[i]!)).toBe(shift);
  }

  await page.keyboard.press('Escape');
  await expect(calendar.locator('.calendar-card.is-picked')).toHaveCount(0);
});

test('#323 several picked events change day only: all-day stays all-day, timed keeps its hour', async ({ demo: page }) => {
  const calendar = await openCalendar(page);
  const chip = calendar.locator('.calendar-all-day .calendar-chip').first();
  const block = calendar.locator('.calendar-block').first();
  const [chipId, blockId] = await Promise.all([chip.getAttribute('data-calendar-task'), block.getAttribute('data-calendar-task')]);
  const dayBefore = (await dayOf(page, blockId!))!;
  /* Measured inside its day column, the all-day row may change height. */
  const inColumn = (id: string) => page.locator(`.screen.active .calendar-block[data-calendar-task="${id}"]`).evaluate((node) => {
    const column = node.closest('[data-calendar-day]')!; return node.getBoundingClientRect().top - column.getBoundingClientRect().top;
  });
  const topBefore = await inColumn(blockId!);
  await chip.click({ modifiers: ['Meta'] });
  await block.click({ modifiers: ['Meta'] });
  await expect(calendar.locator('.calendar-card.is-picked')).toHaveCount(2);

  const box = (await chip.boundingBox())!;
  const targetDay = new Date(Date.parse((await dayOf(page, chipId!))!) + 86400000).toISOString().slice(0, 10);
  const targetBox = (await calendar.locator(`.calendar-all-day [data-calendar-day="${targetDay}"]`).boundingBox())!;
  await page.mouse.move(box.x + 30, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 12 });
  await page.mouse.up();

  await expect.poll(async () => dayOf(page, blockId!)).not.toBe(dayBefore);
  await expect(calendar.locator(`.calendar-all-day [data-calendar-task="${chipId}"]`)).toHaveCount(1);
  await expect(calendar.locator(`.calendar-block[data-calendar-task="${blockId}"]`)).toHaveCount(1);
  expect(Math.abs((await inColumn(blockId!)) - topBefore)).toBeLessThan(2);
});

test('#323 a plain click on an event still opens the task', async ({ demo: page }) => {
  const calendar = await openCalendar(page);
  await calendar.locator('.calendar-all-day .calendar-chip').first().locator('.calendar-card-title').click();
  await expect(calendar.locator('.calendar-card.is-picked')).toHaveCount(0);
  await expect(page.locator('.detail, [role="dialog"]').first()).toBeVisible();
});

test('#329 one set of urgency rules, read on dates and deadlines alike', async ({ demo: page }) => {
  await go(page, '#/settings');
  await go(page, 'matrix');
  await page.getByRole('button', { name: /^Display/ }).click();
  await expect(page.getByText('Or its deadline is')).toHaveCount(0);
  const chip = page.getByRole('button', { name: 'In 3 to 7 days' });
  await expect(page.locator('.chip', { hasText: 'Anytime this week' })).toBeVisible();
  await chip.click();
  await expect(chip).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await page.getByRole('button', { name: /^Display/ }).click();
  await expect(page.getByRole('button', { name: 'In 3 to 7 days' })).toHaveAttribute('aria-pressed', 'true');
});

test('#345 a chevron after the title opens a date picker that moves Today to another day', async ({ demo: page }) => {
  await go(page, 'today');
  const title = page.locator('.screen.active .ptitle');
  await expect(title).toContainText('Today');
  await title.getByRole('button', { name: 'Go to another day' }).click();
  await page.getByRole('dialog', { name: 'Go to another day' }).getByText('Tomorrow', { exact: true }).first().click();
  await expect(title).toContainText('Tomorrow');
  await expect(page.locator('.screen.active').getByText('Behind schedule')).toHaveCount(0);
  await title.getByRole('button', { name: 'Go to another day' }).click();
  await page.getByRole('dialog', { name: 'Go to another day' }).getByText('Today', { exact: true }).first().click();
  await expect(title).toContainText('Today');
});

test('#345 This week has the same chevron on its Today part', async ({ demo: page }) => {
  await go(page, 'week');
  const head = page.locator('.screen.active .ghead', { hasText: 'Today' }).first();
  await head.getByRole('button', { name: 'Go to another day' }).click();
  await page.getByRole('dialog', { name: 'Go to another day' }).getByText('Tomorrow', { exact: true }).first().click();
  await expect(page.locator('.screen.active .ghead', { hasText: 'Tomorrow' }).first()).toBeVisible();
});
