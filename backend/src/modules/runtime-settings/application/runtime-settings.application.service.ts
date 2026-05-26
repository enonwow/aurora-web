import { Inject, Injectable, Logger } from "@nestjs/common";
import { readdir, readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { basename, extname, isAbsolute, resolve } from "node:path";
import { AppException } from "../../../common/http/app-exception";
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

const RUNTIME_ASSET_KINDS = ["placeable", "tile", "area", "sound"] as const;
const TEXTURE_EXTENSIONS = new Set(["dds", "tga", "plt", "txi", "mtr", "bmp"]);
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
  textures: TextureSyncSummary;
}

interface TextureSourceFile extends PackedModuleFile {
  source: "module" | "hak" | "vanilla";
  sourcePath: string;
}

interface TextureSupplementResult {
  files: TextureSourceFile[];
  summary: {
    hakTextures: number;
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
  private readonly logger = new Logger(RuntimeSettingsApplicationService.name);
  private textureIndexLookupCache: TextureIndexLookupCacheEntry | null = null;

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
    const textureSupplement = await this.loadTextureSupplementFiles(settings);
    const textureFiles = [...moduleTextureFiles, ...textureSupplement.files];
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

    const allFiles = [
      ...source.files,
      ...toPackedModuleFileList(textureSupplement.files),
      textureIndexFile
    ];
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
      textures: {
        uploadedTextureFiles: textureFiles.length,
        uploadedTextureBytes: sumBytes(textureFiles),
        moduleTextures: moduleTextureFiles.length,
        hakTextures: textureSupplement.summary.hakTextures,
        vanillaTextures: textureSupplement.summary.vanillaTextures,
        textureIndexObjectKey
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

  private async loadTextureSupplementFiles(
    settings: RuntimeSettingsRecord
  ): Promise<TextureSupplementResult> {
    const files: TextureSourceFile[] = [];
    let hakTextures = 0;
    let vanillaTextures = 0;

    const hakPaths = collectEnabledHakPaths(settings);
    const uniqueHakPaths = deduplicateOrdered(hakPaths);
    for (const hakPath of uniqueHakPaths) {
      const resolved = resolveFilePath(hakPath);
      if (!(await existsAsFile(resolved))) {
        this.logger.warn(`Skipping HAK texture source because file does not exist: ${resolved}`);
        continue;
      }

      try {
        const extracted = await this.packedModuleExtractor.extractFromPackedModule(resolved);
        const textureFiles = extracted.filter((entry) =>
          isTextureFileName(entry.fileName)
        );
        const hakName = sanitizeSegment(basename(resolved, extname(resolved)));
        for (const texture of textureFiles) {
          files.push({
            fileName: normalizeRelativePath(`__aurora/sources/hak/${hakName}/${texture.fileName}`),
            resourceType: texture.resourceType,
            bytes: Buffer.from(texture.bytes),
            source: "hak",
            sourcePath: normalizeRelativePath(resolved)
          });
        }
        hakTextures += textureFiles.length;
      } catch (error) {
        this.logger.warn(
          `Skipping HAK texture source because extraction failed (${resolved}): ${stringifyError(error)}`
        );
      }
    }

    const includeVanilla = shouldIncludeVanillaTextures(settings);
    if (includeVanilla) {
      const vanillaRoot = resolveFilePath(settings.paths.vanillaDataPath.trim());
      if (await existsAsDirectory(vanillaRoot)) {
        const vanillaFiles = await readTextureFilesFromDirectory(vanillaRoot, vanillaRoot);
        for (const texture of vanillaFiles) {
          files.push({
            fileName: normalizeRelativePath(`__aurora/sources/vanilla/${texture.relativePath}`),
            resourceType: texture.resourceType,
            bytes: texture.bytes,
            source: "vanilla",
            sourcePath: texture.relativePath
          });
        }
        vanillaTextures += vanillaFiles.length;
      } else {
        this.logger.warn(
          `Skipping vanilla texture source because directory does not exist: ${vanillaRoot}`
        );
      }
    }

    return {
      files,
      summary: {
        hakTextures,
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

function resolveFilePath(pathValue: string): string {
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

function collectEnabledHakPaths(settings: RuntimeSettingsRecord): string[] {
  const resolved = resolveHakSettingsByAsset(settings);
  const enabledKinds: RuntimeAssetKind[] = ["placeable", "tile", "area"];
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
    settings.sources.area.includeVanilla
  );
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
    .map((file) => {
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
      } satisfies TextureIndexEntry;
    })
    .sort((left, right) => left.objectKey.localeCompare(right.objectKey));

  const byResref: TextureIndexRecord["byResref"] = {};
  for (const entry of entries) {
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
    totalTextures: entries.length,
    totalBytes: entries.reduce((sum, entry) => sum + entry.sizeBytes, 0),
    entries,
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

function buildS3ObjectUrl(bucket: string, objectKey: string): string {
  const normalizedObjectKey = objectKey.replace(/^\/+/u, "");
  return `s3://${bucket}/${normalizedObjectKey}`;
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
