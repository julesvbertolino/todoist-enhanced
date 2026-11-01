/**
 * The Pomodoro timer as a pure state machine.
 *
 * One timer for the whole app. It is free, or linked to a task, and either way
 * it is the same timer: a state, an end time, and the clock passed in. Nothing
 * here reads the time itself, so every rule can be tested with a date.
 */

export const FOCUS_MS = 25 * 60_000;
export const BREAK_MS = 5 * 60_000;

export type PomodoroKind = 'focus' | 'break';
export type PomodoroStatus = 'idle' | 'running' | 'paused' | 'done';

export interface PomodoroState {
  status: PomodoroStatus;
  kind: PomodoroKind;
  /** The task the session is attached to, or null for a free session. */
  taskId: string | null;
  /** When it ends, while it runs. */
  endsAt: number | null;
  /** What is left, while it is paused. */
  remainingMs: number;
  /** Focus sessions finished since the timer was last ended. */
  sessions: number;
}

export const idleState = (): PomodoroState => ({
  status: 'idle', kind: 'focus', taskId: null, endsAt: null, remainingMs: FOCUS_MS, sessions: 0,
});

const lengthOf = (kind: PomodoroKind): number => (kind === 'focus' ? FOCUS_MS : BREAK_MS);

/** A focus session, free or attached to a task. */
export function startFocus(state: PomodoroState, taskId: string | null, now: number): PomodoroState {
  return { ...state, status: 'running', kind: 'focus', taskId, endsAt: now + FOCUS_MS, remainingMs: FOCUS_MS };
}

export function startBreak(state: PomodoroState, now: number): PomodoroState {
  return { ...state, status: 'running', kind: 'break', endsAt: now + BREAK_MS, remainingMs: BREAK_MS };
}

export function pause(state: PomodoroState, now: number): PomodoroState {
  if (state.status !== 'running' || state.endsAt === null) return state;
  return { ...state, status: 'paused', endsAt: null, remainingMs: Math.max(0, state.endsAt - now) };
}

export function resume(state: PomodoroState, now: number): PomodoroState {
  if (state.status !== 'paused') return state;
  return { ...state, status: 'running', endsAt: now + state.remainingMs };
}

/** Ends the session and forgets it: the timer is ready again. */
export function endSession(): PomodoroState {
  return idleState();
}

/** Attaches the running or paused session to a task, or lets go of it. */
export function linkTask(state: PomodoroState, taskId: string | null): PomodoroState {
  return state.status === 'idle' ? state : { ...state, taskId };
}

/** Moves a running timer to `done` once its time is up. */
export function tick(state: PomodoroState, now: number): PomodoroState {
  if (state.status !== 'running' || state.endsAt === null || now < state.endsAt) return state;
  return {
    ...state,
    status: 'done',
    endsAt: null,
    remainingMs: 0,
    sessions: state.kind === 'focus' ? state.sessions + 1 : state.sessions,
  };
}

/** Milliseconds left, as it reads right now. */
export function remainingAt(state: PomodoroState, now: number): number {
  if (state.status === 'running' && state.endsAt !== null) return Math.max(0, state.endsAt - now);
  if (state.status === 'done') return 0;
  return state.remainingMs;
}

/** How much of the session has passed, from 0 to 1. */
export function progressAt(state: PomodoroState, now: number): number {
  const total = lengthOf(state.kind);
  return Math.min(1, Math.max(0, 1 - remainingAt(state, now) / total));
}

/** 25:00, 04:12: minutes and seconds, rounded up so the last second reads 00:01. */
export function formatClock(ms: number): string {
  const seconds = Math.ceil(Math.max(0, ms) / 1000);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Reads a stored state back, or the idle one when it is not usable. */
export function readPomodoro(value: unknown, now: number): PomodoroState {
  const v = (value && typeof value === 'object' ? value : {}) as Partial<PomodoroState>;
  const status = v.status === 'running' || v.status === 'paused' || v.status === 'done' ? v.status : 'idle';
  if (status === 'idle') return idleState();
  const kind: PomodoroKind = v.kind === 'break' ? 'break' : 'focus';
  const state: PomodoroState = {
    status,
    kind,
    taskId: typeof v.taskId === 'string' ? v.taskId : null,
    endsAt: typeof v.endsAt === 'number' ? v.endsAt : null,
    remainingMs: typeof v.remainingMs === 'number' ? v.remainingMs : lengthOf(kind),
    sessions: typeof v.sessions === 'number' ? v.sessions : 0,
  };
  if (state.status === 'running' && state.endsAt === null) return idleState();
  return tick(state, now);
}
