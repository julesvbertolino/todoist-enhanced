import { bucketOf, hasLabel } from '@/domain/views';
import type { Filter, Item } from '@/domain/types';
import type { Locale } from '@/i18n';

/**
 * The demo's saved filters, and what each part of their query matches.
 *
 * A real account asks Todoist to evaluate a query. The demo has no server, so
 * each sample filter carries the answer as a plain test per comma-separated
 * part, written by hand to agree with the query shown. Nothing here parses a
 * query: a filter added to this list needs its own tests.
 */
interface DemoFilter {
  filter: Filter;
  parts: Array<(item: Item) => boolean>;
}

const dueNow = (item: Item) => {
  const bucket = bucketOf(item);
  return bucket === 'overdue' || bucket === 'today';
};

function demoFilters(locale: Locale, starred = false): DemoFilter[] {
  const fr = locale === 'fr';
  const make = (id: string, name: string, query: string, color: string, order: number, favourite: boolean): Filter => ({
    id, name, query, color, item_order: order, is_deleted: false, is_favorite: favourite,
  });
  return [
    {
      filter: make('f1', fr ? 'Rapides du jour' : 'Quick for today', '(today | overdue) & @quick', 'sky_blue', 1, starred),
      parts: [(item) => dueNow(item) && hasLabel(item, 'quick')],
    },
    {
      filter: make('f2', fr ? 'Urgent' : 'Urgent', 'p1 | p2', 'red', 2, starred),
      parts: [(item) => item.priority >= 3],
    },
    {
      filter: make('f3', fr ? 'En retard, puis aujourd’hui' : 'Overdue, then today', 'overdue, today', 'orange', 3, false),
      parts: [
        (item) => bucketOf(item) === 'overdue',
        (item) => bucketOf(item) === 'today',
      ],
    },
  ];
}

/** `starred` is the end-to-end tests' demo, whose first two filters sit in Favourites. */
export function demoFilterRecords(locale: Locale, starred = false): Record<string, Filter> {
  return Object.fromEntries(demoFilters(locale, starred).map(({ filter }) => [filter.id, filter]));
}

/** The ids each part of a demo filter matches, or null for a filter the demo does not know. */
export function demoFilterIds(filterId: string, items: Item[]): string[][] | null {
  const demo = demoFilters('en').find(({ filter }) => filter.id === filterId);
  if (!demo) return null;
  return demo.parts.map((test) => items.filter(test).map((item) => item.id));
}
