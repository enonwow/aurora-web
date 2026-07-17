import { Injectable } from "@nestjs/common";
import { AppConfigService } from "../../../../../common/config/app-config.service";
import { MemoryProcessingCacheStore } from "../../../../../common/processing-cache/memory-processing-cache.store";
import type {
  PlaceableProcessingCachePort,
  ProcessingCacheEntry
} from "../../../application/ports/placeable-processing-cache.port";

const MEMORY_INFRASTRUCTURE_MAX_ENTRY_BYTES = 32 * 1024 * 1024;

@Injectable()
export class MemoryPlaceableProcessingCacheRepository
  implements PlaceableProcessingCachePort
{
  private readonly store: MemoryProcessingCacheStore<unknown>;

  constructor(config: AppConfigService) {
    const maxEntryBytes = config.useMemoryInfrastructure
      ? Math.max(
          config.processingCacheL1CatalogMaxEntryBytes,
          MEMORY_INFRASTRUCTURE_MAX_ENTRY_BYTES
        )
      : config.processingCacheL1CatalogMaxEntryBytes;
    this.store = new MemoryProcessingCacheStore<unknown>(
      config.processingCacheL1CatalogMaxEntries,
      maxEntryBytes,
      config.processingCacheL1TtlSeconds * 1000
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
    const entry = await this.store.set(key, value);
    return entry as ProcessingCacheEntry<TValue>;
  }
}

