import { Inject, Injectable, Optional } from "@nestjs/common";
import { createHash } from "node:crypto";
import { executeInFlight } from "../../../common/async/in-flight.helpers";
import {
  buildBlobObjectHttpUrl,
  buildS3ObjectUrl
} from "../../../common/blob/blob-url.helpers";
import { AppException } from "../../../common/http/app-exception";
import { AppConfigService } from "../../../common/config/app-config.service";
import {
  DERIVED_ASSET_GENERATOR,
  type DerivedAssetGeneratorPort
} from "../../runtime-settings/application/ports/derived-asset-generator.port";
import {
  MODULE_BLOB_STORAGE,
  type ModuleBlobObjectPayload,
  type ModuleBlobStoragePort
} from "../../runtime-settings/application/ports/module-blob-storage.port";
import {
  RUNTIME_SETTINGS_REPOSITORY,
  type RuntimeSettingsRepositoryPort
} from "../../runtime-settings/application/ports/runtime-settings-repository.port";
import {
  RuntimeSettingsApplicationService,
  type TextureDeliveryContract
} from "../../runtime-settings/application/runtime-settings.application.service";
import { inspectAuroraMdlSource } from "../../runtime-settings/adapters/outbound/derived/aurora-mdl-ascii-to-glb.converter";
import type { BlobStorageSettings } from "../../runtime-settings/domain/runtime-settings.types";
import { AURORA_MDL_TO_GLB_CONVERTER_VERSION } from "../../runtime-settings/domain/derived-asset-versions";
import {
  TILE_PROCESSING_CACHE,
  type TileProcessingCachePort
} from "./ports/tile-processing-cache.port";
import {
  TILE_REPOSITORY,
  type TileRepositoryPort
} from "./ports/tile-repository.port";
import type {
  BenchmarkDurationSummary,
  TileBenchmarkResult,
  TileBenchmarkRunQuery,
  TileDeliveryMode,
  TileListQuery,
  TileProcessQuery,
  TileProcessingResult,
  TileRecord,
  TileMaterialTextureAssetContract,
  TileRenderAssetContract,
  TileSourceAssetContract,
  TileSourceAssetRole
} from "../domain/tile.types";
import { buildTileProcessCacheKey, buildTileRendererPreset } from "../domain/tile-processing.builders";

export interface TileProcessingEnvelope {
  cache: {
    key: string;
    hit: boolean;
    storedAt: string;
    hits: number;
  };
  tile: TileProcessingResult;
}

export interface TileTextureBlobEnvelope {
  cacheKey: string;
  textureAtlas: TileProcessingResult["textureAtlas"];
  payload: ModuleBlobObjectPayload;
}

export interface TileTextureDeliveryContract {
  mode: TileDeliveryMode;
  atlasId: string;
  objectKey: string;
  contentType: string;
  sizeBytes: number;
  etag?: string;
  proxyPath: string;
  proxyUrl: string;
  directUrl?: string;
  s3Url?: string;
}

export interface TileTextureDeliveryEnvelope {
  cacheKey: string;
  textureAtlas: TileTextureDeliveryContract;
}

export interface TileProcessBatchItemQuery {
  tileId: string;
  bypassCache?: boolean;
}

export interface TileProcessBatchItemEnvelope {
  tileId: string;
  status: "ready" | "blocked";
  result?: TileProcessingEnvelope;
  error?: {
    code: string | null;
    message: string;
  };
}

export interface TileProcessBatchEnvelope {
  items: TileProcessBatchItemEnvelope[];
}

export interface TileModelBlobEnvelope {
  cacheKey: string;
  modelAsset: NonNullable<TileRenderAssetContract["modelAsset"]>;
  payload: ModuleBlobObjectPayload;
}

const TILE_REPOSITORY_SNAPSHOT_REFRESH_DEBOUNCE_MS = 2_000;
const TILE_CATALOG_ID_PREFIX = "tile_";
const TILE_AUTO_SOURCE_SYNC_TRIGGERED_BY = "areas-tile-process-auto-sync";
const TILE_PROCESS_BATCH_CONCURRENCY = 12;
const GLB_MAGIC = 0x46546c67;
const GLB_JSON_CHUNK_TYPE = 0x4e4f534a;
const TILE_MODEL_FOOTPRINT_HALF_EXTENT_LIMIT = 5.25;

@Injectable()
export class TilesApplicationService {
  private readonly inFlightTileProcessing = new Map<string, Promise<TileProcessingEnvelope>>();
  private readonly inFlightTileMaterialSourceSync = new Map<string, Promise<void>>();
  private tileRepositorySnapshotRefreshedAtMs = 0;

  constructor(
    @Inject(TILE_REPOSITORY)
    private readonly repository: TileRepositoryPort,
    @Inject(TILE_PROCESSING_CACHE)
    private readonly processingCache: TileProcessingCachePort,
    private readonly appConfig?: AppConfigService,
    @Inject(RUNTIME_SETTINGS_REPOSITORY)
    private readonly runtimeSettingsRepository?: RuntimeSettingsRepositoryPort,
    @Inject(MODULE_BLOB_STORAGE)
    private readonly moduleBlobStorage?: ModuleBlobStoragePort,
    @Optional()
    private readonly runtimeSettingsApplication?: RuntimeSettingsApplicationService,
    @Optional()
    @Inject(DERIVED_ASSET_GENERATOR)
    private readonly derivedAssetGenerator?: DerivedAssetGeneratorPort
  ) {}

  listTiles(query: TileListQuery) {
    return this.repository.list(query);
  }

  async getTile(tileId: string) {
    const tile = await this.repository.findById(tileId);
    if (!tile) {
      throw new AppException({
        status: 404,
        code: "TILE_NOT_FOUND",
        message: "Tile was not found."
      });
    }

    return {
      tileId: tile.tileId,
      resref: tile.resref,
      name: tile.name,
      tileset: tile.tileset,
      variant: tile.variant,
      tags: tile.tags,
      benchmark: tile.benchmark,
      previewImageUrl: tile.previewImageUrl,
      textureAtlas: {
        atlasId: tile.textureAtlasId,
        cacheKey: `${tile.textureAtlasId}:${tile.tileId}`,
        strategy: "blob-cache" as const,
        objectKey: tile.textureAtlasObjectKey,
        contentType: tile.textureAtlasContentType,
        sizeBytes: tile.textureAtlasSizeBytes,
        etag: tile.textureAtlasEtag
      },
      sourceAsset: buildTileSourceAssetContract(tile),
      renderAssetContract: await this.buildTileRenderAssetContractForTile(
        tile,
        buildTileProcessCacheKey(tile)
      ),
      walkmesh: tile.walkmesh,
      metrics: tile.metrics,
      updatedAt: tile.updatedAt
    };
  }

