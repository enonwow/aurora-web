import { Module } from "@nestjs/common";
import { AppConfigService } from "../../common/config/app-config.service";
import { RuntimeSettingsModule } from "../runtime-settings/runtime-settings.module";
import { TilesController } from "./adapters/inbound/http/tiles.controller";
import { ModuleSnapshotTileRepository } from "./adapters/outbound/blob/module-snapshot-tile.repository";
import { S3TileProcessingCacheRepository } from "./adapters/outbound/blob/s3-tile-processing-cache.repository";
import { LayeredTileProcessingCacheRepository } from "./adapters/outbound/layered/layered-tile-processing-cache.repository";
import { MemoryTileProcessingCacheRepository } from "./adapters/outbound/memory/memory-tile-processing-cache.repository";
import { StaticTileRepository } from "./adapters/outbound/memory/static-tile.repository";
import { TilesApplicationService } from "./application/tiles.application.service";
import { TILE_PROCESSING_CACHE } from "./application/ports/tile-processing-cache.port";
import { TILE_REPOSITORY } from "./application/ports/tile-repository.port";

@Module({
  imports: [RuntimeSettingsModule],
  controllers: [TilesController],
  providers: [
    TilesApplicationService,
    StaticTileRepository,
    ModuleSnapshotTileRepository,
    MemoryTileProcessingCacheRepository,
    S3TileProcessingCacheRepository,
    LayeredTileProcessingCacheRepository,
    {
      provide: TILE_REPOSITORY,
      inject: [AppConfigService, ModuleSnapshotTileRepository, StaticTileRepository],
      useFactory: (
        config: AppConfigService,
        moduleSnapshotRepository: ModuleSnapshotTileRepository,
        staticRepository: StaticTileRepository
      ) => (config.isTest ? staticRepository : moduleSnapshotRepository)
    },
    {
      provide: TILE_PROCESSING_CACHE,
      inject: [
        AppConfigService,
        LayeredTileProcessingCacheRepository,
        MemoryTileProcessingCacheRepository
      ],
      useFactory: (
        config: AppConfigService,
        layeredCache: LayeredTileProcessingCacheRepository,
        memoryCache: MemoryTileProcessingCacheRepository
      ) => (config.useMemoryInfrastructure ? memoryCache : layeredCache)
    }
  ],
  exports: [TILE_REPOSITORY, TilesApplicationService]
})
export class TilesModule {}
