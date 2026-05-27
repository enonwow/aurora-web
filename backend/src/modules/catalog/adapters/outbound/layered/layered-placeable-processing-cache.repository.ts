import { Injectable } from "@nestjs/common";
import { AppConfigService } from "../../../../../common/config/app-config.service";
import type {
  PlaceableProcessingCachePort,
  ProcessingCacheEntry
} from "../../../application/ports/placeable-processing-cache.port";
import { S3PlaceableProcessingCacheRepository } from "../blob/s3-placeable-processing-cache.repository";
import { MemoryPlaceableProcessingCacheRepository } from "../memory/memory-placeable-processing-cache.repository";

interface AdmissionEntry {
  hits: number;
  expiresAtMs: number;
}

@Injectable()
export class LayeredPlaceableProcessingCacheRepository
  implements PlaceableProcessingCachePort
{
  private readonly admission = new Map<string, AdmissionEntry>();
  private readonly admissionHits: number;
  private readonly admissionWindowMs: number;
  private readonly admissionTrackingLimit: number;

  constructor(
    private readonly s3Cache: S3PlaceableProcessingCacheRepository,
    private readonly memoryCache: MemoryPlaceableProcessingCacheRepository,
    config: AppConfigService
  ) {
    this.admissionHits = config.processingCacheL1AdmissionHits;
    this.admissionWindowMs = config.processingCacheL1AdmissionWindowSeconds * 1000;
    this.admissionTrackingLimit = Math.max(
      1000,
      config.processingCacheL1CatalogMaxEntries * 4
    );
  }

  async get<TValue = unknown>(key: string): Promise<ProcessingCacheEntry<TValue> | null> {
    const memoryEntry = await this.memoryCache.get<TValue>(key);
    if (memoryEntry) {
      this.admission.delete(key);
      return memoryEntry;
    }

    const s3Entry = await this.s3Cache.get<TValue>(key);
    if (!s3Entry) {
      this.admission.delete(key);
      return null;
    }

    if (this.shouldPromoteToL1(key)) {
      await this.memoryCache.set<TValue>(key, s3Entry.value);
    }
    return s3Entry;
  }

  async set<TValue = unknown>(
    key: string,
    value: TValue
  ): Promise<ProcessingCacheEntry<TValue>> {
    const [stored] = await Promise.all([
      this.s3Cache.set<TValue>(key, value),
      this.memoryCache.set<TValue>(key, value)
    ]);
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
