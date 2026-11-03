import { describe, expect, it } from 'vitest';
import { readFolderState, writeFolderState } from './folderState';

describe('folder state', () => {
  it('keeps open and closed folders separately for each account', () => {
    const data = new Map<string, string>();
    const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
    expect(writeFolderState(storage, 'one', { a: false, b: true })).toBe(true);
    expect(readFolderState(storage, 'one')).toEqual({ a: false, b: true });
    expect(readFolderState(storage, 'two')).toEqual({});
  });
  it('ignores corrupt storage and handles blocked storage', () => {
    expect(readFolderState({ getItem: () => '{bad' }, 'one')).toEqual({});
    expect(readFolderState({ getItem: () => '{"a":false,"b":"wrong"}' }, 'one')).toEqual({ a: false });
    expect(writeFolderState({ setItem: () => { throw new Error('blocked'); } }, 'one', {})).toBe(false);
  });
});
