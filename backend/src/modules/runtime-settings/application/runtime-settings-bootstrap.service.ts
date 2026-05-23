import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap
} from "@nestjs/common";
import {
  MODULE_BLOB_STORAGE,
  type ModuleBlobStoragePort
} from "./ports/module-blob-storage.port";
import {
  PACKED_MODULE_EXTRACTOR,
  type PackedModuleExtractorPort
} from "./ports/packed-module-extractor.port";
import {
  RUNTIME_SETTINGS_REPOSITORY,
  type RuntimeSettingsRepositoryPort
} from "./ports/runtime-settings-repository.port";
import type {
  BlobStorageSettings,
  RuntimePathSettings
} from "../domain/runtime-settings.types";

@Injectable()
export class RuntimeSettingsBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RuntimeSettingsBootstrapService.name);

  constructor(
    @Inject(RUNTIME_SETTINGS_REPOSITORY)
    private readonly repository: RuntimeSettingsRepositoryPort,
    @Inject(PACKED_MODULE_EXTRACTOR)
    private readonly packedModuleExtractor: PackedModuleExtractorPort,
    @Inject(MODULE_BLOB_STORAGE)
    private readonly moduleBlobStorage: ModuleBlobStoragePort
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const settings = await this.repository.get();
    this.assertModuleSourceConfigured(settings.paths);

    const moduleDecompiledPath = settings.paths.moduleDecompiledPath.trim();
    const modulePackedPath = settings.paths.modulePackedPath.trim();

    if (moduleDecompiledPath) {
      if (modulePackedPath) {
        this.logger.log(
          "Both module paths are configured. moduleDecompiledPath has higher priority, skipping packed module blob sync."
        );
      } else {
        this.logger.log(
          "Using moduleDecompiledPath as primary module source. Packed module blob sync is not required."
        );
      }
      return;
    }

    if (!modulePackedPath) {
      throw new Error(
        "Runtime settings invalid: modulePackedPath is missing while moduleDecompiledPath is empty."
      );
    }

    this.assertBlobStorageConfigured(settings.blobStorage);
    this.logger.log(`Packed module detected (${modulePackedPath}). Starting blob sync.`);
    const files = await this.packedModuleExtractor.extractFromPackedModule(
      modulePackedPath
    );
    const syncResult = await this.moduleBlobStorage.replaceModuleSnapshot(
      settings.blobStorage,
      files
    );
    this.logger.log(
      `Module blob sync completed: ${syncResult.uploadedFiles} files, ${syncResult.uploadedBytes} bytes to ${syncResult.bucket}/${syncResult.prefix}`
    );
  }

  private assertModuleSourceConfigured(paths: RuntimePathSettings): void {
    const hasDecompiledPath = paths.moduleDecompiledPath.trim().length > 0;
    const hasPackedPath = paths.modulePackedPath.trim().length > 0;

    if (!hasDecompiledPath && !hasPackedPath) {
      throw new Error(
        "Runtime settings invalid: either paths.moduleDecompiledPath or paths.modulePackedPath must be configured."
      );
    }
  }

  private assertBlobStorageConfigured(settings: BlobStorageSettings): void {
    const missing: string[] = [];
    if (!settings.endpoint.trim()) {
      missing.push("blobStorage.endpoint");
    }
    if (!settings.region.trim()) {
      missing.push("blobStorage.region");
    }
    if (!settings.bucket.trim()) {
      missing.push("blobStorage.bucket");
    }
    if (!settings.modulePrefix.trim()) {
      missing.push("blobStorage.modulePrefix");
    }
    if (!settings.accessKeyId.trim()) {
      missing.push("blobStorage.accessKeyId");
    }
    if (!settings.secretAccessKey.trim()) {
      missing.push("blobStorage.secretAccessKey");
    }

    if (missing.length > 0) {
      throw new Error(
        `Runtime settings invalid for packed module sync. Missing: ${missing.join(", ")}`
      );
    }
  }
}
