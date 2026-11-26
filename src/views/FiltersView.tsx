import { SurveyBanner } from '@/components/SurveyBanner';
import { HireNote } from '@/components/HireNote';
import { useMemo, useState } from 'react';
import { DndContext, PointerSensor, KeyboardSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import { Icon } from '@/components/Icon';
import { FavouriteStar } from '@/components/FavouriteStar';
import { FilterMark } from '@/components/FilterMark';
import { FilterMenu } from '@/components/FilterHeader';
import { FilterSheet, type FilterSheetTarget } from '@/components/overlays/FilterSheet';
import { useT } from '@/hooks/useT';
import { useData } from '@/hooks/useData';
import { useFilterCounts } from '@/hooks/useFilterResult';
import { useStore } from '@/store/store';
import { navigate } from '@/hooks/useRoute';
import { markerStyle } from '@/domain/colors';
import { byLabelOrder } from '@/domain/orderKey';
import type { Filter } from '@/domain/types';

/**
 * Every saved filter on the account, in the order Todoist keeps them.
 *
 * Everything here is Todoist's own: the star pins a filter in the sidebar of
 * both apps, the order is the one Todoist shows, and a filter made or changed
 * here is made or changed there.
 *
 * The list has a drag context of its own. A filter has nowhere to go but
 * another place in this list, so it does not need the app's shared one.
 */
export function FiltersView() {
  const { t } = useT();
  const { snapshot } = useData();
  const reorderFilters = useStore((s) => s.reorderFilters);
  const [sheet, setSheet] = useState<FilterSheetTarget>(null);

  const filters = useMemo(
    () => Object.values(snapshot.filters ?? {}).filter((f) => !f.is_deleted).sort(byLabelOrder),
    [snapshot.filters],
  );
  const counts = useFilterCounts(filters);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const ids = filters.map((f) => f.id);
    const next = arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
    void reorderFilters(next, String(active.id));
  };

  return (
    <div className="page">
      <div className="phead">
        <div className="phead-text">
          <h1 className="ptitle">{t('nav.filters')}</h1>
        </div>
        <div className="pactions">
          <button className="btn accent" onClick={() => setSheet({ mode: 'create' })}>
            <Icon name="plus" />
            {t('filters.new')}
          </button>
        </div>
      </div>
      <HireNote />
      <SurveyBanner />

      {filters.length === 0 ? (
        <p className="empty">{t('filters.none')}</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={onDragEnd}>
          <SortableContext items={filters.map((f) => f.id)} strategy={verticalListSortingStrategy}>
            <div className="mode taglist">
              {filters.map((filter) => (
                <FilterRow
                  key={filter.id}
                  filter={filter}
                  count={counts[filter.id]}
                  onEdit={() => setSheet({ mode: 'edit', filterId: filter.id })}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <FilterSheet target={sheet} onClose={() => setSheet(null)} />
    </div>
  );
}

function FilterRow({
  filter, count, onEdit,
}: {
  filter: Filter;
  count: number | undefined;
  onEdit: () => void;
}) {
  const { t } = useT();

  const setFilterFavourite = useStore((s) => s.setFilterFavourite);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: filter.id });

  return (
    <div
      ref={setNodeRef}
      className={`tagcard${isDragging ? ' dragging' : ''}`}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      <button
        className="tagcard-grip"
        aria-label={t('labels.reorder')}
        title={t('labels.reorder')}
        {...attributes}
        {...listeners}
      >
        <Icon name="drag" size="sm" />
      </button>

      <button className="tagcard-open" onClick={() => navigate('filter', filter.id)}>
        <span className="tagcard-mark" style={markerStyle(filter.color)}>
          <FilterMark filter={filter} />
        </span>
        <span className="tagcard-text">
          <strong>{filter.name}</strong>
          <small className="filtercard-query">
            {count !== undefined && <>{t('metrics.tasks', { count })} · </>}
            {filter.query}
          </small>
        </span>
      </button>

      <FavouriteStar on={filter.is_favorite} onToggle={() => void setFilterFavourite(filter.id, !filter.is_favorite)} />
      <FilterMenu filter={filter} onEdit={onEdit} />
    </div>
  );
}
