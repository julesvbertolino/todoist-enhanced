import { create } from 'zustand';
import {
  endSession, idleState, linkTask, pause, readPomodoro, resume, startBreak, startFocus, tick,
  type PomodoroState,
} from '@/domain/pomodoro';

const KEY = 'enhanced.pomodoro';

const load = (): PomodoroState => {
  try {
    const raw = window.localStorage.getItem(KEY);
    return readPomodoro(raw ? JSON.parse(raw) : null, Date.now());
  } catch {
    return idleState();
  }
};

const save = (state: PomodoroState): void => {
  try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private window */ }
};

interface PomodoroStore {
  timer: PomodoroState;
  /** The full screen is showing. The timer keeps running when it is not. */
  fullscreen: boolean;
  /** Which toolbar button has its session popover open: a page's, or a task's by id. */
  popover: string | null;
  start: (taskId: string | null, fullscreen: boolean) => void;
  togglePause: () => void;
  startBreak: () => void;
  end: () => void;
  link: (taskId: string | null) => void;
  setFullscreen: (on: boolean) => void;
  setPopover: (owner: string | null) => void;
  /** Called by the clock: moves a finished session to `done`. */
  poll: () => void;
}

export const usePomodoro = create<PomodoroStore>((set, get) => {
  const commit = (timer: PomodoroState, extra: Partial<PomodoroStore> = {}) => {
    save(timer);
    set({ timer, ...extra });
  };
  return {
    timer: load(),
    fullscreen: false,
    popover: null,
    start: (taskId, fullscreen) => commit(startFocus(get().timer, taskId, Date.now()), { fullscreen, popover: null }),
    togglePause: () => {
      const { timer } = get();
      commit(timer.status === 'paused' ? resume(timer, Date.now()) : pause(timer, Date.now()));
    },
    startBreak: () => commit(startBreak(get().timer, Date.now())),
    end: () => commit(endSession(), { fullscreen: false, popover: null }),
    link: (taskId) => commit(linkTask(get().timer, taskId)),
    setFullscreen: (fullscreen) => set({ fullscreen, popover: null }),
    setPopover: (popover) => set({ popover }),
    poll: () => {
      const { timer } = get();
      const next = tick(timer, Date.now());
      if (next !== timer) commit(next);
    },
  };
});
