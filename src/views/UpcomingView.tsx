import { CalendarSurface } from '@/components/CalendarSurface';
import { pageClass } from '@/domain/pageLayout';
import { InsightsButton } from '@/components/InsightsButton';
import { HireNote } from '@/components/HireNote';
import { useMemo, useState, type ReactNode } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { SubtasksProvider } from '@/components/TaskRow';
import { DisplayMenu } from '@/components/DisplayMenu';
import { PomodoroButton } from '@/components/PomodoroButton';
import { PageMenu } from '@/components/PageMenu';
import { TaskGroup } from '@/components/TaskGroup';
import { ModeSurface } from '@/components/ModeSurface';
import { TableSurface } from '@/components/TableSurface';
import { Icon } from '@/components/Icon';
import { useT } from '@/hooks/useT';
import { useConfirm } from '@/components/overlays/Confirm';
import { dueForDate } from '@/domain/recurrence';
import { weekLabel } from '@/domain/types';
import { useToday } from '@/hooks/useToday';
import type { DropTarget, TaskPlacement } from '@/domain/dnd';
import { useData } from '@/hooks/useData';
import { useStore } from '@/store/store';
import { viewPrefs } from '@/store/prefs';
import { applyFilters, datedRoots, sortItems } from '@/store/selectors';
import { bucketOf } from '@/domain/views';
import { projectOccurrences } from '@/domain/projectOccurrences';
import type { GroupKey } from '@/domain/types';
import { summariseLoad } from '@/domain/load';
import { deadlineDate, dueDate, daysBetween, formatDayHeading, toApiDate } from '@/domain/dates';
import { addDays, differenceInCalendarWeeks, startOfDay, startOfMonth, startOfWeek } from 'date-fns';
import { intlDate } from '@/lib/intl';

interface UpcomingViewProps {
  onOpen: (id: string) => void;
  onInsights: () => void;
  onUnestimated: (items?: import('@/domain/types').Item[]) => void;
  onAddTaskTo: (placement: TaskPlacement) => void;
}

/** The groupings Upcoming offers: time only. */
const UPCOMING_GROUPS: GroupKey[] = ['day', 'week', 'month'];

/**
 * Upcoming — overdue and today, followed by future dates fifteen days at a time.
 *
 * The day columns double as drop targets: moving a task between them is how a
 * date gets changed without opening anything.
 */
