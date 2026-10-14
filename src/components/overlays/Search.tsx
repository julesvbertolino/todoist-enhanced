import { AssigneeBadge } from '../AssigneeBadge';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Overlay } from './Overlay';
import { Icon, type IconName } from '../Icon';
import { useT } from '@/hooks/useT';
import { useData } from '@/hooks/useData';
import { navigate } from '@/hooks/useRoute';
import { markerStyle } from '@/domain/colors';
import { toDisplayPriority } from '@/domain/types';
import { foldSearch as fold, searchRank } from '@/domain/search';
import { useStore } from '@/store/store';

interface SearchProps {
  open: boolean;
  onClose: () => void;
  onOpen: (id: string) => void;
  /**
   * What was already typed when the search opened.
   *
   * Typing on a page with no cursor on it opens this with the letter in it, so
   * the first keystroke is not the one that gets eaten by the shortcut that
   * opened the field.
   */
  seed?: string;
}

/** One row of the result list, whatever kind of thing it points at. */
interface Hit {
  key: string;
  icon?: IconName;
  marker?: ReactNode;
  title: string;
  detail?: string;
  assigneeId?: string | null;
  run: () => void;
}

/**
 * Global search across tasks, projects and tags, run over the local mirror.
 *
 * The list is driven from the keyboard: the field keeps focus, the arrows move
 * a cursor through the results and Enter opens the one under it. A palette you
 * have to reach for the mouse in the middle of is not a palette.
 */
