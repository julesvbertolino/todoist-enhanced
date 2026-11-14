import { describe, expect, it } from 'vitest';
import { CursorGuard } from './pagination';

describe('CursorGuard', () => {
  it('allows progressing pages and rejects cycles', () => {
    const guard = new CursorGuard();
    guard.next('a');
    guard.next('b');
    expect(() => guard.next('a')).toThrow('Repeated pagination cursor');
    expect(() => guard.next(null)).not.toThrow();
  });
});
