import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import { readdir, readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { basename, dirname, extname, isAbsolute, resolve } from "node:path";
import {
  BLANK_CELL,
  parseAuroraTwoDaTable,
  type AuroraTwoDaRow
} from "../../../common/aurora/two-da/aurora-two-da-table";
import { buildS3ObjectUrl } from "../../../common/blob/blob-url.helpers";
import { resolveHostLocalMountedPath } from "../../../common/host/host-local-paths";
import { AppException } from "../../../common/http/app-exception";
import {
  DERIVED_ASSET_GENERATOR,
  type DerivedAssetGeneratorPort,
  type DerivedAssetGeneratorSummary
} from "./ports/derived-asset-generator.port";
import type {
  RuntimeAssetKind,
  RuntimeHostPathSettings,
  RuntimeSourceSettings,
  RuntimeSettingsPayload,
  RuntimeSettingsRecord
} from "../domain/runtime-settings.types";
import {
  MODULE_BLOB_STORAGE,
  type ModuleBlobObjectPayload,
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
import {
  NWN_KEY_BIF_RESOURCE_TYPES,
  NwnKeyBifResourceReader
} from "./nwn-key-bif-resource-reader";
import {
  readNwnErfResource,
  readNwnErfResourceFromIndex,
  readNwnErfResourceIndex
} from "../adapters/outbound/nwn/nwn-erf-packed-module-extractor.service";
import { inspectAuroraMdlSource } from "../adapters/outbound/derived/aurora-mdl-ascii-to-glb.converter";
import { AURORA_MDL_TO_GLB_CONVERTER_VERSION } from "../domain/derived-asset-versions";
import {
  getRuntimePathEnvironment,
  runtimeMountVariableForPath,
  translateHostPathToRuntime,
  translateRuntimePathToHost,
  type RuntimePathEnvironment,
  type RuntimePathMountVariable
} from "./runtime-path-environment";

const RUNTIME_ASSET_KINDS = [
  "placeable",
  "tile",
  "area",
  "sound",
  "vfx",
  "creature",
  "item"
] as const;
const DEFAULT_CREATURE_SOURCE_SETTINGS: RuntimeSourceSettings = {
  includeModuleTemp0: true,
  includeModulePacked: false,
  includeHaks: true,
  includeVanilla: true,
  hakProfileId: "lc_creatures",
  hakPriorityList: []
};
const DEFAULT_ITEM_SOURCE_SETTINGS: RuntimeSourceSettings = {
  includeModuleTemp0: true,
  includeModulePacked: false,
  includeHaks: true,
  includeVanilla: true,
  hakProfileId: "lc_creatures",
  hakPriorityList: []
};
const TEXTURE_EXTENSIONS = new Set(["dds", "tga", "plt", "txi", "mtr", "bmp"]);
const MODULE_OBJECT_READ_AFTER_WRITE_DELAYS_MS = [
  50,
  100,
  250,
  500,
  1_000,
  1_500,
  2_000,
  2_500,
  3_000
] as const;
const MODULE_AREA_SOURCE_EXTENSIONS = new Set(["are", "git", "gic"]);
const SOUND_ASSET_EXTENSIONS = new Set(["wav", "ogg", "bmu", "mp3"]);
const PLACEABLE_HAK_ASSET_EXTENSIONS = new Set([
  "utp",
  "utd",
  "mdl",
  "mdb",
  "set",
  "pwk",
  "dwk",
  "wok",
  "vis",
  "pfx"
]);
const CREATURE_TEMPLATE_ASSET_EXTENSIONS = new Set(["utc"]);
const PLACEABLE_TWO_DA_SOURCE_NAMES = new Set([
  "placeables.2da",
  "doortypes.2da",
  "genericdoors.2da"
]);
const VANILLA_KEY_FILE_CANDIDATES = ["nwn_base.key", "nwn_retail.key"] as const;
const VANILLA_PLACEABLE_RELATED_RESOURCE_TYPES: ReadonlyArray<{
  extension: string;
  resourceType: number;
  directory: string;
}> = [
  { extension: "mdl", resourceType: NWN_KEY_BIF_RESOURCE_TYPES.MDL, directory: "models" },
  { extension: "pwk", resourceType: NWN_KEY_BIF_RESOURCE_TYPES.PWK, directory: "walkmeshes" },
  { extension: "dwk", resourceType: NWN_KEY_BIF_RESOURCE_TYPES.DWK, directory: "walkmeshes" },
  { extension: "wok", resourceType: NWN_KEY_BIF_RESOURCE_TYPES.WOK, directory: "walkmeshes" }
];
const VANILLA_TILE_MODEL_RESOURCE_TYPES: ReadonlyArray<{
  extension: string;
  resourceType: number;
  directory: string;
}> = [
  { extension: "mdl", resourceType: NWN_KEY_BIF_RESOURCE_TYPES.MDL, directory: "models" },
  { extension: "wok", resourceType: NWN_KEY_BIF_RESOURCE_TYPES.WOK, directory: "walkmeshes" }
];
const VANILLA_TEXTURE_RESOURCE_TYPES: ReadonlyArray<{
  extension: string;
  resourceType: number;
}> = [
  { extension: "dds", resourceType: NWN_KEY_BIF_RESOURCE_TYPES.DDS },
  { extension: "tga", resourceType: NWN_KEY_BIF_RESOURCE_TYPES.TGA },
  { extension: "txi", resourceType: NWN_KEY_BIF_RESOURCE_TYPES.TXI },
  { extension: "mtr", resourceType: NWN_KEY_BIF_RESOURCE_TYPES.MTR },
  { extension: "bmp", resourceType: NWN_KEY_BIF_RESOURCE_TYPES.BMP },
  { extension: "plt", resourceType: NWN_KEY_BIF_RESOURCE_TYPES.PLT }
];
const VANILLA_SOUND_RESOURCE_TYPES: ReadonlyArray<{
  extension: string;
  resourceType: number;
}> = [
  { extension: "wav", resourceType: NWN_KEY_BIF_RESOURCE_TYPES.WAV },
  { extension: "bmu", resourceType: NWN_KEY_BIF_RESOURCE_TYPES.BMU },
  { extension: "mp3", resourceType: NWN_KEY_BIF_RESOURCE_TYPES.MP3 }
];
const VANILLA_CREATURE_TEMPLATE_RESOURCE_TYPES: ReadonlyArray<{
  extension: string;
  resourceType: number;
}> = [{ extension: "utc", resourceType: NWN_KEY_BIF_RESOURCE_TYPES.UTC }];
const VANILLA_ITEM_TEMPLATE_RESOURCE_TYPES: ReadonlyArray<{
  extension: string;
  resourceType: number;
}> = [{ extension: "uti", resourceType: NWN_KEY_BIF_RESOURCE_TYPES.UTI }];
const TEXTURE_INDEX_FILE_NAME = "__aurora/meta/texture-index.v1.json";
const TEXTURE_INDEX_LOOKUP_CACHE_TTL_MS = 30_000;

export interface TextureIndexEntry {
  textureId: string;
  resref: string;
  extension: string;
  objectKey: string;
  sizeBytes: number;
  sha256: string;
  source: "module" | "hak" | "vanilla";
  sourcePath: string;
}

export interface TextureIndexRecord {
  version: "texture-index/v1";
  generatedAt: string;
  settingsRevision: number;
  modulePrefix: string;
  totalTextures: number;
  totalBytes: number;
  entries: TextureIndexEntry[];
  byResref: Record<
    string,
    Array<{
      objectKey: string;
      sha256: string;
      sizeBytes: number;
      extension: string;
      source: "module" | "hak" | "vanilla";
      sourcePath: string;
    }>
  >;
}

export interface TextureIndexMetadataSummary {
  indexObjectKey: string;
  available: boolean;
  version?: TextureIndexRecord["version"];
  generatedAt?: string;
  settingsRevision?: number;
  modulePrefix?: string;
  totalTextures?: number;
  totalBytes?: number;
}

export interface TextureIndexQueryResult extends TextureIndexMetadataSummary {
  query: {
    resref?: string;
    limit: number;
    offset: number;
  };
  totalEntries: number;
  entries: TextureIndexEntry[];
}

export interface TextureSyncSummary {
  uploadedTextureFiles: number;
  uploadedTextureBytes: number;
  moduleTextures: number;
  hakTextures: number;
  vanillaTextures: number;
  textureIndexObjectKey: string;
}

export interface DerivedAssetSyncSummary extends DerivedAssetGeneratorSummary {}

export interface ModuleAreaSourceSyncEnvelope {
  mode: "module-area-source-sync";
  settingsRevision: number;
  triggeredBy: string;
  triggeredAt: string;
  enabled: boolean;
  source: {
    type: "decompiled" | "packed" | "none";
    path: string;
  };
  uploadedFiles: number;
  uploadedBytes: number;
  files: Array<{
    fileName: string;
    objectKey: string;
    size: number;
    resourceType: number;
    etag?: string;
  }>;
  skippedReason?:
    | "area_module_sources_disabled"
    | "module_source_not_configured"
    | "module_blob_storage_put_unavailable";
}

export interface VanillaTilesetSetSourceSyncEnvelope {
  mode: "vanilla-tileset-set-source-sync";
  settingsRevision: number;
  triggeredBy: string;
  triggeredAt: string;
  enabled: boolean;
  source: {
    vanillaDataPath: string;
  };
  uploadedFiles: number;
  uploadedBytes: number;
  files: Array<{
    fileName: string;
    objectKey: string;
    size: number;
    resourceType: number;
    etag?: string;
  }>;
  skippedReason?:
    | "tile_vanilla_sources_disabled"
    | "tile_set_sources_disabled"
    | "module_blob_storage_put_unavailable";
}

export interface VanillaTileModelSourceSyncEnvelope {
  mode: "vanilla-tile-model-source-sync";
  settingsRevision: number;
  triggeredBy: string;
  triggeredAt: string;
  enabled: boolean;
  source: {
    vanillaDataPath: string;
    hakPaths?: string[];
  };
  requestedModelResRefs: string[];
  missingModelResRefs: string[];
  uploadedFiles: number;
  uploadedBytes: number;
  derivedAssets: DerivedAssetSyncSummary;
  files: Array<{
    fileName: string;
    objectKey: string;
    size: number;
    resourceType: number;
    etag?: string;
  }>;
  skippedReason?:
    | "tile_vanilla_sources_disabled"
    | "tile_model_sources_disabled"
    | "module_blob_storage_put_unavailable"
    | "no_model_resrefs_requested";
}

export interface PlaceableModelSourceSyncRequest {
  appearanceTypes?: number[];
  modelResRefs?: string[];
}

export interface PlaceableModelSourceSyncEnvelope {
  mode: "placeable-model-source-sync";
  settingsRevision: number;
  triggeredBy: string;
  triggeredAt: string;
  enabled: boolean;
  source: {
    vanillaDataPath: string;
    hakPaths?: string[];
  };
  requestedAppearanceTypes: number[];
  resolvedAppearanceModels: Array<{
    appearanceType: number;
    modelResRef: string;
    source2da: "placeables.2da";
  }>;
  missingAppearanceTypes: number[];
  requestedModelResRefs: string[];
  missingModelResRefs: string[];
  uploadedFiles: number;
  uploadedBytes: number;
  derivedAssets: DerivedAssetSyncSummary;
  files: Array<{
    fileName: string;
    objectKey: string;
    size: number;
    resourceType: number;
    etag?: string;
  }>;
  skippedReason?:
    | "placeable_model_sources_disabled"
    | "module_blob_storage_put_unavailable"
    | "no_placeable_sources_requested";
}

export interface CreatureTemplateSourceSyncEnvelope {
  mode: "creature-template-source-sync";
  settingsRevision: number;
  triggeredBy: string;
  triggeredAt: string;
  enabled: boolean;
  source: {
    vanillaDataPath: string;
    hakPaths: string[];
    missingHakPaths: string[];
  };
  discoveredHakTemplates: number;
  discoveredVanillaTemplates: number;
  uploadedFiles: number;
  uploadedBytes: number;
  files: Array<{
    fileName: string;
    objectKey: string;
    size: number;
    resourceType: number;
    etag?: string;
  }>;
  skippedReason?:
    | "creature_template_sources_disabled"
    | "module_blob_storage_put_unavailable";
}

export interface ItemTemplateSourceSyncEnvelope {
  mode: "item-template-source-sync";
  settingsRevision: number;
  triggeredBy: string;
  triggeredAt: string;
  enabled: boolean;
  source: {
    vanillaDataPath: string;
    hakPaths: string[];
    missingHakPaths: string[];
  };
  discoveredHakTemplates: number;
  discoveredVanillaTemplates: number;
  uploadedFiles: number;
  uploadedBytes: number;
  files: Array<{
    fileName: string;
    objectKey: string;
    size: number;
    resourceType: number;
    etag?: string;
  }>;
  skippedReason?:
    | "item_template_sources_disabled"
    | "module_blob_storage_put_unavailable";
}

export interface TextureDeliveryContract {
  textureId: string;
  resref: string;
  objectKey: string;
  extension: string;
  contentType: string;
  sizeBytes: number;
  contentSha256: string;
  source: "module" | "hak" | "vanilla";
  sourcePath: string;
  deliveryPath: string;
  deliveryUrl: string;
  s3Url: string;
}

export interface TextureDeliveryContractsEnvelope {
  indexObjectKey: string;
  available: boolean;
  modulePrefix?: string;
  totalEntries: number;
  query: {
    textureIds?: string[];
    resref?: string;
    limit: number;
    offset: number;
  };
  assets: TextureDeliveryContract[];
}

export interface TextureBlobDeliveryEnvelope {
  indexObjectKey: string;
  modulePrefix: string;
  texture: TextureIndexEntry;
  deliveryPath: string;
  deliveryUrl: string;
  s3Url: string;
  payload: ModuleBlobObjectPayload;
}

export interface ModuleBlobSyncEnvelope {
  mode: "incremental" | "full";
  source: {
    type: "decompiled" | "packed";
    path: string;
  };
  sync: ModuleBlobSyncResult;
  settingsRevision: number;
  triggeredBy: string;
  triggeredAt: string;
  derivedAssets: DerivedAssetSyncSummary;
  textures: TextureSyncSummary;
}

interface TextureSourceFile extends PackedModuleFile {
  source: "module" | "hak" | "vanilla";
  sourcePath: string;
}

interface SourceSupplementResult {
  textureFiles: TextureSourceFile[];
  placeableAssetFiles: PackedModuleFile[];
  creatureTemplateFiles: PackedModuleFile[];
  soundAssetFiles: PackedModuleFile[];
  summary: {
    hakTextures: number;
    hakPlaceableAssets: number;
    hakCreatureTemplates: number;
    hakSounds: number;
    vanillaTextures: number;
    vanillaCreatureTemplates: number;
    vanillaSounds: number;
  };
}

interface TextureIndexLookup {
  record: TextureIndexRecord;
  byTextureId: Map<string, TextureIndexEntry>;
  byResrefEntries: Map<string, TextureIndexEntry[]>;
}

interface TextureIndexLookupCacheEntry extends TextureIndexLookup {
  cacheKey: string;
  fetchedAtMs: number;
}

export interface ResolvedHakSourceSettings {
  mode: "disabled" | "inline" | "module_ifo" | "profile" | "none";
  includeHaks: boolean;
  hakProfileId: string | null;
  hakPriorityList: string[];
  hakPaths: string[];
}

export type ResolvedHakSettingsByAsset = Record<
  RuntimeAssetKind,
  ResolvedHakSourceSettings
>;

function buildSkippedDerivedAssetSummary(skippedReason: string): DerivedAssetSyncSummary {
  return {
    generator: "none",
    generatedFiles: 0,
    generatedBytes: 0,
    skippedReason
  };
}

export type RuntimePathReadinessCode =
  | "MOUNT_NOT_AVAILABLE"
  | "HOST_PATH_REQUIRED"
  | "RESTART_REQUIRED"
  | "RUNTIME_PATH_UPDATE_REQUIRED"
  | "PATH_NOT_FOUND"
  | "PATH_NOT_DIRECTORY"
  | "PATH_NOT_FILE"
  | "MODULE_SOURCE_REQUIRED";

export interface RuntimePathReadinessIssue {
  field: string;
  code: RuntimePathReadinessCode;
  message: string;
  envVariable?: RuntimePathMountVariable;
  hostPath?: string;
  runtimePath?: string;
}

export type RuntimePathOnboardingInput = RuntimeHostPathSettings;

export interface RuntimePathReadiness {
  ready: boolean;
  issues: RuntimePathReadinessIssue[];
  values: RuntimePathOnboardingInput;
  environment: RuntimePathEnvironment;
}

export interface RuntimeInputFingerprintResult {
  fingerprint: string;
  sourceType: "decompiled" | "packed";
  sourcePath: string;
  sourceFiles: number;
  sourceBytes: number;
}

export interface RuntimeCacheIntegrityResult {
  valid: boolean;
  reason:
    | "ok"
    | "missing_generation"
    | "empty_snapshot"
    | "missing_manifest_hash"
    | "truncated_snapshot"
    | "module_hash_mismatch"
    | "file_count_mismatch";
  moduleHash?: string;
  totalFiles: number;
}

@Injectable()
export class RuntimeSettingsApplicationService {
  private readonly logger = new Logger(RuntimeSettingsApplicationService.name);
  private textureIndexLookupCache: TextureIndexLookupCacheEntry | null = null;

  constructor(
    @Inject(RUNTIME_SETTINGS_REPOSITORY)
    private readonly repository: RuntimeSettingsRepositoryPort,
    @Inject(PACKED_MODULE_EXTRACTOR)
    private readonly packedModuleExtractor: PackedModuleExtractorPort,
    @Inject(MODULE_BLOB_STORAGE)
    private readonly moduleBlobStorage: ModuleBlobStoragePort,
    @Optional()
    @Inject(DERIVED_ASSET_GENERATOR)
    private readonly derivedAssetGenerator?: DerivedAssetGeneratorPort
  ) {}

  async getRuntimeSettings(): Promise<RuntimeSettingsRecord> {
    return this.repository.get();
  }

  async getRuntimePathReadiness(): Promise<RuntimePathReadiness> {
    const settings = await this.repository.get();
    const readiness = await this.validateRuntimePathOnboarding(
      this.toOnboardingInput(settings)
    );
    if (
      readiness.ready &&
      readiness.environment.mode === "docker" &&
      runtimePathSettingsNeedUpdate(settings, readiness.values)
    ) {
      return {
        ...readiness,
        ready: false,
        issues: [
          {
            field: "runtimePaths",
            code: "RUNTIME_PATH_UPDATE_REQUIRED",
            message:
              "The Docker host paths are available, but the stored runtime mapping is outdated. Use Save and validate to activate it."
          }
        ]
      };
    }
    return readiness;
  }

  async validateRuntimePathOnboarding(
    input: RuntimePathOnboardingInput
  ): Promise<RuntimePathReadiness> {
    const values = normalizeRuntimePathOnboardingInput(input);
    const resolution = resolveRuntimePathOnboardingInput(values);
    const runtimeValues = resolution.values;
    const issues: RuntimePathReadinessIssue[] = [...resolution.issues];

    if (!resolution.unresolvedFields.has("nwnUserDir")) {
      await appendPathIssue(
        issues,
        "nwnUserDir",
        runtimeValues.nwnUserDir,
        "directory",
        values.nwnUserDir
      );
    }
    if (!resolution.unresolvedFields.has("nwnInstallDir")) {
      await appendPathIssue(
        issues,
        "nwnInstallDir",
        runtimeValues.nwnInstallDir,
        "directory",
        values.nwnInstallDir
      );
    }
    if (!resolution.unresolvedFields.has("nwnInstallDir")) {
      await appendPathIssue(
        issues,
        "nwnInstallDir.data",
        resolveFilePath(resolve(runtimeValues.nwnInstallDir, "data")),
        "directory",
        resolve(values.nwnInstallDir, "data")
      );
      await appendPathIssue(
        issues,
        "nwnInstallDir.dialogTlk",
        resolveFilePath(
          resolve(runtimeValues.nwnInstallDir, "lang", "en", "data", "dialog.tlk")
        ),
        "file",
        resolve(values.nwnInstallDir, "lang", "en", "data", "dialog.tlk")
      );
    }

    for (const [index, hakDirectory] of runtimeValues.hakDirectories.entries()) {
      const field = `hakDirectories.${index}`;
      if (!resolution.unresolvedFields.has(field)) {
        await appendPathIssue(
          issues,
          field,
          hakDirectory,
          "directory",
          values.hakDirectories[index]
        );
      }
    }
    if (
      runtimeValues.auroraReferenceDir &&
      !resolution.unresolvedFields.has("auroraReferenceDir")
    ) {
      await appendPathIssue(
        issues,
        "auroraReferenceDir",
        runtimeValues.auroraReferenceDir,
        "directory",
        values.auroraReferenceDir
      );
    }
    for (const [index, sourceDirectory] of runtimeValues.itemGeneratorSourceDirectories.entries()) {
      const field = `itemGeneratorSourceDirectories.${index}`;
      if (!resolution.unresolvedFields.has(field)) {
        await appendPathIssue(
          issues,
          field,
          sourceDirectory,
          "directory",
          values.itemGeneratorSourceDirectories[index]
        );
      }
    }

    if (!values.moduleDecompiledPath && !values.modulePackedPath) {
      issues.push({
        field: "moduleDecompiledPath",
        code: "MODULE_SOURCE_REQUIRED",
        message: "Configure either a decompiled module directory or a packed module file."
      });
    } else {
      if (
        runtimeValues.moduleDecompiledPath &&
        !resolution.unresolvedFields.has("moduleDecompiledPath")
      ) {
        await appendPathIssue(
          issues,
          "moduleDecompiledPath",
          runtimeValues.moduleDecompiledPath,
          "directory",
          values.moduleDecompiledPath
        );
      }
      if (
        runtimeValues.modulePackedPath &&
        !resolution.unresolvedFields.has("modulePackedPath")
      ) {
        await appendPathIssue(
          issues,
          "modulePackedPath",
          runtimeValues.modulePackedPath,
          "file",
          values.modulePackedPath
        );
      }
    }

    return {
      ready: issues.length === 0,
      issues,
      values,
      environment: getRuntimePathEnvironment()
    };
  }

  async saveRuntimePathOnboarding(
    input: RuntimePathOnboardingInput,
    updatedBy: string
  ): Promise<RuntimePathReadiness> {
    const readiness = await this.validateRuntimePathOnboarding(input);
    if (!readiness.ready) {
      throw new AppException({
        status: 422,
        code: "VALIDATION_FAILED",
        message: "Runtime path validation failed.",
        details: readiness.issues.map((issue) => ({
          path: issue.field,
          reason: issue.message,
          reasonCode: issue.code
        }))
      });
    }

    const candidate = await this.buildRuntimePathOnboardingCandidate(
      readiness.values,
      updatedBy
    );
    await this.persistRuntimeSettingsRecord(candidate);
    return readiness;
  }

  async buildRuntimePathOnboardingCandidate(
    input: RuntimePathOnboardingInput,
    updatedBy: string
  ): Promise<RuntimeSettingsRecord> {
    const readiness = await this.validateRuntimePathOnboarding(input);
    if (!readiness.ready) {
      throw new AppException({
        status: 422,
        code: "VALIDATION_FAILED",
        message: "Runtime path validation failed.",
        details: readiness.issues.map((issue) => ({
          path: issue.field,
          reason: issue.message,
          reasonCode: issue.code
        }))
      });
    }
    const current = await this.repository.get();
    const values = readiness.values;
    const runtimeValues = resolveRuntimePathOnboardingInput(values).values;
    return {
      ...current,
      revision: current.revision + 1,
      updatedAt: new Date().toISOString(),
      updatedBy,
      paths: {
        ...current.paths,
        hostPaths: values,
        nwnUserDir: runtimeValues.nwnUserDir,
        nwnInstallDir: runtimeValues.nwnInstallDir,
        auroraReferenceDir: runtimeValues.auroraReferenceDir,
        hakDirectories: runtimeValues.hakDirectories,
        itemGeneratorSourceDirectories:
          runtimeValues.itemGeneratorSourceDirectories,
        vanillaDataPath: resolve(runtimeValues.nwnInstallDir, "data"),
        hakDirectoryPath:
          runtimeValues.hakDirectories[0] ??
          resolve(runtimeValues.nwnUserDir, "hak"),
        moduleDecompiledPath: runtimeValues.moduleDecompiledPath,
        modulePackedPath: runtimeValues.modulePackedPath,
        tlkBasePath: resolve(
          runtimeValues.nwnInstallDir,
          "lang",
          "en",
          "data",
          "dialog.tlk"
        ),
        tlkCustomPath:
          runtimeValues.tlkCustomPath ?? current.paths.tlkCustomPath
      },
      blobStorage: {
        ...current.blobStorage,
        modulePrefix: resolveBaseModulePrefix(current.blobStorage.modulePrefix)
      }
    };
  }

  private toOnboardingInput(settings: RuntimeSettingsRecord): RuntimePathOnboardingInput {
    const legacyNwnUserDir = dirname(resolveFilePath(settings.paths.hakDirectoryPath));
    const legacyNwnInstallDir = dirname(resolveFilePath(settings.paths.vanillaDataPath));
    const storedHostPaths = settings.paths.hostPaths;
    const displayPath = (runtimePath: string, storedPath?: string) => {
      const translated = translateRuntimePathToHost(runtimePath);
      if (translated !== runtimePath) {
        return translated;
      }
      return storedPath && !storedPath.replace(/\\/gu, "/").startsWith("/host/")
        ? storedPath
        : translated;
    };
    return normalizeRuntimePathOnboardingInput({
      nwnUserDir: displayPath(
        settings.paths.nwnUserDir || legacyNwnUserDir,
        storedHostPaths?.nwnUserDir
      ),
      nwnInstallDir: displayPath(
        settings.paths.nwnInstallDir || legacyNwnInstallDir,
        storedHostPaths?.nwnInstallDir
      ),
      auroraReferenceDir: displayPath(
        settings.paths.auroraReferenceDir ?? "",
        storedHostPaths?.auroraReferenceDir
      ),
      hakDirectories:
        (settings.paths.hakDirectories?.length ?? 0) > 0
          ? (settings.paths.hakDirectories ?? []).map((path, index) =>
              displayPath(path, storedHostPaths?.hakDirectories[index])
            )
          : [
              displayPath(
                settings.paths.hakDirectoryPath,
                storedHostPaths?.hakDirectories[0]
              )
            ],
      itemGeneratorSourceDirectories:
        settings.paths.itemGeneratorSourceDirectories?.map((path, index) =>
          displayPath(
            path,
            storedHostPaths?.itemGeneratorSourceDirectories[index]
          )
        ) ?? storedHostPaths?.itemGeneratorSourceDirectories ?? [],
      moduleDecompiledPath: displayPath(
        settings.paths.moduleDecompiledPath,
        storedHostPaths?.moduleDecompiledPath
      ),
      modulePackedPath: displayPath(
        settings.paths.modulePackedPath,
        storedHostPaths?.modulePackedPath
      ),
      tlkCustomPath: displayPath(
        settings.paths.tlkCustomPath,
        storedHostPaths?.tlkCustomPath
      )
    });
  }

  async getResolvedHakSettings(): Promise<ResolvedHakSettingsByAsset> {
    const settings = await this.repository.get();
    const moduleIfoHakList = await readModuleIfOHakList(settings.paths.moduleDecompiledPath);
    return resolveHakSettingsByAsset(settings, moduleIfoHakList);
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
    this.clearTextureIndexLookupCache();
    return next;
  }

  async buildRuntimeSettingsCandidate(
    payload: RuntimeSettingsPayload,
    updatedBy: string
  ): Promise<RuntimeSettingsRecord> {
    const current = await this.repository.get();
    const candidate: RuntimeSettingsRecord = {
      ...payload,
      revision: current.revision + 1,
      updatedAt: new Date().toISOString(),
      updatedBy,
      blobStorage: {
        ...payload.blobStorage,
        modulePrefix: resolveBaseModulePrefix(payload.blobStorage.modulePrefix)
      }
    };
    const readiness = await this.validateRuntimePathOnboarding(
      this.toOnboardingInput(candidate)
    );
    if (!readiness.ready) {
      throw new AppException({
        status: 422,
        code: "VALIDATION_FAILED",
        message: "Runtime path validation failed.",
        details: readiness.issues.map((issue) => ({
          path: issue.field,
          reason: issue.message,
          reasonCode: issue.code
        }))
      });
    }
    const runtimeValues = resolveRuntimePathOnboardingInput(
      readiness.values
    ).values;
    return {
      ...candidate,
      paths: {
        ...candidate.paths,
        hostPaths: readiness.values,
        nwnUserDir: runtimeValues.nwnUserDir,
        nwnInstallDir: runtimeValues.nwnInstallDir,
        auroraReferenceDir: runtimeValues.auroraReferenceDir,
        hakDirectories: runtimeValues.hakDirectories,
        itemGeneratorSourceDirectories:
          runtimeValues.itemGeneratorSourceDirectories,
        vanillaDataPath: resolve(runtimeValues.nwnInstallDir, "data"),
        hakDirectoryPath:
          runtimeValues.hakDirectories[0] ??
          resolve(runtimeValues.nwnUserDir, "hak"),
        moduleDecompiledPath: runtimeValues.moduleDecompiledPath,
        modulePackedPath: runtimeValues.modulePackedPath,
        tlkBasePath: resolve(
          runtimeValues.nwnInstallDir,
          "lang",
          "en",
          "data",
          "dialog.tlk"
        ),
        tlkCustomPath: runtimeValues.tlkCustomPath ?? ""
      }
    };
  }

  async persistRuntimeSettingsRecord(
    settings: RuntimeSettingsRecord
  ): Promise<RuntimeSettingsRecord> {
    await this.repository.save(settings);
    this.clearTextureIndexLookupCache();
    return settings;
  }

  async buildRuntimeInputFingerprint(
    settings: RuntimeSettingsRecord
  ): Promise<RuntimeInputFingerprintResult> {
    const baseSettings = withBaseModulePrefix(settings);
    const source = await this.loadModuleSourceFiles(baseSettings);
    const supplement = await this.loadSourceSupplementFiles(baseSettings);
    const files: PackedModuleFile[] = [
      ...source.files,
      ...toPackedModuleFileList(supplement.textureFiles),
      ...supplement.placeableAssetFiles,
      ...supplement.creatureTemplateFiles,
      ...supplement.soundAssetFiles
    ];
    const hash = createHash("sha256");
    hash.update("aurora-runtime-input/v1\n");
    hash.update(
      stableStringify({
        paths: {
          nwnUserDir: baseSettings.paths.nwnUserDir ?? "",
          nwnInstallDir: baseSettings.paths.nwnInstallDir ?? "",
          auroraReferenceDir: baseSettings.paths.auroraReferenceDir ?? "",
          hakDirectories: baseSettings.paths.hakDirectories ?? [],
          itemGeneratorSourceDirectories:
            baseSettings.paths.itemGeneratorSourceDirectories ?? [],
          vanillaDataPath: baseSettings.paths.vanillaDataPath,
          hakDirectoryPath: baseSettings.paths.hakDirectoryPath,
          moduleDecompiledPath: baseSettings.paths.moduleDecompiledPath,
          modulePackedPath: baseSettings.paths.modulePackedPath,
          tlkBasePath: baseSettings.paths.tlkBasePath,
          tlkCustomPath: baseSettings.paths.tlkCustomPath
        },
        hakProfiles: baseSettings.hakProfiles,
        sources: baseSettings.sources,
        moduleBasePrefix: baseSettings.blobStorage.modulePrefix,
        versions: {
          runtimeInput: "v1",
          textureIndex: "texture-index/v1",
          derivedAssets: AURORA_MDL_TO_GLB_CONVERTER_VERSION
        }
      })
    );
    hash.update("\n");
    let sourceBytes = 0;
    files.forEach((file, index) => {
      const bytes = Buffer.from(file.bytes);
      sourceBytes += bytes.length;
      hash.update(String(index));
      hash.update("\n");
      hash.update(normalizeRelativePath(file.fileName));
      hash.update("\n");
      hash.update(String(file.resourceType));
      hash.update("\n");
      hash.update(String(bytes.length));
      hash.update("\n");
      hash.update(createHash("sha256").update(bytes).digest("hex"));
      hash.update("\n");
    });
    return {
      fingerprint: hash.digest("hex"),
      sourceType: source.type,
      sourcePath: source.path,
      sourceFiles: files.length,
      sourceBytes
    };
  }

  async validateRuntimeCacheIntegrity(
    settings: RuntimeSettingsRecord,
    expected?: { moduleHash?: string; totalFiles?: number }
  ): Promise<RuntimeCacheIntegrityResult> {
    if (!extractGenerationFromPrefix(settings.blobStorage.modulePrefix)) {
      return {
        valid: false,
        reason: "missing_generation",
        totalFiles: 0
      };
    }
    const snapshot = await this.moduleBlobStorage.listModuleSnapshot(
      settings.blobStorage,
      { limit: 50_000 }
    );
    if (snapshot.truncated) {
      return {
        valid: false,
        reason: "truncated_snapshot",
        moduleHash: snapshot.moduleHash,
        totalFiles: snapshot.totalFiles
      };
    }
    if (snapshot.totalFiles === 0) {
      return {
        valid: false,
        reason: "empty_snapshot",
        moduleHash: snapshot.moduleHash,
        totalFiles: 0
      };
    }
    if (!snapshot.moduleHash) {
      return {
        valid: false,
        reason: "missing_manifest_hash",
        totalFiles: snapshot.totalFiles
      };
    }
    if (
      snapshot.manifestFileCount !== undefined &&
      snapshot.totalFiles !== snapshot.manifestFileCount
    ) {
      return {
        valid: false,
        reason: "file_count_mismatch",
        moduleHash: snapshot.moduleHash,
        totalFiles: snapshot.totalFiles
      };
    }
    if (expected?.moduleHash && snapshot.moduleHash !== expected.moduleHash) {
      return {
        valid: false,
        reason: "module_hash_mismatch",
        moduleHash: snapshot.moduleHash,
        totalFiles: snapshot.totalFiles
      };
    }
    if (
      expected?.totalFiles !== undefined &&
      snapshot.totalFiles !== expected.totalFiles
    ) {
      return {
        valid: false,
        reason: "file_count_mismatch",
        moduleHash: snapshot.moduleHash,
        totalFiles: snapshot.totalFiles
      };
    }
    return {
      valid: true,
      reason: "ok",
      moduleHash: snapshot.moduleHash,
      totalFiles: snapshot.totalFiles
    };
  }

  buildGenerationSettings(
    settings: RuntimeSettingsRecord,
    generation: string
  ): RuntimeSettingsRecord {
    const basePrefix = resolveBaseModulePrefix(settings.blobStorage.modulePrefix);
    return {
      ...structuredClone(settings),
      blobStorage: {
        ...settings.blobStorage,
        modulePrefix: `${basePrefix}/__generations/${generation}`
      }
    };
  }

  async getModuleBlobCacheSummary(limit?: number): Promise<ModuleBlobSnapshotSummary> {
    const settings = await this.repository.get();
    return this.moduleBlobStorage.listModuleSnapshot(settings.blobStorage, { limit });
  }

  async getTextureIndexMetadataSummary(): Promise<TextureIndexMetadataSummary> {
    const settings = await this.repository.get();
    const indexObjectKey = `${normalizeBlobPrefix(settings.blobStorage.modulePrefix)}${TEXTURE_INDEX_FILE_NAME}`;
    const lookup = await this.getTextureIndexLookup(settings, indexObjectKey);
    if (!lookup) {
      return {
        indexObjectKey,
        available: false
      };
    }
    const { record } = lookup;

    return {
      indexObjectKey,
      available: true,
      version: record.version,
      generatedAt: record.generatedAt,
      settingsRevision: record.settingsRevision,
      modulePrefix: record.modulePrefix,
      totalTextures: record.totalTextures,
      totalBytes: record.totalBytes
    };
  }

  async queryTextureIndex(options?: {
    resref?: string;
    limit?: number;
    offset?: number;
  }): Promise<TextureIndexQueryResult> {
    const settings = await this.repository.get();
    const indexObjectKey = `${normalizeBlobPrefix(settings.blobStorage.modulePrefix)}${TEXTURE_INDEX_FILE_NAME}`;
    const lookup = await this.getTextureIndexLookup(settings, indexObjectKey);
    const limit = options?.limit ?? 100;
    const offset = options?.offset ?? 0;
    const normalizedResref = options?.resref?.trim().toLowerCase();

    if (!lookup) {
      return {
        indexObjectKey,
        available: false,
        query: {
          resref: normalizedResref || undefined,
          limit,
          offset
        },
        totalEntries: 0,
        entries: []
      };
    }
    const { record } = lookup;

    const sourceEntries = normalizedResref
      ? (lookup.byResrefEntries.get(normalizedResref) ?? [])
      : record.entries;
    const paged = sourceEntries.slice(offset, offset + limit);

    return {
      indexObjectKey,
      available: true,
      version: record.version,
      generatedAt: record.generatedAt,
      settingsRevision: record.settingsRevision,
      modulePrefix: record.modulePrefix,
      totalTextures: record.totalTextures,
      totalBytes: record.totalBytes,
      query: {
        resref: normalizedResref || undefined,
        limit,
        offset
      },
      totalEntries: sourceEntries.length,
      entries: paged
    };
  }

  async getTextureDeliveryContracts(options?: {
    textureIds?: string[];
    resref?: string;
    limit?: number;
    offset?: number;
  }): Promise<TextureDeliveryContractsEnvelope> {
    const query = await this.queryTextureIndex({
      resref: options?.resref,
      limit: options?.limit,
      offset: options?.offset
    });

    if (!query.available) {
      return {
        indexObjectKey: query.indexObjectKey,
        available: false,
        totalEntries: 0,
        query: {
          textureIds: options?.textureIds,
          resref: query.query.resref,
          limit: query.query.limit,
          offset: query.query.offset
        },
        assets: []
      };
    }

    const sourceEntries = this.selectTextureEntries(query.entries, options?.textureIds);
    const settings = await this.repository.get();
    return {
      indexObjectKey: query.indexObjectKey,
      available: true,
      modulePrefix: query.modulePrefix,
      totalEntries: sourceEntries.length,
      query: {
        textureIds: options?.textureIds,
        resref: query.query.resref,
        limit: query.query.limit,
        offset: query.query.offset
      },
      assets: sourceEntries.map((entry) => ({
        textureId: entry.textureId,
        resref: entry.resref,
        objectKey: entry.objectKey,
        extension: entry.extension,
        contentType: inferTextureContentType(entry.extension),
        sizeBytes: entry.sizeBytes,
        contentSha256: entry.sha256,
        source: entry.source,
        sourcePath: entry.sourcePath,
        deliveryPath: buildTextureDeliveryPath(entry.textureId),
        deliveryUrl: buildTextureDeliveryPath(entry.textureId),
        s3Url: buildS3ObjectUrl(settings.blobStorage.bucket, entry.objectKey)
      }))
    };
  }

  async getTextureBlobById(textureId: string): Promise<TextureBlobDeliveryEnvelope> {
    const settings = await this.repository.get();
    const indexObjectKey = `${normalizeBlobPrefix(settings.blobStorage.modulePrefix)}${TEXTURE_INDEX_FILE_NAME}`;
    const lookup = await this.getTextureIndexLookup(settings, indexObjectKey);

    if (!lookup) {
      throw new AppException({
        status: 404,
        code: "TEXTURE_INDEX_NOT_AVAILABLE",
        message: "Texture index was not found in module cache."
      });
    }
    const { record } = lookup;

    const normalizedTextureId = textureId.trim().toLowerCase();
    const entry = lookup.byTextureId.get(normalizedTextureId);
    if (!entry) {
      throw new AppException({
        status: 404,
        code: "TEXTURE_NOT_FOUND",
        message: "Texture id was not found in texture index."
      });
    }

    const payload = await this.moduleBlobStorage.getModuleObject(
      settings.blobStorage,
      entry.objectKey
    );
    if (!payload) {
      throw new AppException({
        status: 404,
        code: "TEXTURE_BLOB_NOT_FOUND",
        message: "Texture blob object was not found in module cache."
      });
    }

    return {
      indexObjectKey,
      modulePrefix: record.modulePrefix,
      texture: entry,
      deliveryPath: buildTextureDeliveryPath(entry.textureId),
      deliveryUrl: buildTextureDeliveryPath(entry.textureId),
      s3Url: buildS3ObjectUrl(settings.blobStorage.bucket, entry.objectKey),
      payload: {
        ...payload,
        contentType: payload.contentType || inferTextureContentType(entry.extension)
      }
    };
  }

  async syncModuleBlobCache(
    triggeredBy: string,
    options?: {
      forceFull?: boolean;
    }
  ): Promise<ModuleBlobSyncEnvelope> {
    const settings = await this.repository.get();
    return this.syncModuleBlobCacheForSettings(settings, triggeredBy, options);
  }

  async syncModuleBlobCacheForSettings(
    settings: RuntimeSettingsRecord,
    triggeredBy: string,
    options?: {
      forceFull?: boolean;
      baselineSettings?: RuntimeSettingsRecord;
    }
  ): Promise<ModuleBlobSyncEnvelope> {
    const source = await this.loadModuleSourceFiles(settings);
    const moduleTextureFiles = collectTextureFilesFromPackedFiles(source.files, "module");
    const supplement = await this.loadSourceSupplementFiles(settings);
    const textureFiles = [...moduleTextureFiles, ...supplement.textureFiles];
    const textureIndex = buildTextureIndexRecord(
      settings.revision,
      settings.blobStorage.modulePrefix,
      textureFiles,
      settings.updatedAt
    );
    const textureIndexObjectKey = `${normalizeBlobPrefix(settings.blobStorage.modulePrefix)}${TEXTURE_INDEX_FILE_NAME}`;
    const textureIndexFile: PackedModuleFile = {
      fileName: TEXTURE_INDEX_FILE_NAME,
      resourceType: 0,
      bytes: Buffer.from(`${JSON.stringify(textureIndex, null, 2)}\n`, "utf-8")
    };

    const sourceAndSupplementFiles = [
      ...source.files,
      ...toPackedModuleFileList(supplement.textureFiles),
      ...supplement.placeableAssetFiles,
      ...supplement.creatureTemplateFiles,
      ...supplement.soundAssetFiles
    ];
    const derivedAssets = await this.generateDerivedAssetFiles(settings, source.files);
    const allFiles = [...sourceAndSupplementFiles, ...derivedAssets.files, textureIndexFile];
    const sync = await this.moduleBlobStorage.replaceModuleSnapshot(
      settings.blobStorage,
      allFiles,
      {
        forceFull: options?.forceFull === true,
        baselineSettings: options?.baselineSettings?.blobStorage
      }
    );
    this.primeTextureIndexLookupCache(settings, textureIndexObjectKey, textureIndex);

    return {
      mode: options?.forceFull === true ? "full" : "incremental",
      source: {
        type: source.type,
        path: source.path
      },
      sync,
      settingsRevision: settings.revision,
      triggeredBy,
      triggeredAt: new Date().toISOString(),
      derivedAssets: derivedAssets.summary,
      textures: {
        uploadedTextureFiles: textureFiles.length,
        uploadedTextureBytes: sumBytes(textureFiles),
        moduleTextures: moduleTextureFiles.length,
        hakTextures: supplement.summary.hakTextures,
        vanillaTextures: supplement.summary.vanillaTextures,
        textureIndexObjectKey
      }
    };
  }

  private async generateDerivedAssetFiles(
    settings: RuntimeSettingsRecord,
    sourceFiles: PackedModuleFile[]
  ): Promise<{
    files: PackedModuleFile[];
    summary: DerivedAssetSyncSummary;
  }> {
    if (!this.derivedAssetGenerator) {
      return {
        files: [],
        summary: {
          generator: "none",
          generatedFiles: 0,
          generatedBytes: 0,
          skippedReason: "generator_not_registered"
        }
      };
    }

    const result = await this.derivedAssetGenerator.generateDerivedAssets({
      settingsRevision: settings.revision,
      modulePrefix: settings.blobStorage.modulePrefix,
      sourceFiles
    });
    const files = result.files.map((file) => ({
      fileName: normalizeRelativePath(file.fileName),
      resourceType: file.resourceType,
      bytes: Buffer.from(file.bytes)
    }));
    return {
      files,
      summary: {
        ...result.summary,
        generatedFiles: files.length,
        generatedBytes: sumBytes(files)
      }
    };
  }

  async rebuildModuleBlobCache(
    triggeredBy: string,
    options?: {
      forceFull?: boolean;
    }
  ): Promise<ModuleBlobSyncEnvelope> {
    return this.syncModuleBlobCache(triggeredBy, options);
  }

  async syncModuleAreaSourceFiles(
    triggeredBy: string
  ): Promise<ModuleAreaSourceSyncEnvelope> {
    const settings = await this.repository.get();
    if (!settings.sources.area.includeModuleTemp0 && !settings.sources.area.includeModulePacked) {
      return {
        mode: "module-area-source-sync",
        settingsRevision: settings.revision,
        triggeredBy,
        triggeredAt: new Date().toISOString(),
        enabled: false,
        source: {
          type: "none",
          path: ""
        },
        uploadedFiles: 0,
        uploadedBytes: 0,
        files: [],
        skippedReason: "area_module_sources_disabled"
      };
    }

    if (!this.moduleBlobStorage.putModuleObject) {
      return {
        mode: "module-area-source-sync",
        settingsRevision: settings.revision,
        triggeredBy,
        triggeredAt: new Date().toISOString(),
        enabled: true,
        source: {
          type: "none",
          path: ""
        },
        uploadedFiles: 0,
        uploadedBytes: 0,
        files: [],
        skippedReason: "module_blob_storage_put_unavailable"
      };
    }

    const source = await this.loadModuleAreaSourceFiles(settings);
    if (source.type === "none") {
      return {
        mode: "module-area-source-sync",
        settingsRevision: settings.revision,
        triggeredBy,
        triggeredAt: new Date().toISOString(),
        enabled: true,
        source,
        uploadedFiles: 0,
        uploadedBytes: 0,
        files: [],
        skippedReason: "module_source_not_configured"
      };
    }

    const storedFiles: ModuleAreaSourceSyncEnvelope["files"] = [];
    let uploadedBytes = 0;
    for (const file of source.files) {
      const stored = await this.moduleBlobStorage.putModuleObject(settings.blobStorage, file);
      uploadedBytes += stored.size;
      storedFiles.push({
        fileName: file.fileName,
        objectKey: stored.key,
        size: stored.size,
        resourceType: file.resourceType,
        ...(stored.etag ? { etag: stored.etag } : {})
      });
    }

    return {
      mode: "module-area-source-sync",
      settingsRevision: settings.revision,
      triggeredBy,
      triggeredAt: new Date().toISOString(),
      enabled: true,
      source: {
        type: source.type,
        path: source.path
      },
      uploadedFiles: storedFiles.length,
      uploadedBytes,
      files: storedFiles
    };
  }

  async syncVanillaTilesetSetSources(
    triggeredBy: string
  ): Promise<VanillaTilesetSetSourceSyncEnvelope> {
    const settings = await this.repository.get();
    const vanillaDataPath = resolveFilePath(settings.paths.vanillaDataPath.trim());
    if (!settings.sources.tile.includeVanilla && !settings.sources.tile.includeHaks) {
      return {
        mode: "vanilla-tileset-set-source-sync",
        settingsRevision: settings.revision,
        triggeredBy,
        triggeredAt: new Date().toISOString(),
        enabled: false,
        source: {
          vanillaDataPath
        },
        uploadedFiles: 0,
        uploadedBytes: 0,
        files: [],
        skippedReason: "tile_set_sources_disabled"
      };
    }

    if (!this.moduleBlobStorage.putModuleObject) {
      return {
        mode: "vanilla-tileset-set-source-sync",
        settingsRevision: settings.revision,
        triggeredBy,
        triggeredAt: new Date().toISOString(),
        enabled: true,
        source: {
          vanillaDataPath
        },
        uploadedFiles: 0,
        uploadedBytes: 0,
        files: [],
        skippedReason: "module_blob_storage_put_unavailable"
      };
    }

    const filesByName = new Map<string, PackedModuleFile>();
    if (settings.sources.tile.includeHaks) {
      const moduleIfoHakList = await readModuleIfOHakList(settings.paths.moduleDecompiledPath);
      const tileHakPaths = resolveHakSettingsByAsset(settings, moduleIfoHakList).tile.hakPaths;
      const hakTilesetSetFiles = await readHakTilesetSetAssets(
        tileHakPaths,
        this.logger
      );
      for (const file of hakTilesetSetFiles) {
        filesByName.set(file.fileName, file);
      }
    }
    if (settings.sources.tile.includeVanilla) {
      const vanillaTilesetSetFiles = await readVanillaTilesetSetAssetsFromKeyBif(
        vanillaDataPath,
        this.logger
      );
      for (const file of vanillaTilesetSetFiles) {
        filesByName.set(file.fileName, file);
      }
    }
    const files = [...filesByName.values()];
    const storedFiles: VanillaTilesetSetSourceSyncEnvelope["files"] = [];
    let uploadedBytes = 0;
    for (const file of files) {
      const stored = await this.moduleBlobStorage.putModuleObject(settings.blobStorage, file);
      uploadedBytes += stored.size;
      storedFiles.push({
        fileName: file.fileName,
        objectKey: stored.key,
        size: stored.size,
        resourceType: file.resourceType,
        ...(stored.etag ? { etag: stored.etag } : {})
      });
    }

    return {
      mode: "vanilla-tileset-set-source-sync",
      settingsRevision: settings.revision,
      triggeredBy,
      triggeredAt: new Date().toISOString(),
      enabled: true,
      source: {
        vanillaDataPath
      },
      uploadedFiles: storedFiles.length,
      uploadedBytes,
      files: storedFiles
    };
  }

  async syncVanillaTileModelSources(
    triggeredBy: string,
    modelResRefs: string[],
    directTextureResRefs: string[] = []
  ): Promise<VanillaTileModelSourceSyncEnvelope> {
    const settings = await this.repository.get();
    const vanillaDataPath = resolveFilePath(settings.paths.vanillaDataPath.trim());
    const requestedModelResRefs = normalizeRequestedVanillaModelResrefs(modelResRefs);
    const moduleIfoHakList = await readModuleIfOHakList(settings.paths.moduleDecompiledPath);
    const tileHakPaths = settings.sources.tile.includeHaks
      ? resolveHakSettingsByAsset(settings, moduleIfoHakList).tile.hakPaths
      : [];

    if (!settings.sources.tile.includeVanilla && !settings.sources.tile.includeHaks) {
      return {
        mode: "vanilla-tile-model-source-sync",
        settingsRevision: settings.revision,
        triggeredBy,
        triggeredAt: new Date().toISOString(),
        enabled: false,
        source: {
          vanillaDataPath,
          hakPaths: tileHakPaths
        },
        requestedModelResRefs,
        missingModelResRefs: requestedModelResRefs,
        uploadedFiles: 0,
        uploadedBytes: 0,
        derivedAssets: buildSkippedDerivedAssetSummary("tile_model_sources_disabled"),
        files: [],
        skippedReason: "tile_model_sources_disabled"
      };
    }

    if (requestedModelResRefs.length === 0) {
      return {
        mode: "vanilla-tile-model-source-sync",
        settingsRevision: settings.revision,
        triggeredBy,
        triggeredAt: new Date().toISOString(),
        enabled: true,
        source: {
          vanillaDataPath,
          hakPaths: tileHakPaths
        },
        requestedModelResRefs,
        missingModelResRefs: [],
        uploadedFiles: 0,
        uploadedBytes: 0,
        derivedAssets: buildSkippedDerivedAssetSummary("no_model_resrefs_requested"),
        files: [],
        skippedReason: "no_model_resrefs_requested"
      };
    }

    if (!this.moduleBlobStorage.putModuleObject) {
      return {
        mode: "vanilla-tile-model-source-sync",
        settingsRevision: settings.revision,
        triggeredBy,
        triggeredAt: new Date().toISOString(),
        enabled: true,
        source: {
          vanillaDataPath,
          hakPaths: tileHakPaths
        },
        requestedModelResRefs,
        missingModelResRefs: requestedModelResRefs,
        uploadedFiles: 0,
        uploadedBytes: 0,
        derivedAssets: buildSkippedDerivedAssetSummary("module_blob_storage_put_unavailable"),
        files: [],
        skippedReason: "module_blob_storage_put_unavailable"
      };
    }

    const sourceFilesByName = new Map<string, PackedModuleFile>();
    let missingModelResRefs = requestedModelResRefs;
    if (settings.sources.tile.includeHaks) {
      const hakResult = await readHakTileModelAssets(
        tileHakPaths,
        requestedModelResRefs,
        this.logger
      );
      for (const file of hakResult.files) {
        sourceFilesByName.set(file.fileName, file);
      }
      missingModelResRefs = hakResult.missingModelResRefs;
    }
    if (settings.sources.tile.includeVanilla && missingModelResRefs.length > 0) {
      const vanillaResult = await readVanillaTileModelAssetsFromKeyBif(
        vanillaDataPath,
        missingModelResRefs,
        this.logger
      );
      for (const file of vanillaResult.files) {
        if (!sourceFilesByName.has(file.fileName)) {
          sourceFilesByName.set(file.fileName, file);
        }
      }
      missingModelResRefs = vanillaResult.missingModelResRefs;
    }
    const sourceFiles = [...sourceFilesByName.values()];
    const requestedTextureResRefs = normalizeRequestedTextureResrefs([
      ...collectTileModelTextureReferences(requestedModelResRefs, sourceFiles),
      ...directTextureResRefs
    ]);
    const textureFilesByName = new Map<string, TextureSourceFile>();
    const resolvedTextureResRefs = new Set<string>();
    const loadTextureSources = async (textureResRefs: string[]): Promise<void> => {
      const normalizedTextureResRefs = normalizeRequestedTextureResrefs(textureResRefs);
      if (normalizedTextureResRefs.length === 0) {
        return;
      }
      normalizedTextureResRefs.forEach((resref) => resolvedTextureResRefs.add(resref));
      if (settings.sources.tile.includeHaks) {
        const hakTextureFiles = await readHakTextureAssets(
          tileHakPaths,
          normalizedTextureResRefs,
          this.logger
        );
        for (const file of hakTextureFiles) {
          textureFilesByName.set(file.fileName, file);
        }
      }
      if (!settings.sources.tile.includeVanilla) {
        return;
      }
      const missingTextureResRefs = normalizedTextureResRefs.filter(
        (resref) => !hasTextureSourceForResref(textureFilesByName.values(), resref)
      );
      if (missingTextureResRefs.length > 0) {
        const vanillaTextureFiles = await readVanillaTextureAssetsFromKeyBif(
          vanillaDataPath,
          missingTextureResRefs,
          this.logger
        );
        for (const file of vanillaTextureFiles) {
          if (!textureFilesByName.has(file.fileName)) {
            textureFilesByName.set(file.fileName, file);
          }
        }
      }
    };
    await loadTextureSources(requestedTextureResRefs);
    // Aurora MTR files are material manifests, not browser-decodable images.
    // Resolve their authored texture slots and sync those raster resources as
    // part of the same targeted tile operation. A small bounded loop supports
    // nested material manifests without allowing malformed content to recurse.
    for (let depth = 0; depth < 4; depth += 1) {
      const materialDependencies = collectAuroraMtrTextureReferencesFromFiles(
        textureFilesByName.values()
      ).filter((resref) => !resolvedTextureResRefs.has(resref));
      if (materialDependencies.length === 0) {
        break;
      }
      await loadTextureSources(materialDependencies);
    }
    const textureFiles = [...textureFilesByName.values()];
    const derivedAssets = await this.generateDerivedAssetFiles(settings, sourceFiles);
    const derivedAssetFileNames = new Set(
      derivedAssets.files.map((file) => file.fileName)
    );
    const storedFiles: VanillaTileModelSourceSyncEnvelope["files"] = [];
    let uploadedBytes = 0;
    for (const file of [...textureFiles, ...sourceFiles, ...derivedAssets.files]) {
      const stored = await this.moduleBlobStorage.putModuleObject(settings.blobStorage, file);
      if (derivedAssetFileNames.has(file.fileName)) {
        await waitForStoredModuleObjectBytes(
          this.moduleBlobStorage,
          settings.blobStorage,
          stored.key,
          file.bytes
        );
      }
      uploadedBytes += stored.size;
      storedFiles.push({
        fileName: file.fileName,
        objectKey: stored.key,
        size: stored.size,
        resourceType: file.resourceType,
        ...(stored.etag ? { etag: stored.etag } : {})
      });
    }
    const textureIndexStored = await this.upsertTextureIndexFiles(settings, textureFiles);
    if (textureIndexStored) {
      uploadedBytes += textureIndexStored.size;
      storedFiles.push({
        fileName: TEXTURE_INDEX_FILE_NAME,
        objectKey: textureIndexStored.key,
        size: textureIndexStored.size,
        resourceType: 0,
        ...(textureIndexStored.etag ? { etag: textureIndexStored.etag } : {})
      });
    }

    return {
      mode: "vanilla-tile-model-source-sync",
      settingsRevision: settings.revision,
      triggeredBy,
      triggeredAt: new Date().toISOString(),
      enabled: true,
      source: {
        vanillaDataPath,
        hakPaths: tileHakPaths
      },
      requestedModelResRefs,
      missingModelResRefs,
      uploadedFiles: storedFiles.length,
      uploadedBytes,
      derivedAssets: derivedAssets.summary,
      files: storedFiles
    };
  }

  async syncPlaceableModelSources(
    triggeredBy: string,
    request: PlaceableModelSourceSyncRequest
  ): Promise<PlaceableModelSourceSyncEnvelope> {
    const settings = await this.repository.get();
    const vanillaDataPath = resolveFilePath(settings.paths.vanillaDataPath.trim());
    const requestedAppearanceTypes = normalizeRequestedAppearanceTypes(
      request.appearanceTypes ?? []
    );
    const directModelResRefs = normalizeRequestedVanillaModelResrefs(
      request.modelResRefs ?? []
    );
    const moduleIfoHakList = await readModuleIfOHakList(settings.paths.moduleDecompiledPath);
    const placeableHakPaths = settings.sources.placeable.includeHaks
      ? resolveHakSettingsByAsset(settings, moduleIfoHakList).placeable.hakPaths
      : [];

    if (!settings.sources.placeable.includeVanilla && !settings.sources.placeable.includeHaks) {
      return {
        mode: "placeable-model-source-sync",
        settingsRevision: settings.revision,
        triggeredBy,
        triggeredAt: new Date().toISOString(),
        enabled: false,
        source: {
          vanillaDataPath,
          hakPaths: placeableHakPaths
        },
        requestedAppearanceTypes,
        resolvedAppearanceModels: [],
        missingAppearanceTypes: requestedAppearanceTypes,
        requestedModelResRefs: directModelResRefs,
        missingModelResRefs: directModelResRefs,
        uploadedFiles: 0,
        uploadedBytes: 0,
        derivedAssets: buildSkippedDerivedAssetSummary("placeable_model_sources_disabled"),
        files: [],
        skippedReason: "placeable_model_sources_disabled"
      };
    }

    if (!this.moduleBlobStorage.putModuleObject) {
      return {
        mode: "placeable-model-source-sync",
        settingsRevision: settings.revision,
        triggeredBy,
        triggeredAt: new Date().toISOString(),
        enabled: true,
        source: {
          vanillaDataPath,
          hakPaths: placeableHakPaths
        },
        requestedAppearanceTypes,
        resolvedAppearanceModels: [],
        missingAppearanceTypes: requestedAppearanceTypes,
        requestedModelResRefs: directModelResRefs,
        missingModelResRefs: directModelResRefs,
        uploadedFiles: 0,
        uploadedBytes: 0,
        derivedAssets: buildSkippedDerivedAssetSummary("module_blob_storage_put_unavailable"),
        files: [],
        skippedReason: "module_blob_storage_put_unavailable"
      };
    }

    const sourceFilesByName = new Map<string, PackedModuleFile>();
    const textureFilesByName = new Map<string, TextureSourceFile>();
    const appearanceModelByRowId = new Map<number, string>();

    if (settings.sources.placeable.includeHaks) {
      const hakTwoDa = await readHakPlaceablesTwoDaAssets(
        placeableHakPaths,
        this.logger
      );
      for (const file of hakTwoDa.files) {
        sourceFilesByName.set(file.fileName, file);
      }
      for (const [rowId, modelResRef] of hakTwoDa.appearanceModelByRowId) {
        if (!appearanceModelByRowId.has(rowId)) {
          appearanceModelByRowId.set(rowId, modelResRef);
        }
      }
      const hakTemplates = await readHakPlaceableTemplateAssets(
        placeableHakPaths,
        this.logger
      );
      for (const file of hakTemplates) {
        sourceFilesByName.set(file.fileName, file);
      }
    }

    if (settings.sources.placeable.includeVanilla) {
      const vanillaTwoDa = await readVanillaPlaceablesTwoDaAsset(vanillaDataPath, this.logger);
      if (vanillaTwoDa) {
        for (const file of vanillaTwoDa.files) {
          sourceFilesByName.set(file.fileName, file);
        }
        for (const [rowId, modelResRef] of vanillaTwoDa.appearanceModelByRowId) {
          if (!appearanceModelByRowId.has(rowId)) {
            appearanceModelByRowId.set(rowId, modelResRef);
          }
        }
      }
      const vanillaTemplates = await readVanillaPlaceableTemplateAssetsFromKeyBif(
        vanillaDataPath,
        this.logger
      );
      for (const file of vanillaTemplates) {
        sourceFilesByName.set(file.fileName, file);
      }
    }

    const resolvedAppearanceModels: PlaceableModelSourceSyncEnvelope["resolvedAppearanceModels"] = [];
    for (const appearanceType of requestedAppearanceTypes) {
      const modelResRef = appearanceModelByRowId.get(appearanceType);
      if (modelResRef) {
        resolvedAppearanceModels.push({
          appearanceType,
          modelResRef,
          source2da: "placeables.2da"
        });
      }
    }
    const missingAppearanceTypes = requestedAppearanceTypes.filter(
      (appearanceType) => !appearanceModelByRowId.has(appearanceType)
    );
    const requestedModelResRefs = normalizeRequestedVanillaModelResrefs([
      ...directModelResRefs,
      ...resolvedAppearanceModels.map((entry) => entry.modelResRef)
    ]);

    let missingModelResRefs = requestedModelResRefs;
    if (settings.sources.placeable.includeHaks && missingModelResRefs.length > 0) {
      const hakAssets = await readHakPlaceableModelAssets(
        placeableHakPaths,
        missingModelResRefs,
        this.packedModuleExtractor,
        this.logger
      );
      for (const file of hakAssets.files) {
        sourceFilesByName.set(file.fileName, file);
      }
      for (const file of hakAssets.textureFiles) {
        textureFilesByName.set(file.fileName, file);
      }
      missingModelResRefs = hakAssets.missingModelResRefs;
    }

    if (settings.sources.placeable.includeVanilla && missingModelResRefs.length > 0) {
      const vanillaAssets = await readVanillaPlaceableModelAssetsFromKeyBif(
        vanillaDataPath,
        missingModelResRefs,
        this.logger
      );
      for (const file of vanillaAssets.files) {
        sourceFilesByName.set(file.fileName, file);
      }
      missingModelResRefs = vanillaAssets.missingModelResRefs;
    }

    const requestedTextureResRefs = collectAuroraMdlTextureReferencesFromFiles([
      ...sourceFilesByName.values()
    ]);
    if (requestedTextureResRefs.length > 0 && settings.sources.placeable.includeHaks) {
      const hakTextures = await readHakTextureAssets(
        placeableHakPaths,
        requestedTextureResRefs,
        this.logger
      );
      for (const file of hakTextures) {
        textureFilesByName.set(file.fileName, file);
      }
    }
    if (requestedTextureResRefs.length > 0 && settings.sources.placeable.includeVanilla) {
      const missingTextureResRefs = requestedTextureResRefs.filter(
        (resref) => !hasTextureSourceForResref(textureFilesByName.values(), resref)
      );
      if (missingTextureResRefs.length > 0) {
        const vanillaTextures = await readVanillaTextureAssetsFromKeyBif(
          vanillaDataPath,
          missingTextureResRefs,
          this.logger
        );
        for (const file of vanillaTextures) {
          if (!textureFilesByName.has(file.fileName)) {
            textureFilesByName.set(file.fileName, file);
          }
        }
      }
    }

    const sourceFiles = [...sourceFilesByName.values()];
    const textureFiles = [...textureFilesByName.values()];
    const derivedAssets = await this.generateDerivedAssetFiles(settings, sourceFiles);
    const storedFiles: PlaceableModelSourceSyncEnvelope["files"] = [];
    let uploadedBytes = 0;
    for (const file of [...textureFiles, ...sourceFiles, ...derivedAssets.files]) {
      const stored = await this.moduleBlobStorage.putModuleObject(settings.blobStorage, file);
      uploadedBytes += stored.size;
      storedFiles.push({
        fileName: file.fileName,
        objectKey: stored.key,
        size: stored.size,
        resourceType: file.resourceType,
        ...(stored.etag ? { etag: stored.etag } : {})
      });
    }
    const textureIndexStored = await this.upsertTextureIndexFiles(settings, textureFiles);
    if (textureIndexStored) {
      uploadedBytes += textureIndexStored.size;
      storedFiles.push({
        fileName: TEXTURE_INDEX_FILE_NAME,
        objectKey: textureIndexStored.key,
        size: textureIndexStored.size,
        resourceType: 0,
        ...(textureIndexStored.etag ? { etag: textureIndexStored.etag } : {})
      });
    }

    return {
      mode: "placeable-model-source-sync",
      settingsRevision: settings.revision,
      triggeredBy,
      triggeredAt: new Date().toISOString(),
      enabled: true,
      source: {
        vanillaDataPath,
        hakPaths: placeableHakPaths
      },
      requestedAppearanceTypes,
      resolvedAppearanceModels,
      missingAppearanceTypes,
      requestedModelResRefs,
      missingModelResRefs,
      uploadedFiles: storedFiles.length,
      uploadedBytes,
      derivedAssets: derivedAssets.summary,
      files: storedFiles
    };
  }

  async syncCreatureTemplateSources(
    triggeredBy: string
  ): Promise<CreatureTemplateSourceSyncEnvelope> {
    const settings = await this.repository.get();
    const vanillaDataPath = resolveFilePath(settings.paths.vanillaDataPath.trim());
    const moduleIfoHakList = await readModuleIfOHakList(settings.paths.moduleDecompiledPath);
    const creatureHakPaths = settings.sources.creature?.includeHaks
      ? resolveHakSettingsByAsset(settings, moduleIfoHakList).creature.hakPaths
      : [];
    const uniqueHakPaths = deduplicateOrdered(creatureHakPaths);

    if (
      settings.sources.creature?.includeVanilla !== true &&
      settings.sources.creature?.includeHaks !== true
    ) {
      return {
        mode: "creature-template-source-sync",
        settingsRevision: settings.revision,
        triggeredBy,
        triggeredAt: new Date().toISOString(),
        enabled: false,
        source: {
          vanillaDataPath,
          hakPaths: uniqueHakPaths,
          missingHakPaths: []
        },
        discoveredHakTemplates: 0,
        discoveredVanillaTemplates: 0,
        uploadedFiles: 0,
        uploadedBytes: 0,
        files: [],
        skippedReason: "creature_template_sources_disabled"
      };
    }

    if (!this.moduleBlobStorage.putModuleObject) {
      return {
        mode: "creature-template-source-sync",
        settingsRevision: settings.revision,
        triggeredBy,
        triggeredAt: new Date().toISOString(),
        enabled: true,
        source: {
          vanillaDataPath,
          hakPaths: uniqueHakPaths,
          missingHakPaths: []
        },
        discoveredHakTemplates: 0,
        discoveredVanillaTemplates: 0,
        uploadedFiles: 0,
        uploadedBytes: 0,
        files: [],
        skippedReason: "module_blob_storage_put_unavailable"
      };
    }

    const filesByName = new Map<string, PackedModuleFile>();
    const missingHakPaths: string[] = [];
    let discoveredHakTemplates = 0;
    let discoveredVanillaTemplates = 0;

    if (settings.sources.creature?.includeHaks === true) {
      for (const hakPath of uniqueHakPaths) {
        const resolved = resolveFilePath(hakPath);
        if (!(await existsAsFile(resolved))) {
          missingHakPaths.push(resolved);
          this.logger.warn(
            `Skipping creature template HAK source because file does not exist: ${resolved}`
          );
          continue;
        }
        try {
          const startedAt = Date.now();
          const hakName = sanitizeSegment(basename(resolved, extname(resolved)));
          const creatureTemplates = await readCreatureTemplateFilesFromHak(
            resolved,
            hakName
          );
          this.logger.log(
            JSON.stringify({
              event: "creatureTemplateSourceSyncHak",
              hakPath: resolved,
              discoveredFiles: creatureTemplates.length,
              elapsedMs: Date.now() - startedAt
            })
          );
          discoveredHakTemplates += creatureTemplates.length;
          for (const asset of creatureTemplates) {
            filesByName.set(asset.fileName, {
              fileName: asset.fileName,
              resourceType: asset.resourceType,
              bytes: Buffer.from(asset.bytes)
            });
          }
        } catch (error) {
          this.logger.warn(
            `Skipping creature template HAK source because extraction failed (${resolved}): ${stringifyError(error)}`
          );
        }
      }
    }

    if (settings.sources.creature?.includeVanilla === true) {
      if (await existsAsDirectory(vanillaDataPath)) {
        const vanillaCreatureTemplateFiles = await readVanillaCreatureTemplateAssetsFromKeyBif(
          vanillaDataPath,
          this.logger
        );
        discoveredVanillaTemplates = vanillaCreatureTemplateFiles.length;
        for (const file of vanillaCreatureTemplateFiles) {
          filesByName.set(file.fileName, file);
        }
      } else {
        this.logger.warn(
          `Skipping vanilla creature template source because directory does not exist: ${vanillaDataPath}`
        );
      }
    }

    const files = [...filesByName.values()];
    const storedFiles: CreatureTemplateSourceSyncEnvelope["files"] = [];
    let uploadedBytes = 0;
    for (const file of files) {
      const stored = await this.moduleBlobStorage.putModuleObject(settings.blobStorage, file);
      uploadedBytes += stored.size;
      storedFiles.push({
        fileName: file.fileName,
        objectKey: stored.key,
        size: stored.size,
        resourceType: file.resourceType,
        ...(stored.etag ? { etag: stored.etag } : {})
      });
    }

    return {
      mode: "creature-template-source-sync",
      settingsRevision: settings.revision,
      triggeredBy,
      triggeredAt: new Date().toISOString(),
      enabled: true,
      source: {
        vanillaDataPath,
        hakPaths: uniqueHakPaths,
        missingHakPaths
      },
      discoveredHakTemplates,
      discoveredVanillaTemplates,
      uploadedFiles: storedFiles.length,
      uploadedBytes,
      files: storedFiles
    };
  }

  async syncItemTemplateSources(
    triggeredBy: string
  ): Promise<ItemTemplateSourceSyncEnvelope> {
    const settings = await this.repository.get();
    const itemSource = settings.sources.item ?? DEFAULT_ITEM_SOURCE_SETTINGS;
    const vanillaDataPath = resolveFilePath(settings.paths.vanillaDataPath.trim());
    const moduleIfoHakList = await readModuleIfOHakList(settings.paths.moduleDecompiledPath);
    const itemHakPaths = itemSource.includeHaks
      ? resolveHakSettingsByAsset(settings, moduleIfoHakList).item.hakPaths
      : [];
    const uniqueHakPaths = deduplicateOrdered(itemHakPaths);

    if (!itemSource.includeVanilla && !itemSource.includeHaks) {
      return {
        mode: "item-template-source-sync",
        settingsRevision: settings.revision,
        triggeredBy,
        triggeredAt: new Date().toISOString(),
        enabled: false,
        source: {
          vanillaDataPath,
          hakPaths: uniqueHakPaths,
          missingHakPaths: []
        },
        discoveredHakTemplates: 0,
        discoveredVanillaTemplates: 0,
        uploadedFiles: 0,
        uploadedBytes: 0,
        files: [],
        skippedReason: "item_template_sources_disabled"
      };
    }

    if (!this.moduleBlobStorage.putModuleObject) {
      return {
        mode: "item-template-source-sync",
        settingsRevision: settings.revision,
        triggeredBy,
        triggeredAt: new Date().toISOString(),
        enabled: true,
        source: {
          vanillaDataPath,
          hakPaths: uniqueHakPaths,
          missingHakPaths: []
        },
        discoveredHakTemplates: 0,
        discoveredVanillaTemplates: 0,
        uploadedFiles: 0,
        uploadedBytes: 0,
        files: [],
        skippedReason: "module_blob_storage_put_unavailable"
      };
    }

    const filesByName = new Map<string, PackedModuleFile>();
    const missingHakPaths: string[] = [];
    let discoveredHakTemplates = 0;
    let discoveredVanillaTemplates = 0;

    if (itemSource.includeHaks) {
      for (const hakPath of uniqueHakPaths) {
        const resolved = resolveFilePath(hakPath);
        if (!(await existsAsFile(resolved))) {
          missingHakPaths.push(resolved);
          this.logger.warn(
            `Skipping item template HAK source because file does not exist: ${resolved}`
          );
          continue;
        }
        try {
          const startedAt = Date.now();
          const hakName = sanitizeSegment(basename(resolved, extname(resolved)));
          const itemTemplates = await readItemTemplateFilesFromHak(resolved, hakName);
          this.logger.log(
            JSON.stringify({
              event: "itemTemplateSourceSyncHak",
              hakPath: resolved,
              discoveredFiles: itemTemplates.length,
              elapsedMs: Date.now() - startedAt
            })
          );
          discoveredHakTemplates += itemTemplates.length;
          for (const asset of itemTemplates) {
            filesByName.set(asset.fileName, {
              fileName: asset.fileName,
              resourceType: asset.resourceType,
              bytes: Buffer.from(asset.bytes)
            });
          }
        } catch (error) {
          this.logger.warn(
            `Skipping item template HAK source because extraction failed (${resolved}): ${stringifyError(error)}`
          );
        }
      }
    }

    if (itemSource.includeVanilla) {
      if (await existsAsDirectory(vanillaDataPath)) {
        const vanillaItemTemplateFiles = await readVanillaItemTemplateAssetsFromKeyBif(
          vanillaDataPath,
          this.logger
        );
        discoveredVanillaTemplates = vanillaItemTemplateFiles.length;
        for (const file of vanillaItemTemplateFiles) {
          filesByName.set(file.fileName, file);
        }
      } else {
        this.logger.warn(
          `Skipping vanilla item template source because directory does not exist: ${vanillaDataPath}`
        );
      }
    }

    const files = [...filesByName.values()];
    const storedFiles: ItemTemplateSourceSyncEnvelope["files"] = [];
    let uploadedBytes = 0;
    for (const file of files) {
      const stored = await this.moduleBlobStorage.putModuleObject(settings.blobStorage, file);
      uploadedBytes += stored.size;
      storedFiles.push({
        fileName: file.fileName,
        objectKey: stored.key,
        size: stored.size,
        resourceType: file.resourceType,
        ...(stored.etag ? { etag: stored.etag } : {})
      });
    }

    return {
      mode: "item-template-source-sync",
      settingsRevision: settings.revision,
      triggeredBy,
      triggeredAt: new Date().toISOString(),
      enabled: true,
      source: {
        vanillaDataPath,
        hakPaths: uniqueHakPaths,
        missingHakPaths
      },
      discoveredHakTemplates,
      discoveredVanillaTemplates,
      uploadedFiles: storedFiles.length,
      uploadedBytes,
      files: storedFiles
    };
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

  private async loadModuleAreaSourceFiles(
    settings: RuntimeSettingsRecord
  ): Promise<
    | {
        type: "decompiled" | "packed";
        path: string;
        files: PackedModuleFile[];
      }
    | {
        type: "none";
        path: string;
        files: [];
      }
  > {
    const decompiledPath = settings.paths.moduleDecompiledPath.trim();
    if (settings.sources.area.includeModuleTemp0 && decompiledPath.length > 0) {
      const resolvedPath = resolveModulePath(decompiledPath);
      const files = await readDecompiledModuleAreaSourceFiles(resolvedPath);
      return {
        type: "decompiled",
        path: resolvedPath,
        files
      };
    }

    const packedPath = settings.paths.modulePackedPath.trim();
    if (settings.sources.area.includeModulePacked && packedPath.length > 0) {
      const files = (await this.packedModuleExtractor.extractFromPackedModule(packedPath)).filter(
        (file) => isAreaModuleSourceFileName(file.fileName)
      );
      return {
        type: "packed",
        path: packedPath,
        files
      };
    }

    return {
      type: "none",
      path: "",
      files: []
    };
  }

  private async loadSourceSupplementFiles(
    settings: RuntimeSettingsRecord
  ): Promise<SourceSupplementResult> {
    const textureFiles: TextureSourceFile[] = [];
    const placeableAssetFiles: PackedModuleFile[] = [];
    const creatureTemplateFiles: PackedModuleFile[] = [];
    const soundAssetFiles: PackedModuleFile[] = [];
    let hakTextures = 0;
    let hakPlaceableAssets = 0;
    let hakCreatureTemplates = 0;
    let hakSounds = 0;
    let vanillaTextures = 0;
    let vanillaCreatureTemplates = 0;
    let vanillaSounds = 0;

    const moduleIfoHakList = await readModuleIfOHakList(settings.paths.moduleDecompiledPath);
    const hakPaths = collectEnabledHakPaths(settings, moduleIfoHakList);
    const uniqueHakPaths = deduplicateOrdered(hakPaths);
    for (const hakPath of uniqueHakPaths) {
      const resolved = resolveFilePath(hakPath);
      if (!(await existsAsFile(resolved))) {
        this.logger.warn(`Skipping HAK supplement source because file does not exist: ${resolved}`);
        continue;
      }

      try {
        const extracted = await this.packedModuleExtractor.extractFromPackedModule(resolved);
        const extractedTextureFiles = extracted.filter((entry) =>
          isTextureFileName(entry.fileName)
        );
        const hakName = sanitizeSegment(basename(resolved, extname(resolved)));
        for (const texture of extractedTextureFiles) {
          textureFiles.push({
            fileName: normalizeRelativePath(`__aurora/sources/hak/${hakName}/${texture.fileName}`),
            resourceType: texture.resourceType,
            bytes: Buffer.from(texture.bytes),
            source: "hak",
            sourcePath: normalizeRelativePath(resolved)
          });
        }
        const extractedPlaceableAssetFiles = extracted.filter(
          (entry) =>
            isPlaceableHakAssetFileName(entry.fileName) &&
            !isTextureFileName(entry.fileName)
        );
        const extractedCreatureTemplateFiles = extracted.filter((entry) =>
          isCreatureTemplateAssetFileName(entry.fileName)
        );
        const extractedSoundAssetFiles = extracted.filter((entry) =>
          isSoundAssetFileName(entry.fileName)
        );
        for (const asset of extractedPlaceableAssetFiles) {
          placeableAssetFiles.push({
            fileName: normalizeRelativePath(`__aurora/sources/hak/${hakName}/${asset.fileName}`),
            resourceType: asset.resourceType,
            bytes: Buffer.from(asset.bytes)
          });
        }
        for (const asset of extractedCreatureTemplateFiles) {
          creatureTemplateFiles.push({
            fileName: normalizeRelativePath(`__aurora/sources/hak/${hakName}/${asset.fileName}`),
            resourceType: asset.resourceType,
            bytes: Buffer.from(asset.bytes)
          });
        }
        for (const asset of extractedSoundAssetFiles) {
          soundAssetFiles.push({
            fileName: normalizeRelativePath(`__aurora/sources/hak/${hakName}/${asset.fileName}`),
            resourceType: asset.resourceType,
            bytes: Buffer.from(asset.bytes)
          });
        }
        hakTextures += extractedTextureFiles.length;
        hakPlaceableAssets += extractedPlaceableAssetFiles.length;
        hakCreatureTemplates += extractedCreatureTemplateFiles.length;
        hakSounds += extractedSoundAssetFiles.length;
      } catch (error) {
        this.logger.warn(
          `Skipping HAK supplement source because extraction failed (${resolved}): ${stringifyError(error)}`
        );
      }
    }

    const includeVanillaTextures = shouldIncludeVanillaTextures(settings);
    const includeVanillaSounds = settings.sources.sound.includeVanilla;
    const includeVanilla = includeVanillaTextures || includeVanillaSounds;
    if (includeVanilla) {
      const vanillaRoot = resolveFilePath(settings.paths.vanillaDataPath.trim());
      if (await existsAsDirectory(vanillaRoot)) {
        if (includeVanillaTextures) {
          const vanillaTextureFilesByName = new Map<string, TextureSourceFile>();
          const vanillaFiles = await readTextureFilesFromDirectory(vanillaRoot, vanillaRoot);
          for (const texture of vanillaFiles) {
            const file: TextureSourceFile = {
              fileName: normalizeRelativePath(`__aurora/sources/vanilla/${texture.relativePath}`),
              resourceType: texture.resourceType,
              bytes: texture.bytes,
              source: "vanilla",
              sourcePath: texture.relativePath
            };
            vanillaTextureFilesByName.set(file.fileName, file);
          }
          textureFiles.push(...vanillaTextureFilesByName.values());
          vanillaTextures += vanillaTextureFilesByName.size;
        }
        if (settings.sources.placeable.includeVanilla) {
          const vanillaPlaceableAssets = await readVanillaPlaceableCatalogAssetsFromKeyBif(
            vanillaRoot,
            this.logger
          );
          placeableAssetFiles.push(...vanillaPlaceableAssets);
        }
        if (settings.sources.tile.includeVanilla) {
          const vanillaTilesetSetAssets = await readVanillaTilesetSetAssetsFromKeyBif(
            vanillaRoot,
            this.logger
          );
          placeableAssetFiles.push(...vanillaTilesetSetAssets);
        }
        if (settings.sources.creature?.includeVanilla === true) {
          const vanillaCreatureTemplateFiles = await readVanillaCreatureTemplateAssetsFromKeyBif(
            vanillaRoot,
            this.logger
          );
          creatureTemplateFiles.push(...vanillaCreatureTemplateFiles);
          vanillaCreatureTemplates += vanillaCreatureTemplateFiles.length;
        }
        if (settings.sources.sound.includeVanilla) {
          const vanillaSoundFiles = await readSoundFilesFromDirectory(vanillaRoot, vanillaRoot);
          const vanillaSoundAssets = await readVanillaSoundAssetsFromKeyBif(
            vanillaRoot,
            this.logger
          );
          soundAssetFiles.push(...vanillaSoundFiles);
          soundAssetFiles.push(...vanillaSoundAssets);
          vanillaSounds += vanillaSoundFiles.length + vanillaSoundAssets.length;
        }
      } else {
        this.logger.warn(
          `Skipping vanilla supplement source because directory does not exist: ${vanillaRoot}`
        );
      }
    }

    return {
      textureFiles,
      placeableAssetFiles,
      creatureTemplateFiles,
      soundAssetFiles,
      summary: {
        hakTextures,
        hakPlaceableAssets,
        hakCreatureTemplates,
        hakSounds,
        vanillaTextures,
        vanillaCreatureTemplates,
        vanillaSounds
      }
    };
  }

  private async readTextureIndexRecord(
    settings: RuntimeSettingsRecord,
    indexObjectKey: string
  ): Promise<TextureIndexRecord | null> {
    let payload: ModuleBlobObjectPayload | null;
    try {
      payload = await this.moduleBlobStorage.getModuleObject(
        settings.blobStorage,
        indexObjectKey
      );
    } catch (error) {
      this.logger.warn(
        `Texture index payload could not be loaded from blob storage; falling back to unavailable index. objectKey=${indexObjectKey}; error=${stringifyError(
          error
        )}`
      );
      return null;
    }
    if (!payload) {
      return null;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(payload.bytes.toString("utf-8"));
    } catch (error) {
      this.logger.warn(
        `Texture index payload is malformed JSON; falling back to unavailable index. objectKey=${indexObjectKey}; error=${stringifyError(
          error
        )}`
      );
      return null;
    }

    try {
      return parseTextureIndexRecord(parsed);
    } catch (error) {
      this.logger.warn(
        `Texture index payload has invalid schema; falling back to unavailable index. objectKey=${indexObjectKey}; error=${stringifyError(
          error
        )}`
      );
      return null;
    }
  }

  private async getTextureIndexLookup(
    settings: RuntimeSettingsRecord,
    indexObjectKey: string
  ): Promise<TextureIndexLookup | null> {
    const cacheKey = buildTextureIndexLookupCacheKey(settings, indexObjectKey);
    const now = Date.now();
    const cached = this.textureIndexLookupCache;
    if (
      cached &&
      cached.cacheKey === cacheKey &&
      now - cached.fetchedAtMs < TEXTURE_INDEX_LOOKUP_CACHE_TTL_MS
    ) {
      return {
        record: cached.record,
        byTextureId: cached.byTextureId,
        byResrefEntries: cached.byResrefEntries
      };
    }

    const record = await this.readTextureIndexRecord(settings, indexObjectKey);
    if (!record) {
      if (cached?.cacheKey === cacheKey) {
        this.clearTextureIndexLookupCache();
      }
      return null;
    }

    return this.primeTextureIndexLookupCache(settings, indexObjectKey, record);
  }

  private primeTextureIndexLookupCache(
    settings: RuntimeSettingsRecord,
    indexObjectKey: string,
    record: TextureIndexRecord
  ): TextureIndexLookup {
    const byTextureId = new Map<string, TextureIndexEntry>();
    const byResrefEntries = new Map<string, TextureIndexEntry[]>();

    for (const entry of record.entries) {
      const normalizedTextureId = entry.textureId.trim().toLowerCase();
      byTextureId.set(normalizedTextureId, entry);

      const normalizedResref = entry.resref.trim().toLowerCase();
      const bucket = byResrefEntries.get(normalizedResref) ?? [];
      bucket.push(entry);
      byResrefEntries.set(normalizedResref, bucket);
    }

    this.textureIndexLookupCache = {
      cacheKey: buildTextureIndexLookupCacheKey(settings, indexObjectKey),
      record,
      byTextureId,
      byResrefEntries,
      fetchedAtMs: Date.now()
    };

    return {
      record,
      byTextureId,
      byResrefEntries
    };
  }

  private async upsertTextureIndexFiles(
    settings: RuntimeSettingsRecord,
    textureFiles: TextureSourceFile[]
  ): Promise<{ key: string; size: number; etag?: string } | null> {
    if (textureFiles.length === 0 || !this.moduleBlobStorage.putModuleObject) {
      return null;
    }

    const indexObjectKey = `${normalizeBlobPrefix(settings.blobStorage.modulePrefix)}${TEXTURE_INDEX_FILE_NAME}`;
    const existing = await this.readTextureIndexRecord(settings, indexObjectKey);
    const nextEntriesByObjectKey = new Map<string, TextureIndexEntry>();
    for (const entry of existing?.entries ?? []) {
      nextEntriesByObjectKey.set(entry.objectKey, entry);
    }

    const incomingRecord = buildTextureIndexRecord(
      settings.revision,
      settings.blobStorage.modulePrefix,
      textureFiles,
      settings.updatedAt
    );
    for (const entry of incomingRecord.entries) {
      nextEntriesByObjectKey.set(entry.objectKey, entry);
    }

    const nextRecord = buildTextureIndexRecordFromEntries(
      settings.revision,
      settings.blobStorage.modulePrefix,
      [...nextEntriesByObjectKey.values()],
      settings.updatedAt
    );
    const indexFile: PackedModuleFile = {
      fileName: TEXTURE_INDEX_FILE_NAME,
      resourceType: 0,
      bytes: Buffer.from(`${JSON.stringify(nextRecord, null, 2)}\n`, "utf-8")
    };
    const stored = await this.moduleBlobStorage.putModuleObject(
      settings.blobStorage,
      indexFile
    );
    this.primeTextureIndexLookupCache(settings, indexObjectKey, nextRecord);
    return {
      key: stored.key,
      size: stored.size,
      ...(stored.etag ? { etag: stored.etag } : {})
    };
  }

  private clearTextureIndexLookupCache(): void {
    this.textureIndexLookupCache = null;
  }

  private selectTextureEntries(
    entries: TextureIndexEntry[],
    textureIds?: string[]
  ): TextureIndexEntry[] {
    if (!textureIds || textureIds.length === 0) {
      return entries;
    }

    const byId = new Map(entries.map((entry) => [entry.textureId, entry]));
    return textureIds.map((textureId) => {
      const found = byId.get(textureId);
      if (found) {
        return found;
      }

      throw new AppException({
        status: 404,
        code: "TEXTURE_NOT_FOUND",
        message: `Texture id was not found in texture index: ${textureId}`
      });
    });
  }
}

export function resolveHakSettingsByAsset(
  settings: RuntimeSettingsRecord,
  moduleIfoHakList: string[] = []
): ResolvedHakSettingsByAsset {
  const resolved = {} as ResolvedHakSettingsByAsset;
  for (const assetKind of RUNTIME_ASSET_KINDS) {
    const source =
      settings.sources[assetKind] ??
      (assetKind === "creature"
        ? DEFAULT_CREATURE_SOURCE_SETTINGS
        : assetKind === "item"
          ? DEFAULT_ITEM_SOURCE_SETTINGS
          : settings.sources.placeable);
    resolved[assetKind] = resolveSingleSourceHakSettings(
      resolveHakDirectories(settings.paths),
      settings.hakProfiles,
      source,
      assetKind === "placeable" || assetKind === "creature" || assetKind === "tile"
        ? moduleIfoHakList
        : []
    );
  }

  return resolved;
}

function resolveSingleSourceHakSettings(
  hakDirectoryPaths: string[],
  hakProfiles: Record<string, string[]>,
  source: RuntimeSourceSettings,
  fallbackHakList: string[] = []
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
      hakPaths: resolveHakPaths(hakDirectoryPaths, list)
    };
  }

  if (fallbackHakList.length > 0) {
    const list = deduplicateOrdered(fallbackHakList);
    return {
      mode: "module_ifo",
      includeHaks: true,
      hakProfileId: source.hakProfileId.trim() || null,
      hakPriorityList: list,
      hakPaths: resolveHakPaths(hakDirectoryPaths, list)
    };
  }

  const hakProfileId = source.hakProfileId.trim();
  if (hakProfileId.length > 0) {
    const list = deduplicateOrdered(hakProfiles[hakProfileId] ?? []);
    if (list.length > 0) {
      return {
        mode: "profile",
        includeHaks: true,
        hakProfileId,
        hakPriorityList: list,
        hakPaths: resolveHakPaths(hakDirectoryPaths, list)
      };
    }
  }

  return {
    mode: "none",
    includeHaks: true,
    hakProfileId: null,
    hakPriorityList: [],
    hakPaths: []
  };
}

export async function readModuleIfOHakList(moduleDecompiledPath: string): Promise<string[]> {
  const decompiledPath = moduleDecompiledPath.trim();
  if (!decompiledPath) {
    return [];
  }

  const moduleIfoPath = resolve(resolveModulePath(decompiledPath), "module.ifo");
  const bytes = await readFileIfExists(moduleIfoPath);
  if (!bytes) {
    return [];
  }

  return extractModuleIfoHakList(bytes);
}

async function readFileIfExists(pathValue: string): Promise<Buffer | null> {
  try {
    return await readFile(pathValue);
  } catch {
    return null;
  }
}

export function extractModuleIfoHakList(bytes: Buffer): string[] {
  try {
    const header = parseGffHeader(bytes);
    const labels = parseGffLabels(bytes, header);
    const structs = parseGffStructEntries(bytes, header);
    if (structs.length === 0) {
      return [];
    }

    const rootFieldRefs = parseStructFieldRefs(bytes, header, labels, structs[0]);
    const listField = rootFieldRefs.get("Mod_HakList");
    if (!listField || listField.typeId !== GFF_FIELD_TYPE.LIST) {
      return [];
    }

    const listIndexOffset = header.listIndicesOffset + listField.dataOrOffset;
    if (!isRangeWithinBuffer(bytes, listIndexOffset, 4)) {
      return [];
    }
    const count = bytes.readUInt32LE(listIndexOffset);
    const structIndicesOffset = listIndexOffset + 4;
    if (!isRangeWithinBuffer(bytes, structIndicesOffset, count * 4)) {
      return [];
    }

    const raw: string[] = [];
    for (let index = 0; index < count; index += 1) {
      const structIndex = bytes.readUInt32LE(structIndicesOffset + index * 4);
      if (structIndex >= structs.length) {
        continue;
      }

      const structFieldRefs = parseStructFieldRefs(bytes, header, labels, structs[structIndex]);
      const entryField = structFieldRefs.get("Mod_Hak");
      if (!entryField) {
        continue;
      }

      const value = readStringValue(bytes, header, entryField);
      const normalized = normalizeHakName(value);
      if (normalized.length > 0) {
        raw.push(normalized);
      }
    }

    // Preserve the serialized IFO order. Exact retail conflict precedence is
    // still an Aurora-first research gap (R79 H4/G6), so the parser must not
    // synthesize a reversed canonical order from a secondary implementation.
    return deduplicateOrdered(raw);
  } catch {
    return [];
  }
}

interface GffHeader {
  fileType: string;
  fileVersion: string;
  structOffset: number;
  structCount: number;
  fieldOffset: number;
  fieldCount: number;
  labelOffset: number;
  labelCount: number;
  fieldDataOffset: number;
  fieldDataCount: number;
  fieldIndicesOffset: number;
  fieldIndicesCount: number;
  listIndicesOffset: number;
  listIndicesCount: number;
}

interface GffStructEntry {
  typeId: number;
  dataOrOffset: number;
  fieldCount: number;
}

interface GffFieldRef {
  typeId: number;
  labelIndex: number;
  dataOrOffset: number;
}

const GFF_HEADER_SIZE_BYTES = 56;
const GFF_STRUCT_ENTRY_SIZE_BYTES = 12;
const GFF_FIELD_ENTRY_SIZE_BYTES = 12;
const GFF_LABEL_ENTRY_SIZE_BYTES = 16;

const GFF_FIELD_TYPE = {
  CEXOSTRING: 10,
  RESREF: 11,
  STRUCT: 14,
  LIST: 15
} as const;

function parseGffHeader(bytes: Buffer): GffHeader {
  if (bytes.length < GFF_HEADER_SIZE_BYTES) {
    throw new Error("GFF payload is too small.");
  }

  return {
    fileType: bytes.toString("ascii", 0, 4),
    fileVersion: bytes.toString("ascii", 4, 8),
    structOffset: bytes.readUInt32LE(8),
    structCount: bytes.readUInt32LE(12),
    fieldOffset: bytes.readUInt32LE(16),
    fieldCount: bytes.readUInt32LE(20),
    labelOffset: bytes.readUInt32LE(24),
    labelCount: bytes.readUInt32LE(28),
    fieldDataOffset: bytes.readUInt32LE(32),
    fieldDataCount: bytes.readUInt32LE(36),
    fieldIndicesOffset: bytes.readUInt32LE(40),
    fieldIndicesCount: bytes.readUInt32LE(44),
    listIndicesOffset: bytes.readUInt32LE(48),
    listIndicesCount: bytes.readUInt32LE(52)
  };
}

function parseGffLabels(bytes: Buffer, header: GffHeader): string[] {
  if (!isRangeWithinBuffer(bytes, header.labelOffset, header.labelCount * GFF_LABEL_ENTRY_SIZE_BYTES)) {
    throw new Error("GFF label table is invalid.");
  }

  const labels = new Array<string>(header.labelCount);
  for (let index = 0; index < header.labelCount; index += 1) {
    const offset = header.labelOffset + index * GFF_LABEL_ENTRY_SIZE_BYTES;
    labels[index] = bytes
      .subarray(offset, offset + GFF_LABEL_ENTRY_SIZE_BYTES)
      .toString("ascii")
      .replace(/\u0000+.*$/gu, "")
      .trim();
  }
  return labels;
}

function parseGffStructEntries(bytes: Buffer, header: GffHeader): GffStructEntry[] {
  if (
    !isRangeWithinBuffer(
      bytes,
      header.structOffset,
      header.structCount * GFF_STRUCT_ENTRY_SIZE_BYTES
    )
  ) {
    throw new Error("GFF struct table is invalid.");
  }

  const structs: GffStructEntry[] = new Array(header.structCount);
  for (let index = 0; index < header.structCount; index += 1) {
    const offset = header.structOffset + index * GFF_STRUCT_ENTRY_SIZE_BYTES;
    structs[index] = {
      typeId: bytes.readUInt32LE(offset),
      dataOrOffset: bytes.readUInt32LE(offset + 4),
      fieldCount: bytes.readUInt32LE(offset + 8)
    };
  }

  return structs;
}

function parseStructFieldRefs(
  bytes: Buffer,
  header: GffHeader,
  labels: string[],
  structEntry: GffStructEntry
): Map<string, GffFieldRef> {
  const refs = new Map<string, GffFieldRef>();
  const fieldIndices = resolveStructFieldIndices(bytes, header, structEntry);
  if (!fieldIndices) {
    return refs;
  }

  for (const fieldIndex of fieldIndices) {
    if (fieldIndex < 0 || fieldIndex >= header.fieldCount) {
      continue;
    }

    const fieldOffset = header.fieldOffset + fieldIndex * GFF_FIELD_ENTRY_SIZE_BYTES;
    const typeId = bytes.readUInt32LE(fieldOffset);
    const labelIndex = bytes.readUInt32LE(fieldOffset + 4);
    const dataOrOffset = bytes.readUInt32LE(fieldOffset + 8);

    const label = labels[labelIndex];
    if (!label) {
      continue;
    }

    refs.set(label, {
      typeId,
      labelIndex,
      dataOrOffset
    });
  }

  return refs;
}

function resolveStructFieldIndices(
  bytes: Buffer,
  header: GffHeader,
  structEntry: GffStructEntry
): number[] {
  if (structEntry.fieldCount === 0) {
    return [];
  }
  if (structEntry.fieldCount === 1) {
    return [structEntry.dataOrOffset];
  }
  const listOffset = header.fieldIndicesOffset + structEntry.dataOrOffset;
  const totalBytes = structEntry.fieldCount * 4;
  if (!isRangeWithinBuffer(bytes, listOffset, totalBytes)) {
    return [];
  }

  const indices: number[] = [];
  for (let index = 0; index < structEntry.fieldCount; index += 1) {
    indices.push(bytes.readUInt32LE(listOffset + index * 4));
  }
  return indices;
}

function readStringValue(bytes: Buffer, header: GffHeader, field: GffFieldRef): string {
  if (field.typeId === GFF_FIELD_TYPE.CEXOSTRING) {
    const lengthOffset = header.fieldDataOffset + field.dataOrOffset;
    if (!isRangeWithinBuffer(bytes, lengthOffset, 4)) {
      return "";
    }
    const length = bytes.readUInt32LE(lengthOffset);
    if (!isRangeWithinBuffer(bytes, lengthOffset + 4, length)) {
      return "";
    }
    return bytes.toString("utf-8", lengthOffset + 4, lengthOffset + 4 + length).trim();
  }

  if (field.typeId === GFF_FIELD_TYPE.RESREF) {
    const lengthOffset = header.fieldDataOffset + field.dataOrOffset;
    if (!isRangeWithinBuffer(bytes, lengthOffset, 1)) {
      return "";
    }
    const length = bytes.readUInt8(lengthOffset);
    if (!isRangeWithinBuffer(bytes, lengthOffset + 1, length)) {
      return "";
    }
    return bytes
      .toString("ascii", lengthOffset + 1, lengthOffset + 1 + length)
      .trim();
  }

  return "";
}

function normalizeHakName(value: string): string {
  const normalized = value.trim();
  if (!normalized) {
    return "";
  }
  if (normalized.toLowerCase().endsWith(".hak")) {
    return normalized.slice(0, -4);
  }
  return normalized;
}

function isRangeWithinBuffer(bytes: Buffer, offset: number, length: number): boolean {
  if (!Number.isInteger(offset) || !Number.isInteger(length)) {
    return false;
  }
  if (offset < 0 || length < 0) {
    return false;
  }
  return offset + length <= bytes.length;
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

function resolveHakDirectories(
  paths: Pick<RuntimeSettingsRecord["paths"], "hakDirectoryPath" | "hakDirectories">
): string[] {
  return deduplicateOrdered(
    [...(paths.hakDirectories ?? []), paths.hakDirectoryPath]
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
  );
}

function resolveHakPaths(hakDirectoryPaths: string[], entries: string[]): string[] {
  return deduplicateOrdered(
    entries.flatMap((entry) => {
      const normalizedEntry = normalizeHakPathEntry(entry);
      if (isAbsolute(normalizedEntry)) {
        return [resolveFilePath(normalizedEntry)];
      }
      return hakDirectoryPaths.map((directory) =>
        resolve(resolveFilePath(directory), normalizedEntry)
      );
    })
  );
}

function normalizeHakPathEntry(entry: string): string {
  const trimmed = entry.trim();
  if (!trimmed || trimmed.toLowerCase().endsWith(".hak")) {
    return trimmed;
  }
  return `${trimmed}.hak`;
}

function resolveModulePath(pathValue: string): string {
  const hostLocalPath = resolveHostLocalMountedPath(pathValue);
  return hostLocalPath ?? (isAbsolute(pathValue) ? pathValue : resolve(process.cwd(), pathValue));
}

function resolveFilePath(pathValue: string): string {
  const hostLocalPath = resolveHostLocalMountedPath(pathValue);
  return hostLocalPath ?? (isAbsolute(pathValue) ? pathValue : resolve(process.cwd(), pathValue));
}

interface RuntimePathOnboardingResolution {
  values: RuntimePathOnboardingInput;
  issues: RuntimePathReadinessIssue[];
  unresolvedFields: Set<string>;
}

function runtimePathSettingsNeedUpdate(
  settings: RuntimeSettingsRecord,
  hostValues: RuntimePathOnboardingInput
): boolean {
  const resolved = resolveRuntimePathOnboardingInput(hostValues);
  if (resolved.issues.length > 0) {
    return false;
  }
  const expected = resolved.values;
  const current = settings.paths;
  return (
    !sameRuntimePath(current.nwnUserDir ?? "", expected.nwnUserDir) ||
    !sameRuntimePath(current.nwnInstallDir ?? "", expected.nwnInstallDir) ||
    !sameRuntimePath(
      current.auroraReferenceDir ?? "",
      expected.auroraReferenceDir
    ) ||
    !sameRuntimePathList(
      current.hakDirectories ?? [],
      expected.hakDirectories
    ) ||
    !sameRuntimePathList(
      current.itemGeneratorSourceDirectories ?? [],
      expected.itemGeneratorSourceDirectories
    ) ||
    !sameRuntimePath(
      current.moduleDecompiledPath,
      expected.moduleDecompiledPath
    ) ||
    !sameRuntimePath(current.modulePackedPath, expected.modulePackedPath) ||
    !sameRuntimePath(
      current.tlkCustomPath,
      expected.tlkCustomPath ?? ""
    )
  );
}

function sameRuntimePath(left: string, right: string): boolean {
  return (
    left.trim().replace(/\\/gu, "/").replace(/\/+$/u, "") ===
    right.trim().replace(/\\/gu, "/").replace(/\/+$/u, "")
  );
}

function sameRuntimePathList(left: string[], right: string[]): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => sameRuntimePath(value, right[index] ?? ""))
  );
}

