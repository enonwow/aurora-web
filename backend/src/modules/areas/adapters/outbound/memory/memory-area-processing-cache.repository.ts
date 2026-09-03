import { Injectable, Optional } from "@nestjs/common";
import { AppConfigService } from "../../../../../common/config/app-config.service";
import { MemoryProcessingCacheStore } from "../../../../../common/processing-cache/memory-processing-cache.store";
import type {
  AreaProcessingCacheEntry,
  AreaProcessingCachePort
} from "../../../application/ports/area-processing-cache.port";
import type { AreaProcessingResult } from "../../../domain/area.types";
import { SystemMaintenanceApplicationService } from "../../../../system-maintenance/application/system-maintenance.application.service";

@Injectable()
export class MemoryAreaProcessingCacheRepository implements AreaProcessingCachePort {
  private readonly store: MemoryProcessingCacheStore<AreaProcessingResult>;

  constructor(
    config: AppConfigService,
    @Optional()
    private readonly maintenance?: SystemMaintenanceApplicationService
  ) {
    this.store = new MemoryProcessingCacheStore<AreaProcessingResult>(
      config.processingCacheL1AreaMaxEntries,
      config.processingCacheL1AreaMaxEntryBytes,
      config.processingCacheL1TtlSeconds * 1000
    );
  }

  async get(key: string): Promise<AreaProcessingCacheEntry | null> {
    const entry = await this.store.get(this.internalKey(key));
    return entry ? ({ ...entry, key } as AreaProcessingCacheEntry) : null;
  }

  async set(key: string, value: AreaProcessingResult): Promise<AreaProcessingCacheEntry> {
    const entry = await this.store.set(this.internalKey(key), value);
    return { ...entry, key } as AreaProcessingCacheEntry;
  }

  private internalKey(key: string): string {
    return `${this.maintenance?.getCurrentCacheNamespace() ?? "legacy"}:${key}`;
  }
}

