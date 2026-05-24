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
    return {
      ...updated
    } as ProcessingCacheEntry<TValue>;
  }

  async set<TValue = unknown>(
    key: string,
    value: TValue
  ): Promise<ProcessingCacheEntry<TValue>> {
    const entry: ProcessingCacheEntry<unknown> = {
      key,
      value,
      storedAt: new Date().toISOString(),
      hits: 0
    };
    this.entries.set(key, entry);
    return {
      ...entry
    } as ProcessingCacheEntry<TValue>;
  }
}
