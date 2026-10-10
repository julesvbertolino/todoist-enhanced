import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon, type IconName } from './Icon';
import { markerStyle } from '@/domain/colors';
import { useT } from '@/hooks/useT';
import { matchesSearch } from '@/domain/search';

export interface SelectOption {
  value: string;
  label: string;
  /** A Todoist colour name, drawn as the project marker beside the label. */
  marker?: string;
  /** Drawn in place of a marker, where the option is not a project. */
  icon?: IconName;
  /** Indented under the option above it, as a section is under its project. */
  sub?: boolean;
  /** What the face says once this is chosen, when the label alone would not place it. */
  face?: string;
}

interface SelectProps {
  /** Printed above the control. Omit it when the row already names the setting. */
  label?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  /** Used as the accessible name when no visible label is printed. */
  ariaLabel?: string;
  /** Shown when nothing matches the current value. */
  placeholder?: string;
  /** Overrides the automatic search field shown for long option lists. */
  searchable?: boolean;
  /**
   * How the closed control is drawn: a field (a labelled box with a caret),
   * or a chip in a row of them, the composer's planning line (#113).
   */
  variant?: 'field' | 'chip';
  /** A chip standing for nothing set yet: a dashed "+ label" rather than a value. */
  unset?: boolean;
  /** What an unset chip says. */
  unsetLabel?: string;
  /** The chip's own glyph, where the option's marker or icon is not the right one. */
  chipIcon?: ReactNode;
  /** The list is exactly as wide as the control, however long its options are. */
  matchWidth?: boolean;
}

/**
 * A select drawn entirely by us.
 *
 * It used to keep a native `<select>` underneath and paint a face on top,
 * which was a reasonable trade until you actually clicked one: macOS opens its
 * own list, in its own type, at its own size, in the middle of a dialog this
 * app drew — and the seam is the only thing you see. So the list is ours too.
 *
 * What the native control was giving us is rebuilt rather than dropped: arrow
 * keys and Home/End move the highlight, typing jumps to a match, Enter
 * chooses, Escape closes, and the list is drawn into the document so no
 * scrolling box can clip it.
 */
