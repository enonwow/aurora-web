import type { BlobStorageSettings } from "../../domain/runtime-settings.types";
import type { PackedModuleFile } from "./packed-module-extractor.port";

export const MODULE_BLOB_STORAGE = Symbol("MODULE_BLOB_STORAGE");

export interface ModuleBlobSyncResult {
  bucket: string;
  prefix: string;
  uploadedFiles: number;
  uploadedBytes: number;
}

export interface ModuleBlobStoragePort {
  replaceModuleSnapshot(
    settings: BlobStorageSettings,
    files: PackedModuleFile[]
  ): Promise<ModuleBlobSyncResult>;
}
