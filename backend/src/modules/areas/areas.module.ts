import { Module } from "@nestjs/common";
import { AppConfigService } from "../../common/config/app-config.service";
import { CatalogModule } from "../catalog/catalog.module";
import { RuntimeSettingsModule } from "../runtime-settings/runtime-settings.module";
import { AreasController } from "./adapters/inbound/http/areas.controller";
import { AreaEditingController } from "./adapters/inbound/http/area-editing.controller";
import { ModuleSnapshotAreaRepository } from "./adapters/outbound/blob/module-snapshot-area.repository";
import { S3AreaProcessingCacheRepository } from "./adapters/outbound/blob/s3-area-processing-cache.repository";
import { LayeredAreaProcessingCacheRepository } from "./adapters/outbound/layered/layered-area-processing-cache.repository";
import { MemoryAreaProcessingCacheRepository } from "./adapters/outbound/memory/memory-area-processing-cache.repository";
import { StaticAreaRepository } from "./adapters/outbound/memory/static-area.repository";
import { AreasApplicationService } from "./application/areas.application.service";
import { AreaEditingApplicationService } from "./application/area-editing.application.service";
import { AREA_PROCESSING_CACHE } from "./application/ports/area-processing-cache.port";
import { AREA_REPOSITORY } from "./application/ports/area-repository.port";

@Module({
  imports: [RuntimeSettingsModule, CatalogModule],
  controllers: [AreasController, AreaEditingController],
  providers: [
    AreasApplicationService,
    AreaEditingApplicationService,
    StaticAreaRepository,
    ModuleSnapshotAreaRepository,
    MemoryAreaProcessingCacheRepository,
    S3AreaProcessingCacheRepository,
    LayeredAreaProcessingCacheRepository,
    {
      provide: AREA_REPOSITORY,
      inject: [AppConfigService, ModuleSnapshotAreaRepository, StaticAreaRepository],
      useFactory: (
        config: AppConfigService,
        moduleSnapshotRepository: ModuleSnapshotAreaRepository,
        staticRepository: StaticAreaRepository
      ) => (config.isTest ? staticRepository : moduleSnapshotRepository)
    },
    {
      provide: AREA_PROCESSING_CACHE,
      inject: [
        AppConfigService,
        LayeredAreaProcessingCacheRepository,
        MemoryAreaProcessingCacheRepository
      ],
      useFactory: (
        config: AppConfigService,
        layeredCache: LayeredAreaProcessingCacheRepository,
        memoryCache: MemoryAreaProcessingCacheRepository
      ) => (config.useMemoryInfrastructure ? memoryCache : layeredCache)
    }
  ],
  exports: [AREA_REPOSITORY, AreasApplicationService]
})
export class AreasModule {}
