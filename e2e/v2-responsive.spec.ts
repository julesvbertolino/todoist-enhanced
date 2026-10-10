import { test, expect, go } from './demo';

const ROUTES = ['#/week', '#/inbox', '#/upcoming', '#/someday', '#/review', '#/insights', '#/insights/logbook', '#/settings', '#/project/site'];

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`on a phone, ${scheme}`, () => {
    test.use({ viewport: { width: 375, height: 812 }, colorScheme: scheme });

    for (const route of ROUTES) {
      test(`${route} does not scroll sideways`, async ({ demo: page }) => {
        await go(page, route);
        await page.waitForTimeout(250);
        const overflow = await page.evaluate(() => {
          const root = document.documentElement;
          return { page: root.scrollWidth - window.innerWidth };
        });
        expect(overflow.page, `page ${route}`).toBeLessThanOrEqual(1);
      });
    }

    test('a group title never runs under its count or its action', async ({ demo: page }) => {
      await go(page, '#/week');
      const clashes = await page.evaluate(() => {
        const bad: string[] = [];
        document.querySelectorAll<HTMLElement>('.screen.active .ghead, .screen.active .grouphead').forEach((head) => {
          const kids = Array.from(head.children).map((el) => el.getBoundingClientRect()).filter((r) => r.width > 0);
          for (let i = 0; i < kids.length; i += 1) for (let j = i + 1; j < kids.length; j += 1) {
            const a = kids[i]; const b = kids[j];
            if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) bad.push(head.textContent?.slice(0, 40) ?? '');
          }
        });
        return bad;
      });
      expect(clashes).toEqual([]);
    });

    test('the setup fits the screen and keeps its buttons in view', async ({ demo: page }) => {
      await go(page, '#/settings');
      await page.getByRole('button', { name: 'Redo the setup' }).click();
      await page.locator('.setup').getByRole('button', { name: 'Continue' }).click();
      const box = (await page.locator('.setup').boundingBox())!;
      expect(box.width).toBeLessThanOrEqual(375);
      await expect(page.locator('.setup').getByRole('button', { name: 'Continue' })).toBeInViewport();
    });

    test('notifications and the open task fit the screen', async ({ demo: page }) => {
      await go(page, '#/week');
      await page.evaluate(() => window.dispatchEvent(new CustomEvent('enhanced:share', { detail: { projectId: 'site' } })));
      const share = page.getByRole('dialog', { name: 'Share' });
      expect((await share.boundingBox())!.width).toBeLessThanOrEqual(375);
    });
  });
}
