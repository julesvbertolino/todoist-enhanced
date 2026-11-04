import { useMemo, type ReactNode } from 'react';
import { useDataSnapshot } from '@/hooks/useDataSnapshot';
import { LocalFoldProvider, ParentChipProvider, SubtasksProvider } from '@/components/TaskRow';
import { TaskGroup } from '@/components/TaskGroup';
import { useT } from '@/hooks/useT';
import {
  EISENHOWER_QUADRANTS, eisenhowerQuadrant, matrixRoots, matrixRulesFor,
  type EisenhowerQuadrant, type MatrixSettings,
} from '@/domain/eisenhower';
import type { Item, MatrixOverrides, SortKey } from '@/domain/types';
import type { MatrixLayout } from '@/store/prefs';
import { sortItems } from '@/store/selectors';
import { useStore } from '@/store/store';
import type { TranslationKey } from '@/i18n';

interface MatrixBoardProps {
  cards: Item[];
  childrenOf: (id: string) => Item[];
  sort: SortKey;
  settings: MatrixSettings;
  layout: MatrixLayout;
  onOpen: (id: string) => void;
  /** Where the card says which project it is in: not on a project's own page. */
  showProject?: boolean;
  /** Drawn at the top of the first quadrant (the note for Todoist's people). */
  lead?: ReactNode;
}

/**
 * The four quadrants, as the Matrix page and a project's Matrix layout both
 * draw them. Where a task lands is decided by the same rules (the Display
 * menu of the Matrix page) wherever the layout is used.
 */
export function MatrixBoard({ cards, childrenOf, sort, settings, layout, onOpen, showProject = true, lead }: MatrixBoardProps) {
  const { t } = useT();
  const snapshot = useDataSnapshot();
  const workspaceOrder = useStore((s) => s.prefs.workspaceOrder);

  const groups = useMemo(() => {
    const now = new Date();
    return Object.fromEntries(EISENHOWER_QUADRANTS.map((quadrant) => [
      quadrant,
      /* Whatever the sort, ties settle by the project's place in the sidebar, then by when the task was added. */
      sortItems(cards.filter((item) =>
        eisenhowerQuadrant(
          item, now, settings.urgentRules, settings.importantPriorities, settings.weekLabel,
        ) === quadrant), sort, childrenOf, 'day', snapshot, true, workspaceOrder),
    ])) as Record<EisenhowerQuadrant, Item[]>;
  }, [cards, settings, sort, childrenOf, snapshot, workspaceOrder]);

  return (
    <SubtasksProvider value={settings.subtasks}><ParentChipProvider value><LocalFoldProvider value>
      <div className={layout === 'matrix' ? 'eisenhower-grid' : 'eisenhower-list'}>
        {EISENHOWER_QUADRANTS.map((quadrant, index) => (
          <div className={`quadrant ${quadrant}`} key={quadrant}>
            <TaskGroup
              title={t(`matrix.${quadrant}.title` as TranslationKey)}
              items={groups[quadrant]}
              childrenOf={childrenOf}
              onOpen={onOpen}
              showProject={showProject}
              lead={index === 0 ? lead : undefined}
              keepWhenEmpty
              draggable={false}
              collapsible={false}
              cards
            />
          </div>
        ))}
      </div>
    </LocalFoldProvider></ParentChipProvider></SubtasksProvider>
  );
}

/**
 * The Matrix as one more layout of a project, a tag or a filter (#450): the
 * tasks the page already filtered, put in the quadrants of the global rules,
 * with no horizon of their own.
 */
export function MatrixSurface({ items, childrenOf, sort, showSubtasks, matrix, onOpen, showProject = false }: {
  items: Item[];
  childrenOf: (id: string) => Item[];
  sort: SortKey;
  showSubtasks: boolean;
  /** What this page changed in the matrix rules; the rest follows the Matrix page. */
  matrix?: MatrixOverrides;
  onOpen: (id: string) => void;
  showProject?: boolean;
}) {
  const snapshot = useDataSnapshot();
  const prefs = useStore((s) => s.prefs);
  const rules = matrixRulesFor(prefs, matrix);
  const settings = useMemo<MatrixSettings>(() => ({
    horizon: 'all', includeSomeday: true, workspace: null,
    startDay: snapshot.user?.start_day ?? 1,
    urgentRules: rules.urgent, importantPriorities: rules.important,
    weekLabel: prefs.weekLabel, subtasks: showSubtasks,
  }), [snapshot.user?.start_day, rules.urgent, rules.important, prefs.weekLabel, showSubtasks]);
  /* The page lists top-level tasks; the subtasks come from `childrenOf`, so a subtask with a date of its own can be a card too. */
  const everything = useMemo(() => {
    const seen = new Map<string, Item>();
    const walk = (item: Item) => {
      if (seen.has(item.id)) return;
      seen.set(item.id, item);
      if (showSubtasks) childrenOf(item.id).forEach(walk);
    };
    items.forEach(walk);
    return [...seen.values()];
  }, [items, childrenOf, showSubtasks]);
  const { cards } = useMemo(
    () => matrixRoots(everything, snapshot.projects, settings),
    [everything, snapshot.projects, settings],
  );
  return (
    <div className="mode matrix-layout">
      <MatrixBoard cards={cards} childrenOf={childrenOf} sort={sort} settings={settings} layout={rules.layout} onOpen={onOpen} showProject={showProject} />
    </div>
  );
}
