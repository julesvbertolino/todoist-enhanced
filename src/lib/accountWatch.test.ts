import { describe, expect, it } from 'vitest';
import { mayWriteAs, mustReload, outOfStep } from './accountWatch';

describe('one account for every window of the app', () => {
  it('lets a window send when the device agrees, or has no opinion yet', () => {
    expect(mayWriteAs('42', '42')).toBe(true);
    expect(mayWriteAs(42, '42')).toBe(true);
    expect(mayWriteAs('42', null)).toBe(true);
    expect(mayWriteAs(null, '42')).toBe(true);
  });
  it('stops a window that still believes in another account', () => {
    expect(mayWriteAs('41', '42')).toBe(false);
  });
  it('makes a window start over when another window changes the account', () => {
    expect(mustReload('41', '42')).toBe(true);
    expect(mustReload('41', null)).toBe(true);
    expect(mustReload('42', '42')).toBe(false);
    expect(mustReload(null, '42')).toBe(false);
  });
});

describe('the Quick Add window checks it is on the device account each time it opens', () => {
  const on = (id: string | null, extra: Partial<{ connected: boolean; demo: boolean; ready: boolean }> = {}) => ({
    ready: true, connected: true, demo: false, snapshot: { user: id ? { id } : null }, ...extra,
  });
  it('stays when it matches', () => {
    expect(outOfStep(on('42'), { signedIn: true, account: '42' })).toBe(false);
    expect(outOfStep(on('42'), { signedIn: true, account: null })).toBe(false);
    expect(outOfStep(on(null, { connected: false }), { signedIn: false, account: null })).toBe(false);
  });
  it('loads again when the device moved to another account', () => {
    expect(outOfStep(on('41'), { signedIn: true, account: '42' })).toBe(true);
  });
  it('leaves the demo or the sign-in page once the device has an account', () => {
    expect(outOfStep(on(null, { demo: true }), { signedIn: true, account: '42' })).toBe(true);
    expect(outOfStep(on(null, { connected: false }), { signedIn: true, account: '42' })).toBe(true);
  });
  it('loads again when the device signed out', () => {
    expect(outOfStep(on('42'), { signedIn: false, account: null })).toBe(true);
  });
  it('waits for the window to be ready', () => {
    expect(outOfStep(on('41', { ready: false }), { signedIn: true, account: '42' })).toBe(false);
  });
});
