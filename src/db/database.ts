import { openDB, type IDBPDatabase } from 'idb';

/** One database lets a sender's lease be checked in the same transaction as its commit. */
export const LEASE_STORE = 'prefs';
export const leaseKey = (name: string) => `lease:${name}`;
let connection: Promise<IDBPDatabase> | null = null;
export function openDatabase(): Promise<IDBPDatabase> {
  if (connection) return connection;
  let expired = false;
  const opening = openDB('todoist-enhancements', undefined, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('snapshot')) db.createObjectStore('snapshot');
      if (!db.objectStoreNames.contains('prefs')) db.createObjectStore('prefs');
      if (!db.objectStoreNames.contains('queue')) db.createObjectStore('queue', { keyPath: 'uuid' });
    },
    blocking() { void connection?.then((db) => { db.close(); connection = null; }); },
    terminated() { connection = null; },
  });
  // An older tab can hold an upgrade open forever. Surface the failure and
  // permit another attempt; close a connection that arrives after timeout.
  connection = new Promise<IDBPDatabase>((resolve, reject) => {
    const timer = setTimeout(() => { expired = true; reject(new Error('Database open timed out')); }, 15_000);
    opening.then((db) => {
      clearTimeout(timer);
      if (expired) db.close(); else resolve(db);
    }, (error: unknown) => { clearTimeout(timer); reject(error); });
  }).catch((error) => { connection = null; throw error; });
  return connection;
}
