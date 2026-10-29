import './whatsnew.css';
import { ChangelogPreview } from './ChangelogPreview';
import { changelogVisual, type ChangelogVisual } from '@/domain/changelogVisuals';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Overlay } from './Overlay';
import { Icon } from '../Icon';
import { Select } from '../Select';
import { useT } from '@/hooks/useT';
import { renderTitle } from '@/domain/markdown';
import {
  changePresentation, localisedReleases, parseChangelog, releaseDisplay, unseenFeed, type Change, type ChangeKind, type Release,
} from '@/domain/changelog';
import { tourStops } from '@/domain/tour';
import { COFFEE_URL } from '@/app-info';
import type { TranslationKey } from '@/i18n';

/**
 * Which releases the dialog is showing: the ones not seen yet after an
 * update, or the whole history when it is opened from Settings.
 */
export type WhatsNewScope = { versions: string[] } | 'all';

interface WhatsNewProps {
  scope: WhatsNewScope | null;
  onClose: () => void;
  onSeeChangelog: () => void;
  /** Closes the window and runs the tour over what these releases brought. */
  onShowMe?: (versions: string[]) => void;
}

/**
 * The two changelogs, fetched only when the dialog opens.
 *
 * The English file is the whole history since 0.1 and has no business in the
 * bundle every page load downloads; the dialog is shown once per release.
 */
function useChangelog(open: boolean, locale: string) {
  const [releases, setReleases] = useState<Array<Release & { untranslated: boolean }> | null>(null);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void Promise.all([
      import('../../../CHANGELOG.md?raw').then((m) => m.default),
      locale === 'fr'
        ? import('../../../CHANGELOG.fr.md?raw').then((m) => m.default)
        : Promise.resolve(null),
    ]).then(([english, french]) => {
      if (cancelled) return;
      setReleases(localisedReleases(
        parseChangelog(english),
        french === null ? null : parseChangelog(french),
      ));
    });
    return () => { cancelled = true; };
  }, [open, locale]);
  return releases;
}

const KIND_LABEL: Record<ChangeKind, TranslationKey> = {
  new: 'whatsNew.kind.new',
  design: 'whatsNew.kind.design',
  fix: 'whatsNew.kind.fix',
};

/** Stable section anchors for the version selector. */
const anchorOf = (version: string) => `whatsnew-${version.replace(/\./g, '-')}`;

/**
 * What changed, said inside the app (#115).
 *
 * Shown once after an update that brings something new, and on demand from
 * Settings. The Calendar release pairs its text with an illustration; older
 * entries keep the same source text and change categories, localised when
 * the release has been translated. The title and the buttons hold still while
 * the list scrolls between them.
 *
 * After an update the title says "since your last visit" and the unseen
 * releases are one list, the most important first, each tagged with its
 * version (#336; before, every release had its own heading, #227). The whole
 * history, from Settings, keeps its sections and adds a version selector to
 * jump from one release to the next.
 */
