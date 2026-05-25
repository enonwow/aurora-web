import { Module } from "@nestjs/common";
import { AppConfigService } from "../../common/config/app-config.service";
import { RuntimeSettingsModule } from "../runtime-settings/runtime-settings.module";
import { SoundsController } from "./adapters/inbound/http/sounds.controller";
import { ModuleSnapshotSoundRepository } from "./adapters/outbound/blob/module-snapshot-sound.repository";
import { S3SoundProcessingCacheRepository } from "./adapters/outbound/blob/s3-sound-processing-cache.repository";
import { LayeredSoundProcessingCacheRepository } from "./adapters/outbound/layered/layered-sound-processing-cache.repository";
import { MemorySoundProcessingCacheRepository } from "./adapters/outbound/memory/memory-sound-processing-cache.repository";
import { StaticSoundRepository } from "./adapters/outbound/memory/static-sound.repository";
import { SoundsApplicationService } from "./application/sounds.application.service";
import { SOUND_PROCESSING_CACHE } from "./application/ports/sound-processing-cache.port";
import { SOUND_REPOSITORY } from "./application/ports/sound-repository.port";

@Module({
  imports: [RuntimeSettingsModule],
  controllers: [SoundsController],
  providers: [
    SoundsApplicationService,
    StaticSoundRepository,
    ModuleSnapshotSoundRepository,
    MemorySoundProcessingCacheRepository,
    S3SoundProcessingCacheRepository,
    LayeredSoundProcessingCacheRepository,
    {
      provide: SOUND_REPOSITORY,
      inject: [AppConfigService, ModuleSnapshotSoundRepository, StaticSoundRepository],
      useFactory: (
        config: AppConfigService,
        moduleSnapshotRepository: ModuleSnapshotSoundRepository,
        staticRepository: StaticSoundRepository
      ) => (config.isTest ? staticRepository : moduleSnapshotRepository)
    },
    {
      provide: SOUND_PROCESSING_CACHE,
      inject: [
        AppConfigService,
        LayeredSoundProcessingCacheRepository,
        MemorySoundProcessingCacheRepository
      ],
      useFactory: (
        config: AppConfigService,
        layeredCache: LayeredSoundProcessingCacheRepository,
        memoryCache: MemorySoundProcessingCacheRepository
      ) => (config.isTest ? memoryCache : layeredCache)
    }
  ],
  exports: [SOUND_REPOSITORY, SoundsApplicationService]
})
export class SoundsModule {}
