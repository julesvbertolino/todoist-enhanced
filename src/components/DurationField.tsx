import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import type { TranslationKey } from '@/i18n';
import { EstimateField } from './EstimateField';
import { useDismissiblePopover } from '@/hooks/useDismissiblePopover';
import { useT } from '@/hooks/useT';
import { QUICK_ESTIMATES, formatDuration } from '@/domain/estimates';

interface DurationFieldProps {
  /** The task's own duration in minutes, or null when it has none. */
  minutes: number | null;
  /** What the face says when there is no value of its own: the sum of the subtasks, or an invitation. */
  placeholder: string;
  pendingWrites?: number;
  /** In a table cell: no words or chevron while empty, only the clock. */
  compact?: boolean;
  onCommit: (minutes: number | null) => void | Promise<'accepted' | 'pending' | 'failed' | void>;
}

/**
 * A task's duration in the panel, drawn like the properties beside it (#392): an icon, the value
 * and a chevron, and a chooser with the usual durations and a field for the others. Typing in the
 * chooser takes what the field has always taken: 45, 1h30, 90 min.
 */
export function DurationField({ minutes, placeholder, pendingWrites, compact = false, onCommit }: DurationFieldProps) {
  const { t, locale } = useT();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  /* The chooser is gone once a value is picked, so the outcome of the write is told beside the face. */
  const [status, setStatus] = useState<'accepted' | 'pending' | 'failed' | null>(null);
  const expected = useRef<number | null>(null);

  const save = async (value: number | null) => {
    expected.current = value;
    setStatus('pending');
    let result: Awaited<ReturnType<typeof onCommit>>;
    try { result = await onCommit(value); } catch { result = 'failed'; }
    setStatus(result === 'failed' ? 'failed' : result === 'pending' ? 'pending' : 'accepted');
  };

  /* A write that was still queued is settled when the queue empties: the value is there, or it is not. */
  useEffect(() => {
    if (status === 'pending' && pendingWrites === 0) setStatus(minutes === expected.current ? 'accepted' : 'failed');
  }, [status, pendingWrites, minutes]);

  useEffect(() => {
    if (status !== 'accepted' && status !== 'failed') return;
    const timer = setTimeout(() => setStatus(null), status === 'accepted' ? 1400 : 3000);
    return () => clearTimeout(timer);
  }, [status]);

  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  useLayoutEffect(() => {
    if (!open) { setPosition(null); return; }
    const place = () => {
      const button = buttonRef.current?.getBoundingClientRect();
      const panel = panelRef.current;
      if (!button || !panel) return;
      const margin = 8;
      const below = button.bottom + 4;
      const top = below + panel.offsetHeight > window.innerHeight - margin ? Math.max(margin, button.top - panel.offsetHeight - 4) : below;
      const left = Math.min(Math.max(margin, button.left), Math.max(margin, window.innerWidth - panel.offsetWidth - margin));
      setPosition((was) => (was?.top === top && was.left === left ? was : { top, left }));
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [open]);

  /* The panel is hidden until it is placed, and a hidden field cannot take the focus: ask once it shows. */
  const placed = position !== null;
  useEffect(() => {
    if (open && placed) panelRef.current?.querySelector('input')?.focus();
  }, [open, placed]);

  useDismissiblePopover(open, buttonRef, panelRef, () => setOpen(false));

  const choose = (value: number | null) => {
    void save(value);
    close();
  };

  return (
    <span className="datefield durationfield">
      <button
        type="button"
        ref={buttonRef}
        className={`fselect-face${open ? ' open' : ''}${minutes === null ? ' empty' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t('detail.estimate')}
        onClick={() => setOpen((now) => !now)}
      >
        <Icon name="clock" size="sm" />
        {!(compact && minutes === null) && <span className="fselect-value">{minutes === null ? placeholder : formatDuration(minutes, locale)}</span>}
        {!compact && <Icon name="caret" size="sm" />}
      </button>
      {status && <span className={`est-feedback ${status}`} aria-hidden="true">
        {status === 'pending' ? <span className="est-pulse" /> : <Icon name={status === 'accepted' ? 'check' : 'close'} size="sm" />}
      </span>}
      <span className="sr" role="status" aria-live="polite">{status && t(`estimate.${status}` as TranslationKey)}</span>
      {open && createPortal(
        <div
          ref={panelRef}
          className="popover rowmenu estimatesheet durationpanel"
          role="dialog"
          aria-label={t('detail.estimate')}
          style={{ top: position?.top ?? -9999, left: position?.left ?? -9999, visibility: position ? undefined : 'hidden' }}
        >
          <div className="estquick">
            {QUICK_ESTIMATES.map((quick) => (
              <button key={quick} type="button" className={`estchip${minutes === quick ? ' on' : ''}`} onClick={() => choose(quick)}>
                {formatDuration(quick, locale)}
              </button>
            ))}
            {minutes !== null && (
              <button type="button" className="estchip clear" onClick={() => choose(null)}>
                <Icon name="close" size="sm" />
                {t('bulk.clear')}
              </button>
            )}
          </div>
          <EstimateField
            autoFocus
            cancelOnBlurTarget=".estchip"
            minutes={minutes}
            placeholder={t('task.estimatePlaceholder')}
            onCancel={close}
            onCommit={(value) => { void save(value); setOpen(false); }}
          />
        </div>,
        document.body,
      )}
    </span>
  );
}
