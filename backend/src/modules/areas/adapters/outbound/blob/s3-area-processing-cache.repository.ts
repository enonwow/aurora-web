import { S3Client } from "@aws-sdk/client-s3";
import { Inject, Injectable, OnModuleDestroy } from "@nestjs/common";
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
  AreaProcessingCacheEntry,
  AreaProcessingCachePort
} from "../../../application/ports/area-processing-cache.port";
import type { AreaProcessingResult } from "../../../domain/area.types";

const AREA_CACHE_SUFFIX = "cache/areas";
const AREA_CURRENT_POINTER_SUFFIX = `${AREA_CACHE_SUFFIX}/current`;

@Injectable()
export class S3AreaProcessingCacheRepository
  implements AreaProcessingCachePort, OnModuleDestroy
{
  private client: S3Client | null = null;
  private clientSignature: string | null = null;

  constructor(
    @Inject(RUNTIME_SETTINGS_REPOSITORY)
    private readonly runtimeSettingsRepository: RuntimeSettingsRepositoryPort
  ) {}

  onModuleDestroy(): void {
    this.client?.destroy();
    this.client = null;
    this.clientSignature = null;
  }

  async get(key: string): Promise<AreaProcessingCacheEntry | null> {
    const { settings, client } = await this.resolveClient();
    const objectKey = buildCacheObjectKey(settings, AREA_CACHE_SUFFIX, key);
    const entry = await readProcessingCacheEntry<AreaProcessingResult>(client, settings, objectKey);
    return entry as AreaProcessingCacheEntry | null;
  }

  async set(key: string, value: AreaProcessingResult): Promise<AreaProcessingCacheEntry> {
    const { settings, client } = await this.resolveClient();
    const logicalId = buildAreaLogicalId(value, key);
    const pointerObjectKey = buildPointerObjectKey(
      settings,
      AREA_CURRENT_POINTER_SUFFIX,
      logicalId
    );
    const previousPointer = await readPointerEntry(client, settings, pointerObjectKey);
    const objectKey = buildCacheObjectKey(settings, AREA_CACHE_SUFFIX, key);
    const entry: AreaProcessingCacheEntry = {
      key,
      value,
      storedAt: new Date().toISOString(),
      hits: 0
    };

    await writeJsonObject(client, settings, objectKey, entry);

    await writeJsonObject(client, settings, pointerObjectKey, {
      logicalId,
      cacheKey: key,
      updatedAt: new Date().toISOString()
    });

    if (previousPointer && previousPointer.cacheKey !== key) {
      await deletePreviousObjectIfPointerStable(
        client,
        settings,
        pointerObjectKey,
        key,
        buildCacheObjectKey(settings, AREA_CACHE_SUFFIX, previousPointer.cacheKey)
      );
    }

    return entry;
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

function buildAreaLogicalId(value: AreaProcessingResult, cacheKey: string): string {
  if (typeof value.areaId === "string" && value.areaId.trim().length > 0) {
    return `area:${value.areaId.trim().toLowerCase()}`;
  }
  return `area-cache:${cacheKey.toLowerCase()}`;
}
