import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useDndMonitor } from '@dnd-kit/core';
import { SectionName, TaskGroup } from './TaskGroup';
import { Icon } from './Icon';
import { DraggableTask } from './dnd/DraggableTask';
import { useT } from '@/hooks/useT';
import { useStore } from '@/store/store';
import type { DisplayMode, GroupKey, Item, SortKey } from '@/domain/types';
import { groupItems, sortItems } from '@/store/selectors';
import { formatRelativeDay } from '@/domain/dates';
import { differenceInCalendarWeeks } from 'date-fns';
import { formatDuration } from '@/domain/estimates';
import { summariseLoad } from '@/domain/load';
import { Droppable } from './dnd/Droppable';
import { RowListContext } from './dnd/RowList';
import type { DropTarget, RowOrder } from '@/domain/dnd';
import type { TranslationKey } from '@/i18n';

interface ModeSurfaceProps {
  items: Item[];
  childrenOf: (id: string) => Item[];
  mode: DisplayMode;
  group: GroupKey;
  sort: SortKey;
  onOpen: (id: string) => void;
  showProject?: boolean;
  /**
   * What a column of the current grouping means as a place to add a task,
   * where it means anything: a project column is a project, a tag column is a
   * tag, a priority column is not a place and gets no line. The page decides,
   * because only the page knows what it grouped.
   */
  addToGroup?: (groupKey: string) => (() => void) | undefined;
  /** Which of Todoist's orders "manual" reads here; a week reads the other one. */
  order?: RowOrder;
  /** The page's view, so a card put in a place by hand turns its sort to manual. */
  viewKey?: string;
  /** Board columns come from sections when a project supplies them. */
  boardColumns?: Array<{
    id: string;
    title: string;
    items: Item[];
    dropTarget?: DropTarget;
    /** Adds a task straight into this column, from the end of it. */
    onAddTask?: () => void;
    /** A day column knows its capacity, and shows its load against it. */
    capacityMinutes?: number | null;
    /** Quick is blue, as it is in a list; its cards say which section they come from. Late is red. */
    accent?: 'quick' | 'late';
    /** A link at the end of the column's heading, such as "Move all to today". */
    action?: ReactNode;
    /** A column that is a real section can be renamed from its heading. */
    onRename?: (name: string) => void;
  }>;
  /**
   * Makes a section at the end of the board, from a column of its own after
   * the last one (#108). Only a project's board, grouped by its sections,
   * has sections to add to.
   */
  onAddSection?: (name: string) => Promise<void> | void;
  /**
   * Groups a list leads with, above whatever it was grouped by (the Quick
   * group, #154). A board has no such lead, and never draws one.
   */
  lead?: ReactNode;
}

/**
 * Renders the same set of tasks the way the current mode asks for.
 *
 * List is the mode for scanning and administering, Board shows columns, and
 * Calendar places dated work on a month grid. A task carries the same
 * information and the same hover controls in every one of them.
 */
export function ModeSurface(props: ModeSurfaceProps) {
  const { mode } = props;
  if (mode === 'board') return <BoardSurface {...props} />;
  return <ListSurface {...props} />;
}

function useGrouped(props: ModeSurfaceProps) {
  const { t, locale } = useT();
  const snapshot = useStore((s) => s.snapshot);
  const { items, group, sort, childrenOf, order } = props;

  return useMemo(() => {
    const sorted = sortItems(items, sort, childrenOf, order, snapshot);
    return groupItems(sorted, group, snapshot, {
      none: t('common.none'),
      noProject: t('nav.inbox'),
      noSection: t('group.noSection'),
      noEstimate: t('metrics.noEstimates'),
      noLabel: t('common.none'),
      priority: (p) => t(`common.p${p}` as TranslationKey),
      day: (d) => (d ? formatRelativeDay(d, locale) : t('common.none')),
      week: (monday) => {
        const weeks = differenceInCalendarWeeks(monday, new Date(), { weekStartsOn: 1 });
        if (weeks === 0) return t('group.thisWeek');
        if (weeks === 1) return t('date.nextWeek');
        return t('group.weekOf', {
          date: new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(monday),
        });
      },
      month: (first) => {
        const name = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(first);
        return name.charAt(0).toUpperCase() + name.slice(1);
      },
      scheduled: t('section.scheduled'),
      available: t('section.available'),
    });
  }, [items, group, sort, childrenOf, order, snapshot, t, locale]);
}

