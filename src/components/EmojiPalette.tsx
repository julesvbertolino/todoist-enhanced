import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import { useT } from '@/hooks/useT';

/**
 * Every emoji, to react to a comment with (#27).
 *
 * The data is emojibase's (MIT), in English and French: names and keywords in
 * both are searched whatever the interface language, and the categories are
 * named in the interface's. It is loaded the first time the palette opens, in
 * a chunk of its own, so the app itself does not carry it.
 *
 * Drawn in a portal, fixed beside the button that opened it, so the scrolling
 * task window never cuts it. The search field has the focus: typing filters,
 * the arrows walk the grid, Enter picks, Escape closes and goes no further.
 */

interface Emoji { unicode: string; label: string; tags: string[]; group: number; order: number }
interface Data { emojis: Emoji[]; groups: Array<{ order: number; message: string }> }

/** One row of the grid. */
const COLUMNS = 8;
const RECENT_KEY = 'enhanced.recent-reactions';
const RECENT_MAX = 16;

/** Components (skin tones, hair) are parts, not reactions. */
const COMPONENT_GROUP = 2;

const fold = (text: string) => text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * The form a reaction is stored under.
 *
 * emojibase writes the variation selector after every emoji; Todoist's own
 * picker sends 👍 as one character. An emoji that is drawn as an emoji anyway
 * loses the selector, one that needs it (❤️) keeps it.
 */
export function reactionKey(unicode: string): string {
  const bare = unicode.replace(/️/g, '');
  return /^\p{Emoji_Presentation}$/u.test(bare) ? bare : unicode;
}

let loading: Promise<Data> | null = null;

function loadData(locale: 'en' | 'fr'): Promise<Data> {
  loading ??= Promise.all([
    import('emojibase-data/en/compact.json'),
    import('emojibase-data/fr/compact.json'),
    import(locale === 'fr' ? 'emojibase-data/fr/messages.json' : 'emojibase-data/en/messages.json'),
  ]).then(([en, fr, messages]) => {
    const french = new Map<string, { label: string; tags?: string[] }>();
    for (const entry of fr.default as Array<{ hexcode: string; label: string; tags?: string[] }>) {
      french.set(entry.hexcode, entry);
    }
    const emojis: Emoji[] = [];
    for (const entry of en.default as Array<{ hexcode: string; label: string; tags?: string[]; group?: number; order?: number; unicode: string }>) {
      if (entry.group === undefined || entry.group === COMPONENT_GROUP) continue;
      const other = french.get(entry.hexcode);
      emojis.push({
        unicode: reactionKey(entry.unicode),
        label: locale === 'fr' && other ? other.label : entry.label,
        tags: [entry.label, ...(entry.tags ?? []), ...(other ? [other.label, ...(other.tags ?? [])] : [])].map(fold),
        group: entry.group,
        order: entry.order ?? 0,
      });
    }
    emojis.sort((a, b) => a.order - b.order);
    const groups = (messages.default as { groups: Array<{ order: number; message: string }> }).groups;
    return { emojis, groups };
  });
  return loading;
}

