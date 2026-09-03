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
  waitForStoredModuleObjectBytes,
  type VanillaTileModelSourceSyncEnvelope,
  type TextureDeliveryContract
} from "../../runtime-settings/application/runtime-settings.application.service";
import { inspectAuroraMdlSource } from "../../runtime-settings/adapters/outbound/derived/aurora-mdl-ascii-to-glb.converter";
import type { BlobStorageSettings } from "../../runtime-settings/domain/runtime-settings.types";
import { AURORA_MDL_TO_GLB_CONVERTER_VERSION } from "../../runtime-settings/domain/derived-asset-versions";
import {
  COMMITTED_MODULE_SNAPSHOT_READER,
  type CommittedModuleSnapshotReaderPort,
} from "../../module-snapshots/application/ports/committed-module-snapshot-reader.port";
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
const TILE_NUMBERED_MTR_DIFFUSE_FAMILY_POLICY =
  "tile-mtr-numbered-exact-diffuse-family/v1";
// Tile source restoration can open HAK archives and launch the MDL -> GLB
// converter.  Treat it as a native-resource critical section: callers that
// submit a batch must not amplify that work into a dozen concurrent processes.
const TILE_PROCESS_BATCH_CONCURRENCY = 1;

interface TileMaterialTextureResolution {
  assets: TileMaterialTextureAssetContract[];
  missingTextureReferences: string[];
  requiresMaterialTextureBindings: boolean;
  sourceModelContentSha256?: string;
  renderModelInspection?: {
    objectKey: string;
    sizeBytes: number;
    etag?: string;
    contentSha256: string;
    materialTextureReferences: string[];
  };
}
const GLB_MAGIC = 0x46546c67;
const GLB_JSON_CHUNK_TYPE = 0x4e4f534a;

@Injectable()
export class TilesApplicationService {
  private readonly inFlightTileProcessing = new Map<string, Promise<TileProcessingEnvelope>>();
  private readonly inFlightTileMaterialSourceSync = new Map<string, Promise<void>>();
  // A SET can legitimately refer to a model that is absent from the active
  // module/HAK chain. Remember that negative source lookup per settings
  // revision so retrying a visible palette/group tile does not rescan every
  // HAK on each render batch. The current settings revision is checked before
  // reuse, so a configuration/HAK change permits a fresh discovery attempt.
  private unavailableTileModelSourceSettingsRevision: number | null = null;
  private readonly unavailableTileModelResRefs = new Set<string>();
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
    private readonly derivedAssetGenerator?: DerivedAssetGeneratorPort,
    @Optional() @Inject(COMMITTED_MODULE_SNAPSHOT_READER)
    private readonly committedSnapshotReader?: CommittedModuleSnapshotReaderPort,
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
    if (modelAsset.contentSha256) {
      const deliveredSha256 = createHash("sha256")
        .update(payload.bytes)
        .digest("hex");
      if (deliveredSha256 !== modelAsset.contentSha256) {
        throw new AppException({
          status: 409,
          code: "TILE_MODEL_CONTENT_MISMATCH",
          message:
            `Tile model changed after its render contract was created: ${modelAsset.objectKey}. ` +
            `Expected SHA-256 ${modelAsset.contentSha256}, received ${deliveredSha256}.`
        });
      }
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

    if (await this.isKnownUnavailableTileModelSource(modelResRef)) {
      return;
    }

    const sync = await this.runtimeSettingsApplication.syncVanillaTileModelSources(
      TILE_AUTO_SOURCE_SYNC_TRIGGERED_BY,
      [modelResRef]
    );
    this.rememberUnavailableTileModelSources(sync);
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
    const sync = await this.runtimeSettingsApplication.syncVanillaTileModelSources(
      TILE_AUTO_SOURCE_SYNC_TRIGGERED_BY,
      modelResRefs
    );
    this.rememberUnavailableTileModelSources(sync);
    await this.repository.refreshSnapshot?.();
    this.tileRepositorySnapshotRefreshedAtMs = Date.now();
  }

