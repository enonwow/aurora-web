import { Injectable } from "@nestjs/common";
import { LayeredProcessingCacheStore } from "../../../../../common/processing-cache/layered-processing-cache.store";
import { AppConfigService } from "../../../../../common/config/app-config.service";
import type {
  TileProcessingCacheEntry,
  TileProcessingCachePort
} from "../../../application/ports/tile-processing-cache.port";
import type { TileProcessingResult } from "../../../domain/tile.types";
import { S3TileProcessingCacheRepository } from "../blob/s3-tile-processing-cache.repository";
import { MemoryTileProcessingCacheRepository } from "../memory/memory-tile-processing-cache.repository";

@Injectable()
export class LayeredTileProcessingCacheRepository implements TileProcessingCachePort {
  private readonly store: LayeredProcessingCacheStore<
    TileProcessingResult,
    TileProcessingCacheEntry
  >;

  constructor(
    private readonly s3Cache: S3TileProcessingCacheRepository,
    private readonly memoryCache: MemoryTileProcessingCacheRepository,
    config: AppConfigService
  ) {
    this.store = new LayeredProcessingCacheStore<TileProcessingResult, TileProcessingCacheEntry>(
      this.s3Cache,
      this.memoryCache,
      {
        admissionHits: config.processingCacheL1AdmissionHits,
        admissionWindowMs: config.processingCacheL1AdmissionWindowSeconds * 1000,
        admissionTrackingLimit: Math.max(1000, config.processingCacheL1AreaMaxEntries * 4),
        awaitL2Write: false
      }
    );
  }

  async get(key: string): Promise<TileProcessingCacheEntry | null> {
    return this.store.get(key);
  }

  async set(key: string, value: TileProcessingResult): Promise<TileProcessingCacheEntry> {
    return this.store.set(key, value);
  }
}

