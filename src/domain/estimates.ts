import { ESTIMATE_PREFIX, estimateStorage, type EstimateStorage, type TodoistUser, type Item } from './types';

/**
 * An estimate is a number of minutes, carried one of two ways (#151):
 *
 * - the label `est-<positive integer>`, which works on every plan and is what
 *   this app has always written;
 * - Todoist's own `duration` field, in minutes, which Todoist officially
 *   supports on a task with a date and a time (where it is the length of the
 *   block in its calendar) and is rolling out for undated tasks.
 *
 * Both are read: the chosen storage wins, with the other as fallback. In tag
 * mode a timed duration can be a calendar block, so the tag takes precedence.
 * A duration counted in days is not an estimate and is ignored.
 */

export interface EstimateReading {
  /** Minutes, or null when the task carries no estimate at all. */
  minutes: number | null;
  /** Every `est-*` label found, valid or not, in the order Todoist returned them. */
  raw: string[];
  /** True when more than one `est-*` label is present. */
  multiple: boolean;
  /** True when an `est-*` label is present but its value is not a positive integer. */
  invalid: boolean;
  /** Which of the two the minutes came from. */
  source: 'tag' | 'duration' | null;
  /** The first valid `est-*` tag, in minutes. */
  tagMinutes: number | null;
  /** The `duration` field, when it is a positive number of minutes. */
  durationMinutes: number | null;
  /** Both are valid, and they disagree. */
  mismatch: boolean;
}

const ESTIMATE_RE = new RegExp(`^${ESTIMATE_PREFIX}(.+)$`, 'i');

type EstimateSource = Pick<Item, 'labels'> & { duration?: Item['duration'] };

/** Todoist's duration as minutes, or null when it is absent, in days, or not a positive amount. */
export function durationMinutes(duration: Item['duration'] | undefined): number | null {
  if (!duration || duration.unit !== 'minute') return null;
  const amount = Number(duration.amount);
  if (!Number.isFinite(amount)) return null;
  const minutes = Math.round(amount);
  return minutes > 0 ? minutes : null;
}

/**
 * Reads the estimate a task carries, reporting tag conflicts rather than
 * guessing. Given labels alone, only the tag is read.
 *
 * `multiple` and `invalid` are about tags only: a duration can never be the
 * reason a task is reported as having two estimates or a broken one.
 */
export function readEstimate(source: string[] | EstimateSource): EstimateReading {
  const labels = Array.isArray(source) ? source : source.labels;
  const fromDuration = Array.isArray(source) ? null : durationMinutes(source.duration);
  const raw = labels.filter((l) => ESTIMATE_RE.test(l));

  const parsed = raw.map((label) => {
    const value = label.match(ESTIMATE_RE)![1];
    // Only a bare positive integer is a valid stored estimate.
    if (!/^\d+$/.test(value)) return null;
    const n = Number.parseInt(value, 10);
    return n > 0 ? n : null;
  });
  const valid = parsed.filter((n): n is number => n !== null);
  const fromTag = valid.length > 0 ? valid[0] : null;

  const preferred = estimateStorage();
  const [chosen, minutes]: ['tag' | 'duration' | null, number | null] = preferred === 'tag' && fromTag !== null
    ? ['tag', fromTag]
    : fromDuration !== null ? ['duration', fromDuration]
    : fromTag !== null ? ['tag', fromTag] : [null, null];

  return {
    minutes,
    raw,
    multiple: raw.length > 1,
    invalid: valid.length !== raw.length,
    source: chosen,
    tagMinutes: fromTag,
    durationMinutes: fromDuration,
    mismatch: fromTag !== null && fromDuration !== null && fromTag !== fromDuration,
  };
}

export const estimateOf = (item: EstimateSource): number | null => readEstimate(item).minutes;

/**
 * Parses what a human types into minutes. Accepts "12", "12 min", "1 h",
 * "1h15", "75 min", "1:30", "2h". Returns null when nothing sensible is found.
 */
export function parseDurationInput(input: string): number | null {
  const words: Record<string, string> = { un: '1', une: '1', one: '1', deux: '2', two: '2', trois: '3', three: '3', quatre: '4', four: '4', cinq: '5', five: '5', six: '6', sept: '7', seven: '7', huit: '8', eight: '8', neuf: '9', nine: '9', dix: '10', ten: '10', onze: '11', eleven: '11', douze: '12', twelve: '12', trente: '30', thirty: '30', quinze: '15', fifteen: '15' };
  const s = input.trim().toLowerCase().replace(',', '.').replace(/\b(un|une|one|deux|two|trois|three|quatre|four|cinq|five|six|sept|seven|huit|eight|neuf|nine|dix|ten|onze|eleven|douze|twelve|trente|thirty|quinze|fifteen)\b/g, (word) => words[word]);
  if (!s) return null;

  // "1:30" / "1h30" / "1 h 15" — hours and minutes together.
  const hm = s.match(/^(\d+)\s*(?:h|:|hour|hours|heure|heures)\s*(\d{1,2})?\s*(?:m|min|minute|minutes)?$/);
  if (hm) {
    const hours = Number.parseInt(hm[1], 10);
    const mins = hm[2] ? Number.parseInt(hm[2], 10) : 0;
    if (mins >= 60) return null;
    const total = hours * 60 + mins;
    return total > 0 ? total : null;
  }

  // "1.5h" — fractional hours.
  const fractional = s.match(/^(\d*\.?\d+)\s*(?:h|hour|hours|heure|heures)$/);
  if (fractional) {
    const total = Math.round(Number.parseFloat(fractional[1]) * 60);
    return total > 0 ? total : null;
  }

  // "45", "45 min", "45m".
  const minutes = s.match(/^(\d+)\s*(?:m|min|mins|minute|minutes)?$/);
  if (minutes) {
    const total = Number.parseInt(minutes[1], 10);
    return total > 0 ? total : null;
  }

  return null;
}

