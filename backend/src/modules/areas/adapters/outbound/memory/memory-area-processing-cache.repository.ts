import { Injectable } from "@nestjs/common";
import type {
  AreaProcessingCacheEntry,
  AreaProcessingCachePort
} from "../../../application/ports/area-processing-cache.port";
import type { AreaProcessingResult } from "../../../domain/area.types";

@Injectable()
export class MemoryAreaProcessingCacheRepository implements AreaProcessingCachePort {
  private readonly entries = new Map<string, AreaProcessingCacheEntry>();

  async get(key: string): Promise<AreaProcessingCacheEntry | null> {
    const entry = this.entries.get(key);
    if (!entry) {
      return null;
    }

    const updated: AreaProcessingCacheEntry = {
      ...entry,
      hits: entry.hits + 1
    };
    this.entries.set(key, updated);
    return {
      ...updated
    };
  }

  async set(key: string, value: AreaProcessingResult): Promise<AreaProcessingCacheEntry> {
    const entry: AreaProcessingCacheEntry = {
      key,
      value,
      storedAt: new Date().toISOString(),
      hits: 0
    };
    this.entries.set(key, entry);
    return {
      ...entry
    };
  }
}
