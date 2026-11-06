import { request } from './client';

/**
 * Links into Todoist, and putting them on the clipboard.
 *
 * "Open in Todoist" and "Copy link" build the same address; one function keeps
 * the two from drifting apart.
 */

/** A task's page in Todoist's web app. */
export const todoistTaskUrl = (id: string): string => `https://app.todoist.com/app/task/${id}`;

/** A section's page in Todoist's web app. */
export const todoistProjectUrl = (id: string): string => `https://app.todoist.com/app/project/${id}`;
export const todoistLabelUrl = (id: string): string => `https://app.todoist.com/app/label/${id}`;
export const todoistFilterUrl = (id: string): string => `https://app.todoist.com/app/filter/${id}`;
export const todoistSectionUrl = (id: string): string => `https://app.todoist.com/app/section/${id}`;

export type TodoistTarget = { kind: 'task' | 'project' | 'label' | 'filter' | 'section'; id: string; /** The whole last segment, for an id that itself contains dashes. */ raw?: string };

/**
 * The reverse of the builders above (#419): what a pasted Todoist address
 * points at. Reads `app.todoist.com/app/<kind>/<id>`, the slugged form
 * `<kind>/<name>-<id>` and the older `showTask?id=`. Anything else, another
 * site included, is null so the link keeps opening where it always did.
 */
export function parseTodoistUrl(href: string): TodoistTarget | null {
  let url: URL;
  try { url = new URL(href.trim()); } catch { return null; }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const host = url.hostname.toLowerCase();
  if (host !== 'app.todoist.com' && host !== 'todoist.com' && host !== 'www.todoist.com') return null;
  if (/^\/(?:app\/)?showTask\/?$/i.test(url.pathname)) {
    const id = url.searchParams.get('id');
    return id ? { kind: 'task', id } : null;
  }
  const match = url.pathname.match(/^\/app\/(task|project|label|filter|section)\/([^/]+)\/?$/i);
  if (!match) return null;
  let slug: string;
  try { slug = decodeURIComponent(match[2]); } catch { return null; }
  /* A slugged address ends with the id after its last dash: "my-project-6X7rM8997g3RQmvh". */
  const id = slug.slice(slug.lastIndexOf('-') + 1);
  return id ? { kind: match[1].toLowerCase() as TodoistTarget['kind'], id, ...(id !== slug ? { raw: slug } : {}) } : null;
}

/**
 * An id the app made up while Todoist had not answered yet (see `newUuid`).
 * Todoist's own ids have no dashes, and a made-up one has no page to link to.
 */
export const isTemporaryId = (id: string): boolean => id.includes('-');

/** Copies text, and says whether it worked: the clipboard can be refused. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Copies text that is still on its way, such as an answer from Todoist.
 *
 * Safari only lets a page write to the clipboard during the click that asked
 * for it, and a network request outlasts the click. Handing the clipboard the
 * pending text at once keeps the write inside the click; where that form is
 * missing, the text is awaited and copied the ordinary way.
 */
export async function copyPending(text: Promise<string>): Promise<boolean> {
  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
    try {
      const blob = text.then((value) => new Blob([value], { type: 'text/plain' }));
      await navigator.clipboard.write([new ClipboardItem({ 'text/plain': blob })]);
      return true;
    } catch {
      /* fall through: some browsers refuse a pending item */
    }
  }
  try {
    return await copyText(await text);
  } catch {
    return false;
  }
}

const projectEmails = new Map<string, string>();

/**
 * The address that turns an email into a task in this project. Todoist makes
 * it on the first request and gives the same one after that; it is kept here
 * for the session so a second copy needs no round trip.
 */
export async function projectEmail(projectId: string): Promise<string> {
  const known = projectEmails.get(projectId);
  if (known) return known;
  const { email } = await request<{ email: string }>('/emails', {
    method: 'PUT',
    json: { obj_type: 'project', obj_id: projectId },
  });
  projectEmails.set(projectId, email);
  return email;
}
