import type { Command } from './commands';

/** Only identifier fields may be rewritten: task text can equal a temporary ID. */
function resolveIds(value: unknown, mapping: Record<string, string>, field = ''): unknown {
  const identifier = field === 'id' || field === 'ids' || field.endsWith('_id') || field.endsWith('_ids');
  if (typeof value === 'string') return identifier ? mapping[value] ?? value : value;
  if (Array.isArray(value)) return value.map((entry) => resolveIds(entry, mapping, field));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [
      field === 'ids_to_orders' ? mapping[key] ?? key : key,
      resolveIds(entry, mapping, key),
    ]));
  }
  return value;
}

export function resolveCommandIds(commands: Command[], mapping: Record<string, string>): Command[] {
  return commands.map((cmd) => ({ ...cmd, args: resolveIds(cmd.args, mapping) as Command['args'] }));
}

