import { test, expect } from '@playwright/test';

test.skip(process.env.PLAYWRIGHT_DEV !== '1', 'Exercises source modules and IndexedDB in development mode');

test('outbox ordering and acknowledged mappings survive in real IndexedDB', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    // @ts-expect-error Vite source module is served in the development test.
    const db = await import('/src/db/idb.ts');
    // @ts-expect-error Vite source module is served in the development test.
    const types = await import('/src/domain/types.ts');
    await db.clearAll();
    const clock = Date.now;
    Date.now = () => 1000;
    try {
      await db.enqueue([{ type: 'project_add', uuid: 'z-create', args: { name: 'New' }, temp_id: 'temp' }], 'account');
      await db.enqueue([{ type: 'item_add', uuid: 'a-child', args: { project_id: 'temp', content: 'temp' } }], 'account');
      const before = await db.readQueue();
      const snapshot = types.emptySnapshot();
      const uncloneable = { ...snapshot, invalid: () => undefined };
      let failed = false;
      try { await db.settleQueue(['z-create'], [], { temp: 'real' }, uncloneable, 'account'); } catch { failed = true; }
      const afterFailure = await db.readQueue();
      snapshot.syncToken = 'confirmed';
      await db.settleQueue(['z-create'], [], { temp: 'real' }, snapshot, 'account');
      const after = await db.readQueue();
      const saved = await db.loadSnapshot();
      await db.clearAll();
      return { failed, afterFailure: afterFailure.map((c: { uuid: string }) => c.uuid), order: before.map((c: { uuid: string }) => c.uuid), after, token: saved.syncToken };
    } finally { Date.now = clock; }
  });
  expect(result.failed).toBe(true);
  expect(result.afterFailure).toEqual(['z-create', 'a-child']);
  expect(result.order).toEqual(['z-create', 'a-child']);
  expect(result.after).toHaveLength(1);
  expect(result.after[0].args).toEqual({ project_id: 'real', content: 'temp' });
  expect(result.token).toBe('confirmed');
});

test('fallback lease serializes two windows and hands over after release', async ({ context, page }) => {
  await page.goto('/');
  const other = await context.newPage();
  await other.goto('/');
  const first = page.evaluate(async () => {
    // @ts-expect-error Vite source module is served in the development test.
    const { leaseTurn } = await import('/src/db/lease.ts');
    await leaseTurn('test-two-windows', async () => {
      localStorage.setItem('lease-test', 'first-start');
      await new Promise<void>((resolve) => { (window as unknown as { releaseLease: () => void }).releaseLease = resolve; });
      localStorage.setItem('lease-test', 'first-end');
    });
  });
  await expect.poll(() => page.evaluate(() => localStorage.getItem('lease-test'))).toBe('first-start');
  const second = other.evaluate(async () => {
    // @ts-expect-error Vite source module is served in the development test.
    const { leaseTurn } = await import('/src/db/lease.ts');
    return leaseTurn('test-two-windows', async () => localStorage.getItem('lease-test'));
  });
  await page.waitForTimeout(300);
  expect(await other.evaluate(() => localStorage.getItem('lease-test'))).toBe('first-start');
  await page.evaluate(() => (window as unknown as { releaseLease: () => void }).releaseLease());
  await first;
  expect(await second).toBe('first-end');
});

test('preference changes from two windows remain ordered and account-scoped', async ({ context, page }) => {
  await page.goto('/');
  const other = await context.newPage();
  await other.goto('/');
  await page.evaluate(async () => {
    // @ts-expect-error Vite source module in development tests.
    const db = await import('/src/db/idb.ts');
    await db.clearAll();
  });
  await Promise.all([page, other].map((tab, index) => tab.evaluate(async (number) => {
    // @ts-expect-error Vite source module in development tests.
    const db = await import('/src/db/idb.ts');
    await db.appendPreferenceChange('account-a', { clock: false, theme: 'light' }, number === 0
      ? { clock: true, theme: 'light' } : { clock: false, theme: 'dark' });
  }, index)));
  const result = await page.evaluate(async () => {
    // @ts-expect-error Vite source module in development tests.
    const db = await import('/src/db/idb.ts');
    await db.appendPreferenceChange('account-b', {}, { other: true });
    await db.clearSession();
    const a = await db.readPreferenceChanges('account-a');
    const b = await db.readPreferenceChanges('account-b');
    await db.removePreferenceChanges([a[0].id]);
    const remaining = await db.readPreferenceChanges('account-a');
    await db.clearAll();
    return { a, b, remaining };
  });
  expect(result.a).toHaveLength(2);
  expect(result.a[0].order).toBeLessThan(result.a[1].order);
  expect(result.b).toHaveLength(1);
  expect(result.remaining).toHaveLength(1);
});

