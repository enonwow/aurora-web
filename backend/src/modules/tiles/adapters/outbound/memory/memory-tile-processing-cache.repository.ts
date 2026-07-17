import { Injectable } from "@nestjs/common";
import { AppConfigService } from "../../../../../common/config/app-config.service";
import { MemoryProcessingCacheStore } from "../../../../../common/processing-cache/memory-processing-cache.store";
import type {
  TileProcessingCacheEntry,
  TileProcessingCachePort
} from "../../../application/ports/tile-processing-cache.port";
import type { TileProcessingResult } from "../../../domain/tile.types";

@Injectable()
export class MemoryTileProcessingCacheRepository implements TileProcessingCachePort {
  private readonly store: MemoryProcessingCacheStore<TileProcessingResult>;

  constructor(config: AppConfigService) {
    this.store = new MemoryProcessingCacheStore<TileProcessingResult>(
      config.processingCacheL1AreaMaxEntries,
      config.processingCacheL1AreaMaxEntryBytes,
      config.processingCacheL1TtlSeconds * 1000
    );
  }

  async get(key: string): Promise<TileProcessingCacheEntry | null> {
    const entry = await this.store.get(key);
    return entry as TileProcessingCacheEntry | null;
  }

  async set(key: string, value: TileProcessingResult): Promise<TileProcessingCacheEntry> {
    const entry = await this.store.set(key, value);
    return entry as TileProcessingCacheEntry;
  }
}

