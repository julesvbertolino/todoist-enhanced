import { test, expect, go } from './demo';

test('dashboard filters completion history and previous comparison and restores them after reload', async ({ demo }) => {
  await go(demo, '#/insights');
  const completed = demo.locator('[data-card="completed"]');
  await expect(completed).toBeVisible();
  const original = await completed.innerText();
  await demo.getByRole('button', { name: /^Display/ }).click();
  await demo.getByRole('button', { name: /^Priority:/ }).click();
  const priorities = demo.getByRole('dialog', { name: 'Priority', exact: true });
  for (const p of ['P2', 'P3', 'P4']) await priorities.getByRole('checkbox', { name: p, exact: true }).uncheck();
  await expect(demo.getByRole('button', { name: 'Priority: P1' })).toBeVisible();
  await expect.poll(() => completed.innerText()).not.toBe(original);
  await demo.keyboard.press('Escape');
  await demo.reload();
  await demo.getByRole('button', { name: /^Display/ }).click();
  await expect(demo.getByRole('button', { name: 'Priority: P1' })).toBeVisible();
  await demo.getByRole('button', { name: 'Reset all' }).click();
  await expect(demo.getByRole('button', { name: /^Priority: Any/ })).toBeVisible();
  await expect.poll(() => completed.innerText()).toBe(original);
});
