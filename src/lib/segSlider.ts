/**
 * The thumb of every segmented control (`.segmented`, `.seg2`) slides to the
 * option you pick instead of jumping there.
 *
 * Done once for all of them, from outside: each control already says which
 * option is on through `aria-pressed` or `aria-checked`, so this only reads
 * that and writes where the thumb goes as custom properties. The stylesheet
 * draws it. A control that is not on screen yet is left alone until it is.
 */
const SELECTOR = '.segmented, .seg2, .reviewactions, .timescope, .timechoices';
const ON = '[aria-pressed="true"], [aria-checked="true"]';

function place(control: HTMLElement) {
  const on = control.querySelector<HTMLElement>(ON);
  if (!on || on.offsetWidth === 0) {
    control.classList.remove('seg-slide', 'seg-ready');
    return;
  }
  // The control becomes the thumb's positioning context before anything is measured.
  const fresh = !control.classList.contains('seg-slide');
  if (fresh) control.classList.add('seg-slide');
  control.style.setProperty('--seg-x', `${on.offsetLeft}px`);
  control.style.setProperty('--seg-y', `${on.offsetTop}px`);
  control.style.setProperty('--seg-w', `${on.offsetWidth}px`);
  control.style.setProperty('--seg-h', `${on.offsetHeight}px`);
  // Placed first, animated afterwards: the thumb is never seen travelling in from nowhere.
  if (fresh) requestAnimationFrame(() => requestAnimationFrame(() => control.classList.add('seg-ready')));
}

export function startSegSlider(): () => void {
  if (typeof document === 'undefined') return () => {};
  let queued = false;
  const all = () => {
    queued = false;
    document.querySelectorAll<HTMLElement>(SELECTOR).forEach(place);
  };
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(all);
  };
  const observer = new MutationObserver(schedule);
  observer.observe(document.body, {
    subtree: true, childList: true, attributes: true, attributeFilter: ['aria-pressed', 'aria-checked', 'class'],
  });
  window.addEventListener('resize', schedule);
  const fonts = (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts;
  void fonts?.ready.then(schedule);
  schedule();
  return () => { observer.disconnect(); window.removeEventListener('resize', schedule); };
}
