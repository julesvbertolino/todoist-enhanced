import { useMemo } from 'react';
import { addDays, endOfDay, format, startOfDay, startOfWeek } from 'date-fns';
import { Overlay } from './Overlay';
import { Icon } from '../Icon';
import { Bars, SplitBar, type BarDatum, type SliceDatum } from '../charts';
import { useT } from '@/hooks/useT';
import { useData } from '@/hooks/useData';
import { useCompleted } from '@/hooks/useCompleted';
import { daysOf } from '@/domain/periods';
import { navigate } from '@/hooks/useRoute';
import { completedSince, projectProgress, summariseInsights } from '@/domain/insights';
import { openItems } from '@/store/selectors';
import { useProjectCompletedCount } from '@/hooks/useProjectCompletedCount';
import { weekStartsOnOf } from '@/domain/dates';
import { effectiveEstimate, formatDuration } from '@/domain/estimates';
import { isOverdue, overdueBy } from '@/domain/dates';
import type { Item } from '@/domain/types';
import type { TranslationKey } from '@/i18n';
import { plainTitle } from '@/domain/markdown';
import { intlDate } from '@/lib/intl';

interface InsightsPanelProps {
  open: boolean;
  onClose: () => void;
  /** The page this panel is summarising, named so it never lies about scope. */
  contextLabel: string;
  viewKey?: string;
  projectId?: string;
  items: Item[];
  onOpenTask: (id: string) => void;
}

