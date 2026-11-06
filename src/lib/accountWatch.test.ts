import { describe, expect, it } from 'vitest';
import { mayWriteAs, mustReload } from './accountWatch';

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
