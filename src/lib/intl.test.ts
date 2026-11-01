import { describe, expect, it } from 'vitest';
import { intlDate, intlNumber, intlRelative } from './intl';

describe('cached formatters', () => {
  it('returns the same instance for the same locale and options', () => {
    expect(intlDate('en-GB', { weekday: 'short' })).toBe(intlDate('en-GB', { weekday: 'short' }));
    expect(intlRelative('fr-FR', { numeric: 'always' })).toBe(intlRelative('fr-FR', { numeric: 'always' }));
    expect(intlNumber('en-GB', { style: 'unit', unit: 'day' })).toBe(intlNumber('en-GB', { style: 'unit', unit: 'day' }));
  });

  it('keeps one formatter per locale and per set of options', () => {
    expect(intlDate('en-GB', { weekday: 'short' })).not.toBe(intlDate('fr-FR', { weekday: 'short' }));
    expect(intlDate('en-GB', { weekday: 'short' })).not.toBe(intlDate('en-GB', { weekday: 'long' }));
  });

  it('writes exactly what a fresh formatter writes', () => {
    const day = new Date(2026, 9, 24);
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    expect(intlDate('fr-FR', options).format(day)).toBe(new Intl.DateTimeFormat('fr-FR', options).format(day));
  });
});
