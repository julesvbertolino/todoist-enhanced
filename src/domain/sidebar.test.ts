import { describe, expect, it } from 'vitest';
import {
  defaultSidebarNav, moveSidebarEntry, readSidebarNav, toggleSidebarEntry, visibleSidebarNav,
} from './sidebar';

const ids = (entries: { id: string }[]) => entries.map((e) => e.id);

describe('readSidebarNav', () => {
  it('gives the default nav for nothing stored, as a v1 account has', () => {
    expect(readSidebarNav(undefined)).toEqual(defaultSidebarNav());
    expect(readSidebarNav('junk')).toEqual(defaultSidebarNav());
  });

  it('keeps the order and the switches the user set', () => {
    const nav = readSidebarNav({
      main: [{ id: 'week', on: true }, { id: 'inbox', on: false }, { id: 'today', on: true },
        { id: 'upcoming', on: true }, { id: 'someday', on: true }],
      other: [{ id: 'labels', on: true }, { id: 'review', on: true }, { id: 'dashboard', on: true },
        { id: 'logbook', on: true }, { id: 'matrix', on: true }],
    });
    expect(ids(nav.main)).toEqual(['week', 'inbox', 'today', 'upcoming', 'someday']);
    expect(nav.main.find((e) => e.id === 'inbox')?.on).toBe(false);
    expect(ids(nav.other)[0]).toBe('labels');
  });

  it('drops ids it does not know and entries listed twice', () => {
    const nav = readSidebarNav({
      main: [{ id: 'inbox' }, { id: 'nope' }, { id: 'inbox', on: false }],
    });
    expect(ids(nav.main).filter((id) => id === 'inbox')).toHaveLength(1);
    expect(ids([...nav.main, ...nav.other])).not.toContain('nope');
    expect(nav.main[0].on).toBe(true);
  });

  it('puts a missing entry back beside its default neighbour', () => {
    // A list written before Logbook existed.
    const nav = readSidebarNav({
      other: [{ id: 'review', on: true }, { id: 'dashboard', on: true }, { id: 'matrix', on: true }, { id: 'labels', on: true }],
    });
    expect(ids(nav.other)).toEqual(['review', 'dashboard', 'logbook', 'matrix', 'labels']);
  });

  it('lists every entry exactly once, whatever it is given', () => {
    const nav = readSidebarNav({ main: [{ id: 'review' }], other: [{ id: 'inbox' }] });
    const all = ids([...nav.main, ...nav.other]);
    expect(new Set(all).size).toBe(all.length);
    expect(all).toHaveLength(10);
    // Moved across blocks: it stays where the user put it.
    expect(ids(nav.main)).toContain('review');
    expect(ids(nav.other)).toContain('inbox');
  });
});

describe('visibleSidebarNav', () => {
  const nav = defaultSidebarNav();

  it('hides Today unless the week is split from it, and the matrix unless it is enabled', () => {
    const merged = visibleSidebarNav(nav, { splitToday: false, matrix: false });
    expect(merged.main).not.toContain('today');
    expect(merged.other).not.toContain('matrix');
    const full = visibleSidebarNav(nav, { splitToday: true, matrix: true });
    expect(full.main).toContain('today');
    expect(full.other).toContain('matrix');
  });

  it('leaves out what is switched off', () => {
    const off = toggleSidebarEntry(nav, 'dashboard');
    expect(visibleSidebarNav(off, { splitToday: true, matrix: true }).other).not.toContain('dashboard');
  });
});

describe('moveSidebarEntry', () => {
  it('moves an entry within its block and nowhere else', () => {
    const moved = moveSidebarEntry(defaultSidebarNav(), 'other', 'labels', 0);
    expect(ids(moved.other)[0]).toBe('labels');
    expect(ids(moved.main)).toEqual(ids(defaultSidebarNav().main));
  });

  it('does nothing for an entry that is not in the block', () => {
    const nav = defaultSidebarNav();
    expect(moveSidebarEntry(nav, 'main', 'labels', 0)).toBe(nav);
  });
});
