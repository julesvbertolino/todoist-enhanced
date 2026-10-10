/**
 * Tab goes where typing happens, not through every row of a list.
 *
 * A list is walked with the arrows (or J and K), which is faster than Tab and
 * does not make a ring appear on something that was only clicked. So the
 * controls inside the lists — the ticks, the hover actions, the section
 * headings and the "add" lines — are taken out of the tab order. They keep
 * working with the pointer, and the row itself still takes the focus from the
 * arrows. Fields, dialogs and menus are untouched: Tab is still how a form is
 * filled in.
 */
const IN_LISTS = [
  '.screen .task button',
  '.screen .task [role="checkbox"]',
  '.screen .taskwrap button',
  '.screen .gheadblock button',
  '.screen .coladd',
  '.screen .sectionadd',
  '.screen .addsection',
  '.screen .addsection-col',
  '.screen .chead button',
  '.screen .timerow [role="checkbox"]',
].join(',');

function untab(root: ParentNode) {
  root.querySelectorAll<HTMLElement>(IN_LISTS).forEach((el) => {
    if (el.tabIndex !== -1) el.tabIndex = -1;
  });
}

export function startTabStops(): () => void {
  if (typeof document === 'undefined') return () => {};
  let queued = false;
  const run = () => { queued = false; untab(document); };
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(run);
  });
  observer.observe(document.body, { childList: true, subtree: true });
  run();
  return () => observer.disconnect();
}
