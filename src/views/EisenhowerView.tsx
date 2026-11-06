import { HireNote } from '@/components/HireNote';
import { useMemo } from 'react';
import { EisenhowerDisplayMenu } from '@/components/EisenhowerDisplayMenu';
import { PageHeader } from '@/components/PageHeader';
import { MatrixBoard } from '@/components/MatrixBoard';
import { useData } from '@/hooks/useData';
import { useT } from '@/hooks/useT';
import { matrixRoots, matrixSettings } from '@/domain/eisenhower';
import { summariseLoad } from '@/domain/load';
import { viewPrefs } from '@/store/prefs';
import { useStore } from '@/store/store';

interface EisenhowerViewProps {
  onOpen: (id: string) => void;
  onUnestimated: () => void;
}

export function EisenhowerView({ onOpen, onUnestimated }: EisenhowerViewProps) {
  const { t } = useT();
  const hireNoteOpen = useStore((s) => s.hireNote);
  const { snapshot, items, childrenOf } = useData('matrix');
  const prefs = useStore((s) => s.prefs);
  const view = viewPrefs(prefs, 'matrix');
  const settings = useMemo(() => matrixSettings(prefs, snapshot.user?.start_day), [prefs, snapshot.user?.start_day]);
  const { cards, promoted } = useMemo(
    () => matrixRoots(items, snapshot.projects, settings),
    [items, snapshot.projects, settings],
  );
  /* The load counts a subtask that is a card of its own once, as that card. */
  const nestedOf = useMemo(
    () => (id: string) => childrenOf(id).filter((child) => !promoted.has(child.id)),
    [childrenOf, promoted],
  );
  const load = useMemo(
    () => summariseLoad(cards, nestedOf, null),
    [cards, nestedOf],
  );

  return (
    <div className="page eisenhower-page">
      <PageHeader
        hireNote={false}
        title={t('matrix.title')}
        load={load}
        onOpenUnestimated={load.unestimatedCount > 0 ? onUnestimated : undefined}
        actions={<EisenhowerDisplayMenu />}
      />

      <MatrixBoard
        cards={cards}
        childrenOf={childrenOf}
        sort={view.sort}
        settings={settings}
        layout={prefs.eisenhowerLayout}
        onOpen={onOpen}
        lead={hireNoteOpen ? <div className="taskwrap"><HireNote /></div> : undefined}
      />
    </div>
  );
}
