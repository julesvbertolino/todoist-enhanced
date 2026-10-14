import { test, expect, go, rows } from './demo';
import { resolve } from 'node:path';
test.skip(process.env.PLAYWRIGHT_DEV !== '1', 'Controlled development fixtures');
test('date views remove the scheduled switch; My week filters Today only', async ({ demo: page }) => {
  await go(page, 'week');
  await page.locator('.pactions').getByRole('button', { name: 'Display' }).click();
  const showToday = page.getByRole('switch', { name: 'Show Today tasks' });
  await expect(showToday).toHaveAttribute('aria-checked','true');
  await showToday.click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.screen.active .group.accent-late')).toContainText('Check the quote');
  await expect(rows(page).filter({ hasText: 'Send this month' })).toHaveCount(0);
  for (const view of ['upcoming','today']) {
    await go(page, view);
    await page.evaluate(async (key) => {
      const path = performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes('/src/store/store.ts'))!;
      const { useStore } = await import(path); const state = useStore.getState();
      const prefsPath = performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes('/src/store/prefs.ts'))!;
      const { viewPrefs } = await import(prefsPath);
      state.setViewPrefs(key, { filters: { ...viewPrefs(state.prefs, key).filters, includeScheduled: false } });
    }, view);
    expect(await rows(page).count()).toBeGreaterThan(0);
    await page.locator('.pactions').getByRole('button', { name: 'Display' }).click();
    await expect(page.getByRole('switch', { name: /Include scheduled|Show Today/ })).toHaveCount(0);
    await page.keyboard.press('Escape');
  }
});
test('French weekday wording creates one unified chip and projects weekdays as ordinary rows', async ({ demo: page }) => {
  await page.keyboard.press('q');
  const title = page.locator('.composerbox textarea').first();
  await title.fill('test chaque jour de la semaine #123');
  await expect(page.locator('.composerbox .nmark.recurrence')).toContainText('chaque jour de la semaine');
  await expect(page.locator('.composerbox .chipclear')).toHaveCount(0);
  await title.press('Meta+Enter'); await expect(page.locator('.composerbox')).toHaveCount(0);
  await go(page, 'upcoming');
  const forecasts = page.locator('[data-projection-id]').filter({ hasText: 'test' });
  expect(await forecasts.count()).toBeGreaterThan(5);
  await expect(forecasts.first().getByRole('checkbox')).toHaveAttribute('aria-disabled','true');
  await expect(forecasts.first().locator('.check')).toHaveCSS('border-top-style','dashed');
  await expect(page.getByText(/Future occurrences are forecasts|Some recurrence rules/)).toHaveCount(0);
  if (process.env.CAPTURE_REFINEMENTS === '1') await page.screenshot({ path: resolve(process.env.ARTIFACT_OUTPUT_DIR ?? '../../outputs', 'occurrences-revisees.png'), animations: 'disabled' });
});
test('search shares its header alignment and uses project and tag coloured pills', async ({ demo: page }) => {
  await go(page, 'search?q=week');
  const header = await page.locator('.screen.active .phead').boundingBox();
  const mode = await page.locator('.screen.active .mode').boundingBox();
  expect(Math.abs(header!.x-mode!.x)).toBeLessThan(1);
  await expect(page.locator('.search-place').filter({ hasText: /^week$/ })).toBeVisible();
  await expect(page.locator('.search-place').filter({ hasText: /^week$/ }).locator('svg')).toHaveCount(1);
  await go(page, 'search?q=Home');
  await expect(page.locator('.search-place').filter({ hasText: /Home$/ })).toBeVisible();
  if (process.env.CAPTURE_REFINEMENTS === '1') await page.screenshot({ path: resolve(process.env.ARTIFACT_OUTPUT_DIR ?? '../../outputs', 'recherche-revisee.png'), animations:'disabled' });
});
test('Insights hover stays tinted with no visible border or shadow', async ({ demo: page }) => {
  const button = page.locator('.insights-control'); await button.hover();
  await expect(button).toHaveCSS('box-shadow','none');
  await expect(button).toHaveCSS('border-top-color','rgba(0, 0, 0, 0)');
  expect(await button.evaluate((e) => getComputedStyle(e).backgroundColor)).not.toBe('rgb(255, 255, 255)');
});
test('duration acknowledgement is a small transient glyph, with no visible status text', async ({ demo: page }) => {
  await rows(page).first().click();
  const input = page.locator('[data-prop="estimate"] input');
  await input.fill('90'); await input.press('Enter');
  await expect(input).toHaveValue('1 h 30');
  await expect(page.locator('[data-prop="estimate"] .est-feedback.accepted')).toBeVisible();
  await expect(page.locator('[data-prop="estimate"] [role="status"]')).toHaveClass('sr');
  if (process.env.CAPTURE_REFINEMENTS === '1') await page.screenshot({ path: resolve(process.env.ARTIFACT_OUTPUT_DIR ?? '../../outputs', 'duree-revisee.png'), animations:'allow' });
  await expect(page.locator('[data-prop="estimate"] .est-feedback')).toHaveCount(0);
});


