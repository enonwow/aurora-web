import { Injectable } from "@nestjs/common";
import { AppConfigService } from "../../../../../common/config/app-config.service";
import type {
  TileProcessingCacheEntry,
  TileProcessingCachePort
} from "../../../application/ports/tile-processing-cache.port";
import type { TileProcessingResult } from "../../../domain/tile.types";
import { S3TileProcessingCacheRepository } from "../blob/s3-tile-processing-cache.repository";
import { MemoryTileProcessingCacheRepository } from "../memory/memory-tile-processing-cache.repository";

interface AdmissionEntry {
  hits: number;
  expiresAtMs: number;
}

@Injectable()
export class LayeredTileProcessingCacheRepository implements TileProcessingCachePort {
  private readonly admission = new Map<string, AdmissionEntry>();
  private readonly admissionHits: number;
  private readonly admissionWindowMs: number;
  private readonly admissionTrackingLimit: number;

  constructor(
    private readonly s3Cache: S3TileProcessingCacheRepository,
    private readonly memoryCache: MemoryTileProcessingCacheRepository,
    config: AppConfigService
  ) {
    this.admissionHits = config.processingCacheL1AdmissionHits;
    this.admissionWindowMs = config.processingCacheL1AdmissionWindowSeconds * 1000;
    this.admissionTrackingLimit = Math.max(1000, config.processingCacheL1AreaMaxEntries * 4);
  }

  async get(key: string): Promise<TileProcessingCacheEntry | null> {
    const memoryEntry = await this.memoryCache.get(key);
    if (memoryEntry) {
      this.admission.delete(key);
      return memoryEntry;
    }

    const s3Entry = await this.s3Cache.get(key);
    if (!s3Entry) {
      this.admission.delete(key);
      return null;
    }

    if (this.shouldPromoteToL1(key)) {
      await this.memoryCache.set(key, s3Entry.value);
    }
    return s3Entry;
  }

  async set(key: string, value: TileProcessingResult): Promise<TileProcessingCacheEntry> {
    const [stored] = await Promise.all([this.s3Cache.set(key, value), this.memoryCache.set(key, value)]);
    this.admission.delete(key);
    return stored;
  }

  private shouldPromoteToL1(key: string): boolean {
    const now = Date.now();
    const previous = this.admission.get(key);
    const withinWindow = previous ? previous.expiresAtMs > now : false;
    const hits = withinWindow && previous ? previous.hits + 1 : 1;

    if (hits >= this.admissionHits) {
      this.admission.delete(key);
      return true;
    }

    this.admission.delete(key);
    this.admission.set(key, {
      hits,
      expiresAtMs: now + this.admissionWindowMs
    });
    this.pruneAdmissionOverflow();
    return false;
  }

  private pruneAdmissionOverflow(): void {
    while (this.admission.size > this.admissionTrackingLimit) {
      const oldestKey = this.admission.keys().next().value;
      if (!oldestKey) {
        return;
      }
      this.admission.delete(oldestKey);
    }
  }
}
