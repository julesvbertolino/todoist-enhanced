import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import { useT } from '@/hooks/useT';
import { intlDate } from '@/lib/intl';

export function CalendarDayPopover({ anchor, day, onClose, children }: { anchor: HTMLElement; day: Date; onClose: () => void; children: ReactNode }) {
  const { locale, t } = useT();
  const ref = useRef<HTMLDivElement>(null);
  const title = intlDate(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(day);
  useLayoutEffect(() => {
    const panel = ref.current;
    if (!panel) return;
    const position = () => {
      const box = anchor.getBoundingClientRect();
      panel.style.left = `${Math.max(12, Math.min(box.left, window.innerWidth - panel.offsetWidth - 12))}px`;
      panel.style.top = `${Math.max(12, Math.min(box.bottom + 8, window.innerHeight - panel.offsetHeight - 12))}px`;
    };
    position();
    panel.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
    const observer = new ResizeObserver(position); observer.observe(panel);
    window.addEventListener('resize', position);
    return () => { observer.disconnect(); window.removeEventListener('resize', position); };
  }, [anchor]);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (ref.current?.contains(event.target as Node) || anchor.contains(event.target as Node)) return;
      // Dismiss before React's calendar handlers can start a new selection.
      event.preventDefault(); event.stopPropagation(); onClose();
    };
    const keyboard = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.stopPropagation(); onClose(); anchor.focus({ preventScroll: true }); } };
    document.addEventListener('pointerdown', outside, true); document.addEventListener('keydown', keyboard);
    return () => { document.removeEventListener('pointerdown', outside, true); document.removeEventListener('keydown', keyboard); };
  }, [anchor, onClose]);
  return createPortal(<div className="popover calendar-day-popover" role="dialog" aria-label={title} ref={ref}>
    <header><strong>{title}</strong><button className="iconbtn" aria-label={t('detail.close')} onClick={() => { onClose(); anchor.focus(); }}><Icon name="close" size="sm" /></button></header>
    <div className="calendar-day-popover-list">{children}</div>
  </div>, document.body);
}
