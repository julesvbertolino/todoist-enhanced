import { useEffect } from 'react';
import { parseTodoistUrl, type TodoistTarget } from '@/api/links';
import { navigate } from '@/hooks/useRoute';
import { useStore } from '@/store/store';
import type { Snapshot } from '@/domain/types';

/**
 * Where a link to a Todoist item leads inside Enhanced (#419), or null when
 * Enhanced does not know the item: another account, an archived or deleted
 * one, one not synced yet. Those keep opening in a new tab.
 */
export function resolveTodoistLink(href: string, snapshot: Snapshot): (() => void) | null {
  const target = parseTodoistUrl(href);
  if (!target) return null;
  const { kind } = target;
  const id = resolvedTargetId(target, snapshot);
  if (!id) return null;
  if (kind === 'project') return () => navigate('project', id);
  if (kind === 'section') return () => navigate('project', snapshot.sections[id].project_id, { sectionId: id });
  if (kind === 'label') return () => navigate('label', Object.values(snapshot.labels).find((entry) => String(entry.id) === id)!.name);
  if (kind === 'filter') return () => navigate('filter', id);
  return () => { /* a task is opened by the caller */ };
}

/**
 * The id of the item a link points at, when the snapshot has it. A slugged
 * address ends with its id, but an id that itself holds dashes (one the app
 * made up) is tried whole as well.
 */
export function resolvedTargetId(target: TodoistTarget, snapshot: Snapshot): string | null {
  /* The last segment first, then each longer tail: "call-the-garage-demo-8" is tried as 8, demo-8, garage-demo-8… */
  const tails = [target.id];
  for (let at = (target.raw ?? '').lastIndexOf('-', (target.raw ?? '').length - target.id.length - 2); at >= 0; at = (target.raw ?? '').lastIndexOf('-', at - 1)) tails.push(target.raw!.slice(at + 1));
  for (const id of tails) {
    if (target.kind === 'project') {
      const project = snapshot.projects[id];
      if (project && !project.is_deleted && !project.is_archived) return id;
    } else if (target.kind === 'section') {
      const section = snapshot.sections[id];
      const project = section ? snapshot.projects[section.project_id] : undefined;
      if (section && !section.is_deleted && project && !project.is_deleted) return id;
    } else if (target.kind === 'label') {
      const label = Object.values(snapshot.labels).find((entry) => String(entry.id) === id);
      if (label && !label.is_deleted) return String(label.id);
    } else if (target.kind === 'filter') {
      const filter = snapshot.filters?.[id];
      if (filter && !filter.is_deleted) return id;
    } else {
      const item = snapshot.items[id];
      if (item && !item.is_deleted) return id;
    }
  }
  return null;
}

/** The app's way of opening a link here, set while the app is mounted. */
let opener: ((href: string) => boolean) | null = null;

/**
 * Opens a link to a Todoist item inside Enhanced when the app has the item.
 * Returns false when it does not, and the caller opens the link as it did.
 */
export function openTodoistLink(href: string): boolean {
  return opener?.(href) ?? false;
}

/**
 * One click handler for every rendered link in the app: a plain click on a
 * link to a Todoist item the app has opens it here. ⌘/Ctrl-click, middle click
 * and Shift keep their meaning (a new tab), and other sites are left alone.
 */
export function useTodoistLinks(openTask: (id: string) => void, closeTask?: () => void): void {
  useEffect(() => {
    const open = (href: string): boolean => {
      const state = useStore.getState();
      const go = resolveTodoistLink(href, state.snapshot);
      const target = parseTodoistUrl(href);
      if (!go || !target) return false;
      if (target.kind === 'task') openTask(resolvedTargetId(target, state.snapshot)!);
      else { closeTask?.(); go(); }
      return true;
    };
    opener = open;
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as HTMLElement | null)?.closest?.<HTMLAnchorElement>('a[href]');
      if (!anchor) return;
      if (open(anchor.getAttribute('href') ?? '')) event.preventDefault();
    };
    document.addEventListener('click', onClick);
    return () => { document.removeEventListener('click', onClick); if (opener === open) opener = null; };
  }, [openTask, closeTask]);
}
