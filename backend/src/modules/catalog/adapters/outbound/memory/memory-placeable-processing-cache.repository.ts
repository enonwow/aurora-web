import { Injectable } from "@nestjs/common";
import { AppConfigService } from "../../../../../common/config/app-config.service";
import { MemoryProcessingCacheStore } from "../../../../../common/processing-cache/memory-processing-cache.store";
import type {
  PlaceableProcessingCachePort,
  ProcessingCacheEntry
} from "../../../application/ports/placeable-processing-cache.port";

@Injectable()
export class MemoryPlaceableProcessingCacheRepository
  implements PlaceableProcessingCachePort
{
  private readonly store: MemoryProcessingCacheStore<unknown>;

  constructor(config: AppConfigService) {
    this.store = new MemoryProcessingCacheStore<unknown>(
      config.processingCacheL1CatalogMaxEntries,
      config.processingCacheL1CatalogMaxEntryBytes,
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