export function Search({ open, onClose, onOpen, seed = '' }: SearchProps) {
  const { t } = useT();
  const { snapshot, items } = useData();
  const includeSections = useStore((s) => s.prefs.includeSectionsInSearch);
  const eisenhowerEnabled = useStore((s) => s.prefs.eisenhowerEnabled);
  const setPrefs = useStore((s) => s.setPrefs);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) { setQuery(seed); setCursor(-1); }
    /* `seed` deliberately left out: it is read at the moment of opening, and
       nothing that changes it afterwards should retype the field under
       somebody's hands. */
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Read the seed only on opening; later changes must preserve typed text.
  }, [open]);

  /**
   * Everywhere the app can go.
   *
   * The same list whether or not anything has been typed: it used to be shown
   * on opening and then thrown away the moment you touched a key, so typing
   * "settings" — the fastest way anybody would try to reach settings — found
   * nothing but tasks with the word in them.
   */
  const destinations: Hit[] = useMemo(() => {
    const go = (run: () => void) => () => { run(); onClose(); };
    return [
      { key: 'go-inbox', icon: 'inbox', title: t('nav.inbox'), run: go(() => navigate('inbox')) },
      { key: 'go-today', icon: 'calendar', title: t('nav.today'), run: go(() => navigate('today')) },
      { key: 'go-week', icon: 'week', title: t('nav.week'), run: go(() => navigate('week')) },
      { key: 'go-upcoming', icon: 'upcoming', title: t('nav.upcoming'),
        run: go(() => navigate('upcoming')) },
      { key: 'go-someday', icon: 'someday', title: t('nav.someday'),
        run: go(() => navigate('someday')) },
      { key: 'go-review', icon: 'check', title: t('nav.review'),
        run: go(() => navigate('review')) },
      /* Always findable: opening it from here turns the page on, rather than
         hiding it from the one place you would look for it. */
      { key: 'go-matrix', icon: 'dashboard' as const, title: t('nav.matrix'),
        run: go(() => {
          if (!eisenhowerEnabled) setPrefs({ eisenhowerEnabled: true });
          navigate('matrix');
        }) },
      { key: 'go-labels', icon: 'tag', title: t('nav.labels'),
        run: go(() => navigate('labels')) },
      { key: 'go-filters', icon: 'filter', title: t('nav.filters'),
        run: go(() => navigate('filters')) },
      { key: 'go-dashboard', icon: 'trend', title: t('nav.dashboard'),
        run: go(() => navigate('insights')) },
      { key: 'go-logbook', icon: 'tasks', title: t('insights.logbook'),
        run: go(() => navigate('insights', 'logbook')) },
      { key: 'go-settings', icon: 'settings', title: t('nav.settings'),
        run: go(() => navigate('settings')) },
    ];
  }, [t, onClose, eisenhowerEnabled, setPrefs]);

  const hits: Hit[] = useMemo(() => {
    const go = (run: () => void) => () => { run(); onClose(); };
    const q = fold(query);

    if (!q) return destinations;

    /* How well a name answers what was typed: the whole of it, its beginning,
       the beginning of one of its words, anywhere in it. Everything found is
       ranked on this one scale, whatever kind of thing it is, so the best
       answer is first rather than the first kind of answer. */
    const rank = (name: string, ...others: string[]) => searchRank(query, name, ...others);

    interface Ranked { hit: Hit; score: number }
    const found: Ranked[] = [];

    /* Where to go counts for a little more than the same match in a task: a
       palette is reached for to go somewhere more often than to find one task
       among four hundred. */
    for (const hit of destinations) {
      const score = rank(hit.title);
      if (score >= 0) found.push({ hit, score: score - 0.5 });
    }

    if (includeSections) {
      for (const section of Object.values(snapshot.sections)) {
        const parent = snapshot.projects[section.project_id];
        if (section.is_archived || section.is_deleted || !parent || parent.is_archived || parent.is_deleted) continue;
        const score = rank(section.name);
        if (score < 0) continue;
        found.push({
          score: score - 0.25,
          hit: {
            key: `section-${section.id}`,
            icon: 'section',
            title: section.name,
            detail: parent.name,
            /* Resolve again on selection. A stale palette falls back to the
               parent project instead of manufacturing a broken destination. */
            run: go(() => {
              const current = snapshot.sections[section.id];
              navigate(
                'project',
                current?.project_id ?? section.project_id,
                current ? { sectionId: current.id } : undefined,
              );
            }),
          },
        });
      }
    }

    for (const item of items) {
      const score = rank(item.content, item.description);
      if (score < 0) continue;
      found.push({
        score,
        hit: {
          key: `task-${item.id}`,
          assigneeId: item.responsible_uid,
          /* The list row's own checkbox, priority colour and all, not clickable (#15). */
          marker: <span className={`check p${toDisplayPriority(item.priority)} search-check`} aria-hidden="true" />,
          title: item.content,
          detail: snapshot.projects[item.project_id]?.name ?? '',
          run: go(() => onOpen(item.id)),
        },
      });
    }

    for (const project of Object.values(snapshot.projects)) {
      if (project.is_archived || project.is_deleted) continue;
      const score = rank(project.name);
      if (score < 0) continue;
      found.push({
        score,
        hit: {
          key: `project-${project.id}`,
          marker: <span className="hash" style={markerStyle(project.color)}>#</span>,
          title: project.name,
          run: go(() => navigate('project', project.id)),
        },
      });
    }

    for (const label of Object.values(snapshot.labels)) {
      if (label.name.startsWith('est-')) continue;
      const score = rank(label.name);
      if (score < 0) continue;
      found.push({
        score,
        hit: {
          key: `label-${label.id}`,
          icon: 'tag',
          title: label.name,
          run: go(() => navigate('label', label.name)),
        },
      });
    }

    /* Stable: equally good answers stay in the order they were found. */
    return found
      .map((entry, order) => ({ ...entry, order }))
      .sort((a, b) => a.score - b.score || a.order - b.order)
      .slice(0, 30)
      .map((entry) => entry.hit);
  }, [query, items, snapshot, includeSections, onOpen, onClose, destinations]);

  // A new query invalidates wherever the cursor was.
  useEffect(() => { setCursor(-1); }, [query]);

  // Keep the row under the cursor on screen while the arrows move it.
  useEffect(() => {
    listRef.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  const empty = query.trim() !== '' && hits.length === 0;

  const onKeyDown = (event: React.KeyboardEvent) => {

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setCursor((c) => Math.min(c + 1, hits.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setCursor((c) => Math.max(-1, c - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (cursor === -1 && query.trim()) { navigate('search', undefined, { query: query.trim() }); onClose(); }
      else hits[cursor]?.run();
    }
  };

  return (
    <Overlay open={open} onClose={onClose} label={t('nav.search')} size="search">
      <div className="searchfield">
        <Icon name="search" />
        <input
          type="search"
          placeholder={t(includeSections ? 'search.placeholderWithSections' : 'search.placeholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          aria-label={t('nav.search')}
          aria-activedescendant={hits[cursor]?.key}
          autoFocus
        />
        <kbd>Esc</kbd>
      </div>

      <div className="sresults" ref={listRef} role="listbox">
        {hits.map((hit, index) => (
          <div key={hit.key}>
            <button
              id={hit.key}
              role="option"
              aria-selected={index === cursor}
              onClick={hit.run}
            >
              {hit.marker ?? (hit.icon && <Icon name={hit.icon} />)}
              <span>
                <strong>{hit.title}</strong>
                {hit.detail && <small>{hit.detail}</small>}
                <AssigneeBadge id={hit.assigneeId ?? null} />
              </span>
            </button>
          </div>
        ))}

        {empty && <p className="empty">{t('search.noResults')}</p>}
      </div>

      <div className="searchfoot">
        <span><kbd>↑</kbd><kbd>↓</kbd> {t('search.hintMove')}</span>
        <span><kbd>↵</kbd> {t(cursor === -1 ? 'search.hintAll' : 'search.hintOpen')}</span>
      </div>
    </Overlay>
  );
}
