import { describe, expect, it } from 'vitest';
import { applySync, resolveTempIds } from './sync';
import { emptySnapshot, type Snapshot } from '@/domain/types';
import { item } from '@/test/items';

const section = (id: string, project_id: string) => ({
  id, project_id, name: id, section_order: 1, is_archived: false, is_deleted: false,
});

describe('resolveTempIds', () => {
  it('returns the snapshot untouched when nothing was mapped', () => {
    const snapshot = emptySnapshot();
    expect(resolveTempIds(snapshot, {})).toBe(snapshot);
  });

  it('renames a placeholder and points everything at the real id', () => {
    const snapshot: Snapshot = {
      ...emptySnapshot(),
      items: {
        'tmp-parent': item({ id: 'tmp-parent', project_id: 'p', section_id: 'tmp-section' }),
        'tmp-child': item({ id: 'tmp-child', parent_id: 'tmp-parent', project_id: 'p' }),
      },
      sections: { 'tmp-section': section('tmp-section', 'p') },
    };
    const next = resolveTempIds(snapshot, {
      'tmp-parent': 'real-parent', 'tmp-child': 'real-child', 'tmp-section': 'real-section',
    });
    expect(Object.keys(next.items).sort()).toEqual(['real-child', 'real-parent']);
    expect(next.items['real-child'].parent_id).toBe('real-parent');
    expect(next.items['real-parent'].section_id).toBe('real-section');
    expect(Object.keys(next.sections)).toEqual(['real-section']);
  });

  it('drops the placeholder when the real copy has already arrived', () => {
    const snapshot: Snapshot = {
      ...emptySnapshot(),
      items: {
        tmp: item({ id: 'tmp', content: 'placeholder' }),
        real: item({ id: 'real', content: 'from Todoist' }),
      },
    };
    const next = resolveTempIds(snapshot, { tmp: 'real' });
    expect(Object.keys(next.items)).toEqual(['real']);
    expect(next.items.real.content).toBe('from Todoist');
  });
});

describe('applySync filters', () => {
  const filter = (id: string, extra = {}) => ({
    id, name: id, query: 'today', color: 'red', item_order: 1, is_deleted: false, is_favorite: false, ...extra,
  });

  it('reads filters into a snapshot saved before they existed', () => {
    const old = { ...emptySnapshot() };
    delete old.filters;
    const next = applySync(old, { sync_token: 't', full_sync: true, filters: [filter('f1')] });
    expect(Object.keys(next.filters ?? {})).toEqual(['f1']);
  });

  it('keeps filters when an incremental read carries none, and drops a deleted one', () => {
    const base = applySync(emptySnapshot(), { sync_token: 't', full_sync: true, filters: [filter('f1'), filter('f2')] });
    const same = applySync(base, { sync_token: 'u', full_sync: false });
    expect(Object.keys(same.filters ?? {}).sort()).toEqual(['f1', 'f2']);
    const gone = applySync(base, { sync_token: 'v', full_sync: false, filters: [filter('f2', { is_deleted: true })] });
    expect(Object.keys(gone.filters ?? {})).toEqual(['f1']);
  });
});

describe('collaborator sync variants and deletion', () => {
  it('reads both spellings of the membership field defensively', () => {
    const next = applySync(emptySnapshot(), { sync_token: 't', full_sync: true,
      collaborators_states: [{ project_id: 'p', user_id: 'a', state: 'active' }] });
    expect(next.collaboratorStates?.[0].user_id).toBe('a');
  });
  it('removes a collaborator mapping marked deleted instead of keeping an active tombstone', () => {
    const base = { ...emptySnapshot(), collaboratorStates: [{ project_id: 'p', user_id: 'a', state: 'active' }] };
    const next = applySync(base, { sync_token: 't', full_sync: false,
      collaborator_states: [{ project_id: 'p', user_id: 'a', state: 'active', is_deleted: true }] });
    expect(next.collaboratorStates).toEqual([]);
  });
});

describe('workspace completion totals', () => {
  it('keeps project counts across incremental sync and accepts zero without mixing section counts', () => {
    const initial = applySync(emptySnapshot(), { full_sync: true, sync_token: 'first', completed_info: [
      { project_id: 'p', completed_items: 12 }, { project_id: 'p', section_id: 'section', completed_items: 4 },
    ] });
    expect(initial.completedProjectCounts).toEqual({ p: 12 });
    const unchanged = applySync(initial, { full_sync: false, sync_token: 'second' });
    expect(unchanged.completedProjectCounts).toEqual({ p: 12 });
    const zero = applySync(unchanged, { full_sync: false, sync_token: 'third', completed_info: [{ project_id: 'p', completed_items: 0 }] });
    expect(zero.completedProjectCounts).toEqual({ p: 0 });
    expect(applySync(zero, { full_sync: true, sync_token: 'fourth', completed_info: [] }).completedProjectCounts).toEqual({});
  });
});

describe('incremental sync preserves unchanged data', () => {
  it('keeps collection identities while advancing the cursor, and still applies real changes', () => {
    const task = item({ id: 'a', content: 'Before' });
    const initial = applySync(emptySnapshot(), { full_sync: true, sync_token: 'one', items: [task] });
    const unchanged = applySync(initial, { full_sync: false, sync_token: 'two', items: [{ ...task }], folders: [], refreshedFolderWorkspaces: [] });
    expect(unchanged.syncToken).toBe('two');
    expect(unchanged.items).toBe(initial.items);
    expect(unchanged.folders).toBe(initial.folders);
    expect(unchanged.completedProjectCounts).toBe(initial.completedProjectCounts);
    const changed = applySync(unchanged, { full_sync: false, sync_token: 'three', items: [{ ...task, content: 'After' }] });
    expect(changed.items).not.toBe(unchanged.items);
    expect(changed.items.a.content).toBe('After');
    const deleted = applySync(changed, { full_sync: false, sync_token: 'four', items: [{ ...task, is_deleted: true }] });
    expect(deleted.items.a).toBeUndefined();
  });
});
