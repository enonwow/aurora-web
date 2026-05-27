import { Injectable } from "@nestjs/common";
import { LayeredProcessingCacheStore } from "../../../../../common/processing-cache/layered-processing-cache.store";
import { AppConfigService } from "../../../../../common/config/app-config.service";
import type {
  SoundProcessingCacheEntry,
  SoundProcessingCachePort
} from "../../../application/ports/sound-processing-cache.port";
import type { SoundProcessingResult } from "../../../domain/sound.types";
import { S3SoundProcessingCacheRepository } from "../blob/s3-sound-processing-cache.repository";
import { MemorySoundProcessingCacheRepository } from "../memory/memory-sound-processing-cache.repository";

@Injectable()
export class LayeredSoundProcessingCacheRepository implements SoundProcessingCachePort {
  private readonly store: LayeredProcessingCacheStore<
    SoundProcessingResult,
    SoundProcessingCacheEntry
  >;

  constructor(
    private readonly s3Cache: S3SoundProcessingCacheRepository,
    private readonly memoryCache: MemorySoundProcessingCacheRepository,
    config: AppConfigService
  ) {
    this.store = new LayeredProcessingCacheStore<SoundProcessingResult, SoundProcessingCacheEntry>(
      this.s3Cache,
      this.memoryCache,
      {
        admissionHits: config.processingCacheL1AdmissionHits,
        admissionWindowMs: config.processingCacheL1AdmissionWindowSeconds * 1000,
        admissionTrackingLimit: Math.max(1000, config.processingCacheL1CatalogMaxEntries * 4)
      }
    );
  }

  async get(key: string): Promise<SoundProcessingCacheEntry | null> {
    return this.store.get(key);
  }

  async set(key: string, value: SoundProcessingResult): Promise<SoundProcessingCacheEntry> {
    return this.store.set(key, value);
  }
}

