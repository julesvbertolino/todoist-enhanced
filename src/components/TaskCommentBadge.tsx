import { Icon } from './Icon';
import { useStore } from '@/store/store';
import { useT } from '@/hooks/useT';
import type { Snapshot } from '@/domain/types';

const indexes = new WeakMap<Snapshot['notes'], Map<string, number>>();
export function commentCounts(notes: Snapshot['notes']): Map<string, number> {
  const cached = indexes.get(notes);
  if (cached) return cached;
  const counts = new Map<string, number>();
  for (const note of Object.values(notes)) {
    if (!note.is_deleted && note.item_id) counts.set(note.item_id, (counts.get(note.item_id) ?? 0) + 1);
  }
  indexes.set(notes, counts);
  return counts;
}

let requested: string | null = null;
export function takeCommentsRequest(id: string): boolean {
  if (requested !== id) return false;
  requested = null;
  return true;
}

export function TaskCommentBadge({ id, onOpen }: { id: string; onOpen: (id: string) => void }) {
  const count = useStore((s) => commentCounts(s.snapshot.notes).get(id) ?? 0);
  const visible = useStore((s) => s.prefs.taskFields.comments);
  const { t } = useT();
  if (!visible || !count) return null;
  return <button type="button" className="task-comments" aria-label={t('comment.openCount', { count })}
    title={t('comment.openCount', { count })} onPointerDown={(e) => e.stopPropagation()}
    onClick={(e) => { e.stopPropagation(); requested = id; onOpen(id); }}>
    <Icon name="comment" size="sm" /><span>{count}</span>
  </button>;
}
