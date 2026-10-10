import { useLayoutEffect, useRef, useMemo, useState, type ReactNode } from 'react';
import {
  DndContext, DragOverlay, KeyboardSensor, MeasuringStrategy, PointerSensor, closestCenter, useSensor, useSensors,
  type DragEndEvent, type DragOverEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { restrictToParentElement } from '@dnd-kit/modifiers';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { Icon } from './Icon';
import { useT } from '@/hooks/useT';
import {
  dashboardGroupOf, fillRows, type DashboardCardId, type DashboardGroup,
} from '@/domain/dashboard';

/** A card of the dashboard: what it is called, how wide it wants to be, and what is in it. */
export interface DashboardCardSpec {
  id: DashboardCardId;
  /** Named in the controls and in what a screen reader is told. */
  name: string;
  /** Columns of twelve it asks for. */
  span: number;
  className?: string;
  children: ReactNode;
}

interface DashboardGridProps {
  /** Every card to draw, already in the order to draw them in. */
  cards: DashboardCardSpec[];
  /** The headings of the two sections, which cards never leave. */
  headings: Record<DashboardGroup, string>;
  /** Whether the layout is being edited: arrows show only then. */
  editing: boolean;
  /** A card asked to be at `toIndex` among the cards drawn of its own section. */
  onMove: (id: DashboardCardId, toIndex: number, visible: DashboardCardId[]) => void;
}

/**
 * The dashboard's cards, in the order the person arranged.
 *
 * Outside editing the cards are plain: nothing to press that was not there
 * before. In editing each one carries a pair of
 * arrows, so the same move is open to a pointer and to a keyboard, and each
 * move is said aloud. Cards stay in the section they belong to, so the two
 * headings stay true, and each card keeps the width appropriate to its period.
 */
export function DashboardGrid({ cards, headings, editing, onMove }: DashboardGridProps) {
  const { t } = useT();
  const [announcement, setAnnouncement] = useState('');
  const grid = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const node = grid.current;
    if (!node) return;
    const align = () => {
      const cards = [...node.querySelectorAll<HTMLElement>('.card')];
      cards.forEach((card) => card.style.removeProperty('--dashboard-heading-height'));
      const rows = new Map<number, Array<{ card: HTMLElement; height: number }>>();
      cards.forEach((card) => {
        const heading = card.querySelector<HTMLElement>('.chead-row');
        if (!heading) return;
        const top = Math.round(card.offsetTop);
        const row = rows.get(top) ?? [];
        row.push({ card, height: heading.getBoundingClientRect().height });
        rows.set(top, row);
      });
      rows.forEach((row) => {
        const height = Math.max(...row.map((entry) => entry.height));
        row.forEach(({ card }) => card.style.setProperty('--dashboard-heading-height', `${height}px`));
      });
    };
    align();
    window.addEventListener('resize', align);
    return () => window.removeEventListener('resize', align);
  }, [cards, editing]);

  /* While a card is held, the cards are laid out as they would be if it were dropped where the pointer is:
     the others do not slide by a transform, they simply take their new places, and nothing is written until
     the card is let go. */
  const [live, setLive] = useState<{ group: DashboardGroup; ids: DashboardCardId[]; active: DashboardCardId } | null>(null);

  const groups = useMemo(() => (['summary', 'activity'] as const).map((group) => {
    const stored = cards.filter((card) => dashboardGroupOf(card.id) === group);
    const own = live && live.group === group
      ? live.ids.map((id) => stored.find((card) => card.id === id)).filter((card): card is DashboardCardSpec => Boolean(card))
      : stored;
    const spans = fillRows(own.map((card) => card.span));
    return { group, own, spans, stored };
  }), [cards, live]);

  /* Where a card is in the order that is stored, not in the one a held card is showing. */
  const position = (id: DashboardCardId) => {
    const own = groups.find((entry) => entry.stored.some((card) => card.id === id));
    return { at: own?.stored.findIndex((card) => card.id === id) ?? 0, count: own?.stored.length ?? 0, own };
  };
  /* The same gesture as everywhere else: grab a card by its grip and the others part to make room. */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const nameOf = (id: DashboardCardId) => cards.find((card) => card.id === id)?.name ?? '';

  const move = (id: DashboardCardId, toIndex: number) => {
    const { own } = position(id);
    if (!own) return;
    onMove(id, toIndex, own.stored.map((card) => card.id));
    const clamped = Math.max(0, Math.min(own.stored.length - 1, toIndex));
    setAnnouncement(t('dashboard.moved', { name: nameOf(id), position: clamped + 1, count: own.stored.length }));
  };

  return (
    <>
      <div ref={grid} className="bento dashboard-bento" data-editing={editing || undefined}>
        {groups.map(({ group, own, spans, stored }) => own.length > 0 && (
          <SectionOfCards key={group}>
            <h2 className="dashboard-group-label">{headings[group]}</h2>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
              /* Never the page's own sideways scroll: a card held near the right edge used to carry the whole page with it. */
              autoScroll={{ threshold: { x: 0, y: 0.2 } }}
              modifiers={[restrictToParentElement]}
              onDragStart={({ active }: DragStartEvent) => setLive({
                group, ids: stored.map((card) => card.id), active: active.id as DashboardCardId,
              })}
              onDragOver={({ active, over }: DragOverEvent) => {
                if (!over || active.id === over.id) return;
                setLive((now) => {
                  if (!now) return now;
                  const from = now.ids.indexOf(active.id as DashboardCardId);
                  const to = now.ids.indexOf(over.id as DashboardCardId);
                  return from < 0 || to < 0 ? now : { ...now, ids: arrayMove(now.ids, from, to) };
                });
              }}
              onDragEnd={({ active }: DragEndEvent) => {
                const final = live?.ids ?? [];
                setLive(null);
                const to = final.indexOf(active.id as DashboardCardId);
                const from = stored.findIndex((card) => card.id === active.id);
                if (to >= 0 && from >= 0 && to !== from) move(active.id as DashboardCardId, to);
              }}
              onDragCancel={() => setLive(null)}
            >
              <SortableContext items={own.map((card) => card.id)} strategy={() => null}>
                {own.map((card, index) => (
                  <DashboardCard
                    key={card.id}
                    card={card}
                    span={spans[index]}
                    editing={editing}
                    index={index}
                    count={own.length}
                    onMove={move}
                  />
                ))}
              </SortableContext>
              <DragOverlay dropAnimation={null}>
                {live && live.group === group && (() => {
                  const card = own.find((entry) => entry.id === live.active);
                  const at = own.findIndex((entry) => entry.id === live.active);
                  return card ? (
                    <section className={`card w${spans[at]}${card.className ? ` ${card.className}` : ''} editing carried`}>
                      <div className="dashboard-card-content">{card.children}</div>
                    </section>
                  ) : null;
                })()}
              </DragOverlay>
            </DndContext>
          </SectionOfCards>
        ))}
      </div>
      <div className="sr" role="status" aria-live="polite">{announcement}</div>
    </>
  );
}

