import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import { readdir, readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { basename, extname, isAbsolute, resolve } from "node:path";
import {
  BLANK_CELL,
  parseAuroraTwoDaTable,
  type AuroraTwoDaRow
} from "../../../common/aurora/two-da/aurora-two-da-table";
import { buildS3ObjectUrl } from "../../../common/blob/blob-url.helpers";
import { AppException } from "../../../common/http/app-exception";
import {
  DERIVED_ASSET_GENERATOR,
  type DerivedAssetGeneratorPort,
  type DerivedAssetGeneratorSummary
} from "./ports/derived-asset-generator.port";
import type {
  RuntimeAssetKind,
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

const RUNTIME_ASSET_KINDS = ["placeable", "tile", "area", "sound", "vfx"] as const;
const TEXTURE_EXTENSIONS = new Set(["dds", "tga", "plt", "txi", "mtr", "bmp"]);
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

export interface TextureDeliveryContract {
  textureId: string;
  resref: string;
  objectKey: string;
  extension: string;
  contentType: string;
  sizeBytes: number;
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
  soundAssetFiles: PackedModuleFile[];
  summary: {
    hakTextures: number;
    hakPlaceableAssets: number;
    hakSounds: number;
    vanillaTextures: number;
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
    const source = await this.loadModuleSourceFiles(settings);
    const moduleTextureFiles = collectTextureFilesFromPackedFiles(source.files, "module");
    const supplement = await this.loadSourceSupplementFiles(settings);
    const textureFiles = [...moduleTextureFiles, ...supplement.textureFiles];
    const textureIndex = buildTextureIndexRecord(
      settings.revision,
      settings.blobStorage.modulePrefix,
      textureFiles
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
      ...supplement.soundAssetFiles
    ];
    const derivedAssets = await this.generateDerivedAssetFiles(settings, source.files);
    const allFiles = [...sourceAndSupplementFiles, ...derivedAssets.files, textureIndexFile];
    const sync = await this.moduleBlobStorage.replaceModuleSnapshot(
      settings.blobStorage,
      allFiles,
      {
        forceFull: options?.forceFull === true
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
        this.packedModuleExtractor,
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
    modelResRefs: string[]
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
        this.packedModuleExtractor,
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
    const requestedTextureResRefs = collectAuroraMdlTextureReferencesFromFiles(sourceFiles);
    const textureFilesByName = new Map<string, TextureSourceFile>();
    if (requestedTextureResRefs.length > 0 && settings.sources.tile.includeHaks) {
      const hakTextureFiles = await readHakTextureAssets(
        tileHakPaths,
        requestedTextureResRefs,
        this.packedModuleExtractor,
        this.logger
      );
      for (const file of hakTextureFiles) {
        textureFilesByName.set(file.fileName, file);
      }
    }
    if (requestedTextureResRefs.length > 0 && settings.sources.tile.includeVanilla) {
      const missingTextureResRefs = requestedTextureResRefs.filter(
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
    }
    const textureFiles = [...textureFilesByName.values()];
    const derivedAssets = await this.generateDerivedAssetFiles(settings, sourceFiles);
    const storedFiles: VanillaTileModelSourceSyncEnvelope["files"] = [];
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

    if (requestedAppearanceTypes.length === 0 && directModelResRefs.length === 0) {
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
        missingAppearanceTypes: [],
        requestedModelResRefs: [],
        missingModelResRefs: [],
        uploadedFiles: 0,
        uploadedBytes: 0,
        derivedAssets: buildSkippedDerivedAssetSummary("no_placeable_sources_requested"),
        files: [],
        skippedReason: "no_placeable_sources_requested"
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
        this.packedModuleExtractor,
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
    }

    if (settings.sources.placeable.includeVanilla) {
      const vanillaTwoDa = await readVanillaPlaceablesTwoDaAsset(vanillaDataPath, this.logger);
      if (vanillaTwoDa) {
        sourceFilesByName.set(vanillaTwoDa.file.fileName, vanillaTwoDa.file);
        for (const [rowId, modelResRef] of vanillaTwoDa.appearanceModelByRowId) {
          if (!appearanceModelByRowId.has(rowId)) {
            appearanceModelByRowId.set(rowId, modelResRef);
          }
        }
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
        this.packedModuleExtractor,
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

  private async loadSourceSupplementFiles(
    settings: RuntimeSettingsRecord
  ): Promise<SourceSupplementResult> {
    const textureFiles: TextureSourceFile[] = [];
    const placeableAssetFiles: PackedModuleFile[] = [];
    const soundAssetFiles: PackedModuleFile[] = [];
    let hakTextures = 0;
    let hakPlaceableAssets = 0;
    let hakSounds = 0;
    let vanillaTextures = 0;

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
        for (const asset of extractedSoundAssetFiles) {
          soundAssetFiles.push({
            fileName: normalizeRelativePath(`__aurora/sources/hak/${hakName}/${asset.fileName}`),
            resourceType: asset.resourceType,
            bytes: Buffer.from(asset.bytes)
          });
        }
        hakTextures += extractedTextureFiles.length;
        hakPlaceableAssets += extractedPlaceableAssetFiles.length;
        hakSounds += extractedSoundAssetFiles.length;
      } catch (error) {
        this.logger.warn(
          `Skipping HAK supplement source because extraction failed (${resolved}): ${stringifyError(error)}`
        );
      }
    }

    const includeVanilla = shouldIncludeVanillaTextures(settings);
    if (includeVanilla) {
      const vanillaRoot = resolveFilePath(settings.paths.vanillaDataPath.trim());
      if (await existsAsDirectory(vanillaRoot)) {
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
        if (settings.sources.placeable.includeVanilla) {
          const vanillaPlaceableAssets = await readVanillaPlaceableAssetsFromKeyBif(
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
      } else {
        this.logger.warn(
          `Skipping vanilla texture source because directory does not exist: ${vanillaRoot}`
        );
      }
    }

    return {
      textureFiles,
      placeableAssetFiles,
      soundAssetFiles,
      summary: {
        hakTextures,
        hakPlaceableAssets,
        hakSounds,
        vanillaTextures
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
      textureFiles
    );
    for (const entry of incomingRecord.entries) {
      nextEntriesByObjectKey.set(entry.objectKey, entry);
    }

    const nextRecord = buildTextureIndexRecordFromEntries(
      settings.revision,
      settings.blobStorage.modulePrefix,
      [...nextEntriesByObjectKey.values()]
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
    resolved[assetKind] = resolveSingleSourceHakSettings(
      settings.paths.hakDirectoryPath,
      settings.hakProfiles,
      settings.sources[assetKind],
      assetKind === "placeable" ? moduleIfoHakList : []
    );
  }

  return resolved;
}

function resolveSingleSourceHakSettings(
  hakDirectoryPath: string,
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
      hakPaths: list.map((hakEntry) => resolveHakPath(hakDirectoryPath, hakEntry))
    };
  }

  if (fallbackHakList.length > 0) {
    const list = deduplicateOrdered(fallbackHakList);
    return {
      mode: "module_ifo",
      includeHaks: true,
      hakProfileId: source.hakProfileId.trim() || null,
      hakPriorityList: list,
      hakPaths: list.map((hakEntry) => resolveHakPath(hakDirectoryPath, hakEntry))
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
        hakPaths: list.map((hakEntry) => resolveHakPath(hakDirectoryPath, hakEntry))
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

function extractModuleIfoHakList(bytes: Buffer): string[] {
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

function resolveHakPath(hakDirectoryPath: string, entry: string): string {
  const normalizedEntry = normalizeHakPathEntry(entry);
  const resolvedHakDirectoryPath = resolveFilePath(hakDirectoryPath);
  return isAbsolute(normalizedEntry)
    ? resolveFilePath(normalizedEntry)
    : resolve(resolvedHakDirectoryPath, normalizedEntry);
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

function resolveHostLocalMountedPath(pathValue: string): string | null {
  if (!isTruthyEnv(process.env.AURORA_HOST_LOCAL_RUNTIME)) {
    return null;
  }
  const normalized = pathValue
    .trim()
    .replace(/\\/gu, "/")
    .replace(/^[a-z]:\/host\//iu, "/host/")
    .replace(/\/+$/u, "");
  const mountMappings = [
    {
      mount: "/host/nwn-docs",
      localRoot: "C:/Users/enonw/Documents/Neverwinter Nights"
    },
    {
      mount: "/host/nwn-game",
      localRoot: "C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights"
    }
  ];
  const match = mountMappings.find(
    (mapping) => normalized === mapping.mount || normalized.startsWith(`${mapping.mount}/`)
  );
  if (!match) {
    return null;
  }
  const suffix = normalized.slice(match.mount.length).replace(/^\/+/u, "");
  return suffix ? resolve(match.localRoot, ...suffix.split("/")) : resolve(match.localRoot);
}

function isTruthyEnv(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
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

function collectEnabledHakPaths(
  settings: RuntimeSettingsRecord,
  moduleIfoHakList: string[] = []
): string[] {
  const resolved = resolveHakSettingsByAsset(settings, moduleIfoHakList);
  const enabledKinds: RuntimeAssetKind[] = ["placeable", "tile", "area", "sound", "vfx"];
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
    settings.sources.vfx.includeVanilla
  );
}

async function readVanillaPlaceableAssetsFromKeyBif(
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

  const placeables2daBytes = await reader.read(
    "placeables",
    NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA
  );
  if (!placeables2daBytes) {
    return [];
  }

  const filesByName = new Map<string, PackedModuleFile>();
  filesByName.set("__aurora/sources/vanilla/placeables.2da", {
    fileName: "__aurora/sources/vanilla/placeables.2da",
    resourceType: NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA,
    bytes: placeables2daBytes
  });

  const modelResrefs = parsePlaceableModelResrefsFromTwoDa(placeables2daBytes);
  for (const resref of modelResrefs) {
    for (const assetType of VANILLA_PLACEABLE_RELATED_RESOURCE_TYPES) {
      if (!reader.has(resref, assetType.resourceType)) {
        continue;
      }

      const bytes = await reader.read(resref, assetType.resourceType);
      if (!bytes) {
        continue;
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
  packedModuleExtractor: PackedModuleExtractorPort,
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
      const extracted = await packedModuleExtractor.extractFromPackedModule(resolved);
      const hakName = sanitizeSegment(basename(resolved, extname(resolved)));
      for (const asset of extracted) {
        const extension = extname(asset.fileName).replace(/^\./u, "").toLowerCase();
        if (extension !== "set") {
          continue;
        }
        const fileName = normalizeRelativePath(
          `__aurora/sources/hak/${hakName}/${asset.fileName}`
        );
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
        `Skipping HAK tileset SET source because extraction failed (${resolved}): ${stringifyError(error)}`
      );
    }
  }
  return [...filesByName.values()];
}

async function readHakTileModelAssets(
  hakPaths: string[],
  modelResRefs: string[],
  packedModuleExtractor: PackedModuleExtractorPort,
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
    try {
      const extracted = await packedModuleExtractor.extractFromPackedModule(resolved);
      const hakName = sanitizeSegment(basename(resolved, extname(resolved)));
      for (const asset of extracted) {
        const extension = extname(asset.fileName).replace(/^\./u, "").toLowerCase();
        if (!VANILLA_TILE_MODEL_RESOURCE_TYPES.some((entry) => entry.extension === extension)) {
          continue;
        }
        const resref = basename(asset.fileName, extname(asset.fileName)).trim().toLowerCase();
        if (!requested.has(resref)) {
          continue;
        }
        foundByResRef.add(resref);
        const fileName = normalizeRelativePath(
          `__aurora/sources/hak/${hakName}/${asset.fileName}`
        );
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
        `Skipping HAK tile model source because extraction failed (${resolved}): ${stringifyError(error)}`
      );
    }
  }

  return {
    files: [...filesByName.values()],
    missingModelResRefs: modelResRefs.filter(
      (resref) => !foundByResRef.has(resref.trim().toLowerCase())
    )
  };
}

async function readHakPlaceablesTwoDaAssets(
  hakPaths: string[],
  packedModuleExtractor: PackedModuleExtractorPort,
  logger: Logger
): Promise<{
  files: PackedModuleFile[];
  appearanceModelByRowId: Map<number, string>;
}> {
  const filesByName = new Map<string, PackedModuleFile>();
  const appearanceModelByRowId = new Map<number, string>();

  for (const hakPath of deduplicateOrdered(hakPaths)) {
    const resolved = resolveFilePath(hakPath);
    if (!(await existsAsFile(resolved))) {
      logger.warn(`Skipping HAK placeables.2da source because file does not exist: ${resolved}`);
      continue;
    }
    try {
      const extracted = await packedModuleExtractor.extractFromPackedModule(resolved);
      const hakName = sanitizeSegment(basename(resolved, extname(resolved)));
      for (const asset of extracted) {
        if (basename(asset.fileName).trim().toLowerCase() !== "placeables.2da") {
          continue;
        }
        const fileName = normalizeRelativePath(
          `__aurora/sources/hak/${hakName}/${asset.fileName}`
        );
        const file = {
          fileName,
          resourceType: asset.resourceType,
          bytes: Buffer.from(asset.bytes)
        };
        filesByName.set(fileName, file);
        const lookup = parsePlaceablesAppearanceModelLookup(file.bytes);
        for (const [rowId, modelResRef] of lookup) {
          if (!appearanceModelByRowId.has(rowId)) {
            appearanceModelByRowId.set(rowId, modelResRef);
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

async function readVanillaPlaceablesTwoDaAsset(
  vanillaRoot: string,
  logger: Logger
): Promise<{
  file: PackedModuleFile;
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

  const bytes = await reader.read("placeables", NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA);
  if (!bytes) {
    return null;
  }

  return {
    file: {
      fileName: "__aurora/sources/vanilla/placeables.2da",
      resourceType: NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA,
      bytes
    },
    appearanceModelByRowId: parsePlaceablesAppearanceModelLookup(bytes)
  };
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

async function readHakTextureAssets(
  hakPaths: string[],
  textureResRefs: string[],
  packedModuleExtractor: PackedModuleExtractorPort,
  logger: Logger
): Promise<TextureSourceFile[]> {
  const requested = new Set(normalizeRequestedTextureResrefs(textureResRefs));
  if (requested.size === 0) {
    return [];
  }

  const filesByName = new Map<string, TextureSourceFile>();
  for (const hakPath of deduplicateOrdered(hakPaths)) {
    const resolved = resolveFilePath(hakPath);
    if (!(await existsAsFile(resolved))) {
      logger.warn(`Skipping HAK texture source because file does not exist: ${resolved}`);
      continue;
    }
    try {
      const extracted = await packedModuleExtractor.extractFromPackedModule(resolved);
      const hakName = sanitizeSegment(basename(resolved, extname(resolved)));
      for (const asset of extracted) {
        if (!isTextureFileName(asset.fileName)) {
          continue;
        }
        const resref = normalizeTextureResref(
          basename(asset.fileName, extname(asset.fileName))
        );
        if (!resref || !requested.has(resref)) {
          continue;
        }
        const fileName = normalizeRelativePath(
          `__aurora/sources/hak/${hakName}/${asset.fileName}`
        );
        if (!filesByName.has(fileName)) {
          filesByName.set(fileName, {
            fileName,
            resourceType: asset.resourceType,
            bytes: Buffer.from(asset.bytes),
            source: "hak",
            sourcePath: normalizeRelativePath(resolved)
          });
        }
      }
    } catch (error) {
      logger.warn(
        `Skipping HAK texture source because extraction failed (${resolved}): ${stringifyError(error)}`
      );
    }
  }
  return [...filesByName.values()];
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

function parsePlaceablesAppearanceModelLookup(bytes: Buffer): Map<number, string> {
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
    const text = Buffer.from(file.bytes).toString("latin1");
    const matches = text.matchAll(
      /(?:^|[\r\n\t ])(?:bitmap|texture\d*|texture)\s+("[^"\r\n]+"|[^\s\r\n]+)/giu
    );
    for (const match of matches) {
      const resref = normalizeTextureResref(match[1]);
      if (resref) {
        references.add(resref);
      }
    }
  }
  return [...references].sort((left, right) => left.localeCompare(right));
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
  if (normalizedFileName === "placeables.2da") {
    return true;
  }

  const extension = extname(fileName).replace(/^\./u, "").toLowerCase();
  return PLACEABLE_HAK_ASSET_EXTENSIONS.has(extension);
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
  files: TextureSourceFile[]
): TextureIndexRecord {
  const normalizedPrefix = normalizeBlobPrefix(modulePrefix);
  const entries = files
    .map((file) => buildTextureIndexEntry(normalizedPrefix, file))
    .sort((left, right) => left.objectKey.localeCompare(right.objectKey));

  return buildTextureIndexRecordFromEntries(settingsRevision, normalizedPrefix, entries);
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
  entries: TextureIndexEntry[]
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
    generatedAt: new Date().toISOString(),
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
