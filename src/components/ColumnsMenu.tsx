import { createPortal } from 'react-dom';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Icon } from './Icon';
import { useT } from '@/hooks/useT';
import { tableColumnIcon, tableColumnLabel, tableColumnOrder, tableColumns, tableLayoutPatch } from '@/domain/table';
import type { TableColumn, ViewPrefs } from '@/domain/types';

/**
 * The columns of a table: one row in Display that opens a list at its side,
 * with a switch and a handle for every column, shown or not. The title is
 * always there, and moves like the others (a column can sit before it). A column switched off keeps its place in the
 * list, so switching it on again puts it back where it was. The handle never
 * toggles a column, and Alt with an arrow key moves one for whoever does not drag.
 */
export function ColumnsMenu({ value, onChange }: {
  value: ViewPrefs; onChange: (patch: Pick<ViewPrefs, 'tableColumns' | 'tableOrder'>) => void;
}) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<{ left: number; top: number } | null>(null);
  const order = tableColumnOrder(value);
  const shown = tableColumns(value);
  // A short distance before a drag starts, so pressing a row still means pressing it.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  /* Beside the panel the row belongs to, on the left like Todoist's, or on its right when the left has no room. */
  useLayoutEffect(() => {
    if (!open || !button.current) return;
    const row = button.current.getBoundingClientRect();
    const panel = (button.current.closest('.anchored-body, .displaypanel, .sheet') ?? button.current).getBoundingClientRect();
    const width = menu.current?.offsetWidth ?? 264;
    const height = menu.current?.offsetHeight ?? 360;
    const left = panel.left - width - 10 >= 8 ? panel.left - width - 10 : Math.min(panel.right + 10, window.innerWidth - width - 8);
    setPlace({ left, top: Math.max(8, Math.min(row.top - 10, window.innerHeight - height - 8)) });
  }, [open, order.length]);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!menu.current?.contains(target) && !button.current?.contains(target)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape, true);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape, true); };
  }, [open]);

  /** Saves a new order and which of its columns are on: the shown ones read in that same order. */
  const save = (next: TableColumn[], on: TableColumn[]) =>
    onChange(tableLayoutPatch(next, on));
  const on = shown;

  const move = (column: TableColumn, to: number) => {
    const from = order.indexOf(column);
    if (from >= 0 && to >= 0 && to < order.length && to !== from) save(arrayMove(order, from, to), on);
  };
  const toggle = (column: TableColumn) => column !== 'title' && save(order, on.includes(column) ? on.filter((one) => one !== column) : [...on, column]);
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) move(active.id as TableColumn, order.indexOf(over.id as TableColumn));
  };

  return (
    <div className="columnsrow">
      <button ref={button} type="button" className="fselect-face" aria-expanded={open} aria-haspopup="dialog"
        aria-label={t('table.columns')} onClick={() => setOpen((now) => !now)}>
        <Icon name="table" size="sm" /><span className="fselect-value">{t('table.columns')}</span>
        <Icon name="caret" size="sm" className="columns-caret" />
      </button>
      {open && createPortal(
        <div ref={menu} className="sidemenu" role="dialog" aria-label={t('table.columns')} onMouseDown={(event) => event.stopPropagation()}
          style={{ left: place?.left ?? -9999, top: place?.top ?? -9999 }}>
          <h5>{t('table.columns')}</h5>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={order} strategy={verticalListSortingStrategy}>
              {order.map((column) => (
                <ColumnRow key={column} column={column} checked={on.includes(column)} onToggle={() => toggle(column)}
                  onStep={(by) => move(column, order.indexOf(column) + by)} />
              ))}
            </SortableContext>
          </DndContext>
          <p className="colhint">{t('table.moveHint')}</p>
        </div>,
        document.body,
      )}
    </div>
  );
}

function ColumnRow({ column, checked, onToggle, onStep }: { column: TableColumn; checked: boolean; onToggle: () => void; onStep: (by: -1 | 1) => void }) {
  const { t } = useT();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: column });
  return (
    <div ref={setNodeRef} className={`colrow${isDragging ? ' dragging' : ''}${checked ? '' : ' off'}`} style={{ transform: CSS.Transform.toString(transform), transition }}>
      <button
        ref={setActivatorNodeRef} type="button" className="colgrip" {...attributes} {...listeners}
        aria-label={t('table.moveColumn', { name: t(tableColumnLabel[column]) })} title={t('table.moveHint')}
        onKeyDown={(event) => {
          if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
            event.preventDefault();
            onStep(event.key === 'ArrowUp' ? -1 : 1);
          }
        }}
      >
        <Icon name="drag" size="sm" />
      </button>
      <Icon name={tableColumnIcon[column]} size="sm" className="colicon" />
      <span className="collabel">{t(tableColumnLabel[column])}</span>
      <button type="button" className="switch" role="switch" aria-checked={checked} aria-label={t(tableColumnLabel[column])}
        disabled={column === 'title'} onClick={onToggle} />
    </div>
  );
}
