import { useDataSnapshot } from '@/hooks/useDataSnapshot';
import { Icon } from './Icon';
import { DateField } from './DateField';
import { DurationField } from './DurationField';
import { MultiSelect } from './MultiSelect';
import { Select } from './Select';
import { useStore } from '@/store/store';
import { useT } from '@/hooks/useT';
import { effectiveEstimate, formatDuration } from '@/domain/estimates';
import { dateTone, isOverdue } from '@/domain/dates';
import { toDisplayPriority, toTodoistPriority, type Item, type TableColumn, type DisplayPriority } from '@/domain/types';
import { tableColumnLabel } from '@/domain/table';
import { markerStyle } from '@/domain/colors';
import { ProjectIcon } from './ProjectIcon';
import { AssigneeField } from './AssigneeField';
import { PersonAvatar } from './PersonAvatar';
import { assignees } from '@/domain/sharing';
import { readProjectIcon } from '@/domain/projectIcons';

/** Inline values use the same controls and store commands as task details. */
export function TableCells({ item, columns, childrenOf, hideProject = false }: { hideProject?: boolean; item: Item; columns: TableColumn[]; childrenOf: (id: string) => Item[] }) {
  const { t, locale } = useT();
  const snapshot = useDataSnapshot();
  const updateTask = useStore((s) => s.updateTask);
  const assignTask = useStore((s) => s.assignTask);
  const setEstimates = useStore((s) => s.setEstimates);
  const setTaskLabels = useStore((s) => s.setTaskLabels);
  const setRecurrence = useStore((s) => s.setRecurrence);
  const { minutes, computed } = effectiveEstimate(item, childrenOf);
  return <>{columns.filter((column) => column !== 'title').map((column) => {
    let content;
    if (column === 'date' || column === 'deadline') {
      const due = column === 'date';
      content = <DateField value={(due ? item.due?.date : item.deadline?.date) ?? ''}
        label={t(tableColumnLabel[column])} withTime={due}
        recurrence={due && item.due?.is_recurring ? { string: item.due.string, lang: item.due.lang } : null}
        onRecurrence={due ? (rule) => void setRecurrence(item.id, rule) : undefined}
        onClearRecurrence={due ? () => void updateTask(item.id, { due: item.due ? { ...item.due, is_recurring: false, string: item.due.date } : null }) : undefined}
        onChange={(date) => void updateTask(item.id, due ? {
          due: date ? { date, timezone: item.due?.timezone ?? null, string: item.due?.is_recurring ? item.due.string : date,
            lang: item.due?.lang ?? 'en', is_recurring: item.due?.is_recurring ?? false } : null,
        } : { deadline: date ? { date, lang: 'en' } : null })} />;
    } else if (column === 'priority') content = <Select ariaLabel={t('detail.priority')} value={String(toDisplayPriority(item.priority))}
      options={[1, 2, 3, 4].map((priority) => ({ value: String(priority), label: `P${priority}`,
        visual: <span className={`table-priority-mark p${priority}`}><Icon name="flag" size="sm" /></span> }))}
      onChange={(value) => void updateTask(item.id, { priority: toTodoistPriority(Number(value) as DisplayPriority) })} />;
    else if (column === 'estimate') content = computed ? <span>{formatDuration(minutes ?? 0, locale)} *</span>
      : <DurationField compact minutes={minutes} placeholder={t('table.noDuration')}
        onCommit={async (value) => { await setEstimates([{ id: item.id, minutes: value }]); }} />;
    else if (column === 'labels') content = <MultiSelect label={t('detail.labels')} allLabel={t('filter.anyTag')} value={item.labels.filter((label) => !label.startsWith('est-'))}
      face={item.labels.some((label) => !label.startsWith('est-'))
        ? <span className="cell-tags">{(() => {
          const names = item.labels.filter((label) => !label.startsWith('est-'));
          return <>{names.slice(0, 2).map((label) => <span className="tag" key={label}
            style={markerStyle(Object.values(snapshot.labels).find((entry) => entry.name === label)?.color)}><Icon name="tag" size="sm" />{label}</span>)}
          {/* In a narrow column the second tag gives way to a count that includes it (see .table-labels). */}
          {names.length > 2 && <span className="tag-more tag-more-wide">+{names.length - 2}</span>}
          {names.length > 1 && <span className="tag-more tag-more-narrow">+{names.length - 1}</span>}</>;
        })()}</span>
        : <span className="cell-tags is-none"><Icon name="plus" size="sm" /></span>}
      options={Object.values(snapshot.labels).filter((label) => !label.is_deleted && !label.name.startsWith('est-')).map((label) => ({ value: label.name, label: label.name }))}
      onChange={(labels) => void setTaskLabels(item.id, [...item.labels.filter((label) => label.startsWith('est-')),
        ...(labels ?? Object.values(snapshot.labels).filter((label) => !label.is_deleted && !label.name.startsWith('est-')).map((label) => label.name))])} />;
    else if (column === 'project') {
      const project = snapshot.projects[item.project_id];
      const section = item.section_id ? snapshot.sections[item.section_id] : undefined;
      const projectIcon = project ? readProjectIcon(project.description) : null;
      content = project && !hideProject ? (
        <span className="meta"><span className="proj" style={markerStyle(project.color)} title={section ? `${project.name} / ${section.name}` : project.name}>
          {project.inbox_project ? <Icon name="inbox" size="sm" /> : projectIcon ? <ProjectIcon iconId={projectIcon} size="sm" /> : '#'}
          <span className="project-section-name">{project.name}{section ? ` / ${section.name}` : ''}</span>
        </span></span>
      ) : '';
    }
    else if (column === 'assignee') {
      /* The picker is the task window's own. A project nobody else is in has nobody to pick, and shows the plain unassigned mark. */
      const inbox = snapshot.projects[item.project_id]?.inbox_project;
      const alone = inbox || (!item.responsible_uid && assignees(snapshot, item.project_id).length === 0);
      content = alone ? <span className="assign-alone" title={t('table.assignNeedsShare')}><PersonAvatar id={null} /></span> : <AssigneeField projectId={item.project_id} value={item.responsible_uid}
        onChange={(next) => void assignTask(item.id, next)} iconOnly />;
    }
    else content = item.description;
    return <div key={column} className={`table-cell table-${column}${column === 'date' ? ` tone-${isOverdue(item) ? 'late' : dateTone(item) ?? 'later'}` : ''}`}
      onClick={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>{content}</div>;
  })}</>;
}
