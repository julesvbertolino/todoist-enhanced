import { useEffect, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '@/store/store';

type Box = { left: number; top: number; width: number; height: number };

/** Empty space anywhere on the page selects cards; a gesture beginning on a card still drags it. */
export function useBoardSelection(ref: RefObject<HTMLDivElement | null>) {
  const [box, setBox] = useState<Box | null>(null);
  useEffect(() => {
    const board = ref.current;
    if (!board) return;
    let gesture: { x: number; y: number; clientX: number; clientY: number; base: string[]; initial: string[]; picked: string[]; active: boolean; previousSelect: string } | null = null;
    const scroller = board.closest<HTMLElement>('.screen');
    let frame = 0;
    const update = () => {
      if (!gesture) return;
      const rect = board.getBoundingClientRect();
      const left = Math.min(gesture.x - board.scrollLeft + rect.left, gesture.clientX);
      const top = Math.min(gesture.y + rect.top, gesture.clientY);
      const right = Math.max(gesture.x - board.scrollLeft + rect.left, gesture.clientX);
      const bottom = Math.max(gesture.y + rect.top, gesture.clientY);
      const width = right - left, height = bottom - top;
      setBox((was) => was && was.left === left && was.top === top && was.width === width && was.height === height ? was : { left, top, width, height });
      const ids = [...board.querySelectorAll<HTMLElement>('[data-task-id]')].filter((node) => {
        const r = node.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && r.right > left && r.left < right && r.bottom > top && r.top < bottom
          && r.right > rect.left && r.left < rect.right && r.bottom > rect.top && r.top < rect.bottom;
      }).map((node) => node.dataset.taskId!);
      const picked = [...new Set([...gesture.base, ...ids])].filter((id) => !useStore.getState().snapshot.items[id]?.projection);
      if (picked.length !== gesture.picked.length || picked.some((id, i) => gesture!.picked[i] !== id)) {
        gesture.picked = picked; useStore.getState().selectRange(picked, false);
      }
    };
    const tick = () => {
      if (!gesture?.active) return;
      const r = board.getBoundingClientRect();
      const dx = gesture.clientX < r.left + 24 ? -12 : gesture.clientX > r.right - 24 ? 12 : 0;
      const viewport = scroller?.getBoundingClientRect();
      const dy = gesture.clientY < (viewport?.top ?? 0) + 35 ? -12 : gesture.clientY > (viewport?.bottom ?? window.innerHeight) - 35 ? 12 : 0;
      if (dx) board.scrollLeft += dx;
      if (dy) { if (scroller) scroller.scrollTop += dy; else window.scrollBy(0, dy); }
      update(); frame = requestAnimationFrame(tick);
    };
    const finish = (cancel = false) => {
      if (!gesture) return;
      if (cancel) useStore.getState().selectRange(gesture.initial, false);
      document.body.style.userSelect = gesture.previousSelect;
      gesture = null; setBox(null); cancelAnimationFrame(frame);
    };
    const down = (event: PointerEvent) => {
      const target = event.target as Element;
      const screen = target.closest('.screen.active');
      if (event.button !== 0 || event.pointerType !== 'mouse' || !screen || (scroller && screen !== scroller)
        || target.closest('[data-task-id], button, input, textarea, select, a, [contenteditable], [role="button"], .drag, .popover')) return;
      const r = board.getBoundingClientRect();
      gesture = { x: event.clientX - r.left + board.scrollLeft, y: event.clientY - r.top,
        clientX: event.clientX, clientY: event.clientY,
        base: event.metaKey || event.ctrlKey || event.shiftKey ? [...useStore.getState().selection] : [],
        initial: [...useStore.getState().selection], picked: [...useStore.getState().selection], active: false, previousSelect: document.body.style.userSelect };
      event.preventDefault();
    };
    const move = (event: PointerEvent) => {
      if (!gesture) return;
      gesture.clientX = event.clientX; gesture.clientY = event.clientY;
      if (!gesture.active) {
        const r = board.getBoundingClientRect();
        if (Math.hypot(event.clientX - (gesture.x - board.scrollLeft + r.left), event.clientY - (gesture.y + r.top)) < 4) return;
        gesture.active = true; document.body.style.userSelect = 'none'; window.getSelection()?.removeAllRanges();
        frame = requestAnimationFrame(tick);
      }
      event.preventDefault(); update();
    };
    const up = (event: PointerEvent) => {
      if (gesture?.active) {
        // The click following this mouse-up would clear the range as a background click.
        const swallow = (click: MouseEvent) => {
          if (Math.abs(click.clientX - event.clientX) > 2 || Math.abs(click.clientY - event.clientY) > 2) return;
          click.preventDefault(); click.stopImmediatePropagation(); cleanup();
        };
        const cleanup = () => { window.removeEventListener('click', swallow, true); clearTimeout(timer); };
        const timer = window.setTimeout(cleanup, 150);
        window.addEventListener('click', swallow, true);
      }
      finish();
    };
    const cancel = () => finish(true);
    const escape = (event: KeyboardEvent) => { if (gesture && event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); cancel(); } };
    document.addEventListener('pointerdown', down);
    document.addEventListener('pointermove', move, { passive: false });
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', cancel);
    document.addEventListener('keydown', escape, true);
    window.addEventListener('blur', cancel);
    return () => {
      finish(); document.removeEventListener('pointerdown', down);
      document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', cancel); document.removeEventListener('keydown', escape, true);
      window.removeEventListener('blur', cancel);
    };
  }, [ref]);
  return box && createPortal(<div className="board-selection-box" style={box} aria-hidden="true" />, document.body);
}