function resolveRuntimePathOnboardingInput(
  values: RuntimePathOnboardingInput
): RuntimePathOnboardingResolution {
  const issues: RuntimePathReadinessIssue[] = [];
  const unresolvedFields = new Set<string>();
  const translate = (
    field: string,
    hostPath: string,
    preferredVariable: RuntimePathMountVariable,
    restrictToPreferredMount = false
  ): string => {
    const result = translateHostPathToRuntime(hostPath, preferredVariable, {
      restrictToPreferredMount
    });
    if (result.ok) {
      return result.runtimePath;
    }
    unresolvedFields.add(field);
    issues.push({
      field,
      code: result.issue.code,
      message: result.issue.message,
      envVariable: result.issue.envVariable,
      hostPath: result.issue.hostPath,
      runtimePath: result.issue.runtimePath
    });
    return "";
  };

  return {
    values: {
      nwnUserDir: translate(
        "nwnUserDir",
        values.nwnUserDir,
        "NWN_USER_DIR_HOST",
        true
      ),
      nwnInstallDir: translate(
        "nwnInstallDir",
        values.nwnInstallDir,
        "NWN_INSTALL_DIR_HOST",
        true
      ),
      auroraReferenceDir: translate(
        "auroraReferenceDir",
        values.auroraReferenceDir,
        "AURORA_REFERENCE_DIR_HOST",
        true
      ),
      hakDirectories: values.hakDirectories.map((path, index) =>
        translate(
          `hakDirectories.${index}`,
          path,
          "NWN_USER_DIR_HOST"
        )
      ),
      itemGeneratorSourceDirectories:
        values.itemGeneratorSourceDirectories.map((path, index) =>
          translate(
            `itemGeneratorSourceDirectories.${index}`,
            path,
            "AURORA_REFERENCE_DIR_HOST"
          )
        ),
      moduleDecompiledPath: translate(
        "moduleDecompiledPath",
        values.moduleDecompiledPath,
        "NWN_USER_DIR_HOST"
      ),
      modulePackedPath: translate(
        "modulePackedPath",
        values.modulePackedPath,
        "NWN_USER_DIR_HOST"
      ),
      tlkCustomPath: translate(
        "tlkCustomPath",
        values.tlkCustomPath ?? "",
        "NWN_USER_DIR_HOST"
      )
    },
    issues,
    unresolvedFields
  };
}

