import { PersonAvatar } from './PersonAvatar';
import { useProjectPeople } from '@/hooks/useProjectPeople';
import { Select } from './Select';
import { Icon } from './Icon';
import { useStore } from '@/store/store';
import { useT } from '@/hooks/useT';
import { assignees } from '@/domain/sharing';
import { assigneeName } from '@/domain/assignees';

export function AssigneeField({ projectId, value, onChange, chip = false, iconOnly = false }: {
  projectId: string; value: string | null; onChange: (value: string | null) => void; chip?: boolean; iconOnly?: boolean;
}) {
  const { t } = useT();
  const snapshot = useStore((state) => state.snapshot);
  const inbox = snapshot.projects[projectId]?.inbox_project || projectId === snapshot.user?.inbox_project_id;
  useProjectPeople(projectId, !iconOnly && !inbox);
  const people = assignees(snapshot, projectId);
  if (inbox || (!people.length && !value)) return null;
  if (snapshot.projects[projectId]?.can_assign_tasks === false) {
    return iconOnly ? (value ? <PersonAvatar id={value} /> : null) : <span className={chip ? "fselect-face chipface assignee-readonly" : "assignee-readonly"}>
      <PersonAvatar id={value} decorative />
      {value ? assigneeName(snapshot, value, t('assignee.unavailable')) : t('detail.unassigned')}
    </span>;
  }
  const missing = value && !people.some((person) => person.id === value);
  return <Select label={chip ? t('detail.assignee') : undefined} ariaLabel={t('detail.assignee')}
    variant={iconOnly ? 'icon' : chip ? 'chip' : 'field'} chipIcon={value ? <PersonAvatar id={value} /> : <Icon name="user" size="sm" />}
    value={value ?? ''} onChange={(id) => onChange(id || null)}
    options={[{ value: '', label: t('detail.unassigned'), visual: <PersonAvatar id={null} decorative /> },
      ...(missing ? [{ value, label: assigneeName(snapshot, value, t('assignee.unavailable')), visual: <PersonAvatar id={value} decorative /> }] : []),
      ...people.map((person) => ({ value: person.id, visual: <PersonAvatar id={person.id} decorative />, label: person.id === snapshot.user?.id ? `${t('assignee.me')} (${person.name})` : person.name }))]} />;
}
