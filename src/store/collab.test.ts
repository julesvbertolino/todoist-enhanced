import { describe, expect, it, vi } from 'vitest';
import type { Command } from '@/api/commands';
import { emptySnapshot } from '@/domain/types';
import { item } from '@/test/items';
import { createCollabSlice } from './collab';
import type { AppState } from './types';

function setup() {
  const sent: Command[][] = [];
  const snapshot = emptySnapshot();
  snapshot.items.a = item({ id: 'a' });
  snapshot.notifications = {
    n1: { id: 'n1', is_unread: true, notification_type: 'share_invitation_sent', invitation_id: '7', invitation_secret: 'sec' },
    n2: { id: 'n2', is_unread: true },
    n3: { id: 'n3', is_unread: false },
  };
  const state = {
    snapshot,
    apply: vi.fn(async (commands: Command[], optimistic: (s: typeof snapshot) => typeof snapshot) => {
      sent.push(commands);
      state.snapshot = optimistic(state.snapshot);
      return {};
    }),
  } as unknown as AppState;
  const slice = createCollabSlice(vi.fn(), () => state, {} as never);
  return { state, sent, slice };
}

describe('notifications, sharing and assignment', () => {
  it('marks every unread notification read with one command', async () => {
    const { state, sent, slice } = setup();
    await slice.markNotifications('all');
    expect(sent[0].map((c) => c.type)).toEqual(['live_notifications_mark_read_all']);
    expect(state.snapshot.notifications!.n1.is_unread).toBe(false);
    expect(state.snapshot.notifications!.n2.is_unread).toBe(false);
  });

  it('marks chosen ones unread again', async () => {
    const { state, sent, slice } = setup();
    await slice.markNotifications(['n3'], true);
    expect(sent[0][0]).toMatchObject({ type: 'live_notifications_mark_unread', args: { ids: ['n3'] } });
    expect(state.snapshot.notifications!.n3.is_unread).toBe(true);
  });

  it('answers an invitation with the id and secret the notification carried, and does nothing without them', async () => {
    const { sent, slice } = setup();
    await slice.answerInvitation('n1', true);
    expect(sent[0][0]).toMatchObject({ type: 'accept_invitation', args: { invitation_id: '7', invitation_secret: 'sec' } });
    await slice.answerInvitation('n1', false);
    expect(sent[1][0].type).toBe('reject_invitation');
    await slice.answerInvitation('n2', true);
    expect(sent).toHaveLength(2);
  });

  it('shares with a role only when one is given, removes by e-mail, and assigns or unassigns', async () => {
    const { state, sent, slice } = setup();
    await slice.shareProject('p', 'a@b.c');
    await slice.shareProject('p', 'a@b.c', 'EDIT_ONLY');
    await slice.removeCollaborator('p', 'a@b.c');
    expect(sent[0][0].args).toEqual({ project_id: 'p', email: 'a@b.c' });
    expect(sent[1][0].args).toEqual({ project_id: 'p', email: 'a@b.c', role: 'EDIT_ONLY' });
    expect(sent[2][0]).toMatchObject({ type: 'delete_collaborator' });
    await slice.assignTask('a', 'u2');
    expect(state.snapshot.items.a.responsible_uid).toBe('u2');
    await slice.assignTask('a', null);
    expect(sent[4][0].args).toEqual({ id: 'a', responsible_uid: null });
  });
});
