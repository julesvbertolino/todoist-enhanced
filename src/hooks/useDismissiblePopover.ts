import { useEffect, useRef, type RefObject } from 'react';

const opened: symbol[] = [];

/** One dismissal per gesture, including portalled pickers inside a task panel. */
export function useDismissiblePopover(
  open: boolean,
  trigger: RefObject<HTMLElement | null>,
  panel: RefObject<HTMLElement | null>,
  onClose: () => void,
  consumeOutside = false,
) {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const button = trigger.current;
    if (!button) return;
    button.setAttribute('data-popover-trigger', '');
    return () => button.removeAttribute('data-popover-trigger');
  });
  useEffect(() => {
    if (!open) return;
    const token = Symbol();
    opened.push(token);
    const top = () => opened.at(-1) === token;
    const away = (event: PointerEvent) => {
      if (!top()) return;
      const target = event.target as Element;
      if (panel.current?.contains(target) || trigger.current?.contains(target)) return;
      // A date picker's custom dialog and nested selects belong to that picker.
      if (target.closest('[data-picker-layer]')) return;
      const inDetail = consumeOutside || !!trigger.current?.closest('.detail-body');
      const switching = target.closest('[data-popover-trigger]');
      close.current();
      if (!inDetail || switching) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      // The later click must not edit a comment or remove the tag underneath.
      const swallow = (click: MouseEvent) => {
        click.preventDefault(); click.stopImmediatePropagation(); cleanup();
      };
      const cleanup = () => { document.removeEventListener('click', swallow, true); clearTimeout(timer); };
      const timer = window.setTimeout(cleanup, 800);
      document.addEventListener('click', swallow, true);
    };
    const escape = (event: KeyboardEvent) => {
      if (!top() || event.key !== 'Escape') return;
      const layer = document.querySelector('[data-picker-layer]');
      if (layer && !trigger.current?.closest('[data-picker-layer]')) return;
      // The calendar handles Escape one level at a time (month, time, repeat).
      if (panel.current?.querySelector('.datepicker') && panel.current.contains(event.target as Node)) return;
      event.preventDefault(); event.stopImmediatePropagation();
      close.current(); trigger.current?.focus();
    };
    document.addEventListener('pointerdown', away, true);
    document.addEventListener('keydown', escape, true);
    return () => {
      opened.splice(opened.indexOf(token), 1);
      document.removeEventListener('pointerdown', away, true);
      document.removeEventListener('keydown', escape, true);
    };
  }, [open, trigger, panel, consumeOutside]);
}
