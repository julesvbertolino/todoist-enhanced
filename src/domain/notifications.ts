import type { LiveNotification, Snapshot } from './types';
import { avatarUrl } from './colors';
import { KARMA_RANKS } from './karma';

/** What the notifications window draws for one of Todoist's notifications. */
export interface NotificationView {
  id: string;
  unread: boolean;
  /** ISO time it was created, when Todoist said. */
  at: string | null;
  /** Who it comes from, when that can be told. */
  from: string | null;
  /** The kind, as Todoist names it, humanised; the window's fallback line. */
  kind: string;
  /** The project or task it is about, when named. */
  about: string | null;
  /** An invitation can be answered. */
  invitation: { id: string; secret: string } | null;
  /** Todoist's own name for the kind, as it arrives. */
  type: string;
  /** Who it is about when that is somebody other than the sender (a person removed, a person assigned). */
  subject: string | null;
  /** The sender's picture, when Todoist holds one. */
  image: string | null;
  /** Nobody is named: Todoist itself is speaking, and its mark stands in for a face. */
  fromTodoist: boolean;
  /** An invitation already answered, here or elsewhere (#10). */
  answered: 'accepted' | 'rejected' | null;
  /** The notification is about the person reading it (removed, joined…), not about somebody else. */
  aboutMe: boolean;
  /** A karma rank reached, when the notification says which (#11). */
  level: string | null;
  /** Todoist's own words, for the kinds that are announcements rather than events. */
  message: string | null;
}

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

/**
 * Reads a notification without trusting its shape: Todoist's kinds were not
 * available to read, so each field is looked for under the names the kinds
 * are known to use and a missing one is simply absent.
 */
export function readNotification(
  n: LiveNotification,
  snapshot: Pick<Snapshot, 'collaborators' | 'projects' | 'items'> & { user?: Snapshot['user'] },
): NotificationView {
  const fromUser = n.from_user as { full_name?: unknown; name?: unknown; email?: unknown; image_id?: unknown; avatar_big?: unknown } | undefined;
  const collaborator = n.from_uid ? snapshot.collaborators[n.from_uid] : undefined;
  /* The sender is whoever Todoist names, by name, else by e-mail: a person who
     declined an invitation is not a collaborator, and was read as "Todoist". */
  const sender = text(fromUser?.full_name) ?? text(fromUser?.name) ?? text(collaborator?.full_name)
    ?? text(n.from_name) ?? text(fromUser?.email) ?? text(collaborator?.email);
  const image = avatarUrl({
    image_id: text(fromUser?.image_id) ?? collaborator?.image_id ?? null,
    avatar_big: text(fromUser?.avatar_big),
  });
  const type = text(n.notification_type) ?? 'notification';
  const project = n.project_id ? text(snapshot.projects[n.project_id]?.name) : null;
  const item = n.item_id ? text(snapshot.items[n.item_id]?.content) : null;
  const workspace = text(n.workspace_name)
    ?? text((n.workspace as { name?: unknown } | undefined)?.name);
  const invitationId = text(n.invitation_id);
  const secret = text(n.invitation_secret);
  const state = text(n.state);
  const answered = state === 'accepted' || state === 'rejected' ? state : null;
  const me = snapshot.user?.id ?? null;

  const subject = text(n.removed_name) ?? text(n.assigned_name) ?? text(n.invited_name) ?? null;
  const removedUid = text(n.removed_uid);
  /* Removed: Todoist sends this one to the person removed, so with no other
     person named it is the reader. */
  const aboutMe = type === 'user_removed_from_project'
    ? (removedUid ? removedUid === me : true)
    : false;
  /* A notification that names nobody comes from Todoist itself. */
  const fromTodoist = !sender && !subject && !n.from_uid;

  const levelNumber = typeof n.karma_level === 'number' ? n.karma_level : Number(text(n.karma_level) ?? NaN);
  const level = text(n.karma_level_name) ?? text(n.level_name)
    ?? (Number.isFinite(levelNumber) && levelNumber >= 1 && levelNumber <= KARMA_RANKS.length
      ? KARMA_RANKS[levelNumber - 1].key
      : null);

  return {
    type,
    subject: aboutMe ? null : subject,
    id: n.id,
    unread: n.is_unread !== false,
    at: text(n.created_at) ?? text(n.created),
    /* Removed from a project: Todoist names the remover as the sender, or,
       when it only names one person, that person. */
    from: sender ?? (aboutMe ? subject : null),
    image,
    fromTodoist,
    kind: type.replace(/_/g, ' '),
    about: type.startsWith('workspace_')
      ? workspace ?? text(n.project_name) ?? project
      : text(n.item_content) ?? item ?? text(n.project_name) ?? project ?? workspace,
    invitation: invitationId && secret && type === 'share_invitation_sent' && !answered
      ? { id: invitationId, secret }
      : null,
    answered: type === 'share_invitation_sent' || type === 'workspace_invitation_created' ? answered : null,
    aboutMe,
    level,
    message: text(n.message) ?? text(n.title) ?? text(n.body) ?? null,
  };
}