/** Turns minutes into the label the task should carry. */
export const estimateLabel = (minutes: number): string => `${ESTIMATE_PREFIX}${Math.round(minutes)}`;

/** Replaces every `est-*` label with a single one, or strips them when minutes is null. */
export function withEstimate(labels: string[], minutes: number | null): string[] {
  const kept = labels.filter((l) => !ESTIMATE_RE.test(l));
  return minutes === null ? kept : [...kept, estimateLabel(minutes)];
}

/** Explicit free accounts drop duration writes silently (verified on Pro/Free).
 * Unknown plans are allowed and verified after writing; team membership wins. */
export function canStoreDurations(user: Pick<TodoistUser, 'is_premium' | 'premium_status'> | null): boolean {
  if (user?.premium_status && user.premium_status !== 'not_premium') return true;
  return user?.is_premium !== false;
}

/** The only builder of estimate fields. Tag mode never owns the calendar block. */
export function estimatePatch(item: Pick<Item, 'labels'>, minutes: number | null, storage: EstimateStorage = estimateStorage()): Pick<Item, 'labels'> & Partial<Pick<Item, 'duration'>> {
  if (minutes !== null && (!Number.isFinite(minutes) || Math.round(minutes) <= 0)) throw new Error('Invalid estimate');
  return storage === 'tag'
    ? { labels: withEstimate(item.labels, minutes) }
    : { labels: withEstimate(item.labels, null), duration: minutes === null ? null : { amount: Math.round(minutes), unit: 'minute' } };
}

/** "1 h 15", "45 min", "2 h". The separator keeps the mockup's typography. */
export function formatDuration(minutes: number, locale: 'en' | 'fr' = 'en'): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  const hourUnit = 'h';
  const minuteUnit = locale === 'fr' ? 'min' : 'min';
  if (h === 0) return `${m} ${minuteUnit}`;
  if (m === 0) return `${h} ${hourUnit}`;
  return `${h} ${hourUnit} ${String(m).padStart(2, '0')}`;
}

/**
 * What the open subtasks of a task add up to, when every one of them has an
 * estimate of its own (#187); null as soon as one of them does not, or when
 * there is no open subtask at all.
 *
 * A subtask that is itself a parent counts through the same rule, so a
 * grandparent follows its children's sums. A subtask whose figure is only a
 * partial, computed `*` sum does not count as estimated: the whole point is to
 * be sure every part is known before the parent defers to them.
 */
export function childrenSum(
  item: Pick<Item, 'id'>,
  childrenOf: (parentId: string) => Item[],
  /* Ids on the way down, so a list that loops back on itself ends instead of
     running forever. Todoist never sends one; a test double might. */
  seen: ReadonlySet<string> = new Set(),
): number | null {
  if (seen.has(item.id)) return null;
  const below = new Set(seen).add(item.id);
  const children = childrenOf(item.id).filter((c) => !c.checked && !c.is_deleted);
  if (children.length === 0) return null;
  let sum = 0;
  for (const child of children) {
    const minutes = childrenSum(child, childrenOf, below) ?? estimateOf(child);
    if (minutes === null) return null;
    sum += minutes;
  }
  return sum;
}

/**
 * The estimate that counts towards a total.
 *
 * When every open subtask has one, their sum wins over the parent's own: the
 * parts are the more precise information (#187). Otherwise the parent's own
 * estimate stands; without one, the sum of the estimated children stands in
 * as a computed estimate. Children are looked up through `childrenOf`.
 */
export function effectiveEstimate(
  item: Pick<Item, 'id' | 'labels' | 'duration'>,
  childrenOf: (parentId: string) => Item[],
): { minutes: number | null; computed: boolean } {
  const all = childrenSum(item, childrenOf);
  if (all !== null) return { minutes: all, computed: false };

  const own = estimateOf(item);
  if (own !== null) return { minutes: own, computed: false };

  const children = childrenOf(item.id).filter((c) => !c.checked);
  const sum = children.reduce((acc, c) => acc + (estimateOf(c) ?? 0), 0);
  return sum > 0 ? { minutes: sum, computed: true } : { minutes: null, computed: false };
}

/**
 * The parents whose own estimate no longer says what their subtasks add up
 * to, with the figure to write (#187). Nothing is returned for a parent that
 * has a subtask without an estimate: it keeps what it has.
 */
export function parentEstimateWrites(
  items: Item[],
  childrenOf: (parentId: string) => Item[],
): Array<{ id: string; minutes: number }> {
  const writes: Array<{ id: string; minutes: number }> = [];
  for (const item of items) {
    const sum = childrenSum(item, childrenOf);
    if (sum !== null && sum > 0 && estimateOf(item) !== sum) writes.push({ id: item.id, minutes: sum });
  }
  return writes;
}
