import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  addDays, addMonths, addYears, endOfWeek, format, isSameDay, isSameMonth, nextMonday,
  startOfDay, startOfMonth, startOfWeek,
} from 'date-fns';
import { Icon, type IconName } from './Icon';
import { useT } from '@/hooks/useT';
import { useStore } from '@/store/store';
import {
  formatDay, formatDayOrName, formatTime, toApiDate, weekdayName, weekStartsOnOf, type DateFormat,
} from '@/domain/dates';
import { dateSuggestions, type DateSuggestion } from '@/domain/dateWords';
import { readNaturalDate } from '@/domain/nlp';
import { readRecurrence } from '@/domain/recurrence';

/** A quick choice under the typed field: a day, or one of the app's own places. */
export interface DateShortcut {
  key: string;
  label: string;
  icon: IconName;
  /** What it lands on, said quietly at the end of the line ("Tue 29 Sep"). */
  hint?: string;
  disabled?: boolean;
  onSelect: () => void;
}

/** What a typed repeat rule is handed on as. */
export type RecurrenceReading = NonNullable<ReturnType<typeof readRecurrence>>;

interface DatePickerProps {
  /** An API date string, or empty for no date. */
  value: string;
  /** A day was chosen — typed, suggested, a date shortcut or the calendar. */
  onPick: (iso: string) => void;
  /** The accessible name of the whole picker. */
  label: string;
  /**
   * The quick choices. Left out, they are the three every date field has:
   * today, tomorrow, next week. A picker acting on tasks passes its own list,
   * which starts with the same three and adds the app's places (this week,
   * someday) — the same lines, in the same order, wherever they appear.
   */
  shortcuts?: DateShortcut[];
  /** A repeat rule typed in the field ("every monday"), where one can be set. */
  onRecurrence?: (rule: RecurrenceReading) => void;
  /** The earliest and latest days that can be chosen, as API date strings. */
  min?: string;
  max?: string;
  /**
   * Whatever the context adds after the quick choices, before "Pick date":
   * skip an occurrence, remove the date. Buttons of class `opt`, so they are
   * walked by the keyboard like the choices above them.
   */
  footer?: ReactNode;
  /** Escape, from anywhere in the picker. */
  onEscape?: () => void;
  /** Whether the typed field takes the caret when the picker appears. */
  autoFocus?: boolean;
  /**
   * Whether a time typed with the day is kept (#143). "tomorrow at 14:30" then
   * hands on `2026-09-30T14:30:00` rather than the day alone. A task's own
   * date takes a time; a deadline and the bounds of a period are days, and
   * there the field says the time is left out instead of dropping it silently.
   */
  withTime?: boolean;
}

/**
 * The one date picker (#110).
 *
 * The row's schedule menu, the bulk bar's Date panel, the composer's and the
 * task panel's date fields each used to build their own: a typed field here, a
 * closed button that flew out a second panel there, three shortcut buttons in
 * one and a list of places in another. This is all of them, in one order:
 *
 *   1. a field to type a date in — "next sunday", "12/04", a bare "9" —
 *      with the few days it could mean listed under it;
 *   2. the quick choices, one per line, each saying the day it lands on, then
 *      whatever the context adds (skip an occurrence, no date);
 *   3. "Pick date", which swaps the choices for the month, for a day easier
 *      to point at than to name (#153). The month is not drawn until it is
 *      asked for: most of the time a shortcut is all that was wanted.
 *
 * The keyboard walks it top to bottom: ↓ from the field to the choices, and
 * Enter on "Pick date" into the month, where the arrows move the day (Home/End
 * the week, Page Up/Down the month, ⇧ a year) and Enter or Space picks it.
 * Escape in the month goes back to the choices without changing anything; the
 * next one leaves the picker.
 */