function normalizeRuntimePathOnboardingInput(
  input: RuntimePathOnboardingInput
): RuntimePathOnboardingInput {
  return {
    nwnUserDir: input.nwnUserDir.trim(),
    nwnInstallDir: input.nwnInstallDir.trim(),
    auroraReferenceDir: input.auroraReferenceDir.trim(),
    hakDirectories: normalizePathList(input.hakDirectories),
    itemGeneratorSourceDirectories: normalizePathList(input.itemGeneratorSourceDirectories),
    moduleDecompiledPath: input.moduleDecompiledPath.trim(),
    modulePackedPath: input.modulePackedPath.trim(),
    tlkCustomPath: input.tlkCustomPath?.trim() ?? ""
  };
}

export async function waitForStoredModuleObjectBytes(
  storage: ModuleBlobStoragePort,
  settings: RuntimeSettingsRecord["blobStorage"],
  objectKey: string,
  expectedBytes: Buffer
): Promise<void> {
  let observed = await storage.getModuleObject(settings, objectKey);
  if (observed?.bytes.equals(expectedBytes)) {
    return;
  }

  for (const delayMs of MODULE_OBJECT_READ_AFTER_WRITE_DELAYS_MS) {
    await new Promise<void>((resolve) => globalThis.setTimeout(resolve, delayMs));
    observed = await storage.getModuleObject(settings, objectKey);
    if (observed?.bytes.equals(expectedBytes)) {
      return;
    }
  }

  throw new Error(
    `Module object read-after-write verification failed for ${objectKey}.`
  );
}

