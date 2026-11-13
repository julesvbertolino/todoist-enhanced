import { openDatabase, LEASE_STORE, leaseKey } from './database';
import { leaseOwner, setLeaseOwner, clearLeaseOwner } from './leaseOwners';

const LOCK_STORE = LEASE_STORE;
const LEASE_MS = 120_000;
const WAIT_MS = 30_000;
type Lease = { owner: string; until: number };
const db = openDatabase;
const wait = (ms: number, signal?: AbortSignal) => new Promise<void>((resolve, reject) => {
  if (signal?.aborted) { reject(new DOMException('Aborted', 'AbortError')); return; }
  const abort = () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); };
  const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve(); }, ms);
  signal?.addEventListener('abort', abort, { once: true });
});

/** Recheck ownership after a suspended window wakes, before applying work. */
export async function assertLease(name: string): Promise<void> {
  const owner = leaseOwner(name);
  if (!owner) return; // Web Locks, or no fallback lease in this window.
  const current = await (await db()).get(LOCK_STORE, leaseKey(name)) as Lease | undefined;
  if (current?.owner !== owner || current.until <= Date.now()) throw new Error('Lost ownership of the sync turn');
}

/** IndexedDB leases coordinate windows on browsers without Web Locks. */
export async function leaseTurn<T>(name: string, task: () => Promise<T>, signal?: AbortSignal): Promise<T> {
  const connection = await db();
  const owner = crypto.randomUUID();
  const started = Date.now();
  for (;;) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const tx = connection.transaction(LOCK_STORE, 'readwrite');
    const current = await tx.store.get(leaseKey(name)) as Lease | undefined;
    const available = !current || current.until <= Date.now();
    if (available) await tx.store.put({ owner, until: Date.now() + LEASE_MS } satisfies Lease, leaseKey(name));
    await tx.done;
    if (available) break;
    if (Date.now() - started > WAIT_MS) throw new Error('Timed out waiting for another window');
    await wait(150 + Math.random() * 100, signal);
  }
  let lost = false;
  setLeaseOwner(name, owner);
  const heartbeat = setInterval(() => {
    void (async () => {
      try {
        const tx = connection.transaction(LOCK_STORE, 'readwrite');
        const current = await tx.store.get(leaseKey(name)) as Lease | undefined;
        if (current?.owner === owner) await tx.store.put({ owner, until: Date.now() + LEASE_MS } satisfies Lease, leaseKey(name));
        else lost = true;
        await tx.done;
      } catch { lost = true; }
    })();
  }, 15_000);
  try {
    const value = await task();
    if (lost) throw new Error('Lost ownership of the sync turn');
    await assertLease(name);
    return value;
  } finally {
    clearInterval(heartbeat);
    clearLeaseOwner(name, owner);
    const tx = connection.transaction(LOCK_STORE, 'readwrite');
    const current = await tx.store.get(leaseKey(name)) as Lease | undefined;
    if (current?.owner === owner) await tx.store.delete(leaseKey(name));
    await tx.done;
  }
}
