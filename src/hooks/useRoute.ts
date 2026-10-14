import { useEffect, useState } from 'react';
import type { ViewId } from '@/domain/types';

export interface Route {
  view: ViewId;
  /** Project or label id, when the view needs one. */
  id?: string;
  /** A project section to reveal after navigation from global search. */
  sectionId?: string;
  query?: string;
}

/**
 * An id read back from the address bar. The browser stores what is typed there
 * percent-encoded, so a label called "🏠 Home" arrives as `%F0%9F%8F%A0%20Home`
 * and would never match the label itself (#196). A name that is not valid
 * encoding, from a link written before ids were encoded, is kept as it is.
 */
function readId(id: string): string {
  try {
    return decodeURIComponent(id);
  } catch {
    return id;
  }
}

export function parseRoute(hash: string): Route {
  const raw = hash.replace(/^#\/?/, '');
  if (!raw) return { view: 'week' };
  const [path, query = ''] = raw.split('?');
  const [view, id] = path.split('/');
  // The dashboard is a tab of the insights page; an old link still lands there.
  if (view === 'dashboard') return { view: 'insights' };
  const known: ViewId[] = [
    'inbox', 'week', 'today', 'upcoming', 'someday', 'review',
    'settings', 'project', 'label', 'labels', 'filter', 'filters', 'matrix', 'insights', 'search',
  ];
  if (!known.includes(view as ViewId)) return { view: 'week' };
  if (view === 'search') return { view: 'search', query: new URLSearchParams(query).get('q') ?? '' };
  const sectionId = view === 'project' ? new URLSearchParams(query).get('section') ?? undefined : undefined;
  return id ? { view: view as ViewId, id: readId(id), sectionId } : { view: view as ViewId };
}

export const routeKey = (route: Route): string =>
  route.id ? `${route.view}:${route.id}` : route.view;

export function navigate(view: ViewId, id?: string, options?: { sectionId?: string; query?: string }): void {
  const base = id ? `#/${view}/${encodeURIComponent(id)}` : `#/${view}`;
  if (view === 'search') { window.location.hash = `${base}?q=${encodeURIComponent(options?.query ?? '')}`; return; }
  window.location.hash = options?.sectionId
    ? `${base}?section=${encodeURIComponent(options.sectionId)}`
    : base;
}

/** The current destination, kept in the address bar so Back works in the PWA. */
export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash));

  useEffect(() => {
    const onChange = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return route;
}
