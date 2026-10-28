import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { useT } from '@/hooks/useT';
import { matchesSearch } from '@/domain/search';
import { PROJECT_ICONS, PROJECT_ICON_IDS, PROJECT_ICON_SYNONYMS } from '@/domain/projectIconCatalog';

export { PROJECT_ICONS, PROJECT_ICON_IDS };

export function ProjectIcon({
  iconId, size, className, style,
}: { iconId: string; size?: 'sm' | 'md' | 'lg'; className?: string; style?: React.CSSProperties }) {
  const sizeClass = size === 'sm' ? ' ic-sm' : size === 'lg' ? ' ic-lg' : '';
  const Glyph = PROJECT_ICONS[iconId];
  if (!Glyph) return null;
  return <Glyph className={`ic${sizeClass}${className ? ` ${className}` : ''}`} style={style} aria-hidden="true" />;
}

interface ProjectIconGridProps {
  value: string | null;
  onPick: (iconId: string | null) => void;
  /** Puts the cursor in the search field on mount: for a picker opened by a click, which would otherwise leave typing to the page's shortcuts (#211). */
  focusSearch?: boolean;
}

/**
 * The icon field, drawn the way the colour swatches beside it are: every
 * choice already on the page, nothing behind a click. A search bar narrows
 * the catalog above it (see `PROJECT_ICONS`); the grid under it scrolls
 * rather than growing the sheet, three rows tall until it does.
 *
 * The grid wraps at whatever width the sheet happens to be, so there is no
 * fixed column count to walk up and down by row. The arrow keys read it as
 * the one sequence it already is in the DOM — left/up back a step, right/down
 * forward one — which is what typing a search down to a handful of results
 * and then arrowing through them actually needs.
 */
export function ProjectIconGrid({ value, onPick, focusSearch }: ProjectIconGridProps) {
  const { t } = useT();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(-1);
  const search = useRef<HTMLInputElement>(null);
  /* After the click that opened it has finished, or the button keeps the focus. */
  useEffect(() => {
    if (!focusSearch) return;
    const id = window.setTimeout(() => search.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [focusSearch]);

  const choices = value && PROJECT_ICONS[value] && !PROJECT_ICON_IDS.includes(value) ? [value, ...PROJECT_ICON_IDS] : PROJECT_ICON_IDS;
  const matches = choices.filter((id) => {
    const words = [id.replace(/-/g, ' '), ...(PROJECT_ICON_SYNONYMS[id] ?? [])];
    return words.some((word) => matchesSearch(word, query));
  });

  return (
    <div className="projecticongrid-field">
      <div className="pickersearch">
        <Icon name="search" size="sm" />
        <input
          ref={search}
          value={query}
          placeholder={t('nav.search')}
          aria-label={t('project.icon')}
          onChange={(event) => { setQuery(event.target.value); setActive(-1); }}
          onKeyDown={(event) => {
            if (matches.length === 0) return;
            if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
              event.preventDefault();
              setActive((at) => (at + 1) % matches.length);
            } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
              event.preventDefault();
              setActive((at) => (at <= 0 ? matches.length - 1 : at - 1));
            } else if (event.key === 'Enter') {
              event.preventDefault();
              onPick(matches[active >= 0 ? active : 0]);
            }
          }}
        />
      </div>
      <div className="iconpickergrid">
        <button
          type="button"
          className={`iconpickeroption clear${value === null ? ' selected' : ''}`}
          aria-pressed={value === null}
          title={t('project.iconDefault')}
          onClick={() => onPick(null)}
        >
          #
        </button>
        {matches.map((id, index) => (
          <button
            key={id}
            type="button"
            ref={(node) => { if (index === active) node?.scrollIntoView({ block: 'nearest' }); }}
            className={`iconpickeroption${value === id ? ' selected' : ''}${index === active ? ' active' : ''}`}
            aria-pressed={value === id}
            title={id.replace(/-/g, ' ')}
            onMouseEnter={() => setActive(index)}
            onClick={() => onPick(id)}
          >
            <ProjectIcon iconId={id} />
          </button>
        ))}
        {matches.length === 0 && <p className="menuhint">{t('search.noResults')}</p>}
      </div>
    </div>
  );
}
