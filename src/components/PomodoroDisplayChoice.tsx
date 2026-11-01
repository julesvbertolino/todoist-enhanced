import { Pause, Timer } from 'lucide-react';
import { useT } from '@/hooks/useT';

type Display = 'discreet' | 'fullscreen';

/** A small picture of each way the timer can open, drawn with the app's own surfaces. */
function Preview({ kind }: { kind: Display }) {
  return kind === 'discreet' ? (
    <div className="pomo-choice-preview discreet" aria-hidden="true">
      <span className="pc-title">Website</span>
      <span className="pc-pill"><Timer size={10} />18:42<Pause size={9} /></span>
      {[78, 62, 70, 54].map((w, i) => <span className="pc-row" key={i}><i /><b style={{ width: `${w}%` }} /></span>)}
    </div>
  ) : (
    <div className="pomo-choice-preview fullscreen" aria-hidden="true">
      <span className="pc-bar"><Timer size={9} />Focus</span>
      <span className="pc-digits">18:42</span>
      <i className="pc-button">Pause</i>
    </div>
  );
}

/**
 * Two ways for the Pomodoro to open, as one toggle: the picture and words of
 * each are the option, and choosing one is choosing the whole card.
 */
export function PomodoroDisplayChoice({ value, onChange }: { value: Display; onChange: (next: Display) => void }) {
  const { t } = useT();
  const options: Array<[Display, string, string]> = [
    ['discreet', t('pomodoro.discreet'), t('pomodoro.discreetHint')],
    ['fullscreen', t('pomodoro.full'), t('pomodoro.fullHint')],
  ];
  return (
    <div className="pomo-choice" role="radiogroup" aria-label={t('pomodoro.title')} data-selected={value === 'fullscreen' ? 1 : 0}>
      {options.map(([id, title, hint]) => (
        <button key={id} type="button" role="radio" aria-checked={value === id} onClick={() => onChange(id)}>
          <Preview kind={id} />
          <strong><span className="pc-dot" />{title}</strong>
          <small>{hint}</small>
        </button>
      ))}
    </div>
  );
}
