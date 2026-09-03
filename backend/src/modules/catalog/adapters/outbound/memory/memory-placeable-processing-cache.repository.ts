import { Injectable, Optional } from "@nestjs/common";
import { AppConfigService } from "../../../../../common/config/app-config.service";
import { MemoryProcessingCacheStore } from "../../../../../common/processing-cache/memory-processing-cache.store";
import type {
  PlaceableProcessingCachePort,
  ProcessingCacheEntry
} from "../../../application/ports/placeable-processing-cache.port";
import { SystemMaintenanceApplicationService } from "../../../../system-maintenance/application/system-maintenance.application.service";

const MEMORY_INFRASTRUCTURE_MAX_ENTRY_BYTES = 32 * 1024 * 1024;

@Injectable()
export class MemoryPlaceableProcessingCacheRepository
  implements PlaceableProcessingCachePort
{
  private readonly store: MemoryProcessingCacheStore<unknown>;

  constructor(
    config: AppConfigService,
    @Optional()
    private readonly maintenance?: SystemMaintenanceApplicationService
  ) {
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
    const entry = await this.store.get(this.internalKey(key));
    return entry ? ({ ...entry, key } as ProcessingCacheEntry<TValue>) : null;
  }

  async set<TValue = unknown>(
    key: string,
    value: TValue
  ): Promise<ProcessingCacheEntry<TValue>> {
    const entry = await this.store.set(this.internalKey(key), value);
    return { ...entry, key } as ProcessingCacheEntry<TValue>;
  }

  private internalKey(key: string): string {
    return `${this.maintenance?.getCurrentCacheNamespace() ?? "legacy"}:${key}`;
  }
}

