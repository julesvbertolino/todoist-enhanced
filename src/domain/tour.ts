import type { TranslationKey } from '@/i18n';

/**
 * One thing the tour points at.
 *
 * `since` is the release that brought it. A new account is shown every stop;
 * someone who has just updated can ask to be shown only the stops from the
 * releases they have not seen (the "Show me" button in What's new). A stop
 * whose `since` has no block in the changelog could never be asked for, which
 * is why a test holds the two together.
 */
export interface TourStop {
  /** The `data-tour` value of the element to light up. */
  target: string;
  /** Other elements lit up with it, as one highlight around all of them. */
  also?: string[];
  title: TranslationKey;
  body: TranslationKey;
  /** The release that brought it, `x.y.z`. */
  since: string;
}

export const TOUR_STOPS: TourStop[] = [
  { target: 'week', also: ['someday'], since: '1.0.0', title: 'tour.week', body: 'tour.weekBody' },
  { target: 'metrics', since: '1.0.0', title: 'tour.durations', body: 'tour.durationsBody' },
  { target: 'folder', since: '1.0.0', title: 'walkthrough.feature.folders', body: 'walkthrough.feature.foldersBody' },
  { target: 'project-icon', since: '1.11.0', title: 'tour.icons', body: 'tour.iconsBody' },
  { target: 'quick', since: '1.0.0', title: 'tour.quick', body: 'tour.quickBody' },
  { target: 'time', since: '1.19.0', title: 'tour.time', body: 'tour.timeBody' },
  { target: 'subtasks', since: '1.0.0', title: 'tour.subtasks', body: 'tour.subtasksBody' },
  { target: 'review', since: '1.0.0', title: 'tour.review', body: 'tour.reviewBody' },
  { target: 'dashboard', also: ['logbook'], since: '2.0.0', title: 'tour.dashboard', body: 'tour.dashboardBody' },
  { target: 'matrix', since: '1.9.0', title: 'tour.matrix', body: 'tour.matrixBody' },
  { target: 'notifications', since: '2.0.0', title: 'tour.notifications', body: 'tour.notificationsBody' },
];

/**
 * The stops a tour shows: all of them, or only those that came with the given
 * releases (the ones an update brought).
 */
export function tourStops(versions: string[] | null = null): TourStop[] {
  return versions === null
    ? TOUR_STOPS
    : TOUR_STOPS.filter((stop) => versions.includes(stop.since));
}
