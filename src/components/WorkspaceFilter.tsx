import { useState } from 'react';
import { MultiSelect } from './MultiSelect';
import { useStore } from '@/store/store';
import { viewPrefs } from '@/store/prefs';
import { PERSONAL_WORKSPACE } from '@/store/selectors';
import { useT } from '@/hooks/useT';

export function WorkspaceAvatar({ logo, name, id, small = false }: { logo?: string | null; name: string; id: string; small?: boolean }) {
  const [failed, setFailed] = useState<string | null>(null);
  const hash = Array.from(id).reduce((value, char) => (value * 31 + char.codePointAt(0)!) >>> 0, 0);
  const background = `hsl(${hash % 360} 45% 32%)`;
  return <span className={`workspace-avatar${small ? ' small' : ''}`} aria-hidden="true" style={{ background }}>{logo && failed !== logo
    ? <img src={logo} alt="" referrerPolicy="no-referrer" onError={() => setFailed(logo)} />
    : Array.from(name.trim())[0]?.toLocaleUpperCase() ?? '?'}</span>;
}

export function WorkspaceFilter({ viewKey }: { viewKey: string }) {
  const { t } = useT();
  const snapshot = useStore((state) => state.snapshot);
  const prefs = useStore((state) => state.prefs);
  const current = viewPrefs(prefs, viewKey);
  const workspaces = Object.values(snapshot.workspaces);
  if (!workspaces.length) return null;
  const selected = current.filters.workspaces;
  const legacy = viewKey === 'matrix' ? prefs.eisenhowerWorkspace : null;
  return <MultiSelect icon="group" label={t('filter.workspaces')} allLabel={t('filter.anyWorkspace')}
    value={selected.length ? selected : legacy ? [legacy] : null}
    options={[{ value: PERSONAL_WORKSPACE, label: t('nav.myProjects'), visual: <WorkspaceAvatar id={PERSONAL_WORKSPACE} name={t('nav.myProjects')} logo={snapshot.user?.avatar_big} /> },
      ...workspaces.map((workspace) => ({ value: workspace.id, label: workspace.name, visual: <WorkspaceAvatar id={workspace.id} name={workspace.name} logo={workspace.logo_big} /> }))]}
    onChange={(selection) => {
      const state = useStore.getState();
      if (viewKey === 'matrix') state.setPrefs({ eisenhowerWorkspace: null });
      state.setViewPrefs(viewKey, { filters: { ...current.filters, workspaces: selection === null ? [] : selection.length ? selection : ['@none'] } });
    }} />;
}
