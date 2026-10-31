import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import { Select } from './Select';
import { useT } from '@/hooks/useT';
import { useStore } from '@/store/store';
import { formatDay, formatTime, toApiDate, weekStartsOnOf } from '@/domain/dates';
import { formatDuration, parseDurationInput } from '@/domain/estimates';
import { readNaturalDate } from '@/domain/nlp';
import {
  anchorAllowed, buildRule, readClock, weekdayOrder, weekOfMonth,
  type MonthlyAnchor, type RepeatRule, type RepeatUnit,
} from '@/domain/repeatRule';
import { intlDate } from '@/lib/intl';

/* The keys the row or the list behind a picker also listen to: inside a
   panel they belong to the field or the button they are pressed on. */
const keepKeys = (event: React.KeyboardEvent) => {
  if (event.key === 'Enter' || event.key === ' ' || event.key.startsWith('Arrow')) event.stopPropagation();
};

const atClock = (time: string): Date => {
  const [h, m] = time.split(':').map(Number);
  const at = new Date();
  at.setHours(h, m, 0, 0);
  return at;
};

/* Every quarter hour: what the Time field offers once something is typed. */
const QUARTERS = Array.from({ length: 96 }, (_, at) =>
  `${String(Math.floor(at / 4)).padStart(2, '0')}:${String((at % 4) * 15).padStart(2, '0')}`);

/* Todoist's durations: the quarters up to an hour, then every half hour. */
const DURATIONS = [15, 30, 45, ...Array.from({ length: 46 }, (_, at) => 60 + at * 30)];

const intl = (locale: 'en' | 'fr') => (locale === 'fr' ? 'fr-FR' : 'en-GB');
const digits = (text: string) => text.toLowerCase().replace(/\s+/g, '').replace(/h/g, ':');

/** The task's duration, where the picker's context has one to change. */
export interface DurationControl {
  minutes: number | null;
  onChange: (minutes: number | null) => void;
}

interface ComboOption { value: string; label: string }

/**
 * A field that offers what fits what is typed, and nothing until then: the
 * way Todoist's Time and Duration fields work. The list is the app's own,
 * under the field; ↑↓ walk it, Enter takes the highlighted line or, with none,
 * hands the typed text to `onEnter`.
 */