/** A fragment with a name: the grid's children are the headings and the cards themselves. */
function SectionOfCards({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

interface DashboardCardProps {
  card: DashboardCardSpec;
  span: number;
  editing: boolean;
  index: number;
  count: number;
  onMove: (id: DashboardCardId, toIndex: number) => void;
}

function DashboardCard({ card, span, editing, index, count, onMove }: DashboardCardProps) {
  const { t } = useT();
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({
    id: card.id, disabled: !editing,
  });

  return (
    <section
      ref={setNodeRef}
      className={`card w${span}${card.className ? ` ${card.className}` : ''}${editing ? ' editing' : ''}${isDragging ? ' lifted' : ''}`}
      data-card={card.id}
    >
      {editing && (
        <div className="dash-edit">
          <button
            className="iconbtn dash-grip"
            aria-label={`${t('task.drag')}: ${card.name}`}
            title={t('task.drag')}
            {...attributes}
            {...listeners}
          >
            <Icon name="drag" size="sm" />
          </button>
          <button
            className="iconbtn"
            aria-label={t('dashboard.moveEarlier', { name: card.name })}
            title={t('dashboard.moveEarlier', { name: card.name })}
            disabled={index === 0}
            onClick={() => onMove(card.id, index - 1)}
          >
            <Icon name="caret-up" size="sm" />
          </button>
          <button
            className="iconbtn"
            aria-label={t('dashboard.moveLater', { name: card.name })}
            title={t('dashboard.moveLater', { name: card.name })}
            disabled={index === count - 1}
            onClick={() => onMove(card.id, index + 1)}
          >
            <Icon name="caret" size="sm" />
          </button>
        </div>
      )}
      <div className="dashboard-card-content">{card.children}</div>
    </section>
  );
}