export function Select({
  label, value, options, onChange, ariaLabel, placeholder, searchable: searchableProp,
  variant = 'field', unset = false, unsetLabel, chipIcon, matchWidth = false,
}: SelectProps) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [query, setQuery] = useState('');
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [quiet, setQuiet] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const typed = useRef({ text: '', at: 0 });
  const searchable = searchableProp ?? options.length > 8;

  const current = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );
  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    return options.filter((option) =>
      matchesSearch(`${option.label} ${option.face ?? ''}`, query));
  }, [options, query]);

  // Opening starts on what is already chosen, not at the top of the list.
  useEffect(() => {
    if (!open) return;
    setQuery('');
    const at = options.findIndex((option) => option.value === value);
    setActive(at < 0 ? 0 : at);
    if (searchable) requestAnimationFrame(() => searchRef.current?.focus());
  }, [open, options, value, searchable]);

  useEffect(() => {
    if (open && query) setActive(0);
  }, [open, query]);

  useLayoutEffect(() => {
    if (!open) return;
    const button = buttonRef.current?.getBoundingClientRect();
    if (!button) return;
    const height = listRef.current?.offsetHeight ?? 240;
    const margin = 8;
    const below = button.bottom + 4;
    const top = below + height > window.innerHeight - margin
      ? Math.max(margin, button.top - height - 4)
      : below;
    setPosition({ top, left: button.left, width: button.width });
  }, [open, filtered.length, searchable]);

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: MouseEvent) => {
      if (listRef.current?.contains(event.target as Node)) return;
      if (buttonRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    /* Escape closes the list wherever the caret happens to be, and goes no
       further: opened from inside a dialog, the list is in front of it, and
       one Escape should put away one thing. The handler on the button below
       only fires while the button itself has focus, which it does not once
       the list has taken it. */
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener('mousedown', dismiss);
    document.addEventListener('keydown', onKey);
    const close = () => setOpen(false);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', dismiss);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  // The highlighted row is kept in view as the highlight moves.
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  function choose(at: number) {
    const option = filtered[at];
    if (!option) return;
    onChange(option.value);
    setOpen(false);
    /* Focus comes back to the field for the keyboard, without the ring a
       pick would otherwise leave on it (#25); the next key shows it again. */
    setQuiet(true);
    buttonRef.current?.focus();
  }

  /** Typing a letter jumps to the next option starting with it. */
  function typeAhead(key: string) {
    const now = Date.now();
    typed.current.text = now - typed.current.at > 600 ? key : typed.current.text + key;
    typed.current.at = now;
    const query = typed.current.text.toLowerCase();
    const from = typed.current.text.length === 1 ? active + 1 : active;
    for (let step = 0; step < options.length; step += 1) {
      const at = (from + step) % options.length;
      if (options[at].label.toLowerCase().startsWith(query)) {
        setActive(at);
        return;
      }
    }
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (!open) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
        event.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (event.key === 'Escape') { event.stopPropagation(); setOpen(false); return; }
    if (event.key === 'Enter' || event.key === 'Tab') { event.preventDefault(); choose(active); return; }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (filtered.length > 0) setActive((at) => (at + 1) % filtered.length);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (filtered.length > 0) setActive((at) => (at - 1 + filtered.length) % filtered.length);
      return;
    }
    if (event.key === 'Home') { event.preventDefault(); setActive(0); return; }
    if (event.key === 'End') { event.preventDefault(); setActive(filtered.length - 1); return; }
    if (!searchable && event.key.length === 1 && !event.metaKey && !event.ctrlKey) typeAhead(event.key);
  }

  const list = open && (
    <div
      className="popover listbox"
      aria-label={ariaLabel ?? label}
      ref={listRef}
      style={{
        top: position?.top ?? -9999,
        left: position?.left ?? -9999,
        minWidth: position?.width,
        ...(matchWidth ? { width: position?.width, maxWidth: position?.width } : {}),
        visibility: position ? undefined : 'hidden',
      }}
    >
      {searchable && (
        <div className="pickersearch">
          <Icon name="search" size="sm" />
          <input
            ref={searchRef}
            value={query}
            placeholder={t('nav.search')}
            aria-label={t('nav.search')}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
          />
        </div>
      )}
      <div role="listbox" aria-label={ariaLabel ?? label}>
      {filtered.length === 0 && <p className="menuhint">{t('search.noResults')}</p>}
      {filtered.map((option, at) => (
        <button
          key={option.value}
          type="button"
          role="option"
          aria-selected={option.value === value}
          data-active={at === active || undefined}
          className={`opt${at === active ? ' active' : ''}${option.sub ? ' sectionopt' : ''}`}
          onMouseEnter={() => setActive(at)}
          onMouseDown={(event) => { event.preventDefault(); choose(at); }}
        >
          {option.icon && <Icon name={option.icon} size="sm" />}
          {option.marker !== undefined && (
            <span className="hash" style={markerStyle(option.marker)}>#</span>
          )}
          <span className="listbox-label">{option.label}</span>
          {option.value === value && <Icon name="check" size="sm" />}
        </button>
      ))}
      </div>
    </div>
  );

  const chip = variant === 'chip';

  return (
    <span className={`fselect${chip ? ' inchips' : ''}`}>
      {label && !chip && <span className="fselect-label">{label}</span>}
      <button
        type="button"
        ref={buttonRef}
        className={`fselect-face${chip ? ' chipface' : ''}${chip && unset ? ' unset' : ''}${open ? ' open' : ''}${quiet ? ' quiet' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel ?? label}
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setQuiet(false)}
        onKeyDown={(event) => { setQuiet(false); onKeyDown(event); }}
      >
        {chip && chipIcon ? chipIcon : (
          <>
            {current?.icon && <Icon name={current.icon} size="sm" />}
            {current?.marker !== undefined && (
              <span className="hash" style={markerStyle(current.marker)}>#</span>
            )}
          </>
        )}
        {/* Cut with an ellipsis when it is long; the whole of it on hover. */}
        <span className="fselect-value" title={current?.face ?? current?.label}>
          {chip && unset ? (unsetLabel ?? label) : current?.face ?? current?.label ?? placeholder ?? ''}
        </span>
        {!chip && <Icon name="caret" size="sm" />}
      </button>
      {list && createPortal(list, document.body)}
    </span>
  );
}
