import { EstimateConversion } from '@/components/overlays/EstimateConversion';
import { canStoreDurations } from '@/domain/estimates';
import { useEffect, useState } from 'react';
import { Icon, type IconName } from '@/components/Icon';
import { Select } from '@/components/Select';
import { GroupOrderEditor, SidebarNavEditor } from '@/components/SidebarNavEditor';
import { AccentChoice, BackgroundChoice, ThemeChoice, LayoutChoice, DensityChoice, EstimateStorageChoice, TaskChipsChoice, TaskOpenChoice } from '@/components/Choosers';
import { WorkspacePreview } from '@/components/WorkspacePreview';
import { GroupPreview } from '@/components/GroupPreview';
import { useT } from '@/hooks/useT';
import { useStore } from '@/store/store';
import { avatarUrl } from '@/domain/colors';
import { formatDuration, parseDurationInput } from '@/domain/estimates';
import { defaultCapacity, weeklyCapacity, type DailyCapacity } from '@/domain/load';
import { DATE_FORMATS, formatDay, type DateFormat } from '@/domain/dates';
import { HOME_VIEWS, type HomeView } from '@/store/prefs';
import { DEFAULT_WEEK_LABEL } from '@/domain/types';
import { DUST_MONTHS, isDustMonths } from '@/domain/views';
import type { Locale, TranslationKey } from '@/i18n';
import { APP_NAME, AUTHOR, AUTHOR_AVATAR_URL, COFFEE_URL, GITHUB_URL, VERSION } from '@/app-info';
import { karmaStanding } from '@/domain/karma';
import { projectTree } from '@/store/selectors';

/** Where the things this app only reads are changed. */
const TODOIST_ACCOUNT_URL = 'https://app.todoist.com/app/settings/account';

const SECTIONS = ['account', 'general', 'appearance', 'sidebar', 'lists', 'features', 'conflicts', 'about'] as const;

/** A date with two digits in the day and a month that is short in both
 *  languages, so every option in the list is the same length. */
const SAMPLE_DATE = new Date(2026, 8, 12);
type Section = (typeof SECTIONS)[number];

/** The glyph beside each entry of the menu. */
const SECTION_ICON: Record<Section, IconName> = {
  account: 'user', general: 'settings', appearance: 'palette', sidebar: 'sidebar',
  lists: 'list', features: 'sparkles', conflicts: 'warning', about: 'info',
};

/**
 * Settings.
 *
 * One page that scrolls, rather than four that swap: every setting is
 * reachable by reading downwards, and the menu marks where you are instead of
 * deciding what you may see.
 */
