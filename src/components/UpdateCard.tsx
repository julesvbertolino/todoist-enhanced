import { useT } from '@/hooks/useT';
import { applyUpdate, dismissUpdateCard, useUpdateCard } from '@/lib/appUpdate';

/**
 * The announcement of a new version: once, until it is answered.
 *
 * On a computer it sits over the line at the foot of the sidebar and points
 * at it, so "Later" leaves the person knowing where the update waits. Where
 * that line cannot be seen (a phone, a collapsed sidebar) it floats on its
 * own. It never takes the keyboard: whatever is being typed carries on.
 */
export function UpdateCard({ floating = false }: { floating?: boolean }) {
  const { t } = useT();
  const open = useUpdateCard();
  if (!open) return null;
  return (
    <div className={`updatecard${floating ? ' floating' : ''}`} role="status">
      <strong>{t('update.cardTitle')}</strong>
      <p>{t('update.cardText')}</p>
      <div className="updatecard-actions">
        <button className="updatecard-apply" onClick={applyUpdate}>{t('update.apply')}</button>
        <button className="updatecard-later" onClick={dismissUpdateCard}>{t('update.later')}</button>
      </div>
    </div>
  );
}
