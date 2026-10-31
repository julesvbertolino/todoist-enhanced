import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  addDays, addMonths, addYears, endOfWeek, format, isSameDay, isSameMonth, nextMonday,
  startOfDay, startOfMonth, startOfWeek,
} from 'date-fns';
import { intlDate } from '@/lib/intl';
import { Icon, type IconName } from './Icon';
import { useT } from '@/hooks/useT';
import { useStore } from '@/store/store';
import {
  formatDay, formatDayOrName, formatTime, toApiDate, weekdayName, weekStartsOnOf, type DateFormat,
} from '@/domain/dates';
import { dateSuggestions, type DateSuggestion } from '@/domain/dateWords';
import { readNaturalDate } from '@/domain/nlp';
import { readRecurrence } from '@/domain/recurrence';
import { formatDuration } from '@/domain/estimates';
import {
  buildRule, defaultRule, firstDayOfRule, firstOccurrence, ruleFromString, ruleWithTime, startOf, timeOf, type RepeatRule,
} from '@/domain/repeatRule';
import {
  ClockPanel, DurationPanel, RepeatDialog, RepeatPresets, type DurationControl,
} from './DatePickerPanels';

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
export type RecurrenceReading = NonNullable<ReturnType<typeof readRecurrence>> & {
  /**
   * The first day it lands on, with its time, when a rule built in the Repeat
   * panel makes that plain (#202): the composer's chip then says "Today" with
   * the repeat mark, as Todoist does, rather than the rule's words.
   */
  first?: string;
  /**
   * The date to send with the rule to a task that already has one: the first
   * day for a new rule, the occurrence it is on for a time change. Without
   * it Todoist counts from the task's date and skips it (see setRecurrence).
   */
  date?: string;
};

