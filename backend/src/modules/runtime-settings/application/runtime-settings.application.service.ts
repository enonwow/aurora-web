import { Inject, Injectable } from "@nestjs/common";
import { readdir, readFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import type {
  RuntimeAssetKind,
  RuntimeSourceSettings,
  RuntimeSettingsPayload,
  RuntimeSettingsRecord
} from "../domain/runtime-settings.types";
import {
  MODULE_BLOB_STORAGE,
  type ModuleBlobSnapshotSummary,
  type ModuleBlobStoragePort,
  type ModuleBlobSyncResult
} from "./ports/module-blob-storage.port";
import {
  PACKED_MODULE_EXTRACTOR,
  type PackedModuleExtractorPort
} from "./ports/packed-module-extractor.port";
import {
  RUNTIME_SETTINGS_REPOSITORY,
  type RuntimeSettingsRepositoryPort
} from "./ports/runtime-settings-repository.port";
import type { PackedModuleFile } from "./ports/packed-module-extractor.port";

const RUNTIME_ASSET_KINDS = ["placeable", "tile", "area", "sound"] as const;

export interface ResolvedHakSourceSettings {
  mode: "disabled" | "inline" | "profile" | "none";
  includeHaks: boolean;
  hakProfileId: string | null;
  hakPriorityList: string[];
  hakPaths: string[];
}

export type ResolvedHakSettingsByAsset = Record<
  RuntimeAssetKind,
  ResolvedHakSourceSettings
>;

@Injectable()
export class RuntimeSettingsApplicationService {
  constructor(
    @Inject(RUNTIME_SETTINGS_REPOSITORY)
    private readonly repository: RuntimeSettingsRepositoryPort,
    @Inject(PACKED_MODULE_EXTRACTOR)
    private readonly packedModuleExtractor: PackedModuleExtractorPort,
    @Inject(MODULE_BLOB_STORAGE)
    private readonly moduleBlobStorage: ModuleBlobStoragePort
  ) {}

  async getRuntimeSettings(): Promise<RuntimeSettingsRecord> {
    return this.repository.get();
  }

  async getResolvedHakSettings(): Promise<ResolvedHakSettingsByAsset> {
    const settings = await this.repository.get();
    return resolveHakSettingsByAsset(settings);
  }

  async replaceRuntimeSettings(
    payload: RuntimeSettingsPayload,
    updatedBy: string
  ): Promise<RuntimeSettingsRecord> {
    const current = await this.repository.get();
    const next: RuntimeSettingsRecord = {
      ...payload,
      revision: current.revision + 1,
      updatedAt: new Date().toISOString(),
      updatedBy
    };
    await this.repository.save(next);
    return next;
  }

  async getModuleBlobCacheSummary(limit?: number): Promise<ModuleBlobSnapshotSummary> {
    const settings = await this.repository.get();
    return this.moduleBlobStorage.listModuleSnapshot(settings.blobStorage, { limit });
  }

  async syncModuleBlobCache(
    triggeredBy: string,
    options?: {
      forceFull?: boolean;
    }
  ): Promise<{
    mode: "incremental" | "full";
    source: {
      type: "decompiled" | "packed";
      path: string;
    };
    sync: ModuleBlobSyncResult;
    settingsRevision: number;
    triggeredBy: string;
    triggeredAt: string;
  }> {
    const settings = await this.repository.get();
    const source = await this.loadModuleSourceFiles(settings);
    const sync = await this.moduleBlobStorage.replaceModuleSnapshot(
      settings.blobStorage,
      source.files,
      {
        forceFull: options?.forceFull === true
      }
    );

    return {
      mode: options?.forceFull === true ? "full" : "incremental",
      source: {
        type: source.type,
        path: source.path
      },
      sync,
      settingsRevision: settings.revision,
      triggeredBy,
      triggeredAt: new Date().toISOString()
    };
  }

  async rebuildModuleBlobCache(
    triggeredBy: string,
    options?: {
      forceFull?: boolean;
    }
  ): Promise<{
    mode: "incremental" | "full";
    source: {
      type: "decompiled" | "packed";
      path: string;
    };
    sync: ModuleBlobSyncResult;
    settingsRevision: number;
    triggeredBy: string;
    triggeredAt: string;
  }> {
    return this.syncModuleBlobCache(triggeredBy, options);
  }

  private async loadModuleSourceFiles(
    settings: RuntimeSettingsRecord
  ): Promise<{
    type: "decompiled" | "packed";
    path: string;
    files: PackedModuleFile[];
  }> {
    const decompiledPath = settings.paths.moduleDecompiledPath.trim();
    if (decompiledPath.length > 0) {
      const resolvedPath = resolveModulePath(decompiledPath);
      const files = await readDecompiledModuleFiles(resolvedPath);
      return {
        type: "decompiled",
        path: resolvedPath,
        files
      };
    }

    const packedPath = settings.paths.modulePackedPath.trim();
    if (packedPath.length > 0) {
      const files = await this.packedModuleExtractor.extractFromPackedModule(packedPath);
      return {
        type: "packed",
        path: packedPath,
        files
      };
    }

    throw new Error(
      "Runtime settings invalid: either paths.moduleDecompiledPath or paths.modulePackedPath must be configured."
    );
  }
}

export function resolveHakSettingsByAsset(
  settings: RuntimeSettingsRecord
): ResolvedHakSettingsByAsset {
  const resolved = {} as ResolvedHakSettingsByAsset;
  for (const assetKind of RUNTIME_ASSET_KINDS) {
    resolved[assetKind] = resolveSingleSourceHakSettings(
      settings.paths.hakDirectoryPath,
      settings.hakProfiles,
      settings.sources[assetKind]
    );
  }

  return resolved;
}

function resolveSingleSourceHakSettings(
  hakDirectoryPath: string,
  hakProfiles: Record<string, string[]>,
  source: RuntimeSourceSettings
): ResolvedHakSourceSettings {
  if (!source.includeHaks) {
    return {
      mode: "disabled",
      includeHaks: false,
      hakProfileId: null,
      hakPriorityList: [],
      hakPaths: []
    };
  }

  if (source.hakPriorityList.length > 0) {
    const list = deduplicateOrdered(source.hakPriorityList);
    return {
      mode: "inline",
      includeHaks: true,
      hakProfileId: source.hakProfileId.trim() || null,
      hakPriorityList: list,
      hakPaths: list.map((hakEntry) => resolveHakPath(hakDirectoryPath, hakEntry))
    };
  }

  const hakProfileId = source.hakProfileId.trim();
  if (hakProfileId.length > 0) {
    const list = deduplicateOrdered(hakProfiles[hakProfileId] ?? []);
    return {
      mode: "profile",
      includeHaks: true,
      hakProfileId,
      hakPriorityList: list,
      hakPaths: list.map((hakEntry) => resolveHakPath(hakDirectoryPath, hakEntry))
    };
  }

  return {
    mode: "none",
    includeHaks: true,
    hakProfileId: null,
    hakPriorityList: [],
    hakPaths: []
  };
}

function deduplicateOrdered(values: string[]): string[] {
  const unique = new Set<string>();
  const ordered: string[] = [];
  for (const raw of values) {
    const value = raw.trim();
    if (!value || unique.has(value)) {
      continue;
    }
    unique.add(value);
    ordered.push(value);
  }
  return ordered;
}

function resolveHakPath(hakDirectoryPath: string, entry: string): string {
  return isAbsolute(entry) ? entry : resolve(hakDirectoryPath, entry);
}

function resolveModulePath(pathValue: string): string {
  return isAbsolute(pathValue) ? pathValue : resolve(process.cwd(), pathValue);
}

async function readDecompiledModuleFiles(rootPath: string): Promise<PackedModuleFile[]> {
  const files: PackedModuleFile[] = [];
  await collectDirectoryFiles(rootPath, rootPath, files);
  return files;
}

async function collectDirectoryFiles(
  rootPath: string,
  currentPath: string,
  files: PackedModuleFile[]
): Promise<void> {
  const entries = await readdir(currentPath, { withFileTypes: true });

  for (const entry of entries) {
    const absolutePath = resolve(currentPath, entry.name);
    if (entry.isDirectory()) {
      await collectDirectoryFiles(rootPath, absolutePath, files);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const bytes = await readFile(absolutePath);
    const relativePath = normalizeRelativePath(
      absolutePath.slice(rootPath.length).replace(/^[/\\]+/u, "")
    );

    files.push({
      fileName: relativePath,
      resourceType: 0,
      bytes
    });
  }
}

function normalizeRelativePath(value: string): string {
  return value.replace(/\\/gu, "/");
}
