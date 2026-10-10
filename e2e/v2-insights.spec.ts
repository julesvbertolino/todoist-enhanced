import { test, expect, go } from './demo';

test.describe('Dashboard and Logbook (v2)', () => {
  test('each page has its own title and the dates only show under Custom', async ({ demo: page }) => {
    await go(page, '#/insights');
    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('tab')).toHaveCount(0);
    await expect(page.locator('.rangefields')).toHaveCount(0);
    await page.locator('.periodbar .spanbar button', { hasText: /^Custom$/ }).click();
    await expect(page.locator('.rangefields')).toBeVisible();
    await expect(page.locator('.spanbar button[aria-pressed="true"]')).toHaveText('Custom');

    await go(page, '#/insights/logbook');
    await expect(page.getByRole('heading', { level: 1, name: 'Logbook' })).toBeVisible();
  });

  test('Edit layout is on the Dashboard, and not on the Logbook', async ({ demo: page }) => {
    await go(page, '#/insights');
    await expect(page.getByRole('button', { name: 'Edit layout' })).toBeVisible();
    await go(page, '#/insights/logbook');
    await expect(page.getByRole('button', { name: 'Edit layout' })).toHaveCount(0);
  });

  test('the Logbook groups by day, month, project or priority, and sorts by date or priority', async ({ demo: page }) => {
    await go(page, '#/insights/logbook');
    await page.locator('.periodbar .spanbar button', { hasText: /^Year$/ }).click();
    const groups = page.locator('.logbook .logday');
    await expect(groups.first()).toBeVisible();

    const group = page.getByRole('group', { name: 'Group by' });
    await group.getByRole('button', { name: 'Priority' }).click();
    await expect(group.getByRole('button', { name: 'Priority' })).toHaveAttribute('aria-pressed', 'true');
    await expect(groups.first().locator('h4')).toContainText(/^P[1-4]/);

    await group.getByRole('button', { name: 'Month' }).click();
    await expect(groups.first().locator('h4')).toContainText(/20\d\d/);

    const sort = page.getByRole('group', { name: 'Sort by' });
    await sort.getByRole('button', { name: 'Priority' }).click();
    await expect(sort.getByRole('button', { name: 'Priority' })).toHaveAttribute('aria-pressed', 'true');
    // Highest priority first inside a cut.
    const ticks = await groups.first().locator('.logtick').evaluateAll((all) =>
      all.map((n) => Number(/p([1-4])/.exec(n.className)?.[1])));
    expect(ticks).toEqual([...ticks].sort((a, b) => a - b));
  });
});
