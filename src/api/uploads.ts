import { auth } from './auth';
import { API_BASE, ApiError, NotConnectedError } from './client';
import type { NoteAttachment } from '@/domain/types';

/**
 * Sends a file to Todoist so a comment can carry it.
 *
 * Todoist takes the file first and answers with the description of what it
 * kept; that description is what the comment is then written with. In the demo
 * nothing leaves the device: the file is held by the page for as long as it is
 * open.
 *
 * [supposé] The endpoint and the shape of the answer follow Todoist's API
 * documentation; this has not been run against a real account.
 */
export async function uploadAttachment(file: File, demo: boolean): Promise<NoteAttachment> {
  if (demo) {
    return {
      file_name: file.name, file_type: file.type || 'application/octet-stream', file_size: file.size,
      file_url: URL.createObjectURL(file), resource_type: file.type.startsWith('image/') ? 'image' : 'file',
      upload_state: 'completed',
    };
  }
  const token = await auth.getToken();
  if (!token) throw new NotConnectedError();
  const body = new FormData();
  body.append('file_name', file.name);
  body.append('file', file);
  const response = await fetch(`${API_BASE}/uploads`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}` }, body,
  });
  const text = await response.text();
  let parsed: unknown = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { /* a refusal can be plain text */ }
  if (!response.ok || !parsed || typeof parsed !== 'object') {
    throw new ApiError(`Upload failed (${response.status})`, response.status, parsed ?? text);
  }
  return parsed as NoteAttachment;
}
