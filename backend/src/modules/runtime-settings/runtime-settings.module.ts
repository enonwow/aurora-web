import { Module } from "@nestjs/common";
import { RuntimeSettingsController } from "./adapters/inbound/http/runtime-settings.controller";
import { S3ModuleBlobStorageService } from "./adapters/outbound/blob/s3-module-blob-storage.service";
import { CliDerivedAssetGeneratorService } from "./adapters/outbound/derived/cli-derived-asset-generator.service";
import { NoopDerivedAssetGeneratorService } from "./adapters/outbound/derived/noop-derived-asset-generator.service";
import { FileRuntimeSettingsRepository } from "./adapters/outbound/file/file-runtime-settings.repository";
import { LocalModuleBlobStorageService } from "./adapters/outbound/file/local-module-blob-storage.service";
import { NwnErfPackedModuleExtractorService } from "./adapters/outbound/nwn/nwn-erf-packed-module-extractor.service";
import { AppConfigService } from "../../common/config/app-config.service";
import {
  DERIVED_ASSET_GENERATOR
} from "./application/ports/derived-asset-generator.port";
import {
  MODULE_BLOB_STORAGE
} from "./application/ports/module-blob-storage.port";
import {
  PACKED_MODULE_EXTRACTOR
} from "./application/ports/packed-module-extractor.port";
import { RuntimeSettingsApplicationService } from "./application/runtime-settings.application.service";
import { RuntimeSettingsBootstrapService } from "./application/runtime-settings-bootstrap.service";
import {
  RUNTIME_SETTINGS_REPOSITORY
} from "./application/ports/runtime-settings-repository.port";

@Module({
  controllers: [RuntimeSettingsController],
  providers: [
    RuntimeSettingsApplicationService,
    RuntimeSettingsBootstrapService,
    FileRuntimeSettingsRepository,
    NwnErfPackedModuleExtractorService,
    CliDerivedAssetGeneratorService,
    NoopDerivedAssetGeneratorService,
    S3ModuleBlobStorageService,
    LocalModuleBlobStorageService,
    {
      provide: RUNTIME_SETTINGS_REPOSITORY,
      useExisting: FileRuntimeSettingsRepository
    },
    {
      provide: PACKED_MODULE_EXTRACTOR,
      useExisting: NwnErfPackedModuleExtractorService
    },
    {
      provide: DERIVED_ASSET_GENERATOR,
      useExisting: CliDerivedAssetGeneratorService
    },
    {
      provide: MODULE_BLOB_STORAGE,
      inject: [AppConfigService, S3ModuleBlobStorageService, LocalModuleBlobStorageService],
      useFactory: (
        config: AppConfigService,
        s3Storage: S3ModuleBlobStorageService,
        localStorage: LocalModuleBlobStorageService
      ) => (config.hostLocalRuntime ? localStorage : s3Storage)
    }
  ],
  exports: [
    RUNTIME_SETTINGS_REPOSITORY,
    MODULE_BLOB_STORAGE,
    DERIVED_ASSET_GENERATOR,
    RuntimeSettingsApplicationService
  ]
})
export class RuntimeSettingsModule {}
