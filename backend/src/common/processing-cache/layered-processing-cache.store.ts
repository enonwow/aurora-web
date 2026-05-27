import type {
  ProcessingCacheBackend,
  ProcessingCacheEntryLike
} from "./processing-cache.types";

interface AdmissionEntry {
  hits: number;
  expiresAtMs: number;
}

export interface LayeredProcessingCacheConfig {
  admissionHits: number;
  admissionWindowMs: number;
  admissionTrackingLimit: number;
}

export class LayeredProcessingCacheStore<
  TValue,
  TEntry extends ProcessingCacheEntryLike<TValue>
> {
  private readonly admission = new Map<string, AdmissionEntry>();

  constructor(
    private readonly l2Cache: ProcessingCacheBackend<TValue, TEntry>,
    private readonly l1Cache: ProcessingCacheBackend<TValue, TEntry>,
    private readonly config: LayeredProcessingCacheConfig
  ) {}

  async get(key: string): Promise<TEntry | null> {
    const memoryEntry = await this.l1Cache.get(key);
    if (memoryEntry) {
      this.admission.delete(key);
      return memoryEntry;
    }

    const l2Entry = await this.l2Cache.get(key);
    if (!l2Entry) {
      this.admission.delete(key);
      return null;
    }

    if (this.shouldPromoteToL1(key)) {
      await this.l1Cache.set(key, l2Entry.value);
    }
    return l2Entry;
  }

  async set(key: string, value: TValue): Promise<TEntry> {
    const [stored] = await Promise.all([this.l2Cache.set(key, value), this.l1Cache.set(key, value)]);
    this.admission.delete(key);
    return stored;
  }

  private shouldPromoteToL1(key: string): boolean {
    const now = Date.now();
    const previous = this.admission.get(key);
    const withinWindow = previous ? previous.expiresAtMs > now : false;
    const hits = withinWindow && previous ? previous.hits + 1 : 1;

    if (hits >= this.config.admissionHits) {
      this.admission.delete(key);
      return true;
    }

    this.admission.delete(key);
    this.admission.set(key, {
      hits,
      expiresAtMs: now + this.config.admissionWindowMs
    });
    this.pruneAdmissionOverflow();
    return false;
  }

  private pruneAdmissionOverflow(): void {
    while (this.admission.size > this.config.admissionTrackingLimit) {
      const oldestKey = this.admission.keys().next().value;
      if (!oldestKey) {
        return;
      }
      this.admission.delete(oldestKey);
    }
  }
}
