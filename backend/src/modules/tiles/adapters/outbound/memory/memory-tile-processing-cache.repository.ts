import { Injectable, Optional } from "@nestjs/common";
import { AppConfigService } from "../../../../../common/config/app-config.service";
import { MemoryProcessingCacheStore } from "../../../../../common/processing-cache/memory-processing-cache.store";
import type {
  TileProcessingCacheEntry,
  TileProcessingCachePort
} from "../../../application/ports/tile-processing-cache.port";
import type { TileProcessingResult } from "../../../domain/tile.types";
import { SystemMaintenanceApplicationService } from "../../../../system-maintenance/application/system-maintenance.application.service";

@Injectable()
export class MemoryTileProcessingCacheRepository implements TileProcessingCachePort {
  private readonly store: MemoryProcessingCacheStore<TileProcessingResult>;

  constructor(
    config: AppConfigService,
    @Optional()
    private readonly maintenance?: SystemMaintenanceApplicationService
  ) {
    this.store = new MemoryProcessingCacheStore<TileProcessingResult>(
      config.processingCacheL1AreaMaxEntries,
      config.processingCacheL1AreaMaxEntryBytes,
      config.processingCacheL1TtlSeconds * 1000
    );
  }

  async get(key: string): Promise<TileProcessingCacheEntry | null> {
    const entry = await this.store.get(this.internalKey(key));
    return entry ? ({ ...entry, key } as TileProcessingCacheEntry) : null;
  }

  async set(key: string, value: TileProcessingResult): Promise<TileProcessingCacheEntry> {
    const entry = await this.store.set(this.internalKey(key), value);
    return { ...entry, key } as TileProcessingCacheEntry;
  }

  private internalKey(key: string): string {
    return `${this.maintenance?.getCurrentCacheNamespace() ?? "legacy"}:${key}`;
  }
}