/**
 * The key of the sentence for one notification, by kind and by who it is
 * about (#11). Null for a kind with no sentence of its own.
 */
export function sentenceKey(n: NotificationView): string | null {
  if (n.type === 'user_removed_from_project') {
    return n.aboutMe ? 'notif.type.user_removed_you' : NOTIFICATION_SENTENCES[n.type];
  }
  if (n.type === 'workspace_invitation_created' && n.answered === 'accepted') return 'notif.type.workspace_joined_you';
  if (n.type === 'workspace_invitation_created' && n.answered === 'rejected') return 'notif.type.workspace_declined_you';
  if (n.type === 'karma_level' && n.level) return 'notif.type.karma_level_named';
  return NOTIFICATION_SENTENCES[n.type] ?? null;
}

/** Newest first, the ones removed by Todoist left out. */
export function notificationList(snapshot: Snapshot): NotificationView[] {
  return Object.values(snapshot.notifications ?? {})
    .filter((n) => !n.is_deleted)
    .map((n) => readNotification(n, snapshot))
    .sort((a, b) => (b.at ?? '').localeCompare(a.at ?? '') || b.id.localeCompare(a.id));
}

export const unreadCount = (snapshot: Snapshot): number =>
  notificationList(snapshot).filter((n) => n.unread).length;

/**
 * The key of the sentence that says what happened, for the kinds Todoist is known to send.
 * Anything else falls back to the kind's own name, humanised.
 */
export const NOTIFICATION_SENTENCES: Record<string, string> = {
  share_invitation_sent: 'notif.type.share_invitation_sent',
  share_invitation_accepted: 'notif.type.share_invitation_accepted',
  share_invitation_rejected: 'notif.type.share_invitation_rejected',
  share_invitation_blocked_by_project_limit: 'notif.type.share_invitation_blocked_by_project_limit',
  user_removed_from_project: 'notif.type.user_removed_from_project',
  user_left_project: 'notif.type.user_left_project',
  workspace_invitation_created: 'notif.type.workspace_invitation_created',
  workspace_user_joined: 'notif.type.workspace_user_joined',
  workspace_user_left: 'notif.type.workspace_user_left',
  item_assigned: 'notif.type.item_assigned',
  item_completed: 'notif.type.item_completed',
  item_uncompleted: 'notif.type.item_uncompleted',
  note_added: 'notif.type.note_added',
  karma_level: 'notif.type.karma_level',
  workspace_team_cohort_tagged: 'notif.type.workspace_team_cohort_tagged',
};

/** The glyph that goes in the small badge on the picture, by kind of notification. */
export function notificationGlyph(type: string): 'user' | 'check' | 'comment' | 'flame' | 'group' | null {
  if (type.startsWith('share_invitation') || type.startsWith('user_')) return 'user';
  if (type.startsWith('workspace_')) return 'group';
  if (type === 'item_assigned' || type === 'item_completed' || type === 'item_uncompleted') return 'check';
  if (type === 'note_added') return 'comment';
  if (type === 'karma_level') return 'flame';
  return null;
}