function normalizePathList(values: string[]): string[] {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))
  );
}

async function appendPathIssue(
  issues: RuntimePathReadinessIssue[],
  field: string,
  configuredPath: string,
  expectedType: "file" | "directory",
  displayPath = configuredPath
): Promise<void> {
  const resolvedPath = resolveFilePath(configuredPath);
  try {
    const metadata = await stat(resolvedPath);
    if (expectedType === "directory" && !metadata.isDirectory()) {
      issues.push({
        field,
        code: "PATH_NOT_DIRECTORY",
        message: `Expected a directory: ${displayPath}`
      });
    }
    if (expectedType === "file" && !metadata.isFile()) {
      issues.push({
        field,
        code: "PATH_NOT_FILE",
        message: `Expected a file: ${displayPath}`
      });
    }
  } catch {
    const mountRoot = findMissingMountRoot(configuredPath);
    const envVariable = mountRoot
      ? runtimeMountVariableForPath(mountRoot)
      : undefined;
    const environmentMount = envVariable
      ? getRuntimePathEnvironment().mounts.find(
          (mount) => mount.envVariable === envVariable
        )
      : undefined;
    issues.push({
      field,
      code: mountRoot && !(await existsAsDirectory(mountRoot))
        ? "MOUNT_NOT_AVAILABLE"
        : "PATH_NOT_FOUND",
      message: mountRoot
        ? `The real host path ${displayPath} is configured, but its Docker mount is not available to the backend.`
        : `Path does not exist: ${displayPath}`,
      ...(envVariable
        ? {
            envVariable,
            hostPath: environmentMount?.hostPath ?? displayPath,
            runtimePath: mountRoot ?? configuredPath
          }
        : {})
    });
  }
}

