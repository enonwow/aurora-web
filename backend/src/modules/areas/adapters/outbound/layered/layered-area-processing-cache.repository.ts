import { Injectable } from "@nestjs/common";
import { LayeredProcessingCacheStore } from "../../../../../common/processing-cache/layered-processing-cache.store";
import { AppConfigService } from "../../../../../common/config/app-config.service";
import type {
  AreaProcessingCacheEntry,
  AreaProcessingCachePort
} from "../../../application/ports/area-processing-cache.port";
import type { AreaProcessingResult } from "../../../domain/area.types";
import { S3AreaProcessingCacheRepository } from "../blob/s3-area-processing-cache.repository";
import { MemoryAreaProcessingCacheRepository } from "../memory/memory-area-processing-cache.repository";

@Injectable()
export class LayeredAreaProcessingCacheRepository implements AreaProcessingCachePort {
  private readonly store: LayeredProcessingCacheStore<
    AreaProcessingResult,
    AreaProcessingCacheEntry
  >;

  constructor(
    private readonly s3Cache: S3AreaProcessingCacheRepository,
    private readonly memoryCache: MemoryAreaProcessingCacheRepository,
    config: AppConfigService
  ) {
    this.store = new LayeredProcessingCacheStore<AreaProcessingResult, AreaProcessingCacheEntry>(
      this.s3Cache,
      this.memoryCache,
      {
        admissionHits: config.processingCacheL1AdmissionHits,
        admissionWindowMs: config.processingCacheL1AdmissionWindowSeconds * 1000,
        admissionTrackingLimit: Math.max(1000, config.processingCacheL1AreaMaxEntries * 4)
      }
    );
  }

  async get(key: string): Promise<AreaProcessingCacheEntry | null> {
    return this.store.get(key);
  }

  async set(key: string, value: AreaProcessingResult): Promise<AreaProcessingCacheEntry> {
    return this.store.set(key, value);
  }
}

