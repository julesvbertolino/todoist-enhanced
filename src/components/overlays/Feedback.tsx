import { Overlay } from './Overlay';
import { Icon } from '../Icon';
import { useT } from '@/hooks/useT';

/**
 * The form for a bug or an idea, inside the app rather than in another tab.
 *
 * It is Tally's own embed, as a frame: the form lives on tally.so and the
 * answers go there, which the page's security policy allows for that one host
 * and no other (`frame-src`).
 */
const FORM_URL = 'https://tally.so/embed/WOLkVN?alignLeft=1&hideTitle=1&transparentBackground=1';

export function Feedback({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useT();
  return (
    <Overlay open={open} onClose={onClose} label={t('nav.feedback')} size="sm">
      <div className="sheet-head">
        <div><h2>{t('nav.feedback')}</h2></div>
        <button className="iconbtn" aria-label={t('common.close')} onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>
      <iframe
        className="feedbackframe"
        src={FORM_URL}
        title={t('nav.feedback')}
        loading="lazy"
      />
    </Overlay>
  );
}
