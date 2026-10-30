import type { ViewPrefs } from './types';

/**
 * Saved views of a project (#333).
 *
 * A view is a named way of looking at the same tasks: its own layout,
 * grouping, sorting and filters. It needs no storage of its own for those: the
 * settings of a view already live under a key (`viewPrefs`), so a view is only
 * a name that points at a key. The first view keeps the project's own key, so
 * the way a project is set up today is its first view, untouched.
 */
export interface ProjectViewTab { id: string; name: string }
export interface ProjectViews { tabs: ProjectViewTab[] }

/** The view every project starts with. */
export const MAIN_VIEW = 'main';

/** The most views a project holds: more would not fit a settings comment. */
export const MAX_VIEWS = 20;

const NAME_LIMIT = 60;

/** The key a view's settings are kept under. */
export const viewKeyOf = (projectId: string, viewId: string): string =>
  viewId === MAIN_VIEW ? `project:${projectId}` : `project:${projectId}~${viewId}`;

/** The project a settings key belongs to, whichever of its views it is. */
export const projectIdOfKey = (key: string): string | undefined =>
  key.startsWith('project:') ? key.slice('project:'.length).split('~')[0] : undefined;

/** Whether a key is one of a project's extra views rather than the project itself. */
export const isViewKey = (key: string): boolean => key.startsWith('project:') && key.includes('~');

/** The views to draw: the ones kept, or the single default one. */
export function tabsOf(stored: ProjectViews | undefined, defaultName: string): ProjectViewTab[] {
  return stored && stored.tabs.length > 0 ? stored.tabs : [{ id: MAIN_VIEW, name: defaultName }];
}

/** The view in front: the last one opened here, if it still exists, else the first. */
export function activeTab(tabs: ProjectViewTab[], activeId: string | undefined): ProjectViewTab {
  return tabs.find((tab) => tab.id === activeId) ?? tabs[0];
}

/** A name nobody else in the project has: "Focus", then "Focus 2", "Focus 3"… */
export function uniqueName(tabs: ProjectViewTab[], wanted: string, fallback: string, exceptId?: string): string {
  const base = wanted.trim().replace(/\s+/g, ' ').slice(0, NAME_LIMIT) || fallback;
  const taken = new Set(tabs.filter((tab) => tab.id !== exceptId).map((tab) => tab.name.toLowerCase()));
  let name = base;
  for (let n = 2; taken.has(name.toLowerCase()); n += 1) name = `${base} ${n}`;
  return name;
}

/** A short id that no view of the project already has. */
export function newViewId(tabs: ProjectViewTab[], random: () => number = Math.random): string {
  const used = new Set(tabs.map((tab) => tab.id));
  for (;;) {
    const id = Math.floor(random() * 36 ** 6).toString(36).padStart(6, '0');
    if (id !== MAIN_VIEW && !used.has(id)) return id;
  }
}

/** The list with one view moved to a place, clamped to the list. */
export function moveTab(tabs: ProjectViewTab[], id: string, to: number): ProjectViewTab[] {
  const from = tabs.findIndex((tab) => tab.id === id);
  if (from < 0) return tabs;
  const target = Math.max(0, Math.min(tabs.length - 1, to));
  if (target === from) return tabs;
  const next = [...tabs];
  const [one] = next.splice(from, 1);
  next.splice(target, 0, one);
  return next;
}

/** The list without one view, which is refused when it is the last. */
export function withoutTab(tabs: ProjectViewTab[], id: string): ProjectViewTab[] {
  return tabs.length < 2 ? tabs : tabs.filter((tab) => tab.id !== id);
}

/** What to open after a view is deleted: the one before it, as a browser tab does. */
export function neighbourAfterDelete(tabs: ProjectViewTab[], id: string): string | undefined {
  const at = tabs.findIndex((tab) => tab.id === id);
  const rest = tabs.filter((tab) => tab.id !== id);
  return rest[Math.max(0, at - 1)]?.id;
}

/** The settings of one view copied to another, so the two never share filters. */
export const cloneSettings = (view: ViewPrefs): ViewPrefs => ({
  ...view,
  filters: { ...view.filters, priorities: [...view.filters.priorities], labels: [...view.filters.labels], projects: [...view.filters.projects], workspaces: [...view.filters.workspaces], assignees: view.filters.assignees ? [...view.filters.assignees] : view.filters.assignees },
  ...(view.tableColumns ? { tableColumns: [...view.tableColumns] } : {}),
  ...(view.tableOrder ? { tableOrder: [...view.tableOrder] } : {}),
  ...(view.tableWidths ? { tableWidths: { ...view.tableWidths } } : {}),
  ...(view.calendar ? { calendar: { ...view.calendar } } : {}),
});

/** Views as the settings hold them, whatever an older or damaged copy says. */
export function readProjectViews(value: unknown): Record<string, ProjectViews> {
  if (!value || typeof value !== 'object') return {};
  const out: Record<string, ProjectViews> = {};
  for (const [projectId, raw] of Object.entries(value as Record<string, unknown>)) {
    const list = (raw as { tabs?: unknown } | null)?.tabs;
    if (!Array.isArray(list)) continue;
    const seen = new Set<string>();
    const tabs: ProjectViewTab[] = [];
    for (const item of list) {
      const { id, name } = (item ?? {}) as { id?: unknown; name?: unknown };
      if (typeof id !== 'string' || typeof name !== 'string' || !/^[a-z0-9]{1,12}$/.test(id) || seen.has(id)) continue;
      seen.add(id);
      tabs.push({ id, name: name.slice(0, NAME_LIMIT) });
      if (tabs.length >= MAX_VIEWS) break;
    }
    if (tabs.length > 0) out[projectId] = { tabs };
  }
  return out;
}

/** A plain map of text to text, nothing else. */
export function readStringMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object') return {};
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([, v]) => typeof v === 'string')) as Record<string, string>;
}