  async getTilePreview(tileId: string) {
    const tile = await this.repository.findById(tileId);
    if (!tile) {
      throw new AppException({
        status: 404,
        code: "TILE_NOT_FOUND",
        message: "Tile was not found."
      });
    }

    return {
      tileId: tile.tileId,
      resref: tile.resref,
      name: tile.name,
      previewImageUrl: tile.previewImageUrl,
      benchmark: tile.benchmark,
      tileset: tile.tileset,
      variant: tile.variant,
      walkmesh: tile.walkmesh,
      metrics: tile.metrics,
      updatedAt: tile.updatedAt
    };
  }

  async processTile(query: TileProcessQuery) {
    if (query.bypassCache) {
      await this.refreshTileRepositorySnapshotForBypass();
    }
    const tile = await this.resolveTileRecordForProcess(query.tileId, query.bypassCache);
    const precomputed = this.repository.getPrecomputedTileProcessing?.(tile.tileId);
    const cacheKey = precomputed?.cacheKey ?? buildTileProcessCacheKey(tile);

    if (!query.bypassCache) {
      const cached = await this.processingCache.get(cacheKey);
      if (cached) {
        const hydrated = await this.ensureTileTextureAtlas(cacheKey, cached.value);
        return {
          cache: {
            key: cacheKey,
            hit: true,
            storedAt: cached.storedAt,
            hits: cached.hits
          },
          tile: hydrated
        };
      }
    }

    const processMiss = async (): Promise<TileProcessingEnvelope> => {
      const rendererPreset = buildTileRendererPreset(tile);
      const processed: TileProcessingResult = {
        tileId: tile.tileId,
        resref: tile.resref,
        name: tile.name,
        tileset: tile.tileset,
        variant: tile.variant,
        tags: tile.tags,
        benchmark: tile.benchmark,
        previewImageUrl: tile.previewImageUrl,
        textureAtlas: {
          atlasId: tile.textureAtlasId,
          cacheKey: `${tile.textureAtlasId}:${tile.tileId}`,
          strategy: "blob-cache",
          objectKey: tile.textureAtlasObjectKey,
          contentType: tile.textureAtlasContentType,
          sizeBytes: tile.textureAtlasSizeBytes,
          etag: tile.textureAtlasEtag
        },
        sourceAsset: buildTileSourceAssetContract(tile),
        renderAssetContract: await this.buildTileRenderAssetContractForTile(tile, cacheKey),
        walkmesh: tile.walkmesh,
        metrics: tile.metrics,
        render: {
          backendType: "tile",
          frontendType: "tile",
          rendererPreset
        },
        updatedAt: tile.updatedAt,
        processedAt: new Date().toISOString()
      };

      const stored = await this.processingCache.set(cacheKey, processed);
      return {
        cache: {
          key: cacheKey,
          hit: false,
          storedAt: stored.storedAt,
          hits: stored.hits
        },
        tile: processed
      };
    };

    return query.bypassCache
      ? processMiss()
      : executeInFlight(this.inFlightTileProcessing, cacheKey, processMiss);
  }

  async processTilesBatch(items: TileProcessBatchItemQuery[]): Promise<TileProcessBatchEnvelope> {
    const dedupedItems = dedupeTileProcessBatchItems(items);
    await this.syncMissingVanillaTileModelSourcesForTileIds(
      dedupedItems.map((item) => item.tileId)
    );

    const results = new Map<string, TileProcessBatchItemEnvelope>();
    let cursor = 0;
    const runWorker = async (): Promise<void> => {
      while (cursor < dedupedItems.length) {
        const item = dedupedItems[cursor];
        cursor += 1;
        if (!item) {
          continue;
        }
        try {
          results.set(item.tileId, {
            tileId: item.tileId,
            status: "ready",
            result: await this.processTile({
              tileId: item.tileId,
              bypassCache: item.bypassCache === true
            })
          });
        } catch (error) {
          results.set(item.tileId, {
            tileId: item.tileId,
            status: "blocked",
            error: {
              code: getExceptionCode(error),
              message: getExceptionMessage(error)
            }
          });
        }
      }
    };

    const workerCount = Math.min(TILE_PROCESS_BATCH_CONCURRENCY, dedupedItems.length);
    await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
    return {
      items: items.map(
        (item) =>
          results.get(item.tileId) ?? {
            tileId: item.tileId,
            status: "blocked",
            error: {
              code: "TILE_BATCH_RESULT_MISSING",
              message: "Tile batch result was not produced."
            }
          }
      )
    };
  }

  private async refreshTileRepositorySnapshotForBypass(): Promise<void> {
    if (!this.repository.refreshSnapshot) {
      return;
    }

    const now = Date.now();
    if (
      now - this.tileRepositorySnapshotRefreshedAtMs <
      TILE_REPOSITORY_SNAPSHOT_REFRESH_DEBOUNCE_MS
    ) {
      return;
    }

    await this.repository.refreshSnapshot();
    this.tileRepositorySnapshotRefreshedAtMs = now;
  }

  async getProcessedTile(cacheKey: string) {
    const cached = await this.processingCache.get(cacheKey);
    if (!cached) {
      throw new AppException({
        status: 404,
        code: "TILE_CACHE_NOT_FOUND",
        message: "Tile cache entry was not found."
      });
    }

    const hydrated = await this.ensureTileTextureAtlas(cacheKey, cached.value);
    return {
      cache: {
        key: cacheKey,
        hit: true,
        storedAt: cached.storedAt,
        hits: cached.hits
      },
      tile: hydrated
    };
  }

  async getProcessedTileTexture(cacheKey: string): Promise<TileTextureBlobEnvelope> {
    const cached = await this.processingCache.get(cacheKey);
    if (!cached) {
      throw new AppException({
        status: 404,
        code: "TILE_CACHE_NOT_FOUND",
        message: "Tile cache entry was not found."
      });
    }

    const hydrated = await this.ensureTileTextureAtlas(cacheKey, cached.value);
    assertTileTextureDeliveryAvailable(hydrated);
    if (
      !hydrated.textureAtlas.objectKey ||
      !hydrated.textureAtlas.contentType ||
      !hydrated.textureAtlas.sizeBytes
    ) {
      throw new AppException({
        status: 404,
        code: "TILE_TEXTURE_BLOB_NOT_FOUND",
        message: "Tile texture blob metadata is missing in cache entry."
      });
    }

    const payload = await this.readModuleBlobObject(hydrated.textureAtlas.objectKey);
    if (!payload) {
      throw new AppException({
        status: 404,
        code: "TILE_TEXTURE_BLOB_NOT_FOUND",
        message: "Tile texture blob object was not found."
      });
    }

    return {
      cacheKey,
      textureAtlas: hydrated.textureAtlas,
      payload
    };
  }