/** The contextual Insights sheet, adapted to whichever page opened it. */
export function InsightsPanel({
  open, onClose, contextLabel, items, onOpenTask, viewKey, projectId,
}: InsightsPanelProps) {
  const { t, locale } = useT();
  const { snapshot, childrenOf } = useData(viewKey);
  /* The seven calendar days ending today, not the week the calendar is in and
     not seven weeks: today and the six days before it, every one of them drawn
     even when nothing was finished on it (#176). Built from calendar days, so
     a clock change inside the window cannot make it six days or eight. */
  const today = format(new Date(), 'yyyy-MM-dd');
  const window7 = useMemo(() => {
    const now = new Date(`${today}T12:00:00`);
    return { since: startOfDay(addDays(now, -6)), until: endOfDay(now) };
  }, [today]);
  const { data: history, loading, error, retry } = useCompleted(window7, open, viewKey);

  const completed = useMemo(() => projectId ? history.filter((entry) => entry.project_id === projectId) : history, [history, projectId]);

  const summary = useMemo(
    () => summariseInsights(completed, items, snapshot),
    [completed, items, snapshot],
  );

  /* A project page reports the project's whole life, from Todoist's own count,
     so it can be set beside Todoist's figures. Every other page has no such
     count: it says which period its completed figure covers instead (#239). */
  const projectTotal = useProjectCompletedCount(projectId, open);
  const progress = useMemo(
    () => projectId ? projectProgress(projectTotal, openItems(snapshot).filter((item) => item.project_id === projectId)) : null,
    [projectId, projectTotal, snapshot],
  );
  const weekStart = useMemo(
    () => startOfWeek(new Date(`${today}T12:00:00`), { weekStartsOn: weekStartsOnOf(snapshot.user?.start_day) }),
    [today, snapshot.user?.start_day],
  );
  /* Every page counts open work the way a project page does, which is
     Todoist's way: the tasks it lists and their open subtasks (#239). */
  const activeCount = useMemo(() => {
    const seen = new Set<string>();
    const walk = (item: Item) => {
      if (seen.has(item.id) || item.checked || item.is_deleted) return;
      seen.add(item.id);
      childrenOf(item.id).forEach(walk);
    };
    items.forEach(walk);
    return seen.size;
  }, [items, childrenOf]);
  const thisWeek = useMemo(() => completedSince(completed, weekStart), [completed, weekStart]);

  const late = useMemo(
    () => items.filter((i) => isOverdue(i)).sort((a, b) => overdueBy(b) - overdueBy(a)),
    [items],
  );

  const lateMinutes = late.reduce(
    (acc, item) => acc + (effectiveEstimate(item, childrenOf).minutes ?? 0),
    0,
  );

  const weekBars: BarDatum[] = useMemo(() => {
    const counts = new Map(summary.byDay.map((day) => [day.date, day.count]));
    const intl = locale === 'fr' ? 'fr-FR' : 'en-GB';
    return daysOf(window7).map((at) => {
      const key = format(at, 'yyyy-MM-dd');
      return {
        key,
        label: intlDate(intl, { weekday: 'short' }).format(at),
        value: counts.get(key) ?? 0,
        current: key === today,
      };
    });
  }, [summary.byDay, window7, locale, today]);

  const byPriority: SliceDatum[] = useMemo(
    () =>
      ([1, 2, 3, 4] as const).map((p) => ({
        key: `p${p}`,
        label: t(`common.p${p}` as TranslationKey),
        value: summary.priorities[`p${p}` as 'p1'],
        color: `var(--p${p})`,
      })),
    [summary.priorities, t],
  );

  return (
    <Overlay open={open} onClose={onClose} label={t('insights.title')} variant="side">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--s4)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--fs-16)', fontWeight: 700 }}>{t('insights.title')}</h2>
          <p className="psub">{contextLabel}</p>
        </div>
        <button className="iconbtn" aria-label={t('common.close')} onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>

      {late.length > 0 && (
        <div className="icard late">
          <div className="ihead">
            <div className="ikicker">{t('insights.behindSchedule')}</div>
            <strong style={{ color: 'var(--accent)', fontSize: 'var(--fs-16)' }}>{late.length}</strong>
          </div>
          <div className="latelist">
            {late.slice(0, 4).map((item) => (
              <div key={item.id} onClick={() => { onOpenTask(item.id); onClose(); }} role="button" tabIndex={0}>
                <i />
                <span>{plainTitle(item.content)}</span>
                <time>{overdueBy(item)}d</time>
              </div>
            ))}
          </div>
          {lateMinutes > 0 && (
            <p className="psub" style={{ marginTop: 'var(--s2)' }}>
              {formatDuration(lateMinutes, locale)}
            </p>
          )}
        </div>
      )}

      <div className="icard">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s4)' }}>
          {projectId && (
            <div className="ring" style={{ '--ring': `${progress?.percentage ?? 0}%`, width: 72, height: 72 } as React.CSSProperties}>
              <div><strong style={{ fontSize: 'var(--fs-16)' }}>{progress ? `${progress.percentage}%` : '…'}</strong></div>
            </div>
          )}
          <div className="ilist">
            {projectId ? (
              progress ? (
                <>
                  <span><strong>{progress.completed}</strong> {t('insights.completedTotal')}</span>
                  <span><strong>{progress.active}</strong> {t('insights.active')}</span>
                  <span><strong>{thisWeek}</strong> {t('insights.completedWeek')}</span>
                </>
              ) : (
                <span role="status">{t('insights.countsPending')}</span>
              )
            ) : (
              <>
                <span><strong>{summary.completedCount}</strong> {t('insights.completedRecent')}</span>
                <span><strong>{activeCount}</strong> {t('insights.active')}</span>
              </>
            )}
            <span>{t('insights.streakRecent', { count: summary.currentStreak })}</span>
          </div>
        </div>
      </div>

      <div className="icard">
        <div className="ihead">
          <div>
            <div className="ikicker">{t('insights.focusScore')}</div>
            <div className="ibig">{summary.focusScore}%</div>
          </div>
        </div>
        <SplitBar data={byPriority} />
        <p className="psub" style={{ marginTop: 'var(--s2)' }}>{t('insights.focusExplainer')}</p>
      </div>

      <div className="icard">
        <div className="ihead">
          <div>
            <div className="ikicker">{t('insights.last7Days')}</div>
            <div className="ibig">
              {summary.completedCount}{' '}
              <span style={{ fontSize: 'var(--fs-12)', color: 'var(--muted)', fontWeight: 500 }}>
                {t('insights.completed')}
              </span>
            </div>
          </div>
        </div>
        {error !== null ? (
          <div role="alert">
            <p className="psub">{t('insights.failed')}</p>
            <button className="btn" onClick={retry}>{t('common.retry')}</button>
          </div>
        ) : loading ? (
          <p className="psub" role="status">{t('insights.loading')}</p>
        ) : (
          <Bars
            data={weekBars}
            height={72}
            emptyLabel={t('insights.noHistory')}
            format={(value) => t('metrics.tasks', { count: value })}
          />
        )}
      </div>

      <button
        className="btn primary"
        style={{ width: '100%', minHeight: 40, marginTop: 'var(--s2)' }}
        onClick={() => { navigate('insights'); onClose(); }}
      >
        {t('insights.openFull')}
      </button>
    </Overlay>
  );
}
