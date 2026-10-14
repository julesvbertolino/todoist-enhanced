import { InsightsButton } from '@/components/InsightsButton';
import { LabelTitle } from '@/components/LabelTitle';
import { HireNote } from '@/components/HireNote';
import { useMemo, useState } from 'react';
import { ProjectMenu } from '@/components/ProjectMenu';
import { PageHeader } from '@/components/PageHeader';
import { SubtasksProvider } from '@/components/TaskRow';
import { DisplayMenu } from '@/components/DisplayMenu';
import { ModeSurface } from '@/components/ModeSurface';
import { TaskGroup } from '@/components/TaskGroup';
import { Icon } from '@/components/Icon';
import { TimePanel } from '@/components/TimePanel';
import { useT } from '@/hooks/useT';
import { useFilterResult } from '@/hooks/useFilterResult';
import { FilterSheet, type FilterSheetTarget } from '@/components/overlays/FilterSheet';
import { FilterDescription, FilterMenu, FilterTitle } from '@/components/FilterHeader';
import { useTimePill } from '@/hooks/useTimePill';
import { useData } from '@/hooks/useData';
import { useStore } from '@/store/store';
import { viewPrefs } from '@/store/prefs';
import { applyFilters, pullQuick, rootItems, sortItems } from '@/store/selectors';
import { somedayItems, hasLabel, splitDust } from '@/domain/views';
import { summariseLoad } from '@/domain/load';
import type { TranslationKey } from '@/i18n';
import type { Item } from '@/domain/types';
import type { DropTarget, RowOrder, TaskPlacement } from '@/domain/dnd';

interface SimpleListViewProps {
  kind: 'someday' | 'inbox' | 'label' | 'filter';
  labelName?: string;
  /** The saved filter a `filter` page shows. */
  filterId?: string;
  onOpen: (id: string) => void;
  onInsights: () => void;
  onUnestimated: (items?: Item[]) => void;
  onAddTaskTo: (placement: TaskPlacement) => void;
  /** Opens the project sheet; the Inbox page's menu edits through it. */
  onProjectSheet?: (target: { mode: 'edit'; projectId: string }) => void;
}

/**
 * The pages whose content is one flat selection: Someday, Inbox, and any tag
 * page such as Quick, Automation or Waiting.
 *
 * Someday deliberately shows no capacity percentage: a backlog has no deadline
 * to measure itself against.
 */
/**
 * The priority a `priority` group's key stands for.
 *
 * A group only ever offers what its own heading already fixes. Priority is
 * one of those: a column headed P2 knows every task in it is a P2, so the
 * line at the bottom of it can say so and leave everything else alone.
 */
const priorityOf = (key: string): 1 | 2 | 3 | 4 | undefined => {
  const at = Number(key.replace('p', ''));
  return at >= 1 && at <= 4 ? (at as 1 | 2 | 3 | 4) : undefined;
};

/** The key a page's Display settings are kept under. */
const viewKeyOf = ({ kind, labelName, filterId }: Pick<SimpleListViewProps, 'kind' | 'labelName' | 'filterId'>) =>
  kind === 'label' ? `label:${labelName}` : kind === 'filter' ? `filter:${filterId}` : kind;

