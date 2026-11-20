/**
 * The icons a project can wear, in the order the picker shows them. Kept apart from the drawings so
 * that reading a project's icon never has to wait for the catalogue to load. An icon id outside this
 * list is no icon at all: the project shows the default #.
 */
export const PROJECT_ICON_IDS = [
  'folder', 'message-circle', 'book-open-text', 'briefcase', 'target', 'code', 'mouse-pointer', 'mouse',
  'gamepad', 'gift', 'users', 'lightbulb', 'pin', 'palette', 'thumbs-up', 'link', 'house',
  'shopping-basket', 'shopping-cart', 'chess-knight', 'file-text', 'archive',
  'smartphone', 'monitor', 'heart', 'pencil', 'app-window', 'wallet-cards', 'popcorn', 'truck',
  'traffic-cone', 'sun', 'sticky-note', 'at-sign', 'calendar', 'coffee', 'construction', 'eye',
  'chef-hat', 'bookmark', 'mic', 'map-pin', 'plane', 'map', 'navigation', 'pencil-ruler',
  'mail', 'hourglass', 'piggy-bank', 'camera', 'video',
  'alarm-clock', 'baby', 'bell', 'bike', 'braces', 'bug', 'brush', 'car', 'check-square', 'cross', 'dog', 'dumbbell', 'running',
  'file-code', 'graduation-cap', 'landmark', 'list', 'send', 'trophy', 'user',
];

const KNOWN = new Set(PROJECT_ICON_IDS);

export const isProjectIconId = (id: string): boolean => KNOWN.has(id);
