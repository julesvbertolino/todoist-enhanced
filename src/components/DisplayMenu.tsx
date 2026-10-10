import { useEffect, useRef, useState } from 'react';
import { Icon, type IconName } from './Icon';
import { Select } from './Select';
import { DetailsEditor } from './DetailsEditor';
import { useT } from '@/hooks/useT';
import { useStore } from '@/store/store';
import { viewPrefs } from '@/store/prefs';
import { countActiveFilters, PERSONAL_WORKSPACE } from '@/store/selectors';
import {
  defaultViewPrefs, type DisplayMode, type DisplayPriority,
  type GroupKey, type SortKey,
} from '@/domain/types';
import { markerStyle } from '@/domain/colors';
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
}

const MODE_ICON: Record<DisplayMode, IconName> = {
  list: 'list',
  board: 'board',
  focus: 'stack',
};

/** An icon for every grouping and sort, so the list reads at a glance. */
const GROUP_ICON: Partial<Record<GroupKey, IconName>> = {
  none: 'list', scheduled: 'calendar', day: 'calendar', week: 'week', month: 'calendar',
  workspace: 'project', project: 'project', section: 'section', priority: 'flag',
  label: 'tag', estimate: 'clock',
};
const SORT_ICON: Record<SortKey, IconName> = {
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
  viewKey, modes, groups, completedToggle = false, showWorkspaces = true,
}: DisplayMenuProps) {
  const { t } = useT();
  const prefs = useStore((s) => s.prefs);
  const setViewPrefs = useStore((s) => s.setViewPrefs);
  const snapshot = useStore((s) => s.snapshot);
  const current = viewPrefs(prefs, viewKey);
  /* What this page opens as, which is not the same on every page: the count
     and the reset both mean "back to how this view starts", and a view that
     starts grouped by project has to be able to say so. */
  const base = defaultViewPrefs(viewKey);
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
    'manual', 'priority', 'due', 'added-desc', 'added-asc', 'alphabetical',
    'estimate-asc', 'estimate-desc', 'label',
  ];

  /* A grouping this page no longer offers reads as its first one, which is
     what the page draws. */
  const shownGroup = groups.includes(current.group) ? current.group : groups[0];
  /* How many settings narrow or reorder this view beyond its defaults. List
     or board, and a board's width, are how the page is drawn, not a filter
     on what it shows: they are visible at a glance and do not count. */
  const changed =
    countActiveFilters(current.filters) +
    (shownGroup !== base.group ? 1 : 0) +
    (current.sort !== base.sort ? 1 : 0);

  const tags = Object.values(snapshot.labels).filter((l) => !l.name.startsWith('est-'));
  const workspaces = Object.values(snapshot.workspaces);

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

          {/* "My projects" isn't a workspace Todoist hands back — it's the
              absence of one — so there is nothing to offer this against
              until the account has added a real one. From that point on
              there are always at least two places a task can be: personal,
              or that workspace. */}
          {showWorkspaces && workspaces.length > 0 && (
            <>
              <h5>{t('filter.workspaces')}</h5>
              <div className="segmented small">
                <button
                  aria-pressed={current.filters.workspaces.length === 0}
                  onClick={() => setFilters({ workspaces: [] })}
                >
                  <small>{t('filter.any')}</small>
                </button>
                <button
                  aria-pressed={current.filters.workspaces[0] === PERSONAL_WORKSPACE}
                  onClick={() => setFilters({ workspaces: [PERSONAL_WORKSPACE] })}
                >
                  <small>{t('nav.myProjects')}</small>
                </button>
                {workspaces.map((workspace) => (
                  <button
                    key={workspace.id}
                    aria-pressed={current.filters.workspaces[0] === workspace.id}
                    onClick={() => setFilters({ workspaces: [workspace.id] })}
                  >
                    <small>{workspace.name}</small>
                  </button>
                ))}
              </div>
            </>
          )}

          <hr />
          <div className="panelrow">
            <span>{t('filter.includeScheduled')}</span>
            <button
              className="switch"
              role="switch"
              aria-checked={current.filters.includeScheduled}
              aria-label={t('filter.includeScheduled')}
              onClick={() => setFilters({ includeScheduled: !current.filters.includeScheduled })}
            />
          </div>
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

          <hr />
          <>
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
          </>


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
