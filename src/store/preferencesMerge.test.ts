import { describe, expect, it } from 'vitest';
import { mergePreferenceChanges } from '@/lib/mergeChanges';

describe('concurrent preference edits', () => {
  it('preserves independent fields and nested view edits', () => {
    const base = { clock: false, theme: 'light', views: { inbox: { sort: 'date', group: 'none' } } };
    const local = { ...base, clock: true, views: { inbox: { sort: 'priority', group: 'none' } } };
    const remote = { ...base, theme: 'dark', views: { inbox: { sort: 'date', group: 'project' } } };
    expect(mergePreferenceChanges(base, local, remote)).toEqual({ clock: true, theme: 'dark', views: { inbox: { sort: 'priority', group: 'project' } } });
  });
  it('retains explicit deletions and resolves conflicting edits locally', () => {
    expect(mergePreferenceChanges({ views: { a: 1, b: 1 } }, { views: { b: 2 } }, { views: { a: 3, b: 4, c: 5 } })).toEqual({ views: { b: 2, c: 5 } });
  });
});
