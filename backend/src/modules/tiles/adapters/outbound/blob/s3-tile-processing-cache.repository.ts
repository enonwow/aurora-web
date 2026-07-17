import { S3Client } from "@aws-sdk/client-s3";
import { Inject, Injectable, OnModuleDestroy, Optional } from "@nestjs/common";
import { AppConfigService } from "../../../../../common/config/app-config.service";
import {
  buildBlobSettingsSignature,
  buildCacheObjectKey,
  buildPointerObjectKey,
  createBlobS3Client,
  deletePreviousObjectIfPointerStable,
  readPointerEntry,
  readProcessingCacheEntry,
  writeJsonObject
} from "../../../../../common/blob/s3-processing-cache.helpers";
import {
  RUNTIME_SETTINGS_REPOSITORY,
  type RuntimeSettingsRepositoryPort
} from "../../../../runtime-settings/application/ports/runtime-settings-repository.port";
import type { BlobStorageSettings } from "../../../../runtime-settings/domain/runtime-settings.types";
import type {
  TileProcessingCacheEntry,
  TileProcessingCachePort
} from "../../../application/ports/tile-processing-cache.port";
import type { TileProcessingResult } from "../../../domain/tile.types";

const TILE_CACHE_SUFFIX = "cache/tiles";
const TILE_CURRENT_POINTER_SUFFIX = `${TILE_CACHE_SUFFIX}/current`;

@Injectable()
export class S3TileProcessingCacheRepository
  implements TileProcessingCachePort, OnModuleDestroy
{
  private client: S3Client | null = null;
  private clientSignature: string | null = null;

  constructor(
    @Inject(RUNTIME_SETTINGS_REPOSITORY)
    private readonly runtimeSettingsRepository: RuntimeSettingsRepositoryPort,
    @Optional() private readonly config?: AppConfigService
  ) {}

  onModuleDestroy(): void {
    this.client?.destroy();
    this.client = null;
    this.clientSignature = null;
  }

  async get(key: string): Promise<TileProcessingCacheEntry | null> {
    const { settings, client } = await this.resolveClient();
    const objectKey = buildCacheObjectKey(settings, TILE_CACHE_SUFFIX, key);
    return this.withTileCacheTimeout(
      (abortSignal) =>
        readProcessingCacheEntry<TileProcessingResult>(
          client,
          settings,
          objectKey,
          abortSignal
        ) as Promise<TileProcessingCacheEntry | null>,
      null
    );
  }

  async set(key: string, value: TileProcessingResult): Promise<TileProcessingCacheEntry> {
    const { settings, client } = await this.resolveClient();
    const logicalId = buildTileLogicalId(value, key);
    const pointerObjectKey = buildPointerObjectKey(
      settings,
      TILE_CURRENT_POINTER_SUFFIX,
      logicalId
    );
    const objectKey = buildCacheObjectKey(settings, TILE_CACHE_SUFFIX, key);
    const entry: TileProcessingCacheEntry = {
      key,
      value,
      storedAt: new Date().toISOString(),
      hits: 0
    };

    return this.withTileCacheTimeout(async (abortSignal) => {
      const previousPointer = await readPointerEntry(
        client,
        settings,
        pointerObjectKey,
        abortSignal
      );
      await writeJsonObject(client, settings, objectKey, entry, abortSignal);
      await writeJsonObject(
        client,
        settings,
        pointerObjectKey,
        {
          logicalId,
          cacheKey: key,
          updatedAt: new Date().toISOString()
        },
        abortSignal
      );

      if (previousPointer && previousPointer.cacheKey !== key) {
        await deletePreviousObjectIfPointerStable(
          client,
          settings,
          pointerObjectKey,
          key,
          buildCacheObjectKey(settings, TILE_CACHE_SUFFIX, previousPointer.cacheKey),
          abortSignal
        );
      }
      return entry;
    }, entry);
  }

  private async withTileCacheTimeout<TValue>(
    operation: (abortSignal: AbortSignal) => Promise<TValue>,
    timeoutFallback: TValue
  ): Promise<TValue> {
    const abortController = new AbortController();
    const timeoutMs = this.config?.processingCacheL2TileTimeoutMs ?? 15_000;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const operationResult = operation(abortController.signal).catch((error) => {
      if (abortController.signal.aborted) {
        return timeoutFallback;
      }
      throw error;
    });
    const timeoutResult = new Promise<TValue>((resolve) => {
      timeoutId = setTimeout(() => {
        abortController.abort();
        resolve(timeoutFallback);
      }, timeoutMs);
    });
    try {
      return await Promise.race([operationResult, timeoutResult]);
    } finally {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    }
  }

  private async getBlobSettings(): Promise<BlobStorageSettings> {
    const settings = await this.runtimeSettingsRepository.get();
    return settings.blobStorage;
  }

  private async resolveClient(): Promise<{ settings: BlobStorageSettings; client: S3Client }> {
    const settings = await this.getBlobSettings();
    const signature = buildBlobSettingsSignature(settings);

    if (!this.client || this.clientSignature !== signature) {
      this.client?.destroy();
      this.client = createBlobS3Client(settings);
      this.clientSignature = signature;
    }

    return {
      settings,
      client: this.client!
    };
  }
}

function buildTileLogicalId(value: TileProcessingResult, cacheKey: string): string {
  if (typeof value.tileId === "string" && value.tileId.trim().length > 0) {
    return `tile:${value.tileId.trim().toLowerCase()}`;
  }
  return `tile-cache:${cacheKey.toLowerCase()}`;
}