function SimpleListBody({
  kind, labelName, filterId, onOpen, onInsights, onUnestimated, onAddTaskTo, onProjectSheet,
}: SimpleListViewProps) {
  const { t } = useT();
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const inboxProject = kind === 'inbox'
    ? Object.values(useStore.getState().snapshot.projects).find((p) => p.inbox_project && !p.is_deleted)
    : undefined;
  const timePill = useTimePill();
  const { snapshot, items, childrenOf: allChildrenOf } = useData(viewKeyOf({ kind, labelName, filterId }));
  const prefs = useStore((s) => s.prefs);
  const [filterSheet, setFilterSheet] = useState<FilterSheetTarget>(null);
  const viewKey = viewKeyOf({ kind, labelName, filterId });
  const current = viewPrefs(prefs, viewKey);

  /* A filter's tasks are whatever Todoist says its query matches, subtasks
     included. A matching subtask whose parent matches too is drawn under it;
     one whose parent does not stands on its own, as in Todoist. A parent only
     opens onto the subtasks that match. */
  const filter = kind === 'filter' && filterId ? snapshot.filters?.[filterId] : undefined;
  const filterResult = useFilterResult(filter);
  const matched = useMemo(
    () => new Set(filterResult.parts?.flatMap((part) => part.ids) ?? []),
    [filterResult.parts],
  );
  const childrenOf = useMemo(
    () => (kind === 'filter'
      ? (id: string) => allChildrenOf(id).filter((child) => matched.has(child.id))
      : allChildrenOf),
    [kind, allChildrenOf, matched],
  );
  const filterPool = (ids: string[]): Item[] => ids
    .map((id) => snapshot.items[id])
    .filter((item): item is Item => Boolean(item) && !item.checked && !item.is_deleted
      && !(item.parent_id && matched.has(item.parent_id)));

  const pool0 = useMemo(() => {
    const roots = rootItems(items);
    let selection: Item[];

    if (kind === 'someday') {
      selection = somedayItems(roots);
    } else if (kind === 'inbox') {
      const inboxId = snapshot.user?.inbox_project_id;
      selection = inboxId ? roots.filter((i) => i.project_id === inboxId) : [];
    } else if (kind === 'filter') {
      const seen = new Set<string>();
      selection = filterPool(filterResult.parts?.flatMap((part) => part.ids) ?? [])
        .filter((item) => !seen.has(item.id) && Boolean(seen.add(item.id)));
    } else {
      selection = labelName ? roots.filter((i) => hasLabel(i, labelName)) : [];
    }

    return selection;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, kind, labelName, snapshot, filterResult.parts, matched]);
  const scoped = useMemo(
    () => applyFilters(pool0, current.filters, snapshot, childrenOf),
    [pool0, current.filters, snapshot, childrenOf],
  );

  /* The one flat list is drawn straight rather than through `ModeSurface`, and
     `ModeSurface` is what used to do the sorting: the sort in the display menu
     did nothing on these pages, and the order a task was put into could not
     show itself. */
  /* The Inbox is one project and is numbered like one. Un jour and a tag page
     gather tasks from every project, so they read the order Todoist keeps for
     lists like that. */
  const order: RowOrder = kind === 'inbox' ? 'project' : 'day';

  /* The quick tasks lead the page and are listed only there (#154). A board
     keeps its columns whole. */
  const split = useMemo(
    /* A filter shows what Todoist's query returns and nothing else, so its
       tasks stay in the lists the query draws rather than leaving for Quick. */
    () => kind === 'filter' || (current.mode === 'board' && current.group !== 'none')
      ? { quick: [], rest: scoped }
      : pullQuick(scoped, prefs.showQuickGroup, current.sort, childrenOf, order, snapshot),
    [kind, scoped, current.mode, current.group, current.sort, prefs.showQuickGroup, childrenOf, order, snapshot],
  );
  /* Under Quick, on Someday only: what has sat there for months (#161). Quick
     has taken its own already, so nothing is listed twice. The group is oldest
     first unless the Display sort asks for something else. */
  const dustKept = useStore((s) => s.dustKept);
  const dustSplit = useMemo(() => {
    if (kind !== 'someday' || !prefs.showDustGroup || current.mode === 'board') {
      return { dust: [], rest: split.rest };
    }
    const { dust, rest } = splitDust(split.rest, {
      months: prefs.dustAfterMonths, kept: dustKept,
    });
    return {
      dust: current.sort === 'manual' ? dust : sortItems(dust, current.sort, childrenOf, order, snapshot),
      rest,
    };
  }, [kind, split.rest, prefs.showDustGroup, prefs.dustAfterMonths, dustKept,
    current.mode, current.sort, childrenOf, order, snapshot]);
  const pool = dustSplit.rest;

  const ordered = useMemo(
    () => sortItems(pool, current.sort, childrenOf, order, snapshot),
    [pool, current.sort, childrenOf, order, snapshot],
  );

  const load = useMemo(
    () => summariseLoad(scoped, childrenOf, null),
    [scoped, childrenOf],
  );

  const title = kind === 'label'
    ? (labelName ?? '')
    : kind === 'filter' ? (filter?.name ?? '') : t(`nav.${kind}` as TranslationKey);

  /* What this page is, said twice: as the place a dropped task lands, and as
     the head start the composer opens with. */
  const inboxId = snapshot.user?.inbox_project_id;
  const dropTarget: DropTarget | undefined = kind === 'filter'
    ? undefined
    : kind === 'someday'
    ? { kind: 'someday' }
    : kind === 'inbox'
      ? (inboxId ? { kind: 'project', projectId: inboxId } : undefined)
      : (labelName ? { kind: 'label', label: labelName } : undefined);
  const addition = kind === 'someday' || kind === 'filter'
    ? {}
    : kind === 'inbox'
      ? { projectId: inboxId }
      : { labels: labelName ? [labelName] : [] };

  /* A column is somewhere to add a task when the column fixes something the
     composer can be opened with: a project, a tag, a priority. The line then
     fills in exactly that and nothing else — a P2 column knows the priority
     and knows nothing about the date.

     An estimate column is the exception and still gets no line: its heading
     is a range, and "under 15 minutes" is not a number the composer can be
     opened with. */
  const addToGroup = (key: string): (() => void) | undefined => {
    if (current.group === 'none') return () => onAddTaskTo(addition);
    if (current.group === 'project') return () => onAddTaskTo({ ...addition, projectId: key });
    if (current.group === 'label' && key !== 'none') {
      return () => onAddTaskTo({ ...addition, labels: [...(addition.labels ?? []), key] });
    }
    if (current.group === 'priority') {
      const priority = priorityOf(key);
      if (priority) return () => onAddTaskTo({ ...addition, priority });
    }
    return undefined;
  };

  /* One group at the top of the page. Each row says where it comes from: the
     project, and the section when it has one. It takes no drop and has no
     line to add a task. */
  const quickGroup = split.quick.length > 0 ? (
    <TaskGroup
      title={t('group.quick')}
      items={split.quick}
      childrenOf={childrenOf}
      onOpen={onOpen}
      showSection
      accent="quick"
    />
  ) : undefined;

  /* Under Quick, above everything else. It takes no drop and has no line to
     add a task: nothing is filed as dusty on purpose. */
  const dustGroup = dustSplit.dust.length > 0 ? (
    <TaskGroup
      title={t('group.dust')}
      subtitle={t('group.dustSince', { count: prefs.dustAfterMonths })}
      items={dustSplit.dust}
      childrenOf={childrenOf}
      onOpen={onOpen}
      accent="dust"
      dust
    />
  ) : undefined;
  const lead = quickGroup || dustGroup ? <>{quickGroup}{dustGroup}</> : undefined;
  /* The note is a row of the main list, under Quick and Dust. Where the page is
     not drawn as a list (a board, a grouping), it goes under the header. */
  const hireNoteOpen = useStore((s) => s.hireNote);
  const commaFilter = kind === 'filter' && (filterResult.parts?.length ?? 0) > 1
    && current.mode === 'list' && current.group === 'none';
  const flatList = !commaFilter && !(kind === 'filter' && (filterResult.error || !filter))
    && current.mode === 'list' && (current.group === 'none' || scoped.length === 0);
  const hireInList = commaFilter || flatList
    || (current.mode === 'list' && !(kind === 'filter' && (filterResult.error || !filter)));

  return (
    <div className="page">
      <PageHeader
        hireNote={!hireInList}
        title={filter ? <FilterTitle filter={filter} /> : kind === 'label' ? <LabelTitle name={title} /> : title}
        subtitle={filter ? <FilterDescription filter={filter} /> : undefined}
        actions={
          <>
            <DisplayMenu
              viewKey={viewKey}
              pageItems={pool0}
              modes={['list', 'board']}
              groups={['none', 'project', 'priority', 'label', 'estimate']}
            />
            <InsightsButton onClick={onInsights} />
            {filter && <FilterMenu filter={filter} onEdit={() => setFilterSheet({ mode: 'edit', filterId: filter.id })} />}
            {inboxProject && (
              <span className="pmenu-wrap">
                <button
                  className="iconbtn"
                  aria-label={t('project.actions')}
                  title={t('project.actions')}
                  aria-expanded={menuAnchor !== null}
                  aria-haspopup="menu"
                  onClick={(event) => {
                    const button = event.currentTarget;
                    setMenuAnchor((current) => (current ? null : button));
                  }}
                >
                  <Icon name="more" />
                </button>
                {menuAnchor && (
                  <ProjectMenu
                    project={inboxProject}
                    align="right"
                    anchor={menuAnchor}
                    onClose={() => setMenuAnchor(null)}
                    onEdit={() => onProjectSheet?.({ mode: 'edit', projectId: inboxProject.id })}
                  />
                )}
              </span>
            )}
          </>
        }
        load={load}
        onOpenUnestimated={load.unestimatedCount > 0 ? onUnestimated : undefined}
        time={timePill}
      />
      <TimePanel
        pageItems={scoped}
        pageLabel={title}
        onOpen={onOpen}
        onUnestimated={onUnestimated}
      />


      {/* The query itself is in the edit sheet, not on the page, as in Todoist. */}
      {kind === 'filter' && filter && ((filterResult.loading && filterResult.parts === null) || filterResult.stale) && (
        <p className="filterquery">
          {filterResult.stale ? t('filters.stale') : t('filters.loading')}
        </p>
      )}
      {kind === 'filter' && !filter && <p className="empty">{t('filters.missing')}</p>}
      {kind === 'filter' && filterResult.error && (
        <p className="empty filtererror" role="alert">{t('filters.refused', { reason: filterResult.error })}</p>
      )}

      {/* A query with commas is several lists, one under the other, each
          headed by its part of the query, as Todoist draws it. Grouping or a
          board from the Display menu takes over from these. */}
      {kind === 'filter' && (filterResult.parts?.length ?? 0) > 1
        && current.mode === 'list' && current.group === 'none' ? (
        <div className="mode">
          {lead}
          {filterResult.parts!.map((part, index) => {
            const own = new Set(filterPool(part.ids).map((item) => item.id));
            const shown = ordered.filter((item) => own.has(item.id));
            return (
              <TaskGroup
                key={`${index}-${part.query}`}
                title={part.query}
                items={shown}
                childrenOf={childrenOf}
                onOpen={onOpen}
                lead={index === 0 && hireNoteOpen ? <HireNote /> : undefined}
                keepWhenEmpty
              />
            );
          })}
        </div>
      ) : kind === 'filter' && (filterResult.error || !filter) ? null
      /* A list with nothing in it is drawn as the one flat list whatever it is
          grouped by: groups of nothing have no line to add a task, and an empty
          page is exactly where one is wanted. */
      : current.mode === 'list' && (current.group === 'none' || scoped.length === 0) ? (
        /* One flat list is one place, so it is a group of its own rather than
           a grouping of one: somewhere to drop a task, and a standing line to
           add one that already belongs here — in the Inbox, in the project;
           on a tag page, with the tag on. */
        <div className="mode">
          {lead}
          <TaskGroup
            items={ordered}
            lead={hireNoteOpen ? <HireNote /> : undefined}
            childrenOf={childrenOf}
            onOpen={onOpen}
            dropTarget={dropTarget}
            onAddTask={() => onAddTaskTo(addition)}
            keepWhenEmpty
            reorderable={order}
            viewKey={viewKey}
          />
        </div>
      ) : (
        <ModeSurface
          items={pool}
          lead={lead}
          firstGroupLead={hireNoteOpen ? <HireNote /> : undefined}
          /* A board with no grouping is its one column, led by Quick: blue,
             and a place to look rather than somewhere to drop. */
          boardColumns={current.mode === 'board' && current.group === 'none'
            ? [
                ...(split.quick.length > 0
                  ? [{ id: 'quick', title: t('group.quick'), items: split.quick, accent: 'quick' as const }]
                  : []),
                { id: 'all', title: t('common.all'), items: ordered },
              ]
            : undefined}
          childrenOf={childrenOf}
          mode={current.mode}
          group={current.group}
          sort={current.sort}
          onOpen={onOpen}
          order={order}
          addToGroup={addToGroup}
        />
      )}
      {kind === 'filter' && <FilterSheet target={filterSheet} onClose={() => setFilterSheet(null)} />}
    </div>
  );
}

export function SimpleListView(props: SimpleListViewProps) {
  const prefs = useStore((s) => s.prefs);
  const viewKey = viewKeyOf(props);
  return (
    <SubtasksProvider value={viewPrefs(prefs, viewKey).filters.showSubtasks}>
      <SimpleListBody {...props} />
    </SubtasksProvider>
  );
}
