import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/db/idb', () => ({
  savePrefs: vi.fn(async () => {}),
  saveSnapshot: vi.fn(async () => {}), reserveSnapshot: vi.fn(async () => ({ epoch: 'test', revision: 1 })),
  enqueue: vi.fn(async () => {}),
  dequeue: vi.fn(async () => {}),
  updateQueued: vi.fn(async () => {}),
  readQueue: vi.fn(async () => []),
}));
vi.mock('@/api/commands', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/commands')>()),
  sendCommands: vi.fn(),
}));

import { sendCommands, type Command, type CommandResult } from '@/api/commands';
import { emptySnapshot, type Filter } from '@/domain/types';
import { defaultPreferences } from './prefs';
import { useStore } from './store';

const sent = vi.mocked(sendCommands);
const ok = (commands: Command[]): CommandResult => ({
  responses: [], failures: [], mapping: {},
  delivered: commands.map((cmd) => cmd.uuid), undelivered: [],
});
const filter = (id: string, order_key: string | null, extra: Partial<Filter> = {}): Filter => ({
  id, name: id, query: 'today', color: 'red', item_order: 1, order_key, is_deleted: false, is_favorite: false, ...extra,
});
const withFilters = (...list: Filter[]) =>
  useStore.setState({ snapshot: { ...emptySnapshot(), filters: Object.fromEntries(list.map((f) => [f.id, f])) } });
const lastCommands = () => sent.mock.calls[sent.mock.calls.length - 1][1];

beforeEach(() => {
  vi.stubGlobal('navigator', { onLine: true });
  vi.clearAllMocks();
  sent.mockImplementation(async (_token, commands) => ok(commands));
  useStore.setState({ prefs: defaultPreferences('en'), connected: false, demo: false, snapshot: emptySnapshot(), toasts: [], undoStack: [], pendingCount: 0, syncState: 'idle' });
});
afterEach(() => vi.unstubAllGlobals());

describe('filters', () => {
  it('creates a filter, shown at once and placed last', async () => {
    withFilters(filter('a', 'a0'));
    const id = await useStore.getState().createFilter({ name: ' Urgent ', query: ' p1 ', color: 'red', is_favorite: true });
    const [cmd] = lastCommands();
    expect(cmd.type).toBe('filter_add');
    expect(cmd.args).toEqual({ name: 'Urgent', query: 'p1', color: 'red', is_favorite: true });
    const made = useStore.getState().snapshot.filters![id!];
    expect(made.name).toBe('Urgent');
    expect(made.order_key! > 'a0').toBe(true);
  });

  it('refuses a filter with no name or no query', async () => {
    expect(await useStore.getState().createFilter({ name: 'x', query: '  ', color: 'red', is_favorite: false })).toBeNull();
    expect(sent).not.toHaveBeenCalled();
  });

  it('updates only the fields given, and deletes', async () => {
    withFilters(filter('a', 'a0'));
    await useStore.getState().updateFilter('a', { name: 'Renamed', color: 'blue' });
    expect(lastCommands()[0]).toMatchObject({ type: 'filter_update', args: { id: 'a', name: 'Renamed', color: 'blue' } });
    expect(useStore.getState().snapshot.filters!.a).toMatchObject({ name: 'Renamed', color: 'blue', query: 'today' });

    await useStore.getState().deleteFilter('a');
    expect(lastCommands()[0]).toMatchObject({ type: 'filter_delete', args: { id: 'a' } });
    expect(useStore.getState().snapshot.filters!.a).toBeUndefined();
  });

  it('moves one filter by giving it a key between its new neighbours', async () => {
    withFilters(filter('a', 'a0'), filter('b', 'a1'), filter('c', 'a2'));
    await useStore.getState().reorderFilters(['c', 'a', 'b'], 'c');
    const [cmd] = lastCommands();
    expect(cmd.type).toBe('filter_update');
    expect(cmd.args.id).toBe('c');
    expect((cmd.args.order_key as string) < 'a0').toBe(true);
  });

  it('falls back to the whole order for an account without keys', async () => {
    withFilters(filter('a', null), filter('b', null));
    await useStore.getState().reorderFilters(['b', 'a'], 'b');
    expect(lastCommands()[0]).toMatchObject({ type: 'filter_update_orders', args: { id_order_mapping: { b: 1, a: 2 } } });
  });
});

describe('tags', () => {
  it('changes a tag colour', async () => {
    useStore.setState({ snapshot: { ...emptySnapshot(), labels: { l1: { id: 'l1', name: 'home', color: 'red', item_order: 1, is_deleted: false, is_favorite: false } } } });
    await useStore.getState().setLabelColour('l1', 'blue');
    expect(lastCommands()[0]).toMatchObject({ type: 'label_update', args: { id: 'l1', color: 'blue' } });
    expect(useStore.getState().snapshot.labels.l1.color).toBe('blue');
  });

  it('deletes a tag and takes it off its tasks at once', async () => {
    const { item } = await import('@/test/items');
    useStore.setState({
      snapshot: {
        ...emptySnapshot(),
        labels: { l1: { id: 'l1', name: 'Home', color: 'red', item_order: 1, is_deleted: false, is_favorite: false } },
        items: { t1: item({ id: 't1', labels: ['home', 'other'] }) },
      },
    });
    await useStore.getState().deleteLabel('l1');
    expect(lastCommands()[0]).toMatchObject({ type: 'label_delete', args: { id: 'l1' } });
    expect(useStore.getState().snapshot.labels.l1).toBeUndefined();
    expect(useStore.getState().snapshot.items.t1.labels).toEqual(['other']);
  });
});
