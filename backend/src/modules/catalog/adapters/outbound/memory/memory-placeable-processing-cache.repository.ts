import { Injectable } from "@nestjs/common";
import type {
  PlaceableProcessingCacheEntry,
  PlaceableProcessingCachePort,
  PlaceableProcessingResult
} from "../../../application/ports/placeable-processing-cache.port";

@Injectable()
export class MemoryPlaceableProcessingCacheRepository
  implements PlaceableProcessingCachePort
{
  private readonly entries = new Map<string, PlaceableProcessingCacheEntry>();

  async get(key: string): Promise<PlaceableProcessingCacheEntry | null> {
    const entry = this.entries.get(key);
    if (!entry) {
      return null;
    }

    const updated: PlaceableProcessingCacheEntry = {
      ...entry,
      hits: entry.hits + 1
    };
    this.entries.set(key, updated);
    return cloneEntry(updated);
  }

  async set(
    key: string,
    value: PlaceableProcessingResult
  ): Promise<PlaceableProcessingCacheEntry> {
    const entry: PlaceableProcessingCacheEntry = {
      key,
      value: structuredClone(value),
      storedAt: new Date().toISOString(),
      hits: 0
    };
    this.entries.set(key, entry);
    return cloneEntry(entry);
  }
}

function cloneEntry(entry: PlaceableProcessingCacheEntry): PlaceableProcessingCacheEntry {
  return {
    key: entry.key,
    value: structuredClone(entry.value),
    storedAt: entry.storedAt,
    hits: entry.hits
  };
}