  async getProcessedTileTextureDelivery(
    cacheKey: string,
    mode: TileDeliveryMode
  ): Promise<TileTextureDeliveryEnvelope> {
    const cached = await this.processingCache.get(cacheKey);
    if (!cached) {
      throw new AppException({
        status: 404,
        code: "TILE_CACHE_NOT_FOUND",
        message: "Tile cache entry was not found."
      });
    }

    const hydrated = await this.ensureTileTextureAtlas(cacheKey, cached.value);
    assertTileTextureDeliveryAvailable(hydrated);
    if (
      !hydrated.textureAtlas.objectKey ||
      !hydrated.textureAtlas.contentType ||
      !hydrated.textureAtlas.sizeBytes
    ) {
      throw new AppException({
        status: 404,
        code: "TILE_TEXTURE_BLOB_NOT_FOUND",
        message: "Tile texture blob metadata is missing in cache entry."
      });
    }

    const blobSettings = await this.getBlobStorageSettings();
    if (mode === "direct" && !blobSettings) {
      throw new AppException({
        status: 422,
        code: "TILE_DIRECT_DELIVERY_UNAVAILABLE",
        message: "Direct tile delivery is unavailable without blob storage settings."
      });
    }

    const proxyPath = buildTileTextureDeliveryPath(cacheKey);
    return {
      cacheKey,
      textureAtlas: {
        mode,
        atlasId: hydrated.textureAtlas.atlasId,
        objectKey: hydrated.textureAtlas.objectKey,
        contentType: hydrated.textureAtlas.contentType,
        sizeBytes: hydrated.textureAtlas.sizeBytes,
        etag: hydrated.textureAtlas.etag,
        proxyPath,
        proxyUrl: proxyPath,
        directUrl:
          mode === "direct" && blobSettings
            ? buildBlobObjectHttpUrl(blobSettings, hydrated.textureAtlas.objectKey)
            : undefined,
        s3Url: blobSettings
          ? buildS3ObjectUrl(blobSettings.bucket, hydrated.textureAtlas.objectKey)
          : undefined
      }
    };
  }

  async getProcessedTileModel(cacheKey: string): Promise<TileModelBlobEnvelope> {
    const cached = await this.processingCache.get(cacheKey);
    if (!cached) {
      throw new AppException({
        status: 404,
        code: "TILE_CACHE_NOT_FOUND",
        message: "Tile cache entry was not found."
      });
    }

    const hydrated = await this.ensureTileTextureAtlas(cacheKey, cached.value);
    const modelAsset = hydrated.renderAssetContract?.modelAsset;
    if (!modelAsset) {
      throw new AppException({
        status: 404,
        code: "TILE_MODEL_BLOB_NOT_FOUND",
        message: hydrated.renderAssetContract?.expectedDerivedModelObjectKey
          ? `Tile model GLB/GLTF is missing. Expected derived object key: ${hydrated.renderAssetContract.expectedDerivedModelObjectKey}.`
          : "Tile model GLB/GLTF metadata is missing in cache entry."
      });
    }

    const payload = await this.readModuleBlobObject(modelAsset.objectKey);
    if (!payload) {
      throw new AppException({
        status: 404,
        code: "TILE_MODEL_BLOB_NOT_FOUND",
        message: `Tile model blob object was not found: ${modelAsset.objectKey}.`
      });
    }

    return {
      cacheKey,
      modelAsset,
      payload
    };
  }

  async benchmarkTiles(query: TileBenchmarkRunQuery): Promise<TileBenchmarkResult> {
    const candidates = await this.resolveBenchmarkCandidates(query.tileIds);
    const perCandidate: Array<{
      tileId: string;
      resref: string;
      metrics: BenchmarkDurationSummary;
    }> = [];
    const allDurations: number[] = [];
    const startedAt = new Date().toISOString();

    for (const candidate of candidates) {
      for (let warmup = 0; warmup < query.warmupIterations; warmup += 1) {
        await this.processTile({
          tileId: candidate.tileId,
          bypassCache: true
        });
      }

      const durations: number[] = [];
      for (let iteration = 0; iteration < query.iterations; iteration += 1) {
        const started = process.hrtime.bigint();
        await this.processTile({
          tileId: candidate.tileId,
          bypassCache: query.bypassCache
        });
        const ended = process.hrtime.bigint();
        const elapsedMs = Number(ended - started) / 1_000_000;
        durations.push(elapsedMs);
        allDurations.push(elapsedMs);
      }

      perCandidate.push({
        tileId: candidate.tileId,
        resref: candidate.resref,
        metrics: summarizeDurations(durations)
      });
    }

    const finishedAt = new Date().toISOString();
    return {
      datasetFingerprint: buildBenchmarkFingerprint(candidates, query),
      config: {
        iterations: query.iterations,
        warmupIterations: query.warmupIterations,
        bypassCache: query.bypassCache,
        candidates: candidates.length
      },
      timing: {
        startedAt,
        finishedAt
      },
      metrics: {
        overall: summarizeDurations(allDurations),
        perCandidate
      }
    };
  }

  private async resolveTileRecord(tileId: string): Promise<TileRecord> {
    const tile = await this.repository.findById(tileId);
    if (!tile) {
      throw new AppException({
        status: 404,
        code: "TILE_NOT_FOUND",
        message: "Tile was not found."
      });
    }
    return tile;
  }

  private async resolveTileRecordForProcess(
    tileId: string,
    bypassCache: boolean
  ): Promise<TileRecord> {
    const tile = await this.repository.findById(tileId);
    if (tile) {
      if (bypassCache && shouldRefreshTileModelSourceForRenderReadiness(tile)) {
        await this.syncMissingVanillaTileModelSource(tileId);
        const syncedTile = await this.repository.findById(tileId);
        if (syncedTile) {
          return syncedTile;
        }
      }
      return tile;
    }

    if (bypassCache || parseTileModelResRefFromCatalogId(tileId)) {
      await this.syncMissingVanillaTileModelSource(tileId);
      const syncedTile = await this.repository.findById(tileId);
      if (syncedTile) {
        return syncedTile;
      }
    }

    throw new AppException({
      status: 404,
      code: "TILE_NOT_FOUND",
      message: `Tile was not found. ${formatMissingTileSourceSyncHint(tileId)}`
    });
  }

