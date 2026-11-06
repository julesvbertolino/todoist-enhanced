import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./client')>()),
  request: vi.fn(),
}));

import { request } from './client';
import { fetchCompleted, windowsOf } from './completed';
import type { CompletedItem } from '@/domain/types';

const sent = vi.mocked(request);
const done = (id: string, at: string) => ({ id, task_id: id, completed_at: at }) as CompletedItem;
const DAY = 24 * 3600_000;

beforeEach(() => { sent.mockReset(); });

describe('the period asked of Todoist (#131)', () => {
  it('is sent as exact instants, so a single day is not an empty window', async () => {
    sent.mockResolvedValue({ items: [] } as never);
    const since = new Date(2026, 8, 29, 0, 0, 0, 0);
    const until = new Date(2026, 8, 29, 23, 59, 59, 999);

    await fetchCompleted(since, until);

    const { query } = sent.mock.calls[0][1] as { query: Record<string, string> };
    expect(query.since).toBe(since.toISOString());
    expect(query.until).toBe(until.toISOString());
    expect(query.since).toMatch(/T.*Z$/);
    expect(new Date(query.until).getTime() - new Date(query.since).getTime()).toBeGreaterThan(23 * 3600_000);
  });
});

describe('windowsOf (#131)', () => {
  const since = new Date(2026, 0, 1);
  const until = new Date(2026, 11, 31, 23, 59, 59, 999);

  it('covers the period with no gap, starting at its start and ending at its end', () => {
    const windows = windowsOf(since, until, 89);
    expect(windows[0].since).toEqual(since);
    expect(windows.at(-1)!.until).toEqual(until);
    for (let at = 1; at < windows.length; at += 1) {
      expect(windows[at].since).toEqual(windows[at - 1].until);
    }
  });

  it('never makes a window longer than asked', () => {
    for (const window of windowsOf(since, until, 89)) {
      const days = (window.until.getTime() - window.since.getTime()) / DAY;
      expect(days).toBeLessThanOrEqual(89.05);
    }
  });

  it('makes one window of a short period', () => {
    const day = windowsOf(new Date(2026, 8, 29), new Date(2026, 8, 29, 23, 59, 59, 999), 89);
    expect(day).toHaveLength(1);
  });
});

describe('a completion on the boundary of two windows', () => {
  it('is counted once', async () => {
    const since = new Date(2026, 0, 1);
    const until = new Date(2026, 6, 1);
    sent.mockResolvedValue({ items: [done('t1', '2026-03-31T12:00:00.000Z')] } as never);

    const items = await fetchCompleted(since, until);

    expect(sent.mock.calls.length).toBeGreaterThan(1);
    expect(items).toHaveLength(1);
  });
});

describe('completions of recurring tasks (#331)', () => {
  const since = new Date(2026, 8, 1);
  const until = new Date(2026, 8, 7, 23, 59, 59, 999);
  const entry = (task: string, at: string, recurring: boolean) => ({
    id: `c-${task}-${at}`, task_id: task, user_id: 'u', project_id: 'p', section_id: null, content: task, completed_at: at,
    item_object: { priority: 4, labels: ['quick'], due: { is_recurring: recurring } },
  });

  it('are not asked for unless the page wants them', async () => {
    sent.mockResolvedValue({ items: [] } as never);
    await fetchCompleted(since, until);
    expect(sent.mock.calls.map((call) => call[0])).toEqual(['/tasks/completed/by_completion_date']);
  });

  it('are added, each occurrence once, next to the plain completions', async () => {
    sent.mockImplementation((async (path: string, init: { query: { offset?: number } }) => {
      if (path === '/tasks/completed/by_completion_date') return { items: [done('plain', '2026-09-03T10:00:00.000Z')] };
      if (init.query.offset) return { items: [] };
      return { items: [
        entry('plain', '2026-09-03T10:00:00.000Z', false),
        entry('habit', '2026-09-02T08:00:00.000Z', true),
        entry('habit', '2026-09-03T08:00:00.000Z', true),
        entry('habit', '2026-09-04T08:00:00.000Z', true),
      ] };
    }) as never);

    const items = await fetchCompleted(since, until, undefined, {}, { recurring: true });

    expect(items.map((item) => item.task_id)).toEqual(['plain', 'habit', 'habit', 'habit']);
    expect(items.find((item) => item.task_id === 'habit')).toMatchObject({ priority: 4, labels: ['quick'] });
  });

  it('keep going past a short page and stop on an empty one', async () => {
    sent.mockImplementation((async (path: string, init: { query: { offset?: number } }) => {
      if (path === '/tasks/completed/by_completion_date') return { items: [] };
      const offset = init.query.offset ?? 0;
      return { items: offset === 0 ? [entry('habit', '2026-09-02T08:00:00.000Z', true)] : offset === 200 ? [entry('habit', '2026-09-03T08:00:00.000Z', true)] : [] };
    }) as never);

    const items = await fetchCompleted(since, until, undefined, {}, { recurring: true });

    expect(items).toHaveLength(2);
  });

  it('do not break the history when the older endpoint is gone', async () => {
    sent.mockImplementation((async (path: string) => {
      if (path === '/tasks/completed') throw new Error('gone');
      return { items: [done('plain', '2026-09-03T10:00:00.000Z')] };
    }) as never);

    const items = await fetchCompleted(since, until, undefined, {}, { recurring: true });

    expect(items).toHaveLength(1);
  });
});