export function SettingsView() {
  const { t, locale } = useT();
  const prefs = useStore((s) => s.prefs);
  const setPrefs = useStore((s) => s.setPrefs);
  const setLocale = useStore((s) => s.setLocale);
  const disconnect = useStore((s) => s.disconnect);
  const user = useStore((s) => s.snapshot.user);
  const karma = karmaStanding(user?.karma);

  const current = useCurrentSection();
  const avatar = avatarUrl(user);
  const intl = locale === 'fr' ? 'fr-FR' : 'en-GB';

  /* Monday-first labels. 8 January 2024 was a Monday; the capacity array is
     indexed Sunday-first, so the two are mapped rather than assumed equal. */
  const dayNames = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(intl, { weekday: 'short' }).format(new Date(2024, 0, 8 + i)),
  );

  /* A day that does not read as a duration is refused out loud, and keeps the
     value it had, rather than quietly snapping back. */
  const [capacityError, setCapacityError] = useState<'day' | 'week' | null>(null);
  const setDayCapacity = (index: number, raw: string): boolean => {
    const minutes = parseDurationInput(raw);
    if (minutes === null) return false;
    const next = [...useStore.getState().prefs.dailyCapacity] as DailyCapacity;
    next[index] = minutes;
    setPrefs({ dailyCapacity: next });
    return true;
  };
  const daysTotal = prefs.dailyCapacity.reduce((sum, minutes) => sum + minutes, 0);

  const toggle = (key: keyof typeof prefs.conflicts) =>
    setPrefs({ conflicts: { ...prefs.conflicts, [key]: !prefs.conflicts[key] } });

  const groupsInSidebar = projectTree(useStore((s) => s.snapshot), prefs.workspaceOrder);

  const weekly = weeklyCapacity(prefs.dailyCapacity, prefs.weeklyCapacityOverride);

  return (
    <div className="page wide">
      <div className="phead">
        <div>
          <h1 className="ptitle">{t('settings.title')}</h1>
        </div>

      </div>

      <div className="settings">
        {/* The menu navigates the page rather than replacing it, so these are
            links to anchors — Back works, and a section can be shared. */}
        <nav className="setnav" aria-label={t('settings.sections')}>
          {SECTIONS.map((section) => (
            <a
              key={section}
              href={`#/settings#${section}`}
              aria-current={current === section}
              onClick={(event) => {
                event.preventDefault();
                document.getElementById(section)?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <Icon name={SECTION_ICON[section]} size="sm" />
              {t(`settings.${section}` as TranslationKey)}
            </a>
          ))}
        </nav>

        <div className="setbody">
          {/* ---------------------------------------------------- Account */}
          <section className="setsection" id="account">
            <h2>{t('settings.account')}</h2>

            <div className="setfcard">
              <div className="setarow">
                <span className="setavatar">
                  {avatar
                    ? <img src={avatar} alt="" width={56} height={56} referrerPolicy="no-referrer" />
                    : <span>{(user?.full_name ?? '?').slice(0, 1).toUpperCase()}</span>}
                </span>
                <div className="setwho">
                  <strong>{user?.full_name ?? '—'}</strong>
                  <small>{user?.email ?? t('settings.connected')}</small>
                </div>
                <span className="setactions">
                  <a className="btn" href={TODOIST_ACCOUNT_URL} target="_blank" rel="noreferrer noopener">
                    <Icon name="external" size="sm" />
                    {t('settings.manageTodoist')}
                  </a>
                  <button className="btn danger" title={t('settings.disconnectHint')} onClick={() => void disconnect()}>
                    {t('settings.disconnect')}
                  </button>
                </span>
              </div>
              {karma && (
                <div className="karma-in">
                  <div className="karma-top">
                    <div>
                      <small>{t('settings.karmaRank')}</small>
                      <strong>{t(`karma.${karma.rank.key}` as TranslationKey)}</strong>
                    </div>
                    {karma.remaining !== null && karma.next && (
                      <div className="end">
                        <small>{t('settings.karmaTo', { remaining: karma.remaining.toLocaleString(intl) })}</small>
                        <strong>{t(`karma.${karma.next.key}` as TranslationKey)}</strong>
                      </div>
                    )}
                  </div>
                  <div className="karma-track" role="img" aria-label={`${karma.progress}%`}>
                    <i style={{ width: `${karma.progress}%` }} />
                    <span className="karma-mark" style={{ left: `${karma.progress}%` }}>
                      <b>{karma.karma.toLocaleString(intl)}</b>
                    </span>
                  </div>
                  <div className="karma-ends">
                    <span>{t(`karma.${karma.rank.key}` as TranslationKey)} · {karma.rank.from.toLocaleString(intl)}</span>
                    {karma.next && karma.rank.to !== null && (
                      <span>{t(`karma.${karma.next.key}` as TranslationKey)} · {karma.rank.to.toLocaleString(intl)}</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Always there, and not dismissible: it is the one way the project
                is paid for. */}
            <aside className="setfcard coffee-callout">
              <img className="coffee-callout-avatar" src={AUTHOR_AVATAR_URL} alt="Jules-Valentin Bertolino" width={96} height={96} decoding="async" />
              <div>
                <strong>{t('settings.coffeeCalloutTitle')}</strong>
                <span>{t('settings.coffeeCalloutBody')}</span>
              </div>
              <a className="btn coffee-btn" href={COFFEE_URL} target="_blank" rel="noreferrer noopener">
                <Icon name="coffee" size="sm" />
                {t('settings.coffeeCalloutAction')}
              </a>
            </aside>
          </section>

          {/* ---------------------------------------------------- General */}
          <section className="setsection" id="general">
            <h2>{t('settings.general')}</h2>

            <Row title={t('settings.language')} hint={t('settings.languageHint')}>
              <Choice
                label={t('settings.language')}
                value={prefs.locale}
                onChange={(value) => setLocale(value as Locale)}
                options={[
                  { value: 'en', label: 'English' },
                  { value: 'fr', label: 'Français' },
                ]}
              />
            </Row>

            <Row title={t('settings.timeFormat')} hint={t('settings.timeFormatHint')}>
              <Choice
                label={t('settings.timeFormat')}
                value={prefs.hour12 ? '12' : '24'}
                onChange={(value) => setPrefs({ hour12: value === '12' })}
                options={[
                  { value: '24', label: t('settings.time24') },
                  { value: '12', label: t('settings.time12') },
                ]}
              />
            </Row>

            <Row title={t('settings.dateFormat')} hint={t('settings.dateFormatHint')}>
              <Select
                value={prefs.dateFormat}
                onChange={(value) => setPrefs({ dateFormat: value as DateFormat })}
                ariaLabel={t('settings.dateFormat')}
                options={DATE_FORMATS.map((format) => ({
                  value: format,
                  /* The sample is the label: naming the orders "day, month,
                     year" explains less than showing one. */
                  label: formatDay(SAMPLE_DATE, locale, format),
                }))}
              />
            </Row>

            <Row title={t('settings.homepage')} hint={t('settings.homepageHint')}>
              <Select
                value={prefs.homepage}
                onChange={(value) => setPrefs({ homepage: value as HomeView })}
                ariaLabel={t('settings.homepage')}
                options={HOME_VIEWS.map((view) => ({ value: view, label: t(`nav.${view}` as TranslationKey) }))}
              />
            </Row>
            <Row title={t('settings.naturalDates')} hint={t('settings.naturalDatesHint')}>
              <Switch checked={prefs.naturalDates} onChange={() => setPrefs({ naturalDates: !prefs.naturalDates })} label={t('settings.naturalDates')} />
            </Row>
            <Row title={t('settings.searchSections')} hint={t('settings.searchSectionsHint')}>
              <Switch checked={prefs.includeSectionsInSearch} onChange={() => setPrefs({ includeSectionsInSearch: !prefs.includeSectionsInSearch })} label={t('settings.searchSections')} />
            </Row>

            {/* Read from the account, so it is stated rather than offered. */}
            <Row title={t('settings.weekStart')} hint={t('settings.weekStartHint')}>
              <span className="setvalue">
                {dayNames[((user?.start_day ?? 1) + 6) % 7]}
              </span>
            </Row>
          </section>

          {/* ------------------------------------------------ Appearance */}
          <section className="setsection" id="appearance">
            <h2>{t('settings.appearance')}</h2>
            <Row title={t('settings.theme')} hint={t('settings.themeHint')} wide>
              <ThemeChoice value={prefs.theme} onChange={(value) => setPrefs({ theme: value })} />
            </Row>
            <Row title={t('settings.layout')} hint={t('settings.layoutHint')} wide>
              <LayoutChoice value={prefs.layout} onChange={(value) => setPrefs({ layout: value })} />
            </Row>
            <Row title={t('settings.background')} hint={t('settings.backgroundHint')} wide>
              <BackgroundChoice value={prefs.background} onChange={(value) => setPrefs({ background: value })} />
            </Row>
            <WorkspacePreview stage="appearance" />
            <Row title={t('settings.accent')} hint={t('settings.accentHint')} wide>
              <AccentChoice
                value={prefs.accent}
                custom={prefs.accentCustom}
                onChange={(value) => setPrefs({ accent: value })}
                onCustom={(value) => setPrefs({ accent: 'custom', accentCustom: value })}
              />
            </Row>
          </section>

          {/* --------------------------------------------------- Sidebar */}
          <section className="setsection" id="sidebar">
            <h2>{t('settings.sidebar')}</h2>
            <Row title={t('settings.sidebarSearch')} hint={t('settings.sidebarSearchHint')}>
              <Switch checked={prefs.sidebarSearch} onChange={() => setPrefs({ sidebarSearch: !prefs.sidebarSearch })} label={t('settings.sidebarSearch')} />
            </Row>
            <Row title={t('settings.sidebarCounts')} hint={t('settings.sidebarCountsHint')}>
              <Switch checked={prefs.sidebarCounts} onChange={() => setPrefs({ sidebarCounts: !prefs.sidebarCounts })} label={t('settings.sidebarCounts')} />
            </Row>
            {groupsInSidebar.length > 1 && (
              <Row title={t('settings.workspaceOrder')} hint={t('settings.workspaceOrderHint')} wide>
                <div className="wsgroups"><GroupOrderEditor
                  groups={groupsInSidebar.map((g) => ({ id: g.workspaceId ?? 'personal', name: g.name ?? t('nav.myProjects') }))}
                  onChange={(workspaceOrder) => setPrefs({ workspaceOrder })}
                /></div>
              </Row>
            )}
            <Row title={t('settings.sidebarArrange')} hint={t('settings.sidebarArrangeHint')} wide>
              <SidebarNavEditor nav={prefs.sidebarNav} onChange={(sidebarNav) => setPrefs({ sidebarNav })} />
            </Row>
          </section>

          {/* ----------------------------------------------------- Lists */}
          <section className="setsection" id="lists">
            <h2>{t('settings.lists')}</h2>
            <Row title={t('settings.taskChips')} hint={t('settings.taskChipsHint')} wide>
              <TaskChipsChoice value={prefs.taskChips} onChange={(value) => setPrefs({ taskChips: value })} />
            </Row>
            <WorkspacePreview stage="metadata" />
            <Row title={t('settings.density')} hint={t('settings.densityHint')} wide>
              <DensityChoice value={prefs.density} onChange={(value) => setPrefs({ density: value })} />
            </Row>
            <Row title={t('settings.taskOpen')} hint={t('settings.taskOpenHint')} wide>
              <TaskOpenChoice value={prefs.taskOpen} onChange={(value) => setPrefs({ taskOpen: value })} />
            </Row>
          </section>

          {/* Settings that shape the product rather than its formatting. */}
          <section className="setsection" id="features">
            <h2>{t('settings.features')}</h2>
            {/* How the pages are laid out, in one place, with a picture of it. */}
            <h3 className="setsubhead">{t('settings.groupOrganisation')}</h3>
            <p className="setgroup-hint">{t('settings.groupOrganisationHint')}</p>
            {/* The matrix is turned on and off from its entry in Sidebar → Entries (#16). */}
            <Row title={t('settings.showQuick')} hint={t('settings.showQuickHint')}>
              <Switch
                checked={prefs.showQuickGroup}
                onChange={() => setPrefs({ showQuickGroup: !prefs.showQuickGroup })}
                label={t('settings.showQuick')}
              />
            </Row>
            <GroupPreview kind="quick" />
            {/* The tag is a name on the user's own board, not a setting this
                app invented, so it is typed rather than chosen from a list:
                the tag it should read may not exist here yet. */}
            <Row title={t('settings.weekLabel')} hint={t('settings.weekLabelHint')}>
              <input
                className="estinput"
                defaultValue={prefs.weekLabel}
                aria-label={t('settings.weekLabel')}
                onBlur={(event) => {
                  const next = event.target.value.trim().replace(/^@/, '');
                  setPrefs({ weekLabel: next || DEFAULT_WEEK_LABEL });
                  event.target.value = next || DEFAULT_WEEK_LABEL;
                }}
              />
            </Row>

            <h3 className="setsubhead">{t('settings.groupSomeday')}</h3>
            <Row title={t('settings.showDust')} hint={t('settings.showDustHint')}>
              <Switch
                checked={prefs.showDustGroup}
                onChange={() => setPrefs({ showDustGroup: !prefs.showDustGroup })}
                label={t('settings.showDust')}
              />
            </Row>
            <GroupPreview kind="dust" />
            <Row title={t('settings.dustAfter')} hint={t('settings.dustAfterHint')}>
              <Select
                value={String(prefs.dustAfterMonths)}
                onChange={(value) => {
                  const months = Number(value);
                  if (isDustMonths(months)) setPrefs({ dustAfterMonths: months });
                }}
                ariaLabel={t('settings.dustAfter')}
                options={DUST_MONTHS.map((months) => ({
                  value: String(months),
                  label: t('settings.months', { count: months }),
                }))}
              />
            </Row>
            <Row title={t('settings.quietAfter')} hint={t('settings.quietAfterHint')}>
              <span className="setunit">
                <input
                  className="estinput"
                  inputMode="numeric"
                  defaultValue={String(prefs.quietAfterDays)}
                  aria-label={t('settings.quietAfter')}
                  onBlur={(event) => {
                    const days = Number.parseInt(event.target.value, 10);
                    const next = Number.isFinite(days) && days > 0 ? days : prefs.quietAfterDays;
                    setPrefs({ quietAfterDays: next });
                    event.target.value = String(next);
                  }}
                />
                <span>{t('settings.days')}</span>
              </span>
            </Row>

            {/* Where an estimate is kept. Choosing is never converting: the
                conversion is its own button, with its own preview. */}
            <h3 className="setsubhead">{t('settings.groupEstimates')}</h3>
            <Row title={t('estimates.storage')} hint={t('estimates.dialogIntro')} wide>
              <EstimateStorageChoice value={prefs.estimateStorage} allowed={canStoreDurations(user)} onChange={(value) => setPrefs({ estimateStorage: value })} />
              <EstimateConversion target={prefs.estimateStorage ?? 'tag'} />
            </Row>

            {/* After the choices about the week, because it measures them. */}
            <h3 className="setsubhead">{t('settings.groupCapacity')}</h3>
            <p className="setgroup-hint">{t('settings.groupCapacityHint')}</p>
            <Row title={t('settings.perDayCapacity')} hint={t('settings.dailyCapacityHint')} />
            <div className="capgrid">
              {dayNames.map((name, index) => {
                // The array is indexed Sunday-first; the labels start on Monday.
                const dayIndex = (index + 1) % 7;
                return (
                  <label className="capday" key={name}>
                    <span>{name}</span>
                    {/* Said as a duration ("5 h", "1 h 30"), and typed as one:
                        a bare number is minutes, which "300" never said. */}
                    <input
                      key={prefs.dailyCapacity[dayIndex]}
                      defaultValue={formatDuration(prefs.dailyCapacity[dayIndex], locale)}
                      aria-invalid={capacityError === 'day' || undefined}
                      onChange={() => setCapacityError(null)}
                      onBlur={(event) => {
                        setCapacityError(setDayCapacity(dayIndex, event.target.value) ? null : 'day');
                        event.target.value = formatDuration(useStore.getState().prefs.dailyCapacity[dayIndex], locale);
                      }}
                      onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
                      aria-label={name}
                    />
                  </label>
                );
              })}
            </div>
            {capacityError === 'day' && <p className="capalert" role="alert">{t('settings.capacityInvalid')}</p>}

            {/* The total the days make, and the value that replaces it when one
                is set, said apart so neither is mistaken for the other. */}
            {prefs.weeklyCapacityOverride === null ? (
              <p className="capnote">{t('settings.weeklyCalculated', { total: formatDuration(daysTotal, locale) })}</p>
            ) : (
              <p className="capnote override">
                {t('settings.weeklyOverrideNote', {
                  value: formatDuration(prefs.weeklyCapacityOverride, locale),
                  total: formatDuration(daysTotal, locale),
                })}
              </p>
            )}

            <Row title={t('settings.weeklySource')} hint={formatDuration(weekly, locale)}>
              <Select
                value={prefs.weeklyCapacityOverride === null ? 'days' : 'custom'}
                onChange={(value) =>
                  setPrefs({ weeklyCapacityOverride: value === 'days' ? null : weekly })}
                ariaLabel={t('settings.weeklySource')}
                options={[
                  { value: 'days', label: t('settings.weeklyFromDays') },
                  { value: 'custom', label: t('settings.weeklyCustom') },
                ]}
              />
            </Row>

            {prefs.weeklyCapacityOverride !== null && (
              <Row title={t('settings.weeklyValue')} hint={t('settings.weeklyOverride')}>
                <input
                  className="estinput"
                  key={prefs.weeklyCapacityOverride}
                  defaultValue={formatDuration(prefs.weeklyCapacityOverride, locale)}
                  aria-invalid={capacityError === 'week' || undefined}
                  onChange={() => setCapacityError(null)}
                  onBlur={(event) => {
                    const minutes = parseDurationInput(event.target.value);
                    if (minutes !== null) { setCapacityError(null); setPrefs({ weeklyCapacityOverride: minutes }); }
                    else { setCapacityError('week'); event.target.value = formatDuration(prefs.weeklyCapacityOverride!, locale); }
                  }}
                  onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
                  aria-label={t('settings.weeklyValue')}
                />
              </Row>
            )}
            {capacityError === 'week' && <p className="capalert" role="alert">{t('settings.weeklyInvalid')}</p>}

            <Row title={t('settings.capacityDefaults')} hint={t('settings.capacityDefaultsHint')}>
              <button
                className="btn"
                onClick={() =>
                  setPrefs({ dailyCapacity: defaultCapacity(), weeklyCapacityOverride: null })}
              >
                {t('settings.restore')}
              </button>
            </Row>
          </section>

          {/* ------------------------------------------------- Conflicts */}
          <section className="setsection" id="conflicts">
            <h2>{t('settings.conflicts')}</h2>
            {(
              [
                ['estimateMismatch', 'estimates.conflictSetting', 'estimates.conflictHint'],
                ['dateAndWeek', 'settings.conflictDateWeek', 'settings.conflictDateWeekHint'],
                ['multipleEstimates', 'settings.conflictMultiple', 'settings.conflictMultipleHint'],
                ['quickTooLong', 'settings.conflictQuick', 'settings.conflictQuickHint'],
                ['parentAndChildren', 'settings.conflictParent', 'settings.conflictParentHint'],
                ['invalidEstimate', 'settings.conflictInvalid', 'settings.conflictInvalidHint'],
              ] as const
            ).map(([key, title, hint]) => (
              <Row key={key} title={t(title)} hint={t(hint)}>
                <Switch
                  checked={prefs.conflicts[key]}
                  onChange={() => toggle(key)}
                  label={t(title)}
                />
              </Row>
            ))}
          </section>

          {/* Todoist asks a third-party app to say, in its description, that
              it is not one of theirs. The sign-in screen carries that line
              for anyone who has not connected yet; this carries it for
              everyone who has. */}
          <section className="setsection last" id="about">
            <h2>{t('settings.about')}</h2>
            <div className="setrow">
              <div>
                <strong>{APP_NAME}</strong>
                <span>{t('connect.version', { version: VERSION })}</span>
              </div>
            </div>

            <Row title={t('settings.whatsNew')} hint={t('settings.whatsNewHint')}>
              <Switch checked={prefs.whatsNew} onChange={() => setPrefs({ whatsNew: !prefs.whatsNew })} label={t('settings.whatsNew')} />
            </Row>
            <div className="alinks">
              <button className="btn soft" onClick={() => window.dispatchEvent(new Event('enhanced:changelog'))}>
                <Icon name="star" size="sm" />
                {t('settings.changelogAction')}
              </button>
              <button className="btn soft" onClick={() => window.dispatchEvent(new Event('enhanced:tour'))}>
                <Icon name="week" size="sm" />
                {t('settings.startTour')}
              </button>
              <button className="btn soft" onClick={() => window.dispatchEvent(new Event('enhanced:replay-onboarding'))}>
                <Icon name="sliders" size="sm" />
                {t('settings.replayWalkthroughAction')}
              </button>
              <a className="btn soft" href={GITHUB_URL} target="_blank" rel="noreferrer noopener">
                <Icon name="external" size="sm" />
                {t('settings.aboutCode')}
              </a>
              <a className="btn soft" href={COFFEE_URL} target="_blank" rel="noreferrer noopener">
                <Icon name="coffee" size="sm" />
                {t('settings.aboutCoffee')}
              </a>
            </div>
            <p className="setlegal">
              {t('connect.legal', { author: AUTHOR })}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Row({
  title, hint, children, wide,
}: { title: string; hint?: string; children?: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`setrow${wide ? ' setrow-wide' : ''}`}>
      <div>
        <strong>{title}</strong>
        {hint && <span>{hint}</span>}
      </div>
      {children}
    </div>
  );
}






function Switch({
  checked, onChange, label,
}: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      className="switch"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
    />
  );
}

/**
 * Which section the reader is currently in.
 *
 * The last heading to have passed the top of the page wins. An observer band
 * was the first attempt and it has a hole in it: a section taller than the
 * band leaves no heading inside it, and the menu stops moving.
 */
function useCurrentSection(): Section {
  const [current, setCurrent] = useState<Section>(SECTIONS[0]);

  useEffect(() => {
    const scroller = document.querySelector('.screen.active') ?? window;

    const read = () => {
      let found: Section = SECTIONS[0];
      for (const section of SECTIONS) {
        const node = document.getElementById(section);
        if (node && node.getBoundingClientRect().top <= 140) found = section;
      }
      setCurrent(found);
    };

    read();
    scroller.addEventListener('scroll', read, { passive: true });
    window.addEventListener('resize', read);
    return () => {
      scroller.removeEventListener('scroll', read);
      window.removeEventListener('resize', read);
    };
  }, []);

  return current;
}

/** Two or three ways to answer, side by side: a track with the chosen one lifted. */
function Choice({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="segmented choice" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          <small>{option.label}</small>
        </button>
      ))}
    </div>
  );
}
