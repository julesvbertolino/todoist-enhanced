import { describe, expect, it } from 'vitest';
import { DARK_SURFACE, LIGHT_SURFACE, MIN_CONTRAST, colorInk, colorValue, contrast } from './colors';

const TODOIST_COLOURS = [
  'berry_red', 'red', 'orange', 'yellow', 'olive_green', 'lime_green', 'green', 'mint_green', 'teal', 'sky_blue',
  'light_blue', 'blue', 'grape', 'violet', 'lavender', 'magenta', 'salmon', 'charcoal', 'grey', 'taupe',
];

describe('a project name in its own colour (#384)', () => {
  it.each(TODOIST_COLOURS)('%s reads at AA on the light page and on the dark one', (name) => {
    expect(contrast(colorInk(name, 'light'), LIGHT_SURFACE)).toBeGreaterThanOrEqual(MIN_CONTRAST);
    expect(contrast(colorInk(name, 'dark'), DARK_SURFACE)).toBeGreaterThanOrEqual(MIN_CONTRAST);
  });

  it('keeps a colour that already reads, and only darkens one that does not', () => {
    expect(colorInk('berry_red', 'light')).toBe(colorValue('berry_red'));
    expect(contrast(colorValue('orange'), LIGHT_SURFACE)).toBeLessThan(MIN_CONTRAST);
    expect(contrast(colorInk('orange', 'light'), LIGHT_SURFACE)).toBeGreaterThanOrEqual(MIN_CONTRAST);
  });

  it('stays the same hue: orange keeps more red than blue', () => {
    const [r, , b] = [1, 3, 5].map((at) => Number.parseInt(colorInk('orange', 'light').slice(at, at + 2), 16));
    expect(r).toBeGreaterThan(b * 2);
  });
});
