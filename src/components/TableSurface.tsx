import { useDataSnapshot } from '@/hooks/useDataSnapshot';
import { useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import {
  DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Icon } from './Icon';
import { TableHeaderMenu } from './TableHeaderMenu';
import { TaskGroup } from './TaskGroup';
import { TableContext } from './TableContext';
import { useStore } from '@/store/store';
import { useT } from '@/hooks/useT';
import { sortItems } from '@/store/selectors';
import { viewPrefs } from '@/store/prefs';
import { clampColumnWidth, columnMinWidth, columnWidth, dropTableColumn, tableColumnIcon, tableColumns, tableColumnLabel, tableColumnSort } from '@/domain/table';
import { effectiveEstimate, formatDuration } from '@/domain/estimates';
import { insideOthers } from '@/domain/load';
import type { Item, TableColumn, ViewPrefs } from '@/domain/types';
import type { TaskGroupProps } from './TaskGroup';

export function TableSurface({ groups, viewKey, childrenOf, onOpen }: {
  groups: Array<TaskGroupProps>; viewKey: string; childrenOf: (id: string) => Item[]; onOpen: (id: string) => void;
}) {
  const { t, locale } = useT();
  const prefs = useStore((s) => s.prefs);
  const snapshot = useDataSnapshot();
  const setViewPrefs = useStore((s) => s.setViewPrefs);
  const current = viewPrefs(prefs, viewKey);
  const columns = tableColumns(current);
  /* A heading's edge can be pulled; while it is, the table follows the pointer and the choice is saved on release. */
  const [live, setLive] = useState<{ column: TableColumn; width: number } | null>(null);
  const minOf = (column: TableColumn): number => columnMinWidth(column, t(tableColumnLabel[column]));
  const widthOf = (column: TableColumn): number => Math.max(minOf(column), live?.column === column ? live.width : columnWidth(current, column));
  const titleSet = live?.column === 'title' || current.tableWidths?.title !== undefined;
  const tracks = columns.map((column) => column === 'title'
    ? `18px ${titleSet ? `${widthOf('title')}px` : 'minmax(var(--table-title-min,240px),var(--table-title-max,1fr))'}`
    : `${widthOf(column)}px`);
  const saveWidth = (column: TableColumn, width: number | null) => {
    const next = { ...current.tableWidths };
    if (width === null) delete next[column]; else next[column] = Math.max(minOf(column), clampColumnWidth(width));
    setViewPrefs(viewKey, { tableWidths: next });
  };
  const scrollRef = useRef<HTMLDivElement>(null);
  /* Pressing a heading sorts by it, ascending then descending; its chevron opens
     the menu. A drag moves the column and does neither. */
  const [menu, setMenu] = useState<{ column: TableColumn; anchor: HTMLElement } | null>(null);
  const dragged = useRef(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    dragged.current = true;
    window.setTimeout(() => { dragged.current = false; }, 0);
    const patch = over ? dropTableColumn(current, active.id as TableColumn, over.id as TableColumn) : null;
    if (patch) setViewPrefs(viewKey, patch);
  };
  /* The table scrolls inside itself, so the header row stays in view: it is
     given the height left under it in the window, measured again whenever the
     window or the page above it changes size. */
  const [room, setRoom] = useState<number | null>(null);
  useLayoutEffect(() => {
    const box = scrollRef.current;
    if (!box) return;
    const measure = () => setRoom(Math.max(240, Math.floor(window.innerHeight - box.getBoundingClientRect().top - 16)));
    measure();
    window.addEventListener('resize', measure);
    const observer = new ResizeObserver(measure);
    if (box.parentElement) observer.observe(box.parentElement);
    return () => { window.removeEventListener('resize', measure); observer.disconnect(); };
  }, []);
  const all = [...new Map(groups.flatMap((group) => group.items).map((item) => [item.id, item])).values()];
  const inside = insideOthers(all, childrenOf);
  const total = all.reduce((sum, item) => sum + (inside.has(item.id) ? 0 : effectiveEstimate(item, childrenOf).minutes ?? 0), 0);
  return <TableContext.Provider value={{ columns, coloration: current.tableColoration ?? 'none' }}>
    <div ref={scrollRef} className="table-scroll fullwidth"
      style={room ? { maxHeight: room } : undefined}>
      <div className={`task-table${current.tableWrap ? ' wrap' : ''}`}
        style={{ '--table-columns': tracks.join(' '), minWidth: 60 + 12 * columns.length + columns.reduce((sum, column) => sum + (column === 'title' && !titleSet ? 240 : widthOf(column)), 0) } as CSSProperties}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={() => setMenu(null)} onDragEnd={onDragEnd}>
          <SortableContext items={columns} strategy={horizontalListSortingStrategy}>
            <div className="table-head">{columns.map((column) => (
              <HeadCell key={column} column={column} open={menu?.column === column}
                width={widthOf(column)} minWidth={minOf(column)} titleOffset={30}
                onResizing={(width) => setLive(width === null ? null : { column, width })}
                onResized={(width) => saveWidth(column, width)}
                sort={tableColumnSort[column] === current.sort ? current.tableDescending ? 'descending' : 'ascending' : 'none'}
                filtered={isFiltered(current, column)}
                onSort={() => { if (!dragged.current) setViewPrefs(viewKey, { sort: tableColumnSort[column], tableDescending: tableColumnSort[column] === current.sort && !current.tableDescending }); }}
                onOpen={(anchor) => { if (!dragged.current) setMenu((now) => now?.column === column ? null : { column, anchor }); }} />
            ))}</div>
          </SortableContext>
        </DndContext>
        {menu && <TableHeaderMenu column={menu.column} anchor={menu.anchor} current={current} pageItems={all}
          onChange={(patch) => setViewPrefs(viewKey, patch)} onClose={() => setMenu(null)} />}
        {groups.map((group, index) => {
          const sorted = sortItems(group.items, current.sort, childrenOf, group.reorderable || 'project', snapshot);
          return <TaskGroup key={group.sectionId ?? group.title ?? index} {...group} viewKey={viewKey}
            items={current.tableDescending ? sorted.reverse() : sorted} childrenOf={childrenOf} onOpen={onOpen} keepWhenEmpty />;
        })}
        <footer className="table-footer">{t('metrics.tasks', { count: all.length })} · {formatDuration(total, locale)}</footer>
      </div>
    </div>
  </TableContext.Provider>;
}

const isFiltered = (current: ViewPrefs, column: TableColumn): boolean =>
  column === 'priority' ? current.filters.priorities.length > 0
    : column === 'labels' ? current.filters.labels.length > 0
    : column === 'assignee' ? (current.filters.assignees ?? null) !== null
    : false;

/**
 * One heading. Pressing it sorts, and again reverses; the Title stays put, every
 * other heading can be dragged. Its chevron, shown on hover or focus (and always
 * while a filter is on), opens the column's menu. The person icon stands alone
 * for the assignee column, with its name as a tooltip.
 */
function HeadCell({ column, sort, open, filtered, width, minWidth, titleOffset, onResizing, onResized, onSort, onOpen }: {
  column: TableColumn; sort: 'ascending' | 'descending' | 'none'; open: boolean; filtered: boolean;
  width: number; minWidth: number; titleOffset: number; onResizing: (width: number | null) => void; onResized: (width: number | null) => void;
  onSort: () => void; onOpen: (anchor: HTMLElement) => void;
}) {
  const { t } = useT();
  /* A double-click gives a column its width back, but not the end of a drag, nor a drag begun a moment after another. */
  const pulled = useRef(false);
  const menuable = column !== 'title';
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: column });
  const name = t(tableColumnLabel[column]);
  const hint = t(sort === 'ascending' ? 'table.menu.sortDesc' : 'table.menu.sortAsc');
  return (
    <div ref={setNodeRef} aria-sort={sort} className={`${column === 'title' ? 'head-title ' : ''}${isDragging ? 'head-dragging' : ''}${filtered ? ' head-filtered' : ''}${open ? ' head-open' : ''}`.trim() || undefined}
      style={{ transform: CSS.Translate.toString(transform), transition }}>
      <button type="button" className="head-sort" aria-label={column === 'assignee' ? `${name}: ${hint}` : undefined} title={column === 'assignee' ? `${name} · ${hint}` : hint}
        {...attributes} {...listeners} aria-roledescription={undefined}
        onClick={onSort}>
        <Icon name={tableColumnIcon[column]} size="sm" className="head-icon" />
        {column !== 'assignee' && <span className="head-label">{name}</span>}
        {sort !== 'none' && <Icon name="arrow-up" size="sm" className={`head-arrow${sort === 'descending' ? ' desc' : ''}`} />}
        {filtered && <span className="head-dot" aria-hidden="true" />}
      </button>
      {menuable && (
        <button type="button" className="head-more" aria-haspopup="menu" aria-expanded={open} aria-label={`${t('table.menu.open')} (${name})`} title={t('table.menu.open')}
          onClick={(event) => onOpen(event.currentTarget)}>
          <Icon name="caret" size="sm" />
        </button>
      )}
      <span className="head-resize" role="separator" aria-orientation="vertical" tabIndex={0}
        aria-label={t('table.resize', { name })} title={t('table.resizeHint')}
        aria-valuemin={minWidth} aria-valuemax={640} aria-valuenow={Math.round(width)}
        onPointerDown={(event: ReactPointerEvent<HTMLElement>) => {
          event.preventDefault();
          event.stopPropagation();
          const handle = event.currentTarget;
          pulled.current = false;
          handle.setPointerCapture(event.pointerId);
          const cell = handle.parentElement!;
          /* The title's heading also covers the checkbox column. */
          const start = column === 'title' ? cell.offsetWidth - titleOffset : cell.offsetWidth;
          const from = event.clientX;
          let latest = start;
          const move = (e: PointerEvent) => { pulled.current = true; latest = Math.max(minWidth, clampColumnWidth(start + e.clientX - from)); onResizing(latest); };
          const stop = () => {
            handle.removeEventListener('pointermove', move);
            handle.removeEventListener('pointerup', stop);
            handle.removeEventListener('pointercancel', stop);
            onResizing(null);
            if (latest !== start) onResized(latest);
          };
          handle.addEventListener('pointermove', move);
          handle.addEventListener('pointerup', stop);
          handle.addEventListener('pointercancel', stop);
        }}
        onClick={(event) => event.stopPropagation()}
        onDoubleClick={() => { if (!pulled.current) onResized(null); }}
        onKeyDown={(event: KeyboardEvent<HTMLElement>) => {
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            onResized(width + (event.key === 'ArrowRight' ? 16 : -16));
          } else if (event.key === 'Delete' || event.key === 'Backspace') {
            event.preventDefault();
            onResized(null);
          }
        }} />
    </div>
  );
}