test('My Week Today toggle remains available with the separate Today sidebar page', async ({ demo: page }) => {
  await page.evaluate(async () => {
    const path = performance.getEntriesByType('resource').map((entry) => entry.name).find((url) => /\/src\/store\/store\.ts(?:\?|$)/.test(url))!;
    const { useStore } = await import(path);
    useStore.getState().setPrefs({ weekLayout: 'split' });
  });
  await go(page, 'week');
  const count = page.locator('.sidebar [data-tour="week"] .count');
  const beforeCount = Number(await count.innerText());
  await page.locator('.pactions').getByRole('button', { name: /^Display/ }).click();
  const toggle = page.getByRole('switch', { name: 'Show Today tasks' });
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await toggle.click();
  await page.keyboard.press('Escape');
  await expect(rows(page).filter({ hasText: 'Send this month' })).toHaveCount(0);
  expect(Number(await count.innerText())).toBeLessThan(beforeCount);
  await expect(page.locator('.screen.active .group.accent-late')).toContainText('Check the quote');
  await page.locator('.pactions').getByRole('button', { name: /^Display/ }).click();
  await toggle.click();
  await page.keyboard.press('Escape');
  await expect(rows(page).filter({ hasText: 'Send this month' })).toBeVisible();
  await expect(count).toHaveText(String(beforeCount));
});

test('task properties keep rounded borders and a quiet hover', async ({ demo: page }) => {
  await rows(page).first().click();
  const input = page.locator('[data-prop="estimate"] input');
  await expect(input).toHaveCSS('border-top-left-radius', '999px');
  await input.hover();
  expect(await input.evaluate((el) => getComputedStyle(el).boxShadow)).not.toContain('rgb(0, 0, 0)');
});

