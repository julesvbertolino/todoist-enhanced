import { useEffect, useState, type RefObject } from 'react';
import { flushSync } from 'react-dom';

/**
 * Whether the task row holding `ref` has been pointed at, touched or focused.
 *
 * What a row only shows under the pointer or the keyboard (its hover buttons,
 * its drag handle) is drawn the first time that happens: on a long page those
 * icons were a third of everything the page had to build (#365). Once true it
 * stays true, so a row never redraws for the pointer leaving it.
 */
export function useRowArmed(ref: RefObject<HTMLElement | null>, initial = false): boolean {
  const [armed, setArmed] = useState(initial);
  useEffect(() => {
    if (armed) return;
    const row = ref.current?.closest<HTMLElement>('[data-task-id], [data-calendar-task]');
    if (!row || row.matches(':hover, :focus-within')) { setArmed(true); return; }
    // In step with the pointer, so the icons are there in the frame that shows them.
    const now = () => flushSync(() => setArmed(true));
    const soon = () => setArmed(true);
    row.addEventListener('pointerenter', now);
    row.addEventListener('pointerdown', now);
    row.addEventListener('focusin', soon);
    return () => {
      row.removeEventListener('pointerenter', now);
      row.removeEventListener('pointerdown', now);
      row.removeEventListener('focusin', soon);
    };
  }, [armed, ref]);
  return armed;
}
