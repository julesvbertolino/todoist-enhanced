import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../Icon';
import { useT } from '@/hooks/useT';
import { tourStops, type TourStop } from '@/domain/tour';

/**
 * The tour: a few things worth pointing at, pointed at.
 *
 * Not a dialog describing features — the app itself, with one part of it lit
 * and the rest dimmed. Every stop names a real element by `data-tour`, and the
 * element is measured where it actually is rather than drawn again here, so
 * what is being explained is the thing you will be using.
 *
 * A stop whose element is not on the page is skipped rather than shown
 * pointing at nothing. That is what makes this safe to run against somebody's
 * own week on their first connection: an empty week simply gives a shorter
 * tour, and nobody is shown a highlight over an empty patch of page.
 *
 * Nothing here can be interacted with. The dim layer takes every click, so the
 * tour cannot leave the app in a state the reader did not choose — the only
 * controls are its own.
 */

type Stop = TourStop;

/** Where the element is, in viewport coordinates, plus a little air. */
interface Hole { top: number; left: number; width: number; height: number }

const PAD = 8;
const CARD_W = 320;
const GAP = 14;

/**
 * Whether there is anything to point at.
 *
 * Deliberately not a question about the viewport: every stop scrolls its
 * element into view before it is shown, so "below the fold right now" is not a
 * reason to drop it. Asking that here is what silently cut the subtasks stop
 * out of a tour on a window too short to show it at the start.
 */
function exists(target: string): boolean {
  const el = targetElement(target);
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return r.width >= 4 && r.height >= 4;
}

function measure(target: string, also: string[] = []): Hole | null {
  const el = targetElement(target);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width < 4 || r.height < 4) return null;

  /* Some things are more than one element. A parent task and the subtasks
     under it are siblings, not a nest, so an element can ask for the ones
     that follow it to be taken in — and the highlight is drawn around all of
     them rather than around the first. */
  let [top, left, right, bottom] = [r.top, r.left, r.right, r.bottom];
  if (el.dataset.tourExtend === 'siblings') {
    let next = el.nextElementSibling;
    while (next instanceof HTMLElement && next.dataset.depth) {
      const c = next.getBoundingClientRect();
      top = Math.min(top, c.top);
      left = Math.min(left, c.left);
      right = Math.max(right, c.right);
      bottom = Math.max(bottom, c.bottom);
      next = next.nextElementSibling;
    }
  }

  /* Several elements lit as one: the highlight is drawn around all of them. */
  for (const other of also) {
    const node = targetElement(other);
    if (!node) continue;
    const c = node.getBoundingClientRect();
    top = Math.min(top, c.top);
    left = Math.min(left, c.left);
    right = Math.max(right, c.right);
    bottom = Math.max(bottom, c.bottom);
  }

  return {
    top: top - PAD, left: left - PAD,
    width: right - left + PAD * 2, height: bottom - top + PAD * 2,
  };
}

function targetElement(target: string): HTMLElement | null {
  const candidates = document.querySelectorAll<HTMLElement>(
    `[data-tour="${target}"]`,
  );
  return [...candidates].find((candidate) => {
    const rect = candidate.getBoundingClientRect();
    return rect.width >= 4 && rect.height >= 4;
  }) ?? null;
}

interface TourProps {
  open: boolean;
  onDone: () => void;
  /**
   * Only the stops that came with these releases: what an update brought, for
   * the "Show me" button in What's new. Left out, the whole tour.
   */
  versions?: string[] | null;
}

