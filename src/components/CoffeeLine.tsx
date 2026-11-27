import { Icon } from './Icon';
import { useT } from '@/hooks/useT';
import { coffeeUrl } from '@/app-info';

/**
 * The one place the app mentions that it costs its author something.
 *
 * It is a line, not a card, not a banner and not a dialog: nothing about it
 * interrupts, nothing has to be dismissed, and it says the same thing every
 * time rather than escalating. It is put at the end of things that have just
 * finished — a review you have completed, a board you have read to the bottom
 * — because that is where a line about the app is a footnote rather than an
 * interruption, and it never appears in the middle of work.
 *
 * What it does not do is count: no "you have used this 30 times", no growing
 * insistence, nothing triggered by a milestone. The app is free, and the line
 * says so; what follows is an offer, not a request.
 */
export function CoffeeLine() {
  const { t } = useT();
  return (
    <p className="coffeeline">
      <span>{t('coffee.free')}</span>
      <a href={coffeeUrl('footer')} target="_blank" rel="noreferrer noopener">
        <Icon name="coffee" size="sm" />
        {t('coffee.offer')}
      </a>
    </p>
  );
}