function findMissingMountRoot(pathValue: string): string | null {
  const normalized = pathValue.trim().replace(/\\/gu, "/");
  for (const mountRoot of [
    "/host/nwn-user",
    "/host/nwn-game",
    "/host/aurora-reference",
    "/host/nwn-docs"
  ]) {
    if (normalized === mountRoot || normalized.startsWith(`${mountRoot}/`)) {
      return mountRoot;
    }
  }
  return null;
}

async function readDecompiledModuleFiles(rootPath: string): Promise<PackedModuleFile[]> {
  const files: PackedModuleFile[] = [];
  await collectDirectoryFiles(rootPath, rootPath, files);
  return files;
}

async function readDecompiledModuleAreaSourceFiles(rootPath: string): Promise<PackedModuleFile[]> {
  const files: PackedModuleFile[] = [];
  await collectDirectoryAreaSourceFiles(rootPath, rootPath, files);
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

async function collectDirectoryAreaSourceFiles(
  rootPath: string,
  currentPath: string,
  files: PackedModuleFile[]
): Promise<void> {
  const entries = await readdir(currentPath, { withFileTypes: true });

  for (const entry of entries) {
    const absolutePath = resolve(currentPath, entry.name);
    if (entry.isDirectory()) {
      await collectDirectoryAreaSourceFiles(rootPath, absolutePath, files);
      continue;
    }

    if (!entry.isFile() || !isAreaModuleSourceFileName(entry.name)) {
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

function isAreaModuleSourceFileName(fileName: string): boolean {
  const extension = extname(fileName).replace(/^\./u, "").toLowerCase();
  return MODULE_AREA_SOURCE_EXTENSIONS.has(extension);
}

function normalizeRelativePath(value: string): string {
  return value.replace(/\\/gu, "/");
}

function collectEnabledHakPaths(
  settings: RuntimeSettingsRecord,
  moduleIfoHakList: string[] = []
): string[] {
  const resolved = resolveHakSettingsByAsset(settings, moduleIfoHakList);
  const enabledKinds: RuntimeAssetKind[] = [
    "placeable",
    "tile",
    "area",
    "sound",
    "vfx",
    "creature"
  ];
  const hakPaths: string[] = [];
  for (const kind of enabledKinds) {
    hakPaths.push(...resolved[kind].hakPaths);
  }
  return hakPaths;
}

function shouldIncludeVanillaTextures(settings: RuntimeSettingsRecord): boolean {
  return (
    settings.sources.placeable.includeVanilla ||
    settings.sources.tile.includeVanilla ||
    settings.sources.area.includeVanilla ||
    settings.sources.vfx.includeVanilla ||
    settings.sources.creature?.includeVanilla === true
  );
}

async function readVanillaSoundAssetsFromKeyBif(
  vanillaRoot: string,
  logger: Logger
): Promise<PackedModuleFile[]> {
  const keyPath = await resolveFirstExistingVanillaKeyFile(vanillaRoot);
  if (!keyPath) {
    return [];
  }

  let reader: NwnKeyBifResourceReader;
  try {
    reader = await NwnKeyBifResourceReader.open(keyPath, vanillaRoot);
  } catch (error) {
    logger.warn(
      `Skipping vanilla KEY/BIF sound source because KEY parsing failed (${keyPath}): ${stringifyError(error)}`
    );
    return [];
  }

  const filesByName = new Map<string, PackedModuleFile>();
  for (const assetType of VANILLA_SOUND_RESOURCE_TYPES) {
    for (const resource of reader.list(assetType.resourceType)) {
      const bytes = await reader.read(resource.resref, assetType.resourceType);
      if (!bytes) {
        continue;
      }

      const normalizedResref = sanitizeSegment(resource.resref);
      const fileName = normalizeRelativePath(
        `__aurora/sources/vanilla/audio/${assetType.extension}/${normalizedResref}.${assetType.extension}`
      );
      if (!filesByName.has(fileName)) {
        filesByName.set(fileName, {
          fileName,
          resourceType: assetType.resourceType,
          bytes
        });
      }
    }
  }

  return [...filesByName.values()];
}

async function readVanillaCreatureTemplateAssetsFromKeyBif(
  vanillaRoot: string,
  logger: Logger
): Promise<PackedModuleFile[]> {
  const keyPath = await resolveFirstExistingVanillaKeyFile(vanillaRoot);
  if (!keyPath) {
    return [];
  }

  let reader: NwnKeyBifResourceReader;
  try {
    reader = await NwnKeyBifResourceReader.open(keyPath, vanillaRoot);
  } catch (error) {
    logger.warn(
      `Skipping vanilla KEY/BIF creature template source because KEY parsing failed (${keyPath}): ${stringifyError(error)}`
    );
    return [];
  }

  const filesByName = new Map<string, PackedModuleFile>();
  for (const assetType of VANILLA_CREATURE_TEMPLATE_RESOURCE_TYPES) {
    for (const resource of reader.list(assetType.resourceType)) {
      const bytes = await reader.read(resource.resref, assetType.resourceType);
      if (!bytes) {
        continue;
      }

      const normalizedResref = sanitizeSegment(resource.resref);
      const fileName = normalizeRelativePath(
        `__aurora/sources/vanilla/creatures/${normalizedResref}.${assetType.extension}`
      );
      if (!filesByName.has(fileName)) {
        filesByName.set(fileName, {
          fileName,
          resourceType: assetType.resourceType,
          bytes
        });
      }
    }
  }

  return [...filesByName.values()];
}

async function readVanillaItemTemplateAssetsFromKeyBif(
  vanillaRoot: string,
  logger: Logger
): Promise<PackedModuleFile[]> {
  const keyPath = await resolveFirstExistingVanillaKeyFile(vanillaRoot);
  if (!keyPath) {
    return [];
  }

  let reader: NwnKeyBifResourceReader;
  try {
    reader = await NwnKeyBifResourceReader.open(keyPath, vanillaRoot);
  } catch (error) {
    logger.warn(
      `Skipping vanilla KEY/BIF item template source because KEY parsing failed (${keyPath}): ${stringifyError(error)}`
    );
    return [];
  }

  const filesByName = new Map<string, PackedModuleFile>();
  for (const assetType of VANILLA_ITEM_TEMPLATE_RESOURCE_TYPES) {
    for (const resource of reader.list(assetType.resourceType)) {
      const bytes = await reader.read(resource.resref, assetType.resourceType);
      if (!bytes) {
        continue;
      }

      const normalizedResref = sanitizeSegment(resource.resref);
      const fileName = normalizeRelativePath(
        `__aurora/sources/vanilla/items/${normalizedResref}.${assetType.extension}`
      );
      if (!filesByName.has(fileName)) {
        filesByName.set(fileName, {
          fileName,
          resourceType: assetType.resourceType,
          bytes
        });
      }
    }
  }

  return [...filesByName.values()];
}

async function readCreatureTemplateFilesFromHak(
  hakPath: string,
  hakName: string
): Promise<PackedModuleFile[]> {
  const resourceIndex = await readNwnErfResourceIndex(hakPath);
  if (!resourceIndex) {
    return [];
  }

  const filesByName = new Map<string, PackedModuleFile>();
  for (const entry of resourceIndex.values()) {
    if (entry.resourceType !== NWN_KEY_BIF_RESOURCE_TYPES.UTC) {
      continue;
    }

    const bytes = await readNwnErfResourceFromIndex(
      hakPath,
      resourceIndex,
      entry.resref,
      entry.resourceType
    );
    if (!bytes) {
      continue;
    }

    const normalizedResref = sanitizeSegment(entry.resref);
    const fileName = normalizeRelativePath(
      `__aurora/sources/hak/${hakName}/${normalizedResref}.utc`
    );
    if (!filesByName.has(fileName)) {
      filesByName.set(fileName, {
        fileName,
        resourceType: entry.resourceType,
        bytes
      });
    }
  }

  return [...filesByName.values()];
}

async function readItemTemplateFilesFromHak(
  hakPath: string,
  hakName: string
): Promise<PackedModuleFile[]> {
  const resourceIndex = await readNwnErfResourceIndex(hakPath);
  if (!resourceIndex) {
    return [];
  }

  const filesByName = new Map<string, PackedModuleFile>();
  for (const entry of resourceIndex.values()) {
    if (entry.resourceType !== NWN_KEY_BIF_RESOURCE_TYPES.UTI) {
      continue;
    }

    const bytes = await readNwnErfResourceFromIndex(
      hakPath,
      resourceIndex,
      entry.resref,
      entry.resourceType
    );
    if (!bytes) {
      continue;
    }

    const normalizedResref = sanitizeSegment(entry.resref);
    const fileName = normalizeRelativePath(
      `__aurora/sources/hak/${hakName}/items/${normalizedResref}.uti`
    );
    if (!filesByName.has(fileName)) {
      filesByName.set(fileName, {
        fileName,
        resourceType: entry.resourceType,
        bytes
      });
    }
  }

  return [...filesByName.values()];
}

async function readSoundFilesFromDirectory(
  rootPath: string,
  currentPath: string
): Promise<PackedModuleFile[]> {
  const files: PackedModuleFile[] = [];
  const entries = await readdir(currentPath, { withFileTypes: true });

  for (const entry of entries) {
    const absolutePath = resolve(currentPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await readSoundFilesFromDirectory(rootPath, absolutePath)));
      continue;
    }

    if (!entry.isFile() || !isSoundAssetFileName(entry.name)) {
      continue;
    }

    const extension = extname(entry.name).replace(/^\./u, "").toLowerCase();
    const bytes = await readFile(absolutePath);
    const relativePath = normalizeRelativePath(
      absolutePath.slice(rootPath.length).replace(/^[/\\]+/u, "")
    );
    files.push({
      fileName: normalizeRelativePath(`__aurora/sources/vanilla/audio/files/${relativePath}`),
      resourceType: getSoundResourceType(extension),
      bytes
    });
  }

  return files;
}

async function readVanillaPlaceableCatalogAssetsFromKeyBif(
  vanillaRoot: string,
  logger: Logger
): Promise<PackedModuleFile[]> {
  const keyPath = await resolveFirstExistingVanillaKeyFile(vanillaRoot);
  if (!keyPath) {
    return [];
  }

  let reader: NwnKeyBifResourceReader;
  try {
    reader = await NwnKeyBifResourceReader.open(keyPath, vanillaRoot);
  } catch (error) {
    logger.warn(
      `Skipping vanilla KEY/BIF placeable source because KEY parsing failed (${keyPath}): ${stringifyError(error)}`
    );
    return [];
  }

  const twoDaFiles = await readVanillaPlaceableTwoDaSourceFiles(reader);
  const filesByName = new Map<string, PackedModuleFile>();
  for (const file of twoDaFiles) {
    filesByName.set(file.fileName, file);
  }

  for (const resource of reader.list(NWN_KEY_BIF_RESOURCE_TYPES.UTP)) {
    const bytes = await reader.read(resource.resref, NWN_KEY_BIF_RESOURCE_TYPES.UTP);
    if (!bytes) {
      continue;
    }

    const normalizedResref = sanitizeSegment(resource.resref);
    const fileName = normalizeRelativePath(
      `__aurora/sources/vanilla/templates/${normalizedResref}.utp`
    );
    if (!filesByName.has(fileName)) {
      filesByName.set(fileName, {
        fileName,
        resourceType: NWN_KEY_BIF_RESOURCE_TYPES.UTP,
        bytes
      });
    }
  }

  return [...filesByName.values()];
}

async function readVanillaPlaceableModelAssetsFromKeyBif(
  vanillaRoot: string,
  modelResRefs: string[],
  logger: Logger
): Promise<{ files: PackedModuleFile[]; missingModelResRefs: string[] }> {
  const requestedModelResRefs = normalizeRequestedVanillaModelResrefs(modelResRefs);
  const keyPath = await resolveFirstExistingVanillaKeyFile(vanillaRoot);
  if (!keyPath) {
    return { files: [], missingModelResRefs: requestedModelResRefs };
  }

  let reader: NwnKeyBifResourceReader;
  try {
    reader = await NwnKeyBifResourceReader.open(keyPath, vanillaRoot);
  } catch (error) {
    logger.warn(
      `Skipping vanilla KEY/BIF placeable model source because KEY parsing failed (${keyPath}): ${stringifyError(error)}`
    );
    return { files: [], missingModelResRefs: requestedModelResRefs };
  }

  const filesByName = new Map<string, PackedModuleFile>();
  const missingModelResRefs: string[] = [];
  for (const resref of requestedModelResRefs) {
    let foundModel = false;
    for (const assetType of VANILLA_PLACEABLE_RELATED_RESOURCE_TYPES) {
      if (!reader.has(resref, assetType.resourceType)) {
        continue;
      }

      const bytes = await reader.read(resref, assetType.resourceType);
      if (!bytes) {
        continue;
      }

      if (assetType.extension === "mdl") {
        foundModel = true;
      }
      const fileName = normalizeRelativePath(
        `__aurora/sources/vanilla/${assetType.directory}/${resref}.${assetType.extension}`
      );
      if (!filesByName.has(fileName)) {
        filesByName.set(fileName, {
          fileName,
          resourceType: assetType.resourceType,
          bytes
        });
      }
    }

    if (!foundModel) {
      missingModelResRefs.push(resref);
    }
  }

  return {
    files: [...filesByName.values()],
    missingModelResRefs
  };
}

async function readVanillaTextureAssetsFromKeyBif(
  vanillaRoot: string,
  textureResRefs: string[],
  logger: Logger
): Promise<TextureSourceFile[]> {
  const requestedTextureResRefs = normalizeRequestedTextureResrefs(textureResRefs);
  if (requestedTextureResRefs.length === 0) {
    return [];
  }

  const keyPath = await resolveFirstExistingVanillaKeyFile(vanillaRoot);
  if (!keyPath) {
    return [];
  }

  let reader: NwnKeyBifResourceReader;
  try {
    reader = await NwnKeyBifResourceReader.open(keyPath, vanillaRoot);
  } catch (error) {
    logger.warn(
      `Skipping vanilla KEY/BIF texture source because KEY parsing failed (${keyPath}): ${stringifyError(error)}`
    );
    return [];
  }

  const filesByName = new Map<string, TextureSourceFile>();
  for (const resref of requestedTextureResRefs) {
    for (const assetType of VANILLA_TEXTURE_RESOURCE_TYPES) {
      if (!reader.has(resref, assetType.resourceType)) {
        continue;
      }

      const bytes = await reader.read(resref, assetType.resourceType);
      if (!bytes) {
        continue;
      }
      const fileName = normalizeRelativePath(
        `__aurora/sources/vanilla/textures/${resref}.${assetType.extension}`
      );
      if (!filesByName.has(fileName)) {
        filesByName.set(fileName, {
          fileName,
          resourceType: assetType.resourceType,
          bytes,
          source: "vanilla",
          sourcePath: normalizeRelativePath(`${resref}.${assetType.extension}`)
        });
      }
    }
  }

  return [...filesByName.values()];
}

async function readVanillaTilesetSetAssetsFromKeyBif(
  vanillaRoot: string,
  logger: Logger
): Promise<PackedModuleFile[]> {
  const keyPath = await resolveFirstExistingVanillaKeyFile(vanillaRoot);
  if (!keyPath) {
    return [];
  }

  let reader: NwnKeyBifResourceReader;
  try {
    reader = await NwnKeyBifResourceReader.open(keyPath, vanillaRoot);
  } catch (error) {
    logger.warn(
      `Skipping vanilla KEY/BIF tileset source because KEY parsing failed (${keyPath}): ${stringifyError(error)}`
    );
    return [];
  }

  const files: PackedModuleFile[] = [];
  for (const resource of reader.list(NWN_KEY_BIF_RESOURCE_TYPES.SET)) {
    const bytes = await reader.read(resource.resref, NWN_KEY_BIF_RESOURCE_TYPES.SET);
    if (!bytes) {
      continue;
    }
    files.push({
      fileName: normalizeRelativePath(`__aurora/sources/vanilla/tilesets/${resource.resref}.set`),
      resourceType: NWN_KEY_BIF_RESOURCE_TYPES.SET,
      bytes
    });
  }
  return files;
}

async function readHakTilesetSetAssets(
  hakPaths: string[],
  logger: Logger
): Promise<PackedModuleFile[]> {
  const filesByName = new Map<string, PackedModuleFile>();
  for (const hakPath of deduplicateOrdered(hakPaths)) {
    const resolved = resolveFilePath(hakPath);
    if (!(await existsAsFile(resolved))) {
      logger.warn(`Skipping HAK tileset SET source because file does not exist: ${resolved}`);
      continue;
    }
    try {
      // A tiles HAK can contain hundreds of megabytes of MDL/texture data.
      // The Area tileset index only needs SET entries, so read the ERF key
      // table and fetch just those resources instead of extracting every byte.
      const resourceIndex = await readNwnErfResourceIndex(resolved);
      if (!resourceIndex) {
        continue;
      }
      const hakName = sanitizeSegment(basename(resolved, extname(resolved)));
      for (const entry of resourceIndex.values()) {
        if (entry.resourceType !== NWN_KEY_BIF_RESOURCE_TYPES.SET) {
          continue;
        }
        const bytes = await readNwnErfResourceFromIndex(
          resolved,
          resourceIndex,
          entry.resref,
          entry.resourceType
        );
        if (!bytes) {
          continue;
        }
        const fileName = normalizeRelativePath(
          `__aurora/sources/hak/${hakName}/${sanitizeSegment(entry.resref)}.set`
        );
        if (!filesByName.has(fileName)) {
          filesByName.set(fileName, {
            fileName,
            resourceType: entry.resourceType,
            bytes: Buffer.from(bytes)
          });
        }
      }
    } catch (error) {
      logger.warn(
        `Skipping HAK tileset SET source because extraction failed (${resolved}): ${stringifyError(error)}`
      );
    }
  }
  return [...filesByName.values()];
}

async function readHakTileModelAssets(
  hakPaths: string[],
  modelResRefs: string[],
  logger: Logger
): Promise<{ files: PackedModuleFile[]; missingModelResRefs: string[] }> {
  const requested = new Set(modelResRefs.map((value) => value.trim().toLowerCase()));
  const foundByResRef = new Set<string>();
  const filesByName = new Map<string, PackedModuleFile>();

  for (const hakPath of deduplicateOrdered(hakPaths)) {
    const resolved = resolveFilePath(hakPath);
    if (!(await existsAsFile(resolved))) {
      logger.warn(`Skipping HAK tile model source because file does not exist: ${resolved}`);
      continue;
    }
    const hakName = sanitizeSegment(basename(resolved, extname(resolved)));
    let resourceIndex: Awaited<ReturnType<typeof readNwnErfResourceIndex>>;
    try {
      resourceIndex = await readNwnErfResourceIndex(resolved);
    } catch (error) {
      logger.warn(
        `Skipping HAK tile model source because index read failed (${resolved}): ${stringifyError(error)}`
      );
      continue;
    }
    if (!resourceIndex) {
      continue;
    }
    for (const resref of requested) {
      if (foundByResRef.has(resref)) {
        continue;
      }
      try {
        let foundAnyForResref = false;
        for (const assetType of VANILLA_TILE_MODEL_RESOURCE_TYPES) {
          const bytes = await readNwnErfResourceFromIndex(
            resolved,
            resourceIndex,
            resref,
            assetType.resourceType
          );
          if (!bytes) {
            continue;
          }
          foundAnyForResref = true;
          const fileName = normalizeRelativePath(
            // Keep tile-sync payloads in an explicit namespace. The module
            // snapshot also contains placeable models from HAKs, and a
            // resref heuristic cannot safely distinguish all legacy tile
            // naming variants (for example gi_a01_01 and ctx1_w2p_01).
            `__aurora/sources/tiles/hak/${hakName}/${resref}.${assetType.extension}`
          );
          if (!filesByName.has(fileName)) {
            filesByName.set(fileName, {
              fileName,
              resourceType: assetType.resourceType,
              bytes
            });
          }
        }
        if (foundAnyForResref) {
          foundByResRef.add(resref);
        }
      } catch (error) {
        logger.warn(
          `Skipping HAK tile model source lookup because direct resource read failed (${resolved}, ${resref}): ${stringifyError(error)}`
        );
      }
    }
    if (foundByResRef.size >= requested.size) {
      break;
    }
  }

  return {
    files: [...filesByName.values()],
    missingModelResRefs: modelResRefs.filter(
      (resref) => !foundByResRef.has(resref.trim().toLowerCase())
    )
  };
}

async function readHakTextureAssets(
  hakPaths: string[],
  textureResRefs: string[],
  logger: Logger
): Promise<TextureSourceFile[]> {
  const requested = new Set(normalizeRequestedTextureResrefs(textureResRefs));
  if (requested.size === 0) {
    return [];
  }

  const filesByName = new Map<string, TextureSourceFile>();
  const foundByResRef = new Set<string>();
  for (const hakPath of deduplicateOrdered(hakPaths)) {
    const resolved = resolveFilePath(hakPath);
    if (!(await existsAsFile(resolved))) {
      logger.warn(`Skipping HAK texture source because file does not exist: ${resolved}`);
      continue;
    }
    const hakName = sanitizeSegment(basename(resolved, extname(resolved)));
    let resourceIndex: Awaited<ReturnType<typeof readNwnErfResourceIndex>>;
    try {
      resourceIndex = await readNwnErfResourceIndex(resolved);
    } catch (error) {
      logger.warn(
        `Skipping HAK texture source because index read failed (${resolved}): ${stringifyError(error)}`
      );
      continue;
    }
    if (!resourceIndex) {
      continue;
    }
    for (const resref of requested) {
      if (foundByResRef.has(resref)) {
        continue;
      }
      try {
        for (const assetType of VANILLA_TEXTURE_RESOURCE_TYPES) {
          const bytes = await readNwnErfResourceFromIndex(
            resolved,
            resourceIndex,
            resref,
            assetType.resourceType
          );
          if (!bytes) {
            continue;
          }
          const fileName = normalizeRelativePath(
            `__aurora/sources/hak/${hakName}/${resref}.${assetType.extension}`
          );
          if (!filesByName.has(fileName)) {
            filesByName.set(fileName, {
              fileName,
              resourceType: assetType.resourceType,
              bytes,
              source: "hak",
              sourcePath: normalizeRelativePath(resolved)
            });
          }
          foundByResRef.add(resref);
          continue;
        }
      } catch (error) {
        logger.warn(
          `Skipping HAK texture source lookup because direct resource read failed (${resolved}, ${resref}): ${stringifyError(error)}`
        );
      }
    }
    if (foundByResRef.size >= requested.size) {
      break;
    }
  }
  return [...filesByName.values()];
}

async function readHakPlaceablesTwoDaAssets(
  hakPaths: string[],
  logger: Logger
): Promise<{
  files: PackedModuleFile[];
  appearanceModelByRowId: Map<number, string>;
}> {
  const filesByName = new Map<string, PackedModuleFile>();
  const appearanceModelByRowId = new Map<number, string>();
  const foundSourceNames = new Set<string>();

  for (const hakPath of deduplicateOrdered(hakPaths)) {
    if (foundSourceNames.size >= PLACEABLE_TWO_DA_SOURCE_NAMES.size) {
      break;
    }
    const resolved = resolveFilePath(hakPath);
    if (!(await existsAsFile(resolved))) {
      logger.warn(`Skipping HAK placeables.2da source because file does not exist: ${resolved}`);
      continue;
    }
    if (!(await shouldScanHakForPlaceableTwoDaSources(resolved))) {
      continue;
    }
    try {
      const hakName = sanitizeSegment(basename(resolved, extname(resolved)));
      for (const sourceName of PLACEABLE_TWO_DA_SOURCE_NAMES) {
        if (foundSourceNames.has(sourceName)) {
          continue;
        }
        const resref = basename(sourceName, extname(sourceName));
        const bytes = await readNwnErfResource(
          resolved,
          resref,
          NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA
        );
        if (!bytes) {
          continue;
        }
        const fileName = normalizeRelativePath(
          `__aurora/sources/hak/${hakName}/${sourceName}`
        );
        const file = {
          fileName,
          resourceType: NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA,
          bytes: Buffer.from(bytes)
        };
        filesByName.set(fileName, file);
        foundSourceNames.add(sourceName);
        if (sourceName === "placeables.2da") {
          const lookup = parsePlaceablesAppearanceModelLookup(file.bytes);
          for (const [rowId, modelResRef] of lookup) {
            if (!appearanceModelByRowId.has(rowId)) {
              appearanceModelByRowId.set(rowId, modelResRef);
            }
          }
        }
      }
    } catch (error) {
      logger.warn(
        `Skipping HAK placeables.2da source because extraction failed (${resolved}): ${stringifyError(error)}`
      );
    }
  }

  return {
    files: [...filesByName.values()],
    appearanceModelByRowId
  };
}

async function readHakPlaceableTemplateAssets(
  hakPaths: string[],
  logger: Logger
): Promise<PackedModuleFile[]> {
  const filesByName = new Map<string, PackedModuleFile>();

  for (const hakPath of deduplicateOrdered(hakPaths)) {
    const resolved = resolveFilePath(hakPath);
    if (!(await existsAsFile(resolved))) {
      logger.warn(`Skipping HAK Placeable UTP source because file does not exist: ${resolved}`);
      continue;
    }

    try {
      const resourceIndex = await readNwnErfResourceIndex(resolved);
      if (!resourceIndex) {
        continue;
      }
      const hakName = sanitizeSegment(basename(resolved, extname(resolved)));
      for (const entry of resourceIndex.values()) {
        if (entry.resourceType !== NWN_KEY_BIF_RESOURCE_TYPES.UTP) {
          continue;
        }
        const bytes = await readNwnErfResourceFromIndex(
          resolved,
          resourceIndex,
          entry.resref,
          entry.resourceType
        );
        if (!bytes) {
          continue;
        }
        const normalizedResref = sanitizeSegment(entry.resref);
        const fileName = normalizeRelativePath(
          `__aurora/sources/hak/${hakName}/templates/${normalizedResref}.utp`
        );
        if (!filesByName.has(fileName)) {
          filesByName.set(fileName, {
            fileName,
            resourceType: entry.resourceType,
            bytes
          });
        }
      }
    } catch (error) {
      logger.warn(
        `Skipping HAK Placeable UTP source because indexed reading failed (${resolved}): ${stringifyError(error)}`
      );
    }
  }

  return [...filesByName.values()];
}

async function readVanillaPlaceablesTwoDaAsset(
  vanillaRoot: string,
  logger: Logger
): Promise<{
  files: PackedModuleFile[];
  appearanceModelByRowId: Map<number, string>;
} | null> {
  const keyPath = await resolveFirstExistingVanillaKeyFile(vanillaRoot);
  if (!keyPath) {
    return null;
  }

  let reader: NwnKeyBifResourceReader;
  try {
    reader = await NwnKeyBifResourceReader.open(keyPath, vanillaRoot);
  } catch (error) {
    logger.warn(
      `Skipping vanilla KEY/BIF placeables.2da source because KEY parsing failed (${keyPath}): ${stringifyError(error)}`
    );
    return null;
  }

  const files = await readVanillaPlaceableTwoDaSourceFiles(reader);
  const placeables2da = files.find(
    (file) => basename(file.fileName).trim().toLowerCase() === "placeables.2da"
  );
  if (!placeables2da) {
    return null;
  }

  return {
    files,
    appearanceModelByRowId: parsePlaceablesAppearanceModelLookup(placeables2da.bytes)
  };
}

async function readVanillaPlaceableTemplateAssetsFromKeyBif(
  vanillaRoot: string,
  logger: Logger
): Promise<PackedModuleFile[]> {
  const keyPath = await resolveFirstExistingVanillaKeyFile(vanillaRoot);
  if (!keyPath) {
    return [];
  }

  let reader: NwnKeyBifResourceReader;
  try {
    reader = await NwnKeyBifResourceReader.open(keyPath, vanillaRoot);
  } catch (error) {
    logger.warn(
      `Skipping vanilla KEY/BIF Placeable UTP source because KEY parsing failed (${keyPath}): ${stringifyError(error)}`
    );
    return [];
  }

  const filesByName = new Map<string, PackedModuleFile>();
  for (const resource of reader.list(NWN_KEY_BIF_RESOURCE_TYPES.UTP)) {
    const bytes = await reader.read(resource.resref, NWN_KEY_BIF_RESOURCE_TYPES.UTP);
    if (!bytes) {
      continue;
    }
    const normalizedResref = sanitizeSegment(resource.resref);
    const fileName = normalizeRelativePath(
      `__aurora/sources/vanilla/templates/${normalizedResref}.utp`
    );
    if (!filesByName.has(fileName)) {
      filesByName.set(fileName, {
        fileName,
        resourceType: NWN_KEY_BIF_RESOURCE_TYPES.UTP,
        bytes
      });
    }
  }

  return [...filesByName.values()];
}

async function shouldScanHakForPlaceableTwoDaSources(hakPath: string): Promise<boolean> {
  const normalizedBaseName = basename(hakPath, extname(hakPath)).trim().toLowerCase();
  if (normalizedBaseName.includes("2da")) {
    return true;
  }

  try {
    const metadata = await stat(hakPath);
    return metadata.size <= 64 * 1024 * 1024;
  } catch {
    return false;
  }
}

async function readVanillaPlaceableTwoDaSourceFiles(
  reader: NwnKeyBifResourceReader
): Promise<PackedModuleFile[]> {
  const files: PackedModuleFile[] = [];
  for (const sourceName of PLACEABLE_TWO_DA_SOURCE_NAMES) {
    const resref = basename(sourceName, extname(sourceName));
    const bytes = await reader.read(resref, NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA);
    if (!bytes) {
      continue;
    }
    files.push({
      fileName: `__aurora/sources/vanilla/${sourceName}`,
      resourceType: NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA,
      bytes
    });
  }
  return files;
}

async function readHakPlaceableModelAssets(
  hakPaths: string[],
  modelResRefs: string[],
  packedModuleExtractor: PackedModuleExtractorPort,
  logger: Logger
): Promise<{
  files: PackedModuleFile[];
  textureFiles: TextureSourceFile[];
  missingModelResRefs: string[];
}> {
  const requested = new Set(normalizeRequestedVanillaModelResrefs(modelResRefs));
  const foundByResRef = new Set<string>();
  const filesByName = new Map<string, PackedModuleFile>();
  const textureFilesByName = new Map<string, TextureSourceFile>();

  for (const hakPath of deduplicateOrdered(hakPaths)) {
    const resolved = resolveFilePath(hakPath);
    if (!(await existsAsFile(resolved))) {
      logger.warn(`Skipping HAK placeable model source because file does not exist: ${resolved}`);
      continue;
    }
    try {
      const extracted = await packedModuleExtractor.extractFromPackedModule(resolved);
      const hakName = sanitizeSegment(basename(resolved, extname(resolved)));
      for (const asset of extracted) {
        const extension = extname(asset.fileName).replace(/^\./u, "").toLowerCase();
        const resref = basename(asset.fileName, extname(asset.fileName)).trim().toLowerCase();
        if (!requested.has(resref)) {
          continue;
        }

        const fileName = normalizeRelativePath(
          `__aurora/sources/hak/${hakName}/${asset.fileName}`
        );
        if (isTextureFileName(asset.fileName)) {
          if (!textureFilesByName.has(fileName)) {
            textureFilesByName.set(fileName, {
              fileName,
              resourceType: asset.resourceType,
              bytes: Buffer.from(asset.bytes),
              source: "hak",
              sourcePath: normalizeRelativePath(resolved)
            });
          }
          continue;
        }

        if (!isPlaceableModelRelatedExtension(extension)) {
          continue;
        }

        if (extension === "mdl" || extension === "mdb") {
          foundByResRef.add(resref);
        }
        if (!filesByName.has(fileName)) {
          filesByName.set(fileName, {
            fileName,
            resourceType: asset.resourceType,
            bytes: Buffer.from(asset.bytes)
          });
        }
      }
    } catch (error) {
      logger.warn(
        `Skipping HAK placeable model source because extraction failed (${resolved}): ${stringifyError(error)}`
      );
    }
  }

  return {
    files: [...filesByName.values()],
    textureFiles: [...textureFilesByName.values()],
    missingModelResRefs: modelResRefs.filter(
      (resref) => !foundByResRef.has(resref.trim().toLowerCase())
    )
  };
}

async function readVanillaTileModelAssetsFromKeyBif(
  vanillaRoot: string,
  modelResRefs: string[],
  logger: Logger
): Promise<{ files: PackedModuleFile[]; missingModelResRefs: string[] }> {
  const keyPath = await resolveFirstExistingVanillaKeyFile(vanillaRoot);
  if (!keyPath) {
    return { files: [], missingModelResRefs: modelResRefs };
  }

  let reader: NwnKeyBifResourceReader;
  try {
    reader = await NwnKeyBifResourceReader.open(keyPath, vanillaRoot);
  } catch (error) {
    logger.warn(
      `Skipping vanilla KEY/BIF tile model source because KEY parsing failed (${keyPath}): ${stringifyError(error)}`
    );
    return { files: [], missingModelResRefs: modelResRefs };
  }

  const filesByName = new Map<string, PackedModuleFile>();
  const missingModelResRefs: string[] = [];
  for (const resref of modelResRefs) {
    let foundAny = false;
    for (const assetType of VANILLA_TILE_MODEL_RESOURCE_TYPES) {
      if (!reader.has(resref, assetType.resourceType)) {
        continue;
      }

      const bytes = await reader.read(resref, assetType.resourceType);
      if (!bytes) {
        continue;
      }

      foundAny = true;
      const fileName = normalizeRelativePath(
        `__aurora/sources/vanilla/${assetType.directory}/${resref}.${assetType.extension}`
      );
      if (!filesByName.has(fileName)) {
        filesByName.set(fileName, {
          fileName,
          resourceType: assetType.resourceType,
          bytes
        });
      }
    }

    if (!foundAny) {
      missingModelResRefs.push(resref);
    }
  }

  return {
    files: [...filesByName.values()],
    missingModelResRefs
  };
}

async function resolveFirstExistingVanillaKeyFile(vanillaRoot: string): Promise<string | null> {
  for (const keyFileName of VANILLA_KEY_FILE_CANDIDATES) {
    const keyPath = resolve(vanillaRoot, keyFileName);
    if (await existsAsFile(keyPath)) {
      return keyPath;
    }
  }
  return null;
}

function parsePlaceableModelResrefsFromTwoDa(bytes: Buffer): string[] {
  const content = bytes.toString("utf-8").replace(/^\uFEFF/u, "");
  const lines = content
    .split(/\r?\n/gu)
    .map((line) => stripTwoDaComment(line).trim())
    .filter((line) => line.length > 0);
  if (lines.length === 0 || !/^2da\b/iu.test(lines[0])) {
    return [];
  }

  let headerLineIndex = -1;
  let modelColumnIndex = -1;
  for (let index = 1; index < lines.length; index += 1) {
    const tokens = tokenizeTwoDaLine(lines[index]);
    const foundModelColumnIndex = tokens.findIndex(
      (token) => token.trim().toLowerCase() === "modelname"
    );
    if (foundModelColumnIndex >= 0) {
      headerLineIndex = index;
      modelColumnIndex = foundModelColumnIndex;
      break;
    }
  }

  if (headerLineIndex < 0 || modelColumnIndex < 0) {
    return [];
  }

  const modelResrefs = new Set<string>();
  for (let index = headerLineIndex + 1; index < lines.length; index += 1) {
    const tokens = tokenizeTwoDaLine(lines[index]);
    if (tokens.length < 2) {
      continue;
    }

    const rowValues = tokens.slice(1);
    const modelResref = normalizeVanillaResref(rowValues[modelColumnIndex]);
    if (modelResref) {
      modelResrefs.add(modelResref);
    }
  }

  return [...modelResrefs].sort((left, right) => left.localeCompare(right));
}

function tokenizeTwoDaLine(line: string): string[] {
  const rawTokens = line.match(/"[^"]*"|[^\s]+/gu) ?? [];
  return rawTokens.map((token) => {
    const trimmed = token.trim();
    if (trimmed.startsWith("\"") && trimmed.endsWith("\"") && trimmed.length >= 2) {
      return trimmed.slice(1, -1);
    }
    return trimmed;
  });
}

function stripTwoDaComment(line: string): string {
  const commentStart = line.indexOf("//");
  if (commentStart < 0) {
    return line;
  }
  return line.slice(0, commentStart);
}

function normalizeVanillaResref(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9_-]+/gu, "_").slice(0, 64);
  if (!normalized || normalized === "____" || !/[a-z0-9]/u.test(normalized)) {
    return null;
  }
  return normalized;
}

