import { useCallback, useEffect, useMemo, useRef, useState, Fragment } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { SubtasksProvider } from '@/components/TaskRow';
import { DisplayMenu } from '@/components/DisplayMenu';
import { TaskGroup } from '@/components/TaskGroup';
import { ModeSurface } from '@/components/ModeSurface';
import { EditableDescription } from '@/components/EditableDescription';
import { EditableTitle } from '@/components/EditableTitle';
import { ProjectMenu } from '@/components/ProjectMenu';
import type { ProjectSheetTarget } from '@/components/overlays/ProjectSheet';
import { AddSectionLine } from '@/components/AddSectionLine';
import { useConfirm } from '@/components/overlays/Confirm';
import { Icon } from '@/components/Icon';
import { ProjectIcon, ProjectIconGrid } from '@/components/ProjectIconPicker';
import { markerStyle } from '@/domain/colors';
import { TimePanel } from '@/components/TimePanel';
import { useT } from '@/hooks/useT';
import { useTimePill } from '@/hooks/useTimePill';
import type { TaskPlacement } from '@/domain/dnd';
import { useData } from '@/hooks/useData';
import type { Item } from '@/domain/types';
import { useStore } from '@/store/store';
import { newUuid } from '@/api/commands';
import { viewPrefs } from '@/store/prefs';
import { applyFilters, pullQuick, rootItems, sortItems } from '@/store/selectors';
import { summariseLoad } from '@/domain/load';
import { readProjectIcon, stripProjectIcon, withProjectIcon } from '@/domain/projectIcons';
import { bySectionOrder } from '@/domain/orderKey';

interface ProjectViewProps {
  projectId: string;
  revealSectionId?: string;
  onOpen: (id: string) => void;
  onInsights: () => void;
  onUnestimated: (items?: Item[]) => void;
  /** Adds a task straight into a section of this project. */
  onAddTaskTo: (placement: TaskPlacement) => void;
  /** Opens the project sheet, to edit this one or add one beside it. */
  onProjectSheet: (target: ProjectSheetTarget) => void;
}

