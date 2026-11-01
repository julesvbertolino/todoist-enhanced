import { useState } from 'react';
import { Overlay } from './Overlay';
import { PomodoroDisplayChoice } from '../PomodoroDisplayChoice';
import { useT } from '@/hooks/useT';
import { useStore } from '@/store/store';

/**
 * Asked once, after What's new, of everyone who already went through the setup:
 * the Pomodoro arrived after it, so its choice was never put to them.
 */
export function PomodoroAsk({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useT();
  const current = useStore((s) => s.prefs.pomodoroDisplay);
  const setPrefs = useStore((s) => s.setPrefs);
  const [choice, setChoice] = useState(current);
  return (
    <Overlay open={open} onClose={() => { setPrefs({ pomodoroAsked: true }); onClose(); }} label={t('pomodoro.askTitle')} size="md">
      <div className="pomo-ask">
        <h2>{t('pomodoro.askTitle')}</h2>
        <p>{t('pomodoro.askLead')}</p>
        <PomodoroDisplayChoice value={choice} onChange={setChoice} />
        <footer>
          <button type="button" className="btn" onClick={() => { setPrefs({ pomodoroAsked: true }); onClose(); }}>{t('pomodoro.later')}</button>
          <button type="button" className="btn primary" onClick={() => { setPrefs({ pomodoroDisplay: choice, pomodoroAsked: true }); onClose(); }}>{t('pomodoro.save')}</button>
        </footer>
      </div>
    </Overlay>
  );
}