function normalizeRequestedVanillaModelResrefs(values: string[]): string[] {
  const normalized = new Set<string>();
  for (const value of values) {
    const resref = normalizeVanillaResref(value);
    if (resref) {
      normalized.add(resref);
    }
  }
  return [...normalized].sort((left, right) => left.localeCompare(right));
}

function normalizeRequestedAppearanceTypes(values: number[]): number[] {
  const normalized = new Set<number>();
  for (const value of values) {
    if (Number.isInteger(value) && value >= 0) {
      normalized.add(value);
    }
  }
  return [...normalized].sort((left, right) => left - right);
}

function normalizePlaceableModelResref(value: string | undefined): string | null {
  const normalized = normalizeVanillaResref(value);
  if (!normalized) {
    return null;
  }
  if (
    normalized === "user" ||
    normalized === "reserved" ||
    normalized.endsWith("_reserved")
  ) {
    return null;
  }
  return normalized;
}

export function parsePlaceablesAppearanceModelLookup(bytes: Buffer): Map<number, string> {
  const lookup = new Map<number, string>();
  const table = parseAuroraTwoDaTable(bytes, {
    tableName: "placeables.2da",
    profile: "aurora-runtime-settings-placeable-source-sync"
  });

  for (const row of table.rows) {
    const modelResRef = normalizePlaceableModelResref(
      readTwoDaCell(row, ["modelname", "modelresref", "model"])
    );
    if (modelResRef && !lookup.has(row.rowId)) {
      lookup.set(row.rowId, modelResRef);
    }
    if (
      modelResRef &&
      row.physicalRowIndex !== row.rowId &&
      !lookup.has(row.physicalRowIndex)
    ) {
      lookup.set(row.physicalRowIndex, modelResRef);
    }
  }
  return lookup;
}

