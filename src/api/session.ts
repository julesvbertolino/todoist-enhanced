/** Abort API work owned by a session when the account changes in this window. */
let controller = new AbortController();
export const sessionSignal = (): AbortSignal => controller.signal;
export function invalidateSession(): void {
  controller.abort();
  controller = new AbortController();
}
