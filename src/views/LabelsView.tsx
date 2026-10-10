import { useMemo, useRef, useState } from 'react';
import { useDndMonitor } from '@dnd-kit/core';
import { Icon } from '@/components/Icon';
import { useT } from '@/hooks/useT';
import { useData } from '@/hooks/useData';
import { useStore } from '@/store/store';
import { navigate } from '@/hooks/useRoute';
import { PageMenu } from '@/components/PageMenu';
import {
  TAG_DRAG_PREFIX, TAG_DROP_PREFIX, TAG_TOP_DROP_ID, useTagDrag, useTagTopDrop,
} from '@/components/dnd/DraggableTag';
import { rootItems } from '@/store/selectors';
import { hasLabel } from '@/domain/views';
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
  const updateLabelFavourite = useStore((s) => s.setLabelFavourite);
  const createLabel = useStore((s) => s.createLabel);
  const reorderLabels = useStore((s) => s.reorderLabels);
  const [draft, setDraft] = useState('');
  const { topDropRef, isTopOver } = useTagTopDrop();

  const roots = useMemo(() => rootItems(items), [items]);
  const countOf = (name: string) => roots.filter((i) => hasLabel(i, name)).length;

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
          {labels.length > 1 && <p className="psub">{t('labels.orderHint')}</p>}
        </div>
        {labels.length > 1 && (
          <div className="pactions">
            <PageMenu
              items={[
                {
                  key: 'az', label: t('labels.sortAz'), icon: 'sort',
                  onPick: () => void reorderLabels(
                    [...labels].sort((a, b) => a.name.localeCompare(b.name)).map((l) => l.id),
                  ),
                },
                {
                  key: 'count', label: t('labels.sortCount'), icon: 'sort',
                  onPick: () => void reorderLabels(
                    [...labels].sort((a, b) => countOf(b.name) - countOf(a.name) || a.name.localeCompare(b.name)).map((l) => l.id),
                  ),
                },
              ]}
            />
          </div>
        )}

      </div>

      {/* A tag is a name and nothing else, so making one is a line to type in
          rather than a dialog to open. Its colour and its star are set on the
          card it becomes, which is right there underneath. */}
      <form
        className="mode tagadd"
        onSubmit={(e) => {
          e.preventDefault();
          const name = draft.trim();
          if (!name) return;
          void createLabel(name);
          setDraft('');
        }}
      >
        <Icon name="tag" size="sm" />
        <input
          value={draft}
          placeholder={t('labels.newPlaceholder')}
          aria-label={t('nav.addTag')}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape') { setDraft(''); e.currentTarget.blur(); } }}
        />
        <button className="btn quiet" type="submit" disabled={!draft.trim()}>
          {t('nav.addTag')}
        </button>
      </form>

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
              count={roots.filter((i) => hasLabel(i, label.name)).length}
              onToggleFavourite={() => void updateLabelFavourite(label.id, !label.is_favorite)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TagRow({
  label, count, order, onToggleFavourite, shift,
}: {
  label: Label;
  /** How far the row has stepped aside, or moved, to show where the carried tag would land. */
  shift: number;
  count: number;
  /** The names of every row on the page, in the order they are drawn. */
  order: string[];
  onToggleFavourite: () => void;
}) {
  const { t } = useT();
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

      <button
        className={`tagcard-star${label.is_favorite ? ' on' : ''}`}
        aria-pressed={label.is_favorite}
        aria-label={label.is_favorite ? t('labels.unfavourite') : t('labels.favourite')}
        title={label.is_favorite ? t('labels.unfavourite') : t('labels.favourite')}
        onClick={onToggleFavourite}
      >
        <Icon name="star" />
      </button>
    </div>
  );
}
