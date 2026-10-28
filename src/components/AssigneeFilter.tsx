import { PersonAvatar } from './PersonAvatar';
import { MultiSelect } from './MultiSelect';
import { useStore } from '@/store/store';
import { useT } from '@/hooks/useT';
import { viewPrefs } from '@/store/prefs';
import { assigneeName, ME, UNASSIGNED } from '@/domain/assignees';

/** Everyone a task can be filtered by: Unassigned, me, then the people, by name. */
export function useAssigneeOptions(selected: string[] | null) {
  const { t } = useT();
  const snapshot = useStore((state) => state.snapshot);
  const ids = new Set([
    ...Object.keys(snapshot.collaborators),
    ...Object.values(snapshot.items).flatMap((item) => item.responsible_uid ? [item.responsible_uid] : []),
    ...(selected ?? []).filter((id) => id !== ME && id !== UNASSIGNED),
  ]);
  ids.delete(snapshot.user?.id ?? '');
  const people = [...ids].map((id) => ({ value: id, visual: <PersonAvatar id={id} decorative />, label: assigneeName(snapshot, id, t('assignee.unavailable')) })).sort((a, b) => a.label.localeCompare(b.label));
  return [{ value: UNASSIGNED, visual: <PersonAvatar id={null} decorative />, label: t('detail.unassigned') }, { value: ME, visual: <PersonAvatar id={snapshot.user?.id ?? null} decorative />, label: t('assignee.me') }, ...people];
}

/** The assignee choice on its own: the value is null for everyone, else the ids chosen. */
export function AssigneeSelect({ value, onChange, variant = 'field' }: {
  value: string[] | null; onChange: (assignees: string[] | null) => void; variant?: 'field' | 'toolbar';
}) {
  const { t } = useT();
  const options = useAssigneeOptions(value);
  return <MultiSelect icon="user" variant={variant} label={t('detail.assignee')} value={value}
    options={options} onChange={onChange} />;
}

export function AssigneeFilter({ viewKey, variant = 'field' }: { viewKey: string; variant?: 'field' | 'toolbar' }) {
  const prefs = useStore((state) => state.prefs);
  const setViewPrefs = useStore((state) => state.setViewPrefs);
  const current = viewPrefs(prefs, viewKey);
  return <AssigneeSelect variant={variant} value={current.filters.assignees ?? null}
    onChange={(assignees) => setViewPrefs(viewKey, { filters: { ...current.filters, assignees } })} />;
}