  private async syncMissingVanillaTileModelSource(tileId: string): Promise<void> {
    const modelResRef = parseTileModelResRefFromCatalogId(tileId);
    if (!modelResRef || !this.runtimeSettingsApplication) {
      return;
    }

    await this.runtimeSettingsApplication.syncVanillaTileModelSources(
      TILE_AUTO_SOURCE_SYNC_TRIGGERED_BY,
      [modelResRef]
    );
    await this.repository.refreshSnapshot?.();
    this.tileRepositorySnapshotRefreshedAtMs = Date.now();
  }

  private async syncMissingVanillaTileModelSourcesForTileIds(tileIds: string[]): Promise<void> {
    if (!this.runtimeSettingsApplication) {
      return;
    }
    const modelResRefs = dedupeText(await this.collectTileModelResRefsNeedingSourceSync(tileIds));
    if (modelResRefs.length === 0) {
      return;
    }
    await this.runtimeSettingsApplication.syncVanillaTileModelSources(
      TILE_AUTO_SOURCE_SYNC_TRIGGERED_BY,
      modelResRefs
    );
    await this.repository.refreshSnapshot?.();
    this.tileRepositorySnapshotRefreshedAtMs = Date.now();
  }

  private async collectTileModelResRefsNeedingSourceSync(tileIds: string[]): Promise<string[]> {
    const modelResRefs: string[] = [];
    for (const tileId of tileIds) {
      const modelResRef = parseTileModelResRefFromCatalogId(tileId);
      if (!modelResRef) {
        continue;
      }
      const tile = await this.repository.findById(tileId);
      if (tile && !shouldRefreshTileModelSourceForRenderReadiness(tile)) {
        continue;
      }
      modelResRefs.push(modelResRef);
    }
    return modelResRefs;
  }

  private async resolveBenchmarkCandidates(tileIds?: string[]): Promise<TileRecord[]> {
    if (tileIds && tileIds.length > 0) {
      const resolved = await Promise.all(tileIds.map((tileId) => this.repository.findById(tileId)));
      const candidates = resolved.filter((value): value is TileRecord => Boolean(value));
      if (candidates.length !== tileIds.length) {
        throw new AppException({
          status: 422,
          code: "VALIDATION_FAILED",
          message: "Benchmark payload references unknown tile ids."
        });
      }
      return candidates;
    }

    const benchmarkList = await this.repository.list({
      benchmark: true,
      limit: 200,
      offset: 0
    });
    if (benchmarkList.items.length === 0) {
      throw new AppException({
        status: 422,
        code: "VALIDATION_FAILED",
        message: "No benchmark tiles are configured."
      });
    }

    const resolved = await Promise.all(
      benchmarkList.items.map((item) => this.repository.findById(item.tileId))
    );
    return resolved.filter((value): value is TileRecord => Boolean(value));
  }

  private async ensureTileTextureAtlas(
    cacheKey: string,
    value: TileProcessingResult
  ): Promise<TileProcessingResult> {
    if (hasTileTextureAtlasMetadata(value) && value.sourceAsset && value.renderAssetContract) {
      return value;
    }

    const tile = await this.repository.findById(value.tileId);
    if (!tile) {
      return value;
    }

    const refreshed: TileProcessingResult = {
      ...value,
      textureAtlas: {
        ...value.textureAtlas,
        objectKey: tile.textureAtlasObjectKey,
        contentType: tile.textureAtlasContentType,
        sizeBytes: tile.textureAtlasSizeBytes,
        etag: tile.textureAtlasEtag
      },
      sourceAsset: buildTileSourceAssetContract(tile),
      renderAssetContract: await this.buildTileRenderAssetContractForTile(tile, cacheKey)
    };

    await this.processingCache.set(cacheKey, refreshed);
    return refreshed;
  }

  private async buildTileRenderAssetContractForTile(
    tile: TileRecord,
    cacheKey: string
  ): Promise<TileRenderAssetContract> {
    const sourceAsset = buildTileSourceAssetContract(tile);
    const materialTextureAssets = await this.resolveTileMaterialTextureAssets(tile, sourceAsset);
    const renderReadyTile = await this.ensureCurrentTileRenderModelAsset(tile, sourceAsset);
    return buildTileRenderAssetContract(renderReadyTile, cacheKey, materialTextureAssets);
  }

  private async ensureCurrentTileRenderModelAsset(
    tile: TileRecord,
    sourceAsset: TileSourceAssetContract
  ): Promise<TileRecord> {
    if (sourceAsset.role !== "mdl_source" || !sourceAsset.objectKey) {
      return tile;
    }

    if (await this.isTileRenderModelConverterCurrent(tile)) {
      return tile;
    }

    return (await this.generateCurrentTileRenderModelAsset(tile, sourceAsset)) ?? tile;
  }

  private async isTileRenderModelConverterCurrent(tile: TileRecord): Promise<boolean> {
    if (!tile.renderModelObjectKey) {
      return false;
    }
    const extension = tile.renderModelExtension ?? extractObjectKeyExtension(tile.renderModelObjectKey);
    if (extension !== "glb" && extension !== "gltf") {
      return false;
    }

    const payload = await this.readModuleBlobObject(tile.renderModelObjectKey);
    if (!payload || payload.bytes.length === 0) {
      return false;
    }

    const modelJson = parseTileDerivedModelJsonPayload(extension, payload.bytes);
    return (
      resolveTileDerivedModelConverterVersion(modelJson) ===
        AURORA_MDL_TO_GLB_CONVERTER_VERSION &&
      isTileDerivedModelFootprintCurrent(modelJson)
    );
  }

  private async generateCurrentTileRenderModelAsset(
    tile: TileRecord,
    sourceAsset: TileSourceAssetContract
  ): Promise<TileRecord | null> {
    if (
      !this.runtimeSettingsRepository ||
      !this.moduleBlobStorage?.putModuleObject ||
      !this.derivedAssetGenerator
    ) {
      return null;
    }

    const settings = await this.runtimeSettingsRepository.get();
    const sourcePayload = await this.moduleBlobStorage.getModuleObject(
      settings.blobStorage,
      sourceAsset.objectKey
    );
    if (!sourcePayload || sourcePayload.bytes.length === 0) {
      return null;
    }

    const generated = await this.derivedAssetGenerator.generateDerivedAssets({
      settingsRevision: settings.revision,
      modulePrefix: settings.blobStorage.modulePrefix,
      sourceFiles: [
        {
          fileName: sourceAsset.objectKey,
          resourceType: 0,
          bytes: sourcePayload.bytes
        }
      ]
    });
    const derivedModel = selectGeneratedTileDerivedModelFile(tile, generated.files);
    if (!derivedModel) {
      return null;
    }

    const stored = await this.moduleBlobStorage.putModuleObject(
      settings.blobStorage,
      derivedModel
    );
    const extension = extractObjectKeyExtension(stored.key);
    if (extension !== "glb" && extension !== "gltf") {
      return null;
    }

    return {
      ...tile,
      renderModelObjectKey: stored.key,
      renderModelExtension: extension,
      renderModelSizeBytes: stored.size,
      renderModelEtag: stored.etag
    };
  }

