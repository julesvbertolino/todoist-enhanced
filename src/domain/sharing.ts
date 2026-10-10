import type { Snapshot } from './types';

export interface Person {
  id: string;
  name: string;
  email: string;
  /** `invited` has not answered yet. */
  state: 'active' | 'invited';
  role: string | null;
}

/** The roles a team workspace gives a collaborator; the creator cannot be given. */
export const ROLES = ['READ_WRITE', 'EDIT_ONLY', 'COMPLETE_ONLY', 'ADMIN'] as const;

/**
 * Who a project is shared with: people who said yes, then people still
 * invited. The user themselves is not in the list, and anyone who declined,
 * left or was removed is not shared with any more.
 */
export function projectPeople(snapshot: Snapshot, projectId: string): Person[] {
  const me = snapshot.user?.id;
  const people: Person[] = [];
  for (const state of snapshot.collaboratorStates ?? []) {
    if (state.project_id !== projectId || state.user_id === me) continue;
    if (state.state !== 'active' && state.state !== 'invited') continue;
    const who = snapshot.collaborators[state.user_id];
    people.push({
      id: state.user_id,
      name: who?.full_name || who?.email || state.user_id,
      email: who?.email ?? '',
      state: state.state,
      role: state.role ?? null,
    });
  }
  return people.sort((a, b) =>
    Number(a.state === 'invited') - Number(b.state === 'invited') || a.name.localeCompare(b.name));
}

/** Tasks can only be assigned in a project somebody else is in. */
export const isShared = (snapshot: Snapshot, projectId: string): boolean =>
  projectPeople(snapshot, projectId).some((person) => person.state === 'active');

/** Who a task of this project may be given to: the user, then the active collaborators. */
export function assignees(snapshot: Snapshot, projectId: string): Array<{ id: string; name: string }> {
  const me = snapshot.user;
  const people = projectPeople(snapshot, projectId).filter((p) => p.state === 'active');
  if (people.length === 0) return [];
  return [
    ...(me ? [{ id: me.id, name: me.full_name }] : []),
    ...people.map((p) => ({ id: p.id, name: p.name })),
  ];
}

/**
 * A project somebody else owns and shared with the user: the only kind that
 * can be left. Todoist marks the owner's state `CREATOR`; without that mark
 * nothing is assumed, so an own project never offers to be left.
 */
export function isSharedWithMe(snapshot: Snapshot, projectId: string): boolean {
  const me = snapshot.user?.id;
  const states = (snapshot.collaboratorStates ?? []).filter((s) => s.project_id === projectId && s.state === 'active');
  if (!me || states.some((s) => s.user_id === me && s.role === 'CREATOR')) return false;
  return states.some((s) => s.user_id !== me && s.role === 'CREATOR')
    && states.some((s) => s.user_id === me);
}
