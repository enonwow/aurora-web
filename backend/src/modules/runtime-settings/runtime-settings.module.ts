import { Module } from "@nestjs/common";
import { RuntimeSettingsController } from "./adapters/inbound/http/runtime-settings.controller";
import { S3ModuleBlobStorageService } from "./adapters/outbound/blob/s3-module-blob-storage.service";
import { FileRuntimeSettingsRepository } from "./adapters/outbound/file/file-runtime-settings.repository";
import { NwnErfPackedModuleExtractorService } from "./adapters/outbound/nwn/nwn-erf-packed-module-extractor.service";
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
    S3ModuleBlobStorageService,
    {
      provide: RUNTIME_SETTINGS_REPOSITORY,
      useExisting: FileRuntimeSettingsRepository
    },
    {
      provide: PACKED_MODULE_EXTRACTOR,
      useExisting: NwnErfPackedModuleExtractorService
    },
    {
      provide: MODULE_BLOB_STORAGE,
      useExisting: S3ModuleBlobStorageService
    }
  ],
  exports: [RUNTIME_SETTINGS_REPOSITORY, MODULE_BLOB_STORAGE]
})
export class RuntimeSettingsModule {}
