import { useDataSnapshot } from '@/hooks/useDataSnapshot';
import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
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
import { dropTableColumn, tableColumns, tableColumnLabel, tableColumnSort } from '@/domain/table';
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
  const widths = columns.slice(1).map((column) => column === 'description' ? '240px' : column === 'labels' || column === 'project' ? '160px' : column === 'assignee' ? '56px' : column === 'date' ? '140px' : column === 'deadline' ? '130px' : '110px');
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
      <div className="task-table" style={{ '--table-columns': `18px minmax(var(--table-title-min,240px),var(--table-title-max,1fr)) ${widths.join(' ')}`, minWidth: 306 + 12 * widths.length + widths.reduce((sum, width) => sum + parseInt(width), 0) } as CSSProperties}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={() => setMenu(null)} onDragEnd={onDragEnd}>
          <SortableContext items={columns.slice(1)} strategy={horizontalListSortingStrategy}>
            <div className="table-head">{columns.map((column) => (
              <HeadCell key={column} column={column} open={menu?.column === column}
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
function HeadCell({ column, sort, open, filtered, onSort, onOpen }: {
  column: TableColumn; sort: 'ascending' | 'descending' | 'none'; open: boolean; filtered: boolean;
  onSort: () => void; onOpen: (anchor: HTMLElement) => void;
}) {
  const { t } = useT();
  const movable = column !== 'title';
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: column, disabled: !movable });
  const name = t(tableColumnLabel[column]);
  const hint = t(sort === 'ascending' ? 'table.menu.sortDesc' : 'table.menu.sortAsc');
  return (
    <div ref={setNodeRef} aria-sort={sort} className={`${isDragging ? 'head-dragging' : ''}${filtered ? ' head-filtered' : ''}${open ? ' head-open' : ''}`.trim() || undefined}
      style={movable ? { transform: CSS.Translate.toString(transform), transition } : undefined}>
      <button type="button" className="head-sort" aria-label={column === 'assignee' ? `${name}: ${hint}` : undefined} title={column === 'assignee' ? `${name} · ${hint}` : hint}
        {...(movable ? { ...attributes, ...listeners } : {})} aria-roledescription={undefined}
        onClick={onSort}>
        {column === 'assignee' ? <Icon name="user" size="sm" /> : name}
        {sort !== 'none' && <Icon name="arrow-up" size="sm" className={`head-arrow${sort === 'descending' ? ' desc' : ''}`} />}
        {filtered && <span className="head-dot" aria-hidden="true" />}
      </button>
      {movable && (
        <button type="button" className="head-more" aria-haspopup="menu" aria-expanded={open} aria-label={`${t('table.menu.open')} (${name})`} title={t('table.menu.open')}
          onClick={(event) => onOpen(event.currentTarget)}>
          <Icon name="caret" size="sm" />
        </button>
      )}
    </div>
  );
}
