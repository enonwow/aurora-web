import { Module } from "@nestjs/common";
import { AppConfigService } from "../../common/config/app-config.service";
import { RuntimeSettingsModule } from "../runtime-settings/runtime-settings.module";
import { AreasController } from "./adapters/inbound/http/areas.controller";
import { S3AreaProcessingCacheRepository } from "./adapters/outbound/blob/s3-area-processing-cache.repository";
import { MemoryAreaProcessingCacheRepository } from "./adapters/outbound/memory/memory-area-processing-cache.repository";
import { StaticAreaRepository } from "./adapters/outbound/memory/static-area.repository";
import { AreasApplicationService } from "./application/areas.application.service";
import { AREA_PROCESSING_CACHE } from "./application/ports/area-processing-cache.port";
import { AREA_REPOSITORY } from "./application/ports/area-repository.port";

@Module({
  imports: [RuntimeSettingsModule],
  controllers: [AreasController],
  providers: [
    AreasApplicationService,
    StaticAreaRepository,
    MemoryAreaProcessingCacheRepository,
    S3AreaProcessingCacheRepository,
    {
      provide: AREA_REPOSITORY,
      useExisting: StaticAreaRepository
    },
    {
      provide: AREA_PROCESSING_CACHE,
      inject: [
        AppConfigService,
        S3AreaProcessingCacheRepository,
        MemoryAreaProcessingCacheRepository
      ],
      useFactory: (
        config: AppConfigService,
        s3Cache: S3AreaProcessingCacheRepository,
        memoryCache: MemoryAreaProcessingCacheRepository
      ) => (config.isTest ? memoryCache : s3Cache)
    }
  ],
  exports: [AREA_REPOSITORY, AreasApplicationService]
})
export class AreasModule {}
