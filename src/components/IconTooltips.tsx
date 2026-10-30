import { useEffect } from 'react';

/* Quick, and instant while moving along a row of buttons, as a menu bar does. */
const SHOW_AFTER_MS = 250;
const CHAIN_MS = 600;
/* Controls that say what they are with a visible label beside them. */
const LABELLED_BY_NEIGHBOUR = new Set(['switch', 'checkbox', 'radio', 'tab', 'option']);

/** What a button's tooltip says: its label, or the title the browser would have shown late and plain. */
const labelOf = (button: HTMLElement): string | null => button.getAttribute('aria-label') ?? button.getAttribute('title') ?? button.dataset.tipTitle ?? null;

/** The icon-only button under a node, when it has a name for a tooltip to say. */
function iconButtonAt(node: EventTarget | null): HTMLElement | null {
  if (!(node instanceof Element)) return null;
  const button = node.closest<HTMLElement>('button[aria-label], button[title], [role="button"][aria-label]');
  if (!button || button.hasAttribute('data-tooltip')) return null;
  if (LABELLED_BY_NEIGHBOUR.has(button.getAttribute('role') ?? '')) return null;
  if (button.hasAttribute('disabled') || button.textContent?.trim()) return null;
  return button;
}

/**
 * One tooltip for every icon-only button (#380).
 *
 * A button that shows an icon and nothing else has an `aria-label` for screen
 * readers; a sighted mouse user got nothing. This reads that label and shows
 * it, on hover and on keyboard focus, so a button added later needs no code to
 * be explained. A button with a `title` (the row's actions) has it shown here,
 * quickly, instead of by the browser a second later; one with a `data-tooltip`
 * already has its own. A touch screen has no hover to show it on.
 */
export function IconTooltips() {
  useEffect(() => {
    let bubble: HTMLDivElement | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let current: HTMLElement | null = null;

    let lastShown = 0;

    const hide = () => {
      clearTimeout(timer);
      if (bubble) lastShown = Date.now();
      if (current?.dataset.tipTitle !== undefined) {
        current.setAttribute('title', current.dataset.tipTitle);
        delete current.dataset.tipTitle;
      }
      current = null;
      bubble?.remove();
      bubble = null;
    };

    const show = (button: HTMLElement) => {
      const label = labelOf(button);
      if (!label || !button.isConnected) return;
      bubble?.remove();
      bubble = document.createElement('div');
      bubble.className = 'icontip';
      bubble.setAttribute('role', 'tooltip');
      bubble.textContent = label;
      document.body.appendChild(bubble);
      const anchor = button.getBoundingClientRect();
      const box = bubble.getBoundingClientRect();
      const left = Math.min(Math.max(8, anchor.left + anchor.width / 2 - box.width / 2), window.innerWidth - box.width - 8);
      const below = anchor.bottom + 6;
      const top = below + box.height + 8 > window.innerHeight ? anchor.top - box.height - 6 : below;
      bubble.style.left = `${Math.round(left)}px`;
      bubble.style.top = `${Math.round(top)}px`;
    };

    const arm = (button: HTMLElement | null) => {
      if (button === current) return;
      hide();
      if (!button) return;
      current = button;
      /* The browser's own tooltip would come on top of this one. */
      const title = button.getAttribute('title');
      if (title !== null) { button.dataset.tipTitle = title; button.removeAttribute('title'); }
      timer = setTimeout(() => show(button), Date.now() - lastShown < CHAIN_MS ? 0 : SHOW_AFTER_MS);
    };

    const onOver = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      arm(iconButtonAt(event.target));
    };
    const onFocus = (event: FocusEvent) => {
      const target = event.target;
      if (target instanceof Element && target.matches(':focus-visible')) arm(iconButtonAt(target));
    };

    document.addEventListener('pointerover', onOver);
    document.addEventListener('pointerdown', hide, true);
    document.addEventListener('focusin', onFocus);
    document.addEventListener('focusout', hide);
    document.addEventListener('keydown', hide, true);
    window.addEventListener('scroll', hide, true);
    window.addEventListener('blur', hide);
    return () => {
      hide();
      document.removeEventListener('pointerover', onOver);
      document.removeEventListener('pointerdown', hide, true);
      document.removeEventListener('focusin', onFocus);
      document.removeEventListener('focusout', hide);
      document.removeEventListener('keydown', hide, true);
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('blur', hide);
    };
  }, []);
  return null;
}
