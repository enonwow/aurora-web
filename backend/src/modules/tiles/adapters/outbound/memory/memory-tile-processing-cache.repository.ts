import { Injectable } from "@nestjs/common";
import { AppConfigService } from "../../../../../common/config/app-config.service";
import type {
  TileProcessingCacheEntry,
  TileProcessingCachePort
} from "../../../application/ports/tile-processing-cache.port";
import type { TileProcessingResult } from "../../../domain/tile.types";

interface MemoryTileCacheEntry extends TileProcessingCacheEntry {
  expiresAtMs: number;
}

@Injectable()
export class MemoryTileProcessingCacheRepository implements TileProcessingCachePort {
  private readonly entries = new Map<string, MemoryTileCacheEntry>();
  private readonly maxEntries: number;
  private readonly maxEntryBytes: number;
  private readonly ttlMs: number;

  constructor(config: AppConfigService) {
    this.maxEntries = config.processingCacheL1AreaMaxEntries;
    this.maxEntryBytes = config.processingCacheL1AreaMaxEntryBytes;
    this.ttlMs = config.processingCacheL1TtlSeconds * 1000;
  }

  async get(key: string): Promise<TileProcessingCacheEntry | null> {
    const entry = this.entries.get(key);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (entry.expiresAtMs <= now) {
      this.entries.delete(key);
      return null;
    }

    const updated: MemoryTileCacheEntry = {
      ...entry,
      hits: entry.hits + 1,
      expiresAtMs: now + this.ttlMs
    };
    this.entries.delete(key);
    this.entries.set(key, updated);

    return {
      key: updated.key,
      value: updated.value,
      storedAt: updated.storedAt,
      hits: updated.hits
    };
  }

  async set(key: string, value: TileProcessingResult): Promise<TileProcessingCacheEntry> {
    const now = Date.now();
    const entry: MemoryTileCacheEntry = {
      key,
      value,
      storedAt: new Date(now).toISOString(),
      hits: 0,
      expiresAtMs: now + this.ttlMs
    };
    if (!isOverMaxEntrySize(value, this.maxEntryBytes)) {
      this.entries.delete(key);
      this.entries.set(key, entry);
      this.evictOverflowEntries();
    }

    return {
      key: entry.key,
      value: entry.value,
      storedAt: entry.storedAt,
      hits: entry.hits
    };
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
