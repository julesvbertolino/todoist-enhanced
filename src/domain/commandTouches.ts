import type { Command } from '@/api/commands';

export function collectionOf(type: string): 'items' | 'projects' | 'sections' | 'labels' | 'notes' | null {
  if (type.startsWith('item_')) return 'items';
  if (type.startsWith('project_')) return 'projects';
  if (type.startsWith('section_')) return 'sections';
  if (type.startsWith('label_')) return 'labels';
  if (type.startsWith('note_')) return 'notes';
  return null;
}

/** Every id a command changes, whatever shape its arguments take. */
export function idsTouchedBy(cmd: Command): string[] {
  const args = cmd.args as Record<string, unknown>;
  const ids: string[] = [];
  if (typeof args.id === 'string') ids.push(args.id);
  for (const key of ['items', 'projects', 'sections']) {
    const list = args[key];
    if (Array.isArray(list)) {
      for (const entry of list) {
        if (typeof entry === 'string') ids.push(entry);
        else if (entry && typeof (entry as { id?: unknown }).id === 'string') ids.push((entry as { id: string }).id);
      }
    }
  }
  for (const key of ['ids_to_orders', 'id_order_mapping']) {
    const map = args[key];
    if (map && typeof map === 'object') ids.push(...Object.keys(map));
  }
  return ids;
}
