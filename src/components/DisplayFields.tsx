import type { ReactNode } from 'react';
import { Icon } from './Icon';
import { Select } from './Select';
import { MultiSelect } from './MultiSelect';
import { ColumnsMenu } from './ColumnsMenu';
import { AssigneeSelect } from './AssigneeFilter';
import { GROUP_ICON, GROUP_ORDER, SORT_ICON } from './DisplayMenu';
import { MODE_ICON } from './viewModes';
import { useT } from '@/hooks/useT';
import { useStore } from '@/store/store';
import { markerStyle } from '@/domain/colors';
import { calendarPrefs } from '@/domain/calendar';
import type {
  CalendarPrefs, DisplayMode, DisplayPriority, GroupKey, Label, SortKey, ViewPrefs,
} from '@/domain/types';
import type { TranslationKey } from '@/i18n';

/**
 * What a view is made of, in three parts: the kind of view (and what is
 * particular to it: the width of a list, the columns of a table, the grid of a
 * calendar), how it is grouped and sorted, and what it filters out. Display
 * and the panels of saved views (#333) draw exactly this, so the two never
 * drift apart. Filters that take several values are dropdowns with
 * checkboxes, as the assignee one always was.
 */
export function DisplayFields({
  value, onChange, viewKey, modes, groups, sorts, tags, completedToggle = false, scheduledLabel, extraFilters,
}: {
  value: ViewPrefs;
  onChange: (patch: Partial<ViewPrefs>) => void;
  viewKey: string;
  modes: DisplayMode[];
  groups: GroupKey[];
  sorts: SortKey[];
  /** The tags to offer: those of the page, plus any already chosen. */
  tags: Label[];
  completedToggle?: boolean;
  /** The words of the "include scheduled tasks" switch, where the page has one. */
  scheduledLabel?: TranslationKey;
  /** Filters only some pages have, such as the workspace. */
  extraFilters?: ReactNode;
}) {
  const { t } = useT();
  const estimateStorage = useStore((s) => s.prefs.estimateStorage);
  const isCalendar = value.mode === 'calendar';
  const calendar = calendarPrefs(value, viewKey);
  const setCalendar = (patch: Partial<CalendarPrefs>) => onChange({ calendar: { ...calendar, ...patch } });
  const filters = value.filters;
  const setFilters = (patch: Partial<ViewPrefs['filters']>) => onChange({ filters: { ...filters, ...patch } });
  const shownGroup = groups.includes(value.group) ? value.group : groups[0];

  const priorityOptions = ([1, 2, 3, 4] as const).map((p) => ({
    value: String(p), label: `P${p}`, visual: <Icon name="flag" size="sm" style={{ color: `var(--p${p})` }} />,
  }));
  const tagOptions = tags.map((label) => ({
    value: label.name, label: label.name,
    visual: <Icon name="tag" size="sm" className="taglabel" style={markerStyle(label.color, false)} />,
  }));

  return (
    <div className="dfields">
      <h5>{t('display.kind')}</h5>
      <div className="segmented display-modes" role="group" aria-label={t('display.kind')}>
        {modes.map((mode) => (
          <button key={mode} type="button" aria-pressed={value.mode === mode} title={t(`toolbar.${mode}` as TranslationKey)} onClick={() => onChange({ mode })}>
            <Icon name={MODE_ICON[mode]} size="sm" />
            <small>{t(`toolbar.${mode}` as TranslationKey)}</small>
          </button>
        ))}
      </div>

      {value.mode === 'list' && (
        <div className="panelrow display-fullwidth">
          <span>{t('toolbar.fullWidth')}</span>
          <button type="button" className="switch" role="switch" aria-checked={value.fullWidth === true} aria-label={t('toolbar.fullWidth')}
            onClick={() => onChange({ fullWidth: value.fullWidth !== true })} />
        </div>
      )}
      {value.mode === 'table' && (
        <div className="dfield-stack">
          <ColumnsMenu value={value} onChange={(patch) => onChange(patch)} />
          <Select label={t('table.coloration')} value={value.tableColoration ?? 'none'}
            options={(['none', 'priority', 'date', 'project'] as const).map((option) => ({ value: option, label: t(`table.color.${option}`) }))}
            onChange={(option) => onChange({ tableColoration: option as NonNullable<ViewPrefs['tableColoration']> })} />
          <div className="panelrow display-fullwidth">
            <span>{t('table.wrap')}</span>
            <button type="button" className="switch" role="switch" aria-checked={value.tableWrap === true} aria-label={t('table.wrap')}
              onClick={() => onChange({ tableWrap: value.tableWrap !== true })} />
          </div>
        </div>
      )}
      {isCalendar && (
        <div className="calendar-display-settings">
          <div className="segmented small calendar-presentations" role="group" aria-label={t('calendar.presentation')}>
            {(['3-days', 'week', 'month'] as const).map((option) => (
              <button key={option} type="button" aria-pressed={calendar.presentation === option} onClick={() => setCalendar({ presentation: option })}>
                <small>{t(`calendar.${option}`)}</small>
              </button>
            ))}
          </div>
          <div className="display-toggles">
            {(['futureOccurrences', 'completed'] as const).map((key) => (
              <div className="panelrow" key={key}>
                <span>{t(key === 'completed' ? 'calendar.completed' : 'calendar.future')}</span>
                <button type="button" className="switch" role="switch" aria-checked={calendar[key]}
                  aria-label={t(key === 'completed' ? 'calendar.completed' : 'calendar.future')}
                  onClick={() => setCalendar({ [key]: !calendar[key] })} />
              </div>
            ))}
          </div>
          <Select label={t('calendar.coloration')} value={calendar.coloration}
            options={(['priority', 'project', 'tag'] as const).map((option) => ({ value: option, label: t(`calendar.${option}`), icon: ({ priority: 'flag', project: 'project', tag: 'tag' } as const)[option] }))}
            onChange={(option) => setCalendar({ coloration: option as CalendarPrefs['coloration'] })} />
          {estimateStorage !== 'duration' && <p className="calendar-pref-hint">{t('calendar.tagHint')}</p>}
        </div>
      )}

      <hr />
      <h5>{t('display.order')}</h5>
      <div className="panelgrid">
        {!isCalendar && (
          <Select label={t('toolbar.group')} value={shownGroup} onChange={(option) => onChange({ group: option as GroupKey })}
            options={[...groups].sort((a, b) => GROUP_ORDER.indexOf(a) - GROUP_ORDER.indexOf(b)).map((group) => ({
              value: group, label: t(`group.${group}` as TranslationKey), icon: GROUP_ICON[group],
            }))} />
        )}
        <Select label={t('toolbar.sortBy')} ariaLabel={t('toolbar.sortBy')} value={value.sort} onChange={(option) => onChange({ sort: option as SortKey })}
          options={sorts.map((sort) => ({
            value: sort,
            label: sort === 'manual' && !viewKey.startsWith('project:') ? t('sort.manualOrder') : t(`sort.${sort}` as TranslationKey),
            icon: SORT_ICON[sort],
          }))} />
      </div>

      <hr />
      <h5>{t('display.filters')}</h5>
      <div className="dfield-stack">
        {extraFilters}
        <AssigneeSelect value={filters.assignees ?? null} onChange={(assignees) => setFilters({ assignees })} />
        <MultiSelect
          icon="flag" label={t('filter.priorities')} allLabel={t('filter.anyPriority')} value={filters.priorities.length > 0 ? filters.priorities.map(String) : null}
          options={priorityOptions} onChange={(next) => setFilters({ priorities: next ? next.map(Number) as DisplayPriority[] : [] })}
        />
        <MultiSelect
          icon="clock" label={t('filter.estimated')} allLabel={t('filter.any')} value={filters.estimated === null ? null : [filters.estimated ? 'yes' : 'no']}
          options={[{ value: 'yes', label: t('filter.isEstimated') }, { value: 'no', label: t('filter.isUnestimated') }]}
          onChange={(next) => setFilters({ estimated: next && next.length === 1 ? next[0] === 'yes' : null })}
        />
        {tagOptions.length > 0 && (
          <MultiSelect
            icon="tag" label={t('filter.labels')} allLabel={t('filter.anyTag')} value={filters.labels.length > 0 ? filters.labels : null}
            options={tagOptions} onChange={(next) => setFilters({ labels: next ?? [] })}
          />
        )}
      </div>
      <div className="display-toggles">
        {scheduledLabel && (
          <div className="panelrow">
            <span>{t(scheduledLabel)}</span>
            <button type="button" className="switch" role="switch" aria-checked={filters.includeScheduled} aria-label={t(scheduledLabel)}
              onClick={() => setFilters({ includeScheduled: !filters.includeScheduled })} />
          </div>
        )}
        <div className="panelrow">
          <span>{t('filter.showSubtasks')}</span>
          <button type="button" className="switch" role="switch" aria-checked={filters.showSubtasks} aria-label={t('filter.showSubtasks')}
            onClick={() => setFilters({ showSubtasks: !filters.showSubtasks })} />
        </div>
        {completedToggle && !isCalendar && (
          <div className="panelrow">
            <span>{t('filter.showCompleted')}</span>
            <button type="button" className="switch" role="switch" aria-checked={filters.showCompleted} aria-label={t('filter.showCompleted')}
              onClick={() => setFilters({ showCompleted: !filters.showCompleted })} />
          </div>
        )}
      </div>
    </div>
  );
}
