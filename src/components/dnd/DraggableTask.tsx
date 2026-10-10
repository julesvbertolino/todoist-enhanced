import { useDraggable } from '@dnd-kit/core';
import { TaskRow } from '../TaskRow';
import { dragClock } from './DragProvider';
import type { Item } from '@/domain/types';

interface DraggableTaskProps {
  item: Item;
  childrenOf: (id: string) => Item[];
  onOpen: (id: string) => void;
  showProject?: boolean;
  showSection?: boolean;
  dust?: boolean;
  /**
   * `row` is picked up by its handle; `card` by any point of its surface.
   * A board card has no gutter for a handle, and a board is dragged by the
   * card everywhere else people have used one.
   */
  surface?: 'row' | 'card';
}

/**
 * A task row that can be picked up.
 *
 * In a list only the handle starts a drag, so the row itself stays clickable
 * and the list stays scrollable on touch. The sensor's distance threshold
 * keeps a plain click on a card from starting a drag too.
 */
export function DraggableTask({
  item, childrenOf, onOpen, showProject, showSection, dust, surface = 'row',
}: DraggableTaskProps) {
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({ id: item.id });
  const card = surface === 'card';

  return (
    <div
      ref={setNodeRef}
      className={`taskwrap${isDragging ? ' dragging' : ''}`}
      {...(card ? listeners : {})}
      /* A drop that lands on the card it left fires a click on that card, and
         the click would open the task the drag was meant to leave alone. */
      onClickCapture={card ? (e) => { if (dragClock.justEnded()) e.stopPropagation(); } : undefined}
    >
      <TaskRow
        item={item}
        childrenOf={childrenOf}
        onOpen={onOpen}
        showProject={showProject}
        showSection={showSection}
        dust={dust}
        dragHandleProps={{ ...attributes, ...listeners }}
        /* A board card is moved sideways between columns all the time; a
           drift to the right there must not read as "put it inside". */
        nestable={!card}
        lifted={isDragging}
      />
    </div>
  );
}
