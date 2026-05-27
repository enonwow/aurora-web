import { Injectable } from "@nestjs/common";
import { LayeredProcessingCacheStore } from "../../../../../common/processing-cache/layered-processing-cache.store";
import { AppConfigService } from "../../../../../common/config/app-config.service";
import type {
  PlaceableProcessingCachePort,
  ProcessingCacheEntry
} from "../../../application/ports/placeable-processing-cache.port";
import { S3PlaceableProcessingCacheRepository } from "../blob/s3-placeable-processing-cache.repository";
import { MemoryPlaceableProcessingCacheRepository } from "../memory/memory-placeable-processing-cache.repository";

@Injectable()
export class LayeredPlaceableProcessingCacheRepository
  implements PlaceableProcessingCachePort
{
  private readonly store: LayeredProcessingCacheStore<
    unknown,
    ProcessingCacheEntry<unknown>
  >;

  constructor(
    private readonly s3Cache: S3PlaceableProcessingCacheRepository,
    private readonly memoryCache: MemoryPlaceableProcessingCacheRepository,
    config: AppConfigService
  ) {
    this.store = new LayeredProcessingCacheStore<unknown, ProcessingCacheEntry<unknown>>(
      this.s3Cache,
      this.memoryCache,
      {
        admissionHits: config.processingCacheL1AdmissionHits,
        admissionWindowMs: config.processingCacheL1AdmissionWindowSeconds * 1000,
        admissionTrackingLimit: Math.max(1000, config.processingCacheL1CatalogMaxEntries * 4)
      }
    );
  }

  async get<TValue = unknown>(key: string): Promise<ProcessingCacheEntry<TValue> | null> {
    const entry = await this.store.get(key);
    return entry as ProcessingCacheEntry<TValue> | null;
  }

  async set<TValue = unknown>(
    key: string,
    value: TValue
  ): Promise<ProcessingCacheEntry<TValue>> {
    const stored = await this.store.set(key, value);
    return stored as ProcessingCacheEntry<TValue>;
  }
}

