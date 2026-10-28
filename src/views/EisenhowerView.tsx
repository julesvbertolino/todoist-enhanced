import { HireNote } from '@/components/HireNote';
import { useMemo } from 'react';
import { EisenhowerDisplayMenu } from '@/components/EisenhowerDisplayMenu';
import { PageHeader } from '@/components/PageHeader';
import { SubtasksProvider } from '@/components/TaskRow';
import { TaskGroup } from '@/components/TaskGroup';
import { useData } from '@/hooks/useData';
import { useT } from '@/hooks/useT';
import {
  EISENHOWER_QUADRANTS, eisenhowerQuadrant, sortEisenhower,
  type EisenhowerQuadrant,
} from '@/domain/eisenhower';
import { summariseLoad } from '@/domain/load';
import { matrixVisibleItems } from '@/domain/eisenhower';
import { rootItems } from '@/store/selectors';
import { viewPrefs } from '@/store/prefs';
import { useStore } from '@/store/store';
import type { TranslationKey } from '@/i18n';

interface EisenhowerViewProps {
  onOpen: (id: string) => void;
  onUnestimated: () => void;
}

export function EisenhowerView({ onOpen, onUnestimated }: EisenhowerViewProps) {
  const { t } = useT();
  const hireNoteOpen = useStore((s) => s.hireNote);
  const { snapshot, items, childrenOf } = useData('matrix');
  const layout = useStore((s) => s.prefs.eisenhowerLayout);
  const urgentRules = useStore((s) => s.prefs.eisenhowerUrgent);
  const importantPriorities = useStore((s) => s.prefs.eisenhowerImportant);
  const horizon = useStore((s) => s.prefs.eisenhowerHorizon);
  const includeSomeday = useStore((s) => s.prefs.eisenhowerIncludeSomeday);
  const prefs = useStore((s) => s.prefs);
  const workspaceFilter = viewPrefs(prefs, 'matrix').filters.workspaces.length ? null : prefs.eisenhowerWorkspace;
  const weekLabel = useStore((s) => s.prefs.weekLabel);
  const roots = useMemo(() => rootItems(items), [items]);
  const visibleItems = useMemo(() => matrixVisibleItems(roots, snapshot.projects, horizon, includeSomeday, workspaceFilter, snapshot.user?.start_day ?? 1), [roots, snapshot.projects, horizon, includeSomeday, workspaceFilter, snapshot.user?.start_day]);
  const load = useMemo(
    () => summariseLoad(visibleItems, childrenOf, null),
    [visibleItems, childrenOf],
  );

  const groups = useMemo(() => {
    const now = new Date();
    return Object.fromEntries(EISENHOWER_QUADRANTS.map((quadrant) => [
      quadrant,
      sortEisenhower(visibleItems.filter((item) =>
        eisenhowerQuadrant(
          item, now, urgentRules, importantPriorities, weekLabel,
        ) === quadrant)),
    ])) as Record<EisenhowerQuadrant, typeof roots>;
  }, [visibleItems, urgentRules, importantPriorities, weekLabel]);

  return (
    <div className="page eisenhower-page">
      <PageHeader
        hireNote={false}
        title={t('matrix.title')}
        load={load}
        onOpenUnestimated={load.unestimatedCount > 0 ? onUnestimated : undefined}
        actions={<EisenhowerDisplayMenu />}
      />

      <SubtasksProvider value={false}>
        <div className={layout === 'matrix' ? 'eisenhower-grid' : 'eisenhower-list'}>
          {EISENHOWER_QUADRANTS.map((quadrant, index) => (
            <div className={`quadrant ${quadrant}`} key={quadrant}>
              <TaskGroup
                title={t(`matrix.${quadrant}.title` as TranslationKey)}
                items={groups[quadrant]}
                childrenOf={childrenOf}
                onOpen={onOpen}
                showProject
                lead={index === 0 && hireNoteOpen ? <div className="taskwrap"><HireNote /></div> : undefined}
                keepWhenEmpty
                draggable={false}
                collapsible={false}
                cards
              />
            </div>
          ))}
        </div>
      </SubtasksProvider>
    </div>
  );
}