export function DatePicker({
  value, onPick, label, shortcuts, onRecurrence, min, max, footer, onEscape,
  autoFocus = true, withTime = false,
}: DatePickerProps) {
  const { t, locale } = useT();
  const dateFormat = useStore((s) => s.prefs.dateFormat);
  const weekStartsOn = weekStartsOnOf(useStore((s) => s.snapshot.user?.start_day));
  const hour12 = useStore((s) => s.prefs.hour12);
  const selected = parse(value);
  const [month, setMonth] = useState(() => startOfMonth(selected ?? new Date()));
  const [cursor, setCursor] = useState(() => startOfDay(selected ?? new Date()));
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(-1);
  /* The choices, or the month in their place. */
  const [view, setView] = useState<'choices' | 'month'>('choices');
  const pickRef = useRef<HTMLButtonElement>(null);
  const fieldRef = useRef<HTMLInputElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  /* Set by a key that moved the cursor, so the day it lands on takes the
     focus once it is drawn — even when that meant drawing another month. */
  const focusCursor = useRef(false);

  const floor = parse(min ?? '');
  const ceiling = parse(max ?? '');
  const outOfRange = (day: Date): boolean =>
    (floor !== null && startOfDay(day) < startOfDay(floor))
    || (ceiling !== null && startOfDay(day) > startOfDay(ceiling));

  useEffect(() => {
    if (autoFocus) requestAnimationFrame(() => fieldRef.current?.focus());
  }, [autoFocus]);

  useLayoutEffect(() => {
    if (focusPick.current && view === 'choices') {
      focusPick.current = false;
      pickRef.current?.focus();
    }
    if (!focusCursor.current) return;
    const day = gridRef.current?.querySelector<HTMLElement>('[tabindex="0"]');
    if (!day) return;
    focusCursor.current = false;
    day.focus({ preventScroll: true });
  });

  const today = startOfDay(new Date());
  const pickDay = (day: Date) => { if (!outOfRange(day)) onPick(toApiDate(day)); };
  const dayHint = (day: Date) => shortDay(day, locale);

  const choices: DateShortcut[] = shortcuts ?? [
    { key: 'today', label: t('date.today'), icon: 'calendar', hint: dayHint(today), disabled: outOfRange(today), onSelect: () => pickDay(today) },
    { key: 'tomorrow', label: t('date.tomorrow'), icon: 'arrow-right', hint: dayHint(addDays(today, 1)), disabled: outOfRange(addDays(today, 1)), onSelect: () => pickDay(addDays(today, 1)) },
    { key: 'nextWeek', label: t('date.nextWeek'), icon: 'upcoming', hint: dayHint(nextMonday(today)), disabled: outOfRange(nextMonday(today)), onSelect: () => pickDay(nextMonday(today)) },
  ];

  const typed = query.trim();
  const suggestions = useMemo(() => dateSuggestions(query, locale), [query, locale]);
  const reading = useMemo(
    () => (typed ? readNaturalDate(query, new Date(), { dateFormat }) : null),
    [query, typed, dateFormat],
  );
  const repeat = useMemo(
    () => (typed && onRecurrence ? readRecurrence(query) : null),
    [query, typed, onRecurrence],
  );

  /**
   * Enter in the field: a rule wins over a date, then what is highlighted, then
   * the reading. Only the reading can carry a time, and it is kept whole when
   * the picker takes one: cutting it down to its day first was how "tomorrow at
   * 14:30" became "tomorrow" (#143).
   */
  function commitTyped() {
    if (repeat && onRecurrence) { onRecurrence(repeat); return; }
    const suggested = active >= 0 ? suggestions[active]?.date : suggestions[0]?.date;
    if (suggested) {
      const day = parse(suggested);
      if (day) pickDay(day);
      return;
    }
    const day = reading ? parse(reading.date) : null;
    if (!reading || !day || outOfRange(day)) return;
    onPick(withTime && reading.hasTime ? reading.date : toApiDate(day));
  }

  /* Six weeks from the week's first day on or before the first: always the same number
     of rows, so the picker never changes height as you page. */
  const days = useMemo(() => {
    const first = startOfWeek(startOfMonth(month), { weekStartsOn });
    return Array.from({ length: 42 }, (_, offset) => addDays(first, offset));
  }, [month, weekStartsOn]);
  const weekdays = useMemo(() => {
    const first = startOfWeek(new Date(), { weekStartsOn });
    const fmt = new Intl.DateTimeFormat(locale, { weekday: 'narrow' });
    return Array.from({ length: 7 }, (_, offset) => fmt.format(addDays(first, offset)));
  }, [locale, weekStartsOn]);

  /* The cursor while it is on the month shown and can be picked; otherwise
     the month's first day that can. It is the grid's one tab stop. */
  const anchor = isSameMonth(cursor, month) && !outOfRange(cursor)
    ? cursor
    : days.find((day) => isSameMonth(day, month) && !outOfRange(day)) ?? cursor;

  function moveCursor(next: Date) {
    const day = startOfDay(next);
    if (outOfRange(day)) return;
    setCursor(day);
    if (!isSameMonth(day, month)) setMonth(startOfMonth(day));
    focusCursor.current = true;
  }
  const enterGrid = () => { focusCursor.current = true; setCursor((at) => new Date(at)); };
  const openMonth = () => { setView('month'); enterGrid(); };
  /* Back to the choices puts the focus on "Pick a date" as soon as it is
     drawn, in the same frame: through a timer there was a moment with the
     focus on nothing, and a second Escape landed on the page behind. */
  const focusPick = useRef(false);
  const closeMonth = () => { focusPick.current = true; setView('choices'); };

  const optionButtons = () =>
    [...(optionsRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])];

  function onGridKey(event: React.KeyboardEvent) {
    const step: Record<string, () => Date> = {
      ArrowLeft: () => addDays(anchor, -1),
      ArrowRight: () => addDays(anchor, 1),
      ArrowUp: () => addDays(anchor, -7),
      ArrowDown: () => addDays(anchor, 7),
      Home: () => startOfWeek(anchor, { weekStartsOn }),
      End: () => endOfWeek(anchor, { weekStartsOn }),
      PageUp: () => (event.shiftKey ? addYears(anchor, -1) : addMonths(anchor, -1)),
      PageDown: () => (event.shiftKey ? addYears(anchor, 1) : addMonths(anchor, 1)),
    };
    if (step[event.key]) {
      event.preventDefault();
      event.stopPropagation();
      moveCursor(step[event.key]());
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      pickDay(anchor);
    }
  }

  function onOptionsKey(event: React.KeyboardEvent) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
      /* Enter and Space are the button's own; the row or the list behind must
         not also read them as "open this task". */
      if (event.key === 'Enter' || event.key === ' ') event.stopPropagation();
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const buttons = optionButtons();
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === 'ArrowDown') {
      if (at < buttons.length - 1) buttons[at + 1].focus();
    } else if (at > 0) buttons[at - 1].focus();
    else fieldRef.current?.focus();
  }

  const press = (act: () => void) => ({
    onMouseDown: (event: React.MouseEvent) => { event.preventDefault(); act(); },
    onClick: (event: React.MouseEvent) => { if (event.detail === 0) act(); },
  });

  return (
    <div
      className="datepicker"
      role="group"
      aria-label={label}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        if (view === 'month') {
          event.preventDefault();
          event.stopPropagation();
          closeMonth();
        } else if (onEscape) {
          event.preventDefault();
          event.stopPropagation();
          onEscape();
        }
      }}
    >
      <div className="pickersearch datepicker-field">
        <Icon name="calendar" size="sm" />
        <input
          ref={fieldRef}
          value={query}
          placeholder={t('task.typeDate')}
          aria-label={t('task.typeDate')}
          onChange={(event) => { setQuery(event.target.value); setActive(-1); }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') return;
            event.stopPropagation();
            if (event.key === 'ArrowDown' && typed && suggestions.length > 0) {
              event.preventDefault();
              setActive((at) => (at + 1) % suggestions.length);
            } else if (event.key === 'ArrowUp' && typed && suggestions.length > 0) {
              event.preventDefault();
              setActive((at) => (at <= 0 ? suggestions.length - 1 : at - 1));
            } else if (event.key === 'ArrowDown') {
              /* Nothing to walk here: Down goes on to the choices below. */
              event.preventDefault();
              const first = optionButtons()[0];
              if (first) first.focus();
              else if (view === 'month') enterGrid();
            } else if (event.key === 'Enter') {
              event.preventDefault();
              commitTyped();
            }
          }}
        />
      </div>

      {typed && (
        repeat ? (
          <p className="pickerreading">
            <Icon name="repeat" size="sm" /> {repeat.string}
          </p>
        ) : suggestions.length > 0 ? (
          <div className="pickersuggestions" role="listbox" aria-label={t('task.typeDate')}>
            {suggestions.map((suggestion: DateSuggestion, at) => {
              const day = parse(suggestion.date)!;
              const named = formatDayOrName(day, locale, dateFormat);
              /* A bare day of the month with several matches shows the full
                 date, its weekday as the hint: the part that tells three
                 fifteenths apart. */
              const text = suggestion.word ?? formatDay(day, locale, dateFormat);
              const hint = suggestion.word
                ? (fold(named) === fold(suggestion.word) ? null : named)
                : weekdayName(day, locale);
              return (
                <button
                  key={`${suggestion.date}-${suggestion.word ?? ''}`}
                  type="button"
                  role="option"
                  aria-selected={active === at}
                  className={active === at ? 'active' : ''}
                  disabled={outOfRange(day)}
                  onMouseEnter={() => setActive(at)}
                  onMouseDown={(event) => { event.preventDefault(); pickDay(day); }}
                >
                  <span>{text}</span>
                  {hint && <small>{hint}</small>}
                </button>
              );
            })}
          </div>
        ) : (
          <p className={`pickerreading${reading ? '' : ' none'}`}>
            {reading
              ? readingText(reading, withTime, locale, dateFormat, hour12, t('task.dateNoTime'))
              : t('task.dateNotRead')}
          </p>
        )
      )}

      {view === 'choices' && (
        <div className="datepicker-options" ref={optionsRef} onKeyDown={onOptionsKey}>
          {choices.map((choice) => (
            <button
              key={choice.key}
              type="button"
              className="opt"
              disabled={choice.disabled}
              onClick={choice.onSelect}
            >
              <span><Icon name={choice.icon} size="sm" /> {choice.label}</span>
              {choice.hint && <small>{choice.hint}</small>}
            </button>
          ))}
          {footer}
          <button
            type="button"
            className="opt"
            ref={pickRef}
            aria-expanded={false}
            onClick={openMonth}
          >
            <span><Icon name="calendar" size="sm" /> {t('date.pick')}</span>
          </button>
        </div>
      )}

      {view === 'month' && (
      <div className="datepicker-month">
        <button type="button" className="opt datepicker-back" onClick={closeMonth}>
          <span><Icon name="arrow-left" size="sm" /> {t('date.backToChoices')}</span>
        </button>
        <div className="datepanel-head">
          <button
            type="button"
            className="iconbtn"
            aria-label={t('date.previousMonth')}
            disabled={floor !== null && startOfMonth(floor) >= month}
            {...press(() => setMonth((m) => addMonths(m, -1)))}
          >
            <Icon name="arrow-left" size="sm" />
          </button>
          <strong>
            {new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(month)}
          </strong>
          <button
            type="button"
            className="iconbtn"
            aria-label={t('date.nextMonth')}
            disabled={ceiling !== null && startOfMonth(ceiling) <= month}
            {...press(() => setMonth((m) => addMonths(m, 1)))}
          >
            <Icon name="arrow-right" size="sm" />
          </button>
        </div>
        <div className="datepanel-week" aria-hidden="true">
          {weekdays.map((day, at) => <span key={at}>{day}</span>)}
        </div>
        <div className="datepanel-grid" ref={gridRef} onKeyDown={onGridKey}>
          {days.map((day) => {
            const isChosen = selected !== null && isSameDay(day, selected);
            return (
              <button
                key={day.toISOString()}
                type="button"
                className={`dateday${isSameMonth(day, month) ? '' : ' outside'}${isSameDay(day, new Date()) ? ' today' : ''}${isChosen ? ' chosen' : ''}`}
                aria-pressed={isChosen}
                aria-label={formatDayOrName(day, locale, dateFormat)}
                tabIndex={isSameDay(day, anchor) ? 0 : -1}
                disabled={outOfRange(day)}
                onMouseDown={(event) => { event.preventDefault(); pickDay(day); }}
              >
                {format(day, 'd')}
              </button>
            );
          })}
        </div>
      </div>
      )}
    </div>
  );
}

