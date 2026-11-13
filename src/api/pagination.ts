/** Stop broken pagination rather than silently looping or returning partial data. */
export class CursorGuard {
  private seen = new Set<string>();
  next(cursor: string | null | undefined): void {
    if (!cursor) return;
    if (this.seen.has(cursor)) throw new Error('Repeated pagination cursor');
    if (this.seen.size >= 1000) throw new Error('Pagination limit exceeded');
    this.seen.add(cursor);
  }
}
