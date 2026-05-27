import { Injectable } from "@nestjs/common";
import { AppConfigService } from "../../../../../common/config/app-config.service";
import type {
  SoundProcessingCacheEntry,
  SoundProcessingCachePort
} from "../../../application/ports/sound-processing-cache.port";
import type { SoundProcessingResult } from "../../../domain/sound.types";

interface MemorySoundCacheEntry extends SoundProcessingCacheEntry {
  expiresAtMs: number;
}

@Injectable()
export class MemorySoundProcessingCacheRepository implements SoundProcessingCachePort {
  private readonly entries = new Map<string, MemorySoundCacheEntry>();
  private readonly maxEntries: number;
  private readonly maxEntryBytes: number;
  private readonly ttlMs: number;

  constructor(config: AppConfigService) {
    this.maxEntries = config.processingCacheL1CatalogMaxEntries;
    this.maxEntryBytes = config.processingCacheL1CatalogMaxEntryBytes;
    this.ttlMs = config.processingCacheL1TtlSeconds * 1000;
  }

  async get(key: string): Promise<SoundProcessingCacheEntry | null> {
    const entry = this.entries.get(key);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (entry.expiresAtMs <= now) {
      this.entries.delete(key);
      return null;
    }

    const updated: MemorySoundCacheEntry = {
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

  async set(key: string, value: SoundProcessingResult): Promise<SoundProcessingCacheEntry> {
    const now = Date.now();
    const entry: MemorySoundCacheEntry = {
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
