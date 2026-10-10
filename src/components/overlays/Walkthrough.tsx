import { canStoreDurations } from '@/domain/estimates';
import { useEffect, useRef, useState } from 'react';
import { Overlay } from './Overlay';
import { Icon, type IconName } from '../Icon';
import {
  AccentChoice, BackgroundChoice, EstimateStorageChoice, LayoutChoice, TaskChipsChoice,
} from '../Choosers';
import { DetailsEditor } from '../DetailsEditor';
import { SidebarNavEditor } from '../SidebarNavEditor';
import { WorkspacePreview, type PreviewStage } from '../WorkspacePreview';
import { useT } from '@/hooks/useT';
import { useStore } from '@/store/store';
import { TASK_OPENS } from '@/store/prefs';
import { markOnboarded } from '@/domain/onboarding';
import { avatarUrl } from '@/domain/colors';
import { karmaStanding } from '@/domain/karma';
import type { TranslationKey } from '@/i18n';

/**
 * The setup, once per account, v2 included: it is asked of every account
 * that has not been through this one, however long ago it was first set up.
 *
 * Five scenes: a greeting, the look, the sidebar, what a task shows, and an
 * end that offers the tour. The settings are written the moment a choice is
 * made, on the app behind the dialog as well as in the picture inside it, and
 * every one of them is in Settings afterwards. The *record of having been
 * asked* is written by the last scene or by "Use these settings"; closing the
 * window means being asked again rather than silently never being asked.
 *
 * Between the sidebar and the content the controls are one scene that moves:
 * going on pushes the old controls off to the left and brings the new ones in
 * from the right, going back does the reverse. The other steps simply come in.
 */
const STEPS = [
  { id: 'welcome', preview: null },
  { id: 'look', preview: 'appearance' },
  { id: 'sidebar', preview: 'organisation' },
  { id: 'content', preview: 'metadata' },
  { id: 'end', preview: null },
] as const satisfies ReadonlyArray<{ id: string; preview: PreviewStage | null }>;

/** An attribute that takes a hidden column out of the tab order and the reading order. */
const inertWhen = (on: boolean) => (on ? ({ inert: '' } as object) : {});

/** The scenes whose controls travel together. */
const SCENE = new Set<string>(['sidebar', 'content']);

