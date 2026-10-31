import { useEffect, useMemo, useState } from 'react';
import { subDays } from 'date-fns';
import { buildDemoCompleted } from '@/demo/demoData';
import { useStore } from '@/store/store';
import { useT } from '@/hooks/useT';
import { navigate } from '@/hooks/useRoute';
import { fetchProjectCounts, fetchWorkspaceArchive, fetchWorkspaceCollection, updateWorkspaceRole, type WorkspaceMember } from '@/api/workspaces';
import { fetchCompleted } from '@/api/completed';
import { elapsed, weeklyCompletions, weeksStart } from '@/domain/workspaceStats';
import { WorkspaceAvatar } from '@/components/WorkspaceFilter';
import { ProjectIcon } from '@/components/ProjectIconPicker';
import { readProjectIcon } from '@/domain/projectIcons';
import { loadPrefs, savePrefs } from '@/db/idb';
import type { TranslationKey } from '@/i18n';
import type { Project } from '@/domain/types';
import { markerStyle } from '@/domain/colors';
import { Icon } from '@/components/Icon';
import { projectTree, type ProjectNode } from '@/store/selectors';
import { intlDate } from '@/lib/intl';

interface WorkspaceExtra { archive?: Project[]; members?: WorkspaceMember[]; projects?: Project[]; counts?: Record<string, number>; weeks?: Record<string, number[]> }
export function WorkspaceView({ workspaceId }: { workspaceId: string }) {
  const { t, locale } = useT();
  const snapshot = useStore((s) => s.snapshot);
  const demo = useStore((s) => s.demo);
  const demoCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (demo) for (const item of buildDemoCompleted(locale)) counts[item.project_id] = (counts[item.project_id] ?? 0) + 1;
    return counts;
  }, [demo, locale]);
  const connected = useStore((s) => s.connected);
  const syncOffline = useStore((s) => s.syncState === 'offline');
  const offline = !connected || syncOffline;
  const [extra, setExtra] = useState<WorkspaceExtra>({});
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'projects' | 'people'>('projects');
  const [folded, setFolded] = useState<Record<string, boolean>>({});
  const [showArchive, setShowArchive] = useState(false);
  const [roles, setRoles] = useState<Record<string, string>>({});
  const [roleFailed, setRoleFailed] = useState(false);
  const personal = workspaceId === 'personal';
  const account = snapshot.user?.id;
  useEffect(() => {
    if (demo || !account) return;
    const controller = new AbortController();
    const key = `workspace:${account}:${workspaceId}`;
    setLoading(!offline && navigator.onLine);
    setFailed(false);
    void (async () => {
      const cached = await loadPrefs<WorkspaceExtra>(key);
      if (controller.signal.aborted) return;
      if (cached) setExtra(cached);
      if (offline || !navigator.onLine) return;
      const encoded = encodeURIComponent(workspaceId);
      const now = new Date();
      const [a, m, p, c, w] = await Promise.allSettled([
        fetchWorkspaceArchive(workspaceId, controller.signal),
        personal ? Promise.resolve([]) : fetchWorkspaceCollection<WorkspaceMember>(`/workspaces/users?workspace_id=${encoded}`, 'workspace_users', controller.signal),
        personal ? Promise.resolve(undefined) : fetchWorkspaceCollection<Project>(`/workspaces/${encoded}/projects/active`, 'workspace_projects', controller.signal),
        fetchProjectCounts(controller.signal),
        fetchCompleted(weeksStart(now), now, controller.signal).then((items) => weeklyCompletions(items, now)),
      ]);
      if (controller.signal.aborted) return;
      setFailed([a, m, p, c, w].some((result) => result.status === 'rejected'));
      const next = { ...cached, ...(a.status === 'fulfilled' ? { archive: a.value } : {}),
        ...(m.status === 'fulfilled' ? { members: m.value } : {}), ...(p.status === 'fulfilled' ? { projects: p.value } : {}),
        ...(c.status === 'fulfilled' ? { counts: c.value } : {}), ...(w.status === 'fulfilled' ? { weeks: w.value } : {}) };
      setExtra(next);
      setLoading(false);
      await savePrefs(key, next);
    })();
    return () => controller.abort();
  }, [workspaceId, personal, demo, offline, account, snapshot.syncedAt]);
  const belongs = (project: Project) => !project.is_deleted && (personal ? !project.workspace_id : project.workspace_id === workspaceId);
  const entries = useMemo(() => {
    const result: { project: Project; depth: number; projectCount: number }[] = [];
    const countProjects = (node: ProjectNode): number => (node.project.is_folder ? 0 : 1) + node.children.reduce((sum, child) => sum + countProjects(child), 0);
    const visit = (node: ProjectNode, depth: number) => {
      result.push({ project: node.project, depth, projectCount: countProjects(node) });
      if (!node.project.is_folder || !folded[node.project.id]) node.children.forEach((child) => visit(child, depth + 1));
    };
    projectTree(snapshot).find((group) => (group.workspaceId ?? 'personal') === workspaceId)
      ?.roots.forEach((node) => visit(node, 0));
    const seen = new Set(result.map(({ project }) => project.id));
    for (const project of extra.projects ?? []) {
      if (!seen.has(project.id) && !project.is_deleted && !project.is_archived && !project.is_folder) {
        result.push({ project, depth: 0, projectCount: 1 });
        seen.add(project.id);
      }
    }
    return result;
  }, [snapshot, extra.projects, workspaceId, folded]);
  const projects = entries.filter(({ project }) => !project.is_folder).map(({ project }) => project);
  const demoArchive = projects[0] ? [{ ...projects[0], id: 'demo-archive', name: t('workspace.demoArchive'), is_archived: true, archived_date: subDays(new Date(), 200).toISOString() }] : [];
  const archive = demo ? [...Object.values(snapshot.projects).filter((p) => belongs(p) && p.is_archived), ...demoArchive] : extra.archive;
  const members = (demo ? [{ user_id: 'demo-user', full_name: snapshot.user?.full_name ?? 'Sam', user_email: snapshot.user?.email ?? '', role: 'ADMIN' }, { user_id: 'demo-alex', full_name: 'Alex Martin', user_email: 'alex@example.com', role: 'MEMBER' }] : extra.members)?.filter((member) => !member.is_deleted);
  const weeks = demo ? weeklyCompletions(buildDemoCompleted(locale), new Date()) : extra.weeks;
  const now = new Date();
  const dateFormat = intlDate(locale === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const rows = entries.map(({ project, depth, projectCount }) => {
    const items = Object.values(snapshot.items).filter((item) => item.project_id === project.id && !item.is_deleted);
    const active = snapshot.projects[project.id] ? items.filter((item) => !item.checked).length : undefined;
    const completed = demo ? (demoCounts[project.id] ?? 0) + items.filter((item) => item.checked).length : extra.counts !== undefined && snapshot.projects[project.id] ? extra.counts[project.id] ?? 0 : snapshot.completedProjectCounts?.[project.id];
    const progress = active !== undefined && completed !== undefined ? (active + completed ? Math.round(100 * completed / (active + completed)) : 0) : undefined;
    return { project, depth, projectCount, active, completed, progress };
  });
  const me = members?.find((member) => member.user_id === snapshot.user?.id);
  const canEditRoles = demo || me?.role === 'ADMIN';
  const changeRole = async (member: WorkspaceMember, role: string) => {
    const previous = roles[member.user_id] ?? member.role;
    setRoleFailed(false);
    setRoles((all) => ({ ...all, [member.user_id]: role }));
    if (demo) return;
    try { await updateWorkspaceRole(workspaceId, member.user_id, role); } catch { setRoles((all) => ({ ...all, [member.user_id]: previous })); setRoleFailed(true); }
  };
  const openProject = (project: Project) => snapshot.projects[project.id] ? navigate('project', project.id) : window.open(`https://app.todoist.com/app/project/${encodeURIComponent(project.id)}`, '_blank', 'noopener,noreferrer');
  const title = personal ? t('nav.myProjects') : snapshot.workspaces[workspaceId]?.name ?? t('group.workspace');
  const marker = (project: Project) => {
    const icon = readProjectIcon(project.description);
    return <span className="workspace-icon" style={markerStyle(project.color)} aria-hidden="true">
      {project.inbox_project ? <Icon name="inbox" size="sm" /> : icon ? <ProjectIcon iconId={icon} size="sm" /> : '#'}</span>;
  };
  const ring = (progress: number | undefined, name: string) => <span className="workspace-progress" role="img" aria-label={progress === undefined ? undefined : `${name}: ${progress}%`}>
    <span className="workspace-progress-track"><i style={{ width: `${progress ?? 0}%` }} /></span>
    <span>{progress === undefined ? '—' : `${progress}%`}</span></span>;
  const peopleSection = <section className="workspace-section" role="tabpanel">
    {loading && !members ? <p>{t('common.loading')}</p> : members === undefined ? <p>{t('workspace.unavailable')}</p>
      : members.length === 0 ? <p className="empty">{t('workspace.noPeople')}</p>
      : members.map((member) => {
        const role = roles[member.user_id] ?? member.role;
        const label = (value: string) => ['ADMIN', 'MEMBER', 'GUEST'].includes(value) ? t(`workspace.role.${value}` as TranslationKey) : value;
        return <div className="workspace-person" key={member.user_id}>
          <WorkspaceAvatar id={member.user_id} name={member.full_name} />
          <span className="workspace-who"><strong>{member.full_name}</strong>{member.user_email && <small>{member.user_email}</small>}</span>
          {canEditRoles && ['ADMIN', 'MEMBER', 'GUEST'].includes(role) && member.user_id !== snapshot.user?.id
            ? <select className="workspace-role" aria-label={`${member.full_name}: ${t('workspace.role')}`} value={role} onChange={(event) => void changeRole(member, event.target.value)}>
              {['ADMIN', 'MEMBER', 'GUEST'].map((value) => <option key={value} value={value}>{label(value)}</option>)}</select>
            : <span className="workspace-role static">{label(role)}</span>}
        </div>;
      })}
    {roleFailed && <p role="status">{t('workspace.roleFailed')}</p>}
  </section>;
  const meta = (done: number | undefined, open: number | undefined) => done === undefined || open === undefined ? null : <span className="workspace-meta">
    <i aria-hidden="true">·</i><span><b>{done}</b>/{done + open} {t('workspace.completedLabel')}</span><i aria-hidden="true">·</i><span>{t('workspace.openLabel', { count: open })}</span></span>;
  const archived = (archive ?? []).filter((p) => !p.is_deleted && !p.is_folder);
  const archivedProgress = (project: Project) => {
    const open = Object.values(snapshot.items).filter((item) => item.project_id === project.id && !item.is_deleted && !item.checked).length;
    const done = demo ? demoCounts[project.id] : extra.counts?.[project.id];
    return done === undefined ? undefined : { done, open, progress: done + open ? Math.round(100 * done / (done + open)) : 0 };
  };
  return <div className="workspace-page">
    <div className="phead workspace-head">
      <WorkspaceAvatar id={personal ? 'personal' : workspaceId} name={title} logo={personal ? snapshot.user?.avatar_big : snapshot.workspaces[workspaceId]?.logo_big} />
      <h1 className="ptitle">{title}</h1>
    </div>
    {failed && <p role="status">{t('workspace.unavailable')}</p>}
    {offline && !demo && <p role="status">{t('workspace.cached')}</p>}
    <div className="workspace-toolbar">
      {!personal && <div className="workspace-tabs" role="tablist" aria-label={t('group.workspace')}>
        <button role="tab" aria-selected={tab === 'projects'} onClick={() => setTab('projects')}>{t('nav.projects')}</button>
        <button role="tab" aria-selected={tab === 'people'} onClick={() => setTab('people')}>{t('workspace.people')}{members && <span>{members.length}</span>}</button>
      </div>}
      {tab === 'projects' && <button type="button" role="switch" aria-checked={showArchive} className={`workspace-switch${showArchive ? ' on' : ''}`} onClick={() => setShowArchive((on) => !on)}><i aria-hidden="true" />{t('workspace.showArchived')}</button>}
    </div>
    {tab === 'people' && !personal ? peopleSection : <div role={personal ? undefined : 'tabpanel'}>
      <div className="workspace-projects">
        <div className="workspace-project workspace-columns"><span>{t('group.project')}</span><span>{t('workspace.progress')}</span><span>{t('workspace.last8Weeks')}</span><span>{t('workspace.openForHead')}</span></div>
        {rows.map(({ project, depth, projectCount, active, completed, progress }) => {
          if (project.is_folder) return <button key={project.id} type="button" className="workspace-folder" style={{ marginLeft: depth * 20, width: `calc(100% - ${depth * 20}px)` }}
            aria-expanded={!folded[project.id]} onClick={() => setFolded((previous) => ({ ...previous, [project.id]: !previous[project.id] }))}>
            <Icon name={folded[project.id] ? 'caret' : 'caret-up'} size="sm" className="workspace-folder-caret" />
            <span className="workspace-icon workspace-folder-icon"><Icon name="project" size="sm" /></span>
            <span className="workspace-name"><strong>{project.name}</strong><small>{t('workspace.projectCount', { count: projectCount })}</small></span>
          </button>;
          const created = project.created_at ? new Date(project.created_at) : null;
          const series = weeks?.[project.id] ?? (weeks ? Array.from({ length: 8 }, () => 0) : undefined);
          const top = Math.max(1, ...(series ?? [0]));
          return <div className="workspace-project" key={project.id} style={{ paddingLeft: depth * 20 }}>
            <button className="workspace-project-name" title={project.name} style={markerStyle(project.color)} onClick={() => openProject(project)}>
              {marker(project)}
              <span className="workspace-name"><span>{project.name}</span>
                {meta(completed, active)}</span>
            </button>
            {ring(progress, project.name)}
            <span className="workspace-spark" style={markerStyle(project.color)} aria-label={series ? t('workspace.sparkLabel', { counts: series.join(', ') }) : undefined}>
              {series ? series.map((value, at) => <i key={at} style={{ height: `${3 + Math.round(17 * value / top)}px` }} />) : '—'}</span>
            <span className="workspace-when">{created && Number.isFinite(created.getTime()) ? t('workspace.openFor', { time: elapsed(created, now, locale, t('workspace.today')) }) : ''}</span>
          </div>;
        })}
        {entries.length === 0 && <p className="empty">{t('nav.noProjectsYet')}</p>}
      </div>
      {!demo && extra.counts === undefined && projects.some((project) => snapshot.completedProjectCounts?.[project.id] === undefined) && <p className="psub">{t('workspace.countsPending')}</p>}
      {showArchive && <section className="workspace-section">
        <h2>{t('workspace.archive')}</h2>
        {archive === undefined ? <p>{loading ? t('common.loading') : t('workspace.unavailable')}</p> : archived.length === 0 ? <p className="empty">{t('workspace.noArchive')}</p>
          : <div className="workspace-projects">{archived.map((project) => {
            const when = project.archived_date ? new Date(project.archived_date) : null;
            const stats = archivedProgress(project);
            return <a className="workspace-project workspace-archive" key={project.id} onClick={demo ? (event) => event.preventDefault() : undefined} href={`https://app.todoist.com/app/project/${encodeURIComponent(project.id)}`} target="_blank" rel="noopener noreferrer" style={markerStyle(project.color)}>
              <span className="workspace-project-name">{marker(project)}
                <span className="workspace-name"><span>{project.name}</span>
                  {meta(stats?.done, stats?.open)}</span></span>
              {ring(stats?.progress, project.name)}
              <span />
              <span className="workspace-when">{when && Number.isFinite(when.getTime()) ? t('workspace.archivedOn', { date: dateFormat.format(when) }) : ''}</span>
            </a>;
          })}</div>}
      </section>}
    </div>}
  </div>;
}