function readRecent(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function writeRecent(emoji: string) {
  try {
    const next = [emoji, ...readRecent().filter((item) => item !== emoji)].slice(0, RECENT_MAX);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch { /* a private window: the palette simply has no recent row */ }
}

export function EmojiPalette({ anchor, onPick, onClose }: {
  /** The button that opened it: the palette sits beside it. */
  anchor: HTMLElement | null;
  onPick: (emoji: string) => void;
  onClose: () => void;
}) {
  const { t, locale } = useT();
  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState('');
  const [at, setAt] = useState(0);
  const [recent] = useState(readRecent);
  const root = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);
  /* After the click that opened it has finished, or the button keeps the focus. */
  useEffect(() => {
    const id = window.setTimeout(() => field.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    let live = true;
    loadData(locale).then((loaded) => { if (live) setData(loaded); }, () => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [locale]);

  /* What is shown: the matches when something is typed, otherwise the recent
     ones and then every category. `flat` is the same emoji in reading order,
     which is what the arrows walk. */
  const sections = useMemo(() => {
    if (!data) return [];
    const words = fold(query).trim().split(/\s+/).filter(Boolean);
    if (words.length > 0) {
      const found = data.emojis.filter((emoji) => words.every((word) => emoji.tags.some((tag) => tag.includes(word))));
      return [{ key: 'results', title: t('reaction.results'), items: found.slice(0, 240) }];
    }
    const byUnicode = new Map(data.emojis.map((emoji) => [emoji.unicode, emoji]));
    const recentItems = recent.map((unicode) => byUnicode.get(unicode) ?? { unicode, label: unicode, tags: [], group: -1, order: -1 });
    return [
      ...(recentItems.length > 0 ? [{ key: 'recent', title: t('reaction.recent'), items: recentItems }] : []),
      ...data.groups
        .filter((group) => group.order !== COMPONENT_GROUP)
        .map((group) => ({
          key: `g${group.order}`,
          title: group.message.charAt(0).toUpperCase() + group.message.slice(1),
          items: data.emojis.filter((emoji) => emoji.group === group.order),
        }))
        .filter((section) => section.items.length > 0),
    ];
  }, [data, query, recent, t]);
  const flat = useMemo(() => sections.flatMap((section) => section.items), [sections]);

  useEffect(() => { setAt(0); }, [query]);
  useEffect(() => {
    grid.current?.querySelector<HTMLElement>(`[data-index="${at}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [at]);

  /* Beside the button, below it when there is room, above it when not, and
     always inside the window. */
  const [place, setPlace] = useState<{ top: number; left: number } | null>(null);
  useLayoutEffect(() => {
    const measure = () => {
      if (!anchor) return;
      const box = anchor.getBoundingClientRect();
      const width = root.current?.offsetWidth ?? 316;
      const height = root.current?.offsetHeight ?? 360;
      const below = box.bottom + 6;
      const top = below + height + 8 <= window.innerHeight ? below : Math.max(8, box.top - height - 6);
      const left = Math.min(Math.max(8, box.right - width), window.innerWidth - width - 8);
      setPlace({ top, left });
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [anchor]);

  /* A press anywhere else puts it away. */
  useEffect(() => {
    const away = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!root.current?.contains(target) && !anchor?.contains(target)) onClose();
    };
    document.addEventListener('pointerdown', away, true);
    return () => document.removeEventListener('pointerdown', away, true);
  }, [anchor, onClose]);

  const pick = (emoji: string) => {
    writeRecent(emoji);
    onPick(emoji);
  };

  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const move = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: COLUMNS, ArrowUp: -COLUMNS }[event.key];
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }
    if (move !== undefined && flat.length > 0) {
      /* Left and right stay in the text while there is text to move through. */
      if ((event.key === 'ArrowLeft' || event.key === 'ArrowRight') && query && event.target instanceof HTMLInputElement) {
        const field = event.target;
        const inside = event.key === 'ArrowLeft' ? (field.selectionStart ?? 0) > 0 : (field.selectionEnd ?? 0) < field.value.length;
        if (inside) return;
      }
      event.preventDefault();
      event.stopPropagation();
      setAt((now) => Math.min(Math.max(0, now + move), flat.length - 1));
      return;
    }
    if (event.key === 'Enter' && flat[at]) {
      event.preventDefault();
      event.stopPropagation();
      pick(flat[at].unicode);
    }
  };

  let index = 0;
  return createPortal(
    <div
      className="emojipalette"
      ref={root}
      role="dialog"
      aria-label={t('comment.react')}
      /* Transparent rather than hidden until placed: a hidden field cannot take the focus. */
      style={place ? { top: place.top, left: place.left } : { opacity: 0, pointerEvents: 'none' }}
      onKeyDown={onKey}
    >
      <label className="emojipalette-search">
        <Icon name="search" size="sm" />
        <input
          ref={field}
          value={query}
          placeholder={t('reaction.search')}
          aria-label={t('reaction.search')}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div className="emojipalette-grid" ref={grid} role="listbox" aria-label={t('comment.react')}>
        {failed && <p className="emojipalette-empty">{t('reaction.unavailable')}</p>}
        {!data && !failed && <p className="emojipalette-empty">{t('reaction.loading')}</p>}
        {data && flat.length === 0 && <p className="emojipalette-empty">{t('reaction.none')}</p>}
        {sections.map((section) => (
          <section key={section.key}>
            <h6>{section.title}</h6>
            <div className="emojipalette-row">
              {section.items.map((emoji) => {
                const mine = index++;
                return (
                  <button
                    key={`${section.key}-${emoji.unicode}`}
                    type="button"
                    role="option"
                    tabIndex={-1}
                    data-index={mine}
                    aria-selected={mine === at}
                    aria-label={emoji.label}
                    title={emoji.label}
                    onMouseEnter={() => setAt(mine)}
                    onClick={() => pick(emoji.unicode)}
                  >
                    {emoji.unicode}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>,
    document.body,
  );
}