  private async resolveTileMaterialTextureAssets(
    tile: TileRecord,
    sourceAsset: TileSourceAssetContract
  ): Promise<TileMaterialTextureAssetContract[]> {
    if (
      sourceAsset.role !== "mdl_source" ||
      !sourceAsset.objectKey ||
      !this.runtimeSettingsApplication
    ) {
      return [];
    }

    const sourcePayload = await this.readModuleBlobObject(sourceAsset.objectKey);
    if (!sourcePayload) {
      return [];
    }

    const textureReferences = collectTileRenderTextureReferences(tile, sourcePayload.bytes);
    if (textureReferences.length === 0) {
      return [];
    }

    let assets = await this.resolveTileMaterialTextureContracts(textureReferences);
    const missingTextureReferences = textureReferences.filter(
      (reference) => !assets.some((asset) => asset.reference === reference)
    );
    if (missingTextureReferences.length > 0) {
      await this.syncTileMaterialTextureSources(tile);
      assets = await this.resolveTileMaterialTextureContracts(textureReferences);
    }
    return assets;
  }

  private async resolveTileMaterialTextureContracts(
    textureReferences: string[]
  ): Promise<TileMaterialTextureAssetContract[]> {
    if (!this.runtimeSettingsApplication) {
      return [];
    }

    const assets: TileMaterialTextureAssetContract[] = [];
    for (const reference of textureReferences) {
      const contracts = await this.runtimeSettingsApplication.getTextureDeliveryContracts({
        resref: reference,
        limit: 8,
        offset: 0
      });
      const selected = selectPreferredTileTextureContract(contracts.assets);
      if (!selected) {
        continue;
      }
      assets.push({
        reference,
        textureId: selected.textureId,
        resref: selected.resref,
        objectKey: selected.objectKey,
        extension: selected.extension,
        contentType: selected.contentType,
        sizeBytes: selected.sizeBytes,
        source: selected.source,
        sourcePath: selected.sourcePath,
        deliveryPath: appendTextureDeliveryFormat(selected.deliveryPath, selected),
        deliveryUrl: appendTextureDeliveryFormat(selected.deliveryUrl, selected),
        s3Url: selected.s3Url
      });
    }
    return assets;
  }

  private async syncTileMaterialTextureSources(tile: TileRecord): Promise<void> {
    const runtimeSettingsApplication = this.runtimeSettingsApplication;
    if (!runtimeSettingsApplication) {
      return;
    }

    await executeInFlight(
      this.inFlightTileMaterialSourceSync,
      tile.resref,
      async (): Promise<void> => {
        try {
          await runtimeSettingsApplication.syncVanillaTileModelSources(
            TILE_AUTO_SOURCE_SYNC_TRIGGERED_BY,
            [tile.resref]
          );
          await this.repository.refreshSnapshot?.();
          this.tileRepositorySnapshotRefreshedAtMs = Date.now();
        } catch {
          // Keep the render contract blocked with the existing material-binding status.
        }
      }
    );
  }

  private async readModuleBlobObject(key: string): Promise<ModuleBlobObjectPayload | null> {
    if (!this.runtimeSettingsRepository || !this.moduleBlobStorage) {
      return null;
    }

    if (this.appConfig?.isTest && !this.appConfig.enableBlobAssetLookupInTest) {
      return null;
    }

    const settings = await this.runtimeSettingsRepository.get();
    return this.moduleBlobStorage.getModuleObject(settings.blobStorage, key);
  }

  private async getBlobStorageSettings(): Promise<BlobStorageSettings | null> {
    if (!this.runtimeSettingsRepository) {
      return null;
    }

    const settings = await this.runtimeSettingsRepository.get();
    return settings.blobStorage;
  }

}

function buildBenchmarkFingerprint(candidates: TileRecord[], query: TileBenchmarkRunQuery): string {
  const hash = createHash("sha256");
  hash.update(
    JSON.stringify({
      tileIds: candidates.map((item) => item.tileId),
      iterations: query.iterations,
      warmupIterations: query.warmupIterations,
      bypassCache: query.bypassCache
    })
  );
  return hash.digest("hex");
}

function summarizeDurations(durations: number[]): BenchmarkDurationSummary {
  if (durations.length === 0) {
    return {
      minMs: 0,
      maxMs: 0,
      avgMs: 0,
      p50Ms: 0,
      p95Ms: 0,
      p99Ms: 0
    };
  }

  const sorted = [...durations].sort((a, b) => a - b);
  const minMs = sorted[0];
  const maxMs = sorted[sorted.length - 1];
  const avgMs = sorted.reduce((sum, value) => sum + value, 0) / sorted.length;
  return {
    minMs,
    maxMs,
    avgMs,
    p50Ms: percentile(sorted, 0.5),
    p95Ms: percentile(sorted, 0.95),
    p99Ms: percentile(sorted, 0.99)
  };
}

function percentile(sorted: number[], ratio: number): number {
  if (sorted.length === 0) {
    return 0;
  }
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * ratio)));
  return sorted[index];
}

function buildTileTextureDeliveryPath(cacheKey: string): string {
  const encodedCacheKey = encodeURIComponent(cacheKey);
  return `/api/v1/catalog/tiles/cache/${encodedCacheKey}/textures`;
}

function dedupeTileProcessBatchItems(
  items: TileProcessBatchItemQuery[]
): TileProcessBatchItemQuery[] {
  const byTileId = new Map<string, TileProcessBatchItemQuery>();
  for (const item of items) {
    const tileId = item.tileId.trim();
    if (!tileId) {
      continue;
    }
    const existing = byTileId.get(tileId);
    byTileId.set(tileId, {
      tileId,
      bypassCache: existing?.bypassCache === true || item.bypassCache === true
    });
  }
  return [...byTileId.values()];
}

function dedupeText(values: string[]): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const value of values) {
    const normalized = value.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    deduped.push(normalized);
  }
  return deduped;
}

function getExceptionCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null) {
    return null;
  }
  const directCode = (error as { code?: unknown }).code;
  if (typeof directCode === "string") {
    return directCode;
  }
  const responseCode = (error as { response?: { code?: unknown } }).response?.code;
  return typeof responseCode === "string" ? responseCode : null;
}

function getExceptionMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return "Tile process failed.";
}

function buildTileModelDeliveryPath(cacheKey: string): string {
  const encodedCacheKey = encodeURIComponent(cacheKey);
  return `/api/v1/catalog/tiles/cache/${encodedCacheKey}/model`;
}

function parseTileModelResRefFromCatalogId(tileId: string): string | null {
  if (!tileId.startsWith(TILE_CATALOG_ID_PREFIX)) {
    return null;
  }
  const resref = tileId
    .slice(TILE_CATALOG_ID_PREFIX.length)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/gu, "_")
    .slice(0, 64);
  return resref && /[a-z0-9]/u.test(resref) ? resref : null;
}

function formatMissingTileSourceSyncHint(tileId: string): string {
  const modelResRef = parseTileModelResRefFromCatalogId(tileId);
  if (!modelResRef) {
    return "Tile id is not a model-resref catalog candidate.";
  }
  return `Attempted vanilla tile model source sync for modelResRef=${modelResRef} when bypassCache was enabled.`;
}

function shouldRefreshTileModelSourceForRenderReadiness(tile: TileRecord): boolean {
  if (!parseTileModelResRefFromCatalogId(tile.tileId)) {
    return false;
  }
  if (tile.sourceAssetExtension === "mdl" && !tile.renderModelObjectKey) {
    return true;
  }
  if (
    (tile.sourceAssetExtension === "glb" || tile.sourceAssetExtension === "gltf") &&
    tile.sourceAssetObjectKey
      ?.replace(/\\/gu, "/")
      .toLowerCase()
      .includes("__aurora/derived/models/")
  ) {
    return true;
  }
  return false;
}

function hasTileTextureAtlasMetadata(value: TileProcessingResult): boolean {
  return Boolean(
    value.textureAtlas.objectKey &&
      value.textureAtlas.contentType &&
      (value.textureAtlas.sizeBytes ?? 0) > 0
  );
}

function buildTileSourceAssetContract(tile: TileRecord): TileSourceAssetContract {
  const objectKey = tile.sourceAssetObjectKey ?? tile.textureAtlasObjectKey;
  const extension = tile.sourceAssetExtension ?? extractObjectKeyExtension(objectKey);
  return {
    objectKey,
    extension,
    role: resolveTileSourceAssetRole(extension, Boolean(tile.sourceAssetObjectKey), objectKey),
    origin: tile.sourceAssetOrigin ?? "static-fallback",
    sizeBytes: tile.sourceAssetSizeBytes ?? tile.textureAtlasSizeBytes,
    etag: tile.sourceAssetEtag ?? tile.textureAtlasEtag
  };
}

function buildTileRenderAssetContract(
  tile: TileRecord,
  cacheKey: string,
  materialTextureAssets: TileMaterialTextureAssetContract[] = []
): TileRenderAssetContract {
  const sourceAsset = buildTileSourceAssetContract(tile);
  const modelAsset = buildTileRenderModelAssetContract(tile, cacheKey);
  const textureDeliveryStatus = resolveTileTextureDeliveryStatus(
    tile,
    sourceAsset,
    materialTextureAssets
  );
  const materialBindingStatus = resolveTileMaterialBindingStatus(
    sourceAsset,
    materialTextureAssets
  );
  const sourceAssetBlocker = resolveTileSourceAssetBlocker(sourceAsset);
  const blockers: string[] = [];

  if (sourceAssetBlocker) {
    blockers.push(sourceAssetBlocker);
  }
  if (!modelAsset) {
    blockers.push(
      `blocked_tile_process_contract_missing_glb_geometry:${buildExpectedTileDerivedModelObjectKey(tile)}`
    );
  }
  if (textureDeliveryStatus === "blocked_tile_texture_blob_metadata_missing") {
    blockers.push(textureDeliveryStatus);
  }
  if (textureDeliveryStatus === "blocked_tile_texture_contract_derived_model_only") {
    blockers.push(textureDeliveryStatus);
  }
  if (materialBindingStatus !== "ready") {
    blockers.push(materialBindingStatus);
  }
  if (!modelAsset) {
    blockers.push("blocked_tile_model_geometry_loader_missing");
  }

  return {
    sourceAssetStatus: sourceAsset.objectKey ? "ready" : "blocked",
    mdlSourceStatus: sourceAsset.role === "mdl_source" ? "ready" : "blocked",
    mdlSourceObjectKey: sourceAsset.role === "mdl_source" ? sourceAsset.objectKey : undefined,
    glbGeometryStatus: modelAsset
      ? "ready"
      : "blocked_tile_process_contract_missing_glb_geometry",
    textureDeliveryStatus,
    materialBindingStatus,
    rendererHandoffStatus: modelAsset ? "ready" : "blocked_tile_model_geometry_loader_missing",
    modelDeliveryStatus: modelAsset ? "ready" : "blocked_tile_model_glb_missing",
    modelAsset,
    materialTextureAssets: materialTextureAssets.length > 0 ? materialTextureAssets : undefined,
    expectedDerivedModelObjectKey: modelAsset
      ? undefined
      : buildExpectedTileDerivedModelObjectKey(tile),
    blockers
  };
}

function assertTileTextureDeliveryAvailable(tile: TileProcessingResult): void {
  if (tile.renderAssetContract?.textureDeliveryStatus === "blocked_tile_texture_contract_derived_model_only") {
    throw new AppException({
      status: 404,
      code: "TILE_TEXTURE_CONTRACT_NOT_AVAILABLE",
      message: "Tile texture delivery is blocked because this tile record only exposes a derived GLB/GLTF model asset."
    });
  }
}

function resolveTileTextureDeliveryStatus(
  tile: TileRecord,
  sourceAsset: TileSourceAssetContract,
  materialTextureAssets: TileMaterialTextureAssetContract[]
): TileRenderAssetContract["textureDeliveryStatus"] {
  if (sourceAsset.role === "derived_model_asset") {
    return "blocked_tile_texture_contract_derived_model_only";
  }
  if (materialTextureAssets.length > 0) {
    return "texture_material_contract_ready";
  }
  return tile.textureAtlasObjectKey && tile.textureAtlasContentType && tile.textureAtlasSizeBytes > 0
    ? "texture_source_blob_metadata_present"
    : "blocked_tile_texture_blob_metadata_missing";
}

function resolveTileMaterialBindingStatus(
  sourceAsset: TileSourceAssetContract,
  materialTextureAssets: TileMaterialTextureAssetContract[]
): TileRenderAssetContract["materialBindingStatus"] {
  if (sourceAsset.role === "derived_model_asset") {
    return "blocked_tile_material_binding_derived_model_only";
  }
  return materialTextureAssets.length > 0
    ? "ready"
    : "blocked_tile_process_contract_missing_material_bindings";
}