function UpcomingBody({ onOpen, onInsights, onUnestimated, onAddTaskTo }: UpcomingViewProps) {
  const { t, locale } = useT();
  const { snapshot, items, childrenOf: sourceChildrenOf } = useData('upcoming');
  const prefs = useStore((s) => s.prefs);
  const setPrefs = useStore((s) => s.setPrefs);
  const updateMany = useStore((s) => s.updateMany);
  const confirm = useConfirm();
  const current = viewPrefs(prefs, 'upcoming');
  const hireNoteOpen = useStore((s) => s.hireNote);
  /* Upcoming answers "when?", so it only groups by time: a day (the
     default), a week or a month. A grouping saved before this (project,
     priority, tag, none) reads as days (#98). */
  const group = UPCOMING_GROUPS.includes(current.group) ? current.group : 'day';
  const [horizons, setHorizons] = useState({ day: prefs.upcomingHorizonDays, week: 28, month: 90 });
  const horizon = horizons[group as 'day' | 'week' | 'month'];
  const setHorizon = (days: number) => {
    setHorizons((previous) => ({ ...previous, [group]: days }));
    if (group === 'day') setPrefs({ upcomingHorizonDays: days });
  };
  /* The day the columns and the filter both count from. It moves at midnight
     by itself, so the range never lags behind the tasks it lets in (#146). */
  const today = useToday();

  const forecasts = useMemo(() => projectOccurrences(datedRoots(items, snapshot, 'none', { subtasks: current.filters.showSubtasks }), addDays(today, 1), startOfDay(addDays(today, horizon))), [items, today, horizon, snapshot, current.filters.showSubtasks]);
  const candidates = useMemo(() => datedRoots(items, snapshot, 'none', { subtasks: current.filters.showSubtasks }), [items, snapshot, current.filters.showSubtasks]);
  const early = useMemo(() => candidates.filter((item) => {
    const bucket = bucketOf(item, today);
    return bucket === 'overdue' || bucket === 'today';
  }), [candidates, today]);
  const futurePool = useMemo(() => {
    const from = startOfDay(addDays(today, 1)), until = startOfDay(addDays(today, horizon));
    const futureDeadlines = candidates.filter((item) => {
      const day = deadlineDate(item);
      return day && day >= from && day <= until;
    });
    return [...new Map([...forecasts.items, ...futureDeadlines].map((item) => [item.id, item])).values()];
  }, [forecasts.items, candidates, today, horizon]);
  const pool = useMemo(() => [...new Map([...early, ...futurePool].map((item) => [item.id, item])).values()], [early, futurePool]);
  const sources = useMemo(() => new Map(pool.filter((item) => item.projection).map((item) => [item.id, item.projection!.sourceId])), [pool]);
  const childrenOf = useMemo(() => (id: string) => sourceChildrenOf(sources.get(id) ?? id), [sources, sourceChildrenOf]);
  const scoped = useMemo(
    () => applyFilters(pool, { ...current.filters, includeScheduled: true }, snapshot, childrenOf),
    [pool, current.filters, snapshot, childrenOf],
  );

  const futureScoped = useMemo(() => applyFilters(futurePool, { ...current.filters, includeScheduled: true }, snapshot, childrenOf), [futurePool, current.filters, snapshot, childrenOf]);
  const earlyScoped = useMemo(() => applyFilters(early, { ...current.filters, includeScheduled: true }, snapshot, childrenOf), [early, current.filters, snapshot, childrenOf]);
  const overdue = earlyScoped.filter((item) => bucketOf(item, today) === 'overdue');
  const dueToday = earlyScoped.filter((item) => bucketOf(item, today) === 'today');

  async function rescheduleOverdue() {
    if (overdue.length === 0) return;
    const ok = await confirm({ title: t('group.rescheduleAll'), body: t('task.rescheduleAllConfirm', { count: overdue.length }), confirmLabel: t('group.rescheduleAll') });
    if (!ok) return;
    const target = toApiDate(today);
    const week = weekLabel().toLowerCase();
    await updateMany(overdue.map((item) => item.id), (item) => ({ due: dueForDate(item.due, target), labels: item.labels.filter((label) => label.toLowerCase() !== week) }), t('task.rescheduledMany', { count: overdue.length }));
  }
  const lateAction = <button className="reschedule-overdue" aria-label={t('group.rescheduleAll')} title={t('group.rescheduleAll')} onClick={() => void rescheduleOverdue()}><Icon name="calendar" size="sm" /></button>;
  const sorted = (list: typeof scoped) => sortItems(list, current.sort, childrenOf, 'day', snapshot, true, prefs.workspaceOrder);
  const leadingGroups = [
    ...(overdue.length ? [{ id: 'overdue', title: t('group.overdue'), items: sorted(overdue), action: lateAction, accent: 'late' as const }] : []),
    { id: toApiDate(today), title: formatDayHeading(today, locale), items: sorted(dueToday) },
  ];

  // Upcoming spans many days, so a single capacity percentage would be
  // meaningless here. The header shows counts and time only.
  const load = useMemo(
    () => summariseLoad(scoped, childrenOf, null),
    [scoped, childrenOf],
  );

  const byDay = useMemo(() => {
    const map = new Map<string, typeof scoped>();
    for (const item of futureScoped) {
      const dates = [dueDate(item), item.projection ? null : deadlineDate(item)];
      for (const key of new Set(dates.filter((d): d is Date => d !== null).map(toApiDate))) {
        const bucket = map.get(key);
        if (bucket) bucket.push(item);
        else map.set(key, [item]);
      }
    }
    return map;
  }, [futureScoped]);

  const days = useMemo(
    () => daysBetween(startOfDay(addDays(today, 1)), startOfDay(addDays(today, horizon))),
    [today, horizon],
  );

  /* Build the periods from the calendar, not from tasks, so an empty day,
     week or month is still visible and can be reached by the board. */
  const futureColumns = useMemo(() => {
    const periods = new Map<string, { id: string; title: string; items: typeof scoped; dropTarget?: { kind: 'day'; date: Date }; capacityMinutes?: number | null }>();
    for (const day of days) {
      const start = group === 'day' ? day : group === 'week' ? startOfWeek(day, { weekStartsOn: 1 }) : startOfMonth(day);
      const id = toApiDate(start);
      let title = formatDayHeading(start, locale);
      if (group === 'week') {
        const weeks = differenceInCalendarWeeks(start, today, { weekStartsOn: 1 });
        title = weeks === 0 ? t('group.thisWeek') : weeks === 1 ? t('date.nextWeek')
          : t('group.weekOf', { date: intlDate(locale, { day: 'numeric', month: 'short' }).format(start) });
      } else if (group === 'month') {
        const month = intlDate(locale, { month: 'long', year: 'numeric' }).format(start);
        title = month.charAt(0).toUpperCase() + month.slice(1);
      }
      const column = periods.get(id) ?? {
        id, title, items: [],
        ...(group === 'day' ? { dropTarget: { kind: 'day' as const, date: day }, capacityMinutes: prefs.dailyCapacity[day.getDay()] } : {}),
      };
      const seen = new Set(column.items.map((item) => item.id));
      for (const item of byDay.get(toApiDate(day)) ?? []) if (!seen.has(item.id)) { column.items.push(item); seen.add(item.id); }
      periods.set(id, column);
    }
    return [...periods.values()].map((column) => ({ ...column, items: sorted(column.items) }));
  // sorted is derived from these same values and has no separate state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, group, locale, today, t, byDay, current.sort, childrenOf, snapshot, prefs.workspaceOrder, prefs.dailyCapacity]);
  const columns: Array<{ id: string; title: string; items: typeof scoped; dropTarget?: DropTarget; capacityMinutes?: number | null; action?: ReactNode; accent?: 'late' }> = [
    ...leadingGroups.map((entry) => ({ ...entry,
      dropTarget: entry.id === 'overdue' ? undefined : { kind: 'day' as const, date: today },
      capacityMinutes: entry.id === 'overdue' ? undefined : prefs.dailyCapacity[today.getDay()],
    })),
    ...futureColumns,
  ];
  const choices = group === 'day' ? [7, 15, 30, 60] : group === 'week' ? [28, 56, 84, 168] : [90, 180, 270, 365];
  const extension = group === 'day' ? 7 : group === 'week' ? 28 : 90;

  /* Hosted by the first day of the list, when the page is that list; under the header otherwise. */
  const hireInList = current.mode === 'list' && (group !== 'day' || columns.length > 0);

  return (
    <div className={pageClass(current)}>
      <PageHeader
        hireNote={!hireInList}
        title={t('nav.upcoming')}
        actions={
          <>
            <PomodoroButton />
            <DisplayMenu
              pageItems={current.mode === 'calendar' ? items : pool}
              viewKey="upcoming"
              modes={['list', 'board', 'table', 'calendar']}
              groups={UPCOMING_GROUPS}
            />
            <InsightsButton onClick={onInsights} />
            {current.mode !== 'calendar' && <PageMenu
              items={choices.map((days) => ({
                key: `h${days}`,
                label: t('upcoming.horizon', { days }),
                checked: horizon === days,
                onPick: () => setHorizon(days),
              }))}
            />}
          </>
        }
        load={load}
        hideMetrics={current.mode === 'calendar'}
        onOpenUnestimated={load.unestimatedCount > 0 ? () => {
          const ids = new Set(scoped.map((item) => item.projection?.sourceId ?? item.id));
          onUnestimated(items.filter((item) => ids.has(item.id)));
        } : undefined}
      />


      {current.mode === 'calendar' ? (
        <CalendarSurface viewKey="upcoming" items={items} onOpen={onOpen} onAddTaskTo={onAddTaskTo} />
      ) : current.mode === 'table' ? (
        <TableSurface viewKey="upcoming" childrenOf={childrenOf} onOpen={onOpen}
          groups={columns.map((column) => ({ title: column.title, items: column.items, childrenOf, onOpen,
            actions: column.action,
            onAddTask: column.dropTarget && column.id !== 'overdue' ? () => onAddTaskTo({ date: column.id }) : undefined }))} />
      ) : current.mode === 'board' ? (
        <ModeSurface
          items={scoped}
          childrenOf={childrenOf}
          mode="board"
          todayColumnId={toApiDate(today)}
          group={group}
          sort={current.sort}
          order="day"
          onOpen={onOpen}
          boardColumns={columns.map((column) => ({ ...column,
            onAddTask: column.dropTarget && column.id !== 'overdue' ? () => onAddTaskTo({ date: column.id }) : undefined,
          }))}
        />
      ) : (
        <div className="mode">
          {columns.map((column, index) => (
            <TaskGroup
              key={column.id}
              lead={index === 0 && hireNoteOpen ? <HireNote /> : undefined}
              keepWhenEmpty
              title={column.title}
              items={column.items}
              childrenOf={childrenOf}
              onOpen={onOpen}
              reorderable="day"
              viewKey="upcoming"
              accent={column.accent}
              actions={column.action}
              dropTarget={column.dropTarget}
              onAddTask={column.dropTarget ? () => onAddTaskTo({ date: column.id }) : undefined}
            />
          ))}

        </div>
      )}

      {current.mode !== 'calendar' && <div style={{ marginTop: 'var(--s5)', display: 'flex', justifyContent: 'center' }}>
        <div className="upcoming-extend">
          <p className="psub" aria-live="polite">{t('upcoming.visibleThrough', {
            date: intlDate(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(addDays(today, horizon)),
          })}</p>
          <button className="btn" onClick={() => setHorizon(horizon + extension)}>
            <Icon name="caret" />
            {t('upcoming.extend', { days: extension })}
          </button>
        </div>
      </div>}
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
