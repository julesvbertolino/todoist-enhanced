import { useEffect, useState } from 'react';
import { usePomodoro } from '@/store/pomodoro';

/** The time now, ticking twice a second while the timer runs, and still when it does not. */
export function usePomodoroNow(): number {
  const running = usePomodoro((s) => s.timer.status === 'running');
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setNow(Date.now());
    if (!running) return;
    const id = window.setInterval(() => {
      setNow(Date.now());
      usePomodoro.getState().poll();
    }, 500);
    return () => window.clearInterval(id);
  }, [running]);
  return now;
}
