import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import { useAssigneeOptions } from './AssigneeFilter';
import { useT } from '@/hooks/useT';
import { useMenuKeys } from '@/hooks/useMenuKeys';
import { useDismissiblePopover } from '@/hooks/useDismissiblePopover';
import { useStore } from '@/store/store';
import { markerStyle } from '@/domain/colors';
import { neighbourColumn, stepTableColumn, tableColumnLabel, toggleTableColumn } from '@/domain/table';
import type { DisplayPriority, Item, TableColumn, ViewPrefs } from '@/domain/types';

/**
 * What a table heading's chevron opens (#335): the filter that belongs to the
 * column, a step to the left or right, and hiding it. Sorting is the heading
 * itself. It is the app's own floating menu, under the chevron.
 *
 * Only what works is offered. Priority, tags and assignee have filters; the
 * other columns have none yet, so their menu has no Filter section rather than
 * a control that does nothing. The Title has no menu: it cannot be moved or
 * hidden. Everything writes the view's own preferences, the same ones Display edits.
 */
export function TableHeaderMenu({ column, anchor, current, pageItems, onChange, onClose }: {
  column: TableColumn; anchor: HTMLElement; current: ViewPrefs; pageItems: Item[];
  onChange: (patch: Partial<ViewPrefs>) => void; onClose: () => void;
}) {
  const { t } = useT();
  const labels = useStore((s) => s.snapshot.labels);
  const filters = current.filters;
  const left = neighbourColumn(current, column, -1);
  const right = neighbourColumn(current, column, 1);
  const set = (patch: Partial<ViewPrefs>) => onChange(patch);
  const menu = useMenuKeys(true, onClose);
  const trigger = useRef<HTMLElement>(anchor);
  useDismissiblePopover(true, trigger, menu, onClose);
  /* Below the chevron, aligned to its right edge; above it when there is no room. */
  const [place, setPlace] = useState<{ top: number; left: number } | null>(null);
  useLayoutEffect(() => {
    const measure = () => {
      const box = anchor.getBoundingClientRect();
      const width = menu.current?.offsetWidth ?? 240;
      const height = menu.current?.offsetHeight ?? 240;
      const below = box.bottom + 6;
      const top = below + height + 8 <= window.innerHeight ? below : Math.max(8, box.top - height - 6);
      const left = Math.min(Math.max(8, box.right - width), window.innerWidth - width - 8);
      setPlace((now) => (now && now.top === top && now.left === left ? now : { top, left }));
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => { window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true); };
  }, [anchor, menu]);

  const assigneeOptions = useAssigneeOptions(filters.assignees ?? null);
  /* The tags the page has, plus any already chosen so a filter can always be turned off. */
  const tags = useMemo(() => {
    const used = new Set([...filters.labels, ...pageItems.flatMap((item) => item.labels)].map((name) => name.toLowerCase()));
    return Object.values(labels).filter((label) => !label.is_deleted && !label.name.startsWith('est-') && used.has(label.name.toLowerCase()));
  }, [labels, pageItems, filters.labels]);

  const choice = (key: string | number, checked: boolean, label: React.ReactNode, onClick: () => void) => (
    <button key={key} type="button" role="menuitemcheckbox" aria-checked={checked} className="opt tablemenu-check" onClick={onClick}>
      <span className={`check${checked ? ' on' : ''}`} aria-hidden="true"><Icon name="check" size="sm" /></span>
      <span className="tablemenu-label">{label}</span>
    </button>
  );

  let filter: React.ReactNode = null;
  let filtering = false;
  if (column === 'priority') {
    filtering = filters.priorities.length > 0;
    filter = ([1, 2, 3, 4] as DisplayPriority[]).map((p) => choice(p, filters.priorities.includes(p),
      <><Icon name="flag" size="sm" style={{ color: `var(--p${p})` }} /> P{p}</>,
      () => set({ filters: { ...filters, priorities: filters.priorities.includes(p) ? filters.priorities.filter((one) => one !== p) : [...filters.priorities, p].sort() } })));
  } else if (column === 'labels') {
    filtering = filters.labels.length > 0;
    filter = tags.length === 0 ? <p className="tablemenu-empty">{t('table.menu.noTags')}</p> : tags.map((label) => choice(label.name, filters.labels.includes(label.name),
      <><Icon name="tag" size="sm" className="taglabel" style={markerStyle(label.color, false)} /> {label.name}</>,
      () => set({ filters: { ...filters, labels: filters.labels.includes(label.name) ? filters.labels.filter((one) => one !== label.name) : [...filters.labels, label.name] } })));
  } else if (column === 'assignee') {
    /* null is everyone; a list is just those. Ticking the last unticked one is everyone again. */
    const all = assigneeOptions.map((option) => option.value);
    const chosen = filters.assignees ?? null;
    filtering = chosen !== null;
    filter = assigneeOptions.map((option) => choice(option.value, chosen === null || chosen.includes(option.value),
      <>{option.visual} {option.label}</>,
      () => {
        const base = chosen ?? all;
        const next = base.includes(option.value) ? base.filter((one) => one !== option.value) : [...base, option.value];
        set({ filters: { ...filters, assignees: all.every((id) => next.includes(id)) ? null : next } });
      }));
  }

  const clear = () => set({ filters: {
    ...filters,
    ...(column === 'priority' ? { priorities: [] } : column === 'labels' ? { labels: [] } : { assignees: null }),
  } });
  const act = (patch: Partial<ViewPrefs> | null) => { if (patch) { set(patch); onClose(); } };
  return createPortal(
    <div
      className="popover rowmenu tablemenu"
      role="menu"
      aria-label={t(tableColumnLabel[column])}
      ref={menu}
      style={place ? { top: place.top, left: place.left } : { opacity: 0, pointerEvents: 'none' }}
    >
      {filter && <>
        <div className="tablemenu-title">
          <h5>{t('table.menu.filter')}</h5>
          {filtering && <button type="button" className="tablemenu-clear" onClick={clear}>{t('table.menu.clearFilter')}</button>}
        </div>
        <div className="tablemenu-list">{filter}</div>
        <hr />
      </>}
      <button type="button" role="menuitem" className="opt" disabled={!left} onClick={() => act(stepTableColumn(current, column, -1))}>
        <span><Icon name="arrow-left" size="sm" /> {t('table.menu.moveLeft')}</span>
      </button>
      <button type="button" role="menuitem" className="opt" disabled={!right} onClick={() => act(stepTableColumn(current, column, 1))}>
        <span><Icon name="arrow-right" size="sm" /> {t('table.menu.moveRight')}</span>
      </button>
      <hr />
      <button type="button" role="menuitem" className="opt" onClick={() => act(toggleTableColumn(current, column))}>
        <span><Icon name="eye" size="sm" /> {t('table.menu.hide')}</span>
      </button>
    </div>,
    document.body,
  );
}
