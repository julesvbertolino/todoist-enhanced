import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import { Icon, type IconName } from './Icon';
import { useT } from '@/hooks/useT';
import { useStore } from '@/store/store';
import type { TranslationKey } from '@/i18n';
import {
  moveSidebarEntry, toggleSidebarEntry, type SidebarEntry, type SidebarItemId, type SidebarNav,
} from '@/domain/sidebar';

/** What each entry is called and drawn as; the same pair the sidebar uses. */
export const ENTRY: Record<SidebarItemId, { icon: IconName; label: TranslationKey }> = {
  inbox: { icon: 'inbox', label: 'nav.inbox' },
  today: { icon: 'calendar', label: 'nav.today' },
  week: { icon: 'week', label: 'nav.week' },
  upcoming: { icon: 'upcoming', label: 'nav.upcoming' },
  someday: { icon: 'someday', label: 'nav.someday' },
  review: { icon: 'check', label: 'nav.review' },
  dashboard: { icon: 'trend', label: 'nav.dashboard' },
  logbook: { icon: 'tasks', label: 'insights.logbook' },
  matrix: { icon: 'dashboard', label: 'nav.matrix' },
  labels: { icon: 'tag', label: 'nav.labels' },
};

/**
 * The sidebar's entries as a list you arrange: tick one to show it, drag it to
 * move it. Two blocks, as the sidebar draws them; an entry moves within its
 * block. Hiding an entry only takes it off the sidebar — its page stays
 * reachable from the search palette.
 */
export function SidebarNavEditor({
  nav, onChange,
}: { nav: SidebarNav; onChange: (next: SidebarNav) => void }) {
  const { t } = useT();
  const setPrefs = useStore((s) => s.setPrefs);
  const split = useStore((s) => s.prefs.weekLayout === 'split');
  const matrixOn = useStore((s) => s.prefs.eisenhowerEnabled);
  // The matrix page only exists while Eisenhower is on, so ticking its entry
  // here turns the page on too; otherwise the tick would do nothing.
  const change = (next: SidebarNav) => {
    const matrixOn = [...next.main, ...next.other].some((e) => e.id === 'matrix' && e.on);
    if (matrixOn && !useStore.getState().prefs.eisenhowerEnabled) setPrefs({ eisenhowerEnabled: true });
    onChange(next);
  };
  return (
    <div className="navedit">
      <h3 className="navedit-title">{t('settings.sidebarNavigation')}</h3>
      <Block block="main" entries={nav.main} nav={nav} onChange={change} split={split} matrixOn={matrixOn} />
      <h3 className="navedit-title">{t('settings.sidebarOther')}</h3>
      <Block block="other" entries={nav.other} nav={nav} onChange={change} split={split} matrixOn={matrixOn} />
    </div>
  );
}

function Block({
  block, entries, nav, onChange, split, matrixOn,
}: {
  split: boolean;
  matrixOn: boolean;
  block: keyof SidebarNav;
  entries: SidebarEntry[];
  nav: SidebarNav;
  onChange: (next: SidebarNav) => void;
}) {
  // A small distance before a drag starts, so a click on the tick is a click.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const to = entries.findIndex((e) => e.id === over.id);
    if (to >= 0) onChange(moveSidebarEntry(nav, block, active.id as SidebarItemId, to));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={entries.map((e) => e.id)} strategy={verticalListSortingStrategy}>
        <ul className="navedit-list">
          {entries.map((entry) => (
            <EntryRow
              key={entry.id}
              entry={entry}
              shown={entry.id === 'today' ? entry.on && split : entry.id === 'matrix' ? entry.on && matrixOn : entry.on}
              onToggle={() => {
                // Today is a page only while the week is split from it, so its tick is
                // that setting: ticking it splits the week, unticking merges it back.
                if (entry.id === 'today') {
                  const { setPrefs } = useStore.getState();
                  if (entry.on && split) setPrefs({ weekLayout: 'unified' });
                  else {
                    setPrefs({ weekLayout: 'split' });
                    if (!entry.on) onChange(toggleSidebarEntry(nav, entry.id));
                  }
                  return;
                }
                // Same for the matrix: its page only exists while Eisenhower is on.
                if (entry.id === 'matrix') {
                  const { setPrefs } = useStore.getState();
                  if (entry.on && matrixOn) setPrefs({ eisenhowerEnabled: false });
                  else {
                    setPrefs({ eisenhowerEnabled: true });
                    if (!entry.on) onChange(toggleSidebarEntry(nav, entry.id));
                  }
                  return;
                }
                onChange(toggleSidebarEntry(nav, entry.id));
              }}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function EntryRow({ entry, shown, onToggle }: { entry: SidebarEntry; shown: boolean; onToggle: () => void }) {
  const { t } = useT();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entry.id });
  const { icon, label } = ENTRY[entry.id];
  return (
    <li
      ref={setNodeRef}
      className={`navedit-row${isDragging ? ' dragging' : ''}${shown ? '' : ' off'}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <button
        type="button"
        className="navedit-grip"
        aria-label={t('settings.sidebarMove', { name: t(label) })}
        {...attributes}
        {...listeners}
      >
        <Icon name="drag" size="sm" />
      </button>
      <label className="navedit-label checkboxwrap">
        <input type="checkbox" checked={shown} onChange={onToggle} />
        <span className="checkbox" aria-hidden="true"><Icon name="check" size="sm" /></span>
        <Icon name={icon} size="sm" />
        <span>{t(label)}</span>
      </label>
    </li>
  );
}

/**
 * The sidebar's project groups as a list you arrange, the same gesture as the
 * navigation above it: drag a row by its grip and the others part to make room.
 */
export function GroupOrderEditor({
  groups, onChange,
}: {
  groups: Array<{ id: string; name: string }>;
  onChange: (ids: string[]) => void;
}) {
  const { t } = useT();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const ids = groups.map((g) => g.id);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    ids.splice(to, 0, ...ids.splice(from, 1));
    onChange(ids);
  };
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={groups.map((g) => g.id)} strategy={verticalListSortingStrategy}>
        <ul className="navedit-list">
          {groups.map((group) => <GroupRow key={group.id} id={group.id} name={group.name} label={t('settings.sidebarMove', { name: group.name })} />)}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function GroupRow({ id, name, label }: { id: string; name: string; label: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <li
      ref={setNodeRef}
      className={`navedit-row${isDragging ? ' dragging' : ''}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <button type="button" className="navedit-grip" aria-label={label} {...attributes} {...listeners}>
        <Icon name="drag" size="sm" />
      </button>
      <span className="navedit-label"><span>{name}</span></span>
    </li>
  );
}
