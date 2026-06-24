import type { BlobStorageSettings } from "../../domain/runtime-settings.types";
import type { PackedModuleFile } from "./packed-module-extractor.port";

export const MODULE_BLOB_STORAGE = Symbol("MODULE_BLOB_STORAGE");

export type ModuleBlobSyncSource = "module" | "hak" | "vanilla" | "index";

export interface ModuleBlobSourceDeltaMetrics {
  uploadedFiles: number;
  uploadedBytes: number;
  deletedFiles: number;
  deletedBytes: number;
  unchangedFiles: number;
  unchangedBytes: number;
}

export type ModuleBlobSourceDeltaSummary = Record<
  ModuleBlobSyncSource,
  ModuleBlobSourceDeltaMetrics
>;

export interface ModuleBlobSyncResult {
  bucket: string;
  prefix: string;
  moduleHash: string;
  previousModuleHash?: string;
  status: "noop" | "updated";
  uploadedFiles: number;
  uploadedBytes: number;
  deletedFiles: number;
  deletedBytes: number;
  unchangedFiles: number;
  totalFiles: number;
  sourceDelta?: ModuleBlobSourceDeltaSummary;
}

export interface ModuleBlobObjectSummary {
  key: string;
  size: number;
  lastModified?: string;
  etag?: string;
}

export interface ModuleBlobSnapshotSummary {
  bucket: string;
  prefix: string;
  moduleHash?: string;
  totalFiles: number;
  totalBytes: number;
  objects: ModuleBlobObjectSummary[];
  truncated: boolean;
  continuationToken?: string;
}

export interface ModuleBlobObjectPayload {
  key: string;
  size: number;
  contentType: string;
  etag?: string;
  lastModified?: string;
  bytes: Buffer;
}

export interface ModuleBlobStoragePort {
  replaceModuleSnapshot(
    settings: BlobStorageSettings,
    files: PackedModuleFile[],
    options?: {
      forceFull?: boolean;
    }
  ): Promise<ModuleBlobSyncResult>;

  listModuleSnapshot(
    settings: BlobStorageSettings,
    options?: {
      limit?: number;
      continuationToken?: string;
    }
  ): Promise<ModuleBlobSnapshotSummary>;

  getModuleObject(
    settings: BlobStorageSettings,
    key: string
  ): Promise<ModuleBlobObjectPayload | null>;

  putModuleObject?(
    settings: BlobStorageSettings,
    file: PackedModuleFile
  ): Promise<ModuleBlobObjectSummary>;
}
