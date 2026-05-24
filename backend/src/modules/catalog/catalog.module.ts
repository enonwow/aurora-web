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
import { S3PlaceableProcessingCacheRepository } from "./adapters/outbound/blob/s3-placeable-processing-cache.repository";
import { MemoryPlaceableProcessingCacheRepository } from "./adapters/outbound/memory/memory-placeable-processing-cache.repository";
import { StaticTemplateCatalogRepository } from "./adapters/outbound/memory/static-template-catalog.repository";

@Module({
  imports: [RuntimeSettingsModule],
  controllers: [PlaceablesController, CreaturesController, ItemsController],
  providers: [
    CatalogApplicationService,
    StaticTemplateCatalogRepository,
    MemoryPlaceableProcessingCacheRepository,
    S3PlaceableProcessingCacheRepository,
    {
      provide: TEMPLATE_CATALOG_REPOSITORY,
      useExisting: StaticTemplateCatalogRepository
    },
    {
      provide: PLACEABLE_PROCESSING_CACHE,
      inject: [
        AppConfigService,
        S3PlaceableProcessingCacheRepository,
        MemoryPlaceableProcessingCacheRepository
      ],
      useFactory: (
        config: AppConfigService,
        s3Cache: S3PlaceableProcessingCacheRepository,
        memoryCache: MemoryPlaceableProcessingCacheRepository
      ) => (config.isTest ? memoryCache : s3Cache)
    }
  ],
  exports: [TEMPLATE_CATALOG_REPOSITORY, CatalogApplicationService]
})
export class CatalogModule {}