function ListSurface(props: ModeSurfaceProps) {
  const { t } = useT();
  const groups = useGrouped(props);

  if (props.items.length === 0 && !props.lead) {
    return <p className="empty">{t('task.noTasks')}</p>;
  }

  return (
    <div className="mode">
      {props.lead}
      {groups.map((group) => (
        <TaskGroup
          key={group.key}
          title={group.title || undefined}
          items={group.items}
          childrenOf={props.childrenOf}
          onOpen={props.onOpen}
          showProject={props.showProject}
          onAddTask={props.addToGroup?.(group.key)}
        />
      ))}
    </div>
  );
}

/** A board column is never narrower than 320px (v2): wide enough to read a title. */
const COLUMN_MIN = 320;
/** Nor wider than this, past which a column stops reading as a column. They
 *  stretch between the two so that a whole number of them fills the page (#99). */
const COLUMN_MAX = 480;
/** How close to the board's edge a held card has to be to turn the page. */
const EDGE_ZONE = 48;
/** How long it is held there before the first turn, and between the next ones. */
const EDGE_DWELL_MS = 450;
const EDGE_REPEAT_MS = 900;

const columnGap = (board: HTMLElement): number =>
  parseFloat(getComputedStyle(board).columnGap || '16') || 16;

function BoardSurface(props: ModeSurfaceProps) {
  const { t, locale } = useT();
  const groups = useGrouped(props);
  // Columns derived from a grouping are not drop destinations: dropping onto
  // "priority" or "tag" has no single unambiguous meaning.
  const columns: NonNullable<ModeSurfaceProps['boardColumns']> =
    props.boardColumns ??
    groups.map((g) => ({ id: g.key, title: g.title || t('common.all'), items: g.items }));

  const boardRef = useRef<HTMLDivElement>(null);
  const [reach, setReach] = useState({ left: false, right: false });
  /* How many columns make a page, and how wide each one is so that exactly
     that many fill the board: no column is ever half on screen (#99). */
  const [page, setPage] = useState<{ count: number; width: number } | null>(null);

  /* The arrows are shown only when the board actually overflows, and each
     one goes dark at its end. Measured from the scroll position rather than
     counted, because how many columns fit depends on the window. */
  /* The column that adds a section is a column like the others as far as the
     page is concerned: it takes a whole place, never half of one (#99). */
  const slots = columns.length + (props.onAddSection ? 1 : 0);
  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const measure = () => {
      const gap = columnGap(board);
      const available = board.clientWidth;
      const fit = Math.max(1, Math.floor((available + gap) / (COLUMN_MIN + gap)));
      const count = Math.min(fit, slots);
      const width = Math.min(COLUMN_MAX, (available - (count - 1) * gap) / count);
      setPage((was) => (was?.count === count && Math.abs(was.width - width) < 0.5 ? was : { count, width }));
      const max = board.scrollWidth - board.clientWidth;
      setReach({ left: board.scrollLeft > 1, right: board.scrollLeft < max - 1 });
    };
    measure();
    board.addEventListener('scroll', measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(board);
    return () => {
      board.removeEventListener('scroll', measure);
      observer.disconnect();
    };
  }, [slots]);

  /** Turns a whole page: the next columns take exactly the place of these. */
  const step = (direction: -1 | 1) => {
    const board = boardRef.current;
    if (!board || !page) return;
    const stride = page.width + columnGap(board);
    const at = Math.round(board.scrollLeft / stride);
    board.scrollTo({ left: (at + direction * page.count) * stride, behavior: 'smooth' });
  };

  /* A card held at the board's edge turns the page, once, then again every
     so often while it stays there — the drag's own way to reach a column
     that is not on screen, at a pace a drop can still be aimed at. */
  const edgeTimer = useRef<number | null>(null);
  const edgeSide = useRef<-1 | 0 | 1>(0);
  const stopTurning = () => {
    if (edgeTimer.current !== null) window.clearTimeout(edgeTimer.current);
    edgeTimer.current = null;
    edgeSide.current = 0;
  };
  const stepRef = useRef(step);
  stepRef.current = step;
  useDndMonitor({
    onDragMove(event) {
      const board = boardRef.current;
      const start = event.activatorEvent as PointerEvent | null;
      if (!board || !start || typeof start.clientX !== 'number') return;
      const x = start.clientX + event.delta.x;
      const y = start.clientY + event.delta.y;
      const rect = board.getBoundingClientRect();
      const inside = y >= rect.top && y <= rect.bottom;
      const side: -1 | 0 | 1 = !inside ? 0
        : x <= rect.left + EDGE_ZONE && board.scrollLeft > 1 ? -1
        : x >= rect.right - EDGE_ZONE && board.scrollLeft < board.scrollWidth - board.clientWidth - 1 ? 1
        : 0;
      if (side === edgeSide.current) return;
      stopTurning();
      edgeSide.current = side;
      if (side === 0) return;
      const turn = () => {
        stepRef.current(side);
        edgeTimer.current = window.setTimeout(turn, EDGE_REPEAT_MS);
      };
      edgeTimer.current = window.setTimeout(turn, EDGE_DWELL_MS);
    },
    onDragEnd: stopTurning,
    onDragCancel: stopTurning,
  });
  useEffect(() => stopTurning, []);

  if (slots === 0) return <p className="empty">{t('task.noTasks')}</p>;

  return (
    /* A board runs past the reading measure, to the right; what is read
       above it does not. */
    <div className="mode">
      {(reach.left || reach.right) && (
        <div className="boardnav">
          <span className="pager">
            <button
              className="iconbtn"
              aria-label={t('board.previous')}
              title={t('board.previous')}
              disabled={!reach.left}
              onClick={() => step(-1)}
            >
              <Icon name="arrow-left" size="sm" />
            </button>
            <button
              className="iconbtn"
              aria-label={t('board.next')}
              title={t('board.next')}
              disabled={!reach.right}
              onClick={() => step(1)}
            >
              <Icon name="arrow-right" size="sm" />
            </button>
          </span>
        </div>
      )}
      <div
        className={`board fullwidth${props.group === 'day' ? ' days' : ''}`}
        ref={boardRef}
        style={page ? ({ '--colw': `${page.width}px` } as React.CSSProperties) : undefined}
      >
        {columns.map((column) => {
          /* The column's own header line: time, what is still unestimated and,
             where the column is a day, how full it is. */
          const load = summariseLoad(column.items, props.childrenOf, column.capacityMinutes ?? null);
          const parts = [
            load.estimatedMinutes > 0 ? formatDuration(load.estimatedMinutes, locale) : null,
            /* What has no estimate is not counted here: a column says its time
               when it has one, and is silent about the rest. */
            load.estimatedMinutes > 0 && load.percentage !== null ? `${load.percentage} %` : null,
          ].filter((part): part is string => part !== null);
          // An empty column has nothing to measure; "0 %" under it is noise.
          if (column.items.length === 0) parts.length = 0;
          const body = (isOver: boolean) => (
            <section className={`col${column.accent ? ` accent-${column.accent}` : ''}${isOver ? ' dropping' : ''}`}>
            <div className="chead">
              <div className="chead-title">
                {column.onRename ? (
                  <SectionName
                    id={column.id}
                    value={column.title}
                    placeholder={t('section.untitled')}
                    label={t('section.name')}
                    onRename={column.onRename}
                    wrap
                  />
                ) : (
                  <strong>{column.title}</strong>
                )}
                <small className={load.level === 'over' ? 'over' : undefined}>
                  {[t('metrics.tasks', { count: column.items.length }), ...parts].join(' · ')}
                </small>
              </div>
              {column.action}
            </div>
            {/* A column is a list its cards take a place in, like a list's
                group: the place follows the pointer between the cards (#20). */}
            <RowListContext.Provider value={column.dropTarget ? {
              order: props.order ?? 'project',
              ids: column.items.map((item) => item.id),
              target: column.dropTarget,
              viewKey: props.viewKey,
            } : null}>
            {column.items.map((item) => (
              <DraggableTask
                key={item.id}
                item={item}
                childrenOf={props.childrenOf}
                onOpen={props.onOpen}
                showProject={props.showProject}
                showSection={column.accent === 'quick'}
                surface="card"
              />
            ))}
            </RowListContext.Provider>
            {isOver && <div className="dropbar" aria-hidden="true" />}
            {/* While a card hovers an empty column, its place stands where the text was. */}
            {column.items.length === 0 && !isOver && <p className="empty">{t('group.empty')}</p>}
            {/* Not a card: a card is a task, and the thing that makes one is
                the end of the column rather than something sitting in it. */}
            {(column.onAddTask ?? props.addToGroup?.(column.id)) && (
              <button
                className="coladd"
                onClick={column.onAddTask ?? props.addToGroup?.(column.id)}
              >
                <Icon name="plus" size="sm" />
                {t('nav.addTaskHere')}
              </button>
            )}
            </section>
          );

          return column.dropTarget ? (
            <Droppable target={column.dropTarget} key={column.id}>
              {({ isOver }) => body(isOver)}
            </Droppable>
          ) : (
            <div key={column.id}>{body(false)}</div>
          );
        })}
        {props.onAddSection && (
          <AddSectionColumn
            onAdd={props.onAddSection}
            onAdded={() => {
              /* The new column lands just before this one; the page follows
                 it, so what was made is on screen. */
              const board = boardRef.current;
              if (board) {
                window.requestAnimationFrame(() => board.scrollTo({
                  left: board.scrollWidth, behavior: 'smooth',
                }));
              }
            }}
          />
        )}
      </div>
    </div>
  );
}