interface DatePickerProps {
  /** An API date string, or empty for no date. */
  value: string;
  /**
   * A day was chosen — typed, suggested, a date shortcut, the calendar or the
   * Time panel. `clearTime` says the time was taken off on purpose: a caller
   * that keeps a task's time when only its day changes must not put it back.
   */
  onPick: (iso: string, how?: { clearTime?: boolean }) => void;
  /** The accessible name of the whole picker. */
  label: string;
  /**
   * The quick choices. Left out, they are the three every date field has:
   * today, tomorrow, next week. A picker acting on tasks passes its own list,
   * which starts with the same three and adds the app's places (this week,
   * someday) — the same lines, in the same order, wherever they appear.
   */
  shortcuts?: DateShortcut[];
  /**
   * A repeat rule, typed in the field ("every monday") or built in the Repeat
   * panel (#202), where one can be set. Its being there is what shows Repeat.
   */
  onRecurrence?: (rule: RecurrenceReading) => void;
  /** The rule the date already has, so Repeat opens on it and Time edits its time. */
  recurrence?: { string: string; lang: string; first?: string } | null;
  /** "Stop repeating", from the Repeat panel or the cross on its chip. */
  onClearRecurrence?: () => void;
  /**
   * Whether Time sits at the foot of the picker. On by default wherever a time
   * can be kept; the bulk bar turns it off, because one time given to tasks on
   * different days would also move them all to the same day.
   */
  timeButton?: boolean;
  /** The task's duration (its estimate), on its own line beside Time (#202). */
  duration?: DurationControl;
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
  autoFocus = true, withTime = false, recurrence = null, onClearRecurrence, timeButton = withTime,
  duration: durationProp,
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
  /* The choices, or the month, the time or the repeat in their place. */
  const [view, setView] = useState<'choices' | 'month' | 'time' | 'duration' | 'repeat'>('choices');
  const pickRef = useRef<HTMLButtonElement>(null);
  const timeRef = useRef<HTMLButtonElement>(null);
  const repeatRef = useRef<HTMLButtonElement>(null);
  const durationRef = useRef<HTMLButtonElement>(null);
  /* Which foot button takes the focus back once its panel closes. */
  const returnTo = useRef<'pick' | 'time' | 'duration' | 'repeat'>('pick');
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
      ({ pick: pickRef, time: timeRef, duration: durationRef, repeat: repeatRef })[returnTo.current].current?.focus();
    }
    if (!focusCursor.current) return;
    const day = gridRef.current?.querySelector<HTMLElement>('[tabindex="0"]');
    if (!day) return;
    focusCursor.current = false;
    day.focus({ preventScroll: true });
  });

  const today = startOfDay(new Date());
  /* A new day keeps the time the date already had (#202): "Tomorrow" on
     "today 12:00" is tomorrow 12:00, not tomorrow with the time gone. A day
     typed with its own time ("friday 9am") still brings its own. */
  const withDayTime = (day: string): string => (withTime && time ? `${day}T${time}:00` : day);
  const pickDay = (day: Date) => { if (!outOfRange(day)) onPick(withDayTime(toApiDate(day))); };
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
    onPick(withTime && reading.hasTime ? reading.date : withDayTime(toApiDate(day)));
  }

  /* Six weeks from the week's first day on or before the first: always the same number
     of rows, so the picker never changes height as you page. */
  const days = useMemo(() => {
    const first = startOfWeek(startOfMonth(month), { weekStartsOn });
    return Array.from({ length: 42 }, (_, offset) => addDays(first, offset));
  }, [month, weekStartsOn]);
  const weekdays = useMemo(() => {
    const first = startOfWeek(new Date(), { weekStartsOn });
    const fmt = intlDate(locale, { weekday: 'narrow' });
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
  const closeMonth = () => { returnTo.current = 'pick'; focusPick.current = true; setView('choices'); };
  const closeSub = () => {
    returnTo.current = view === 'time' || view === 'duration' || view === 'repeat' ? view : 'pick';
    focusPick.current = true;
    setView('choices');
  };

  /* Time and Repeat (#202). A task that repeats keeps its time in its rule
     ("every mon at 9:15"), so there the time is read from the rule and changed
     by rewriting it: the date beside it can still carry the time it had before
     the rule was set (the composer keeps it), and reading that one is how
     "remove time" seemed to do nothing. Anywhere else the time goes on the day
     the picker is on, or today. */
  const readRuleTime = recurrence ? ruleFromString(recurrence.string) : null;
  const time = readRuleTime ? readRuleTime.time : timeOf(value);
  const ruleLang = (recurrence?.lang === 'fr' ? 'fr' : recurrence ? 'en' : locale) as 'en' | 'fr';
  const start = startOf(value);
  const setTime = (next: string | null) => {
    if (recurrence && onRecurrence) {
      const string = ruleWithTime(recurrence.string, ruleLang, next);
      /* The day it starts on follows, so the chip does not keep the old time. */
      const first = firstDayOfRule(string, recurrence.first ?? (value || null)) ?? undefined;
      const date = value ? `${value.slice(0, 10)}${next ? `T${next}:00` : ''}` : undefined;
      onRecurrence({ matched: string, index: 0, string, lang: ruleLang, fromCompletion: string.includes('!'), first, date });
      return;
    }
    /* A time given to a date that has no day yet goes on the next time it
       comes round: 12:00 asked for at 21:20 is tomorrow, as in Todoist. A day
       that was chosen, today included, is kept as chosen. */
    const now = new Date();
    const passed = next !== null && next <= `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
    const day = toApiDate(!value && passed ? addDays(start, 1) : start);
    if (next) onPick(`${day}T${next}:00`);
    else onPick(day, { clearTime: true });
  };
  const [custom, setCustom] = useState(false);
  const readRule = recurrence ? ruleFromString(recurrence.string) : null;
  const initialRule: RepeatRule = readRule ?? defaultRule(start, time);
  /* A rule given to a task that is late starts from today, not from the day
     it was missed: sending that day would keep it late. A monthly or yearly
     rule is anchored on that past day, so its first day is left to Todoist. */
  const applyRule = (rule: RepeatRule) => {
    const late = start < today;
    const day = late && (rule.unit === 'month' || rule.unit === 'year')
      ? null
      : firstOccurrence(rule, late ? today : start);
    const first = day ? `${toApiDate(day)}${rule.time ? `T${rule.time}:00` : ''}` : undefined;
    onRecurrence?.({ ...buildRule(rule, locale, start), first, date: first });
  };
  const showTime = timeButton && withTime;
  const showRepeat = onRecurrence !== undefined;
  /* Duration sits with Time: where a time can be set, and its context has one. */
  const durationShown = timeButton && withTime ? durationProp : undefined;

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
        if (custom) {
          /* The custom dialog goes first, back to the presets behind it. */
          event.preventDefault();
          event.stopPropagation();
          setCustom(false);
        } else if (view !== 'choices') {
          /* Escape closes the panel it is pressed in, never the picker. */
          event.preventDefault();
          event.stopPropagation();
          closeSub();
        } else if (onEscape) {
          event.preventDefault();
          event.stopPropagation();
          onEscape();
        }
      }}
    >
      {(view === 'choices' || view === 'month') && (<>
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
      </>)}

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
            {intlDate(locale, { month: 'long', year: 'numeric' }).format(month)}
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

      {(view === 'time' || view === 'duration' || view === 'repeat') && (
        <button type="button" className="opt datepicker-back" onClick={closeSub}>
          <span><Icon name="arrow-left" size="sm" /> {t('date.backToDate')}</span>
        </button>
      )}
      {view === 'time' && (
        <ClockPanel current={time} onApply={setTime} onClear={() => setTime(null)} />
      )}
      {view === 'duration' && durationShown && (
        <DurationPanel
          current={durationShown.minutes}
          onApply={(minutes) => { durationShown.onChange(minutes); closeSub(); }}
        />
      )}
      {view === 'repeat' && (
        <RepeatPresets
          start={start}
          time={time}
          current={recurrence?.string ?? null}
          onApply={applyRule}
          onCustom={() => setCustom(true)}
          onStop={recurrence ? onClearRecurrence : undefined}
        />
      )}
      {view === 'repeat' && custom && (
        <RepeatDialog
          start={start}
          initial={initialRule}
          replaces={recurrence && !readRule ? recurrence.string : null}
          onApply={(rule) => { setCustom(false); applyRule(rule); }}
          onCancel={() => setCustom(false)}
        />
      )}

      {/* Time, Duration and Repeat, one full-width line each (#202): what
          each adds while it is empty, then its value on the right with a
          cross to take it off. */}
      {(view === 'choices' || view === 'month') && (showTime || durationShown || showRepeat) && (
        <div className="datepicker-foot">
          {showTime && (
            <FootRow
              buttonRef={timeRef}
              icon="clock"
              label={t('date.time')}
              value={time ? formatTime(atTime(time), locale, hour12) : null}
              clearLabel={t('date.removeTime')}
              onOpen={() => setView('time')}
              onClear={() => setTime(null)}
            />
          )}
          {durationShown && (
            <FootRow
              buttonRef={durationRef}
              icon="sliders"
              label={t('date.duration')}
              value={durationShown.minutes ? formatDuration(durationShown.minutes, locale) : null}
              clearLabel={t('date.removeDuration')}
              onOpen={() => setView('duration')}
              onClear={() => durationShown.onChange(null)}
            />
          )}
          {showRepeat && (
            <FootRow
              buttonRef={repeatRef}
              icon="repeat"
              label={t('date.repeat')}
              /* Without "starting …": Todoist drops it once read, and the day is above. */
              value={recurrence ? recurrence.string.replace(/\s+(?:starting|à partir du)\s+\S+/i, '') : null}
              clearLabel={t('date.removeRepeat')}
              onOpen={() => setView('repeat')}
              onClear={onClearRecurrence}
            />
          )}
        </div>
      )}
    </div>
  );
}

const pad2 = (n: number): string => String(n).padStart(2, '0');

const atTime = (time: string): Date => {
  const [h, m] = time.split(':').map(Number);
  const at = new Date();
  at.setHours(h, m, 0, 0);
  return at;
};

/**
 * Time, Duration or Repeat at the foot of the picker: a full-width line
 * saying what it adds, then, once set, its value on the right and a cross to
 * take it off. The cross keeps the line's colour when hovered: it is part of
 * the value, not a grey button laid on it.
 */
function FootRow({ buttonRef, icon, label, value, clearLabel, onOpen, onClear }: {
  buttonRef: React.RefObject<HTMLButtonElement>;
  icon: IconName;
  label: string;
  value: string | null;
  clearLabel: string;
  onOpen: () => void;
  onClear?: () => void;
}) {
  const keep = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') event.stopPropagation();
  };
  return (
    <div className={`pickerrow${value ? ' set' : ''}`}>
      <button
        ref={buttonRef}
        type="button"
        className="opt pickerrow-open"
        aria-haspopup="dialog"
        aria-label={value ? `${label}: ${value}` : label}
        onClick={onOpen}
        onKeyDown={keep}
      >
        <span><Icon name={icon} size="sm" /> {label}</span>
        {value && <small title={value}>{value}</small>}
      </button>
      {value && onClear && (
        <button
          type="button"
          className="pickerrow-clear"
          aria-label={clearLabel}
          title={clearLabel}
          onClick={onClear}
          onKeyDown={keep}
        >
          <Icon name="close" size="sm" />
        </button>
      )}
    </div>
  );
}

/** "Tue 29 Sep": the day a quick choice lands on, short enough for the end of its line. */
export const shortDay = (day: Date, locale: 'en' | 'fr'): string =>
  intlDate(locale === 'fr' ? 'fr-FR' : 'en-GB', {
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
