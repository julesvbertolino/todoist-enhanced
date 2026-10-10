import { describe, expect, it } from 'vitest';
import { applySync } from '@/api/sync';
import { NOTIFICATION_SENTENCES, notificationGlyph, notificationList, readNotification, sentenceKey, unreadCount } from './notifications';
import { en } from '@/i18n/en';
import { fr } from '@/i18n/fr';
import { emptySnapshot, type LiveNotification } from './types';

const base = () => ({
  ...emptySnapshot(),
  collaborators: { u2: { id: 'u2', email: 'a@b.c', full_name: 'Alex Martin', image_id: null } },
  projects: { p1: { id: 'p1', name: 'Garden' } as never },
});

describe('Todoist notifications', () => {
  it('say who, what about, and when, from what the account already knows', () => {
    const n: LiveNotification = { id: '1', notification_type: 'item_assigned', from_uid: 'u2', project_id: 'p1', created_at: '2026-10-01T10:00:00Z' };
    expect(readNotification(n, base())).toMatchObject({ from: 'Alex Martin', about: 'Garden', kind: 'item assigned', unread: true });
  });

  it('only an invitation with its secret can be answered', () => {
    const invite: LiveNotification = { id: '2', notification_type: 'share_invitation_sent', invitation_id: '9', invitation_secret: 's' };
    expect(readNotification(invite, base()).invitation).toEqual({ id: '9', secret: 's' });
    expect(readNotification({ ...invite, invitation_secret: undefined }, base()).invitation).toBeNull();
    expect(readNotification({ ...invite, notification_type: 'note_added' }, base()).invitation).toBeNull();
  });

  it('survive an unknown shape, a snapshot saved before 2.0, and a sync that carries them', () => {
    expect(readNotification({ id: '3' }, base())).toMatchObject({ from: null, about: null, kind: 'notification' });
    expect(notificationList(base())).toEqual([]);
    const synced = applySync(base(), {
      sync_token: 't', full_sync: false,
      live_notifications: [
        { id: '1', is_unread: true, created_at: '2026-10-01T00:00:00Z' },
        { id: '2', is_unread: false, created_at: '2026-10-02T00:00:00Z' },
        { id: '3', is_deleted: true },
      ],
    });
    expect(notificationList(synced).map((n) => n.id)).toEqual(['2', '1']);
    expect(unreadCount(synced)).toBe(1);
  });

  it('name the person a notification is about when it is not the sender', () => {
    const n: LiveNotification = { id: '4', notification_type: 'user_removed_from_project', removed_name: 'Marin', removed_uid: 'u9', project_name: 'Studio' };
    expect(readNotification(n, base())).toMatchObject({ type: 'user_removed_from_project', subject: 'Marin', about: 'Studio' });
  });

  it('have a sentence in both languages for every kind that is known', () => {
    for (const key of Object.values(NOTIFICATION_SENTENCES)) {
      expect(Object.keys(en), key).toContain(key);
      expect(Object.keys(fr), key).toContain(key);
    }
  });
});

describe('who a notification looks like it is from', () => {
  it('is Todoist itself when nobody is named, and a person with a picture when one is', () => {
    expect(readNotification({ id: '5', notification_type: 'karma_level' }, base())).toMatchObject({ fromTodoist: true, image: null });
    const person: LiveNotification = { id: '6', notification_type: 'note_added', from_user: { full_name: 'Alex', image_id: 'abc123' } };
    const read = readNotification(person, base());
    expect(read.fromTodoist).toBe(false);
    expect(read.image).toContain('abc123');
  });

  it('is the person it is about when the sender is not given, rather than Todoist', () => {
    const removed: LiveNotification = { id: '7', notification_type: 'user_removed_from_project', removed_name: 'Marin' };
    expect(readNotification(removed, base()).fromTodoist).toBe(false);
  });

  it('has a badge for what happened, where there is one', () => {
    expect(notificationGlyph('share_invitation_sent')).toBe('user');
    expect(notificationGlyph('note_added')).toBe('comment');
    expect(notificationGlyph('item_completed')).toBe('check');
    expect(notificationGlyph('something_new')).toBeNull();
  });
});


/* #10, #11: the cases Jules compared side by side with Todoist web. The
   payloads are written from Todoist's documented fields, not captured from
   his account (to replace by real, anonymised ones). */
describe('notification sentences match Todoist', () => {
  const me = () => ({ ...base(), user: { id: 'me', full_name: 'Demo' } as never });

  it('names the person who declined, not Todoist', () => {
    const n: LiveNotification = { id: 'a', notification_type: 'share_invitation_rejected', from_uid: 'u7', from_user: { full_name: 'Jules B.' }, project_name: 'Projet de test' };
    expect(readNotification(n, me())).toMatchObject({ from: 'Jules B.', fromTodoist: false, about: 'Projet de test' });
    const byMail: LiveNotification = { id: 'b', notification_type: 'share_invitation_rejected', from_user: { email: 'jules@example.com' }, project_name: 'P' };
    expect(readNotification(byMail, me()).from).toBe('jules@example.com');
  });

  it('says "removed you" when the reader is the one removed', () => {
    const n: LiveNotification = { id: 'c', notification_type: 'user_removed_from_project', from_user: { full_name: 'Jules B.' }, removed_uid: 'me', removed_name: 'Demo', project_name: 'aliasdigital' };
    const read = readNotification(n, me());
    expect(read).toMatchObject({ aboutMe: true, from: 'Jules B.', about: 'aliasdigital' });
    expect(sentenceKey(read)).toBe('notif.type.user_removed_you');
    const other = readNotification({ ...n, removed_uid: 'u9', removed_name: 'Marin' }, me());
    expect(sentenceKey(other)).toBe('notif.type.user_removed_from_project');
  });

  it('says the workspace was joined once the invitation is accepted, with its name', () => {
    const n: LiveNotification = { id: 'd', notification_type: 'workspace_invitation_created', from_user: { full_name: 'Jules B.' }, workspace_name: 'aliasdigital', state: 'accepted' };
    const read = readNotification(n, me());
    expect(read.about).toBe('aliasdigital');
    expect(sentenceKey(read)).toBe('notif.type.workspace_joined_you');
  });

  it('names the karma rank reached', () => {
    const read = readNotification({ id: 'e', notification_type: 'karma_level', karma_level: 2 }, me());
    expect(read.level).toBe('novice');
    expect(sentenceKey(read)).toBe('notif.type.karma_level_named');
  });

  it('an answered invitation has no buttons, and says how it was answered', () => {
    const n: LiveNotification = { id: 'f', notification_type: 'share_invitation_sent', invitation_id: '9', invitation_secret: 's', state: 'accepted' };
    expect(readNotification(n, me())).toMatchObject({ invitation: null, answered: 'accepted' });
  });

  it('has every new sentence in both languages', () => {
    for (const key of ['notif.type.user_removed_you', 'notif.type.workspace_joined_you', 'notif.type.workspace_declined_you', 'notif.type.karma_level_named', 'notif.answered.accepted', 'notif.answered.rejected']) {
      expect(Object.keys(en), key).toContain(key);
      expect(Object.keys(fr), key).toContain(key);
    }
  });
});
