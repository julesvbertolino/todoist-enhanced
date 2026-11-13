import { describe, expect, it } from 'vitest';
import { networkTurn } from './networkPolicy';

describe('network scheduling', () => {
  it('keeps requests bounded and lets a waiting edit go before background reads', async () => {
    const started: string[] = [];
    let finish!: () => void;
    const gate = new Promise<void>((resolve) => { finish = resolve; });
    const first = networkTurn(async () => { started.push('first'); await gate; }, 0);
    const background = networkTurn(async () => { started.push('background'); }, 0);
    const write = networkTurn(async () => { started.push('write'); }, 2);
    expect(started).toEqual(['first']);
    finish();
    await Promise.all([first, background, write]);
    expect(started).toEqual(['first', 'write', 'background']);
  });
  it('does not start a request that is cancelled while waiting', async () => {
    let finish!: () => void;
    const gate = new Promise<void>((resolve) => { finish = resolve; });
    const first = networkTurn(() => gate, 0);
    const controller = new AbortController();
    let sent = false;
    const second = networkTurn(async () => { sent = true; }, 0, controller.signal);
    const outcome = second.catch((error: unknown) => error);
    controller.abort();
    finish();
    await first;
    expect(await outcome).toMatchObject({ name: 'AbortError' });
    expect(sent).toBe(false);
  });
});
