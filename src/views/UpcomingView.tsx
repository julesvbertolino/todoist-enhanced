import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { SubtasksProvider } from '@/components/TaskRow';
import { DisplayMenu } from '@/components/DisplayMenu';
import { PageMenu } from '@/components/PageMenu';
import { TaskGroup } from '@/components/TaskGroup';
import { ModeSurface } from '@/components/ModeSurface';
import { Icon } from '@/components/Icon';
import { useT } from '@/hooks/useT';
import { useToday } from '@/hooks/useToday';
import type { TaskPlacement } from '@/domain/dnd';
import { useData } from '@/hooks/useData';
import { useStore } from '@/store/store';
import { viewPrefs } from '@/store/prefs';
import { applyFilters, datedRoots, sortItems } from '@/store/selectors';
import { upcomingItems } from '@/domain/views';
import type { GroupKey } from '@/domain/types';
import { summariseLoad } from '@/domain/load';
import { dueDate, daysBetween, formatRelativeDay, toApiDate } from '@/domain/dates';
import { addDays, startOfDay } from 'date-fns';

interface UpcomingViewProps {
  onOpen: (id: string) => void;
  onInsights: () => void;
  onUnestimated: () => void;
  onAddTaskTo: (placement: TaskPlacement) => void;
}

/** The groupings Upcoming offers: time only. */
const UPCOMING_GROUPS: GroupKey[] = ['day', 'week', 'month'];

/**
 * Upcoming — strictly future dates, fifteen days at a time.
 *
 * The day columns double as drop targets: moving a task between them is how a
 * date gets changed without opening anything.
 */
function UpcomingBody({ onOpen, onInsights, onUnestimated, onAddTaskTo }: UpcomingViewProps) {
  const { t, locale } = useT();
  const { snapshot, items, childrenOf } = useData();
  const prefs = useStore((s) => s.prefs);
  const setPrefs = useStore((s) => s.setPrefs);
  const current = viewPrefs(prefs, 'upcoming');
  /* Upcoming answers "when?", so it only groups by time: a day (the
     default), a week or a month. A grouping saved before this (project,
     priority, tag, none) reads as days (#98). */
  const group = UPCOMING_GROUPS.includes(current.group) ? current.group : 'day';
  const [horizon, setHorizon] = useState(prefs.upcomingHorizonDays);
  /* The day the columns and the filter both count from. It moves at midnight
     by itself, so the range never lags behind the tasks it lets in (#146). */
  const today = useToday();

  const scoped = useMemo(() => {
    const roots = datedRoots(items, snapshot);
    const future = upcomingItems(roots);
    const limit = startOfDay(addDays(today, horizon));
    const withinHorizon = future.filter((item) => {
      const d = dueDate(item);
      return d !== null && startOfDay(d) <= limit;
    });
    return applyFilters(withinHorizon, current.filters, snapshot, childrenOf);
  }, [items, today, horizon, current.filters, snapshot, childrenOf]);

  // Upcoming spans many days, so a single capacity percentage would be
  // meaningless here. The header shows counts and time only.
  const load = useMemo(
    () => summariseLoad(scoped, childrenOf, null),
    [scoped, childrenOf],
  );

  const byDay = useMemo(() => {
    const map = new Map<string, typeof scoped>();
    for (const item of scoped) {
      const d = dueDate(item);
      if (!d) continue;
      const key = toApiDate(d);
      const bucket = map.get(key);
      if (bucket) bucket.push(item);
      else map.set(key, [item]);
    }
    return map;
  }, [scoped]);

  const days = useMemo(
    () => daysBetween(startOfDay(addDays(today, 1)), startOfDay(addDays(today, horizon))),
    [today, horizon],
  );

  const columns = days
    .map((day) => ({
      id: toApiDate(day),
      title: formatRelativeDay(day, locale),
      items: sortItems(byDay.get(toApiDate(day)) ?? [], current.sort, childrenOf, 'day', snapshot, true),
      dropTarget: { kind: 'day' as const, date: day },
      capacityMinutes: prefs.dailyCapacity[day.getDay()],
    }))
    .filter((column) => column.items.length > 0 || current.mode === 'board');


  return (
    <div className="page">
      <PageHeader
        title={t('nav.upcoming')}
        actions={
          <>
            <DisplayMenu
              viewKey="upcoming"
              modes={['list', 'board']}
              groups={UPCOMING_GROUPS}
            />
            <button className="btn accent" onClick={onInsights}>
              <Icon name="trend" />
              {t('toolbar.insights')}
            </button>
            <PageMenu
              items={[7, 15, 30, 60].map((days) => ({
                key: `h${days}`,
                label: t('upcoming.horizon', { days }),
                checked: horizon === days,
                onPick: () => { setHorizon(days); setPrefs({ upcomingHorizonDays: days }); },
              }))}
            />
          </>
        }
        load={load}
        onOpenUnestimated={load.unestimatedCount > 0 ? onUnestimated : undefined}
      />


      {group !== 'day' ? (
        /* A week or a month is a span, not a date, so its column takes no
           drop: the day columns are where a date is changed by hand. */
        <ModeSurface
          items={scoped}
          childrenOf={childrenOf}
          mode={current.mode === 'board' ? 'board' : 'list'}
          group={group}
          sort={current.sort}
          order="day"
          onOpen={onOpen}
        />
      ) : current.mode === 'board' ? (
        <ModeSurface
          items={scoped}
          childrenOf={childrenOf}
          mode="board"
          group="day"
          sort={current.sort}
          order="day"
          onOpen={onOpen}
          boardColumns={columns}
        />
      ) : (
        <div className="mode">
          {columns.map((column) => (
            <TaskGroup
              key={column.id}
              title={column.title}
              items={column.items}
              childrenOf={childrenOf}
              onOpen={onOpen}
              reorderable="day"
              viewKey="upcoming"
              dropTarget={{ kind: 'day', date: new Date(`${column.id}T00:00:00`) }}
              onAddTask={() => onAddTaskTo({ date: column.id })}
            />
          ))}
          {scoped.length === 0 && <p className="empty">{t('task.noTasks')}</p>}
        </div>
      )}

      <div style={{ marginTop: 'var(--s5)', display: 'flex', justifyContent: 'center' }}>
        <button className="btn" onClick={() => setHorizon((h) => h + 15)}>
          <Icon name="caret" />
          {t('nav.upcoming')} +15
        </button>
      </div>
    </div>
  );
}

export function UpcomingView(props: UpcomingViewProps) {
  const prefs = useStore((s) => s.prefs);
  return (
    <SubtasksProvider value={viewPrefs(prefs, 'upcoming').filters.showSubtasks}>
      <UpcomingBody {...props} />
    </SubtasksProvider>
  );
}