export function Walkthrough({
  open, onDone, onTour,
}: { open: boolean; onDone: () => void; onTour: () => void }) {
  const { t, locale } = useT();
  const prefs = useStore((s) => s.prefs);
  const setPrefs = useStore((s) => s.setPrefs);
  const user = useStore((s) => s.snapshot.user);
  const [step, setStep] = useState(0);
  const [motion, setMotion] = useState<'enter' | 'forward' | 'back'>('enter');
  const previous = useRef(0);
  const current = STEPS[step];
  const pos = current.id === 'content' ? 'b' : 'a';
  const karma = karmaStanding(user?.karma);
  const avatar = avatarUrl(user);
  // Where an estimate is saved is a real choice when both are possible: nothing is picked for them.
  const mustChooseStorage = canStoreDurations(user) && prefs.estimateStorage === null;
  const first = (user?.full_name ?? '').trim().split(/\s+/)[0] || t('setup.friend');

  // Replaying it starts from the first screen, with what is chosen now.
  useEffect(() => { if (open) { setStep(0); previous.current = 0; setMotion('enter'); } }, [open]);

  const [leaving, setLeaving] = useState(false);
  /* A scene leaves quickly and the next one rises; two that share a picture
     simply slide. */
  const go = (to: number, instant = false) => {
    if (leaving) return;
    const from = previous.current;
    const together = SCENE.has(STEPS[from].id) && SCENE.has(STEPS[to].id);
    const arrive = () => {
      setMotion(together ? (to > from ? 'forward' : 'back') : 'enter');
      previous.current = to;
      setStep(to);
    };
    if (together || instant || to === from) { arrive(); return; }
    setLeaving(true);
    window.setTimeout(() => { arrive(); setLeaving(false); }, 170);
  };

  /* Finishing records the account. The tour is a separate yes: "Show me
     around" opens it, anything else leaves it alone. */
  const finish = (tour: boolean) => {
    markOnboarded(user?.id);
    // With the settings too, so the account's other browsers know.
    setPrefs({
      onboarded: true,
      setupDone: true,
      estimateStorage: prefs.estimateStorage === 'duration' && canStoreDurations(user) ? 'duration' : 'tag',
    });
    go(0, true);
    onDone();
    if (tour) onTour();
  };

  const title = current.id === 'end'
    ? t('setup.end.title', { name: first })
    : t(`setup.${current.id}.title` as TranslationKey);
  const hint = t(`setup.${current.id}.hint` as TranslationKey);

  return (
    <Overlay
      open={open}
      /* The scrim and Escape both land here. Leaving early is leaving, not
         finishing: it is not recorded, so the next launch asks again. */
      onClose={onDone}
      label={t('walkthrough.title')}
      size="full"
    >
      <div className={`setup${leaving ? ' leave' : ''}`} data-step={current.id} tabIndex={-1} data-autofocus>
        {current.id !== 'end' && (
        <nav className="setup-progress" aria-label={t('walkthrough.step', { current: step + 1, total: STEPS.length })}>
          {STEPS.map((entry, at) => {
            const name = entry.id === 'end' ? t('setup.end.skip') : t(`setup.${entry.id}.title` as TranslationKey);
            return (
              <button
                key={entry.id}
                aria-label={name}
                title={name}
                className={at <= step ? 'on' : undefined}
                aria-current={at === step ? 'step' : undefined}
                onClick={() => go(at)}
              ><i /></button>
            );
          })}
        </nav>
        )}
        {current.id === 'welcome' ? (
          <div className="setup-welcome">
            <span className="setup-avatar">
              {avatar
                ? <img src={avatar} alt="" width={104} height={104} referrerPolicy="no-referrer" />
                : <span>{first.slice(0, 1).toUpperCase()}</span>}
            </span>
            <h2 className="setup-greeting">
              <span className="setup-hello">{t('setup.welcome.greeting')}</span>{' '}
              <span className="setup-name">{first}</span>
            </h2>
            <p className="setup-lead">{hint}</p>
            {karma && (
              <div className="setup-rank">
                <strong>{t(`karma.${karma.rank.key}` as TranslationKey)}</strong>
                <span className="setup-rankbar"><i style={{ width: `${karma.progress}%` }} /></span>
                {karma.remaining !== null && karma.next && (
                  <small>{t('setup.welcome.karma', {
                    remaining: karma.remaining.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-GB'),
                    next: t(`karma.${karma.next.key}` as TranslationKey),
                  })}</small>
                )}
              </div>
            )}
            <button className="btn primary lg setup-go" onClick={() => go(1)}>
              {t('setup.continue')}
            </button>
          </div>
        ) : current.id === 'end' ? (
          <div className="setup-welcome setup-end">
            <h2 className="setup-name">{title}</h2>
            <p className="setup-lead">{hint}</p>
            <div className="setup-endactions">
              <button className="btn primary lg" onClick={() => finish(true)}>{t('setup.end.tour')}</button>
              <button className="setup-skiplink" onClick={() => finish(false)}>{t('setup.end.skip')}</button>
            </div>
          </div>
        ) : (
          <>
            <header className="setup-head">
              {SCENE.has(current.id) ? (
                <div className="setup-heads" data-pos={pos}>
                  {(['sidebar', 'content'] as const).map((id, at) => (
                    <div
                      key={id}
                      className={`hh ${at ? 'b' : 'a'}${current.id === id ? ' active' : ''}`}
                      aria-hidden={current.id !== id}
                    >
                      <h2>{t(`setup.${id}.title` as TranslationKey)}</h2>
                      <p>{t(`setup.${id}.hint` as TranslationKey)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div key={current.id} className="setup-title hh active">
                  <h2>{title}</h2>
                  <p>{hint}</p>
                </div>
              )}
            </header>

            {SCENE.has(current.id) ? (
              /* The sidebar and the content are one scene: the picture slides
                 across while the controls beside it change. */
              <div className="setup-view" data-motion={motion}>
                <div className="setup-track" data-pos={pos}>
                  <div className="setup-controls a" {...inertWhen(current.id !== 'sidebar')}>
                    <div className="setup-stack">
                    <div>
                    <h3>{t('setup.sidebar.display')}</h3>
                    <div className="setup-switches">
                      <SwitchRow
                        icon="search"
                        title={t('settings.sidebarSearch')}
                        hint={t('settings.sidebarSearchHint')}
                        checked={prefs.sidebarSearch}
                        onChange={() => setPrefs({ sidebarSearch: !prefs.sidebarSearch })}
                      />
                      <SwitchRow
                        icon="dashboard"
                        title={t('settings.sidebarCounts')}
                        hint={t('settings.sidebarCountsHint')}
                        checked={prefs.sidebarCounts}
                        onChange={() => setPrefs({ sidebarCounts: !prefs.sidebarCounts })}
                      />
                    </div>
                    </div>
                    <SidebarNavEditor nav={prefs.sidebarNav} onChange={(sidebarNav) => setPrefs({ sidebarNav })} />
                  </div>
                  </div>
                  <div className="setup-preview">
                    <WorkspacePreview stage={current.preview} layout="stage" />
                  </div>
                  <div className="setup-controls b" {...inertWhen(current.id !== 'content')}>
                    <div className="setup-stack">
                    <div>
                    <h3>{t('setup.quick.title')}</h3>
                    <div className="setup-switches">
                      <SwitchRow
                        icon="clock"
                        title={t('settings.showQuick')}
                        hint={t('setup.quickHint')}
                        checked={prefs.showQuickGroup}
                        onChange={() => setPrefs({ showQuickGroup: !prefs.showQuickGroup })}
                      />
                    </div>
                    </div>
                    <div>
                      <h3>{t('details.title')}</h3>
                      <DetailsEditor />
                    </div>
                    <div>
                      <h3>{t('settings.taskChips')}</h3>
                      <TaskChipsChoice value={prefs.taskChips} onChange={(taskChips) => setPrefs({ taskChips })} />
                    </div>
                    <div>
                      <h3>{t('settings.taskOpen')}</h3>
                      <div className="segmented full" role="radiogroup" aria-label={t('settings.taskOpen')}>
                        {TASK_OPENS.map((option) => (
                          <button
                            key={option}
                            type="button"
                            role="radio"
                            aria-checked={prefs.taskOpen === option}
                            aria-pressed={prefs.taskOpen === option}
                            onClick={() => setPrefs({ taskOpen: option })}
                          >
                            <small>{t(`settings.taskOpen.${option}` as TranslationKey)}</small>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3>{t('setup.estimates.title')}</h3>
                      <EstimateStorageChoice
                        value={prefs.estimateStorage}
                        neutral
                        allowed={canStoreDurations(user)}
                        onChange={(value) => setPrefs({ estimateStorage: value })}
                      />
                    </div>
                  </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="setup-body">
                {current.preview && (
                  <div className="setup-preview">
                    <WorkspacePreview stage={current.preview} layout="stage" />
                  </div>
                )}

                <div className="setup-controls" key={current.id} data-motion={motion}>
                  {current.id === 'look' && (
                  <div className="setup-stack">
                    <div>
                      <h3>{t('settings.accent')}</h3>
                      <AccentChoice
                        value={prefs.accent}
                        custom={prefs.accentCustom}
                        onChange={(accent) => setPrefs({ accent })}
                        onCustom={(accentCustom) => setPrefs({ accent: 'custom', accentCustom })}
                      />
                    </div>
                    <div>
                      <h3>{t('settings.layout')}</h3>
                      <LayoutChoice value={prefs.layout} onChange={(layout) => setPrefs({ layout })} />
                    </div>
                    <div>
                      <h3>{t('settings.background')}</h3>
                      <BackgroundChoice value={prefs.background} onChange={(background) => setPrefs({ background })} />
                    </div>
                  </div>
                  )}
                </div>
              </div>
            )}

            <footer className="setup-foot">
              <div className="setup-actions">
                <button className="btn soft" onClick={() => go(step - 1)}>
                  {t('review.back')}
                </button>
                <button
                  className="btn primary"
                  disabled={current.id === 'content' && mustChooseStorage}
                  title={current.id === 'content' && mustChooseStorage ? t('setup.estimates.required') : undefined}
                  onClick={() => go(step + 1)}
                >
                  {t('setup.continue')}
                </button>
              </div>
            </footer>
          </>
        )}
      </div>
    </Overlay>
  );
}

/** A choice that is on or off: its words, and one switch that is not nested in anything else. */
function SwitchRow({ icon, title, hint, checked, onChange }: {
  icon: IconName;
  title: string;
  hint: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="setup-switch">
      <Icon name={icon} />
      <span><strong>{title}</strong><small>{hint}</small></span>
      <button
        type="button"
        className="switch"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        onClick={onChange}
      />
    </div>
  );
}
