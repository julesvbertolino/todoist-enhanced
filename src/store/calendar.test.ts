import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/db/idb', () => ({ savePrefs: vi.fn(async () => {}), saveSnapshot: vi.fn(async () => {}), reserveSnapshot: vi.fn(async () => ({ epoch: 'test', revision: 1 })), enqueue: vi.fn(async () => {}), dequeue: vi.fn(async () => {}), updateQueued: vi.fn(async () => {}), readQueue: vi.fn(async () => []) }));
vi.mock('@/api/commands', async (original) => ({ ...(await original<typeof import('@/api/commands')>()), sendCommands: vi.fn() }));
import { sendCommands, type Command } from '@/api/commands';
import { emptySnapshot } from '@/domain/types';
import { item, due } from '@/test/items';
import { defaultPreferences } from './prefs';
import { useStore } from './store';
import { scheduleCalendarTask } from './calendar';
import * as idb from '@/db/idb';

const sent = vi.mocked(sendCommands);
beforeEach(() => {
  vi.stubGlobal('navigator', { onLine: true }); vi.clearAllMocks();
  sent.mockImplementation(async (_token, commands) => ({ responses: [], failures: [], mapping: {}, delivered: commands.map((cmd: Command) => cmd.uuid), undelivered: [] }));
  const snapshot = emptySnapshot(); snapshot.items.a = item({ id: 'a', labels: ['week', 'home'] });
  useStore.setState({ prefs: { ...defaultPreferences('en'), estimateStorage: 'tag' }, connected: false, demo: false, snapshot, toasts: [], undoStack: [], pendingCount: 0, syncState: 'idle' });
});
afterEach(() => vi.unstubAllGlobals());

describe('calendar edits and undo', () => {
  it('schedules with a 30-minute tag on Free and never writes native duration, even on undo', async () => {
    await scheduleCalendarTask('a', new Date(2026, 9, 20), 600);
    expect(sent.mock.calls[0][1][0].args).toMatchObject({ labels: ['home', 'est-30'], due: { date: '2026-10-20T10:00:00' } });
    expect(sent.mock.calls[0][1][0].args).not.toHaveProperty('duration');
    await useStore.getState().undo();
    expect(useStore.getState().snapshot.items.a).toMatchObject({ due: null, labels: ['week', 'home'] });
    expect(sent.mock.calls[1][1][0].args).not.toHaveProperty('duration');
  });
  it('resizes only the tag while retaining an independently stored native block', async () => {
    useStore.setState({ snapshot: { ...useStore.getState().snapshot, items: { a: item({ id: 'a', labels: ['est-30'], duration: { amount: 90, unit: 'minute' }, due: due('2026-10-16T09:00:00') }) } } });
    await scheduleCalendarTask('a', new Date(2026, 9, 16), 540, 60);
    expect(sent.mock.calls[0][1][0].args).not.toHaveProperty('duration');
    expect(useStore.getState().snapshot.items.a).toMatchObject({ labels: ['est-60'], duration: { amount: 90 } });
  });
  it('queues native duration writes with estimate verification metadata offline', async () => {
    vi.stubGlobal('navigator', { onLine: false });
    useStore.setState({ prefs: { ...defaultPreferences('en'), estimateStorage: 'duration' } });
    await scheduleCalendarTask('a', new Date(2026, 9, 20), 540, 60);
    const commands = vi.mocked(idb.enqueue).mock.calls[0][0];
    expect(commands[0]).toMatchObject({ estimateMinutes: 60, args: { duration: { amount: 60, unit: 'minute' }, labels: ['home'] } });
    expect(sent).not.toHaveBeenCalled();
    await useStore.getState().undo();
    expect(useStore.getState().snapshot.items.a).toMatchObject({ due: null, duration: null, labels: ['week', 'home'] });
  });
  it('keeps recurrence on a date-only drop and does not assign an estimate', async () => {
    useStore.setState({ snapshot: { ...useStore.getState().snapshot, items: { a: item({ id: 'a', due: due('2026-10-16T09:00:00', { is_recurring: true, string: 'every day' }) }) } } });
    await scheduleCalendarTask('a', new Date(2026, 9, 20), null);
    expect(useStore.getState().snapshot.items.a.due).toMatchObject({ date: '2026-10-20', is_recurring: true, string: 'every day' });
    expect(sent.mock.calls[0][1][0].args).not.toHaveProperty('duration');
  });
  it('never mutates read-only forecasts or completed tasks', async () => {
    const state = useStore.getState();
    useStore.setState({ snapshot: { ...state.snapshot, items: { a: item({ id: 'a', projection: { sourceId: 'source', date: '2026-10-20' } }) } } });
    await scheduleCalendarTask('a', new Date(), 600);
    expect(sent).not.toHaveBeenCalled();
  });
});
