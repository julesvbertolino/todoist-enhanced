import type { IconName } from '@/components/Icon';
import type { DisplayMode } from '@/domain/types';

/** The layouts a saved view can take, in the order they are offered. */
export const VIEW_MODES: DisplayMode[] = ['list', 'board', 'table', 'calendar', 'matrix'];

/** The icon of a layout: it is what a view's pill shows, so a view reads at a glance. */
export const MODE_ICON: Record<DisplayMode, IconName> = {
  list: 'list', board: 'board', table: 'table', calendar: 'calendar', focus: 'stack', matrix: 'dashboard',
};
