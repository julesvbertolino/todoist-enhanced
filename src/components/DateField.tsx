import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { endOfMonth } from 'date-fns';
import { Icon, type IconName } from './Icon';
import { useT } from '@/hooks/useT';
import { useStore } from '@/store/store';
import { DatePicker, dayAndTime, parse, type DateShortcut } from './DatePicker';

interface DateFieldProps {
  /** An API date string, or empty for no date. */
  value: string;
  onChange: (next: string) => void;
  /** The accessible name, and what the field says when it is empty. */
  label: string;
  placeholder?: string;
  /**
   * The earliest and latest dates this field will take, as API date strings.
   *
   * Days outside them are drawn and greyed rather than hidden: a calendar that
   * silently omits the days you cannot choose gives no account of why, and the
   * whole point of showing a month is that you can see where the edge is.
   */
  min?: string;
  max?: string;
  /**
   * Whether the field can be emptied. A field standing for one end of a range
   * cannot: a range with no start is not a range.
   */
  clearable?: boolean;
  /** The quick choices, when the field's context has its own (see DatePicker). */
  shortcuts?: DateShortcut[];
  /** A field, or a chip in the composer's planning line (#113). */
  variant?: 'field' | 'chip';
  /** The glyph beside the value: a calendar, or the deadline's flag. */
  icon?: IconName;
  /**
   * Whether the field takes a time of day as well as a day (#143). A task's
   * date does; a deadline and the ends of a period do not.
   */
  withTime?: boolean;
}

/**
 * A date as a field: its value on a button, the one date picker under it.
 *
 * `<input type="date">` is a different product every place it renders: a grey
 * three-part field on one platform, a full-bleed wheel on another, and on the
 * Mac a calendar drawn in the system's own type in the middle of a dialog this
 * app drew. This is the app's own picker (DatePicker), the same one the row
 * menu and the bulk bar show (#110), opened from a field.
 */
export function DateField({
  value, onChange, label, placeholder, min, max, clearable = true, shortcuts,
  variant = 'field', icon = 'calendar', withTime = false,
}: DateFieldProps) {
  const chip = variant === 'chip';
  const { t, locale } = useT();
  const dateFormat = useStore((s) => s.prefs.dateFormat);
  const hour12 = useStore((s) => s.prefs.hour12);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  /** A field's picker is as wide as the field; a chip's keeps its own width. */
  const [fitWidth, setFitWidth] = useState<number | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const selected = parse(value);

  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  /* Placed against the button, and placed again whenever the picker changes
     size — its typed suggestions grow it while it is open. */
  useLayoutEffect(() => {
    if (!open) { setPosition(null); return; }
    const panel = panelRef.current;
    const place = () => {
      const button = buttonRef.current?.getBoundingClientRect();
      if (!button || !panel) return;
      if (!chip) setFitWidth(Math.max(224, Math.round(button.width)));
      const height = panel.offsetHeight;
      const width = panel.offsetWidth;
      const margin = 8;
      const below = button.bottom + 4;
      const top = below + height > window.innerHeight - margin
        ? Math.max(margin, button.top - height - 4)
        : below;
      const left = Math.min(
        Math.max(margin, button.left),
        Math.max(margin, window.innerWidth - width - margin),
      );
      setPosition((was) => (was?.top === top && was.left === left ? was : { top, left }));
    };
    place();
    const observer = new ResizeObserver(place);
    if (panel) observer.observe(panel);
    window.addEventListener('resize', place);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', place);
    };
  }, [open, chip]);

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: MouseEvent) => {
      if (panelRef.current?.contains(event.target as Node)) return;
      if (buttonRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    /* The picker answers Escape itself when the focus is inside it; this is
       for when it is not — opened with a click, the focus left elsewhere. */
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      event.stopPropagation();
      setOpen(false);
    };
    document.addEventListener('mousedown', dismiss);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', dismiss);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const panel = open && (
    <div
      className="popover datepanel"
      role="dialog"
      aria-label={label}
      ref={panelRef}
      style={{
        top: position?.top ?? -9999,
        left: position?.left ?? -9999,
        width: fitWidth ?? undefined,
        visibility: position ? undefined : 'hidden',
      }}
    >
      <DatePicker
        value={value}
        label={label}
        min={min}
        max={max}
        shortcuts={shortcuts}
        withTime={withTime}
        onPick={(iso) => { onChange(iso); close(); }}
        /* Leaving from inside the panel hands the focus back to the field it
           opened from, rather than to the page once the panel is gone. */
        onEscape={close}
        footer={value && clearable ? (
          <button
            type="button"
            className="opt"
            onClick={() => { onChange(''); close(); }}
          >
            <span><Icon name="close" size="sm" /> {t('date.clear')}</span>
          </button>
        ) : undefined}
      />
    </div>
  );

  return (
    <span className={`datefield${chip ? ' inchips' : ''}`}>
      <button
        type="button"
        ref={buttonRef}
        className={`fselect-face${chip ? ' chipface' : ''}${chip && !value ? ' unset' : ''}${open ? ' open' : ''}${value ? '' : ' empty'}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name={icon} size="sm" />
        <span className="fselect-value">
          {/* A date one day away has a name, and the name is what the reader
              wants: "17 sept. 2026" is a date you have to work out is
              tomorrow. Everything further off is written out in the order the
              settings ask for. */}
          {selected
            ? dayAndTime(withTime ? value : value.slice(0, 10), locale, dateFormat, hour12)
            : (placeholder ?? label)}
        </span>
        {!chip && <Icon name="caret" size="sm" />}
      </button>
      {panel && createPortal(panel, document.body)}
    </span>
  );
}

/** Ends the month at its last day, for callers that need the bound. */
export const lastDayOf = (month: Date): Date => endOfMonth(month);
