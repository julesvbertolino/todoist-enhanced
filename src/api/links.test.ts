import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isTemporaryId, parseTodoistUrl, projectEmail, todoistTaskUrl } from './links';
import { request } from './client';

vi.mock('./client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./client')>()),
  request: vi.fn(),
}));
const sent = vi.mocked(request);
beforeEach(() => { sent.mockReset(); });

describe('links', () => {
  it('builds a task address in Todoist', () => {
    expect(todoistTaskUrl('6X7rM8997g3RQmvh')).toBe('https://app.todoist.com/app/task/6X7rM8997g3RQmvh');
  });

  it("tells a made-up id from Todoist's", () => {
    expect(isTemporaryId('0b9f6c1e-3a1d-4c2e-9f3b-8d7a6e5c4b3a')).toBe(true);
    expect(isTemporaryId('6X7rM8997g3RQmvh')).toBe(false);
  });

  it("asks Todoist for a project's address once, then remembers it", async () => {
    sent.mockResolvedValue({ email: 'add.task.abc@todoist.net' } as never);
    expect(await projectEmail('p1')).toBe('add.task.abc@todoist.net');
    expect(await projectEmail('p1')).toBe('add.task.abc@todoist.net');
    expect(sent).toHaveBeenCalledTimes(1);
    expect(sent).toHaveBeenCalledWith('/emails', {
      method: 'PUT', json: { obj_type: 'project', obj_id: 'p1' },
    });
  });
});

describe('parseTodoistUrl (#419)', () => {
  it('reads the addresses the app builds', () => {
    expect(parseTodoistUrl('https://app.todoist.com/app/task/6X7rM8997g3RQmvh')).toEqual({ kind: 'task', id: '6X7rM8997g3RQmvh' });
    expect(parseTodoistUrl('https://app.todoist.com/app/project/6X7rM8997g3RQmvh')).toEqual({ kind: 'project', id: '6X7rM8997g3RQmvh' });
    expect(parseTodoistUrl('https://app.todoist.com/app/label/abc123')).toEqual({ kind: 'label', id: 'abc123' });
    expect(parseTodoistUrl('https://app.todoist.com/app/filter/f1')).toEqual({ kind: 'filter', id: 'f1' });
    expect(parseTodoistUrl('https://app.todoist.com/app/section/s1')).toEqual({ kind: 'section', id: 's1' });
  });
  it('reads slugged and older addresses', () => {
    expect(parseTodoistUrl('https://app.todoist.com/app/task/call-the-garage-6X7rM8997g3RQmvh')).toMatchObject({ kind: 'task', id: '6X7rM8997g3RQmvh' });
    expect(parseTodoistUrl('https://todoist.com/app/project/my-site-123')).toMatchObject({ kind: 'project', id: '123' });
    expect(parseTodoistUrl('https://todoist.com/showTask?id=8123456789')).toEqual({ kind: 'task', id: '8123456789' });
    expect(parseTodoistUrl('https://app.todoist.com/app/task/6X7rM8997g3RQmvh/')).toEqual({ kind: 'task', id: '6X7rM8997g3RQmvh' });
  });
  it('leaves everything else alone', () => {
    expect(parseTodoistUrl('https://github.com/app/task/123')).toBeNull();
    expect(parseTodoistUrl('https://app.todoist.com/app/today')).toBeNull();
    expect(parseTodoistUrl('https://todoist.com/showTask')).toBeNull();
    expect(parseTodoistUrl('mailto:me@example.com')).toBeNull();
    expect(parseTodoistUrl('not a url')).toBeNull();
  });
});
