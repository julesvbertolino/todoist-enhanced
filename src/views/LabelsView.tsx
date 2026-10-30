import { HireNote } from '@/components/HireNote';
import { useMemo, useRef, useState } from 'react';
import { useDndMonitor } from '@dnd-kit/core';
import { Icon } from '@/components/Icon';
import { FavouriteStar } from '@/components/FavouriteStar';
import { useT } from '@/hooks/useT';
import { useData } from '@/hooks/useData';
import { useStore } from '@/store/store';
import { navigate } from '@/hooks/useRoute';
import { PageMenu } from '@/components/PageMenu';
import { TagSheet, type TagSheetTarget } from '@/components/overlays/TagSheet';
import { useConfirm } from '@/components/overlays/Confirm';
import { copyText, todoistLabelUrl } from '@/api/links';
import {
  TAG_DRAG_PREFIX, TAG_DROP_PREFIX, TAG_TOP_DROP_ID, useTagDrag, useTagTopDrop,
} from '@/components/dnd/DraggableTag';
import { labelRoots } from '@/store/selectors';
import { markerStyle } from '@/domain/colors';
import type { Label } from '@/domain/types';
import { byLabelOrder } from '@/domain/orderKey';

/**
 * Every tag on the account, in the order Todoist keeps them.
 *
 * Favourites are Todoist's own star, not a separate list this app keeps, so
 * starring here pins the tag in both products at once. The order is Todoist's
 * too: drag a tag and the sidebar's favourites follow.
 */
export function LabelsView() {
  const { t } = useT();
  const { snapshot, items } = useData();
  const [sheet, setSheet] = useState<TagSheetTarget>(null);
  const { topDropRef, isTopOver } = useTagTopDrop();

  const labels = useMemo(
    () =>
      Object.values(snapshot.labels)
        .filter((l) => !l.is_deleted && !l.name.startsWith('est-'))
        .sort(byLabelOrder),
    [snapshot.labels],
  );

  /* While a tag is carried the rows show the order it would leave: the others step aside and the dashed place
     it left moves to where it would land. Nothing is written until it is dropped. */
  const [carried, setCarried] = useState<{ name: string; over: string | null } | null>(null);
  const step = useRef(0);
  useDndMonitor({
    onDragStart({ active }) {
      const id = String(active.id);
      if (!id.startsWith(TAG_DRAG_PREFIX)) return;
      const rows = document.querySelectorAll<HTMLElement>('.taglist .tagcard');
      step.current = rows.length > 1 ? rows[1].offsetTop - rows[0].offsetTop : rows[0]?.offsetHeight ?? 0;
      setCarried({ name: id.slice(TAG_DRAG_PREFIX.length), over: null });
    },
    onDragOver({ active, over }) {
      const id = String(active.id);
      if (!id.startsWith(TAG_DRAG_PREFIX)) return;
      const target = over ? String(over.id) : '';
      setCarried({
        name: id.slice(TAG_DRAG_PREFIX.length),
        over: target === TAG_TOP_DROP_ID ? '' : target.startsWith(TAG_DROP_PREFIX) ? target.slice(TAG_DROP_PREFIX.length) : null,
      });
    },
    onDragEnd: () => setCarried(null),
    onDragCancel: () => setCarried(null),
  });
  const from = carried ? labels.findIndex((l) => l.name === carried.name) : -1;
  const to = carried && carried.over !== null
    ? (carried.over === '' ? 0 : labels.findIndex((l) => l.name === carried.over)) : -1;
  const shiftOf = (index: number): number => {
    if (from < 0 || to < 0 || from === to) return 0;
    if (index === from) return (to - from) * step.current;
    if (from < to && index > from && index <= to) return -step.current;
    if (from > to && index >= to && index < from) return step.current;
    return 0;
  };

  /* This list used to open a drag context of its own, on the grounds that a
     tag being reordered is not a task being filed. True, but the cost was
     that a tag could only ever be dropped inside this page: a nested context
     owns the pointer outright, so dragging a tag to the sidebar's Favourites
     reached nothing. It registers in the app's one context now, like the
     sidebar's projects and a project's sections already do, and the drop is
     read in `DragProvider` with every other drop.

     The order the rows are drawn in is handed over with them, because the
     provider reorders by position in a list and this is the list. */
  return (
    <div className="page">
      <div className="phead">
        <div className="phead-text">
          <h1 className="ptitle">{t('nav.labels')}</h1>
        </div>
        <div className="pactions">
          <button className="btn accent" onClick={() => setSheet({ mode: 'create' })}>
            <Icon name="plus" />
            {t('labels.new')}
          </button>
        </div>
      </div>
      <HireNote />

      {labels.length === 0 ? (
        <p className="empty">{t('labels.none')}</p>
      ) : (
        <div className="mode taglist">
          <div
            ref={topDropRef}
            className={`tagdrop-top${isTopOver ? ' over' : ''}`}
            aria-hidden="true"
          />
          {labels.map((label, index) => (
            <TagRow
              key={label.id}
              label={label}
              shift={shiftOf(index)}
              order={labels.map((l) => l.name)}
              count={labelRoots(items, label.name, snapshot).length}
              onEdit={() => setSheet({ mode: 'edit', labelId: label.id })}
            />
          ))}
        </div>
      )}
      <TagSheet target={sheet} onClose={() => setSheet(null)} />
    </div>
  );
}