test('Insights does not move while pressed and its dark state stays readable', async ({ demo: page }) => {
  const button = page.locator('.insights-control');
  const initial = await button.evaluate((el) => getComputedStyle(el).backgroundColor);
  await page.evaluate(async () => {
    const path = performance.getEntriesByType('resource').map((entry) => entry.name).find((url) => /\/src\/store\/store\.ts(?:\?|$)/.test(url))!;
    const { useStore } = await import(path); useStore.getState().setPrefs({ accent: 'blue' });
  });
  await expect(page.locator('html')).toHaveAttribute('data-accent', 'blue');
  expect(await button.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(initial);
  const before = await button.boundingBox();
  await button.hover(); await page.mouse.down();
  const pressed = await button.boundingBox();
  expect(pressed!.y).toBe(before!.y);
  await expect(button).toHaveCSS('transform', 'none');
  await page.mouse.up();
  await page.evaluate(() => document.documentElement.dataset.theme = 'dark');
  const colours = await button.evaluate((el) => ({ text: getComputedStyle(el).color, background: getComputedStyle(el).backgroundColor }));
  expect(colours.text).not.toBe(colours.background);
});

test('list and full width board headers share the same available width', async ({ demo: page }) => {
  await page.setViewportSize({ width: 1800, height: 1000 });
  await go(page, 'week');
  const header = page.locator('.screen.active .phead');
  const mode = page.locator('.screen.active .mode');
  const list = await mode.boundingBox();
  expect(list!.width).toBeGreaterThan(1092);
  expect((await header.boundingBox())!.width).toBe(list!.width);
  await page.evaluate(async () => {
    const path = performance.getEntriesByType('resource').map((entry) => entry.name).find((url) => /\/src\/store\/store\.ts(?:\?|$)/.test(url))!;
    const { useStore } = await import(path);
    useStore.getState().setViewPrefs('week', { mode: 'board' });
  });
  await expect(page.locator('.screen.active .board')).toBeVisible();
  expect((await header.boundingBox())!.width).toBe(list!.width);
});

test('native team folders show their children and collapse without becoming projects', async ({ demo: page }) => {
  await page.evaluate(async () => {
    const path = performance.getEntriesByType('resource').map((entry) => entry.name).find((url) => /\/src\/store\/store\.ts(?:\?|$)/.test(url))!;
    const { useStore } = await import(path);
    const snapshot = useStore.getState().snapshot;
    useStore.setState({ snapshot: { ...snapshot,
      folders: { native: { id: 'native', name: 'Native folder', workspace_id: 'ws-pro', child_order: 1 } },
      projects: { ...snapshot.projects, site: { ...snapshot.projects.site, parent_id: null, folder_id: 'native' } },
    } });
  });
  const folder = page.locator('.sidebar').getByRole('button', { name: 'Native folder', exact: true });
  await expect(folder).toBeVisible();
  const child = folder.locator('xpath=../..').locator('[data-project-row="site"]');
  await expect(child).toBeVisible();
  await folder.click();
  await expect(child).toHaveCount(0);
  await folder.click();
  await expect(child).toBeVisible();
});


test('Display toggles have equal spacing between their separators', async ({ demo: page }) => {
  for (const view of ['today', 'upcoming', 'week']) {
    await go(page, view);
    await page.locator('.pactions').getByRole('button', { name: /^Display/ }).click();
    const spacing = await page.locator('.display-toggles').evaluate((el) => {
      const row = el.querySelector('.panelrow')!.getBoundingClientRect();
      const last = el.lastElementChild!.getBoundingClientRect();
      const before = el.previousElementSibling!.getBoundingClientRect();
      const after = el.nextElementSibling!.getBoundingClientRect();
      return { top: row.top - before.bottom, bottom: after.top - last.bottom };
    });
    expect(Math.abs(spacing.top - spacing.bottom)).toBeLessThanOrEqual(1);
    await page.keyboard.press('Escape');
  }
});


test('Today stays reachable by keyboard when hidden in the sidebar and excluded from My Week', async ({ demo: page }) => {
  await page.evaluate(async () => {
    const path = performance.getEntriesByType('resource').map((entry) => entry.name).find((url) => /\/src\/store\/store\.ts(?:\?|$)/.test(url))!;
    const { useStore } = await import(path);
    const state = useStore.getState();
    state.setPrefs({ weekLayout: 'unified' });
    const prefsPath = performance.getEntriesByType('resource').map((entry) => entry.name).find((url) => /\/src\/store\/prefs\.ts(?:\?|$)/.test(url))!;
    const { viewPrefs } = await import(prefsPath);
    state.setViewPrefs('week', { filters: { ...viewPrefs(state.prefs, 'week').filters, includeScheduled: false } });
  });
  await page.keyboard.press('g'); await page.keyboard.press('t');
  await expect(page.locator('.screen.active h1')).toHaveText('Today');
  await expect(rows(page).filter({ hasText: 'Send this month' })).toBeVisible();
});


test('relative hours create a date chip rather than a duration chip', async ({ demo: page }) => {
  await page.keyboard.press('q');
  const input = page.locator('.composerbox textarea').first();
  for (const phrase of ['Appeler dans deux heures', 'Appeler dans 2 heures', 'Appeler dans 30 minutes']) {
    await input.fill(phrase);
    await expect(page.locator('.composerbox .nmark.date')).toBeVisible();
    await expect(page.locator('.composerbox .nmark.duration')).toHaveCount(0);
  }
  await input.fill('Écrire 2h');
  await expect(page.locator('.composerbox .nmark.duration')).toBeVisible();
  await expect(page.locator('.composerbox .nmark.date')).toHaveCount(0);
});
