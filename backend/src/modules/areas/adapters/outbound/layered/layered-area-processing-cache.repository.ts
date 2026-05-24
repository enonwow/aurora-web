import { Injectable } from "@nestjs/common";
import { AppConfigService } from "../../../../../common/config/app-config.service";
import type {
  AreaProcessingCacheEntry,
  AreaProcessingCachePort
} from "../../../application/ports/area-processing-cache.port";
import type { AreaProcessingResult } from "../../../domain/area.types";
import { S3AreaProcessingCacheRepository } from "../blob/s3-area-processing-cache.repository";
import { MemoryAreaProcessingCacheRepository } from "../memory/memory-area-processing-cache.repository";

interface AdmissionEntry {
  hits: number;
  expiresAtMs: number;
}

@Injectable()
export class LayeredAreaProcessingCacheRepository implements AreaProcessingCachePort {
  private readonly admission = new Map<string, AdmissionEntry>();
  private readonly admissionHits: number;
  private readonly admissionWindowMs: number;
  private readonly admissionTrackingLimit: number;

  constructor(
    private readonly s3Cache: S3AreaProcessingCacheRepository,
    private readonly memoryCache: MemoryAreaProcessingCacheRepository,
    config: AppConfigService
  ) {
    this.admissionHits = config.processingCacheL1AdmissionHits;
    this.admissionWindowMs = config.processingCacheL1AdmissionWindowSeconds * 1000;
    this.admissionTrackingLimit = Math.max(
      1000,
      config.processingCacheL1AreaMaxEntries * 4
    );
  }

  async get(key: string): Promise<AreaProcessingCacheEntry | null> {
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

  async set(key: string, value: AreaProcessingResult): Promise<AreaProcessingCacheEntry> {
    const [stored] = await Promise.all([
      this.s3Cache.set(key, value),
      this.memoryCache.set(key, value)
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
