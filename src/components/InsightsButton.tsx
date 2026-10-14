import { Icon } from './Icon';
import { useT } from '@/hooks/useT';
import { useStore } from '@/store/store';
/** One contextual control across project and task views. */
export function InsightsButton({ onClick }: { onClick: () => void }) {
  const { t } = useT();
  const open = useStore((s) => s.sidePanel === 'insights');
  return <button className="btn insights-control" onClick={onClick} aria-expanded={open}>
    <Icon name="trend" />{t('toolbar.insights')}
  </button>;
}