  private async collectTileModelResRefsNeedingSourceSync(tileIds: string[]): Promise<string[]> {
    const modelResRefs: string[] = [];
    for (const tileId of tileIds) {
      const modelResRef = parseTileModelResRefFromCatalogId(tileId);
      if (!modelResRef || (await this.isKnownUnavailableTileModelSource(modelResRef))) {
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

  private async isKnownUnavailableTileModelSource(modelResRef: string): Promise<boolean> {
    const normalized = modelResRef.trim().toLowerCase();
    if (!this.unavailableTileModelResRefs.has(normalized)) {
      return false;
    }
    if (!this.runtimeSettingsRepository) {
      return true;
    }
    const settings = await this.runtimeSettingsRepository.get();
    if (settings.revision !== this.unavailableTileModelSourceSettingsRevision) {
      this.unavailableTileModelResRefs.clear();
      this.unavailableTileModelSourceSettingsRevision = settings.revision;
      return false;
    }
    return true;
  }

  private rememberUnavailableTileModelSources(
    sync: VanillaTileModelSourceSyncEnvelope
  ): void {
    if (!Number.isInteger(sync.settingsRevision)) {
      return;
    }
    if (this.unavailableTileModelSourceSettingsRevision !== sync.settingsRevision) {
      this.unavailableTileModelResRefs.clear();
      this.unavailableTileModelSourceSettingsRevision = sync.settingsRevision;
    }
    for (const modelResRef of sync.missingModelResRefs) {
      const normalized = modelResRef.trim().toLowerCase();
      if (normalized) {
        this.unavailableTileModelResRefs.add(normalized);
      }
    }
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
    const renderReadyTile = await this.ensureCurrentTileRenderModelAsset(tile, sourceAsset);
    const materialTextureResolution = await this.resolveTileMaterialTextureAssets(
      renderReadyTile,
      sourceAsset
    );
    return buildTileRenderAssetContract(
      renderReadyTile,
      cacheKey,
      materialTextureResolution.assets,
      materialTextureResolution.missingTextureReferences,
      materialTextureResolution.requiresMaterialTextureBindings,
      materialTextureResolution.renderModelInspection,
      materialTextureResolution.sourceModelContentSha256
    );
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
    if (!isVersionedTileDerivedModelObjectKeyCurrent(tile.renderModelObjectKey)) {
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
    // Multi-cell feature/group tiles may legitimately extend well beyond the
    // nominal 10 m cell (for example tdc01_t15_01 reaches x=-11.5 m). Converter
    // currency must therefore be versioned, never inferred from model bounds.
    return (
      resolveTileDerivedModelConverterVersion(modelJson) ===
      AURORA_MDL_TO_GLB_CONVERTER_VERSION
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
    const sourcePayload = this.committedSnapshotReader
      ? await (await this.committedSnapshotReader.capture()).getModuleObject(sourceAsset.objectKey)
      : await this.moduleBlobStorage.getModuleObject(
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
    await waitForStoredModuleObjectBytes(
      this.moduleBlobStorage,
      settings.blobStorage,
      stored.key,
      derivedModel.bytes
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
    sourceAsset: TileSourceAssetContract,
    allowSourceSync = true
  ): Promise<TileMaterialTextureResolution> {
    if (
      sourceAsset.role !== "mdl_source" ||
      !sourceAsset.objectKey ||
      !this.runtimeSettingsApplication
    ) {
      return {
        assets: [],
        missingTextureReferences: [],
        requiresMaterialTextureBindings: true
      };
    }

    const sourcePayload = await this.readModuleBlobObject(sourceAsset.objectKey);
    if (!sourcePayload) {
      return {
        assets: [],
        missingTextureReferences: [],
        requiresMaterialTextureBindings: true
      };
    }
    const sourceModelContentSha256 = createHash("sha256")
      .update(sourcePayload.bytes)
      .digest("hex");

    // The MDL-wide list also contains emitter/VFX bitmaps. Keep those sources
    // eligible for targeted sync, but only GLB material/primitive-scoped
    // references are mandatory for mesh material-binding readiness.
    const textureReferences = new Set(
      collectTileRenderTextureReferences(tile, sourcePayload.bytes)
    );
    const requiredMaterialTextureReferences = new Set<string>();
    let renderModelInspection: TileMaterialTextureResolution["renderModelInspection"];
    if (tile.renderModelObjectKey && tile.renderModelExtension) {
      const renderModelPayload = await this.readModuleBlobObject(tile.renderModelObjectKey);
      const renderModelJson = renderModelPayload
        ? parseTileDerivedModelJsonPayload(
            tile.renderModelExtension,
            renderModelPayload.bytes
          )
        : null;
      const derivedModelTextureReferences =
        collectTileDerivedModelTextureReferences(renderModelJson);
      derivedModelTextureReferences.forEach((reference) => {
        requiredMaterialTextureReferences.add(reference);
        textureReferences.add(reference);
      });
      if (renderModelPayload) {
        renderModelInspection = {
          objectKey: tile.renderModelObjectKey,
          sizeBytes: renderModelPayload.bytes.length,
          ...(renderModelPayload.etag ? { etag: renderModelPayload.etag } : {}),
          contentSha256: createHash("sha256")
            .update(renderModelPayload.bytes)
            .digest("hex"),
          materialTextureReferences: derivedModelTextureReferences
        };
      }
    }
    const resolvedTextureReferences = [...textureReferences].sort((left, right) =>
      left.localeCompare(right)
    );
    if (resolvedTextureReferences.length === 0) {
      return {
        assets: [],
        missingTextureReferences: [],
        requiresMaterialTextureBindings: false,
        sourceModelContentSha256,
        ...(renderModelInspection ? { renderModelInspection } : {})
      };
    }

    let assets = await this.resolveTileMaterialTextureContracts(resolvedTextureReferences);
    const missingTextureReferencesBeforeSync = resolvedTextureReferences.filter(
      (reference) => !assets.some((asset) => asset.reference === reference)
    );
    if (allowSourceSync && missingTextureReferencesBeforeSync.length > 0) {
      await this.syncTileMaterialTextureSources(tile, missingTextureReferencesBeforeSync);
      // A targeted texture-source sync also regenerates the derived GLB under
      // the same versioned object key. Re-read the model and rebuild its full
      // material closure before emitting readiness; otherwise the contract can
      // describe the pre-sync bytes while delivery serves the post-sync bytes.
      return this.resolveTileMaterialTextureAssets(tile, sourceAsset, false);
    }
    const missingTextureReferences = [...requiredMaterialTextureReferences]
      .filter((reference) => !assets.some((asset) => asset.reference === reference))
      .sort((left, right) => left.localeCompare(right));
    return {
      assets,
      missingTextureReferences,
      requiresMaterialTextureBindings: requiredMaterialTextureReferences.size > 0,
      sourceModelContentSha256,
      ...(renderModelInspection ? { renderModelInspection } : {})
    };
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
      if (selected) {
        assets.push(buildTileMaterialTextureAssetContract(reference, selected));
        continue;
      }

      const materialSource = contracts.assets.find((asset) => asset.extension === "mtr");
      if (materialSource) {
        assets.push(
          ...(await this.resolveTileMtrTextureContracts(reference, materialSource))
        );
        continue;
      }

      const sourceProvenDiffuseReference =
        resolveSourceProvenNumberedMtrDiffuseReference(reference);
      if (!sourceProvenDiffuseReference) {
        continue;
      }
      const diffuseContracts =
        await this.runtimeSettingsApplication.getTextureDeliveryContracts({
          resref: sourceProvenDiffuseReference,
          limit: 8,
          offset: 0
        });
      const selectedDiffuse = selectPreferredTileTextureContract(
        diffuseContracts.assets
      );
      if (selectedDiffuse) {
        // `reference` remains the authored GLB material resref while `resref`
        // identifies the exact source raster. This is observable provenance,
        // not an implicit adjacent-number or generic fallback.
        assets.push(buildTileMaterialTextureAssetContract(reference, selectedDiffuse));
      }
    }
    return assets;
  }

  private async resolveTileMtrTextureContracts(
    materialReference: string,
    materialSource: TextureDeliveryContract
  ): Promise<TileMaterialTextureAssetContract[]> {
    const payload = await this.readModuleBlobObject(materialSource.objectKey);
    if (!payload) {
      return [];
    }
    const slotReferences = collectTileMtrTextureSlotReferences(payload.bytes);
    const assets: TileMaterialTextureAssetContract[] = [];
    for (const slotReference of slotReferences) {
      const contracts = await this.runtimeSettingsApplication?.getTextureDeliveryContracts({
        resref: slotReference.reference,
        limit: 8,
        offset: 0
      });
      const selected = selectPreferredTileTextureContract(contracts?.assets ?? []);
      if (!selected) {
        continue;
      }
      // The source MDL/GLB material still names the MTR. Bind texture0 back to
      // that authored material reference so the frontend replaces the neutral
      // GLTF parse placeholder with the real diffuse texture. Preserve the
      // remaining named slot references for normal/roughness-aware consumers.
      const bindingReference =
        slotReference.slot === 0 ? materialReference : slotReference.reference;
      assets.push(buildTileMaterialTextureAssetContract(bindingReference, selected));
    }
    return assets;
  }

  private async syncTileMaterialTextureSources(
    tile: TileRecord,
    missingTextureReferences: string[]
  ): Promise<void> {
    const runtimeSettingsApplication = this.runtimeSettingsApplication;
    if (!runtimeSettingsApplication) {
      return;
    }

    await executeInFlight(
      this.inFlightTileMaterialSourceSync,
      `${tile.resref}|${missingTextureReferences.join(",")}`,
      async (): Promise<void> => {
        try {
          await runtimeSettingsApplication.syncVanillaTileModelSources(
            TILE_AUTO_SOURCE_SYNC_TRIGGERED_BY,
            [tile.resref],
            expandTileMaterialTextureSourceSyncReferences(missingTextureReferences)
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
    return this.committedSnapshotReader
      ? (await this.committedSnapshotReader.capture()).getModuleObject(key)
      : this.moduleBlobStorage.getModuleObject(settings.blobStorage, key);
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

function resolveSourceProvenNumberedMtrDiffuseReference(
  materialReference: string
): string | null {
  const normalized = materialReference.trim().toLowerCase();
  const match = normalized.match(/^mtr_nkey_(\d{4})$/u);
  if (!match?.[1]) {
    return null;
  }
  return `tex_core_${match[1]}_d`;
}

function expandTileMaterialTextureSourceSyncReferences(
  references: string[]
): string[] {
  const expanded: string[] = [];
  for (const reference of references) {
    expanded.push(reference);
    const sourceProvenDiffuseReference =
      resolveSourceProvenNumberedMtrDiffuseReference(reference);
    if (sourceProvenDiffuseReference) {
      expanded.push(sourceProvenDiffuseReference);
    }
  }
  return dedupeText(expanded);
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
  materialTextureAssets: TileMaterialTextureAssetContract[] = [],
  missingTextureReferences: string[] = [],
  requiresMaterialTextureBindings = true,
  renderModelInspection?: TileMaterialTextureResolution["renderModelInspection"],
  sourceModelContentSha256?: string
): TileRenderAssetContract {
  const sourceAsset = buildTileSourceAssetContract(tile);
  const declaredModelAsset = buildTileRenderModelAssetContract(tile, cacheKey);
  const modelAsset =
    declaredModelAsset &&
    renderModelInspection?.objectKey === declaredModelAsset.objectKey
      ? {
          ...declaredModelAsset,
          sizeBytes: renderModelInspection.sizeBytes,
          ...(renderModelInspection.etag
            ? { etag: renderModelInspection.etag }
            : {}),
          contentSha256: renderModelInspection.contentSha256
        }
      : declaredModelAsset;
  const textureDeliveryStatus = resolveTileTextureDeliveryStatus(
    tile,
    sourceAsset,
    materialTextureAssets
  );
  const materialBindingStatus = resolveTileMaterialBindingStatus(
    sourceAsset,
    materialTextureAssets,
    missingTextureReferences,
    requiresMaterialTextureBindings
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
  if (missingTextureReferences.length > 0) {
    blockers.push(
      `blocked_tile_material_texture_references_missing:${missingTextureReferences.join(",")}`
    );
  }
  if (!modelAsset) {
    blockers.push("blocked_tile_model_geometry_loader_missing");
  }

  return {
    sourceAssetStatus: sourceAsset.objectKey ? "ready" : "blocked",
    mdlSourceStatus: sourceAsset.role === "mdl_source" ? "ready" : "blocked",
    mdlSourceObjectKey: sourceAsset.role === "mdl_source" ? sourceAsset.objectKey : undefined,
    mdlSourceContentSha256:
      sourceAsset.role === "mdl_source" ? sourceModelContentSha256 : undefined,
    glbGeometryStatus: modelAsset
      ? "ready"
      : "blocked_tile_process_contract_missing_glb_geometry",
    textureDeliveryStatus,
    materialBindingStatus,
    rendererHandoffStatus: modelAsset ? "ready" : "blocked_tile_model_geometry_loader_missing",
    modelDeliveryStatus: modelAsset ? "ready" : "blocked_tile_model_glb_missing",
    modelAsset,
    materialTextureAssets: materialTextureAssets.length > 0 ? materialTextureAssets : undefined,
    requiredMaterialTextureReferences:
      renderModelInspection &&
      renderModelInspection.materialTextureReferences.length > 0
        ? renderModelInspection.materialTextureReferences
        : undefined,
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
  materialTextureAssets: TileMaterialTextureAssetContract[],
  missingTextureReferences: string[] = [],
  requiresMaterialTextureBindings = true
): TileRenderAssetContract["materialBindingStatus"] {
  if (sourceAsset.role === "derived_model_asset") {
    return "blocked_tile_material_binding_derived_model_only";
  }
  if (missingTextureReferences.length > 0) {
    return "blocked_tile_process_contract_missing_material_bindings";
  }
  if (!requiresMaterialTextureBindings) {
    return "ready";
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

function collectTileDerivedModelTextureReferences(modelJson: unknown): string[] {
  const references = new Set<string>();
  const absorbReference = (value: unknown): void => {
    if (typeof value !== "string") {
      return;
    }
    const normalized = normalizeTileTextureReference(value);
    if (normalized) {
      references.add(normalized);
    }
  };
  const absorbMaterialAuroraExtras = (value: unknown): void => {
    const extras = asRecord(value);
    const aurora = asRecord(extras?.["aurora"]);
    absorbReference(aurora?.["textureReference"]);
    // `textureReferences` on the root/material is converter-wide provenance
    // and includes emitter/VFX bitmaps. It is intentionally not a material
    // dependency list. Scoped `textureReference` and `textureSlots` are.
    const textureSlots = aurora?.["textureSlots"];
    if (Array.isArray(textureSlots)) {
      textureSlots.forEach((slotValue) => {
        const slot = asRecord(slotValue);
        absorbReference(slot?.["reference"]);
      });
    }
  };

  const root = asRecord(modelJson);
  const materials = Array.isArray(root?.["materials"]) ? root["materials"] : [];
  materials.forEach((materialValue) => {
    const material = asRecord(materialValue);
    absorbMaterialAuroraExtras(material?.["extras"]);
  });
  const meshes = Array.isArray(root?.["meshes"]) ? root["meshes"] : [];
  meshes.forEach((meshValue) => {
    const mesh = asRecord(meshValue);
    const primitives = Array.isArray(mesh?.["primitives"]) ? mesh["primitives"] : [];
    primitives.forEach((primitiveValue) => {
      const primitive = asRecord(primitiveValue);
      absorbMaterialAuroraExtras(primitive?.["extras"]);
    });
  });
  return [...references].sort((left, right) => left.localeCompare(right));
}

interface TileMtrTextureSlotReference {
  slot: number;
  reference: string;
}

function collectTileMtrTextureSlotReferences(
  bytes: Buffer
): TileMtrTextureSlotReference[] {
  const referencesBySlot = new Map<number, string>();
  const lines = bytes.toString("utf-8").split(/\r?\n/u);
  for (const line of lines) {
    const source = line
      .replace(/\/\/.*$/u, "")
      .replace(/;.*$/u, "")
      .trim();
    if (!source) {
      continue;
    }
    const tokens = source.split(/\s+/u);
    const key = tokens[0]?.toLowerCase() ?? "";
    const slotMatch = key.match(/^texture(\d+)$/u);
    const slot =
      slotMatch?.[1] !== undefined
        ? Number.parseInt(slotMatch[1], 10)
        : key === "bitmap"
          ? 0
          : null;
    if (slot === null || !Number.isInteger(slot) || slot < 0) {
      continue;
    }
    const reference = normalizeTileTextureReference(tokens.slice(1).join(" "));
    if (reference && !referencesBySlot.has(slot)) {
      referencesBySlot.set(slot, reference);
    }
  }
  return [...referencesBySlot.entries()]
    .sort(([left], [right]) => left - right)
    .map(([slot, reference]) => ({ slot, reference }));
}

function selectPreferredTileTextureContract(
  contracts: TextureDeliveryContract[]
): TextureDeliveryContract | null {
  return (
    contracts.find((asset) => asset.extension === "dds") ??
    contracts.find((asset) => asset.extension === "tga") ??
    contracts.find((asset) => asset.extension === "bmp") ??
    contracts.find((asset) => asset.extension === "plt") ??
    null
  );
}

function buildTileMaterialTextureAssetContract(
  reference: string,
  asset: TextureDeliveryContract
): TileMaterialTextureAssetContract {
  return {
    reference,
    textureId: asset.textureId,
    resref: asset.resref,
    objectKey: asset.objectKey,
    extension: asset.extension,
    contentType: asset.contentType,
    sizeBytes: asset.sizeBytes,
    contentSha256: asset.contentSha256,
    source: asset.source,
    sourcePath: asset.sourcePath,
    deliveryPath: appendTextureDeliveryFormat(asset.deliveryPath, asset),
    deliveryUrl: appendTextureDeliveryFormat(asset.deliveryUrl, asset),
    s3Url: asset.s3Url
  };
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
  // Derived models belong to the module-level Aurora namespace, never below
  // the HAK source directory that supplied the MDL.
  const auroraNamespaceIndex = sourceKey.indexOf("__aurora/");
  const prefix = auroraNamespaceIndex >= 0
    ? sourceKey.slice(0, auroraNamespaceIndex)
    : sourceKey.includes("/")
      ? sourceKey.slice(0, sourceKey.lastIndexOf("/") + 1)
      : "";
  return `${prefix}__aurora/derived/models/${tile.resref.toLowerCase()}.glb`;
}

function isVersionedTileDerivedModelObjectKeyCurrent(objectKey: string): boolean {
  const normalized = objectKey.replace(/\\/gu, "/").trim().toLowerCase();
  const versionedPath = normalized.match(
    /__aurora\/derived\/models\/(aurora-mdl-to-glb_[^/]+)\//u
  );
  if (!versionedPath) {
    // Preserve compatibility with legacy unversioned objects; their embedded
    // GLB converterVersion remains the authority.
    return true;
  }
  const currentVersionSegment = AURORA_MDL_TO_GLB_CONVERTER_VERSION.replace(
    /[^a-zA-Z0-9._-]+/gu,
    "_"
  ).toLowerCase();
  return versionedPath[1] === currentVersionSegment;
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
  collectTileDerivedModelTextureReferences,
  collectTileMtrTextureSlotReferences,
  resolveSourceProvenNumberedMtrDiffuseReference,
  expandTileMaterialTextureSourceSyncReferences,
  buildTileSourceAssetContract,
  buildTileRenderAssetContract,
  buildExpectedTileDerivedModelObjectKey,
  isVersionedTileDerivedModelObjectKeyCurrent,
  TILE_NUMBERED_MTR_DIFFUSE_FAMILY_POLICY
} as const;
