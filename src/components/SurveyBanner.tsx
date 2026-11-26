import { useStore } from '@/store/store';
import { useT } from '@/hooks/useT';
import { Icon } from './Icon';

/** A voluntary, one-time survey, dismissed in account settings. */
export function SurveyBanner() {
  const prefs = useStore((s) => s.prefs);
  const demo = useStore((s) => s.demo);
  const connected = useStore((s) => s.connected);
  const settingsChecked = useStore((s) => s.settingsChecked);
  const setPrefs = useStore((s) => s.setPrefs);
  const { locale } = useT();
  if (demo || !connected || !settingsChecked || !prefs.setupDone || prefs.surveyDismissed || prefs.surveyVisitDays.length < 3) return null;
  const fr = locale === 'fr';
  return <section className="survey-banner" aria-label={fr ? 'Enquête sur Enhanced' : 'Enhanced survey'}>
    <button type="button" className="survey-dismiss" onClick={() => setPrefs({ surveyDismissed: true })}>{fr ? 'Ne plus afficher' : 'Never show me again'} <Icon name="close" size="sm" /></button>
    <h2>{fr ? 'Parlez-moi de votre expérience avec Todoist Enhanced' : 'Tell me more about your experience with Todoist Enhanced'}</h2>
    <p>{fr ? 'Quelques questions sur les fonctionnalités que vous utilisez et ce que vous aimeriez améliorer.' : 'A few questions about the features you use and what you’d like to see improved.'}</p>
    <div className="survey-actions"><a className="btn primary" href="https://forms.fillout.com/t/vZmMCfDMcuus" target="_blank" rel="noopener noreferrer">{fr ? 'Remplir le formulaire (3 min)' : 'Fill the form (3 min)'}</a></div>
  </section>;
}
