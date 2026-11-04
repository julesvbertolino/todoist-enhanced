import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { addDays, differenceInCalendarDays, parseISO, startOfDay } from 'date-fns';
import { DatePicker } from './DatePicker';
import { toApiDate } from '@/domain/dates';
import { useDismissiblePopover } from '@/hooks/useDismissiblePopover';
import { useT } from '@/hooks/useT';
import { intlDate } from '@/lib/intl';

/** "Today", "Tomorrow", then the date: what the Today page calls the day it shows (#345). */
export function dayTitle(offset: number, locale: 'en' | 'fr', t: (key: 'nav.today' | 'date.tomorrow' | 'date.yesterday') => string): string {
  if (offset === 0) return t('nav.today');
  if (offset === 1) return t('date.tomorrow');
  if (offset === -1) return t('date.yesterday');
  return intlDate(locale === 'fr' ? 'fr-FR' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(addDays(startOfDay(new Date()), offset));
}

/**
 * A small filled chevron right after the title of the day, opening the date
 * picker: one control that reaches any day, instead of arrows that would sit
 * wherever the title ends (#345). It is drawn light so the title stays the
 * thing you read.
 */
export function DayPicker({ offset, onChange }: { offset: number; onChange: (offset: number) => void }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const value = toApiDate(addDays(startOfDay(new Date()), offset));

  useLayoutEffect(() => {
    if (!open) { setPosition(null); return; }
    const place = () => {
      const button = buttonRef.current?.getBoundingClientRect(), panel = panelRef.current;
      if (!button || !panel) return;
      const margin = 8, below = button.bottom + 4;
      const top = below + panel.offsetHeight > window.innerHeight - margin ? Math.max(margin, button.top - panel.offsetHeight - 4) : below;
      const left = Math.min(Math.max(margin, button.left), Math.max(margin, window.innerWidth - panel.offsetWidth - margin));
      setPosition((was) => (was?.top === top && was.left === left ? was : { top, left }));
    };
    place();
    const observer = new ResizeObserver(place);
    if (panelRef.current) observer.observe(panelRef.current);
    window.addEventListener('resize', place);
    return () => { observer.disconnect(); window.removeEventListener('resize', place); };
  }, [open]);

  useDismissiblePopover(open, buttonRef, panelRef, () => setOpen(false));
  const close = () => { setOpen(false); buttonRef.current?.focus(); };

  return (
    <span className="daynav">
      <button
        type="button"
        ref={buttonRef}
        className="daynav-chevron"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t('day.pick')}
        title={t('day.pick')}
        onClick={() => setOpen((v) => !v)}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 3h8L5 8z" fill="currentColor" /></svg>
      </button>
      {open && createPortal(
        <div
          className="popover datepanel"
          role="dialog"
          aria-label={t('day.pick')}
          ref={panelRef}
          style={{ top: position?.top ?? -9999, left: position?.left ?? -9999, visibility: position ? undefined : 'hidden' }}
        >
          <DatePicker
            value={value}
            label={t('day.pick')}
            timeButton={false}
            onPick={(iso) => { onChange(differenceInCalendarDays(parseISO(iso.slice(0, 10)), startOfDay(new Date()))); close(); }}
            onEscape={close}
          />
        </div>,
        document.body,
      )}
    </span>
  );
}
