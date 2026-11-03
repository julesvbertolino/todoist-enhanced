const key = (owner: string) => `enhanced.folder-state.${owner}`;

export function readFolderState(storage: Pick<Storage, 'getItem'>, owner: string): Record<string, boolean> {
  try {
    const raw: unknown = JSON.parse(storage.getItem(key(owner)) ?? '{}');
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    return Object.fromEntries(Object.entries(raw).filter((entry): entry is [string, boolean] => typeof entry[1] === 'boolean'));
  } catch { return {}; }
}

export function writeFolderState(storage: Pick<Storage, 'setItem'>, owner: string, values: Record<string, boolean>): boolean {
  try { storage.setItem(key(owner), JSON.stringify(values)); return true; } catch { return false; }
}
