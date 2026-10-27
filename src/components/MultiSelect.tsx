import { useDismissiblePopover } from '@/hooks/useDismissiblePopover';
import { createPortal } from 'react-dom';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import { useT } from '@/hooks/useT';

interface MultiSelectProps {
  label: string;
  icon?: IconName;
  variant?: 'field' | 'toolbar';
  allLabel?: string;
  value: string[] | null;
  options: Array<{ value: string; label: string; visual?: ReactNode }>;
  onChange: (value: string[] | null) => void;
  /** Draws the closed control's content in place of the label and summary. */
  face?: ReactNode;
  /** A class on the floating list, for a list that must match its surroundings. */
  popupClassName?: string;
}

/** A compact multi-selection with real keyboard-operable checkboxes. */
export function MultiSelect({ label, value, options, onChange, allLabel, icon, variant = 'field', face, popupClassName }: MultiSelectProps) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  useLayoutEffect(() => {
    if (!open || !button.current) return;
    const rect = button.current.getBoundingClientRect();
    const width = Math.min(Math.max(rect.width, 240), window.innerWidth - 16);
    const height = popup.current?.offsetHeight ?? 240;
    setPosition({ width, left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
      top: rect.bottom + 4 + height <= window.innerHeight - 8 ? rect.bottom + 4 : Math.max(8, rect.top - height - 4) });
  }, [open, options.length]);
  useEffect(() => {
    if (!open) return;
    const dismiss = () => setOpen(false);
    const scroll = (event: Event) => { if (!popup.current?.contains(event.target as Node)) dismiss(); };
    window.addEventListener('resize', dismiss);
    window.addEventListener('scroll', scroll, true);
    return () => {
      window.removeEventListener('resize', dismiss);
      window.removeEventListener('scroll', scroll, true);
    };
  }, [open]);
  useDismissiblePopover(open, button, popup, () => setOpen(false));
  const labels = options.filter((option) => value?.includes(option.value)).map((option) => option.label);
  const allSelected = value === null || (options.length > 0 && options.every((option) => value.includes(option.value)));
  const summary = allSelected ? (allLabel ?? t('assignee.everyone'))
    : labels.length === 0 ? t('assignee.nobody')
    : labels.length <= 2 ? labels.join(' + ') : t('assignee.selected', { count: labels.length });
  return (
    <div className={`multiselect${variant === 'toolbar' ? ' as-toolbar' : ''}`} ref={ref} onKeyDown={(event) => {
      if (open && event.key === 'Escape') {
        event.stopPropagation(); setOpen(false); button.current?.focus();
      }
    }}>
      <button ref={button} type="button" className="fselect-face" aria-label={`${label}: ${summary}`}
        aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen((previous) => !previous)}>
        {face ?? <>{icon && <Icon name={icon} size="sm" />}<span>{label}</span><span className="fselect-value">{summary}</span><Icon name="caret" size="sm" /></>}
      </button>
      {open && createPortal(<div ref={popup} className={`multiselect-options${popupClassName ? ` ${popupClassName}` : ''}`} role="dialog" aria-label={label}
        onMouseDown={(event) => event.stopPropagation()}
        style={{ position: 'fixed', zIndex: 1000, width: position?.width, left: position?.left ?? -9999, top: position?.top ?? -9999, maxWidth: 'calc(100vw - 16px)', maxHeight: 'min(240px, calc(100vh - 16px))' }}>
        <button type="button" className="multiselect-all" aria-pressed={allSelected} onClick={() => onChange(null)}><Icon name="check" size="sm" />{allLabel ?? t('assignee.everyone')}</button>
        {options.map((option) => <label key={option.value}>
          {option.visual && <span className="multiselect-avatar">{option.visual}</span>}
          <span className="multiselect-label">{option.label}</span>
          <input type="checkbox" checked={value === null || value.includes(option.value)} onChange={() => {
            const selected = value ?? options.map((entry) => entry.value);
            const next = selected.includes(option.value) ? selected.filter((id) => id !== option.value) : [...selected, option.value];
            onChange(options.every((entry) => next.includes(entry.value)) ? null : next);
          }} />
          <span className="multiselect-check" aria-hidden="true"><Icon name="check" size="sm" /></span>
        </label>)}
      </div>, document.body)}
    </div>
  );
}
