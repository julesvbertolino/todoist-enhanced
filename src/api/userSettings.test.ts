import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./client', () => ({ request: vi.fn() }));

import { request } from './client';
import { forgetResetSubtasks, readResetSubtasks } from './userSettings';

const read = vi.mocked(request);
const store: Record<string, string> = {};

beforeEach(() => {
  vi.clearAllMocks();
  forgetResetSubtasks();
  for (const key of Object.keys(store)) delete store[key];
  vi.stubGlobal('navigator', { onLine: true });
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('readResetSubtasks', () => {
  it('reads the setting once and reuses it', async () => {
    read.mockResolvedValue({ user_settings: { reset_recurring_subtasks: true } });
    expect(await readResetSubtasks()).toBe(true);
    expect(await readResetSubtasks()).toBe(true);
    expect(read).toHaveBeenCalledTimes(1);
  });

  it('says no when it has never been read and Todoist does not answer', async () => {
    read.mockRejectedValue(new Error('offline'));
    expect(await readResetSubtasks()).toBe(false);
  });

  it('falls back on the last value seen, offline or on a failed read, and reads again later', async () => {
    read.mockResolvedValueOnce({ user_settings: { reset_recurring_subtasks: true } });
    await readResetSubtasks();
    forgetResetSubtasks();
    read.mockRejectedValueOnce(new Error('down'));
    expect(await readResetSubtasks()).toBe(true);
    vi.stubGlobal('navigator', { onLine: false });
    expect(await readResetSubtasks()).toBe(true);
    vi.stubGlobal('navigator', { onLine: true });
    read.mockResolvedValueOnce({ user_settings: { reset_recurring_subtasks: false } });
    expect(await readResetSubtasks()).toBe(false);
    expect(read).toHaveBeenCalledTimes(3);
  });
});
