import type { DropTarget } from './dnd';
import type { Item } from './types';
import { translate } from '@/i18n';

type Ask = (request: { title: string; body: string; confirmLabel: string; destructive: boolean }) => Promise<boolean>;
let ask: Ask | null = null;
export function registerMoveConfirmation(next: Ask): () => void {
  ask = next;
  return () => { if (ask === next) ask = null; };
}

/** Dates carry Todoist's repeat rule: an undated destination ends that series. */
export async function confirmUndatedMove(items: Item[], target: DropTarget | undefined, locale: 'en' | 'fr', removeDate = false): Promise<boolean> {
  if ((target?.kind !== 'anytime' && target?.kind !== 'someday') || !items.some((it) => it.due?.is_recurring)) return true;
  // No UI available: preserve the series rather than silently removing it.
  if (!ask) return false;
  return ask({ title: translate(locale, 'task.endRepeatTitle'), body: translate(locale, removeDate ? 'task.endRepeatRemoveDateBody' : 'task.endRepeatBody', { destination: translate(locale, target.kind === 'anytime' ? 'group.anytime' : 'nav.someday') }),
    confirmLabel: translate(locale, 'task.endRepeatMove'), destructive: true });
}
