import { useEffect } from 'react';

const SHOW_AFTER_MS = 400;
/* Controls that say what they are with a visible label beside them. */
const LABELLED_BY_NEIGHBOUR = new Set(['switch', 'checkbox', 'radio', 'tab', 'option']);

/** The icon-only button under a node, when it has a name for a tooltip to say and none of its own. */
function iconButtonAt(node: EventTarget | null): HTMLElement | null {
  if (!(node instanceof Element)) return null;
  const button = node.closest<HTMLElement>('button[aria-label], [role="button"][aria-label]');
  if (!button || button.hasAttribute('title') || button.hasAttribute('data-tooltip')) return null;
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
 * be explained. A button with a `title` or a `data-tooltip` already has its
 * own and is left alone, and a touch screen has no hover to show it on.
 */
export function IconTooltips() {
  useEffect(() => {
    let bubble: HTMLDivElement | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let current: HTMLElement | null = null;

    const hide = () => {
      clearTimeout(timer);
      current = null;
      bubble?.remove();
      bubble = null;
    };

    const show = (button: HTMLElement) => {
      const label = button.getAttribute('aria-label');
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
      timer = setTimeout(() => show(button), SHOW_AFTER_MS);
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
