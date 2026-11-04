/**
 * A tiny TTL + LRU cache. Values may be `null`; `undefined` means a miss.
 */
export class TtlCache {
  #entries = new Map();
  #ttlMs;
  #max;
  #now;

  constructor({ ttlMs = 10 * 60 * 1000, max = 500, now = Date.now } = {}) {
    this.#ttlMs = ttlMs;
    this.#max = Math.max(1, max);
    this.#now = now;
  }

  get(key) {
    const entry = this.#entries.get(key);
    if (!entry) return undefined;

    if (entry.expiresAt <= this.#now()) {
      this.#entries.delete(key);
      return undefined;
    }

    // Refresh recency for LRU behaviour.
    this.#entries.delete(key);
    this.#entries.set(key, entry);
    return entry.value;
  }

  /** Return an expired value without reviving it, for stale-if-error responses. */
  peekStale(key) {
    return this.#entries.get(key)?.value;
  }

  set(key, value, ttlMs = this.#ttlMs) {
    if (!Number.isFinite(ttlMs) || ttlMs <= 0) return;

    this.#entries.delete(key);
    this.#entries.set(key, { value, expiresAt: this.#now() + ttlMs });

    while (this.#entries.size > this.#max) {
      const oldest = this.#entries.keys().next().value;
      this.#entries.delete(oldest);
    }
  }

  clear() {
    this.#entries.clear();
  }

  get size() {
    return this.#entries.size;
  }
}
