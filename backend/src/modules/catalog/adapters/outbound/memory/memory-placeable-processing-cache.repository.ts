import { Injectable } from "@nestjs/common";
import type {
  PlaceableProcessingCachePort,
  ProcessingCacheEntry
} from "../../../application/ports/placeable-processing-cache.port";

@Injectable()
export class MemoryPlaceableProcessingCacheRepository
  implements PlaceableProcessingCachePort
{
  private readonly entries = new Map<string, ProcessingCacheEntry<unknown>>();

  async get<TValue = unknown>(key: string): Promise<ProcessingCacheEntry<TValue> | null> {
    const entry = this.entries.get(key);
    if (!entry) {
      return null;
    }

    const updated: ProcessingCacheEntry<unknown> = {
      ...entry,
      hits: entry.hits + 1
    };
    this.entries.set(key, updated);
    return cloneEntry(updated) as ProcessingCacheEntry<TValue>;
  }

  async set<TValue = unknown>(
    key: string,
    value: TValue
  ): Promise<ProcessingCacheEntry<TValue>> {
    const entry: ProcessingCacheEntry<unknown> = {
      key,
      value: structuredClone(value),
      storedAt: new Date().toISOString(),
      hits: 0
    };
    this.entries.set(key, entry);
    return cloneEntry(entry) as ProcessingCacheEntry<TValue>;
  }
}

function cloneEntry(entry: ProcessingCacheEntry<unknown>): ProcessingCacheEntry<unknown> {
  return {
    key: entry.key,
    value: structuredClone(entry.value),
    storedAt: entry.storedAt,
    hits: entry.hits
  };
}
