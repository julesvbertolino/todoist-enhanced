import { useDataSnapshot } from '@/hooks/useDataSnapshot';
import { TodoistMark } from './TodoistMark';
import { addDays, nextMonday, nextSaturday, startOfDay } from 'date-fns';
import { confirmUndatedMove } from '@/domain/confirmUndatedMove';
import { AssigneeField } from './AssigneeField';
import { assignees } from '@/domain/sharing';
import { useProjectPeople } from '@/hooks/useProjectPeople';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toTodoistPriority } from '@/domain/types';
import { Icon } from './Icon';
import { useT } from '@/hooks/useT';
import { useMenuKeys } from '@/hooks/useMenuKeys';
import { usePhoneBehaviour } from '@/hooks/useTouchLayout';
/* Two ways in, one destination: a key pressed on the row the cursor is on, and
   a finger held on the row it is under. Both ask this component to open one of
   its menus, and both say which by name. */
import { ROW_MENU_EVENT } from '@/hooks/useKeyboard';
import { copyText, isTemporaryId, todoistTaskUrl } from '@/api/links';
import { ROW_PRESS_EVENT, type RowMenu } from '@/domain/gestures';
import { useStore } from '@/store/store';
import { useConfirm } from './overlays/Confirm';
import { effectiveEstimate } from '@/domain/estimates';
import { DurationChooser } from './DurationField';
import { DatePicker, shortDay, taskShortcuts, type RecurrenceReading } from './DatePicker';
import { nextOccurrence } from '@/domain/nextOccurrence';
import { dueDate, isOverdue, formatDayOrName, formatTime, toApiDate } from '@/domain/dates';
import { dueForDate } from '@/domain/recurrence';
import { weekLabel } from '@/domain/types';
import { markerStyle } from '@/domain/colors';
import { dropMutation, moveArgs, type DropTarget } from '@/domain/dnd';
import { updateItem, moveItem } from '@/api/commands';
import type { Item, Snapshot } from '@/domain/types';
import { byChildOrder, bySectionOrder } from '@/domain/orderKey';


/** A word with its case and accents set aside, so "Été" is found by "ete". */
const fold = (value: string): string =>
  value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** Somewhere a task can be sent: a project, or a section inside one. */
interface Destination {
  key: string;
  target: DropTarget;
  /** The project's name, or the section's. */
  label: string;
  /** The project a section belongs to, so a match on the section says where. */
  hint?: string;
  colour?: string;
  current: boolean;
}

/** The gap between a row's buttons and the menu hanging from them. */
const ROWMENU_GAP_PX = 4;

/**
 * Where a row menu opens: drawn into the page, never into the row (#111).
 *
 * A row menu used to hang inside the row, positioned against it, and so
 * inside every box the row sits in. A board scrolls sideways, and a box that
 * scrolls on one axis clips on both, so a menu near a short column or a
 * short list was folded to that box's height — sometimes. Which box counted
 * was worked out once, when the menu opened, from whether it was carrying
 * more than it could show at that moment: the schedule menu, taller, found
 * one ceiling, the move menu another, and a menu that grew as you typed kept
 * the ceiling its smaller self had found. "Usually escapes" was the result.
 *
 * Now every row menu is drawn at the document's level and placed against
 * the row's buttons with fixed coordinates, so the only edge that exists is
 * the window's. Below the buttons by default, above when only that side has
 * room, and on the roomier side, scrolling inside itself, when neither has.
 * Aligned to the buttons' right edge, and slid back inside the window when
 * that would put it past the left one.
 *
 * Measured again whenever the menu changes size (typed suggestions grow it),
 * the window does, or anything scrolls under it.
 */
