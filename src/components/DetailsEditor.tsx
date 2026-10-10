import {
  DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, rectSortingStrategy, useSortable, type SortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Icon, type IconName } from './Icon';
import { useT } from '@/hooks/useT';
import { useStore } from '@/store/store';
import type { TranslationKey } from '@/i18n';
import {
  moveDetailChip, type DetailChip, type TaskField,
} from '@/domain/taskDetails';

/**
 * The grid strategy, minus its scaling. It stretches a chip to the width of
 * the one it is taking the place of, which on chips of different widths reads
 * as every one of them wobbling while another is carried.
 */
const chipStrategy: SortingStrategy = (args) => {
  const move = rectSortingStrategy(args);
  return move ? { ...move, scaleX: 1, scaleY: 1 } : null;
};

const FIELD: Record<TaskField, { icon: IconName; label: TranslationKey }> = {
  description: { icon: 'list', label: 'details.description' },
  date: { icon: 'calendar', label: 'details.date' },
  deadline: { icon: 'deadline', label: 'details.deadline' },
  project: { icon: 'project', label: 'details.project' },
  labels: { icon: 'tag', label: 'details.labels' },
  estimate: { icon: 'clock', label: 'details.estimate' },
  priority: { icon: 'flag', label: 'details.priority' },
};

/**
 * What a task row shows, as chips you switch on and off — and, for the five
 * between the description and the priority colour, drag into the order you
 * read them in. The same setting everywhere a row is drawn, so it is one
 * component for the Display menu and the first run alike.
 */
export function DetailsEditor() {
  const { t } = useT();
  const fields = useStore((s) => s.prefs.taskFields);
  const order = useStore((s) => s.prefs.detailOrder);
  const setPrefs = useStore((s) => s.setPrefs);

  // A short distance before a drag starts, so pressing a chip still switches it.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const toggle = (field: TaskField) => setPrefs({ taskFields: { ...fields, [field]: !fields[field] } });

  /* The keyboard's way to move a chip: Alt and an arrow. The drag library's own
     keyboard mode loses its place in a row that wraps. */
  const step = (chip: DetailChip, by: -1 | 1) => {
    const to = order.indexOf(chip) + by;
    if (to >= 0 && to < order.length) setPrefs({ detailOrder: moveDetailChip(order, chip, to) });
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const to = order.indexOf(over.id as DetailChip);
    if (to >= 0) setPrefs({ detailOrder: moveDetailChip(order, active.id as DetailChip, to) });
  };

  return (
    <div className="detailschips" role="group" aria-label={t('details.title')}>
      <FixedChip field="description" on={fields.description} onToggle={toggle} />
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={order} strategy={chipStrategy}>
          {order.map((chip) => (
            <MovableChip key={chip} chip={chip} on={fields[chip]} onToggle={toggle} onStep={step} />
          ))}
        </SortableContext>
      </DndContext>
      <FixedChip field="priority" on={fields.priority} onToggle={toggle} />
      <small className="mhint">{t('details.moveHint')}</small>
    </div>
  );
}

function FixedChip({ field, on, onToggle }: { field: TaskField; on: boolean; onToggle: (f: TaskField) => void }) {
  const { t } = useT();
  const { icon, label } = FIELD[field];
  return (
    <button type="button" className="chip" aria-pressed={on} onClick={() => onToggle(field)}>
      <Icon name={icon} size="sm" />
      {t(label)}
    </button>
  );
}

function MovableChip({
  chip, on, onToggle, onStep,
}: { chip: DetailChip; on: boolean; onToggle: (f: TaskField) => void; onStep: (chip: DetailChip, by: -1 | 1) => void }) {
  const { t } = useT();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: chip });
  const { icon, label } = FIELD[chip];
  return (
    <button
      ref={setNodeRef}
      type="button"
      {...attributes}
      {...listeners}
      className={`chip movable${isDragging ? ' dragging' : ''}`}
      aria-pressed={on}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      title={t('details.moveHint')}
      onClick={() => onToggle(chip)}
      onKeyDown={(event) => {
        if (event.altKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
          event.preventDefault();
          onStep(chip, event.key === 'ArrowLeft' ? -1 : 1);
        }
      }}
    >
      <Icon name="drag" size="sm" className="chipgrip" />
      <Icon name={icon} size="sm" />
      {t(label)}
    </button>
  );
}
