import { describe, expect, it } from 'vitest';
import { applySync } from '@/api/sync';
import { assignees, isShared, projectPeople } from './sharing';
import { emptySnapshot, type Snapshot } from './types';

const snapshot = (): Snapshot => ({
  ...emptySnapshot(),
  user: { id: 'me', full_name: 'Me' } as Snapshot['user'],
  collaborators: {
    a: { id: 'a', email: 'a@x.y', full_name: 'Alex', image_id: null },
    b: { id: 'b', email: 'b@x.y', full_name: 'Blake', image_id: null },
    c: { id: 'c', email: 'c@x.y', full_name: 'Casey', image_id: null },
  },
  collaboratorStates: [
    { project_id: 'p', user_id: 'me', state: 'active' },
    { project_id: 'p', user_id: 'b', state: 'invited' },
    { project_id: 'p', user_id: 'a', state: 'active', role: 'EDIT_ONLY' },
    { project_id: 'p', user_id: 'c', state: 'left' },
    { project_id: 'q', user_id: 'c', state: 'active' },
  ],
});

describe('sharing a project', () => {
  it('lists who said yes first, then who is still invited, and nobody who left or is the user', () => {
    expect(projectPeople(snapshot(), 'p').map((p) => [p.name, p.state, p.role])).toEqual([
      ['Alex', 'active', 'EDIT_ONLY'], ['Blake', 'invited', null],
    ]);
  });

  it('is shared once somebody is active in it, and offers the user and them for assignment', () => {
    expect(isShared(snapshot(), 'p')).toBe(true);
    expect(isShared(snapshot(), 'nowhere')).toBe(false);
    expect(assignees(snapshot(), 'p').map((p) => p.id)).toEqual(['me', 'a']);
    expect(assignees(snapshot(), 'nowhere')).toEqual([]);
  });

  it('merges states per person and project, and rebuilds them on a full sync', () => {
    const base = snapshot();
    const merged = applySync(base, {
      sync_token: 't', full_sync: false,
      collaborator_states: [{ project_id: 'p', user_id: 'b', state: 'active' }],
    });
    expect(projectPeople(merged, 'p').map((p) => p.state)).toEqual(['active', 'active']);
    const rebuilt = applySync(base, { sync_token: 't', full_sync: true });
    expect(rebuilt.collaboratorStates).toEqual([]);
  });
});
