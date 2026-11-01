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

/** A node that has just arrived: itself if it is one of those controls, and what it holds. */
function untabAdded(node: Element) {
  if (node.matches(IN_LISTS) && (node as HTMLElement).tabIndex !== -1) (node as HTMLElement).tabIndex = -1;
  untab(node);
}

/*
 * Only what arrived is looked at. Scanning the whole document after every
 * change costs tens of milliseconds on a long list, and a list changes all the
 * time (#364).
 */
export function startTabStops(): () => void {
  if (typeof document === 'undefined') return () => {};
  const added = new Set<Element>();
  let queued = false;
  const run = () => {
    queued = false;
    const nodes = [...added];
    added.clear();
    for (const node of nodes) if (node.isConnected) untabAdded(node);
  };
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      record.addedNodes.forEach((node) => { if (node.nodeType === Node.ELEMENT_NODE) added.add(node as Element); });
    }
    if (queued || added.size === 0) return;
    queued = true;
    requestAnimationFrame(run);
  });
  observer.observe(document.body, { childList: true, subtree: true });
  untab(document);
  return () => observer.disconnect();
}
