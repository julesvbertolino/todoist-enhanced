import { useEffect, useMemo, useState } from 'react';
import { Overlay } from './Overlay';
import { Icon } from '../Icon';
import { Select } from '../Select';
import { useT } from '@/hooks/useT';
import { useStore } from '@/store/store';
import { projectPeople, ROLES } from '@/domain/sharing';
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
  const snapshot = useStore((s) => s.snapshot);
  const shareProject = useStore((s) => s.shareProject);
  const removeCollaborator = useStore((s) => s.removeCollaborator);
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
                { value: '', label: t('share.roleDefault') },
                ...ROLES.map((r) => ({ value: r, label: t(`share.role.${r}` as TranslationKey) })),
              ]}
            />
          )}
          <button className="btn primary" onClick={() => void invite()}>{t('share.invite')}</button>
        </div>
        {invalid && <p className="connect-error" role="alert">{t('share.invalid')}</p>}
        {sent && (
          <p className="sharesent" role="status"><Icon name="check" size="sm" />{t('share.sent', { email: sent })}</p>
        )}

        <h3 className="setsubhead">{t('share.people')}</h3>
        {people.length === 0 ? (
          <p className="menuhint">{t('share.nobody')}</p>
        ) : (
          <ul className="sharelist">
            {people.map((person) => (
              <li key={person.id}>
                <span>
                  <strong>{person.name}</strong>
                  <small>{person.email}{person.state === 'invited' ? ` · ${t('share.pending')}` : ''}</small>
                </span>
                {person.email && (
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
        )}
      </div>
    </Overlay>
  );
}
