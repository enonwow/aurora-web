import { Injectable } from "@nestjs/common";
import { AppConfigService } from "../../../../../common/config/app-config.service";
import { MemoryProcessingCacheStore } from "../../../../../common/processing-cache/memory-processing-cache.store";
import type {
  SoundProcessingCacheEntry,
  SoundProcessingCachePort
} from "../../../application/ports/sound-processing-cache.port";
import type { SoundProcessingResult } from "../../../domain/sound.types";

@Injectable()
export class MemorySoundProcessingCacheRepository implements SoundProcessingCachePort {
  private readonly store: MemoryProcessingCacheStore<SoundProcessingResult>;

  constructor(config: AppConfigService) {
    this.store = new MemoryProcessingCacheStore<SoundProcessingResult>(
      config.processingCacheL1CatalogMaxEntries,
      config.processingCacheL1CatalogMaxEntryBytes,
      config.processingCacheL1TtlSeconds * 1000
    );
  }

  async get(key: string): Promise<SoundProcessingCacheEntry | null> {
    const entry = await this.store.get(key);
    return entry as SoundProcessingCacheEntry | null;
  }

  async set(key: string, value: SoundProcessingResult): Promise<SoundProcessingCacheEntry> {
    const entry = await this.store.set(key, value);
    return entry as SoundProcessingCacheEntry;
  }
}