function readTwoDaCell(row: AuroraTwoDaRow, columnAliases: string[]): string | undefined {
  const aliases = new Set(columnAliases.map(normalizeTwoDaColumnName));
  for (const cell of row.cells) {
    if (!aliases.has(normalizeTwoDaColumnName(cell.column))) {
      continue;
    }
    const value = cell.value.trim();
    if (!value || value === BLANK_CELL || cell.blank || cell.missing) {
      return undefined;
    }
    return value;
  }
  return undefined;
}

function normalizeTwoDaColumnName(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/gu, "");
}

function normalizeTextureResref(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  const withoutExtension = value
    .trim()
    .replace(/^"+|"+$/gu, "")
    .replace(/\\/gu, "/")
    .split("/")
    .pop()
    ?.replace(/\.(dds|tga|plt|txi|mtr|bmp)$/iu, "");
  const normalized = withoutExtension
    ?.trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/gu, "_")
    .slice(0, 64);
  if (
    !normalized ||
    normalized === "null" ||
    normalized === "none" ||
    normalized === "default" ||
    normalized === "****" ||
    !/[a-z0-9]/u.test(normalized)
  ) {
    return null;
  }
  return normalized;
}

function normalizeRequestedTextureResrefs(values: string[]): string[] {
  const normalized = new Set<string>();
  for (const value of values) {
    const resref = normalizeTextureResref(value);
    if (resref) {
      normalized.add(resref);
    }
  }
  return [...normalized].sort((left, right) => left.localeCompare(right));
}

