import { addDays, endOfWeek, startOfDay } from 'date-fns';
import type { CompletedItem, Item, Project } from './types';
import { anytimeItems, bucketOf, isOpen, weekItems } from './views';
import { effectiveEstimate, estimateOf } from './estimates';
import { deadlineDate, dueDate } from './dates';

/**
 * A review is a pass over the things a week quietly accumulates.
 *
 * It invents no new data. Every question it asks is answered from tasks,
 * projects and completions that already exist, which means a review can be
 * abandoned halfway through and has cost nothing, and that nothing it writes
 * back would look unusual in Todoist afterwards. There is no per-project
 * review interval here for that reason: it would have to be stored somewhere,
 * and there is nowhere to store it that Todoist would recognise.
 *
 * The daily pass asks what today is, and takes a few minutes. The weekly pass
 * closes the week that has ended and then opens the one starting, in that
 * order, because those are two different frames of mind and a pass that mixes
 * them is one people abandon in the middle.
 */

export type ReviewCadence = 'daily' | 'weekly';

export type ReviewStepId =
  /* Daily */
  | 'overdue'
  | 'inbox'
  | 'anytime'
  | 'today'
  /* Weekly */
  | 'done'
  | 'stats'
  | 'quiet'
  | 'email'
  | 'someday'
  | 'unestimated'
  | 'load';

/** What a row in a step can be sent to. The drop table does the work. */
export type ReviewAction = 'today' | 'tomorrow' | 'anytime' | 'someday';

export interface ReviewStep {
  id: ReviewStepId;
  /** The tasks this step is asking about. */
  items: Item[];
  /** The projects it is asking about, for the step that asks about projects. */
  projects: Project[];
  /** Tasks finished, for the step that reports rather than asks. */
  completed: CompletedItem[];
  /** What each row can be sent to. Empty when the step only reports. */
  actions: ReviewAction[];
  /** True where the missing thing is an estimate, so the field belongs on the row. */
  estimable: boolean;
  /** True where the missing thing is a project, so the row files rather than schedules. */
  fileable: boolean;
  /**
   * True when the step hands you something to read rather than a queue to
   * empty. The two used to look identical in the progress rail: a count of
   * finished tasks and a count of things still wrong were the same number in
   * the same circle, and Someday showed a ticked pill reading "142".
   */
  reports: boolean;
  /**
   * True when the step has nothing to settle. It is still shown — being told
   * the inbox is empty is the point of asking — but it is shown as settled.
   */
  clear: boolean;
}

export interface ReviewInput {
  /** Open, top-level tasks. Subtasks answer to their parent. */
  roots: Item[];
  projects: Record<string, Project>;
  /** Completions inside the period under review. */
  completed: CompletedItem[];
  inboxProjectId: string | null;
  now: Date;
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** How long a project may go untouched before the review mentions it. */
  quietAfterDays: number;
  /** The week's capacity, so the last step can say whether the next one fits. */
  weeklyCapacityMinutes: number;
  /** Reaching a task's children, for the estimate a parent inherits from them. */
  childrenOf: (parentId: string) => Item[];
}

/**
 * The steps a cadence walks through, in order.
 *
 * The weekly reads as two halves. Closing ends on quiet projects — the last
 * honest observation about the week that was — and opening ends on the weight
 * of the week ahead, which is the question the whole product is about. It used
 * to end on Someday: the longest, least engaging list in the app, placed
 * exactly where people stop.
 */
const STEPS: Record<ReviewCadence, ReviewStepId[]> = {
  /* Mail comes immediately before the Inbox in both passes, because a good
     part of what is sitting in the Inbox arrived as an email, and filing the
     Inbox before reading the mail files half of it. */
  daily: ['overdue', 'email', 'inbox', 'anytime', 'unestimated', 'today'],
  weekly: [
    /* What the week was */
    'done', 'stats', 'overdue', 'quiet',
    /* What the next one is */
    'email', 'inbox', 'someday', 'anytime', 'unestimated', 'load',
  ],
};

export const stepsFor = (cadence: ReviewCadence): ReviewStepId[] => STEPS[cadence];

const byDue = (a: Item, b: Item) =>
  (dueDate(a)?.getTime() ?? 0) - (dueDate(b)?.getTime() ?? 0);

/** Tasks sitting in the Inbox: captured, not yet filed anywhere. */
function inboxItems(input: ReviewInput): Item[] {
  const { inboxProjectId } = input;
  return inboxProjectId ? input.roots.filter((i) => i.project_id === inboxProjectId) : [];
}

/**
 * Projects that are open but have gone quiet.
 *
 * A project counts as quiet when it holds work and nothing in it has been
 * finished inside the window. A project with nothing left in it is not quiet,
 * it is done, and the review does not nag about it.
 */