function resolveTileSourceAssetBlocker(sourceAsset: TileSourceAssetContract): string | null {
  if (sourceAsset.role === "mdl_source") {
    return null;
  }
  if (sourceAsset.role === "derived_model_asset") {
    return "tile_source_asset_derived_model_only";
  }
  return `tile_source_asset_not_mdl:${sourceAsset.extension}`;
}

function collectTileMdlTextureReferences(bytes: Buffer): string[] {
  const references = new Set<string>();
  const text = bytes.toString("latin1");

  try {
    let inspectedReferenceCount = 0;
    inspectAuroraMdlSource(bytes).textureReferences.forEach((reference) => {
      const normalized = normalizeTileTextureReference(reference);
      if (normalized) {
        references.add(normalized);
        inspectedReferenceCount += 1;
      }
    });
    if (inspectedReferenceCount > 0) {
      return [...references].sort((left, right) => left.localeCompare(right));
    }
  } catch {
    // Keep the lightweight token scanners below as a fallback for partial or unusual MDL payloads.
  }

  collectTileMdlTextureReferencesFromText(text, references);
  if (bytes.length >= 4 && bytes.readUInt32LE(0) === 0) {
    collectTileMdlTextureReferencesFromBinaryPayload(bytes, references);
  }

  return [...references].sort((left, right) => left.localeCompare(right));
}

function collectTileRenderTextureReferences(tile: TileRecord, bytes: Buffer): string[] {
  return dedupeText([
    ...collectTileMdlTextureReferences(bytes),
    ...collectTileImageMapTextureReferences(tile)
  ]);
}

function collectTileImageMapTextureReferences(tile: TileRecord): string[] {
  const normalized = normalizeTileTextureReference(`mi_${tile.resref}`);
  return normalized ? [normalized] : [];
}

function collectTileMdlTextureReferencesFromText(
  text: string,
  references: Set<string>
): void {
  const matches = text.matchAll(
    /(?:^|[\r\n\t\0 ])(?:bitmap|texture\d*|texture|bumpmap|tno\d*)\s+("[^"\r\n\0]+"|[^\s\r\n\0]+)/giu
  );
  for (const match of matches) {
    const reference = normalizeTileTextureReference(match[1]);
    if (reference) {
      references.add(reference);
    }
  }
}

function collectTileMdlTextureReferencesFromBinaryPayload(
  bytes: Buffer,
  references: Set<string>
): void {
  const nulSeparated = bytes.toString("latin1").split("\u0000");

  for (let index = 0; index < nulSeparated.length; index += 1) {
    const token = nulSeparated[index]?.trim().toLowerCase() ?? "";
    if (!token) {
      continue;
    }

    if (isMdlTextureKey(token) && index + 1 < nulSeparated.length) {
      const value = nulSeparated[index + 1];
      const reference = normalizeTileTextureReference(value);
      if (reference) {
        references.add(reference);
      }
    }

    if (isMdlTextureCandidate(token) && !isMdlNoiseToken(token)) {
      const reference = normalizeTileTextureReference(token);
      if (reference) {
        references.add(reference);
      }
    }
  }
}

function isMdlTextureKey(value: string): boolean {
  return /^(?:bitmap|bumpmap|texture|texture\d*|tno\d*)$/u.test(value);
}

function isMdlTextureCandidate(value: string): boolean {
  if (value.length <= 2 || value.length > 128) {
    return false;
  }
  if (!/[a-z0-9]/u.test(value)) {
    return false;
  }
  if (value.includes(" ")) {
    return false;
  }
  return (
    /\.(dds|tga|plt|txi|mtr|bmp)$/u.test(value) ||
    value.includes("/") ||
    value.includes("\\")
  );
}

function isMdlNoiseToken(value: string): boolean {
  return /^(?:0|1|2|3|4|5|6|7|8|9|[\.,-]+)$/u.test(value);
}

