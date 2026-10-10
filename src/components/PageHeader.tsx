import type { ReactNode } from 'react';
import { Icon } from './Icon';
import { useT } from '@/hooks/useT';
import { formatDuration } from '@/domain/estimates';
import { loadTone, type LoadSummary } from '@/domain/load';

/** The "I have time" pill (#159): the page offers it by passing this. */
export interface TimePillProps {
  /** How long was chosen, or null while nothing is. */
  minutes: number | null;
  /** The panel is open. */
  open: boolean;
  onToggle: () => void;
  onClear: () => void;
}

interface PageHeaderProps {
  /** A node, not a string: a project's title renames in place. */
  title: ReactNode;
  /** Real content only — a project's description. Never a description of the view. */
  subtitle?: ReactNode;
  /** Display and Insights: the controls for this page, on the title line. */
  actions?: ReactNode;
  load: LoadSummary;
  /** Opens the list of tasks on this page that have no estimate. */
  onOpenUnestimated?: () => void;
  /** Offers the time filter on this page. Left out on the pages it does not belong on. */
  time?: TimePillProps;
}

/**
 * The line every page shares: what this page is, how many tasks and how much
 * estimated time are on it, and whether that fits. The duration turns amber
 * from 95% of the capacity and red beyond it where capacity means something,
 * which the caller decides by passing it or not (#173).
 */
export function PageHeader({
  title, subtitle, actions, load, onOpenUnestimated, time,
}: PageHeaderProps) {
  const { t, locale } = useT();

  /* What the duration stands for, in words: how much is estimated, how many
     tasks have no estimate, and the capacity it is measured against. */
  const durationLabel = [
    load.estimatedMinutes > 0
      ? `${formatDuration(load.estimatedMinutes, locale)} ${t('metrics.estimatedWord')}`
      : t('metrics.noEstimates'),
    load.unestimatedCount > 0 ? t('metrics.unestimatedFull', { count: load.unestimatedCount }) : null,
    load.percentage !== null ? t('metrics.capacityBasis', { percent: load.percentage }) : null,
    onOpenUnestimated && load.unestimatedCount > 0 ? t('metrics.estimateThem') : null,
  ].filter(Boolean).join(' · ');

  return (
    <>
      <div className="phead">
        <div className="phead-text">
          <h1 className="ptitle">{title}</h1>
          {/* A div, not a p: the project description is an editable block and
              markup cannot legally sit inside a paragraph. */}
          {subtitle && <div className="psub">{subtitle}</div>}
        </div>
        {actions && <div className="pactions">{actions}</div>}
      </div>

      <div className="metrics">
        <span className="metric">
          <Icon name="tasks" size="sm" />
          <b>{load.taskCount}</b> {t('metrics.taskWord', { count: load.taskCount })}
        </span>

        {(load.estimatedMinutes > 0 || load.unestimatedCount > 0) && (
          <>
            <span className="sep">·</span>
            {/* The duration is also the way into the tasks that have none (#173):
                one control where there used to be a duration, a percentage and a
                count. Its colour says how full the capacity is, and the same
                facts are in words for whoever cannot see the colour. */}
            <button
              className={`metric summary-time ${loadTone(load.percentage)}`}
              disabled={!onOpenUnestimated || load.unestimatedCount === 0}
              onClick={() => onOpenUnestimated?.()}
              aria-label={durationLabel}
              title={durationLabel}
              data-tour="metrics"
            >
              <Icon name="clock" size="sm" />
              {load.estimatedMinutes > 0
                ? <><b>{formatDuration(load.estimatedMinutes, locale)}</b> {t('metrics.estimatedWord')}</>
                : t('metrics.noEstimates')}
            </button>
          </>
        )}

        {time && (
          <>
            <span className="sep">·</span>
            {/* Right after the duration: the same line, the same question —
                how much room there is — asked the other way round. */}
            <span className={`timepill${time.minutes !== null && time.open ? ' on' : ''}`} data-tour="time">
              <button
                className="timepill-main"
                aria-expanded={time.open}
                title={t('time.pillHint')}
                onClick={time.onToggle}
              >
                <Icon name="clock" size="sm" />
                {/* Always the same words: the duration lives in the panel (#30). */}
                {t('time.pill')}
              </button>
              {time.minutes !== null && time.open && (
                <button
                  className="timepill-x"
                  aria-label={t('time.clear')}
                  title={t('time.clear')}
                  onClick={time.onClear}
                >
                  <Icon name="close" size="sm" />
                </button>
              )}
            </span>
          </>
        )}
      </div>
    </>
  );
}