/**
 * The board's own way to make a section (#108).
 *
 * A column after the last one, as in Todoist's board: at rest it is a quiet
 * dashed place saying what it does; clicked, it is a name field. Enter makes
 * the section — the same call the list's "Add section" line makes, so the
 * two are the same section — and Escape, or leaving the field empty, makes
 * nothing.
 */
function AddSectionColumn({
  onAdd, onAdded,
}: { onAdd: (name: string) => Promise<void> | void; onAdded: () => void }) {
  const { t } = useT();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const fieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) fieldRef.current?.focus(); }, [editing]);

  const cancel = () => { setEditing(false); setName(''); };
  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) { cancel(); return; }
    void onAdd(trimmed);
    setName('');
    setEditing(false);
    onAdded();
  };

  return (
    <div className="coladdsection">
      {editing ? (
        <form
          className="col addsection-form"
          onSubmit={(e) => { e.preventDefault(); submit(); }}
        >
          <input
            ref={fieldRef}
            className="addsection-field"
            value={name}
            placeholder={t('section.name')}
            aria-label={t('section.name')}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Escape') { e.preventDefault(); cancel(); }
            }}
            onBlur={(e) => {
              // Leaving for one of the form's own buttons is not leaving.
              if (e.relatedTarget && e.currentTarget.form?.contains(e.relatedTarget as Node)) return;
              if (!name.trim()) cancel();
            }}
          />
          <div className="addsection-actions">
            <button type="button" className="btn quiet" onClick={cancel}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn primary" disabled={!name.trim()}>
              {t('section.add')}
            </button>
          </div>
        </form>
      ) : (
        <button className="addsection-col" onClick={() => setEditing(true)}>
          <Icon name="plus" size="sm" />
          {t('section.add')}
        </button>
      )}
    </div>
  );
}
