import { Inject, Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import { AppException } from "../../../common/http/app-exception";
import { AppConfigService } from "../../../common/config/app-config.service";
import {
  MODULE_BLOB_STORAGE,
  type ModuleBlobObjectPayload,
  type ModuleBlobStoragePort
} from "../../runtime-settings/application/ports/module-blob-storage.port";
import {
  RUNTIME_SETTINGS_REPOSITORY,
  type RuntimeSettingsRepositoryPort
} from "../../runtime-settings/application/ports/runtime-settings-repository.port";
import type { BlobStorageSettings } from "../../runtime-settings/domain/runtime-settings.types";
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
  TileRecord
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

@Injectable()
export class TilesApplicationService {
  private readonly inFlightTileProcessing = new Map<string, Promise<TileProcessingEnvelope>>();

  constructor(
    @Inject(TILE_REPOSITORY)
    private readonly repository: TileRepositoryPort,
    @Inject(TILE_PROCESSING_CACHE)
    private readonly processingCache: TileProcessingCachePort,
    private readonly appConfig?: AppConfigService,
    @Inject(RUNTIME_SETTINGS_REPOSITORY)
    private readonly runtimeSettingsRepository?: RuntimeSettingsRepositoryPort,
    @Inject(MODULE_BLOB_STORAGE)
    private readonly moduleBlobStorage?: ModuleBlobStoragePort
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
    const tile = await this.resolveTileRecord(query.tileId);
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
      : this.executeInFlight(this.inFlightTileProcessing, cacheKey, processMiss);
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
    if (
      value.textureAtlas.objectKey &&
      value.textureAtlas.contentType &&
      (value.textureAtlas.sizeBytes ?? 0) > 0
    ) {
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
      }
    };

    await this.processingCache.set(cacheKey, refreshed);
    return refreshed;
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

  private executeInFlight<T>(
    inFlight: Map<string, Promise<T>>,
    key: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const existing = inFlight.get(key);
    if (existing) {
      return existing;
    }

    const pending = operation().finally(() => {
      inFlight.delete(key);
    });
    inFlight.set(key, pending);
    return pending;
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

function buildS3ObjectUrl(bucket: string, objectKey: string): string {
  const normalizedObjectKey = objectKey.replace(/^\/+/, "");
  return `s3://${bucket}/${normalizedObjectKey}`;
}

function buildBlobObjectHttpUrl(settings: BlobStorageSettings, objectKey: string): string {
  const endpoint = settings.endpoint.replace(/\/+$/u, "");
  const encodedSegments = objectKey
    .replace(/^\/+|\/+$/gu, "")
    .split("/")
    .filter((segment) => segment.length > 0)
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  if (settings.forcePathStyle) {
    return `${endpoint}/${encodeURIComponent(settings.bucket)}/${encodedSegments}`;
  }

  return `${endpoint}/${encodedSegments}`;
}

export const __tilesApplicationServiceInternals = {
  buildBenchmarkFingerprint,
  summarizeDurations,
  percentile,
  buildBlobObjectHttpUrl
} as const;