/** "Tue 29 Sep": the day a quick choice lands on, short enough for the end of its line. */
export const shortDay = (day: Date, locale: 'en' | 'fr'): string =>
  new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
  }).format(day).replace(/,/g, '');

const fold = (value: string): string =>
  value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** An API date string back into a date, or null when there is not one. */
export function parse(value: string): Date | null {
  if (!value) return null;
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** The moment an API date string names when it carries a time, else null. */
export function parseTime(value: string): Date | null {
  if (!value.includes('T')) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * A day, and its time when there is one: "Tomorrow 14:30". The one way a date
 * field says what it holds, so the time a task will get is never hidden.
 */
export function dayAndTime(
  value: string, locale: 'en' | 'fr', format: DateFormat, hour12: boolean,
): string {
  const day = parse(value);
  if (!day) return '';
  const time = parseTime(value);
  const name = formatDayOrName(day, locale, format);
  return time ? `${name} ${formatTime(time, locale, hour12)}` : name;
}

/** What the reading line under the field says a typed date was understood as. */
function readingText(
  reading: NonNullable<ReturnType<typeof readNaturalDate>>,
  withTime: boolean,
  locale: 'en' | 'fr',
  format: DateFormat,
  hour12: boolean,
  dayOnly: string,
): string {
  if (!reading.hasTime) return dayAndTime(reading.date, locale, format, hour12);
  if (withTime) return dayAndTime(reading.date, locale, format, hour12);
  return `${dayAndTime(reading.date.slice(0, 10), locale, format, hour12)} · ${dayOnly}`;
}

/**
 * The quick choices of a picker that acts on tasks rather than on a field:
 * the same three days, then the app's two places. The row menu and the bulk
 * bar build theirs from this, so the two lists can no longer drift apart.
 */
export function taskShortcuts(
  t: (key: 'date.today' | 'date.tomorrow' | 'date.nextWeek' | 'review.to.anytime' | 'review.to.someday') => string,
  locale: 'en' | 'fr',
  go: {
    day: (date: Date, label: string) => void;
    today: () => void;
    anytime: () => void;
    someday: () => void;
  },
): DateShortcut[] {
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const monday = nextMonday(today);
  return [
    { key: 'today', label: t('date.today'), icon: 'calendar', hint: shortDay(today, locale), onSelect: go.today },
    { key: 'tomorrow', label: t('date.tomorrow'), icon: 'arrow-right', hint: shortDay(tomorrow, locale), onSelect: () => go.day(tomorrow, t('date.tomorrow')) },
    { key: 'nextWeek', label: t('date.nextWeek'), icon: 'upcoming', hint: shortDay(monday, locale), onSelect: () => go.day(monday, t('date.nextWeek')) },
    { key: 'anytime', label: t('review.to.anytime'), icon: 'week', onSelect: go.anytime },
    { key: 'someday', label: t('review.to.someday'), icon: 'someday', onSelect: go.someday },
  ];
}