/**
 * A project page.
 *
 * By default the page is laid out by the project's own sections, which is how
 * the work is already organised in Todoist. Splitting it into scheduled and
 * available work stays available as an explicit grouping.
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

function ProjectBody({
  projectId, revealSectionId, onOpen, onInsights, onUnestimated, onAddTaskTo, onProjectSheet,
}: ProjectViewProps) {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [iconOpen, setIconOpen] = useState(false);
  useEffect(() => {
    if (!iconOpen) return;
    const away = (event: MouseEvent) => {
      if (!(event.target as HTMLElement).closest('.ptitle-icon')) setIconOpen(false);
    };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setIconOpen(false); };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', escape); };
  }, [iconOpen]);
  const { t } = useT();
  const timePill = useTimePill();
  const { snapshot, items, childrenOf } = useData();
  const prefs = useStore((s) => s.prefs);
  const updateProjectFields = useStore((s) => s.updateProjectFields);
  const updateSectionFields = useStore((s) => s.updateSectionFields);
  const createSection = useStore((s) => s.createSection);
  /* A section made here is drawn under a temporary id until Todoist answers.
     Keyed by the id it was born with, it stays the same element when the real
     one arrives: the field the name is being typed in is not rebuilt under the
     cursor (#186). */
  const resolvedIds = useStore((s) => s.resolvedIds);
  const bornAs = useMemo(
    () => Object.fromEntries(Object.entries(resolvedIds).map(([temp, real]) => [real, temp])),
    [resolvedIds],
  );
  const removeSection = useStore((s) => s.removeSection);
  const confirm = useConfirm();

  /* Deleting a section is always confirmed, and the confirmation says what
     becomes of its tasks: they stay in the project, without a section. */
  const deleteSection = async (group: { id: string; title: string; items: unknown[] }) => {
    const ok = await confirm({
      title: t('section.deleteTitle'),
      body: group.items.length === 0
        ? t('section.deleteEmpty', { name: group.title || t('section.untitled') })
        : t('section.deleteBody', {
            name: group.title || t('section.untitled'),
            count: group.items.length,
          }),
      confirmLabel: t('section.delete'),
      destructive: true,
    });
    if (ok) await removeSection(group.id);
  };

  /* Two clicks in a row on the same seam must not leave two unnamed sections
     with the cursor in neither (#186). */
  const lastAdded = useRef(0);
  const addSection = async (index: number) => {
    const now = Date.now();
    if (now - lastAdded.current < 700) return;
    lastAdded.current = now;

    /* The id is chosen here, before Todoist is asked: creating the section
       only answers after the round trip, by which time the section already
       has its real id and nothing is called by the temporary one. */
    const id = newUuid();
    const created = createSection(projectId, index, undefined, id);

    /* The field does not exist until React has rendered the new section, and
       one frame is not always enough. Poll briefly rather than guess a delay.
       The section may be asked for by its temporary id or, if Todoist has
       answered meanwhile, by the real one. */
    let tries = 0;
    const focus = () => {
      const real = useStore.getState().resolvedIds[id];
      const field = document.querySelector<HTMLInputElement>(
        `[data-section-name="${id}"], [data-section-name="${real ?? id}"]`,
      );
      field?.focus();
      field?.select();
      // The click that created the section also re-renders the list around it,
      // which hands focus back to the body; keep asking until it sticks.
      if (document.activeElement !== field && tries++ < 30) setTimeout(focus, 30);
    };
    setTimeout(focus, 30);
    await created;
  };
  const viewKey = `project:${projectId}`;
  const current = viewPrefs(prefs, viewKey);

  const project = snapshot.projects[projectId];

  /*
   * A completed task is not a section of its own — it belongs wherever its
   * own properties already put an open one: no section is the loose block
   * above the sections, a real section is that section, P1 is the P1 column.
   * So rather than a separate list, it's folded in here, upstream of every
   * grouping below, and comes out the other side sitting where it belongs.
   *
   * Todoist keeps a completed task in `snapshot.items` (checked, but
   * otherwise intact — see ReviewView's own DoneRow), which is what makes
   * this possible without a second fetch.
   */
  const scoped = useMemo(() => {
    const openRoots = rootItems(items).filter((i) => i.project_id === projectId);
    const roots = current.filters.showCompleted
      ? [
          ...openRoots,
          ...Object.values(snapshot.items).filter(
            (i) => i.project_id === projectId && i.checked && !i.is_deleted && !i.parent_id,
          ),
        ]
      : openRoots;
    return applyFilters(roots, current.filters, snapshot, childrenOf);
  }, [items, projectId, current.filters, snapshot, childrenOf]);

  const load = useMemo(() => summariseLoad(scoped, childrenOf, null), [scoped, childrenOf]);

  /* The quick tasks lead the list, above every section, and are listed only
     there (#154). A board grouped by something other than the sections keeps
     its columns whole. */
  const split = useMemo(
    () => current.mode === 'board' && current.group !== 'none'
      ? { quick: [], rest: scoped }
      : pullQuick(scoped, prefs.showQuickGroup, current.sort, childrenOf, 'project', snapshot),
    [scoped, current.mode, current.group, current.sort, prefs.showQuickGroup, childrenOf, snapshot],
  );
  const pool = split.rest;

  const sections = useMemo(
    () =>
      Object.values(snapshot.sections)
        .filter((s) => s.project_id === projectId && !s.is_archived && !s.is_deleted)
        .sort(bySectionOrder),
    [snapshot.sections, projectId],
  );

  const sorted = useCallback(
    (list: typeof scoped) => sortItems(list, current.sort, childrenOf, 'project', snapshot),
    [current.sort, childrenOf, snapshot],
  );

  /**
   * The tasks in the project itself, in no section.
   *
   * They lead the page, above the sections, and they are not given a heading:
   * "no section" is not a section, and putting them in a group called that
   * invents a container you never made and buries the loose work at the
   * bottom. The board has always read them this way; the list now agrees.
   */
  const looseItems = useMemo(
    () => sorted(pool.filter((i) => !i.section_id)),
    [pool, sorted],
  );

  const sectionGroups = useMemo(
    () =>
      sections.map((section) => ({
        id: section.id,
        title: section.name,
        items: sorted(pool.filter((i) => i.section_id === section.id)),
      })),
    [sections, pool, sorted],
  );

  useEffect(() => {
    if (!revealSectionId || !sections.some((section) => section.id === revealSectionId)) return;
    let cancelled = false;
    const reveal = () => {
      if (cancelled) return;
      const field = document.querySelector<HTMLElement>(`[data-section-name="${CSS.escape(revealSectionId)}"]`);
      const group = field?.closest<HTMLElement>('.group');
      if (!group) { window.setTimeout(reveal, 30); return; }
      group.scrollIntoView({ block: 'center', behavior: 'smooth' });
      group.classList.add('section-reveal');
      window.setTimeout(() => group.classList.remove('section-reveal'), 1800);
    };
    window.setTimeout(reveal, 0);
    return () => { cancelled = true; };
  }, [revealSectionId, sections]);

  const boardColumns = useMemo(
    () => [
      /* Quick leads the board as it leads the list: blue, listed once, and a
         place to look rather than somewhere to drop (#154). */
      ...(split.quick.length > 0 && current.mode === 'board'
        ? [{ id: 'quick', title: t('group.quick'), items: split.quick, accent: 'quick' as const }]
        : []),
      ...[
        // An empty "no section" column is noise; a real section stays, because
        // an empty column of your own is still somewhere to drop work. The
        // column keeps a name, unlike the list: a board column with no header
        // is a stack of cards floating beside labelled ones.
        ...(looseItems.length > 0
          ? [{ id: 'none', title: t('group.noSection'), items: looseItems }]
          : []),
        ...sectionGroups,
      ]
        .map((group) => ({
          id: group.id,
          title: group.title,
          items: group.items,
          dropTarget: {
            kind: 'section' as const,
            sectionId: group.id === 'none' ? null : group.id,
            projectId,
          },
          onAddTask: () => onAddTaskTo(
            group.id === 'none' ? { projectId } : { projectId, sectionId: group.id },
          ),
          onRename: group.id === 'none' ? undefined : (name: string) => void updateSectionFields(group.id, { name }),
        })),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- updateSectionFields comes from the store and is stable.
    [sectionGroups, looseItems, projectId, t, onAddTaskTo, split.quick, current.mode],
  );

  if (!project) {
    return <div className="page"><p className="empty">{t('common.error')}</p></div>;
  }

  // A Kanban is only offered where sections exist to give it columns.

  /* One group for the whole page, never one per section, and no empty one. It
     says which section each task comes from; the page already says the
     project. It takes no drop and has no line to add a task. */
  const quickGroup = split.quick.length > 0 ? (
    <TaskGroup
      title={t('group.quick')}
      items={split.quick}
      childrenOf={childrenOf}
      onOpen={onOpen}
      showProject={false}
      showSection
      accent="quick"
    />
  ) : undefined;

  return (
    <div className="page">
      <PageHeader
        title={
          <span className="ptitle-row">
            {/* The project's mark, in front of its name: pressing it opens the
                same icon choice the project sheet has. */}
            {project.inbox_project ? (
              /* The Inbox is not yours to rename, recolour or give an icon. */
              <span className="ptitle-icon">
                <span className="ptitle-mark static" aria-hidden="true">
                  <span className="hash" style={markerStyle(project.color)}><Icon name="inbox" /></span>
                </span>
              </span>
            ) : (
            <span className="ptitle-icon">
              <button
                type="button"
                className="ptitle-mark"
                aria-label={t('project.changeIcon')}
                title={t('project.changeIcon')}
                aria-expanded={iconOpen}
                onClick={() => setIconOpen((open) => !open)}
              >
                <span className="hash" style={markerStyle(project.color)}>
                  {readProjectIcon(project.description)
                    ? <ProjectIcon iconId={readProjectIcon(project.description)!} style={{ color: 'inherit' }} />
                    : '#'}
                </span>
              </button>
              {iconOpen && (
                <div className="popover ptitle-icons" role="dialog" aria-label={t('project.icon')}>
                  <ProjectIconGrid
                    value={readProjectIcon(project.description)}
                    onPick={(iconId) => {
                      void updateProjectFields(projectId, {
                        description: withProjectIcon(stripProjectIcon(project.description), iconId),
                      });
                      setIconOpen(false);
                    }}
                  />
                </div>
              )}
            </span>
            )}
            {project.inbox_project ? (
              <h1 className="titlefield static">{project.name}</h1>
            ) : (
              <EditableTitle
                value={project.name}
                label={t('project.rename')}
                onCommit={(next) => void updateProjectFields(projectId, { name: next })}
              />
            )}
          </span>
        }
        subtitle={project.inbox_project ? undefined : (
          <EditableDescription
            value={stripProjectIcon(project.description)}
            placeholder={t('project.editDescription')}
            /* An icon chosen from the project sheet rides on the end of the
               same field (see domain/projectIcons.ts) — editing the visible
               text here must not carry it off. */
            onCommit={(next) => void updateProjectFields(projectId, {
              description: withProjectIcon(next, readProjectIcon(project.description)),
            })}
          />
        )}
        actions={
          <>
            <DisplayMenu
              viewKey={viewKey}
              modes={['list', 'board']}
              groups={['none', 'scheduled', 'priority', 'label', 'estimate', 'day']}
              completedToggle
              showWorkspaces={false}
            />
            <button className="btn accent" onClick={onInsights}>
              <Icon name="trend" />
              {t('toolbar.insights')}
            </button>
            {/* The same menu the sidebar row carries, asked from the page it
                is about. */}
            <span className="pmenu-wrap">
              <button
                className="iconbtn"
                aria-label={t('project.actions')}
                title={t('project.actions')}
                aria-expanded={menuAnchor !== null}
                aria-haspopup="menu"
                onClick={(event) => {
                  /* Read out of the event now: a state updater runs after the
                     handler returns, and React has emptied currentTarget by
                     then, so the menu would open with nothing to hang from. */
                  const button = event.currentTarget;
                  setMenuAnchor((current) => (current ? null : button));
                }}
              >
                <Icon name="more" />
              </button>
              {menuAnchor && (
                <ProjectMenu
                  project={project}
                  align="right"
                  anchor={menuAnchor}
                  onClose={() => setMenuAnchor(null)}
                  onEdit={() => onProjectSheet({ mode: 'edit', projectId })}
                />
              )}
            </span>
          </>
        }
        load={load}
        onOpenUnestimated={load.unestimatedCount > 0 ? onUnestimated : undefined}
        time={timePill}
      />
      <TimePanel
        pageItems={scoped}
        pageLabel={project.name}
        onOpen={onOpen}
        onUnestimated={onUnestimated}
      />


      {current.mode === 'board' ? (
        <ModeSurface
          items={scoped}
          childrenOf={childrenOf}
          mode="board"
          viewKey={viewKey}
          group={current.group}
          sort={current.sort}
          onOpen={onOpen}
          showProject={false}
          boardColumns={current.group === 'none' ? boardColumns : undefined}
          /* The board is the project's sections side by side, so it can add
             one too, without a trip to the list (#108). */
          onAddSection={current.group === 'none'
            ? (name) => { void createSection(projectId, sections.length, name); }
            : undefined}
          addToGroup={(key) => {
            if (current.group === 'day' && key !== 'none') {
              return () => onAddTaskTo({ projectId, date: key });
            }
            if (current.group === 'label' && key !== 'none') {
              return () => onAddTaskTo({ projectId, labels: [key] });
            }
            if (current.group === 'priority') {
              const priority = priorityOf(key);
              if (priority) return () => onAddTaskTo({ projectId, priority });
            }
            return () => onAddTaskTo({ projectId });
          }}
        />
      ) : current.mode === 'list' && current.group === 'none' ? (
        <div className="mode">
          {quickGroup}
          {/* The project's own tasks, first and unlabelled: they are in the
              project, not in a section that happens to be called nothing. */}
          <TaskGroup
            items={looseItems}
            childrenOf={childrenOf}
            onOpen={onOpen}
            showProject={false}
            dropTarget={{ kind: 'section', sectionId: null, projectId }}
            onAddTask={() => onAddTaskTo({ projectId })}
            /* A row dropped into another's place under a sort that would put
               it straight back used to be refused the drop. It is taken now,
               and the sort gives way instead: putting a task somewhere by
               hand is the whole of what "arranged by hand" means. */
            reorderable="project"
            viewKey={viewKey}
            /* A project with everything in sections still needs somewhere to
               put a task that belongs in none of them. */
            keepWhenEmpty
          />
          {sectionGroups.map((group, index) => (
            <Fragment key={bornAs[group.id] ?? group.id}>
            <AddSectionLine
              label={t('section.add')}
              slotId={String(index)}
              onAdd={() => void addSection(index)}
            />
            <TaskGroup
              title={group.title}
              sectionId={group.id}
              projectId={projectId}
              onRename={(name) => void updateSectionFields(group.id, { name })}
              onDelete={() => void deleteSection(group)}
              items={group.items}
              childrenOf={childrenOf}
              onOpen={onOpen}
              showProject={false}
              dropTarget={{ kind: 'section', sectionId: group.id, projectId }}
              onAddTask={() => onAddTaskTo({ projectId, sectionId: group.id })}
              reorderable="project"
              viewKey={viewKey}
            />
            </Fragment>
          ))}
          <AddSectionLine
            label={t('section.add')}
            slotId={String(sections.length)}
            onAdd={() => void addSection(sections.length)}
          />
          {scoped.length === 0 && <p className="empty">{t('task.noTasks')}</p>}
        </div>
      ) : current.mode === 'list' && current.group === 'scheduled' ? (
        <div className="mode">
          {quickGroup}
          <TaskGroup
            title={t('section.scheduled')}
            items={sorted(pool.filter((i) => i.due !== null))}
            childrenOf={childrenOf}
            onOpen={onOpen}
            showProject={false}
            onAddTask={() => onAddTaskTo({ projectId })}
          />
          <TaskGroup
            title={t('section.available')}
            items={sorted(pool.filter((i) => i.due === null))}
            childrenOf={childrenOf}
            onOpen={onOpen}
            showProject={false}
            onAddTask={() => onAddTaskTo({ projectId })}
          />
          {scoped.length === 0 && <p className="empty">{t('task.noTasks')}</p>}
        </div>
      ) : (
        <ModeSurface
          items={pool}
          lead={quickGroup}
          childrenOf={childrenOf}
          mode={current.mode}
          viewKey={viewKey}
          group={current.group}
          sort={current.sort}
          onOpen={onOpen}
          showProject={false}
          /* A day column and a tag column are places inside this project; a
             priority column is not one, and says nothing. */
          /* The page already fixes the project; the column fixes one more
             thing. Grouped by priority there was no line at all, which made
             no sense on the one page where both halves of the answer are
             known. */
          addToGroup={(key) => {
            if (current.group === 'day' && key !== 'none') {
              return () => onAddTaskTo({ projectId, date: key });
            }
            if (current.group === 'label' && key !== 'none') {
              return () => onAddTaskTo({ projectId, labels: [key] });
            }
            if (current.group === 'priority') {
              const priority = priorityOf(key);
              if (priority) return () => onAddTaskTo({ projectId, priority });
            }
            if (current.group === 'section') {
              return () => onAddTaskTo({ projectId, sectionId: key === 'none' ? undefined : key });
            }
            return () => onAddTaskTo({ projectId });
          }}
        />
      )}
    </div>
  );
}

export function ProjectView(props: ProjectViewProps) {
  const prefs = useStore((s) => s.prefs);
  return (
    <SubtasksProvider value={viewPrefs(prefs, `project:${props.projectId}`).filters.showSubtasks}>
      <ProjectBody {...props} />
    </SubtasksProvider>
  );
}