test('a resumed fallback owner detects that another window took its lease', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    // @ts-expect-error Vite source module in development tests.
    const { leaseTurn, assertLease } = await import('/src/db/lease.ts');
    let applied = false;
    let rejected = false;
    try {
      await leaseTurn('test-stolen', async () => {
        const connection = await new Promise<IDBDatabase>((resolve, reject) => {
          const open = indexedDB.open('todoist-enhancements');
          open.onsuccess = () => resolve(open.result);
          open.onerror = () => reject(open.error);
        });
        await new Promise<void>((resolve, reject) => {
          const tx = connection.transaction('prefs', 'readwrite');
          tx.objectStore('prefs').put({ owner: 'another-window', until: Date.now() + 120_000 }, 'lease:test-stolen');
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
        connection.close();
        await assertLease('test-stolen');
        applied = true;
      });
    } catch { rejected = true; }
    return { rejected, applied };
  });
  expect(result).toEqual({ rejected: true, applied: false });
});

test('a stolen sync lease cannot acknowledge or replace a snapshot', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    // @ts-expect-error Vite source module in development tests.
    const db = await import('/src/db/idb.ts');
    // @ts-expect-error Vite source module in development tests.
    const { leaseTurn } = await import('/src/db/lease.ts');
    // @ts-expect-error Vite source module in development tests.
    const { emptySnapshot } = await import('/src/domain/types.ts');
    await db.clearAll();
    await db.enqueue([{ type: 'item_update', uuid: 'pending', args: { id: 'a' } }], 'a');
    let refused = false;
    try {
      await leaseTurn('todoist-enhanced-sync', async () => {
        const connection = await new Promise<IDBDatabase>((resolve, reject) => {
          const open = indexedDB.open('todoist-enhancements');
          open.onsuccess = () => resolve(open.result);
          open.onerror = () => reject(open.error);
        });
        await new Promise<void>((resolve, reject) => {
          const tx = connection.transaction('prefs', 'readwrite');
          tx.objectStore('prefs').put({ owner: 'new-owner', until: Date.now() + 120_000 }, 'lease:todoist-enhanced-sync');
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
        connection.close();
        await db.settleQueue(['pending'], [], {}, { ...emptySnapshot(), syncToken: 'stale' }, 'a');
      });
    } catch { refused = true; }
    const queue = await db.readQueue();
    const snapshot = await db.loadSnapshot();
    await db.clearAll();
    return { refused, queue: queue.map((entry: { uuid: string }) => entry.uuid), token: snapshot.syncToken };
  });
  expect(result.refused).toBe(true);
  expect(result.queue).toEqual(['pending']);
  expect(result.token).not.toBe('stale');
});

test('opens an existing version-one database without an upgrade or loss of queued work', async ({ page }) => {
  await page.goto('/oauth/client.json');
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const open = indexedDB.open('todoist-enhancements', 1);
      open.onupgradeneeded = () => {
        const db = open.result;
        db.createObjectStore('snapshot');
        db.createObjectStore('prefs');
        db.createObjectStore('queue', { keyPath: 'uuid' });
        open.transaction!.objectStore('queue').put({ uuid: 'from-v1', type: 'item_update', args: { id: 'a' }, queuedAt: 1, attempts: 0, userId: 'a' });
      };
      open.onsuccess = () => { open.result.close(); resolve(); };
      open.onerror = () => reject(open.error);
    });
  });
  await page.goto('/');
  const result = await page.evaluate(async () => {
    // @ts-expect-error Vite source module in development tests.
    const db = await import('/src/db/idb.ts');
    const queue = await db.readQueue();
    await db.clearAll();
    return queue.map((entry: { uuid: string }) => entry.uuid);
  });
  expect(result).toEqual(['from-v1']);
});

