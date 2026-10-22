/**
 * A small in-memory cache with an expiry, for data that is read on every page but changes rarely
 * (who the staff are, how many leads are new). On a database that is far from the server every
 * query costs a round trip of hundreds of milliseconds, so a page that re-reads the same facts
 * pays that on every click. Concurrent callers share one in-flight read. Each server instance has
 * its own copy, so a value can be stale for at most `ms` on another instance: use it for display,
 * and read fresh data when a decision depends on it (permission checks in actions).
 */
export function ttlCache<A extends unknown[], T>(
  ms: number,
  load: (...args: A) => Promise<T>,
  keyOf: (...args: A) => string = (...args) => JSON.stringify(args),
) {
  const entries = new Map<string, { at: number; value: Promise<T> }>();

  const read = (...args: A): Promise<T> => {
    const key = keyOf(...args);
    const hit = entries.get(key);
    if (hit && Date.now() - hit.at < ms) return hit.value;
    const value = load(...args).catch((error: unknown) => {
      // Never keep a failure: the next caller tries again.
      entries.delete(key);
      throw error;
    });
    entries.set(key, { at: Date.now(), value });
    return value;
  };

  /** Forget everything (after a change the next read must see), or one key. */
  read.clear = (...args: A | []) => {
    if (args.length === 0) entries.clear();
    else entries.delete(keyOf(...(args as A)));
  };
  return read;
}
