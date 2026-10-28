import { test, expect } from './demo';

test('composer subtask text and checkbox stay centred before and after typing', async ({ demo }) => {
  await demo.keyboard.press('q');
  const row = demo.locator('.composer-sub.adding');
  const checkbox = row.locator('.check');
  const input = row.locator('input');
  await expect(input).toBeVisible();
  const aligned = async () => {
    const a = (await checkbox.boundingBox())!;
    const b = (await input.boundingBox())!;
    expect(Math.abs((a.y + a.height / 2) - (b.y + b.height / 2))).toBeLessThanOrEqual(2);
  };
  await aligned();
  await input.fill('A subtask');
  await aligned();
});
