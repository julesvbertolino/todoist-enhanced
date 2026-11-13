import { test, expect } from './demo';

/** Typing in the date picker grows it with suggestions; it must not jump around the field. */
for (const height of [900, 720, 560, 430]) {
  test(`the composer's date picker stays where it opened while typing (${height}px high window)`, async ({ demo: page }) => {
    await page.setViewportSize({ width: 1280, height });
    await page.keyboard.press('q');
    const composer = page.locator('.composerbox');
    await expect(composer).toBeVisible();
    const chip = composer.locator('.datefield button').first();
    await chip.click();
    const picker = page.locator('.datepanel');
    await expect(picker).toBeVisible();
    await page.waitForTimeout(150);
    let field = (await chip.boundingBox())!;
    const first = (await picker.boundingBox())!;
    const overlaps = (box: { y: number; height: number }) => box.y < field.y + field.height - 1 && box.y + box.height > field.y + 1;
    expect(overlaps(first), 'at opening').toBe(false);
    const above = first.y + first.height <= field.y + 1;
    /* The gap between the picker and the field it hangs from. */
    const edge = (box: { y: number; height: number }) => (above ? field.y - (box.y + box.height) : box.y - (field.y + field.height));
    const seen: number[] = [edge(first)];
    for (const text of ['n', 'ne', 'next', 'next f', 'next fri', 'next friday', 'every wee']) {
      await page.keyboard.press('Control+a');
      await page.keyboard.type(text);
      await page.waitForTimeout(120);
      field = (await chip.boundingBox())!;
      const box = (await picker.boundingBox())!;
      // Still on the same side of the field, with the edge facing it unmoved.
      expect(overlaps(box), text).toBe(false);
      expect(box.y + box.height <= field.y + 1, text).toBe(above);
      seen.push(edge(box));
      expect(box.y, text).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height, text).toBeLessThanOrEqual(height);
    }
    for (const value of seen) expect(Math.abs(value - seen[0])).toBeLessThanOrEqual(1);
  });
}
