import { ME, UNASSIGNED } from '@/domain/assignees';
import { AssigneeFilter } from './AssigneeFilter';
import { WorkspaceFilter } from './WorkspaceFilter';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon, type IconName } from './Icon';
import { Select } from './Select';
import { DetailsEditor } from './DetailsEditor';
import { useT } from '@/hooks/useT';
import { useData } from '@/hooks/useData';
import { useStore } from '@/store/store';
import { viewPrefs } from '@/store/prefs';
import { countActiveFilters, PERSONAL_WORKSPACE } from '@/store/selectors';
import {
  defaultViewPrefs, type DisplayMode, type DisplayPriority,
  type GroupKey, type SortKey,
} from '@/domain/types';
import { markerStyle } from '@/domain/colors';
import type { Item } from '@/domain/types';
import type { TranslationKey } from '@/i18n';

interface DisplayMenuProps {
  viewKey: string;
  modes: DisplayMode[];
  groups: GroupKey[];
  /** A project page only: offers to also list the project's completed tasks. */
  completedToggle?: boolean;
  /**
   * False on a single project's own page: every task there already shares
   * that one project's workspace, so narrowing by workspace has nothing to
   * narrow. Everywhere else draws from more than one project and keeps it.
   */
  showWorkspaces?: boolean;
  /**
   * The tasks this page draws before any display filter is applied. The tag
   * filter offers the tags found on them, and nothing else: a tag no task here
   * carries cannot narrow anything. Left out, every tag is offered.
   */
  pageItems?: Item[];
}

const MODE_ICON: Record<DisplayMode, IconName> = {
  list: 'list',
  board: 'board',
  focus: 'stack',
};

/** An icon for every grouping and sort, so the list reads at a glance. */
const GROUP_ICON: Partial<Record<GroupKey, IconName>> = {
  none: 'list', scheduled: 'calendar', day: 'calendar', week: 'week', month: 'calendar',
  assignee: 'user', workspace: 'project', project: 'project', section: 'section', priority: 'flag',
  label: 'tag', estimate: 'clock',
};
const SORT_ICON: Record<SortKey, IconName> = {
  assignee: 'user',
  manual: 'drag', priority: 'flag', due: 'calendar', 'added-desc': 'sort', 'added-asc': 'sort',
  alphabetical: 'sort', 'estimate-asc': 'clock', 'estimate-desc': 'clock', label: 'tag',
};

/**
 * One control for how a page is shown.
 *
 * Todoist puts presentation, grouping, sorting and filtering behind a single
 * "Display" button rather than a row of separate ones, and the count on the
 * button says how many choices differ from the defaults.
 */
