/**
 * What a task row shows beneath its title, and in what order (v2).
 *
 * One setting for every list ("Show on each task" in a page's Display menu): a
 * row says the same things in the same order wherever it is drawn. The
 * description leads and the priority colour is the checkbox's, so neither
 * moves; the five chips in between are the user's to arrange. The sub-task
 * pill is not a chip of its own: it follows the deadline wherever that is put.
 *
 * Read defensively, like every setting that lives in the account's comment: a
 * value that is missing, mangled or from an older build gives the default,
 * and a half-written order is completed rather than thrown away.
 */

/** The chips that can be moved, in the order a row starts with. */
export const DETAIL_CHIPS = ['estimate', 'date', 'deadline', 'labels', 'project'] as const;
export type DetailChip = (typeof DETAIL_CHIPS)[number];

/** Everything that can be switched off. */
export const TASK_FIELDS = ['description', ...DETAIL_CHIPS, 'priority'] as const;
export type TaskField = (typeof TASK_FIELDS)[number];

export type TaskFields = Record<TaskField, boolean>;

export const defaultTaskFields = (): TaskFields =>
  Object.fromEntries(TASK_FIELDS.map((field) => [field, true])) as TaskFields;

export const defaultDetailOrder = (): DetailChip[] => [...DETAIL_CHIPS];

const isChip = (value: unknown): value is DetailChip =>
  typeof value === 'string' && (DETAIL_CHIPS as readonly string[]).includes(value);

/** Only a switch that was explicitly turned off reads as off. */
export function readTaskFields(stored: unknown): TaskFields {
  const value = (stored && typeof stored === 'object' ? stored : {}) as Record<string, unknown>;
  const fields = defaultTaskFields();
  for (const field of TASK_FIELDS) if (value[field] === false) fields[field] = false;
  return fields;
}

/** The stored order, each chip once, the ones it lacks following in default order. */
export function readDetailOrder(stored: unknown): DetailChip[] {
  const order: DetailChip[] = [];
  if (Array.isArray(stored)) {
    for (const chip of stored) if (isChip(chip) && !order.includes(chip)) order.push(chip);
  }
  for (const chip of DETAIL_CHIPS) if (!order.includes(chip)) order.push(chip);
  return order;
}

/** The chips to draw, in the user's order, minus any switched off. */
export const visibleDetailChips = (order: DetailChip[], fields: TaskFields): DetailChip[] =>
  order.filter((chip) => fields[chip]);

/** A chip moved to a place in the order. */
export function moveDetailChip(order: DetailChip[], chip: DetailChip, to: number): DetailChip[] {
  const from = order.indexOf(chip);
  if (from < 0) return order;
  const next = [...order];
  next.splice(from, 1);
  next.splice(Math.max(0, Math.min(to, next.length)), 0, chip);
  return next;
}

/** How many choices differ from what a row starts with. */
export const countDetailChanges = (order: DetailChip[], fields: TaskFields): number =>
  TASK_FIELDS.filter((field) => !fields[field]).length
  + (order.some((chip, at) => chip !== DETAIL_CHIPS[at]) ? 1 : 0);
