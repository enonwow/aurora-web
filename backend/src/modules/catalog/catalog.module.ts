import { Module } from "@nestjs/common";
import { AppConfigService } from "../../common/config/app-config.service";
import { RuntimeSettingsModule } from "../runtime-settings/runtime-settings.module";
import { CatalogApplicationService } from "./application/catalog.application.service";
import {
  PLACEABLE_PROCESSING_CACHE
} from "./application/ports/placeable-processing-cache.port";
import {
  TEMPLATE_CATALOG_REPOSITORY
} from "./application/ports/template-catalog-repository.port";
import { CreaturesController } from "./adapters/inbound/http/creatures.controller";
import { ItemsController } from "./adapters/inbound/http/items.controller";
import { PlaceablesController } from "./adapters/inbound/http/placeables.controller";
import { ModuleSnapshotTemplateCatalogRepository } from "./adapters/outbound/blob/module-snapshot-template-catalog.repository";
import { S3PlaceableProcessingCacheRepository } from "./adapters/outbound/blob/s3-placeable-processing-cache.repository";
import { LayeredPlaceableProcessingCacheRepository } from "./adapters/outbound/layered/layered-placeable-processing-cache.repository";
import { MemoryPlaceableProcessingCacheRepository } from "./adapters/outbound/memory/memory-placeable-processing-cache.repository";
import { StaticTemplateCatalogRepository } from "./adapters/outbound/memory/static-template-catalog.repository";

@Module({
  imports: [RuntimeSettingsModule],
  controllers: [PlaceablesController, CreaturesController, ItemsController],
  providers: [
    CatalogApplicationService,
    StaticTemplateCatalogRepository,
    ModuleSnapshotTemplateCatalogRepository,
    MemoryPlaceableProcessingCacheRepository,
    S3PlaceableProcessingCacheRepository,
    LayeredPlaceableProcessingCacheRepository,
    {
      provide: TEMPLATE_CATALOG_REPOSITORY,
      inject: [
        AppConfigService,
        ModuleSnapshotTemplateCatalogRepository,
        StaticTemplateCatalogRepository
      ],
      useFactory: (
        config: AppConfigService,
        moduleSnapshotRepository: ModuleSnapshotTemplateCatalogRepository,
        staticRepository: StaticTemplateCatalogRepository
      ) => (config.isTest ? staticRepository : moduleSnapshotRepository)
    },
    {
      provide: PLACEABLE_PROCESSING_CACHE,
      inject: [
        AppConfigService,
        LayeredPlaceableProcessingCacheRepository,
        MemoryPlaceableProcessingCacheRepository
      ],
      useFactory: (
        config: AppConfigService,
        layeredCache: LayeredPlaceableProcessingCacheRepository,
        memoryCache: MemoryPlaceableProcessingCacheRepository
      ) => (config.isTest ? memoryCache : layeredCache)
    }
  ],
  exports: [TEMPLATE_CATALOG_REPOSITORY, CatalogApplicationService]
})
export class CatalogModule {}
