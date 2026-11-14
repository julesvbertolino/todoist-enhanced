/** Ownership is local to this window; the durable record lives in IndexedDB. */
const active = new Map<string, string>();
export const leaseOwner = (name: string) => active.get(name);
export const setLeaseOwner = (name: string, owner: string) => { active.set(name, owner); };
export const clearLeaseOwner = (name: string, owner: string) => { if (active.get(name) === owner) active.delete(name); };