function useMenuPlacement(menu: string, anchorRef: React.RefObject<HTMLElement | null>, point?: { x: number; y: number } | null) {
  const ref = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (menu === 'none') return;
    const node = ref.current;
    const anchor = anchorRef.current;
    if (!node || !anchor) return;
    const menuBox: HTMLDivElement = node;

    const place = () => {
      const margin = 8;
      const box = point ? { top: point.y, bottom: point.y, left: point.x, right: point.x } : anchor.getBoundingClientRect();
      menuBox.style.maxHeight = '';
      menuBox.style.overflowY = '';
      const height = menuBox.offsetHeight;
      const width = menuBox.offsetWidth;

      const roomBelow = window.innerHeight - margin - (box.bottom + ROWMENU_GAP_PX);
      const roomAbove = box.top - ROWMENU_GAP_PX - margin;
      const fitsBelow = height <= roomBelow;
      const fitsAbove = height <= roomAbove;
      // Below by default: a menu only moves when the other side is genuinely better.
      const goUp = fitsBelow ? false : fitsAbove ? true : roomAbove > roomBelow;
      const room = goUp ? roomAbove : roomBelow;
      const shown = Math.min(height, Math.max(120, Math.floor(room)));
      if (!fitsBelow && !fitsAbove) {
        menuBox.style.maxHeight = `${shown}px`;
        menuBox.style.overflowY = 'auto';
      }
      const top = goUp ? box.top - ROWMENU_GAP_PX - shown : box.bottom + ROWMENU_GAP_PX;
      const left = Math.min(
        Math.max(margin, box.right - width),
        Math.max(margin, window.innerWidth - width - margin),
      );
      menuBox.style.top = `${Math.max(margin, top)}px`;
      menuBox.style.left = `${left}px`;
      menuBox.classList.toggle('up', goUp);
      menuBox.style.visibility = '';
    };

    menuBox.style.visibility = 'hidden';
    place();
    const observer = new ResizeObserver(place);
    observer.observe(menuBox);
    /* A capped menu keeps its size while what is inside it grows, and it is
       what is inside that decides whether it still fits. */
    const changed = new MutationObserver(place);
    changed.observe(menuBox, { childList: true, subtree: true });
    window.addEventListener('resize', place);
    /* Any scroll at all — the page, a list, a board sideways — moves the row,
       and the menu goes with it. Captured, because scroll does not bubble. */
    const onScroll = (event: Event) => {
      if (menuBox.contains(event.target as Node)) return;
      place();
    };
    window.addEventListener('scroll', onScroll, { capture: true, passive: true });
    return () => {
      observer.disconnect();
      changed.disconnect();
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', onScroll, { capture: true });
    };
  }, [menu, anchorRef, point]);

  return { ref, className: ' floating' };
}

interface TaskActionsProps {
  item: Item;
  contextOnly?: boolean;
  childrenOf: (id: string) => Item[];
  onOpen: (id: string) => void;
  /** Present on a task gathering dust: keeps it in Someday on purpose (#161). */
  onKeep?: () => void;
}

/**
 * The controls that appear on a row when the pointer is over it.
 *
 * Each one is an icon with a real label and tooltip, so nothing depends on the
 * reader guessing what a glyph does.
 */
