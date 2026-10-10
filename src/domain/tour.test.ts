import { describe, expect, it } from 'vitest';
import english from '../../CHANGELOG.md?raw';
import { parseChangelog } from './changelog';
import { TOUR_STOPS, tourStops } from './tour';

describe('the tour (#159)', () => {
  const versions = parseChangelog(english).map((release) => release.version);

  it('shows a new account every stop', () => {
    expect(tourStops()).toEqual(TOUR_STOPS);
    expect(tourStops(null)).toEqual(TOUR_STOPS);
  });

  it('shows someone who has updated only the stops their releases brought', () => {
    expect(tourStops(['1.19.0']).map((stop) => stop.target)).toEqual(['time']);
    expect(tourStops(['1.18.0'])).toEqual([]);
    expect(tourStops(['1.18.0', '1.19.0']).map((stop) => stop.target)).toEqual(['time']);
  });

  it('gives every stop a release the changelog knows, so it can be asked for', () => {
    for (const stop of TOUR_STOPS) {
      expect(versions, `${stop.target} since ${stop.since}`).toContain(stop.since);
    }
  });

  it('points at each element once', () => {
    const targets = TOUR_STOPS.map((stop) => stop.target);
    expect(new Set(targets).size).toBe(targets.length);
  });

  it('lights the Dashboard and the Logbook together, and only the duration line', () => {
    expect(TOUR_STOPS.find((stop) => stop.target === 'dashboard')?.also).toEqual(['logbook']);
    expect(TOUR_STOPS.map((stop) => stop.target)).toContain('metrics');
  });
});

