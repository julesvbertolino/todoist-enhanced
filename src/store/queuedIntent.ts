import { resolveCommandIds } from '@/api/commandIds';
import type { Command } from '@/api/commands';
import { resolveTempIds } from '@/api/sync';
import type { Snapshot } from '@/domain/types';
import { collectionOf, idsTouchedBy } from '@/domain/commandTouches';

/** Preserve visible intent for commands still awaiting acknowledgement. */
export function overlayQueuedIntent(base: Snapshot, optimistic: Snapshot, commands: Command[], mapping: Record<string, string>): Snapshot {
  const source = resolveTempIds(optimistic, mapping);
  let result = base;
  for (const command of resolveCommandIds(commands, mapping)) {
    const collection = command.type.startsWith('filter_') ? 'filters' : collectionOf(command.type);
    if (!collection) continue;
    const ids = idsTouchedBy(command);
    if (command.temp_id) ids.push(mapping[command.temp_id] ?? command.temp_id);
    for (const id of new Set(ids)) {
      const entry = source[collection]?.[id];
      const removal = /_(delete|archive)$/.test(command.type);
      if (!entry && !removal) continue;
      const entries = { ...(result[collection] ?? {}) } as Record<string, unknown>;
      if (entry) entries[id] = entry; else delete entries[id];
      result = { ...result, [collection]: entries };
    }
  }
  return result;
}