function TagRow({
  label, count, order, onEdit, shift,
}: {
  label: Label;
  /** How far the row has stepped aside, or moved, to show where the carried tag would land. */
  shift: number;
  count: number;
  /** The names of every row on the page, in the order they are drawn. */
  order: string[];
  onEdit: () => void;
}) {
  const { t } = useT();
  const confirm = useConfirm();
  const toast = useStore((s) => s.toast);
  const setFavourite = useStore((s) => s.setLabelFavourite);
  const deleteLabel = useStore((s) => s.deleteLabel);
  const { grip, row, isDragging } = useTagDrag(label.name, order);

  return (
    <div
      ref={row}
      className={`tagcard${isDragging ? ' dragging' : ''}`}
      style={shift ? { transform: `translateY(${shift}px)` } : undefined}
    >
      <button
        className="tagcard-grip"
        aria-label={t('labels.reorder')}
        title={t('labels.reorder')}
        {...grip}
      >
        <Icon name="drag" size="sm" />
      </button>

      <button className="tagcard-open" onClick={() => navigate('label', label.name)}>
        <span className="tagcard-mark" style={markerStyle(label.color)}>
          <Icon name="tag" />
        </span>
        <span className="tagcard-text">
          <strong>{label.name}</strong>
          <small>{t('metrics.tasks', { count })}</small>
        </span>
      </button>

      <FavouriteStar on={label.is_favorite} onToggle={() => void setFavourite(label.id, !label.is_favorite)} />
      <PageMenu
        label={t('labels.actions')}
        items={[
          { key: 'edit', label: t('labels.edit'), icon: 'edit', onPick: onEdit },
          {
            key: 'fav', icon: 'star',
            label: label.is_favorite ? t('labels.unfavourite') : t('labels.favourite'),
            onPick: () => void setFavourite(label.id, !label.is_favorite),
          },
          {
            key: 'link', label: t('labels.copyLink'), icon: 'link',
            onPick: () => void copyText(todoistLabelUrl(label.id))
              .then((ok) => toast(t(ok ? 'task.linkCopied' : 'task.linkNotCopied'))),
          },
          {
            key: 'delete', label: t('labels.delete'), icon: 'trash', danger: true,
            onPick: () => void confirm({
              title: t('labels.deleteTitle', { name: label.name }),
              body: t('labels.deleteBody', { count }),
              confirmLabel: t('labels.delete'),
              destructive: true,
            }).then((yes) => { if (yes) void deleteLabel(label.id); }),
          },
        ]}
      />
    </div>
  );
}