function normalizeTileTextureReference(value: string | undefined): string | null {
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

function selectPreferredTileTextureContract(
  contracts: TextureDeliveryContract[]
): TextureDeliveryContract | null {
  return (
    contracts.find((asset) => asset.extension === "dds") ??
    contracts.find((asset) => asset.extension === "tga") ??
    contracts.find((asset) => asset.extension === "bmp") ??
    contracts[0] ??
    null
  );
}

function appendTextureDeliveryFormat(
  deliveryUrl: string,
  asset: TextureDeliveryContract
): string {
  const separator = deliveryUrl.includes("?") ? "&" : "?";
  return `${deliveryUrl}${separator}format=${encodeURIComponent(asset.extension)}&resref=${encodeURIComponent(asset.resref)}`;
}

function buildTileRenderModelAssetContract(
  tile: TileRecord,
  cacheKey: string
): TileRenderAssetContract["modelAsset"] | undefined {
  if (
    !tile.renderModelObjectKey ||
    !tile.renderModelExtension ||
    !tile.renderModelSizeBytes
  ) {
    return undefined;
  }

  const deliveryPath = buildTileModelDeliveryPath(cacheKey);
  return {
    objectKey: tile.renderModelObjectKey,
    extension: tile.renderModelExtension,
    contentType:
      tile.renderModelExtension === "glb" ? "model/gltf-binary" : "model/gltf+json",
    sizeBytes: tile.renderModelSizeBytes,
    etag: tile.renderModelEtag,
    deliveryPath,
    deliveryUrl: deliveryPath
  };
}

function buildExpectedTileDerivedModelObjectKey(tile: TileRecord): string {
  const sourceKey = tile.sourceAssetObjectKey?.replace(/\\/gu, "/") ?? "";
  const prefix = sourceKey.includes("__aurora/derived/models/")
    ? sourceKey.slice(0, sourceKey.indexOf("__aurora/derived/models/"))
    : sourceKey.includes("/")
      ? sourceKey.slice(0, sourceKey.lastIndexOf("/") + 1)
      : "";
  return `${prefix}__aurora/derived/models/${tile.resref.toLowerCase()}.glb`;
}

function selectGeneratedTileDerivedModelFile(
  tile: TileRecord,
  files: Array<{ fileName: string; resourceType: number; bytes: Buffer }>
) {
  const expectedFileName = `${tile.resref.toLowerCase()}.glb`;
  return (
    files.find((file) => extractFileName(file.fileName).toLowerCase() === expectedFileName) ??
    files.find((file) => {
      const extension = extractObjectKeyExtension(file.fileName);
      return extension === "glb" || extension === "gltf";
    }) ??
    null
  );
}

function parseTileDerivedModelJsonPayload(
  extension: string,
  bytes: Buffer
): unknown | null {
  if (extension === "glb") {
    return parseGlbJson(bytes);
  }
  if (extension === "gltf") {
    return parseGltfJson(bytes);
  }
  return null;
}

function parseGlbJson(bytes: Buffer): unknown | null {
  if (bytes.length < 20 || bytes.readUInt32LE(0) !== GLB_MAGIC) {
    return null;
  }

  const jsonLength = bytes.readUInt32LE(12);
  const jsonType = bytes.readUInt32LE(16);
  const jsonStart = 20;
  const jsonEnd = jsonStart + jsonLength;
  if (jsonType !== GLB_JSON_CHUNK_TYPE || jsonLength <= 0 || jsonEnd > bytes.length) {
    return null;
  }

  try {
    const jsonText = bytes
      .subarray(jsonStart, jsonEnd)
      .toString("utf-8")
      .replace(/\0+$/u, "")
      .trimEnd();
    return JSON.parse(jsonText) as unknown;
  } catch {
    return null;
  }
}

function parseGltfJson(bytes: Buffer): unknown | null {
  try {
    return JSON.parse(bytes.toString("utf-8")) as unknown;
  } catch {
    return null;
  }
}

function resolveTileDerivedModelConverterVersion(modelJson: unknown): string | null {
  const root = asRecord(modelJson);
  const extras = root ? asRecord(root["extras"]) : null;
  const aurora = extras ? asRecord(extras["aurora"]) : null;
  const converterVersion = aurora ? aurora["converterVersion"] : undefined;
  if (typeof converterVersion === "string" && converterVersion.trim().length > 0) {
    return converterVersion.trim();
  }

  const asset = root ? asRecord(root["asset"]) : null;
  const generator = asset ? asset["generator"] : undefined;
  if (
    typeof generator === "string" &&
    generator.includes(AURORA_MDL_TO_GLB_CONVERTER_VERSION)
  ) {
    return AURORA_MDL_TO_GLB_CONVERTER_VERSION;
  }
  return null;
}

function isTileDerivedModelFootprintCurrent(modelJson: unknown): boolean {
  const bounds = resolveTileDerivedModelPositionBounds(modelJson);
  if (!bounds) {
    return false;
  }

  return (
    bounds.minX >= -TILE_MODEL_FOOTPRINT_HALF_EXTENT_LIMIT &&
    bounds.maxX <= TILE_MODEL_FOOTPRINT_HALF_EXTENT_LIMIT &&
    bounds.minZ >= -TILE_MODEL_FOOTPRINT_HALF_EXTENT_LIMIT &&
    bounds.maxZ <= TILE_MODEL_FOOTPRINT_HALF_EXTENT_LIMIT
  );
}

type TileDerivedModelPositionBounds = { minX: number; maxX: number; minZ: number; maxZ: number };

function resolveTileDerivedModelPositionBounds(
  modelJson: unknown
): TileDerivedModelPositionBounds | null {
  const root = asRecord(modelJson);
  const accessors = Array.isArray(root?.["accessors"]) ? root["accessors"] : null;
  const meshes = Array.isArray(root?.["meshes"]) ? root["meshes"] : null;
  if (!accessors || !meshes) {
    return null;
  }

  let bounds: TileDerivedModelPositionBounds | null = null;
  for (const meshValue of meshes) {
    const mesh = asRecord(meshValue);
    const primitives = Array.isArray(mesh?.["primitives"]) ? mesh["primitives"] : [];
    for (const primitiveValue of primitives) {
      const primitive = asRecord(primitiveValue);
      const attributes = asRecord(primitive?.["attributes"]);
      const positionAccessorIndex = attributes?.["POSITION"];
      if (typeof positionAccessorIndex !== "number") {
        continue;
      }

      const accessor = asRecord(accessors[positionAccessorIndex]);
      const min = readNumericTuple(accessor?.["min"]);
      const max = readNumericTuple(accessor?.["max"]);
      if (!min || !max || min.length < 3 || max.length < 3) {
        continue;
      }

      const nextBounds: TileDerivedModelPositionBounds = {
        minX: min[0]!,
        maxX: max[0]!,
        minZ: min[2]!,
        maxZ: max[2]!
      };
      bounds = mergeTileDerivedModelPositionBounds(bounds, nextBounds);
    }
  }

  return bounds;
}

function mergeTileDerivedModelPositionBounds(
  current: TileDerivedModelPositionBounds | null,
  next: TileDerivedModelPositionBounds
): TileDerivedModelPositionBounds {
  if (!current) {
    return next;
  }
  return {
    minX: Math.min(current.minX, next.minX),
    maxX: Math.max(current.maxX, next.maxX),
    minZ: Math.min(current.minZ, next.minZ),
    maxZ: Math.max(current.maxZ, next.maxZ)
  };
}

function readNumericTuple(value: unknown): number[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const numeric = value.map((item) => Number(item));
  return numeric.every((item) => Number.isFinite(item)) ? numeric : null;
}

function resolveTileSourceAssetRole(
  extension: string,
  sourceAssetObjectKeyPresent: boolean,
  objectKey?: string
): TileSourceAssetRole {
  if (!sourceAssetObjectKeyPresent) {
    return "texture_atlas_fallback";
  }
  if (
    (extension === "glb" || extension === "gltf") &&
    objectKey?.replace(/\\/gu, "/").toLowerCase().includes("__aurora/derived/models/")
  ) {
    return "derived_model_asset";
  }
  switch (extension) {
    case "mdl":
      return "mdl_source";
    case "set":
      return "set_metadata";
    case "wok":
      return "walkmesh_source";
    case "itp":
      return "itp_metadata";
    default:
      return "unknown_source";
  }
}

function extractObjectKeyExtension(objectKey: string): string {
  const normalized = objectKey.replace(/\\/gu, "/").trim().toLowerCase();
  const fileName = normalized.split("/").pop() ?? normalized;
  const index = fileName.lastIndexOf(".");
  return index > -1 ? fileName.slice(index + 1) : "unknown";
}

function extractFileName(pathValue: string): string {
  const normalized = pathValue.replace(/\\/gu, "/");
  return normalized.split("/").pop() ?? normalized;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

export const __tilesApplicationServiceInternals = {
  buildBenchmarkFingerprint,
  summarizeDurations,
  percentile,
  buildBlobObjectHttpUrl,
  shouldRefreshTileModelSourceForRenderReadiness,
  collectTileMdlTextureReferences,
  buildTileSourceAssetContract,
  buildTileRenderAssetContract,
  buildExpectedTileDerivedModelObjectKey
} as const;
