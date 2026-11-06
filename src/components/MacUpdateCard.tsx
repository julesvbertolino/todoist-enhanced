import { useT } from '@/hooks/useT';
import { useMacAppUpdate } from '@/hooks/useMacAppUpdate';
import { MAC_APP_RELEASES_URL } from '@/app-info';

/**
 * Inside the Mac app: a newer app can be downloaded.
 *
 * The app is not signed, so it cannot replace itself. The card says so
 * plainly: download, then put the new app over the old one. Once put away
 * for a version it does not come back for that version.
 */
export function MacUpdateCard({ enabled }: { enabled: boolean }) {
  const { t } = useT();
  const update = useMacAppUpdate(enabled);
  if (!update) return null;
  return (
    <div className="updatecard floating macupdate" role="status">
      <strong>{t('macUpdate.title')}</strong>
      <p>{t('macUpdate.text', { version: update.latest })}</p>
      <div className="updatecard-actions">
        <a className="updatecard-apply" href={MAC_APP_RELEASES_URL} target="_blank" rel="noopener noreferrer" onClick={update.dismiss}>{t('macUpdate.download')}</a>
        <button type="button" className="updatecard-later" onClick={update.dismiss}>{t('macUpdate.later')}</button>
      </div>
    </div>
  );
}
