import { useEffect, useRef, useState } from 'react';
import { WorkspaceFilter } from './WorkspaceFilter';
import { AssigneeFilter } from './AssigneeFilter';
import { Icon } from './Icon';
import { useT } from '@/hooks/useT';
import { useStore } from '@/store/store';
import { viewPrefs } from '@/store/prefs';
import { defaultViewPrefs } from '@/domain/types';
import { PERSONAL_WORKSPACE } from '@/store/selectors';
import { MultiSelect } from './MultiSelect';
import type { DisplayPriority } from '@/domain/types';
import { PanelSheet } from '@/components/SheetChrome';

/** Dashboard filters apply to both open tasks and completion statistics. */
export function DashboardDisplayMenu() {
  const { t } = useT();
  const prefs = useStore((state) => state.prefs);
  const snapshot = useStore((state) => state.snapshot);
  const filters = viewPrefs(prefs, 'dashboard').filters;
  const defaults = defaultViewPrefs('dashboard').filters;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const workspaceChanged = filters.workspaces.length > 0 && ![PERSONAL_WORKSPACE, ...Object.keys(snapshot.workspaces)].every((id) => filters.workspaces.includes(id));
  const changed = Number(workspaceChanged) + Number(JSON.stringify(filters.assignees) !== JSON.stringify(defaults.assignees)) + Number(filters.priorities.length > 0) + Number(filters.labels.length > 0);
  useEffect(() => {
    if (!open) return;
    const outside = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);
  return <div className="displaywrap" ref={ref}>
    <button className="btn" aria-expanded={open} aria-haspopup="dialog" aria-label={t('toolbar.display')} onClick={() => setOpen((value) => !value)}>
      <Icon name="sliders" size="sm" /><span className="tb-label">{t('toolbar.display')}</span>
      {changed > 0 && <span className="displaycount">{changed}</span>}
    </button>
    {open && <PanelSheet className="popover displaypanel anchor-right" label={t('toolbar.display')} onClose={() => setOpen(false)}>
      <div className="panelhead"><h5>{t('toolbar.display')}</h5>
        <button className="resetbtn" onClick={() => useStore.getState().setViewPrefs('dashboard', { filters: defaults })}>{t('toolbar.resetAll')}</button>
      </div>
      <WorkspaceFilter viewKey="dashboard" />
      <AssigneeFilter viewKey="dashboard" />
      <MultiSelect icon="flag" label={t('filter.priorities')} allLabel={t('filter.anyPriority')}
        value={filters.priorities.length ? filters.priorities.map(String) : null}
        options={[1, 2, 3, 4].map(p => ({ value: String(p), label: `P${p}`, visual: <Icon name="flag" size="sm" style={{ color: `var(--p${p})` }} /> }))}
        onChange={next => useStore.getState().setViewPrefs('dashboard', { filters: { ...filters, priorities: next ? next.map(Number) as DisplayPriority[] : [] } })} />
      <MultiSelect icon="tag" label={t('filter.labels')} allLabel={t('filter.anyTag')}
        value={filters.labels.length ? filters.labels : null}
        options={Object.values(snapshot.labels).filter(label => !label.name.startsWith('est-')).map(label => ({ value: label.name, label: label.name }))}
        onChange={next => useStore.getState().setViewPrefs('dashboard', { filters: { ...filters, labels: next ?? [] } })} />
    </PanelSheet>}
  </div>;
}
