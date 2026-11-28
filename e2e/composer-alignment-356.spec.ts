import { test, expect } from './demo';

test('composer subtask text and checkbox stay centred before and after typing', async ({ demo }) => {
  await demo.keyboard.press('q');
  const row = demo.locator('.composer-sub.adding');
  const input = row.locator('input');
  await expect(input).toBeVisible();
  /* Both boxes read in the same frame: the sheet may still be sliding in. */
  const aligned = async () => {
    const gap = await row.evaluate((el) => {
      const a = el.querySelector('.check')!.getBoundingClientRect();
      const b = el.querySelector('input')!.getBoundingClientRect();
      return Math.abs((a.y + a.height / 2) - (b.y + b.height / 2));
    });
    expect(gap).toBeLessThanOrEqual(2);
  };
  await aligned();
  await input.fill('A subtask');
  await aligned();
});