export function DisplayMenu({
  viewKey, modes, groups, completedToggle = false, showWorkspaces = true, pageItems,
}: DisplayMenuProps) {
  const { childrenOf } = useData();
  const { t } = useT();
  const prefs = useStore((s) => s.prefs);
  const setViewPrefs = useStore((s) => s.setViewPrefs);
  const snapshot = useStore((s) => s.snapshot);
  const current = viewPrefs(prefs, viewKey);
  /* What this page opens as, which is not the same on every page: the count
     and the reset both mean "back to how this view starts", and a view that
     starts grouped by project has to be able to say so. */
  const base = defaultViewPrefs(viewKey);
  const scheduledToggle = viewKey !== 'today' && viewKey !== 'upcoming';
  const scheduledLabel = viewKey === 'week' ? 'filter.showToday' : 'filter.includeScheduled';
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const sorts: SortKey[] = [
    ...(viewKey.startsWith('project:') ? ['assignee' as const] : []),
    'manual', 'priority', 'due', 'added-desc', 'added-asc', 'alphabetical',
    'estimate-asc', 'estimate-desc', 'label',
  ];

  /* A grouping this page no longer offers reads as its first one, which is
     what the page draws. */
  const shownGroup = groups.includes(current.group) ? current.group : groups[0];
  /* How many settings narrow or reorder this view beyond its defaults. List
     or board, and a board's width, are how the page is drawn, not a filter
     on what it shows: they are visible at a glance and do not count. */
  const workspaceIds = [PERSONAL_WORKSPACE, ...Object.keys(snapshot.workspaces)];
  const allWorkspaces = workspaceIds.every((id) => current.filters.workspaces.includes(id));
  const assigneeIds = new Set([ME, UNASSIGNED, ...Object.keys(snapshot.collaborators), ...Object.values(snapshot.items).flatMap((item) => item.responsible_uid ? [item.responsible_uid] : [])]);
  assigneeIds.delete(snapshot.user?.id ?? '');
  const allAssignees = current.filters.assignees != null && [...assigneeIds].every((id) => current.filters.assignees!.includes(id));
  const changed =
    countActiveFilters(scheduledToggle ? current.filters : { ...current.filters, includeScheduled: true }) - Number(allWorkspaces && current.filters.workspaces.length > 0) - Number(current.filters.assignees != null)
      + Number(JSON.stringify(allAssignees && base.filters.assignees == null ? null : current.filters.assignees) !== JSON.stringify(base.filters.assignees)) +
    (shownGroup !== base.group ? 1 : 0) +
    (current.sort !== base.sort ? 1 : 0);

  /* The tags this page has: those on its tasks and on their subtasks, plus any
     already chosen, so a filter that no longer matches anything can still be
     turned off. */
  const tags = useMemo(() => {
    const all = Object.values(snapshot.labels).filter((l) => !l.name.startsWith('est-'));
    if (!pageItems) return all;
    const used = new Set<string>(current.filters.labels.map((name) => name.toLowerCase()));
    const seen = new Set<string>();
    const walk = (item: Item) => {
      if (seen.has(item.id)) return;
      seen.add(item.id);
      for (const name of item.labels) used.add(name.toLowerCase());
      for (const child of childrenOf(item.id)) walk(child);
    };
    pageItems.forEach(walk);
    return all.filter((l) => used.has(l.name.toLowerCase()));
  }, [snapshot.labels, pageItems, childrenOf, current.filters.labels]);

  const toggleIn = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((x) => x !== value) : [...list, value];

  const setFilters = (patch: Partial<typeof current.filters>) =>
    setViewPrefs(viewKey, { filters: { ...current.filters, ...patch } });

  return (
    <div className="displaywrap" ref={ref}>
      <button
        className="btn"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="sliders" />
        {t('toolbar.display')}
        {changed > 0 && <span className="displaycount">{changed}</span>}
      </button>

      {open && (
        <div className="popover displaypanel" role="dialog" aria-label={t('toolbar.display')}>
          <div className="panelhead">
            <h5>{t('toolbar.display')}</h5>
            <button
              className="resetbtn"
              onClick={() => setViewPrefs(viewKey, base)}
            >
              {t('toolbar.resetAll')}
            </button>
          </div>

          <div className="segmented">
            {modes.map((mode) => (
              <button
                key={mode}
                aria-pressed={current.mode === mode}
                title={t(`toolbar.${mode}` as TranslationKey)}
                onClick={() => setViewPrefs(viewKey, { mode })}
              >
                <Icon name={MODE_ICON[mode]} size="sm" />
                <small>{t(`toolbar.${mode}` as TranslationKey)}</small>
              </button>
            ))}
          </div>

          {/* Two questions, two selects, drawn the way every other select in
              the app is drawn. */}
          <div className="panelgrid">
            <Select
              label={t('toolbar.group')}
              value={shownGroup}
              onChange={(value) => setViewPrefs(viewKey, { group: value as GroupKey })}
              options={groups.map((group) => ({
                value: group,
                label: t(`group.${group}` as TranslationKey),
                icon: GROUP_ICON[group],
              }))}
            />
            <Select
              label={t('toolbar.sortBy')}
              value={current.sort}
              onChange={(value) => setViewPrefs(viewKey, { sort: value as SortKey })}
              options={sorts.map((sort) => ({
                value: sort,
                label: t(`sort.${sort}` as TranslationKey),
                icon: SORT_ICON[sort],
              }))}
            />
          </div>

          <hr />

          {/* Filters are toggles you can see the state of at a glance, rather
              than a column of checkboxes to read one by one. */}
          {showWorkspaces && <WorkspaceFilter viewKey={viewKey} />}
          <AssigneeFilter viewKey={viewKey} />
          <h5>{t('filter.priorities')}</h5>
          <div className="chiprow">
            {([1, 2, 3, 4] as const).map((p) => (
              <button
                key={p}
                className="chip"
                aria-pressed={current.filters.priorities.includes(p)}
                onClick={() =>
                  setFilters({ priorities: toggleIn(current.filters.priorities, p as DisplayPriority) })
                }
              >
                <span className="flagdot" style={{ background: `var(--p${p})` }} />
                P{p}
              </button>
            ))}
          </div>

          <h5>{t('filter.estimated')}</h5>
          <div className="segmented small">
            {([null, true, false] as const).map((value) => (
              <button
                key={String(value)}
                aria-pressed={current.filters.estimated === value}
                onClick={() => setFilters({ estimated: value })}
              >
                <small>
                  {value === null
                    ? t('filter.any')
                    : value
                      ? t('filter.isEstimated')
                      : t('filter.isUnestimated')}
                </small>
              </button>
            ))}
          </div>


          <hr />
          <div className="display-toggles">
          {scheduledToggle && <div className="panelrow">
            <span>{t(scheduledLabel)}</span>
            <button
              className="switch"
              role="switch"
              aria-checked={current.filters.includeScheduled}
              aria-label={t(scheduledLabel)}
              onClick={() => setFilters({ includeScheduled: !current.filters.includeScheduled })}
            />
          </div>}
          <div className="panelrow">
            <span>{t('filter.showSubtasks')}</span>
            <button
              className="switch"
              role="switch"
              aria-checked={current.filters.showSubtasks}
              aria-label={t('filter.showSubtasks')}
              onClick={() => setFilters({ showSubtasks: !current.filters.showSubtasks })}
            />
          </div>
          {completedToggle && (
            <div className="panelrow">
              <span>{t('filter.showCompleted')}</span>
              <button
                className="switch"
                role="switch"
                aria-checked={current.filters.showCompleted}
                aria-label={t('filter.showCompleted')}
                onClick={() => setFilters({ showCompleted: !current.filters.showCompleted })}
              />
            </div>
          )}

          </div>
          {tags.length > 0 && <hr />}
          {tags.length > 0 && <>
              <h5>{t('filter.labels')}</h5>
              <div className="chiprow scroll">
                {tags.map((label) => (
                  <button
                    key={label.id}
                    className="chip"
                    aria-pressed={current.filters.labels.includes(label.name)}
                    onClick={() => setFilters({ labels: toggleIn(current.filters.labels, label.name) })}
                  >
                    <Icon name="tag" size="sm" className="taglabel" style={markerStyle(label.color, false)} />
                    {label.name}
                  </button>
                ))}
              </div>
          </>}


          <hr />
          {/* The one setting here that is not about this page: what every task
              row shows, and in what order. It says so, and Reset all leaves it. */}
          <h5>{t('details.title')} <em className="global">{t('details.global')}</em></h5>
          <DetailsEditor />
        </div>
      )}
    </div>
  );
}
