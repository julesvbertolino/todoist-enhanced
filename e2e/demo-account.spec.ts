import { test, expect } from '@playwright/test';

/* The product's own demo, not the fixture the other specs use: what the guided
   tour walks through must be in the sidebar, in both languages. */
for (const [lang, names] of [
  ['en', ['Personal', 'Health', 'Home', 'London weekend', 'New York Marathon', 'Book club', 'Reading list', 'Robin Studio', 'Team', 'Atelier Lumen website', 'Domaine Aurel', 'Bloom & Co']],
  ['fr', ['Perso', 'Santé', 'Maison', 'Week-end à Londres', 'Marathon de New York', 'Club de lecture', 'À lire', 'Robin Studio', 'Équipe', 'Site Atelier Lumen', 'Domaine Aurel', 'Bloom & Co']],
] as const) {
  test.describe(lang, () => {
  test.use({ locale: lang === 'fr' ? 'fr-FR' : 'en-US' });
  test(`the demo account in ${lang}: same person, workspaces and projects`, async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('skipSetup', '1'));
    await page.goto('/');
    await page.getByRole('button', { name: lang === 'fr' ? /données de démonstration/ : 'Explore with demo data' }).click();
    const side = page.locator('.sidebar');
    await expect(side.getByText('Robin', { exact: true }).first()).toBeVisible();
    for (const name of names) await expect(side.getByText(name, { exact: true }).first()).toBeAttached();
    await expect(side.getByText('Alex Martin')).toHaveCount(0);
    await expect(side.locator('img[src*="unsplash"]').first()).toBeAttached();
  });
  });
}