export function WhatsNew({ scope, onClose, onShowMe, onSeeChangelog }: WhatsNewProps) {
  const { t, locale } = useT();
  const open = scope !== null;
  const all = useChangelog(open, locale);
  const bodyRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const footer = footerRef.current;
    if (!open || !footer) return;
    const measure = () => footer.parentElement?.style.setProperty('--whatsnew-footer-height', `${footer.offsetHeight}px`);
    measure();
    const observer = new ResizeObserver(measure); observer.observe(footer);
    return () => observer.disconnect();
  }, [open]);
  const [current, setCurrent] = useState<string | null>(null);

  const shown = useMemo(() => {
    if (!all || !scope) return [];
    if (scope === 'all') return all;
    return all.filter((release) => scope.versions.includes(release.version));
  }, [all, scope]);

  const history = scope === 'all';
  /* After an update the unseen releases are one list, the most important first;
     the history keeps its sections (#336). */
  const feed = useMemo(
    () => (history ? null : unseenFeed(shown, changelogVisual)),
    [history, shown],
  );
  const renderChange = (change: Change, visual: ChangelogVisual | null, provenance?: ReactNode) => {
    const { title, description } = changePresentation(change.text);
    return (
      <>
        <div className="whatsnew-copy">
          <span className="whatsnew-mark" hidden>{change.mark}</span>
          {/* A bold lead is the title; what follows it is the one paragraph that explains.
              The file is ours, and the renderer escapes it before adding the few inline tags it knows. */}
          <span className="whatsnew-text">
            <span className="whatsnew-titleline">
              <span className="whatsnew-meta">
                <span className="whatsnew-badge">{t(KIND_LABEL[change.kind])}</span>
                {provenance}
              </span>
              <strong className="whatsnew-title" dangerouslySetInnerHTML={{ __html: renderTitle(title) }} />
            </span>
            {description && <span className="whatsnew-para" dangerouslySetInnerHTML={{ __html: renderTitle(description) }} />}
          </span>
        </div>
        <ChangelogPreview kind={visual} />
      </>
    );
  };
  /* After an update only, and only when a release brought something the tour
     can point at: the history has no "since you last looked". */
  const showable = scope !== null && scope !== 'all' && onShowMe !== undefined
    && tourStops(scope.versions).length > 0;
  const titleText = history ? t('whatsNew.historyTitle') : t('whatsNew.title');

  /* The pill of the release being read follows the scroll. */
  useEffect(() => {
    if (!history || shown.length === 0) return;
    setCurrent(shown[0].version);
    const body = bodyRef.current;
    if (!body) return;
    const onScroll = () => {
      const top = body.getBoundingClientRect().top;
      let at = shown[0].version;
      for (const release of shown) {
        const section = body.querySelector<HTMLElement>(`#${anchorOf(release.version)}`);
        if (section && section.getBoundingClientRect().top - top <= 24) at = release.version;
      }
      setCurrent(at);
    };
    body.addEventListener('scroll', onScroll, { passive: true });
    return () => body.removeEventListener('scroll', onScroll);
  }, [history, shown]);

  const jump = (version: string) => {
    const body = bodyRef.current;
    const section = body?.querySelector<HTMLElement>(`#${anchorOf(version)}`);
    if (!body || !section) return;
    body.scrollTo({
      top: body.scrollTop + section.getBoundingClientRect().top - body.getBoundingClientRect().top - 8,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
    setCurrent(version);
  };

  return (
    <Overlay open={open} onClose={onClose} label={titleText} size="md">
      <div className="whatsnew whatsnew-refresh">
        <div className="sheet-head whatsnew-head">
          <h2>{titleText}</h2>
          {history && shown.length > 1 && (
            <Select
              value={current ?? shown[0].version}
              ariaLabel={t('whatsNew.versions')}
              onChange={jump}
              options={shown.map((release) => ({
                value: release.version,
                label: t('whatsNew.version', { version: release.version }),
              }))}
            />
          )}
          <button
            className="iconbtn"
            aria-label={t('common.close')}
            title={t('common.close')}
            onClick={onClose}
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="whatsnew-body" ref={bodyRef}>
          {all === null && <p className="whatsnew-loading">{t('common.loading')}</p>}
          {feed && (
            <ul className="whatsnew-feed">
              {feed.map((entry) => (
                <li
                  className={`whatsnew-change ${entry.change.kind}${entry.visual ? ' whatsnew-illustrated' : ''}`}
                  key={`${entry.version}:${entry.index}`}
                >
                  {renderChange(entry.change, entry.visual, <>
                    <small className="whatsnew-version">{t('whatsNew.version', { version: entry.version })}</small>
                    {entry.untranslated && <small className="whatsnew-lang">{t('whatsNew.untranslated')}</small>}
                  </>)}
                </li>
              ))}
            </ul>
          )}
          {!feed && shown.map((release) => (
            <section
              className="whatsnew-release"
              key={release.version}
              id={anchorOf(release.version)}
              aria-label={t('whatsNew.version', { version: release.version })}
            >
              <h3>
                {t('whatsNew.version', { version: release.version })}
                {/* How much is in the release, before reading it. */}
                <small className="whatsnew-count">{t('whatsNew.changes', { count: release.changes.length })}</small>
                {release.untranslated && (
                  <small className="whatsnew-lang">{t('whatsNew.untranslated')}</small>
                )}
              </h3>
              <ul>
                {releaseDisplay(release, changelogVisual).map(({ index, change, visual }) => (
                  <li className={`whatsnew-change ${change.kind}${visual ? ' whatsnew-illustrated' : ''}`} key={index}>
                    {renderChange(change, visual)}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="sheet-foot whatsnew-foot" ref={footerRef}>
          {/* Only when this update changed what the tour shows. The whole tour is one click away in Settings. */}
          {showable && (
            <button className="btn soft" onClick={() => onShowMe(scope.versions)}>
              <Icon name="week" size="md" />
              {t('whatsNew.showMe')}
            </button>
          )}
          {!history && <button className="btn soft" onClick={() => {
            bodyRef.current?.scrollTo({ top: 0 });
            onSeeChangelog();
            footerRef.current?.querySelector<HTMLButtonElement>('[data-autofocus]')?.focus();
          }}>{t('whatsNew.seeChangelog')}</button>}
          <span className="whatsnew-end">
            {/* The full words are the name; a phone has room for two. */}
            <a className="btn coffee" href={COFFEE_URL} target="_blank" rel="noreferrer noopener" aria-label={t('coffee.offer')} title={t('coffee.offer')}>
              <Icon name="coffee" size="md" />
              <span className="coffee-long">{t('coffee.offer')}</span>
              <span className="coffee-short">{t('coffee.offerShort')}</span>
            </a>
            <button className="btn primary" data-autofocus onClick={onClose}>
              {t('whatsNew.continue')}
            </button>
          </span>
        </div>
      </div>
    </Overlay>
  );
}
