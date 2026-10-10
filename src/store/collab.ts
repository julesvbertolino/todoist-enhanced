/** Todoist's notifications, sharing a project, and assigning a task. */
import { command } from '@/api/commands';
import { translate } from '@/i18n';
import type { Snapshot } from '@/domain/types';
import type { Slice, CollabSlice } from './types';

/** Marks notifications read or unread in the snapshot. */
const mark = (snapshot: Snapshot, ids: string[], unread: boolean): Snapshot => {
  const next = { ...(snapshot.notifications ?? {}) };
  for (const id of ids) if (next[id]) next[id] = { ...next[id], is_unread: unread };
  return { ...snapshot, notifications: next };
};

export const createCollabSlice: Slice<CollabSlice> = (_set, get) => ({
  async markNotifications(ids, unread = false) {
    const all = Object.values(get().snapshot.notifications ?? {}).filter((n) => !n.is_deleted);
    const targets = ids === 'all' ? all.filter((n) => n.is_unread !== false).map((n) => n.id) : ids;
    if (targets.length === 0) return;
    const commands = ids === 'all' && !unread
      ? [command('live_notifications_mark_read_all', {})]
      : [command(unread ? 'live_notifications_mark_unread' : 'live_notifications_mark_read', { ids: targets })];
    await get().apply(commands, (snapshot) => mark(snapshot, targets, unread));
  },

  async answerInvitation(notificationId, accept) {
    const note = get().snapshot.notifications?.[notificationId];
    if (!note?.invitation_id || !note.invitation_secret) return;
    await get().apply(
      [command(accept ? 'accept_invitation' : 'reject_invitation', {
        invitation_id: note.invitation_id, invitation_secret: note.invitation_secret,
      })],
      /* Answered at once on screen: the buttons give way to the answer,
         which is also the `state` Todoist then keeps on the notification.
         A refusal puts the buttons back (revertRefused) with its toast. */
      (snapshot) => {
        const read = mark(snapshot, [notificationId], false);
        const current = read.notifications?.[notificationId];
        if (!current) return read;
        return {
          ...read,
          notifications: { ...read.notifications, [notificationId]: { ...current, state: accept ? 'accepted' : 'rejected' } },
        };
      },
    );
  },

  async shareProject(projectId, email, role) {
    await get().apply(
      [command('share_project', { project_id: projectId, email, ...(role ? { role } : {}) })],
      (snapshot) => snapshot,
    );
  },

  async removeCollaborator(projectId, email) {
    await get().apply(
      [command('delete_collaborator', { project_id: projectId, email })],
      (snapshot) => snapshot,
    );
  },

  async leaveProject(projectId) {
    const { snapshot, prefs } = get();
    const project = snapshot.projects[projectId];
    const email = snapshot.user?.email;
    if (!project || !email) return;
    await get().apply(
      [command('delete_collaborator', { project_id: projectId, email })],
      (current) => {
        const projects = { ...current.projects };
        const sections = { ...current.sections };
        const items = { ...current.items };
        delete projects[projectId];
        for (const section of Object.values(sections)) if (section.project_id === projectId) delete sections[section.id];
        for (const item of Object.values(items)) if (item.project_id === projectId) delete items[item.id];
        return { ...current, projects, sections, items };
      },
    );
    get().toast(translate(prefs.locale, 'project.left', { name: project.name }));
  },

  async assignTask(itemId, userId) {
    await get().apply(
      [command('item_update', { id: itemId, responsible_uid: userId })],
      (snapshot) => {
        const item = snapshot.items[itemId];
        return item
          ? { ...snapshot, items: { ...snapshot.items, [itemId]: { ...item, responsible_uid: userId } } }
          : snapshot;
      },
    );
  },
});
