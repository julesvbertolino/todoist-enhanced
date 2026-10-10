import { test, expect } from '@playwright/test';

test.describe('fourth pass', () => {
  test('the tour never drops its highlight between two stops, even when a stop goes missing (#5)', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('skipSetup', '1'));
    await page.goto('/');
    await page.getByRole('button', { name: 'Explore with demo data' }).click();
    await page.evaluate(() => window.dispatchEvent(new Event('enhanced:tour')));
    const card = page.locator('.tour-card');
    await expect(card).toBeVisible();

    /* Clicks Next and counts the animation frames, over 400 ms, with no highlight on screen. */
    const step = (hide?: string) => page.evaluate(async (target) => {
      if (target) document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`).forEach((el) => { el.style.display = 'none'; });
      document.querySelector<HTMLButtonElement>('.tour-card .btn.primary')!.click();
      let missing = 0;
      const start = performance.now();
      await new Promise<void>((done) => {
        const frame = () => {
          if (!document.querySelector('.tour-hole')) missing += 1;
          if (performance.now() - start < 400) requestAnimationFrame(frame); else done();
        };
        requestAnimationFrame(frame);
      });
      return missing;
    }, hide);

    expect(await step()).toBe(0);
    /* The third stop's element disappears before it is reached: the tour moves on to the next one in one glide. */
    expect(await step('folder')).toBe(0);
    await expect(card.locator('h3')).toBeVisible();
  });
});