function collectAuroraMdlTextureReferencesFromFiles(files: PackedModuleFile[]): string[] {
  const references = new Set<string>();
  for (const file of files) {
    const extension = extname(file.fileName).replace(/^\./u, "").toLowerCase();
    if (extension !== "mdl") {
      continue;
    }
    collectAuroraMdlTextureReferencesFromFile(file, references);
  }
  return [...references].sort((left, right) => left.localeCompare(right));
}

export function collectAuroraMtrTextureReferencesFromFiles(
  files: Iterable<PackedModuleFile>
): string[] {
  const references = new Set<string>();
  for (const file of files) {
    const extension = extname(file.fileName).replace(/^\./u, "").toLowerCase();
    if (extension !== "mtr") {
      continue;
    }
    const source = Buffer.from(file.bytes).toString("utf-8");
    for (const line of source.split(/\r?\n/u)) {
      const withoutComments = line
        .replace(/\/\/.*$/u, "")
        .replace(/;.*$/u, "")
        .trim();
      if (!withoutComments) {
        continue;
      }
      const tokens = withoutComments.split(/\s+/u);
      const key = tokens[0]?.toLowerCase() ?? "";
      if (
        !/^(?:texture\d+|bitmap|bumpmap|bumpmaptexture|bumpyshinytexture|envmap|envmaptexture|bumpreplacementtexture)$/u.test(
          key
        )
      ) {
        continue;
      }
      const resref = normalizeTextureResref(tokens.slice(1).join(" "));
      if (resref) {
        references.add(resref);
      }
    }
  }
  return [...references].sort((left, right) => left.localeCompare(right));
}

function collectAuroraMdlTextureReferencesFromFile(
  file: PackedModuleFile,
  references: Set<string>
): void {
  const bytes = Buffer.from(file.bytes);
  try {
    inspectAuroraMdlSource(bytes).textureReferences.forEach((reference) => {
      const resref = normalizeTextureResref(reference);
      if (resref) {
        references.add(resref);
      }
    });
  } catch {
    // Keep the lightweight token scanner below as a fallback for partial or unusual MDL payloads.
  }

  const text = bytes.toString("latin1");
  const matches = text.matchAll(
    /(?:^|[\r\n\t\0 ])(?:bitmap|texture\d*|texture)[\s\0]+("[^"\r\n\0]+"|[^\s\r\n\0]+)/giu
  );
  for (const match of matches) {
    const resref = normalizeTextureResref(match[1]);
    if (resref) {
      references.add(resref);
    }
  }
}

function collectTileModelTextureReferences(
  modelResRefs: string[],
  files: PackedModuleFile[]
): string[] {
  return normalizeRequestedTextureResrefs([
    ...collectAuroraMdlTextureReferencesFromFiles(files),
    ...modelResRefs.map((resref) => `mi_${resref}`)
  ]);
}

function hasTextureSourceForResref(
  files: Iterable<TextureSourceFile>,
  resref: string
): boolean {
  const normalizedResref = normalizeTextureResref(resref);
  if (!normalizedResref) {
    return false;
  }
  for (const file of files) {
    const fileResref = normalizeTextureResref(
      basename(file.fileName, extname(file.fileName))
    );
    if (fileResref === normalizedResref) {
      return true;
    }
  }
  return false;
}

async function existsAsFile(pathValue: string): Promise<boolean> {
  try {
    const metadata = await stat(pathValue);
    return metadata.isFile();
  } catch {
    return false;
  }
}

async function existsAsDirectory(pathValue: string): Promise<boolean> {
  try {
    const metadata = await stat(pathValue);
    return metadata.isDirectory();
  } catch {
    return false;
  }
}

function isTextureFileName(fileName: string): boolean {
  const extension = extname(fileName).replace(/^\./u, "").toLowerCase();
  return TEXTURE_EXTENSIONS.has(extension);
}

function isPlaceableHakAssetFileName(fileName: string): boolean {
  const normalizedFileName = basename(fileName).trim().toLowerCase();
  if (PLACEABLE_TWO_DA_SOURCE_NAMES.has(normalizedFileName)) {
    return true;
  }

  const extension = extname(fileName).replace(/^\./u, "").toLowerCase();
  return PLACEABLE_HAK_ASSET_EXTENSIONS.has(extension);
}

function isCreatureTemplateAssetFileName(fileName: string): boolean {
  const extension = extname(fileName).replace(/^\./u, "").toLowerCase();
  return CREATURE_TEMPLATE_ASSET_EXTENSIONS.has(extension);
}

function isPlaceableModelRelatedExtension(extension: string): boolean {
  return (
    extension === "mdl" ||
    extension === "mdb" ||
    extension === "pwk" ||
    extension === "dwk" ||
    extension === "wok"
  );
}

function isSoundAssetFileName(fileName: string): boolean {
  const extension = extname(fileName).replace(/^\./u, "").toLowerCase();
  return SOUND_ASSET_EXTENSIONS.has(extension);
}

function getSoundResourceType(extension: string): number {
  if (extension === "wav") {
    return NWN_KEY_BIF_RESOURCE_TYPES.WAV;
  }
  if (extension === "bmu") {
    return NWN_KEY_BIF_RESOURCE_TYPES.BMU;
  }
  if (extension === "mp3") {
    return NWN_KEY_BIF_RESOURCE_TYPES.MP3;
  }
  return 0;
}

function sanitizeSegment(value: string): string {
  const normalized = value.toLowerCase().replace(/[^a-z0-9._-]/gu, "_");
  return normalized || "source";
}

async function readTextureFilesFromDirectory(
  rootPath: string,
  currentPath: string
): Promise<Array<{ relativePath: string; resourceType: number; bytes: Buffer }>> {
  const files: Array<{ relativePath: string; resourceType: number; bytes: Buffer }> = [];
  const entries = await readdir(currentPath, { withFileTypes: true });

  for (const entry of entries) {
    const absolutePath = resolve(currentPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await readTextureFilesFromDirectory(rootPath, absolutePath)));
      continue;
    }

    if (!entry.isFile() || !isTextureFileName(entry.name)) {
      continue;
    }

    const bytes = await readFile(absolutePath);
    const relativePath = normalizeRelativePath(
      absolutePath.slice(rootPath.length).replace(/^[/\\]+/u, "")
    );
    files.push({
      relativePath,
      resourceType: 0,
      bytes
    });
  }

  return files;
}

function collectTextureFilesFromPackedFiles(
  files: PackedModuleFile[],
  source: TextureIndexEntry["source"]
): TextureSourceFile[] {
  return files
    .filter((entry) => isTextureFileName(entry.fileName))
    .map((entry) => ({
      fileName: normalizeRelativePath(entry.fileName),
      resourceType: entry.resourceType,
      bytes: Buffer.from(entry.bytes),
      sourcePath: normalizeRelativePath(entry.fileName),
      source
    }));
}

function toPackedModuleFileList(files: TextureSourceFile[]): PackedModuleFile[] {
  return files.map((file) => ({
    fileName: file.fileName,
    resourceType: file.resourceType,
    bytes: Buffer.from(file.bytes)
  }));
}

function buildTextureIndexRecord(
  settingsRevision: number,
  modulePrefix: string,
  files: TextureSourceFile[],
  generatedAt: string
): TextureIndexRecord {
  const normalizedPrefix = normalizeBlobPrefix(modulePrefix);
  const entries = files
    .map((file) => buildTextureIndexEntry(normalizedPrefix, file))
    .sort((left, right) => left.objectKey.localeCompare(right.objectKey));

  return buildTextureIndexRecordFromEntries(
    settingsRevision,
    normalizedPrefix,
    entries,
    generatedAt
  );
}

function buildTextureIndexEntry(
  normalizedPrefix: string,
  file: TextureSourceFile
): TextureIndexEntry {
  const extension = extname(file.fileName).replace(/^\./u, "").toLowerCase();
  const resref = basename(file.fileName, extname(file.fileName)).toLowerCase();
  const objectKey = `${normalizedPrefix}${normalizeRelativePath(file.fileName)}`;
  const sha256 = createHash("sha256").update(file.bytes).digest("hex");
  return {
    textureId: createHash("sha256")
      .update(`${objectKey}|${sha256}|${file.bytes.length}`)
      .digest("hex")
      .slice(0, 24),
    resref,
    extension,
    objectKey,
    sizeBytes: file.bytes.length,
    sha256,
    source: file.source,
    sourcePath: file.sourcePath
  };
}

function buildTextureIndexRecordFromEntries(
  settingsRevision: number,
  modulePrefix: string,
  entries: TextureIndexEntry[],
  generatedAt = new Date().toISOString()
): TextureIndexRecord {
  const normalizedPrefix = normalizeBlobPrefix(modulePrefix);
  const sortedEntries = [...entries].sort((left, right) =>
    left.objectKey.localeCompare(right.objectKey)
  );
  const byResref: TextureIndexRecord["byResref"] = {};
  for (const entry of sortedEntries) {
    const bucket = byResref[entry.resref] ?? [];
    bucket.push({
      objectKey: entry.objectKey,
      sha256: entry.sha256,
      sizeBytes: entry.sizeBytes,
      extension: entry.extension,
      source: entry.source,
      sourcePath: entry.sourcePath
    });
    byResref[entry.resref] = bucket;
  }

  return {
    version: "texture-index/v1",
    generatedAt,
    settingsRevision,
    modulePrefix: normalizedPrefix,
    totalTextures: sortedEntries.length,
    totalBytes: sortedEntries.reduce((sum, entry) => sum + entry.sizeBytes, 0),
    entries: sortedEntries,
    byResref
  };
}

function normalizeBlobPrefix(value: string): string {
  const trimmed = value.trim().replace(/^\/+/u, "").replace(/\/+$/u, "");
  if (!trimmed) {
    return "";
  }
  return `${trimmed}/`;
}

export function resolveBaseModulePrefix(value: string): string {
  const normalized = value.trim().replace(/^\/+/u, "").replace(/\/+$/u, "");
  const markerIndex = normalized.indexOf("/__generations/");
  if (markerIndex >= 0) {
    return normalized.slice(0, markerIndex);
  }
  return normalized || "modules/current";
}

export function extractGenerationFromPrefix(value: string): string | null {
  const normalized = value.trim().replace(/^\/+/u, "").replace(/\/+$/u, "");
  const match = normalized.match(/\/__generations\/([^/]+)$/u);
  return match?.[1] ?? null;
}

function withBaseModulePrefix(settings: RuntimeSettingsRecord): RuntimeSettingsRecord {
  return {
    ...structuredClone(settings),
    blobStorage: {
      ...settings.blobStorage,
      modulePrefix: resolveBaseModulePrefix(settings.blobStorage.modulePrefix)
    }
  };
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortJsonValue(value));
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => sortJsonValue(entry));
  }
  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort((left, right) =>
      left.localeCompare(right)
    )) {
      output[key] = sortJsonValue((value as Record<string, unknown>)[key]);
    }
    return output;
  }
  return value;
}

function buildTextureIndexLookupCacheKey(
  settings: RuntimeSettingsRecord,
  indexObjectKey: string
): string {
  return [
    settings.revision,
    settings.blobStorage.bucket,
    settings.blobStorage.modulePrefix,
    indexObjectKey
  ].join("|");
}

function buildTextureDeliveryPath(textureId: string): string {
  return `/api/v1/settings/runtime/module-cache/textures/${encodeURIComponent(textureId)}`;
}

function inferTextureContentType(extension: string): string {
  const normalized = extension.trim().toLowerCase();
  if (normalized === "dds") {
    return "image/vnd-ms.dds";
  }
  if (normalized === "tga") {
    return "image/x-tga";
  }
  if (normalized === "bmp") {
    return "image/bmp";
  }
  if (normalized === "plt") {
    return "application/octet-stream";
  }
  if (normalized === "txi" || normalized === "mtr") {
    return "text/plain; charset=utf-8";
  }
  return "application/octet-stream";
}

function stringifyError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function sumBytes(files: Array<{ bytes: Buffer }>): number {
  return files.reduce((sum, file) => sum + file.bytes.length, 0);
}

function parseTextureIndexRecord(value: unknown): TextureIndexRecord {
  if (!value || typeof value !== "object") {
    throw new Error("Texture index payload has invalid shape.");
  }

  const candidate = value as Partial<TextureIndexRecord>;
  if (
    candidate.version !== "texture-index/v1" ||
    typeof candidate.generatedAt !== "string" ||
    typeof candidate.settingsRevision !== "number" ||
    typeof candidate.modulePrefix !== "string" ||
    typeof candidate.totalTextures !== "number" ||
    typeof candidate.totalBytes !== "number" ||
    !Array.isArray(candidate.entries)
  ) {
    throw new Error("Texture index payload has invalid metadata.");
  }

  const entries = candidate.entries.map((entry) => parseTextureIndexEntry(entry));
  const byResref = buildByResrefIndex(entries);

  return {
    version: "texture-index/v1",
    generatedAt: candidate.generatedAt,
    settingsRevision: candidate.settingsRevision,
    modulePrefix: candidate.modulePrefix,
    totalTextures: candidate.totalTextures,
    totalBytes: candidate.totalBytes,
    entries,
    byResref
  };
}

function parseTextureIndexEntry(value: unknown): TextureIndexEntry {
  if (!value || typeof value !== "object") {
    throw new Error("Texture index entry has invalid shape.");
  }

  const candidate = value as Partial<TextureIndexEntry>;
  if (
    typeof candidate.textureId !== "string" ||
    typeof candidate.resref !== "string" ||
    typeof candidate.extension !== "string" ||
    typeof candidate.objectKey !== "string" ||
    typeof candidate.sizeBytes !== "number" ||
    typeof candidate.sha256 !== "string" ||
    !isTextureSourceType(candidate.source) ||
    typeof candidate.sourcePath !== "string"
  ) {
    throw new Error("Texture index entry has invalid fields.");
  }

  return {
    textureId: candidate.textureId,
    resref: candidate.resref,
    extension: candidate.extension,
    objectKey: candidate.objectKey,
    sizeBytes: candidate.sizeBytes,
    sha256: candidate.sha256,
    source: candidate.source,
    sourcePath: candidate.sourcePath
  };
}

function buildByResrefIndex(entries: TextureIndexEntry[]): TextureIndexRecord["byResref"] {
  const byResref: TextureIndexRecord["byResref"] = {};
  for (const entry of entries) {
    const key = entry.resref.toLowerCase();
    const bucket = byResref[key] ?? [];
    bucket.push({
      objectKey: entry.objectKey,
      sha256: entry.sha256,
      sizeBytes: entry.sizeBytes,
      extension: entry.extension,
      source: entry.source,
      sourcePath: entry.sourcePath
    });
    byResref[key] = bucket;
  }
  return byResref;
}

function isTextureSourceType(value: unknown): value is TextureIndexEntry["source"] {
  return value === "module" || value === "hak" || value === "vanilla";
}
