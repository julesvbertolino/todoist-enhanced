import { useDataSnapshot } from '@/hooks/useDataSnapshot';
import { ME, UNASSIGNED } from '@/domain/assignees';
import { WorkspaceFilter } from './WorkspaceFilter';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon, type IconName } from './Icon';
import { DetailsEditor } from './DetailsEditor';
import { useT } from '@/hooks/useT';
import { useData } from '@/hooks/useData';
import { useStore } from '@/store/store';
import { viewPrefs } from '@/store/prefs';
import { countActiveFilters, PERSONAL_WORKSPACE } from '@/store/selectors';
import {
  defaultViewPrefs, type DisplayMode,
  type GroupKey, type SortKey,
} from '@/domain/types';
import type { Item } from '@/domain/types';
import { PanelSheet } from '@/components/SheetChrome';
import { DisplayFields } from './DisplayFields';

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
  /** The saved view these settings belong to, named at the top of the panel (#333). */
  scope?: string;
}

/** An icon for every grouping and sort, so the list reads at a glance. */
export const GROUP_ICON: Partial<Record<GroupKey, IconName>> = {
  none: 'list', scheduled: 'calendar', day: 'calendar', week: 'week', month: 'calendar', year: 'calendar',
  assignee: 'user', workspace: 'project', project: 'project', section: 'section', priority: 'flag',
  label: 'tag', estimate: 'clock', step: 'board',
};
/* The same order on every page, whatever order the page listed its groups in. */
export const GROUP_ORDER: GroupKey[] = ['none', 'project', 'section', 'workspace', 'priority', 'assignee', 'label', 'step', 'scheduled', 'estimate', 'day', 'week', 'month', 'year'];
export const SORT_ICON: Record<SortKey, IconName> = {
  deadline: 'deadline', project: 'project', description: 'list',
  assignee: 'user', smart: 'sparkles',
  manual: 'drag', priority: 'flag', due: 'calendar', 'added-desc': 'sort', 'added-asc': 'sort',
  alphabetical: 'sort', 'estimate-asc': 'clock', 'estimate-desc': 'clock', label: 'tag',
};

/** The sorts a project offers, and the groupings (ProjectView and the saved views read the same lists). */
export const PROJECT_SORTS: SortKey[] = [
  'manual', 'priority', 'due', 'deadline', 'assignee', 'project', 'added-desc', 'added-asc',
  'estimate-asc', 'estimate-desc', 'alphabetical',
];
export const PROJECT_GROUPS: GroupKey[] = ['none', 'assignee', 'scheduled', 'priority', 'label', 'step', 'estimate', 'day', 'month', 'year'];

/**
 * One control for how a page is shown.
 *
 * Todoist puts presentation, grouping, sorting and filtering behind a single
 * "Display" button rather than a row of separate ones, and the count on the
 * button says how many choices differ from the defaults.
 */
export function DisplayMenu({
  viewKey, modes, groups, completedToggle = false, showWorkspaces = true, pageItems, scope,
}: DisplayMenuProps) {
  const { childrenOf } = useData();
  const { t } = useT();
  const prefs = useStore((s) => s.prefs);
  const setViewPrefs = useStore((s) => s.setViewPrefs);
  const snapshot = useDataSnapshot();
  const current = viewPrefs(prefs, viewKey);
  /* What this page opens as, which is not the same on every page: the count
     and the reset both mean "back to how this view starts", and a view that
     starts grouped by project has to be able to say so. */
  const base = defaultViewPrefs(viewKey);
  const isCalendar = current.mode === 'calendar';
  const scheduledToggle = !isCalendar && viewKey !== 'today' && viewKey !== 'upcoming';
  const scheduledLabel = viewKey === 'week' ? 'filter.showToday' : 'filter.includeScheduled';
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && !(e.target as Element).closest('.fselect-list, .popover.listbox, .sidemenu')) setOpen(false);
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
    ...(viewKey.startsWith('project:') ? [] : ['smart' as const]), 'manual', 'priority', 'due', 'deadline', 'assignee', 'project', 'added-desc', 'added-asc',
    'estimate-asc', 'estimate-desc', 'alphabetical',
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
    (!isCalendar && shownGroup !== base.group ? 1 : 0) +
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

  return (
    <div className="displaywrap" ref={ref}>
      <button
        className="btn"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={t('toolbar.display')}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="sliders" />
        <span className="tb-label">{t('toolbar.display')}</span>
        {changed > 0 && <span className="displaycount">{changed}</span>}
      </button>

      {open && (
        <PanelSheet className="popover displaypanel" label={t('toolbar.display')} onClose={() => setOpen(false)}>
          <div className="panelhead">
            <h5>{t('toolbar.display')}</h5>
            <button
              className="resetbtn"
              onClick={() => setViewPrefs(viewKey, base)}
            >
              {t('toolbar.resetAll')}
            </button>
          </div>
          {scope && <p className="viewscope">{scope}</p>}

          <DisplayFields
            value={{ ...current, group: shownGroup }}
            onChange={(patch) => setViewPrefs(viewKey, patch)}
            viewKey={viewKey}
            modes={modes}
            groups={groups}
            sorts={sorts}
            tags={tags}
            completedToggle={completedToggle}
            scheduledLabel={scheduledToggle ? scheduledLabel : undefined}
            extraFilters={showWorkspaces ? <WorkspaceFilter viewKey={viewKey} /> : undefined}
          />

          {!isCalendar && <>
          <hr />
          {/* The one setting here that is not about this page: what every task
              row shows, and in what order. It says so, and Reset all leaves it. */}
          <h5>{t('details.title')} <em className="global">{t('details.global')}</em></h5>
          <DetailsEditor />
          </>}
        </PanelSheet>
      )}
    </div>
  );
}