function ComboField({
  id, label, value, onText, options, onPick, onEnter, placeholder, invalid, autoFocus,
}: {
  id: string;
  label: string;
  value: string;
  onText: (text: string) => void;
  options: ComboOption[];
  onPick: (option: ComboOption) => void;
  onEnter: () => void;
  placeholder: string;
  invalid?: boolean;
  autoFocus?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const fieldRef = useRef<HTMLInputElement>(null);
  const shown = open && value.trim() !== '' && options.length > 0;

  useEffect(() => {
    if (!autoFocus) return;
    fieldRef.current?.focus();
    fieldRef.current?.select();
  }, [autoFocus]);

  return (
    <div className="combo-row">
      <label htmlFor={id}>{label}</label>
      <div className="combo">
        <input
          id={id}
          ref={fieldRef}
          value={value}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={shown}
          aria-controls={`${id}-list`}
          aria-activedescendant={shown && active >= 0 ? `${id}-${active}` : undefined}
          aria-invalid={invalid}
          onChange={(event) => { onText(event.target.value); setOpen(true); setActive(-1); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' && shown) {
              event.preventDefault();
              setActive((at) => (at + 1) % options.length);
            } else if (event.key === 'ArrowUp' && shown) {
              event.preventDefault();
              setActive((at) => (at <= 0 ? options.length - 1 : at - 1));
            } else if (event.key === 'Enter') {
              event.preventDefault();
              if (shown && active >= 0) { onPick(options[active]); setOpen(false); setActive(-1); } else onEnter();
            } else if (event.key === 'Escape' && shown) {
              /* The list goes first; the next Escape leaves the panel. */
              event.preventDefault();
              event.stopPropagation();
              setOpen(false);
            }
          }}
        />
        {shown && (
          <div className="combo-list" role="listbox" id={`${id}-list`}>
            {options.map((option, at) => (
              <button
                key={option.value}
                id={`${id}-${at}`}
                type="button"
                role="option"
                tabIndex={-1}
                aria-selected={at === active}
                className={at === active ? 'active' : ''}
                onMouseEnter={() => setActive(at)}
                onMouseDown={(event) => { event.preventDefault(); onPick(option); setOpen(false); setActive(-1); }}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface ClockPanelProps {
  /** The time the date already has, as "HH:MM", or null. */
  current: string | null;
  onApply: (time: string) => void;
  onClear: () => void;
}

/**
 * Time, at the foot of the date picker (#202): one field, offering the
 * quarter hours that fit once something is typed, as Todoist's does.
 */
export function ClockPanel({ current, onApply, onClear }: ClockPanelProps) {
  const { t, locale } = useT();
  const hour12 = useStore((s) => s.prefs.hour12);
  const show = (time: string) => formatTime(atClock(time), locale, hour12);
  const [timeText, setTimeText] = useState(() => (current ? show(current) : ''));
  const typedTime = timeText.trim();
  const read = typedTime ? readClock(typedTime) : null;

  const timeOptions = useMemo<ComboOption[]>(() => {
    const typed = digits(typedTime);
    if (!typed) return [];
    const matching = QUARTERS.filter((slot) => slot.startsWith(typed) || slot.replace(/^0/, '').startsWith(typed)
      || digits(show(slot)).startsWith(typed));
    const list = read && !matching.includes(read) ? [read, ...matching] : matching;
    return list.slice(0, 8).map((slot) => ({ value: slot, label: show(slot) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `show` follows locale and hour12, listed.
  }, [typedTime, read, locale, hour12]);

  const chosen = read ?? (typedTime ? null : current);
  const save = () => { if (chosen) onApply(chosen); };

  return (
    <div className="datepicker-sub datepicker-time" onKeyDown={keepKeys}>
      <ComboField
        id="datepicker-time-field"
        label={t('date.time')}
        value={timeText}
        onText={setTimeText}
        options={timeOptions}
        /* A suggestion picked is the choice: it applies at once. */
        onPick={(option) => onApply(option.value)}
        onEnter={save}
        placeholder={t('date.timePlaceholder')}
        invalid={!!typedTime && !read}
        autoFocus
      />
      {typedTime && !read && <p className="pickerreading none">{t('date.timeNotRead')}</p>}
      <div className="repeat-actions">
        {current && (
          <button type="button" className="btn sm" onClick={onClear}>{t('date.removeTime')}</button>
        )}
        <button type="button" className="btn sm primary" disabled={!chosen} onClick={save}>
          {t('common.save')}
        </button>
      </div>
    </div>
  );
}

/**
 * Duration, beside Time at the foot of the picker (#202): one field, the
 * durations Todoist offers listed once something is typed. It is the task's
 * estimate, the same figure as the composer's Estimate chip.
 */
export function DurationPanel({ current, onApply }: {
  current: number | null;
  onApply: (minutes: number | null) => void;
}) {
  const { t, locale } = useT();
  const [text, setText] = useState(() => (current ? formatDuration(current, locale) : ''));
  const typed = text.trim();
  const minutes = typed ? parseDurationInput(typed) : null;
  const bad = typed !== '' && minutes === null;

  const options = useMemo<ComboOption[]>(() => {
    const lower = typed.toLowerCase().replace(/\s+/g, '');
    if (!lower) return [];
    const matching = DURATIONS.filter((value) => String(value).startsWith(lower)
      || formatDuration(value, locale).toLowerCase().replace(/\s+/g, '').startsWith(lower));
    const list = minutes !== null && !matching.includes(minutes) ? [minutes, ...matching] : matching;
    return list.slice(0, 8).map((value) => ({ value: String(value), label: formatDuration(value, locale) }));
  }, [typed, minutes, locale]);

  const save = () => { if (!bad) onApply(minutes); };

  return (
    <div className="datepicker-sub datepicker-time" onKeyDown={keepKeys}>
      <ComboField
        id="datepicker-duration"
        label={t('date.duration')}
        value={text}
        onText={setText}
        options={options}
        onPick={(option) => onApply(Number(option.value))}
        onEnter={save}
        placeholder={t('date.noDuration')}
        invalid={bad}
        autoFocus
      />
      <div className="repeat-actions">
        {current !== null && (
          <button type="button" className="btn sm" onClick={() => onApply(null)}>{t('date.removeDuration')}</button>
        )}
        <button type="button" className="btn sm primary" disabled={bad} onClick={save}>
          {t('common.save')}
        </button>
      </div>
    </div>
  );
}

interface RepeatPresetsProps {
  /** The day the rule starts from: the picker's day, or today. */
  start: Date;
  /** The time the rule should carry, "HH:MM", or null. */
  time: string | null;
  /** The current rule's string, to tick the preset it already is. */
  current: string | null;
  onApply: (rule: RepeatRule) => void;
  onCustom: () => void;
  onStop?: () => void;
}

const preset = (patch: Partial<RepeatRule>, time: string | null): RepeatRule => ({
  unit: 'day', interval: 1, weekdays: [], monthly: 'day', fromCompletion: false, time, end: null, ...patch,
});

/**
 * Repeat (#202): Todoist's five usual rules, read from the day the picker is
 * on, then "Custom…" for anything else. Each line says the rule in words; the
 * one the task already follows is ticked.
 */
export function RepeatPresets({ start, time, current, onApply, onCustom, onStop }: RepeatPresetsProps) {
  const { t, locale } = useT();
  const weekday = intlDate(intl(locale), { weekday: 'long' }).format(start);
  const monthDay = locale === 'fr' ? (start.getDate() === 1 ? '1er' : String(start.getDate())) : ordinalEn(start.getDate());
  const dayMonth = intlDate(intl(locale), { day: 'numeric', month: 'long' }).format(start);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => { listRef.current?.querySelector<HTMLButtonElement>('button')?.focus(); }, []);

  const presets: Array<{ key: string; label: string; rule: RepeatRule }> = [
    { key: 'daily', label: t('repeat.preset.daily'), rule: preset({ unit: 'day' }, time) },
    { key: 'weekly', label: t('repeat.preset.weekly', { weekday }), rule: preset({ unit: 'week', weekdays: [start.getDay()] }, time) },
    { key: 'workdays', label: t('repeat.preset.workdays'), rule: preset({ unit: 'workday' }, time) },
    { key: 'monthly', label: t('repeat.preset.monthly', { day: monthDay }), rule: preset({ unit: 'month' }, time) },
    { key: 'yearly', label: t('repeat.preset.yearly', { date: dayMonth }), rule: preset({ unit: 'year' }, time) },
  ];
  /* Todoist drops "starting …" once it has read it, so rules are compared without it. */
  const bare = (string: string) => string.replace(/\s+(?:starting|à partir du)\s+\S+/, '').toLowerCase();

  const onKey = (event: React.KeyboardEvent) => {
    keepKeys(event);
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const buttons = [...(listRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])];
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === 'ArrowDown' ? Math.min(buttons.length - 1, at + 1) : Math.max(0, at - 1);
    buttons[next]?.focus();
  };

  return (
    <div className="datepicker-sub datepicker-options" ref={listRef} onKeyDown={onKey}>
      {presets.map(({ key, label, rule }) => {
        const on = current !== null && bare(buildRule(rule, locale, start).string) === bare(current);
        return (
          <button key={key} type="button" className={`opt${on ? ' on' : ''}`} onClick={() => onApply(rule)}>
            <span><Icon name="repeat" size="sm" /> {label}</span>
            {on && <Icon name="check" size="sm" />}
          </button>
        );
      })}
      <button type="button" className="opt" onClick={onCustom}>
        <span><Icon name="settings" size="sm" /> {t('repeat.preset.custom')}</span>
      </button>
      {onStop && (
        <button type="button" className="opt" onClick={onStop}>
          <span><Icon name="close" size="sm" /> {t('date.removeRepeat')}</span>
        </button>
      )}
    </div>
  );
}

interface RepeatDialogProps {
  start: Date;
  initial: RepeatRule;
  /** The current rule, shown when it could not be read and saving replaces it. */
  replaces: string | null;
  onApply: (rule: RepeatRule) => void;
  onCancel: () => void;
}

const UNITS: RepeatUnit[] = ['day', 'workday', 'week', 'month', 'year'];

/**
 * "Custom…" (#202): Todoist's own dialog — based on the scheduled date or on
 * completion, every N days / workdays / weeks / months / years, an end or
 * none — with the two things Todoist leaves to typing: which weekdays, and
 * which day of the month.
 *
 * It is drawn in the middle of the window, over the picker, which stays open
 * behind it: Cancel or Escape goes back to the presets. It is portalled into
 * the document and marked `data-picker-layer`, which the picker's hosts read
 * as part of themselves, so a click in it does not close them.
 *
 * What it builds is shown above the buttons, word for word as Todoist will
 * receive it.
 */
export function RepeatDialog({ start, initial, replaces, onApply, onCancel }: RepeatDialogProps) {
  const { t, locale } = useT();
  const dateFormat = useStore((s) => s.prefs.dateFormat);
  const weekStartsOn = useStore((s) => s.snapshot.user?.start_day);
  const [rule, setRule] = useState<RepeatRule>(initial);
  const [ends, setEnds] = useState(initial.end !== null);
  const [endText, setEndText] = useState(() =>
    initial.end ? formatDay(new Date(`${initial.end}T00:00:00`), locale, dateFormat) : '');
  const boxRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<RepeatRule>) => setRule((was) => ({ ...was, ...patch }));

  /* The focus goes back to "Custom…" when the dialog goes: left on nothing,
     the next Escape skipped the presets and closed the whole picker. */
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    boxRef.current?.querySelector<HTMLInputElement>('input[type="number"]')?.focus();
    return () => { if (opener?.isConnected) opener.focus(); };
  }, []);
  /* Choosing "On (included)" goes straight to its field, once it is drawn. */
  const focusEnd = useRef(false);
  useEffect(() => {
    if (!ends || !focusEnd.current) return;
    focusEnd.current = false;
    endRef.current?.focus();
  }, [ends]);

  const endTyped = ends ? endText.trim() : '';
  const endRead = useMemo(
    () => (endTyped ? readNaturalDate(endTyped, new Date(), { dateFormat }) : null),
    [endTyped, dateFormat],
  );
  const end = endRead ? endRead.date.slice(0, 10) : null;
  const endProblem = !endTyped ? null
    : !end ? t('repeat.endNotRead')
      : end < toApiDate(start) ? t('repeat.endBefore') : null;

  const effective: RepeatRule = { ...rule, end: ends ? end : null };
  const built = buildRule(effective, locale, start);
  const canApply = !endProblem && !(ends && !end);

  const weekdayName = (day: number, style: 'long' | 'narrow') =>
    intlDate(intl(locale), { weekday: style }).format(new Date(2026, 9, 11 + day)); // 11 Oct 2026 is a Sunday
  const nth = weekOfMonth(start);
  const ordinal = locale === 'fr' ? (nth === 1 ? '1er' : `${nth}e`) : ordinalEn(nth);
  const monthLabel: Record<MonthlyAnchor, string> = {
    day: t('repeat.monthDay', {
      day: locale === 'fr' ? (start.getDate() === 1 ? '1er' : String(start.getDate())) : ordinalEn(start.getDate()),
    }),
    weekday: nth > 4
      ? t('repeat.monthLastWeekday', { weekday: weekdayName(start.getDay(), 'long') })
      : t('repeat.monthWeekday', { nth: ordinal, weekday: weekdayName(start.getDay(), 'long') }),
    lastDay: t('repeat.monthLastDay'),
  };
  const yearDay = intlDate(intl(locale), { day: 'numeric', month: 'long' }).format(start);
  const unitWord = (unit: RepeatUnit) =>
    t(`repeat.${unit}.${rule.interval > 1 ? 'other' : 'one'}` as 'repeat.day.one');

  const apply = () => { if (canApply) onApply(effective); };

  /* Tab goes round inside the dialog: the picker and the page behind it are
     covered, and reaching them by keyboard would be reaching what cannot be
     seen. */
  const onKey = (event: React.KeyboardEvent) => {
    keepKeys(event);
    const target = event.target as HTMLInputElement;
    if (event.key === 'Enter' && target.tagName === 'INPUT' && target.type !== 'radio') {
      event.preventDefault();
      apply();
      return;
    }
    if (event.key !== 'Tab') return;
    const stops = [...(boxRef.current?.querySelectorAll<HTMLElement>('button, input, select') ?? [])]
      .filter((el) => !el.hasAttribute('disabled'));
    if (stops.length === 0) return;
    const first = stops[0];
    const last = stops[stops.length - 1];
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  };

  return createPortal(
    <div
      className="repeatdialog-scrim"
      data-picker-layer=""
      onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}
    >
      <div
        className="repeatdialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="repeatdialog-title"
        ref={boxRef}
        onKeyDown={onKey}
      >
        <div className="repeatdialog-head">
          <h2 id="repeatdialog-title">{t('repeat.customTitle')}</h2>
          <button type="button" className="iconbtn" aria-label={t('common.cancel')} onClick={onCancel}>
            <Icon name="close" size="sm" />
          </button>
        </div>

        <div className="repeatdialog-body">
          <fieldset>
            <legend>{t('repeat.basedOn')}</legend>
            <label className="repeat-radio">
              <input type="radio" name="repeat-based" checked={!rule.fromCompletion} onChange={() => set({ fromCompletion: false })} />
              {t('repeat.basedOnDue')}
            </label>
            <label className="repeat-radio">
              <input type="radio" name="repeat-based" checked={rule.fromCompletion} onChange={() => set({ fromCompletion: true })} />
              {t('repeat.basedOnDone')}
            </label>
          </fieldset>

          <fieldset>
            <legend>{t('repeat.every')}</legend>
            <div className="repeat-every">
              <input
                type="number"
                min={1}
                max={99}
                inputMode="numeric"
                aria-label={t('repeat.interval')}
                value={rule.interval}
                onChange={(event) => {
                  const interval = Math.max(1, Math.min(99, Number(event.target.value) || 1));
                  set({ interval, monthly: anchorAllowed(rule.monthly, interval) ? rule.monthly : 'day' });
                }}
              />
              <Select
                ariaLabel={t('repeat.unit')}
                value={rule.unit}
                options={UNITS.map((unit) => ({ value: unit, label: unitWord(unit) }))}
                onChange={(unit) => set({ unit: unit as RepeatUnit })}
                searchable={false}
              />
            </div>

            {!rule.fromCompletion && rule.unit === 'week' && (
              <div className="repeat-weekdays" role="group" aria-label={t('repeat.onDays')}>
                {weekdayOrder(weekStartsOnOf(weekStartsOn)).map((day) => {
                  const on = rule.weekdays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      aria-pressed={on}
                      aria-label={weekdayName(day, 'long')}
                      className={on ? 'on' : ''}
                      onClick={() => set({
                        weekdays: on ? rule.weekdays.filter((d) => d !== day) : [...rule.weekdays, day],
                      })}
                    >
                      {weekdayName(day, 'narrow')}
                    </button>
                  );
                })}
              </div>
            )}

            {!rule.fromCompletion && rule.unit === 'month' && (
              <div className="repeat-choices">
                {(['day', 'weekday', 'lastDay'] as MonthlyAnchor[]).map((anchor) => (
                  <label key={anchor} className={`repeat-radio${anchorAllowed(anchor, rule.interval) ? '' : ' off'}`}>
                    <input
                      type="radio"
                      name="repeat-month"
                      checked={rule.monthly === anchor}
                      disabled={!anchorAllowed(anchor, rule.interval)}
                      onChange={() => set({ monthly: anchor })}
                    />
                    {monthLabel[anchor]}
                  </label>
                ))}
                {rule.interval > 1 && <small className="repeat-note">{t('repeat.monthDayOnly')}</small>}
              </div>
            )}

            {!rule.fromCompletion && rule.unit === 'year' && rule.interval === 1 && (
              <small className="repeat-note">{t('repeat.yearDay', { date: yearDay })}</small>
            )}
          </fieldset>

          <fieldset>
            <legend>{t('repeat.ends')}</legend>
            <label className="repeat-radio">
              <input type="radio" name="repeat-end" checked={!ends} onChange={() => setEnds(false)} />
              {t('repeat.endNever')}
            </label>
            <label className="repeat-radio">
              <input
                type="radio"
                name="repeat-end"
                checked={ends}
                onChange={() => { focusEnd.current = true; setEnds(true); }}
              />
              {t('repeat.endOn')}
            </label>
            {ends && (
              <>
                <div className="pickersearch datepicker-field repeat-end">
                  <Icon name="calendar" size="sm" />
                  <input
                    ref={endRef}
                    value={endText}
                    placeholder={t('repeat.endPlaceholder')}
                    aria-label={t('repeat.endOn')}
                    aria-invalid={!!endProblem}
                    onChange={(event) => setEndText(event.target.value)}
                  />
                </div>
                {endTyped && (
                  <p className={`pickerreading${endProblem ? ' none' : ''}`}>
                    {endProblem ?? formatDay(new Date(`${end}T00:00:00`), locale, dateFormat)}
                  </p>
                )}
              </>
            )}
          </fieldset>

          <p className="pickerreading repeat-preview" aria-live="polite">
            <Icon name="repeat" size="sm" /> <span>{built.string}</span>
          </p>
          {replaces && <small className="repeat-note">{t('repeat.replaces', { rule: replaces })}</small>}
        </div>

        <div className="repeatdialog-foot">
          <button type="button" className="btn" onClick={onCancel}>{t('common.cancel')}</button>
          <button type="button" className="btn primary" disabled={!canApply} onClick={apply}>
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

const ordinalEn = (n: number): string => {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'}`;
};
