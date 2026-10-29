import { useDataSnapshot } from '@/hooks/useDataSnapshot';
import { useProjectPeople } from '@/hooks/useProjectPeople';
import { useEffect, useMemo, useState } from 'react';
import { Overlay } from './Overlay';
import { Icon } from '../Icon';
import { Select } from '../Select';
import { useT } from '@/hooks/useT';
import { useStore } from '@/store/store';
import { PersonAvatar } from '../PersonAvatar';
import { WorkspaceAvatar } from '../WorkspaceFilter';
import { copyText, todoistProjectUrl } from '@/api/links';
import { accessChoices, accessOf, isAccessLevel } from '@/domain/projectAccess';
import { isSharedWithMe, OFFERED_ROLES, projectPeople, ROLES } from '@/domain/sharing';
import type { TranslationKey } from '@/i18n';

const LOOKS_LIKE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Who a project is shared with: invite by e-mail, and take somebody out.
 *
 * The role is asked only in a workspace project, which is where Todoist
 * reads one; elsewhere an invitation carries none. Nothing here has been run
 * against a second Todoist account.
 */
export function ShareSheet({ projectId, onClose }: { projectId: string | null; onClose: () => void }) {
  const { t } = useT();
  useProjectPeople(projectId ?? undefined);
  const snapshot = useDataSnapshot();
  const shareProject = useStore((s) => s.shareProject);
  const removeCollaborator = useStore((s) => s.removeCollaborator);
  const changeRole = useStore((s) => s.changeRole);
  const leaveProject = useStore((s) => s.leaveProject);
  const toast = useStore((s) => s.toast);
  const updateProjectFields = useStore((s) => s.updateProjectFields);
  const project = projectId ? snapshot.projects[projectId] : undefined;
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<string>('');
  const [invalid, setInvalid] = useState(false);
  /** Who was just invited, said for a few seconds so an invitation never looks like nothing happened. */
  const [sent, setSent] = useState<string | null>(null);

  useEffect(() => { if (projectId) { setEmail(''); setRole(''); setInvalid(false); setSent(null); } }, [projectId]);
  useEffect(() => {
    if (!sent) return;
    const timer = window.setTimeout(() => setSent(null), 5000);
    return () => window.clearTimeout(timer);
  }, [sent]);

  const people = useMemo(
    () => (projectId ? projectPeople(snapshot, projectId) : []),
    [snapshot, projectId],
  );
  const inWorkspace = Boolean(project?.workspace_id);
  const me = snapshot.user;
  const canManage = project?.role === 'CREATOR' || project?.role === 'ADMIN';
  const canLeave = Boolean(projectId && isSharedWithMe(snapshot, projectId));
  const REMOVE = '__remove__';
  /* Two roles are offered: a collaborator and the project's admin. Tried on a
     real account, the other two did not behave like roles of their own — one
     could do what a collaborator can, the other was refused almost everything —
     so they only show for somebody who already has one. */
  const memberRoles = (current: string | null) => [
    ...OFFERED_ROLES,
    ...(current === 'EDIT_ONLY' || current === 'COMPLETE_ONLY' || current === 'CREATOR' ? [current] : []),
  ] as Array<(typeof ROLES)[number] | 'CREATOR'>;
  const COLLABORATOR = '__collaborator__';
  /** The round mark of a level: its icon, or the workspace's own picture for Team. */
  const levelMark = (level: string) => (
    <span className="accessmark" aria-hidden="true">
      {level === 'team' && project?.workspace_id && workspace
        ? <WorkspaceAvatar id={workspace.id} name={workspace.name} logo={workspace.logo_big} />
        : <Icon name={levelIcon(level)} />}
    </span>
  );
  const levelIcon = (level: string) => (level === 'public' ? 'globe' : level === 'team' ? 'group' : 'lock') as 'globe' | 'group' | 'lock';
  const levelName = (level: string) => (isAccessLevel(level) ? t(`access.${level}` as TranslationKey) : level);
  const workspace = project?.workspace_id ? snapshot.workspaces[project.workspace_id] ?? null : null;
  /** How the project is reached now, as Todoist has it. */
  const access = accessOf(project, workspace);
  const canSetAccess = project?.role === 'CREATOR' || project?.role === 'ADMIN';
  const accessLevels = accessChoices(inWorkspace).includes(access as never) ? accessChoices(inWorkspace) : [...accessChoices(inWorkspace), access];

  const copyLink = () => {
    if (!projectId) return;
    void copyText(todoistProjectUrl(projectId)).then((ok) => toast(t(ok ? 'task.linkCopied' : 'task.linkNotCopied')));
  };

  async function invite() {
    const address = email.trim();
    if (!projectId || !LOOKS_LIKE_EMAIL.test(address)) { setInvalid(true); return; }
    setEmail('');
    setSent(address);
    await shareProject(projectId, address, inWorkspace && role ? role : undefined);
  }

  return (
    <Overlay open={projectId !== null} onClose={onClose} label={t('share.title')} size="sm">
      <div className="sheet-head">
        <h2>{t('share.title')}{project ? ` · ${project.name}` : ''}</h2>
        <button className="iconbtn" aria-label={t('common.close')} onClick={onClose}><Icon name="close" /></button>
      </div>
      <div className="sheet-body shareform">
        <div className="shareinvite">
          <input
            data-autofocus
            type="email"
            value={email}
            placeholder={t('share.email')}
            aria-label={t('share.email')}
            aria-invalid={invalid || undefined}
            onChange={(e) => { setEmail(e.target.value); setInvalid(false); }}
            onKeyDown={(e) => { if (e.key === 'Enter') void invite(); }}
          />
          {inWorkspace && (
            <Select
              value={role}
              ariaLabel={t('share.role')}
              onChange={setRole}
              options={[
                { value: '', label: t('share.roleDefault'), hint: t('share.roleDefault.hint') },
                ...OFFERED_ROLES.map((r) => ({ value: r, label: t(`share.role.${r}` as TranslationKey), hint: t(`share.role.${r}.hint` as TranslationKey) })),
              ]}
              maxPopupWidth={300}
            />
          )}
          <button className="btn primary" onClick={() => void invite()}>{t('share.invite')}</button>
        </div>
        {invalid && <p className="connect-error" role="alert">{t('share.invalid')}</p>}
        {sent && (
          <p className="sharesent" role="status"><Icon name="check" size="sm" />{t('share.sent', { email: sent })}</p>
        )}

        {/* How the project is reached, said before who is in it. */}
        <h3 className="setsubhead">{t('share.accessTitle')}</h3>
        <div className="shareaccess">
          {canSetAccess ? (
            <Select
              variant="row"
              value={access}
              ariaLabel={t('share.accessLevel')}
              popupClassName="accesspopup"
              onChange={(level) => { if (projectId && level !== access) void updateProjectFields(projectId, { access: { visibility: level } }); }}
              options={accessLevels.map((level) => ({
                value: level,
                label: levelName(level),
                hint: isAccessLevel(level) ? t(`access.${level}.hint` as TranslationKey) : undefined,
                visual: levelMark(level),
              }))}
            />
          ) : (
            <div className="accessstatic">
              {levelMark(access)}
              <span className="rowtext">
                <strong>{levelName(access)}</strong>
                {isAccessLevel(access) && <small>{t(`access.${access}.hint` as TranslationKey)}</small>}
              </span>
            </div>
          )}
        </div>

        <h3 className="setsubhead">{t('share.people')}</h3>
        <ul className="sharelist">
          {me && (
            <li key="me">
              <PersonAvatar id={me.id} decorative />
              <span className="sharewho">
                <strong>{me.full_name} <em>({t('assignee.me')})</em></strong>
                <small>{me.email}</small>
              </span>
              {canLeave && (
                <button className="btn quiet" onClick={() => { if (projectId) { void leaveProject(projectId); onClose(); } }}>
                  {t('share.leave')}
                </button>
              )}
            </li>
          )}
          {people.map((person) => (
            <li key={person.id}>
              <PersonAvatar id={person.id} decorative />
              <span className="sharewho">
                <strong>{person.name}</strong>
                <small>{person.email}{person.state === 'invited' ? ` · ${t('share.pending')}` : ''}</small>
              </span>
              {person.state === 'active' ? (
                /* The role is what a workspace project reads; removing is the
                   last entry of the same list, in red. */
                <Select
                  value={inWorkspace ? person.role ?? '' : COLLABORATOR}
                  ariaLabel={t('share.role')}
                  onChange={(value) => {
                    if (!projectId || value === COLLABORATOR) return;
                    if (value === REMOVE) void removeCollaborator(projectId, person.email);
                    else void changeRole(projectId, person.id, value);
                  }}
                  placeholder={t('share.roleDefault')}
                  maxPopupWidth={300}
                  /* Only a project's admin changes who is what, and nobody changes the owner:
                     the control stays as it is, greyed, rather than answering with an error. */
                  disabled={inWorkspace ? !canManage || person.role === 'CREATOR' : false}
                  title={inWorkspace && !canManage ? t('share.adminsOnly') : undefined}
                  options={[
                    /* A personal project has no roles to choose from: its members are collaborators. */
                    ...(inWorkspace
                      ? memberRoles(person.role).map((r) => ({ value: r, label: t(`share.role.${r}` as TranslationKey), hint: t(`share.role.${r}.hint` as TranslationKey) }))
                      : [{ value: COLLABORATOR, label: t('share.collaborator') }]),
                    { value: REMOVE, label: t('share.removeFromProject'), danger: true },
                  ]}
                />
              ) : person.email && (
                <button
                  className="btn quiet"
                  onClick={() => projectId && void removeCollaborator(projectId, person.email)}
                >
                  {t('share.remove')}
                </button>
              )}
            </li>
          ))}
        </ul>
        {people.length === 0 && <p className="menuhint">{t('share.nobody')}</p>}
      </div>
      <div className="sheet-foot sharefoot">
        <button className="btn" onClick={copyLink}><Icon name="link" size="sm" />{t('share.copyLink')}</button>
      </div>
    </Overlay>
  );
}
