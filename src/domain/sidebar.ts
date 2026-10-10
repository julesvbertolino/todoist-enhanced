/**
 * What the sidebar lists, in what order, and which entries are switched off.
 *
 * Two blocks, as drawn: the lists you work from (Inbox, My week…) and the other
 * views (Review, Dashboard…), a gap between them. An entry can be hidden and
 * the order is the user's; hiding one never removes the page, which stays
 * reachable from the search palette.
 *
 * Settings come from the account's comment, so they are read defensively: a
 * list written by another build may miss an entry this one has, or name one it
 * has dropped. Unknown ids go, missing ones come back in their default place,
 * and nothing a user arranged is thrown away to do either.
 */

export const SIDEBAR_ITEMS = [
  'inbox', 'today', 'week', 'upcoming', 'someday',
  'review', 'dashboard', 'logbook', 'matrix', 'labels',
] as const;
export type SidebarItemId = (typeof SIDEBAR_ITEMS)[number];

export interface SidebarEntry {
  id: SidebarItemId;
  on: boolean;
}

export interface SidebarNav {
  main: SidebarEntry[];
  other: SidebarEntry[];
}

const MAIN: SidebarItemId[] = ['inbox', 'today', 'week', 'upcoming', 'someday'];
const OTHER: SidebarItemId[] = ['review', 'dashboard', 'logbook', 'matrix', 'labels'];

export const defaultSidebarNav = (): SidebarNav => ({
  main: MAIN.map((id) => ({ id, on: true })),
  other: OTHER.map((id) => ({ id, on: true })),
});

const isItem = (value: unknown): value is SidebarItemId =>
  typeof value === 'string' && (SIDEBAR_ITEMS as readonly string[]).includes(value);

/**
 * The nav as stored, made whole: only known ids, each once, and every entry
 * the stored lists lack put back beside its default neighbour (Logbook lands
 * after Dashboard, not at the foot of the list).
 */
export function readSidebarNav(stored: unknown): SidebarNav {
  const value = (stored && typeof stored === 'object' ? stored : {}) as { main?: unknown; other?: unknown };
  const seen = new Set<SidebarItemId>();
  const take = (block: unknown): SidebarEntry[] => {
    const out: SidebarEntry[] = [];
    if (!Array.isArray(block)) return out;
    for (const entry of block) {
      const id = (entry as { id?: unknown } | null)?.id;
      if (!isItem(id) || seen.has(id)) continue;
      seen.add(id);
      out.push({ id, on: (entry as { on?: unknown }).on !== false });
    }
    return out;
  };
  const main = take(value.main);
  const other = take(value.other);

  const restore = (block: SidebarEntry[], defaults: SidebarItemId[]) => {
    defaults.forEach((id, i) => {
      if (seen.has(id)) return;
      seen.add(id);
      const before = defaults.slice(0, i).reverse().find((d) => block.some((e) => e.id === d));
      const at = before ? block.findIndex((e) => e.id === before) + 1 : 0;
      block.splice(at, 0, { id, on: true });
    });
  };
  restore(main, MAIN);
  restore(other, OTHER);
  return { main, other };
}

/**
 * The entries to draw, per block.
 *
 * `today` only exists when the week is split from it, and the matrix only
 * when it is enabled: those two settings decide whether the page exists at
 * all, the sidebar's switch decides whether it is listed.
 */
export function visibleSidebarNav(
  nav: SidebarNav,
  context: { splitToday: boolean; matrix: boolean },
): { main: SidebarItemId[]; other: SidebarItemId[] } {
  const keep = (e: SidebarEntry) =>
    e.on && (e.id !== 'today' || context.splitToday) && (e.id !== 'matrix' || context.matrix);
  return {
    main: nav.main.filter(keep).map((e) => e.id),
    other: nav.other.filter(keep).map((e) => e.id),
  };
}

/** One entry switched on or off. */
export function toggleSidebarEntry(nav: SidebarNav, id: SidebarItemId): SidebarNav {
  const flip = (e: SidebarEntry) => (e.id === id ? { ...e, on: !e.on } : e);
  return { main: nav.main.map(flip), other: nav.other.map(flip) };
}

/** An entry moved to a place in the same block. */
export function moveSidebarEntry(
  nav: SidebarNav,
  block: keyof SidebarNav,
  id: SidebarItemId,
  to: number,
): SidebarNav {
  const list = nav[block];
  const from = list.findIndex((e) => e.id === id);
  if (from < 0) return nav;
  const next = [...list];
  const [entry] = next.splice(from, 1);
  next.splice(Math.max(0, Math.min(to, next.length)), 0, entry);
  return { ...nav, [block]: next };
}
