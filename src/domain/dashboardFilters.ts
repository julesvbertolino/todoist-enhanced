import { toDisplayPriority, type CompletedItem, type Item, type ViewFilters } from './types';

/** History never borrows present-day attributes from a reopened recurring task. */
export function matchesDashboardHistory(item: CompletedItem, filters: ViewFilters): 'match' | 'no-match' | 'unknown' {
  if ((filters.priorities.length > 0 && item.priority == null) || (filters.labels.length > 0 && !Array.isArray(item.labels))) return 'unknown';
  if (filters.priorities.length && !filters.priorities.includes(toDisplayPriority(item.priority!))) return 'no-match';
  if (filters.labels.length && !filters.labels.some(label => item.labels!.some(value => value.toLowerCase() === label.toLowerCase()))) return 'no-match';
  return 'match';
}

export function matchesDashboardOpen(item: Item, filters: ViewFilters): boolean {
  return (!filters.priorities.length || filters.priorities.includes(toDisplayPriority(item.priority))) &&
    (!filters.labels.length || filters.labels.some(label => item.labels.some(value => value.toLowerCase() === label.toLowerCase())));
}