function quietProjects(input: ReviewInput): Project[] {
  const cutoff = startOfDay(addDays(input.now, -input.quietAfterDays)).getTime();

  const touched = new Set<string>();
  for (const done of input.completed) {
    if (new Date(done.completed_at).getTime() >= cutoff) touched.add(done.project_id);
  }

  const open = new Set(input.roots.map((i) => i.project_id));

  return Object.values(input.projects)
    .filter((project) =>
      !project.is_archived &&
      !project.is_deleted &&
      !project.is_folder &&
      !project.inbox_project &&
      open.has(project.id) &&
      !touched.has(project.id))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** The tasks a step is about, before it is decided whether that is nothing. */
function contentOf(
  id: ReviewStepId,
  input: ReviewInput,
  cadence: ReviewCadence,
): Pick<ReviewStep, 'items' | 'projects' | 'completed'> {
  const empty = { items: [] as Item[], projects: [] as Project[], completed: [] as CompletedItem[] };
  const { roots, now } = input;
  const deadlineThisWeek = (item: Item) => {
    const deadline = deadlineDate(item);
    return deadline !== null && deadline >= startOfDay(now) && deadline <= endOfWeek(now, { weekStartsOn: input.weekStartsOn ?? 1 });
  };

  switch (id) {
    case 'overdue':
      return { ...empty, items: roots.filter((i) => bucketOf(i, now) === 'overdue').sort(byDue) };

    case 'inbox':
      return { ...empty, items: inboxItems(input) };

    case 'anytime':
      return { ...empty, items: anytimeItems(roots, now) };

    case 'today':
      return { ...empty, items: roots.filter((i) => bucketOf(i, now) === 'today').sort(byDue) };

    case 'done':
      return {
        ...empty,
        completed: [...input.completed].sort(
          (a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime(),
        ),
      };

    case 'unestimated':
      /* Only the work being planned. An estimate on something six months out
         is a guess about a guess, and the review will ask again nearer the
         time. The daily pass narrows it further to what today actually holds,
         because the number that matters today is today's. */
      return {
        ...empty,
        items: roots.filter((i) => {
          const bucket = bucketOf(i, now);
          const inPlay = cadence === 'daily'
            ? bucket === 'overdue' || bucket === 'today'
            : bucket === 'overdue' || bucket === 'today' || bucket === 'anytime' || deadlineThisWeek(i);
          return inPlay && estimateOf(i) === null;
        }),
      };

    case 'quiet':
      return { ...empty, projects: quietProjects(input) };

    case 'someday':
      return { ...empty, items: roots.filter((i) => bucketOf(i, now) === 'someday') };

    case 'load':
      /* Everything the coming week is carrying, which is exactly what My week
         shows and measures. The step is the same reading, at the moment it is
         still cheap to change. */
      return { ...empty, items: roots.filter((item) => weekItems([item], now).length > 0 || deadlineThisWeek(item)) };

    case 'stats':
      /* The figures are read from the same completions the first step lists,
         so the two can never disagree about the week they describe. */
      return { ...empty, completed: input.completed };

    case 'email':
      /* Nothing to list. Email lives outside this app and outside Todoist, and
         a step that pretended otherwise would be making something up. */
      return empty;

    default:
      return empty;
  }
}

/** What each step lets you do to a row. A step that only reports offers nothing. */
const ACTIONS: Record<ReviewStepId, ReviewAction[]> = {
  overdue: ['today', 'tomorrow', 'anytime', 'someday'],
  /* The Inbox is not about when. A task is in it because it has no project,
     so what it is missing is a project — see `fileable` below. */
  inbox: [],
  /* Already committed to the week. Whether it is today is the usual question,
     and "still this week" is an answer — but so is deciding the week was
     optimistic, which is why the week can be left from here rather than only
     from the step that already regrets it. */
  anytime: ['today', 'anytime', 'someday'],
  someday: ['today', 'anytime', 'someday'],
  unestimated: [],
  /* The last step of the day used to offer nothing at all: if the day was
     already full, the review ended on a problem with nowhere to put it. */
  today: ['tomorrow', 'anytime', 'someday'],
  /* The week weighed against its capacity. The only useful answer to "this
     does not fit" is taking something out of the week, so that is the one
     thing the rows do. */
  load: ['someday'],
  done: [],
  stats: [],
  quiet: [],
  email: [],
};

/** The step where the thing missing is an estimate, not a destination. */
const ESTIMABLE: ReviewStepId[] = ['unestimated'];

/** The step where the thing missing is a project, not a date. */
const FILEABLE: ReviewStepId[] = ['inbox'];

/**
 * Steps that hand you something to read.
 *
 * Everything else asks for something — a destination, a number, or a tick —
 * and carries a count of what is still outstanding. Someday belongs here
 * despite being a list of tasks: reading it is the point, a backlog is not a
 * problem, and its size is not a number of things to deal with.
 */
const REPORTS: ReviewStepId[] = ['done', 'stats', 'quiet', 'someday', 'email'];

/** Builds every step of a review, in order. */
export function buildReview(cadence: ReviewCadence, input: ReviewInput): ReviewStep[] {
  return stepsFor(cadence).map((id) => {
    const content = contentOf(id, input, cadence);
    const nothing =
      content.items.length === 0 &&
      content.projects.length === 0 &&
      content.completed.length === 0;

    const reports = REPORTS.includes(id);
    return {
      id,
      ...content,
      actions: ACTIONS[id],
      estimable: ESTIMABLE.includes(id),
      fileable: FILEABLE.includes(id),
      reports,
      /* A step that only reports is never "to settle": there is nothing to do
         about it, so it reads as settled whatever it contains. The load step is
         the exception among the asking steps — it is settled when the week
         fits, however many tasks are in it. */
      clear: id === 'load'
        ? !overloaded(content.items, input)
        : nothing || reports,
    };
  });
}

/** True when the week ahead asks for more time than the settings allow it. */
function overloaded(items: Item[], input: ReviewInput): boolean {
  if (input.weeklyCapacityMinutes <= 0) return false;
  const minutes = items.reduce(
    (total, item) => total + (effectiveEstimate(item, input.childrenOf).minutes ?? 0),
    0,
  );
  return minutes > input.weeklyCapacityMinutes;
}

/** How many steps still have something to settle. */
export const outstanding = (steps: ReviewStep[]): number =>
  steps.filter((step) => !step.clear).length;

/** Everything still open, as one selection, for the final tally. */
export function openItems(items: Item[]): Item[] {
  return items.filter(isOpen);
}
