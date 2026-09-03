import type { ProcessingCacheEntryLike } from "./processing-cache.types";

interface MemoryEntry<TValue> extends ProcessingCacheEntryLike<TValue> {
  expiresAtMs: number;
}

export class MemoryProcessingCacheStore<TValue> {
  private readonly entries = new Map<string, MemoryEntry<TValue>>();

  constructor(
    private readonly maxEntries: number,
    private readonly maxEntryBytes: number,
    private readonly ttlMs: number
  ) {}

  async get(key: string): Promise<ProcessingCacheEntryLike<TValue> | null> {
    const entry = this.entries.get(key);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (entry.expiresAtMs <= now) {
      this.entries.delete(key);
      return null;
    }

    const updated: MemoryEntry<TValue> = {
      ...entry,
      hits: entry.hits + 1,
      expiresAtMs: now + this.ttlMs
    };
    this.entries.delete(key);
    this.entries.set(key, updated);
    return toPublicEntry(updated, true);
  }

  async set(key: string, value: TValue): Promise<ProcessingCacheEntryLike<TValue>> {
    const now = Date.now();
    const entry: MemoryEntry<TValue> = {
      key,
      value,
      storedAt: new Date(now).toISOString(),
      hits: 0,
      expiresAtMs: now + this.ttlMs
    };

    const retained = !isOverMaxEntrySize(value, this.maxEntryBytes);
    if (retained) {
      this.entries.delete(key);
      this.entries.set(key, entry);
      this.evictOverflowEntries();
    }

    return toPublicEntry(entry, retained);
  }

  private evictOverflowEntries(): void {
    while (this.entries.size > this.maxEntries) {
      const oldestKey = this.entries.keys().next().value;
      if (!oldestKey) {
        return;
      }
      this.entries.delete(oldestKey);
    }
  }
}

function toPublicEntry<TValue>(
  entry: MemoryEntry<TValue>,
  retained: boolean
): ProcessingCacheEntryLike<TValue> {
  return {
    key: entry.key,
    value: entry.value,
    storedAt: entry.storedAt,
    hits: entry.hits,
    retained
  };
}

function isOverMaxEntrySize(value: unknown, maxEntryBytes: number): boolean {
  try {
    const serialized = JSON.stringify(value);
    if (!serialized) {
      return false;
    }
    return Buffer.byteLength(serialized, "utf-8") > maxEntryBytes;
  } catch {
    return true;
  }
}
