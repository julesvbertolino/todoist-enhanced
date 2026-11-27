/** Filled, softly rounded pause and play marks for the Pomodoro controls. */
export function PomodoroActionIcon({ play, size = 14 }: { play: boolean; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" focusable="false">
    {play ? <path d="M4.1 3.3a1.3 1.3 0 0 1 2-1.1l6.6 4.6a1.45 1.45 0 0 1 0 2.4l-6.6 4.6a1.3 1.3 0 0 1-2-1.1z" /> : <><rect x="3.3" y="2.5" width="3.4" height="11" rx="1.5" /><rect x="9.3" y="2.5" width="3.4" height="11" rx="1.5" /></>}
  </svg>;
}
