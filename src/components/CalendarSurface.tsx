import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { addDays, addMonths, isSameDay } from 'date-fns';
import { Icon } from './Icon';
import { CalendarDayPopover } from './CalendarDayPopover';
import { TaskActions } from './TaskActions';
import type { TaskPlacement } from '@/domain/dnd';
import { DateField } from './DateField';
import { Overlay } from './overlays/Overlay';
import { useT } from '@/hooks/useT';
import { useData } from '@/hooks/useData';
import { useCalendarHistory } from '@/hooks/useCalendarHistory';
import { useStore } from '@/store/store';
import { completionTick } from '@/store/tick';
import { viewPrefs } from '@/store/prefs';
import { applyFilters, sortItems } from '@/store/selectors';
import { calendarDue, calendarLanes, calendarMinutes, calendarPrefs, calendarRange, minuteOfDay, snapMinutes } from '@/domain/calendar';
import { daysBetween, dueDate, hasTime, toApiDate, toApiDateTime } from '@/domain/dates';
import { withEstimate, formatDuration } from '@/domain/estimates';
import { colorValue } from '@/domain/colors';
import { projectOccurrences } from '@/domain/projectOccurrences';
import { displayTaskContent, isUncompletable, toDisplayPriority, type Item } from '@/domain/types';
import { scheduleCalendarTask } from '@/store/calendar';
import { projectIdOfKey } from '@/domain/projectViews';
import './calendar.css';
import { intlDate } from '@/lib/intl';

/** An hour of the day grid: a phone's is shorter, so three days and the hours around now fit one screen (#295). */
const HOUR_HEIGHT_WIDE = 56;
const HOUR_HEIGHT_PHONE = 46;
type Placement = { day: Date; minute: number | null; duration: number };
type SlotSelection = { day: Date; minute: number | null; end: number | null; top: number; x: number; y: number };
type Drag = { item: Item; kind: 'move' | 'start' | 'end'; x: number; y: number; moved: boolean; offset: number; placement: Placement | null };

interface CalendarSurfaceProps {
  viewKey: string;
  /** Before date-window selection and display filters. */
  items: Item[];
  onOpen: (id: string) => void;
  onAddTaskTo: (placement: TaskPlacement) => void;
  childrenOf?: (id: string) => Item[];
}

