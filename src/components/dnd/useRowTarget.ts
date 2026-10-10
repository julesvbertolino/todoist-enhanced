import { useId, useState } from 'react';
import { useDndMonitor, useDroppable } from '@dnd-kit/core';
import { useStore } from '@/store/store';
import { canNest, planNestMany, rowTargetId } from '@/domain/dnd';
import { useRowList } from './RowList';

/**
 * Makes a task row somewhere another task can be dropped.
 *
 * The row answers to two gestures and says which one it is about to take: a
 * line at the seam for a task arriving in its place, the same line pushed in
 * to where a subtask starts for a task going inside it. Reordering is offered
 * wherever the list around the row keeps an order it can write — which is
 * every list but a board column — and a straight drag anywhere else passes
 * through to the group behind, which is still how a task is given a day.
 *
 * A row that cannot take the task stays a target but never lights up, and the
 * drop onto it does nothing: falling through to the group would file the task
 * somewhere nobody aimed.
 */
export function useRowTarget(itemId: string, { nestable }: { nestable: boolean }) {
  const instance = useId();
  const targetId = `${rowTargetId(itemId)}|${instance}`;
  const list = useRowList();
  const [landingBefore, setLandingBefore] = useState(false);
  useDndMonitor({ onDragMove(event) {
    if (event.over?.id !== targetId) return;
    const y = (event.activatorEvent as PointerEvent).clientY + event.delta.y;
    setLandingBefore(y < event.over.rect.top + event.over.rect.height / 2);
  } });
  const nesting = useStore((s) => s.nesting);
  const open = useStore((s) => (
    s.draggingTaskId !== null && s.draggingTaskId !== itemId
      && ((nestable && s.nesting) || (!s.nesting && (list !== null || (nestable && !!s.snapshot.items[s.draggingTaskId]?.parent_id))))
      && !(list?.closed && !s.nesting && !list.ids.includes(s.draggingTaskId))
  ));
  const ownParentSeam = useStore((s) => !landingBefore && !s.outdenting && !!s.draggingTaskId && s.snapshot.items[s.draggingTaskId]?.parent_id === itemId);
  const allowed = useStore((s) => (
    nestable && s.nesting && s.draggingTaskId !== null && s.draggingTaskId !== itemId
      /* A drag that carries a selection goes inside as a whole (#166). */
      && (s.selection.length > 1 && s.selection.includes(s.draggingTaskId)
        ? planNestMany(s.snapshot.items, s.selection, itemId).ok
        : canNest(s.snapshot.items, s.draggingTaskId, itemId))
  ));
  const { setNodeRef, isOver } = useDroppable({
    id: targetId,
    disabled: !open,
    /* Read back when the drop lands: the provider is given a row, and the row
       has to be able to say which list it was a row of. */
    data: { list },
  });

  return {
    setRowRef: setNodeRef,
    landingBefore,
    /** The task in flight would go inside this row. */
    nestOver: isOver && (allowed || ownParentSeam),
    /** The task in flight would land in this row's place. */
    landing: isOver && !nesting && !ownParentSeam && list !== null,
  };
}
