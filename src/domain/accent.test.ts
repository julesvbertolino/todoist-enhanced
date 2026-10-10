import { describe, expect, it } from 'vitest';
import { accentFamily, backdropGradient, contrast } from './accent';

const stops = (gradient: string) => [...gradient.matchAll(/#[0-9a-f]{6}/g)].map((m) => m[0]);

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const againstWhite = (hex: string) => 1.05 / (luminance(hex) + 0.05);

describe('backdropGradient', () => {
  it('runs from lighter to deeper, through the accent itself', () => {
    const [top, mid, bottom] = stops(backdropGradient('#246fe0'));
    expect(mid).toBe('#246fe0');
    expect(luminance(top)).toBeGreaterThan(luminance(mid));
    expect(luminance(bottom)).toBeLessThan(luminance(mid));
  });

  it('keeps white text readable at its lightest stop, whatever the accent', () => {
    for (const accent of ['#b85c19', '#d1453b', '#4c8631', '#2b2f3a', '#8a5a44', '#9a7000']) {
      const [top] = stops(backdropGradient(accent));
      expect(againstWhite(top)).toBeGreaterThanOrEqual(Math.min(3, againstWhite(accent)));
    }
  });

  it('is a visible gradient for the default red', () => {
    const [top, mid] = stops(backdropGradient('#d1453b'));
    expect(top).not.toBe(mid);
  });

  it('leaves a value that is not a hex colour alone', () => {
    expect(backdropGradient('red')).toBe('red');
  });
});

describe('a custom accent', () => {
  it('is the colour that was picked, exactly, however light it is', () => {
    for (const colour of ['#90ee90', '#66cc66', '#ffdd00', '#246fe0', '#222222']) {
      expect(accentFamily(colour, 'light').accent).toBe(colour);
      expect(accentFamily(colour, 'dark').accent).toBe(colour);
    }
  });

  it('carries white ink while white reads on it, and dark ink once the colour is too light', () => {
    expect(accentFamily('#246fe0', 'light')['on-accent']).toBe('#ffffff');
    for (const colour of ['#90ee90', '#ffdd00', '#ff968e']) {
      const ink = accentFamily(colour, 'light')['on-accent'];
      expect(ink).not.toBe('#ffffff');
      expect(ink).not.toBe('#1d1d1f');
      expect(contrast(ink, colour)).toBeGreaterThanOrEqual(7);
    }
  });

  it('gives two different light greens two different families', () => {
    expect(accentFamily('#90ee90', 'light')['accent-soft']).not.toBe(accentFamily('#66cc66', 'light')['accent-soft']);
  });
});