export function CalendarSurface({ viewKey, items, onOpen, onAddTaskTo, childrenOf: pageChildrenOf }: CalendarSurfaceProps) {
  const { t, locale } = useT();
  const { snapshot, childrenOf: allChildrenOf } = useData(viewKey);
  const childrenOf = pageChildrenOf ?? allChildrenOf;
  const prefs = useStore((s) => s.prefs);
  const current = viewPrefs(prefs, viewKey);
  const options = calendarPrefs(current, viewKey);
  const [anchor, setAnchor] = useState(() => new Date());
  const [now, setNow] = useState(() => new Date());
  const [small, setSmall] = useState(() => window.matchMedia('(max-width: 700px)').matches);
  const HOUR_HEIGHT = small ? HOUR_HEIGHT_PHONE : HOUR_HEIGHT_WIDE;
  const GRID_HEIGHT = 24 * HOUR_HEIGHT;
  /* On a phone the page is the one thing that scrolls, so the grid is framed by scrolling it. */
  const frame = (hour: number) => {
    const grid = scroll.current;
    if (!grid) return;
    if (!small) { grid.scrollTop = Math.max(0, hour) * HOUR_HEIGHT; return; }
    const screen = document.querySelector<HTMLElement>('.screen.active');
    if (!screen) return;
    const top = grid.getBoundingClientRect().top - screen.getBoundingClientRect().top + screen.scrollTop;
    screen.scrollTo({ top: Math.max(0, top + Math.max(0, hour) * HOUR_HEIGHT - 110) });
  };
  const [sidebar, setSidebar] = useState(false);
  const [expanded, setExpanded] = useState<{ date: string; anchor: HTMLElement } | null>(null);
  const [schedule, setSchedule] = useState<Item | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const knownIds = useRef(new Set<string>());
  useEffect(() => { items.forEach((item) => knownIds.current.add(item.id)); }, [items]);
  const activeSelection = useRef<SlotSelection | null>(null);
  const [selection, setSelection] = useState<SlotSelection | null>(null);
  const activeDrag = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  const scroll = useRef<HTMLDivElement>(null);
  const main = useRef<HTMLDivElement>(null);
  const [monthLimit, setMonthLimit] = useState(3);
  const sideToggle = useRef<HTMLButtonElement>(null);
  const closeSide = useRef<HTMLButtonElement>(null);
  const presentation = small && options.presentation === 'week' ? '3-days' : options.presentation;
  const range = calendarRange(anchor, presentation, snapshot.user?.start_day);
  const days = daysBetween(range.first, range.last);
  const history = useCalendarHistory(range.first, range.last, options.completed && !viewKey.startsWith('filter:'),
    viewKey.startsWith('project:') ? projectIdOfKey(viewKey) : viewKey === 'inbox' ? snapshot.user?.inbox_project_id : undefined);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 700px)');
    const onChange = () => setSmall(media.matches);
    media.addEventListener('change', onChange);
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => { media.removeEventListener('change', onChange); clearInterval(timer); };
  }, []);
  useEffect(() => {
    frame(days.some((day) => isSameDay(day, now)) ? now.getHours() - 2 : 8);
    // Only frame the opening period; minute ticks must not interrupt scrolling.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presentation]);
  useEffect(() => {
    const scroller = scroll.current;
    if (!scroller) return;
    const observer = new ResizeObserver(() => scroller.parentElement?.style.setProperty('--calendar-scrollbar', `${scroller.offsetWidth - scroller.clientWidth}px`));
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [presentation]);
  useEffect(() => {
    const element = main.current;
    if (!element || presentation !== 'month') return;
    const measure = () => {
      const rowHeight = (element.clientHeight - 40) / (days.length / 7);
      setMonthLimit(Math.max(1, Math.min(3, Math.floor((rowHeight - 56) / 23))));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [presentation, days.length]);
  useEffect(() => {
    if (!small || !sidebar) return;
    closeSide.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setSidebar(false); sideToggle.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [small, sidebar]);

  const pool = useMemo(() => {
    const byId = new Map(items.map((item) => [item.id, item]));
    if (current.filters.showSubtasks) {
      const walk = (item: Item) => {
        for (const child of childrenOf(item.id)) {
          if (byId.has(child.id)) continue;
          byId.set(child.id, child); walk(child);
        }
      };
      items.forEach(walk);
    }
    if (options.completed) {
      const matchesPage = (item: Item) => viewKey.startsWith('project:') ? item.project_id === projectIdOfKey(viewKey)
        : viewKey === 'inbox' ? item.project_id === snapshot.user?.inbox_project_id
        : viewKey.startsWith('label:') ? item.labels.some((label) => label.toLowerCase() === viewKey.slice(6).toLowerCase())
        : viewKey.startsWith('filter:') ? knownIds.current.has(item.id)
        : viewKey === 'someday' ? item.due === null : true;
      const localDone = Object.values(snapshot.items).filter((item) => item.checked && !item.is_deleted && matchesPage(item));
      // Local entries take precedence over a historical copy. A recurring task
      // can be open again and still have distinct past completed occurrences.
      const localIds = new Set(localDone.map((item) => item.id));
      for (const item of [...localDone, ...history.items.filter((item) => matchesPage(item) && !localIds.has(item.id.split(':')[1]))]) {
        if (!current.filters.showSubtasks && item.parent_id) continue;
        byId.set(item.id, item.due ? item : { ...item, due: item.completed_at ? { date: toApiDate(new Date(item.completed_at)), string: '', lang: locale, timezone: null, is_recurring: false } : null });
      }
    }
    return applyFilters([...byId.values()].filter((item) => !item.is_deleted && (!item.checked || options.completed)
      && (current.filters.showSubtasks || !item.parent_id)), { ...current.filters, includeScheduled: true }, snapshot, childrenOf);
  }, [items, childrenOf, current.filters, options.completed, snapshot, history.items, viewKey, locale]);

  const forecast = useMemo(() => {
    const dated = pool.filter((item) => item.due && !item.checked);
    const projected = projectOccurrences(dated, range.first, range.last);
    const visible = options.futureOccurrences ? projected.items : dated.filter((item) => {
      const date = dueDate(item)!; return toApiDate(date) >= toApiDate(range.first) && toApiDate(date) <= toApiDate(range.last);
    });
    const done = pool.filter((item) => item.checked && item.due && toApiDate(dueDate(item)!) >= toApiDate(range.first) && toApiDate(dueDate(item)!) <= toApiDate(range.last));
    return { items: [...visible, ...done], unsupported: options.futureOccurrences && projected.unsupported };
  }, [pool, options.futureOccurrences, range.first.getTime(), range.last.getTime()]); // eslint-disable-line react-hooks/exhaustive-deps
  const undated = sortItems(pool.filter((item) => !item.due && !item.checked), current.sort, childrenOf, 'day', snapshot);
  const visibleItems = useMemo(() => {
    if (!drag?.moved || !drag.placement) return forecast.items;
    const { day, minute, duration } = drag.placement;
    return [...forecast.items.filter((item) => item.id !== drag.item.id), { ...drag.item, due: calendarDue(drag.item, day, minute), labels: withEstimate(drag.item.labels, duration), duration: { amount: duration, unit: 'minute' as const } }];
  }, [forecast.items, drag]);
  const sorted = sortItems(visibleItems, current.sort, childrenOf, 'day', snapshot);
  const onSave = (id: string, place: Placement, resize: boolean) => {
    void scheduleCalendarTask(id, place.day, place.minute, resize ? place.duration : undefined)
      .catch(() => useStore.getState().toast(t('calendar.failed'), undefined, { tone: 'error' }));
  };
  const addToSlot = (day: Date, minute: number | null, duration = 30) => {
    const date = new Date(day);
    if (minute !== null) date.setHours(0, minute, 0, 0);
    onAddTaskTo({
      ...(viewKey.startsWith('project:') ? { projectId: projectIdOfKey(viewKey) } : viewKey === 'inbox' ? { projectId: snapshot.user?.inbox_project_id } : {}),
      ...(viewKey.startsWith('label:') ? { labels: [viewKey.slice(6)] } : {}),
      date: minute === null ? toApiDate(day) : toApiDateTime(date),
      ...(minute !== null ? { minutes: duration } : {}),
    });
  };
  const addRef = useRef(addToSlot); addRef.current = addToSlot;
  const saveRef = useRef(onSave); saveRef.current = onSave;

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const slot = activeSelection.current;
      if (slot) {
        event.preventDefault();
        const end = slot.minute === null ? null : Math.max(0, Math.min(1440, snapMinutes((event.clientY - slot.top) * 60 / HOUR_HEIGHT)));
        activeSelection.current = { ...slot, end }; setSelection(activeSelection.current); return;
      }
      const previous = activeDrag.current;
      if (!previous || (!previous.moved && Math.hypot(event.clientX - previous.x, event.clientY - previous.y) < 5)) return;
      event.preventDefault();
      let placement: Placement | null = null;
      if (previous.kind !== 'move') {
        const original = dueDate(previous.item)!;
        const start = minuteOfDay(original), end = start + calendarMinutes(previous.item);
        const delta = snapMinutes((event.clientY - previous.y) * 60 / HOUR_HEIGHT);
        const newStart = previous.kind === 'start' ? Math.max(0, Math.min(end - 15, snapMinutes(start + delta))) : start;
        const newEnd = previous.kind === 'end' ? Math.min(1440, Math.max(start + 15, snapMinutes(end + delta))) : end;
        placement = { day: original, minute: newStart, duration: newEnd - newStart };
      } else {
        const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-calendar-day]');
        if (target) {
          const day = new Date(`${target.dataset.calendarDay}T00:00:00`);
          const rect = target.getBoundingClientRect();
          const duration = calendarMinutes(previous.item);
          const minute = target.dataset.calendarSlot === 'time'
            ? Math.max(0, Math.min(1425, snapMinutes((event.clientY - rect.top - previous.offset) * 60 / HOUR_HEIGHT))) : null;
          placement = { day, minute, duration };
          const scroller = scroll.current;
          if (scroller && target.dataset.calendarSlot === 'time') {
            const bounds = scroller.getBoundingClientRect();
            if (event.clientY > bounds.bottom - 35) scroller.scrollTop += 20;
            if (event.clientY < bounds.top + 35) scroller.scrollTop -= 20;
          }
        }
      }
      const next = { ...previous, moved: true, placement };
      activeDrag.current = next; setDrag(next);
    };
    const end = (event: PointerEvent) => {
      const slot = activeSelection.current;
      if (slot) {
        activeSelection.current = null; setSelection(null);
        if (event.type !== 'pointercancel') {
          const moved = Math.hypot(event.clientX - slot.x, event.clientY - slot.y) > 5;
          addRef.current(slot.day, slot.minute === null ? null : Math.min(slot.minute, slot.end ?? slot.minute),
            moved && slot.minute !== null ? Math.max(15, Math.abs((slot.end ?? slot.minute) - slot.minute)) : 30);
        }
        return;
      }
      const held = activeDrag.current;
      if (!held) return;
      activeDrag.current = null; setDrag(null);
      if (held.moved) {
        suppressClick.current = true;
        window.setTimeout(() => { suppressClick.current = false; }, 0);
        if (event.type !== 'pointercancel' && held.placement) saveRef.current(held.item.id, held.placement, held.kind !== 'move');
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { activeDrag.current = null; setDrag(null); activeSelection.current = null; setSelection(null); }
    };
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', end); window.addEventListener('pointercancel', end); window.addEventListener('keydown', escape);
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', end); window.removeEventListener('pointercancel', end); window.removeEventListener('keydown', escape); };
  }, [HOUR_HEIGHT]);

  const begin = (event: ReactPointerEvent, item: Item, kind: Drag['kind']) => {
    if (event.button !== 0 || item.checked || item.projection || item.id.startsWith('calendar-done:')) return;
    event.preventDefault(); event.stopPropagation();
    const block = event.currentTarget.closest<HTMLElement>('.calendar-block');
    activeDrag.current = { item, kind, x: event.clientX, y: event.clientY, moved: false,
      offset: kind === 'move' && block ? event.clientY - block.getBoundingClientRect().top : 0, placement: null };
  };
  const clock = (minute: number) => {
    const day = new Date(); day.setHours(0, minute, 0, 0);
    return intlDate(locale, { hour: 'numeric', minute: '2-digit', hour12: prefs.hour12 }).format(day);
  };
  const tint = (item: Item) => options.coloration === 'priority' ? `var(--p${toDisplayPriority(item.priority)})`
    : options.coloration === 'project' ? colorValue(snapshot.projects[item.project_id]?.color)
      : colorValue(Object.values(snapshot.labels).find((label) => item.labels.includes(label.name) && !label.name.startsWith('est-'))?.color);
  const open = (item: Item) => {
    if (suppressClick.current) return;
    if (item.id.startsWith('calendar-done:')) {
      const id = item.id.split(':')[1];
      void useStore.getState().loadTask(id).then(() => onOpen(id));
    } else onOpen(item.projection?.sourceId ?? item.id);
  };
  const resizeKey = (event: React.KeyboardEvent, item: Item, kind: 'start' | 'end') => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault(); event.stopPropagation();
    const day = dueDate(item)!, start = minuteOfDay(day), duration = calendarMinutes(item);
    const delta = event.key === 'ArrowDown' ? 15 : -15;
    const minute = kind === 'start' ? Math.max(0, Math.min(start + duration - 15, start + delta)) : start;
    const length = kind === 'start' ? duration + start - minute : Math.max(15, Math.min(1440 - start, duration + delta));
    onSave(item.id, { day, minute, duration: length }, true);
  };
  const card = (item: Item, block = false, style?: CSSProperties, noDate = false) => {
    const readonly = item.checked || !!item.projection;
    const date = dueDate(item);
    return <article key={item.id} data-calendar-task={item.id}
      className={`calendar-card ${block ? `calendar-block ${calendarMinutes(item) <= 30 ? 'is-short' : ''}` : 'calendar-chip'} ${noDate ? 'calendar-undated-card' : ''} ${item.checked ? 'is-completed' : ''} ${item.projection ? 'is-forecast' : ''}`}
      style={{ '--event-color': tint(item), ...style } as CSSProperties}
      onClick={(event) => { if (!(event.target as HTMLElement).closest('button,input')) open(item); }}
      onPointerDown={(event) => { if (!(event.target as HTMLElement).closest('button,input')) begin(event, item, 'move'); }}>
      {block && !readonly && <button className="calendar-resize start" aria-label={t('calendar.resizeStart', { title: displayTaskContent(item) })}
        onPointerDown={(event) => begin(event, item, 'start')} onKeyDown={(event) => resizeKey(event, item, 'start')} />}
      {noDate && <button className="calendar-grip" aria-label={t('calendar.move', { title: displayTaskContent(item) })}
        onPointerDown={(event) => begin(event, item, 'move')} onClick={() => { if (!suppressClick.current) setSchedule(item); }}><Icon name="drag" size="sm" /></button>}
      <div className="calendar-card-body">
        <div className="calendar-card-heading">
          {!isUncompletable(item) && !item.projection && <button className={`check p${toDisplayPriority(item.priority)}`} role="checkbox" aria-checked={item.checked}
            aria-label={displayTaskContent(item)} disabled={item.id.startsWith('calendar-done:')}
            onClick={() => { completionTick(item); void useStore.getState().toggleTask(item.id); }}>{item.checked && <Icon name="check" size="sm" />}</button>}
          {item.projection && <span className="calendar-forecast-mark" title={t('upcoming.projectionHint')} aria-label={t('upcoming.projectionHint')}><Icon name="repeat" size="sm" /></span>}
          <button className="calendar-card-title" onPointerDown={(event) => begin(event, item, 'move')}
            onClick={() => open(item)} title={displayTaskContent(item)}>{displayTaskContent(item)}</button>
        </div>
        {block && date && <small>{clock(minuteOfDay(date))} · {formatDuration(calendarMinutes(item), locale)}</small>}
        {noDate && <>
          <small><Icon name="clock" size="sm" />{item.labels.some((label) => /^est-\d+$/i.test(label)) || item.duration ? formatDuration(calendarMinutes(item), locale) : t('calendar.defaultEstimate')}</small>
          <button className="calendar-schedule" onClick={() => setSchedule(item)} aria-label={t('calendar.move', { title: displayTaskContent(item) })}><Icon name="calendar" size="sm" /></button>
        </>}
      </div>
      {block && !readonly && <button className="calendar-resize end" aria-label={t('calendar.resizeEnd', { title: displayTaskContent(item) })}
        onPointerDown={(event) => begin(event, item, 'end')} onKeyDown={(event) => resizeKey(event, item, 'end')} />}
      {!readonly && <TaskActions item={item} childrenOf={childrenOf} onOpen={onOpen} contextOnly />}
    </article>;
  };
  const cellProps = (day: Date, slot: string) => ({
    'data-calendar-day': toApiDate(day), 'data-calendar-slot': slot,
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
      if (event.button !== 0 || (event.target as Element).closest('.calendar-card, button')) return;
      event.preventDefault();
      const top = event.currentTarget.getBoundingClientRect().top;
      const minute = slot === 'time' ? Math.max(0, Math.min(1425, snapMinutes((event.clientY - top) * 60 / HOUR_HEIGHT))) : null;
      const next = { day, minute, end: minute === null ? null : minute + 30, top, x: event.clientX, y: event.clientY };
      activeSelection.current = next; setSelection(next);
    },
    tabIndex: 0,
    onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
      if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault(); addToSlot(day, slot === 'time' ? 9 * 60 : null);
      }
    },
  });
  const periodTitle = intlDate(locale, { month: 'long', year: 'numeric' }).format(anchor);
  const navigate = (direction: number) => { setExpanded(null); setAnchor((day) => presentation === 'month' ? addMonths(day, direction) : addDays(day, direction * (presentation === 'week' ? 7 : 3))); };
  const todayVisible = days.some((day) => isSameDay(day, now));
  const nowPosition = minuteOfDay(now) * HOUR_HEIGHT / 60;

  return <section className="calendar" aria-label={t('toolbar.calendar')}>
    <div className="calendar-toolbar">
      <h2 aria-live="polite">{periodTitle}</h2>
      <div className="calendar-navigation">
        <button className="iconbtn" aria-label={t('calendar.previous')} onClick={() => navigate(-1)}><Icon name="arrow-left" size="sm" /></button>
        <button className="btn" onClick={() => { setAnchor(new Date()); setNow(new Date()); setExpanded(null); frame(new Date().getHours() - 2); }}>{t('calendar.today')}</button>
        <button className="iconbtn" aria-label={t('calendar.next')} onClick={() => navigate(1)}><Icon name="arrow-right" size="sm" /></button>
        <button className="btn" ref={sideToggle} aria-expanded={sidebar} aria-controls={`calendar-undated-${viewKey}`} onClick={() => setSidebar((value) => !value)}>{t('calendar.noDate', { count: undated.length })}<Icon name="sidebar" size="sm" /></button>
      </div>
    </div>
    {forecast.unsupported && <p className="calendar-notice">{t('calendar.unsupported')}</p>}
    {history.error && <p className="calendar-notice" role="status">{t('calendar.historyError')}</p>}
    <div className={`calendar-body ${drag?.moved ? 'is-dragging' : ''}`}>
      <div className="calendar-main" ref={main} style={{ '--calendar-days': presentation === 'month' ? 7 : days.length, '--calendar-weeks': days.length / 7 } as CSSProperties}>
        {presentation === 'month' ? <>
          <div className="calendar-month-head">{days.slice(0, 7).map((day) => <span key={toApiDate(day)}>{intlDate(locale, { weekday: 'short' }).format(day)}</span>)}</div>
          <div className="calendar-month">{days.map((day) => {
            const own = sorted.filter((item) => isSameDay(dueDate(item)!, day));
            const key = toApiDate(day);
            return <div key={key} className={`calendar-month-cell ${day.getMonth() !== anchor.getMonth() ? 'outside' : ''} ${isSameDay(day, now) ? 'is-today' : ''}`} {...cellProps(day, 'month')}>
              <time dateTime={key}>{day.getDate()}</time>
              {own.slice(0, monthLimit).map((item) => card(item))}
              {own.length > monthLimit && <button className="calendar-more" aria-expanded={expanded?.date === key} onClick={(event) => setExpanded({ date: key, anchor: event.currentTarget })}>{t('calendar.more', { count: own.length - monthLimit })}</button>}
            </div>;
          })}</div>
        </> : <>
          <div className="calendar-day-head"><div />{days.map((day) => <div key={toApiDate(day)} className={isSameDay(day, now) ? 'is-today' : ''}>
            {intlDate(locale, { weekday: 'short' }).format(day)} <time dateTime={toApiDate(day)}>{day.getDate()}</time>
          </div>)}</div>
          <div className="calendar-all-day"><div>{small ? t('calendar.allDayShort') : t('calendar.allDay')}</div>{days.map((day) => <div key={toApiDate(day)} {...cellProps(day, 'all-day')}>
            {sorted.filter((item) => isSameDay(dueDate(item)!, day) && !hasTime(item.due)).map((item) => card(item))}
          </div>)}</div>
          <div className="calendar-scroll" ref={scroll}>
            <div className="calendar-time-grid" style={{ height: GRID_HEIGHT }}>
              <div className="calendar-gutter">
                {Array.from({ length: 24 }, (_, hour) => <span key={hour} style={{ top: hour * HOUR_HEIGHT }}>{clock(hour * 60)}</span>)}
                {todayVisible && <strong className="calendar-now-label" style={{ top: nowPosition }}>{clock(minuteOfDay(now))}</strong>}
              </div>
              {days.map((day) => {
                const timed = sorted.filter((item) => isSameDay(dueDate(item)!, day) && hasTime(item.due));
                const lanes = calendarLanes(timed);
                return <div key={toApiDate(day)} className={`calendar-time-column ${isSameDay(day, now) ? 'is-today' : ''}`} {...cellProps(day, 'time')}>
                  {timed.map((item) => {
                    const minute = minuteOfDay(dueDate(item)!);
                    const lane = lanes.get(item.id)!;
                    return card(item, true, { top: minute * HOUR_HEIGHT / 60, height: Math.max(2, Math.min(calendarMinutes(item), 1440 - minute) * HOUR_HEIGHT / 60 - 3),
                      left: `calc(${lane.lane * 100 / lane.count}% + 3px)`, width: `calc(${100 / lane.count}% - 6px)` });
                  })}
                  {selection && isSameDay(selection.day, day) && selection.minute !== null && <div className="calendar-slot-selection" style={{ top: Math.min(selection.minute, selection.end ?? selection.minute) * HOUR_HEIGHT / 60, height: Math.max(15, Math.abs((selection.end ?? selection.minute + 30) - selection.minute)) * HOUR_HEIGHT / 60 }}>{clock(Math.min(selection.minute, selection.end ?? selection.minute))}</div>}
                  {isSameDay(day, now) && <div className="calendar-now-line" style={{ top: nowPosition }} />}
                </div>;
              })}
            </div>
          </div>
        </>}
      </div>
      {sidebar && <aside id={`calendar-undated-${viewKey}`} className="calendar-undated" aria-label={t('calendar.undated')}>
        <header><h3>{t('calendar.undated')} <small>{undated.length}</small></h3><button className="iconbtn" ref={closeSide} aria-label={t('calendar.close')} onClick={() => { setSidebar(false); sideToggle.current?.focus(); }}><Icon name="close" size="sm" /></button></header>
        <p className="calendar-drag-hint"><Icon name="drag" size="sm" />{t('calendar.dragHint')}</p>
        <div className="calendar-undated-list">{undated.map((item) => card(item, false, undefined, true))}{undated.length === 0 && <p className="empty">{t('calendar.empty')}</p>}</div>
        <footer>{t('calendar.resizeHint')}</footer>
      </aside>}
    </div>
    {options.completed && <p className="calendar-notice">{t('calendar.historyHint')}</p>}
    {drag?.moved && drag.placement && <div className="calendar-drag-status" role="status">{displayTaskContent(drag.item)} · {toApiDate(drag.placement.day)} {drag.placement.minute === null ? t('calendar.allDay') : `${clock(drag.placement.minute)} – ${clock(drag.placement.minute + drag.placement.duration)}`}</div>}
    {expanded && <CalendarDayPopover anchor={expanded.anchor} day={new Date(`${expanded.date}T00:00:00`)} onClose={() => setExpanded(null)}>
      {sorted.filter((item) => toApiDate(dueDate(item)!) === expanded.date).map((item) => card(item))}
    </CalendarDayPopover>}
    {schedule && <ScheduleDialog item={schedule} onClose={() => setSchedule(null)} onSave={(day, minute) => { onSave(schedule.id, { day, minute, duration: calendarMinutes(schedule) }, false); setSchedule(null); }} />}
  </section>;
}

function ScheduleDialog({ item, onClose, onSave }: { item: Item; onClose: () => void; onSave: (day: Date, minute: number | null) => void }) {
  const { t } = useT();
  const [value, setValue] = useState(toApiDate(new Date()));
  return <Overlay open label={t('calendar.move', { title: displayTaskContent(item) })} onClose={onClose} size="sm">
    <form className="calendar-schedule-form" onSubmit={(event) => {
      event.preventDefault();
      const day = new Date(value.includes('T') ? value : `${value}T00:00:00`);
      if (!Number.isNaN(day.getTime())) onSave(day, value.includes('T') ? minuteOfDay(day) : null);
    }}>
      <h3>{displayTaskContent(item)}</h3>
      <DateField label={t('calendar.chooseDate')} value={value} onChange={setValue} withTime clearable={false} />
      <div><button className="btn" type="button" onClick={onClose}>{t('calendar.cancel')}</button><button className="btn primary" type="submit">{t('calendar.save')}</button></div>
    </form>
  </Overlay>;
}