test('older delayed snapshots cannot replace a newer write or a signed-out session', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    // @ts-expect-error Vite source module in development tests.
    const db = await import('/src/db/idb.ts');
    // @ts-expect-error Vite source module in development tests.
    const { emptySnapshot } = await import('/src/domain/types.ts');
    await db.clearAll();
    const old = await db.reserveSnapshot();
    await db.enqueue([{ type: 'item_update', uuid: 'pending', args: { id: 'a' } }], 'a', { ...emptySnapshot(), syncToken: 'new' });
    await db.saveSnapshot({ ...emptySnapshot(), syncToken: 'old' }, Promise.resolve(old));
    const afterNew = (await db.loadSnapshot()).syncToken;
    const beforeSignOut = await db.reserveSnapshot();
    await db.clearSession();
    await db.saveSnapshot({ ...emptySnapshot(), syncToken: 'next-account' });
    await db.saveSnapshot({ ...emptySnapshot(), syncToken: 'old-account' }, Promise.resolve(beforeSignOut));
    const afterSignOut = (await db.loadSnapshot()).syncToken;
    await db.clearAll();
    return { afterNew, afterSignOut };
  });
  expect(result).toEqual({ afterNew: 'new', afterSignOut: 'next-account' });
});

test('edits from stale windows merge into the durable optimistic snapshot', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    // @ts-expect-error Vite source module in development tests.
    const db = await import('/src/db/idb.ts');
    // @ts-expect-error Vite source module in development tests.
    const { emptySnapshot } = await import('/src/domain/types.ts');
    await db.clearAll();
    const before = { ...emptySnapshot(), user: { id: 'a' }, items: { first: { id: 'first', content: 'old' }, second: { id: 'second', content: 'old' } } };
    await db.enqueue([{ type: 'item_update', uuid: 'first', args: { id: 'first', content: 'one' } }], 'a',
      { ...before, items: { ...before.items, first: { id: 'first', content: 'one' } } }, before);
    await db.enqueue([{ type: 'item_update', uuid: 'second', args: { id: 'second', content: 'two' } }], 'a',
      { ...before, items: { ...before.items, second: { id: 'second', content: 'two' } } }, before);
    await db.settleQueue(['first'], [], {},
      { ...before, syncToken: 'after-first', items: { ...before.items, first: { id: 'first', content: 'one' } } }, 'a');
    const snapshot = await db.loadSnapshot();
    await db.clearAll();
    return [snapshot.items.first.content, snapshot.items.second.content];
  });
  expect(result).toEqual(['one', 'two']);
});

test('an old window holding version one does not block the new application', async ({ context, page }) => {
  await page.goto('/oauth/client.json');
  await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const open = indexedDB.open('todoist-enhancements', 1);
      open.onupgradeneeded = () => {
        open.result.createObjectStore('snapshot');
        open.result.createObjectStore('prefs');
        open.result.createObjectStore('queue', { keyPath: 'uuid' });
      };
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });
    (window as unknown as { oldDatabase: IDBDatabase }).oldDatabase = database;
  });
  const second = await context.newPage();
  await second.goto('/');
  const result = await second.evaluate(async () => {
    // @ts-expect-error Vite source module in development tests.
    const db = await import('/src/db/idb.ts');
    // @ts-expect-error Vite source module in development tests.
    const { leaseTurn } = await import('/src/db/lease.ts');
    await leaseTurn('compatibility-check', async () => {
      await db.enqueue([{ uuid: 'old-version-compatible', type: 'item_update', args: { id: 'a' } }], 'a');
      await db.clearSession();
    });
    return (await db.readQueue()).map((entry: { uuid: string }) => entry.uuid);
  });
  expect(result).toEqual(['old-version-compatible']);
  await page.evaluate(() => (window as unknown as { oldDatabase: IDBDatabase }).oldDatabase.close());
});