export function Tour({ open, onDone, versions = null }: TourProps) {
  const { t } = useT();
  const [index, setIndex] = useState(0);
  /* What is on screen: a rectangle and the stop it belongs to, changed together
     so the card never explains one element while the light is on another. */
  const [shown, setShown] = useState<{ hole: Hole; stop: Stop } | null>(null);
  const hole = shown?.hole ?? null;

  /* The stops that have something to point at. Null until that has actually
     been worked out, which is not the same as "none" — telling the two apart
     is what stops the tour ending itself in the moment before it has looked. */
  const [stops, setStops] = useState<Stop[] | null>(null);
  useEffect(() => {
    if (!open) { setStops(null); setShown(null); return; }
    setIndex(0);
    // A beat's delay: the view this runs over has usually just been navigated
    // to, and measuring before it has laid out finds nothing and skips it all.
    /* Counted once, when it opens, and never changed while it runs (#4): the
       tour plays on the full demo view, where every stop has its target. A
       missing one is a bug, said in development, and still shown. */
    const id = window.setTimeout(() => {
      const all = tourStops(versions);
      if (import.meta.env.DEV) {
        const missing = all.filter((s) => !exists(s.target)).map((s) => s.target);
        if (missing.length > 0) console.warn('[tour] no target on screen for', missing);
      }
      setStops(all);
    }, 150);
    return () => window.clearTimeout(id);
  }, [open, versions]);

  /* A stop left out while the tour runs can leave the index past the end: it
     settles on the last one rather than on nothing. */
  const stop = stops?.[Math.min(index, Math.max(0, (stops?.length ?? 1) - 1))];
  useEffect(() => {
    if (stops && stops.length > 0 && index > stops.length - 1) setIndex(stops.length - 1);
  }, [stops, index]);

  useLayoutEffect(() => {
    if (!open || !stop) return;

    const el = targetElement(stop.target);
    /* Instant, not smooth. The highlight has a transition of its own, so a
       smooth scroll means measuring a page that is still moving: the rectangle
       glides to where the element *was* and only catches up at the end. One
       jump, then one glide, and the two never disagree on screen. */
    el?.scrollIntoView({ block: 'center', behavior: 'auto' });

    /* The previous rectangle stays where it is until the new one can be measured:
       dropping it for a frame unmounts the overlay, and the glide from one stop to
       the next turns into a blink. */
    const update = () => {
      const next = measure(stop.target, stop.also);
      if (next) setShown({ hole: next, stop });
    };
    update();
    // Layout can settle a frame late — a sticky header resolving, a font.
    const settle = window.setTimeout(() => {
      update();
      /* Still nothing to point at once the page has settled: the stop stays,
         its card centred on the screen, and the count does not change. */
      if (!measure(stop.target, stop.also)) {
        setShown({
          hole: { top: window.innerHeight / 2 - 110, left: window.innerWidth / 2, width: 0, height: 0 },
          stop,
        });
      }
    }, 120);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.clearTimeout(settle);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, stop]);

  const count = stops?.length ?? 0;

  /* The card's real height, so it is placed by what it is rather than by a guess. */
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardH, setCardH] = useState(190);
  useLayoutEffect(() => {
    if (cardRef.current) setCardH(cardRef.current.offsetHeight);
  }, [stop, hole]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onDone(); }
      if (e.key === 'ArrowRight') setIndex((at) => Math.min(at + 1, count - 1));
      if (e.key === 'ArrowLeft') setIndex((at) => Math.max(at - 1, 0));
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onDone, count]);

  // Looked, and there was nothing on this page to point at.
  useEffect(() => {
    if (open && stops !== null && stops.length === 0) onDone();
  }, [open, stops, onDone]);

  if (!open) return null;

  if (!stop || !shown || !hole) return null;
  const at = Math.max(0, stops?.indexOf(shown.stop) ?? 0);

  const last = at === count - 1;

  /* Beside the highlight when it is in the sidebar (the card never covers the
     thing it explains), otherwise under it when there is room and above it when
     there is not — and clamped into the viewport either way. */
  const inSidebar = hole.left + hole.width < 300;
  const clampTop = (y: number) => Math.min(Math.max(GAP, y), window.innerHeight - cardH - GAP);
  const below = hole.top + hole.height + GAP;
  const fitsBelow = below + cardH + GAP < window.innerHeight;
  const top = inSidebar
    ? clampTop(hole.top + hole.height / 2 - cardH / 2)
    : clampTop(fitsBelow ? below : hole.top - cardH - GAP);
  const left = inSidebar
    ? hole.left + hole.width + GAP
    : Math.min(
        Math.max(GAP, hole.left + hole.width / 2 - CARD_W / 2),
        window.innerWidth - CARD_W - GAP,
      );

  const overlay = createPortal(
    <div className="tour" role="dialog" aria-label={t('tour.title')}>
      {/* One element, one enormous shadow: everything outside the rectangle is
          dimmed, and the rectangle itself is left alone. Cheaper and steadier
          than four panels that have to agree with each other on every scroll. */}
      <div
        className="tour-hole"
        style={{ top: hole.top, left: hole.left, width: hole.width, height: hole.height }}
      />

      <div className="tour-card" ref={cardRef} style={{ top, left, width: CARD_W }}>
        <div className="tour-top">
          <span>{t('tour.count', { current: at + 1, total: (stops ?? []).length })}</span>
          <button className="tour-skip" onClick={onDone}>{t('tour.skip')}</button>
        </div>
        <span className="tour-line" aria-hidden="true">
          <i style={{ width: `${((at + 1) / Math.max(1, (stops ?? []).length)) * 100}%` }} />
        </span>
        <h3>{t(shown.stop.title)}</h3>
        <p>{t(shown.stop.body)}</p>
        <div className="tour-foot">
          {at > 0 && (
            <button className="btn soft" onClick={() => setIndex((at) => Math.max(at - 1, 0))}>
              {t('tour.back')}
            </button>
          )}
          <button
            className="btn primary"
            onClick={() => (last ? onDone() : setIndex((at) => at + 1))}
          >
            {last ? t('tour.done') : t('tour.next')}
            {!last && <Icon name="arrow-right" size="sm" />}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
  return overlay;
}
