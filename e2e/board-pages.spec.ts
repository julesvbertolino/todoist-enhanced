import { test, expect, go } from './demo';

test('#99 a board is a whole number of columns, and the arrows turn a page', async ({ demo: page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await go(page, '#/upcoming');
  await page.getByRole('button', { name: 'Display' }).click();
  await page.getByRole('button', { name: 'Board', exact: true }).first().click();
  await page.keyboard.press('Escape');

  const board = page.locator('.screen.active .board');
  await expect(board).toBeVisible();

  /** The columns on screen, and whether each one is there whole. */
  const onScreen = () => board.evaluate((el) => {
    const edge = el.getBoundingClientRect();
    return Array.from(el.children)
      .map((column) => column.getBoundingClientRect())
      .filter((r) => r.right > edge.left + 1 && r.left < edge.right - 1)
      .map((r) => r.left >= edge.left - 1 && r.right <= edge.right + 1);
  });

  await expect.poll(async () => (await onScreen()).every(Boolean)).toBe(true);
  const perPage = (await onScreen()).length;
  expect(perPage).toBeGreaterThan(1);

  const firstOnScreen = () => board.evaluate((el) => {
    const edge = el.getBoundingClientRect();
    const first = Array.from(el.children).find((c) => c.getBoundingClientRect().right > edge.left + 1);
    return first?.querySelector('strong')?.textContent ?? '';
  });
  const before = await firstOnScreen();
  await page.getByRole('button', { name: 'Next columns' }).click();
  await expect.poll(firstOnScreen).not.toBe(before);
  await expect.poll(async () => (await onScreen()).every(Boolean)).toBe(true);
  expect((await onScreen()).length).toBe(perPage);
});
