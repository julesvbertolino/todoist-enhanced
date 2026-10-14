import type { Item } from '@/domain/types';
import { TaskRow } from './TaskRow';
/** Same row and metadata as a task; only its forecast checkbox is disabled. */
export function ProjectedTask({ item, childrenOf, onOpen }: { item: Item; childrenOf: (id: string) => Item[]; onOpen: (id: string) => void }) {
  return <div className="taskwrap"><TaskRow item={item} childrenOf={childrenOf} onOpen={onOpen} /></div>;
}
