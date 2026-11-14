import { describe, expect, it } from 'vitest';
import { updateItem, deleteItem } from '@/api/commands';
import { emptySnapshot } from '@/domain/types';
import { item } from '@/test/items';
import { overlayQueuedIntent } from './queuedIntent';

describe('pending intent', () => {
  it('keeps a queued edit visible after an older server response', () => {
    const server = emptySnapshot();
    server.items.a = item({ id: 'a', content: 'old' });
    const local = { ...server, items: { a: item({ id: 'a', content: 'new' }) } };
    expect(overlayQueuedIntent(server, local, [updateItem('a', { content: 'new' })], {}).items.a.content).toBe('new');
  });
  it('keeps a pending deletion hidden after an older server response', () => {
    const server = emptySnapshot();
    server.items.a = item({ id: 'a' });
    expect(overlayQueuedIntent(server, { ...server, items: {} }, [deleteItem('a')], {}).items.a).toBeUndefined();
  });
});
