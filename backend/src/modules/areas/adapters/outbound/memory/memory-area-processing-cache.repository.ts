import { Injectable } from "@nestjs/common";
import { AppConfigService } from "../../../../../common/config/app-config.service";
import { MemoryProcessingCacheStore } from "../../../../../common/processing-cache/memory-processing-cache.store";
import type {
  AreaProcessingCacheEntry,
  AreaProcessingCachePort
} from "../../../application/ports/area-processing-cache.port";
import type { AreaProcessingResult } from "../../../domain/area.types";

@Injectable()
export class MemoryAreaProcessingCacheRepository implements AreaProcessingCachePort {
  private readonly store: MemoryProcessingCacheStore<AreaProcessingResult>;

  constructor(config: AppConfigService) {
    this.store = new MemoryProcessingCacheStore<AreaProcessingResult>(
      config.processingCacheL1AreaMaxEntries,
      config.processingCacheL1AreaMaxEntryBytes,
      config.processingCacheL1TtlSeconds * 1000
    );
  }

  async get(key: string): Promise<AreaProcessingCacheEntry | null> {
    const entry = await this.store.get(key);
    return entry as AreaProcessingCacheEntry | null;
  }

  async set(key: string, value: AreaProcessingResult): Promise<AreaProcessingCacheEntry> {
    const entry = await this.store.set(key, value);
    return entry as AreaProcessingCacheEntry;
  }
}

