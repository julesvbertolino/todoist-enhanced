import { Icon } from './Icon';
import { useT } from '@/hooks/useT';
import type { TranslationKey } from '@/i18n';

export type EmptyView = 'project' | 'inbox' | 'label' | 'filter' | 'today' | 'week' | 'month' | 'someday';

/** One neutral illustration, with copy and an action appropriate to its view. */
export function EmptyState({ view, onAdd }: { view: EmptyView; onAdd?: () => void }) {
  const { t } = useT();
  return <div className="project-empty">
    <svg className="project-empty-art" viewBox="0 0 136 96" fill="none" aria-hidden="true">
      <rect x="14" y="14" width="96" height="68" rx="14" fill="var(--surface)" stroke="var(--border-strong)" strokeWidth="1.5" />
      <rect x="28" y="32" width="14" height="14" rx="4.5" stroke="var(--border-strong)" strokeWidth="1.5" />
      <rect x="50" y="35" width="44" height="8" rx="4" fill="var(--border)" />
      <rect x="28" y="56" width="14" height="14" rx="4.5" stroke="var(--border-strong)" strokeWidth="1.5" />
      <rect x="50" y="59" width="30" height="8" rx="4" fill="var(--border)" />
      <circle cx="110" cy="20" r="14" fill="var(--accent)" />
      <path d="M110 14v12M104 20h12" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
    <h2>{t(`empty.${view}.title` as TranslationKey)}</h2>
    <p>{t(`empty.${view}.description` as TranslationKey)}</p>
    {onAdd && <button className="project-empty-cta" type="button" onClick={onAdd}><Icon name="plus" size="sm" />{t('nav.addTaskHere')}</button>}
  </div>;
}