export function TaskActions({ item, childrenOf, onOpen, onKeep, contextOnly = false }: TaskActionsProps) {
  const { t, locale } = useT();
  const warmPeople = useProjectPeople(item.project_id, false);
  const assignTask = useStore((state) => state.assignTask);
  const updateTask = useStore((s) => s.updateTask);
  const removeTask = useStore((s) => s.removeTask);
  const skipOccurrence = useStore((s) => s.skipOccurrence);
  const confirm = useConfirm();
  const snapshot = useDataSnapshot();
  const apply = useStore((s) => s.apply);
  const setRecurrence = useStore((s) => s.setRecurrence);
  const toast = useStore((s) => s.toast);
  const demo = useStore((s) => s.demo);
  const dateFormat = useStore((s) => s.prefs.dateFormat);
  const hour12 = useStore((s) => s.prefs.hour12);
  const [menu, setMenu] = useState<'none' | 'schedule' | 'more' | 'estimate' | 'move' | 'priority' | 'deadline'>('none');
  /** What has been typed to narrow the destinations, and where the keyboard is. */
  const [contextPoint, setContextPoint] = useState<{ x: number; y: number } | null>(null);
  const [dest, setDest] = useState('');
  const [destPick, setDestPick] = useState(-1);
  const ref = useRef<HTMLSpanElement>(null);
  /* Only the overflow menu. The other two open with a field already focused,
     and taking the caret out of it would undo the point of opening them. */
  const moreKeys = useMenuKeys(menu === 'more', () => setMenu('none'));
  const priorityKeys = useMenuKeys(menu === 'priority', () => setMenu('none'));
  /** Whether this menu was opened by a key, and so owes the row its focus back. */
  const fromKeyboard = useRef(false);
  /* The sheet is drawn into the document rather than into the row, so a click
     inside it is not inside `ref` and has to be recognised separately. */
  const sheetRef = useRef<HTMLDivElement>(null);
  const phone = usePhoneBehaviour();
  /* Only where a menu hangs off its row. On a phone it is a sheet along the
     bottom edge, placed by the stylesheet, with nothing to flip. */
  const placement = useMenuPlacement(phone ? 'none' : menu, ref, contextPoint);

  useEffect(() => { if (menu !== 'move') { setDest(''); setDestPick(-1); } }, [menu]);

  /* Two ways to be asked for a menu, and the row is where both arrive: a key
     pressed on the row the cursor is on, and a finger held on the row under
     it. Each is an event on the row's own element rather than a context,
     because a context would re-render every other row on the page to tell
     this one. Only the key owes the cursor anything afterwards — a finger
     leaves no cursor to give back. */
  useEffect(() => {
    const row = ref.current?.closest<HTMLElement>('[data-task-id], [data-calendar-task]');
    if (!row) return;
    const byKey = (event: Event) => {
      fromKeyboard.current = true;
      setMenu((event as CustomEvent<RowMenu>).detail);
    };
    const byFinger = (event: Event) => setMenu((event as CustomEvent<RowMenu>).detail);
    const byContext = (event: MouseEvent) => {
      if (item.projection) return;
      event.preventDefault(); event.stopPropagation();
      setContextPoint({ x: event.clientX, y: event.clientY });
      setMenu('more');
    };
    row.addEventListener('contextmenu', byContext);
    row.addEventListener(ROW_MENU_EVENT, byKey);
    row.addEventListener(ROW_PRESS_EVENT, byFinger);
    return () => {
      row.removeEventListener('contextmenu', byContext);
      row.removeEventListener(ROW_MENU_EVENT, byKey);
      row.removeEventListener(ROW_PRESS_EVENT, byFinger);
    };
  }, [item.projection]);

  /* A menu opened from the keyboard takes focus into its own field. Closing
     it has to give the cursor back to the row it belongs to, or every schedule
     from the keyboard ends with the cursor nowhere. */
  useEffect(() => {
    if (menu !== 'none' || !fromKeyboard.current) return;
    fromKeyboard.current = false;
    ref.current?.closest<HTMLElement>('[data-task-id]')?.focus({ preventScroll: true });
  }, [menu]);


  useEffect(() => {
    if (menu === 'none') return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      if (sheetRef.current?.contains(target)) return;
      // The menu is drawn into the document, not into the row (#111).
      if (placement.ref.current?.contains(target)) return;
      // The date picker's Custom repeat dialog is drawn over everything (#202).
      if ((target as Element).closest?.('[data-picker-layer], .popover.listbox')) return;
      setMenu('none');
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu('none'); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menu, placement.ref]);

  const { minutes, computed } = effectiveEstimate(item, childrenOf);
  /* Where "next occurrence" lands, said only when that is certain. */
  const nextDate = nextOccurrence(item);

  /* Moving a task means moving it somewhere it can live. Where it sits in time
     is the schedule menu's business, which is the button next to this one. */
  const projects = useMemo(
    () => Object.values(snapshot.projects)
      .filter((p) => !p.is_deleted && !p.is_archived && !p.is_folder)
      .sort(byChildOrder),
    [snapshot.projects],
  );

  /**
   * Every place the task could go, a project and its sections alike.
   *
   * A section is a destination in Todoist, so it is one here: moving a task
   * into "Design / In review" used to take two gestures, the move and then a
   * drag down the page into the right group.
   */
  const destinations = useMemo<Destination[]>(() => {
    const sections = Object.values(snapshot.sections)
      .filter((s) => !s.is_deleted && !s.is_archived)
      .sort(bySectionOrder);

    return projects.flatMap((project) => [
      {
        key: project.id,
        /* The project itself, said as "this project, no section" rather than
           as a bare project: a task already in the project but sitting in one
           of its sections is going somewhere when it picks this, and a plain
           project destination reads as "already there" and does nothing. */
        target: {
          kind: 'section', projectId: project.id, sectionId: null,
        } as DropTarget,
        label: project.name,
        colour: project.color,
        current: project.id === item.project_id && item.section_id === null,
      },
      ...sections
        .filter((s) => s.project_id === project.id)
        .map((section) => ({
          key: `${project.id}:${section.id}`,
          target: {
            kind: 'section', projectId: project.id, sectionId: section.id,
          } as DropTarget,
          label: section.name || t('section.untitled'),
          hint: project.name,
          current: section.id === item.section_id,
        })),
    ]);
  }, [projects, snapshot.sections, item.project_id, item.section_id, t]);

  /* Typing narrows the list, on the section's name or on the project's, so
     "rev" finds "In review" wherever it lives. */
  const matches = useMemo(() => {
    const needle = fold(dest.trim());
    if (!needle) return destinations;
    return destinations.filter(
      (d) => fold(d.label).includes(needle) || (d.hint ? fold(d.hint).includes(needle) : false),
    );
  }, [destinations, dest]);

  /**
   * Lifts a subtask out of its parent, leaving it where it already lives.
   *
   * Moving a task to a project is what clears its parent — `item_update` does
   * not carry one — so the destination is the project and section it is in
   * already, which changes nothing but the one thing being asked for.
   */
  async function unnest() {
    const parentId = item.parent_id;
    if (!parentId) return;
    const patch = (parent_id: string | null) => (snap: Snapshot): Snapshot => ({
      ...snap,
      items: { ...snap.items, [item.id]: { ...snap.items[item.id], parent_id } as Item },
    });
    await apply(
      [moveItem(item.id, moveArgs({ project_id: item.project_id, section_id: item.section_id }))],
      patch(null),
    );
    toast(item.content, () => {
      void apply([moveItem(item.id, { parent_id: parentId })], patch(parentId));
    });
  }

  /**
   * Sends the task to a view.
   *
   * The destination decides the change, using the same table drag and drop
   * uses, so dropping onto "anytime this week" and choosing it from this menu
   * do exactly the same thing.
   */
  async function moveTo(target: DropTarget, destination: string) {
    setMenu('none');
    if (!await confirmUndatedMove([item], target, locale)) return;
    const mutation = dropMutation(item, target);
    if (!mutation) return;

    // Captured before the change so the undo can put every field back.
    const before = {
      due: item.due,
      labels: item.labels,
      project_id: item.project_id,
      section_id: item.section_id,
    };
    const patch = (fields: Record<string, unknown>) => (snap: Snapshot): Snapshot => ({
      ...snap,
      items: { ...snap.items, [item.id]: { ...snap.items[item.id], ...fields } as Item },
    });

    if (mutation.update) {
      await apply([updateItem(item.id, mutation.update)], patch(mutation.update));
    } else if (mutation.move) {
      /* One destination per move: a section implies its project, and sending
         both is how `item_move` is refused. */
      await apply([moveItem(item.id, moveArgs(mutation.move))], patch(mutation.move));
    }

    /* A move is undone by a move. `item_update` takes neither a project nor a
       section, so undoing one used to put the task back on screen and leave it
       where it had been sent on the server. */
    const undo = mutation.move
      ? moveItem(item.id, moveArgs({
          project_id: before.project_id, section_id: before.section_id,
        }))
      : updateItem(item.id, { due: before.due, labels: before.labels });

    toast(t('task.movedTo', { destination }), () => {
      void apply([undo], patch(before));
    });
  }

  /**
   * A day for the task, from anywhere in the schedule menu: typed, suggested,
   * a date shortcut or the calendar (#110).
   *
   * Keeps the rule when there is one, so dating an occurrence of a recurring
   * task moves that occurrence instead of ending the series. A real date and
   * the week tag on the same task is the contradiction the app reports rather
   * than resolves, so giving it a day takes the tag off — exactly as every
   * other way of dating a task here does.
   */
  function commitDate(iso: string, how?: { clearTime?: boolean }) {
    setMenu('none');
    const before = { due: item.due, labels: item.labels };
    const update = {
      due: dueForDate(item.due, iso, 'en', { dropTime: how?.clearTime }),
      labels: item.labels.filter((l) => l.toLowerCase() !== weekLabel().toLowerCase()),
    };
    const patch = (fields: Record<string, unknown>) => (snap: Snapshot): Snapshot => ({
      ...snap,
      items: { ...snap.items, [item.id]: { ...snap.items[item.id], ...fields } as Item },
    });

    void apply([updateItem(item.id, update)], patch(update)).then(() => {
      toast(
        t('task.movedTo', {
          destination: formatDayOrName(new Date(`${iso.slice(0, 10)}T00:00:00`), locale, dateFormat)
            + (iso.includes('T') ? ` ${formatTime(new Date(iso), locale, hour12)}` : ''),
        }),
        () => { void apply([updateItem(item.id, before)], patch(before)); },
      );
    });
  }

  /**
   * Replacing the repeat rule from the same field: this menu is the fastest
   * way to a task's date, and "every monday" is a date in the sense that
   * matters — the answer to when does this happen.
   *
   * No date goes with it. Todoist works out which day the new rule lands on,
   * and sending one of our own alongside would fix the first occurrence to a
   * date the rule may not even contain.
   */
  function commitRecurrence(repeat: RecurrenceReading) {
    setMenu('none');

    const before = { due: item.due, labels: item.labels };
    const patch = (fields: Record<string, unknown>) => (snap: Snapshot): Snapshot => ({
      ...snap,
      items: { ...snap.items, [item.id]: { ...snap.items[item.id], ...fields } as Item },
    });

    /* A real date and the week tag on the same task is the contradiction the
       app reports rather than resolves, and a rule is a date in that sense. */
    const labels = item.labels.filter((l) => l.toLowerCase() !== weekLabel().toLowerCase());
    if (labels.length !== item.labels.length) void updateTask(item.id, { labels });

    void setRecurrence(item.id, repeat).then(() => {
      toast(t('task.repeats', { rule: repeat.string }), () => {
        void apply([updateItem(item.id, before)], patch(before));
      });
    });
  }

  /**
   * "Stop repeating", from the picker's Repeat (#202): the occurrence the task
   * is on becomes its date, once — the same as emptying the rule in the task
   * panel.
   */
  function stopRepeating() {
    if (!item.due?.is_recurring) return;
    setMenu('none');
    const before = { due: item.due };
    const date = item.due.date;
    const update = { due: { ...item.due, string: date, is_recurring: false } };
    const patch = (fields: Record<string, unknown>) => (snap: Snapshot): Snapshot => ({
      ...snap,
      items: { ...snap.items, [item.id]: { ...snap.items[item.id], ...fields } as Item },
    });
    void apply([updateItem(item.id, update)], patch(update)).then(() => {
      toast(t('task.repeatStopped'), () => { void apply([updateItem(item.id, before)], patch(before)); });
    });
  }

  async function schedule(date: Date | null) {
    if (!date && !await confirmUndatedMove([item], { kind: 'someday' }, locale, true)) return;
    setMenu('none');
    if (date) { commitDate(toApiDate(date)); return; }
    const before = { due: item.due };
    const patch = (due: Item['due']) => (snap: Snapshot): Snapshot => ({ ...snap, items: { ...snap.items, [item.id]: { ...snap.items[item.id], due } } });
    await apply([updateItem(item.id, { due: null })], patch(null));
    toast(t('task.removeDate'), () => { void apply([updateItem(item.id, before)], patch(before.due)); });
  }

  /* Setting an estimate is a field, not a menu, and on a phone it belongs in
     the same sheet as everything else rather than squeezed into a tray 152px
     wide. */
  const setEstimate = (value: number | null) => {
    setMenu('none');
    void updateTask(item.id, { estimateMinutes: value });
  };

  const back = contextPoint !== null || phone ? <button type="button" className="opt task-menu-back" onClick={() => setMenu('more')}><span><Icon name="arrow-left" size="sm" />{t('task.menuBack')}</span></button> : null;
  const estimateSheet = (
    <div className={`popover rowmenu estimatesheet durationbody${phone ? ' asSheet' : placement.className}`} role="menu" ref={placement.ref}>
      {back}
      {/* Most estimates are one of these, and on a phone typing "45" means
          opening a keyboard over half the screen to press two keys. The field
          stays underneath for the ones that are not. */}
      <DurationChooser
        minutes={computed ? null : minutes}
        cancelOnBlurTarget=".task-menu-back, .estchip"
        onChoose={setEstimate}
        onType={setEstimate}
        onCancel={() => setMenu('none')}
      />
    </div>
  );

  const menus = (
    <>
      {menu === 'priority' && <div className={`popover rowmenu prioritymenu${phone ? ' asSheet' : placement.className}`} role="menu" ref={(node) => { placement.ref.current = node; priorityKeys.current = node; }}>
        {back}
        {([1, 2, 3, 4] as const).map((priority) => <button className="opt" key={priority} onClick={() => {
          setMenu('none'); void updateTask(item.id, { priority: toTodoistPriority(priority) });
        }}><span><Icon name="flag" size="sm" style={{ color: `var(--p${priority})` }} />P{priority}</span></button>)}
      </div>}
      {menu === 'deadline' && <div className={`popover rowmenu schedulemenu${phone ? ' asSheet' : placement.className}`} role="menu" ref={placement.ref}>
        {back}
        <DatePicker value={item.deadline?.date ?? ''} label={t('detail.deadline')} onEscape={() => setMenu('none')} onPick={(date) => {
          setMenu('none'); void updateTask(item.id, { deadline: date ? { date: date.slice(0, 10), lang: locale } : null });
        }} />
      </div>}

      {menu === 'estimate' && estimateSheet}
        {menu === 'schedule' && (
          <div
            className={`popover rowmenu schedulemenu${phone ? ' asSheet' : placement.className}`}
            role="menu"
            ref={placement.ref}
          >
            {back}
            {/* The one date picker (#110): the same field, choices and month
                as the bulk bar's Date panel and every date field. */}
            <DatePicker
              value={item.due?.date ?? ''}
              label={t('task.schedule')}
              withTime
              onPick={commitDate}
              onRecurrence={commitRecurrence}
              recurrence={item.due?.is_recurring ? item.due : null}
              onClearRecurrence={stopRepeating}
              duration={{
                minutes: computed ? null : minutes,
                onChange: (value) => void updateTask(item.id, { estimateMinutes: value }),
              }}
              onEscape={() => setMenu('none')}
              shortcuts={taskShortcuts(t, locale, {
                today: () => void moveTo({ kind: 'today' }, t('common.today')),
                day: (date) => commitDate(toApiDate(date)),
                anytime: () => void moveTo({ kind: 'anytime' }, t('nav.week')),
                someday: () => void moveTo({ kind: 'someday' }, t('nav.someday')),
              })}
              footer={(item.due?.is_recurring || item.due) ? (
                <>
                  {item.due?.is_recurring && (
                    <button
                      type="button"
                      className="opt"
                      title={t('task.nextOccurrenceHint')}
                      onClick={() => { setMenu('none'); void skipOccurrence(item.id); }}
                    >
                      <span><Icon name="repeat" size="sm" /> {t('task.nextOccurrence')}</span>
                      {nextDate && <small>{shortDay(nextDate, locale)}</small>}
                    </button>
                  )}
                  {item.due && (
                    <button type="button" className="opt" onClick={() => schedule(null)}>
                      <span><Icon name="close" size="sm" /> {t('task.removeDate')}</span>
                    </button>
                  )}
                </>
              ) : undefined}
            />
          </div>
        )}

        {menu === 'move' && (
          <div
            className={`popover rowmenu movemenu${phone ? ' asSheet' : placement.className}`}
            role="menu"
            ref={placement.ref}
          >
            {back}
            {/* Typing is how you find one project among forty, so the field is
                the first thing here and it already has the caret — the same
                gesture the schedule menu asks for. The heading goes: the field's
                placeholder says what the menu is for. */}
            <div className="pickersearch">
            <Icon name="search" size="sm" />
            <input
              autoFocus
              value={dest}
              placeholder={t('task.typeDestination')}
              aria-label={t('task.moveToProject')}
              onChange={(e) => { setDest(e.target.value); setDestPick(-1); }}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'ArrowDown' && matches.length > 0) {
                  e.preventDefault();
                  setDestPick((at) => (at + 1) % matches.length);
                  return;
                }
                if (e.key === 'ArrowUp' && matches.length > 0) {
                  e.preventDefault();
                  setDestPick((at) => (at <= 0 ? matches.length - 1 : at - 1));
                  return;
                }
                if (e.key === 'Enter') {
                  e.preventDefault();
                  /* Nothing is highlighted until you arrow onto it, so Enter on
                     an untouched list would move the task somewhere you never
                     looked at. It commits the first match only once you have
                     typed enough to make "the first match" mean something. */
                  const chosenDest = destPick >= 0
                    ? matches[destPick]
                    : dest.trim() ? matches[0] : undefined;
                  if (chosenDest) void moveTo(chosenDest.target, chosenDest.label);
                  return;
                }
                if (e.key === 'Escape') setMenu('none');
              }}
            />
            </div>

            <div className="movelist" role="listbox">
              {matches.map((destination, at) => (
                <button
                  key={destination.key}
                  role="option"
                  aria-selected={at === destPick}
                  aria-checked={destination.current}
                  className={`opt${destination.hint ? ' sectionopt' : ''}${at === destPick ? ' on' : ''}`}
                  onMouseEnter={() => setDestPick(at)}
                  onClick={() => void moveTo(destination.target, destination.label)}
                >
                  <span>
                    {destination.hint ? (
                      <Icon name="section" size="sm" />
                    ) : (
                      <span className="hash" style={markerStyle(destination.colour)}>#</span>
                    )}
                    <span className="movelabel" title={destination.label}>{destination.label}</span>
                  </span>
                  {/* Only while filtering: in the full list the section sits
                      under its project and saying so twice is noise. */}
                  {destination.hint && dest.trim() !== '' && <small>{destination.hint}</small>}
                </button>
              ))}
              {matches.length === 0 && <p className="menuhint">{t('search.noResults')}</p>}
            </div>
          </div>
        )}

        {menu === 'more' && (
          <div
            className={`popover rowmenu${phone ? ' asSheet' : placement.className}`}
            role="menu"
            ref={(node) => { placement.ref.current = node; moreKeys.current = node; }}
          >
            <button className="opt" onClick={() => { setMenu('none'); onOpen(item.id); }}>
              <span><Icon name="edit" size="sm" /> {t('task.edit')}</span>
            </button><hr />
            {/* On a phone this sheet is what holding the row opens, and it has
                to be the whole of what hovering one would have shown — the
                swipe tray is the shortcut to the three most-used of these, not
                the only way to reach them. */}
            {(phone || contextPoint !== null) && (
              <>
                <div className="task-quick-label">{t('task.schedule')}</div>
                <div className="task-date-shortcuts" role="group" aria-label={t('task.schedule')}>
                  <button type="button" data-tooltip={t('date.tomorrow')} aria-label={t('date.tomorrow')} onClick={() => commitDate(toApiDate(addDays(new Date(), 1)))}><Icon name="sun" /></button>
                  <button type="button" data-tooltip={t('date.thisWeekend')} aria-label={t('date.thisWeekend')} onClick={() => commitDate(toApiDate(nextSaturday(new Date())))}><Icon name="sofa" /></button>
                  <button type="button" data-tooltip={t('date.nextWeek')} aria-label={t('date.nextWeek')} onClick={() => commitDate(toApiDate(nextMonday(new Date())))}><Icon name="calendar-arrow-right" /></button>
                  <button type="button" data-tooltip={t('task.postpone')} aria-label={t('task.postpone')} disabled={!item.due} onClick={() => {
                    const tomorrow = addDays(startOfDay(new Date()), 1);
                    const next = item.due?.is_recurring ? (isOverdue(item) ? tomorrow : nextOccurrence(item)) : addDays(dueDate(item) ?? new Date(), 1);
                    if (!next) { setMenu('schedule'); return; }
                    commitDate(toApiDate(next < tomorrow ? tomorrow : next));
                  }}><Icon name="reset" /></button>
                  <button type="button" data-tooltip={t('task.removeDate')} aria-label={t('task.removeDate')} disabled={!item.due} onClick={() => void schedule(null)}><Icon name="calendar-x" /></button>
                  <button type="button" data-tooltip={t('date.pick')} aria-label={t('date.pick')} onClick={() => setMenu('schedule')}><Icon name="calendar" /></button>
                </div>
                <hr />
                <button className="opt" onClick={() => setMenu('deadline')}>
                  <span><Icon name="deadline" size="sm" /> {t('detail.deadline')}</span>
                </button>
                <hr />
                <div className="task-quick-label">{t('filter.priorities')}</div>
                <div className="task-priority-shortcuts" role="group" aria-label={t('filter.priorities')}>
                  {([1, 2, 3, 4] as const).map((priority) => <button key={priority} type="button" aria-label={`P${priority}`} title={`P${priority}`}
                    aria-pressed={item.priority === toTodoistPriority(priority)} style={{ color: `var(--p${priority})` }} onClick={() => {
                      setMenu('none'); void updateTask(item.id, { priority: toTodoistPriority(priority) });
                    }}><Icon name="flag" size="sm" />P{priority}</button>)}
                </div>
                <button className="opt" onClick={() => setMenu('move')}>
                  <span><Icon name="project" size="sm" /> {t('task.moveToProject')}</span>
                </button>

                <button className="opt" onClick={() => setMenu('estimate')}>
                  <span><Icon name="clock" size="sm" /> {t('task.setEstimate')}</span>
                </button>
                <hr />
              </>
            )}
            {onKeep && (
              <button className="opt" onClick={() => { setMenu('none'); onKeep(); }}>
                <span><Icon name="someday" size="sm" /> {t('task.keepInSomeday')}</span>
                <small className="opthint">⇧K</small>
              </button>
            )}
            {/* Dragging a subtask out to the left does this too, but a gesture
                nobody has been told about is not a way out of anything. */}
            {item.parent_id && (
              <button className="opt" onClick={() => { setMenu('none'); void unnest(); }}>
                <span><Icon name="subtask" size="sm" /> {t('task.unnest')}</span>
              </button>
            )}
            <button
              className="opt"
              onClick={() => {
                setMenu('none');
                window.open(todoistTaskUrl(item.id), '_blank', 'noopener');
              }}
            >
              <span><TodoistMark className="ic ic-sm menu-mark" /> {t('task.openInTodoist')}</span>
            </button>
            {!isTemporaryId(item.id) && (
              <button
                className="opt"
                disabled={demo}
                onClick={() => {
                  setMenu('none');
                  void copyText(todoistTaskUrl(item.id))
                    .then((ok) => toast(t(ok ? 'task.linkCopied' : 'task.linkNotCopied')));
                }}
              >
                <span><Icon name="link" size="sm" /> {t('task.copyLink')}</span>
              </button>
            )}
            <button className="opt" onClick={() => {
              setMenu('none'); void useStore.getState().duplicateTask(item.id).then(() => toast(t('task.duplicated')));
            }}><span><Icon name="copy" size="sm" />{t('task.duplicate')}</span></button>
            <hr />
            <button
              className="opt danger"
              onClick={() => {
                setMenu('none');
                // Deleting is irreversible here, so it is always confirmed.
                void confirm({
                  title: t('task.deleteTitle'),
                  body: t('task.deleteConfirm', { name: item.content }),
                  confirmLabel: t('task.delete'),
                  destructive: true,
                }).then((ok) => { if (ok) void removeTask(item.id); });
              }}
            >
              <span><Icon name="trash" size="sm" /> {t('task.delete')}</span>
            </button>
          </div>
        )}
    </>
  );

  return (
    <span className={`trow-actions${contextOnly ? ' calendar-context-actions' : ''}`} ref={ref} onPointerEnter={() => void warmPeople()} onClick={(e) => { e.stopPropagation(); if (e.currentTarget.contains(e.target as Node)) setContextPoint(null); }}>
      <>
          {/* Opening the task is what tapping the row already does, so on a
              phone that button is the one the tray leaves out. An estimate is
              not: it is the number this whole app is built on, and asking for
              it should be a swipe rather than a trip through the panel. */}
          <button
            className="rowact-wide"
            aria-label={t('task.edit')}
            title={t('task.edit')}
            onClick={() => onOpen(item.id)}
          >
            <Icon name="edit" size="sm" />
          </button>
          <button
            aria-label={t('task.setEstimate')}
            title={t('task.setEstimate')}
            onClick={() => setMenu('estimate')}
          >
            <Icon name="clock" size="sm" />
          </button>
      </>

      <button
        aria-label={t('task.schedule')}
        title={t('task.schedule')}
        aria-expanded={menu === 'schedule'}
        onClick={() => setMenu(menu === 'schedule' ? 'none' : 'schedule')}
      >
        <Icon name="calendar" size="sm" />
      </button>

      <button
        aria-label={t('task.moveToProject')}
        title={t('task.moveToProject')}
        aria-expanded={menu === 'move'}
        onClick={() => setMenu(menu === 'move' ? 'none' : 'move')}
      >
        <Icon name="project" size="sm" />
      </button>

      {(assignees(snapshot, item.project_id).length > 0 || item.responsible_uid) && (
        <span className={`row-assignee${item.responsible_uid ? ' assigned' : ''}`}>
          <AssigneeField projectId={item.project_id} value={item.responsible_uid}
            onChange={(next) => void assignTask(item.id, next)} iconOnly />
        </span>
      )}
      <button className="row-more"
        aria-label={t('task.moreActions')}
        title={t('task.moreActions')}
        aria-expanded={menu === 'more'}
        onClick={() => setMenu(menu === 'more' ? 'none' : 'more')}
      >
        <Icon name="more" size="sm" />
      </button>

      {/* On a phone the menus come up from the bottom edge as sheets with
          room for a thumb, drawn into the document rather than into the row:
          the row slides sideways to show its buttons, and anything positioned
          inside a sliding row slides with it. */}
      {phone
        ? menu !== 'none' && createPortal(
          <div className="rowsheet" ref={sheetRef}>
            <div className="rowsheet-scrim" onClick={() => setMenu('none')} />
            {menus}
          </div>,
          document.body,
        )
        /* Drawn into the document too, so no box the row sits in can cut a
           menu short (#111). React still carries its events up through the
           row, as if it were drawn there. */
        : menu !== 'none' && createPortal(menus, document.body)}
    </span>
  );
}
