import { beforeEach, describe, expect, it, vi } from 'vitest';
import { invalidateHistory, sharedRead } from './sharedRead';

beforeEach(() => invalidateHistory());

describe('shared history reads', () => {
  it('coalesces an identical request and keeps it alive when only one caller leaves', async () => {
    let complete!: (value: number) => void;
    let sharedSignal!: AbortSignal;
    const read = vi.fn((signal: AbortSignal) => { sharedSignal = signal; return new Promise<number>((resolve) => { complete = resolve; }); });
    const first = new AbortController();
    const left = sharedRead('one', 'range', first.signal, read).catch((error: Error) => error.name);
    const right = sharedRead('one', 'range', undefined, read);
    expect(read).toHaveBeenCalledTimes(1);
    first.abort();
    expect(await left).toBe('AbortError');
    expect(sharedSignal.aborted).toBe(false);
    complete(4);
    expect(await right).toBe(4);
    expect(await sharedRead('one', 'range', undefined, read)).toBe(4);
    invalidateHistory();
    const next = sharedRead('one', 'range', undefined, read);
    expect(read).toHaveBeenCalledTimes(2);
    complete(5);
    expect(await next).toBe(5);
  });
  it('does not share between accounts and stops when all callers cancel', async () => {
    const signals: AbortSignal[] = [];
    const read = vi.fn((signal: AbortSignal) => { signals.push(signal); return new Promise<number>(() => {}); });
    const controller = new AbortController();
    const a = sharedRead('a', 'range', controller.signal, read).catch((error: Error) => error.name);
    void sharedRead('b', 'range', undefined, read);
    expect(read).toHaveBeenCalledTimes(2);
    controller.abort();
    expect(await a).toBe('AbortError');
    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);
  });
});
