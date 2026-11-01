import { describe, expect, it } from 'vitest';
import {
  BREAK_MS, FOCUS_MS, endSession, formatClock, idleState, linkTask, pause, progressAt, readPomodoro,
  remainingAt, resume, startBreak, startFocus, tick,
} from './pomodoro';

const T0 = 1_000_000;

describe('the Pomodoro timer', () => {
  it('starts free or attached to a task, for twenty-five minutes', () => {
    const free = startFocus(idleState(), null, T0);
    expect(free).toMatchObject({ status: 'running', kind: 'focus', taskId: null, endsAt: T0 + FOCUS_MS });
    expect(startFocus(idleState(), 'task-1', T0).taskId).toBe('task-1');
  });

  it('keeps what is left when paused and picks up from there', () => {
    const paused = pause(startFocus(idleState(), null, T0), T0 + 10 * 60_000);
    expect(paused).toMatchObject({ status: 'paused', endsAt: null, remainingMs: 15 * 60_000 });
    expect(remainingAt(paused, T0 + 99 * 60_000)).toBe(15 * 60_000);
    const again = resume(paused, T0 + 20 * 60_000);
    expect(again.endsAt).toBe(T0 + 35 * 60_000);
  });

  it('finishes once, counts the focus session, then offers a break', () => {
    const running = startFocus(idleState(), 'a', T0);
    expect(tick(running, T0 + FOCUS_MS - 1)).toBe(running);
    const done = tick(running, T0 + FOCUS_MS);
    expect(done).toMatchObject({ status: 'done', kind: 'focus', sessions: 1 });
    const rest = startBreak(done, T0 + FOCUS_MS);
    expect(rest).toMatchObject({ status: 'running', kind: 'break', endsAt: T0 + FOCUS_MS + BREAK_MS });
    expect(tick(rest, T0 + FOCUS_MS + BREAK_MS).sessions).toBe(1);
  });

  it('attaches a running session to a task and lets go of it', () => {
    const running = startFocus(idleState(), null, T0);
    expect(linkTask(running, 'x').taskId).toBe('x');
    expect(linkTask(linkTask(running, 'x'), null).taskId).toBeNull();
    expect(linkTask(idleState(), 'x').taskId).toBeNull();
  });

  it('ends the session and starts over', () => {
    expect(endSession()).toEqual(idleState());
  });

  it('reads the clock', () => {
    expect(formatClock(FOCUS_MS)).toBe('25:00');
    expect(formatClock(4 * 60_000 + 12_000)).toBe('04:12');
    expect(formatClock(400)).toBe('00:01');
    expect(formatClock(0)).toBe('00:00');
  });

  it('measures progress from 0 to 1', () => {
    const running = startFocus(idleState(), null, T0);
    expect(progressAt(running, T0)).toBe(0);
    expect(progressAt(running, T0 + FOCUS_MS / 2)).toBe(0.5);
    expect(progressAt(tick(running, T0 + FOCUS_MS), T0 + FOCUS_MS)).toBe(1);
  });

  it('comes back from storage: finished while closed, or junk', () => {
    const running = startFocus(idleState(), 'a', T0);
    expect(readPomodoro(running, T0 + 60_000).status).toBe('running');
    expect(readPomodoro(running, T0 + FOCUS_MS + 5).status).toBe('done');
    expect(readPomodoro('junk', T0)).toEqual(idleState());
    expect(readPomodoro({ status: 'running' }, T0)).toEqual(idleState());
  });
});
