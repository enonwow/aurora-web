import { S3Client } from "@aws-sdk/client-s3";
import { Injectable, Inject, OnModuleDestroy } from "@nestjs/common";
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
  PlaceableProcessingCachePort,
  ProcessingCacheEntry
} from "../../../application/ports/placeable-processing-cache.port";

const PLACEABLE_CACHE_SUFFIX = "cache/placeables";
const PLACEABLE_CURRENT_POINTER_SUFFIX = `${PLACEABLE_CACHE_SUFFIX}/current`;

@Injectable()
export class S3PlaceableProcessingCacheRepository
  implements PlaceableProcessingCachePort, OnModuleDestroy
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

  async get<TValue = unknown>(key: string): Promise<ProcessingCacheEntry<TValue> | null> {
    const { settings, client } = await this.resolveClient();
    const objectKey = buildCacheObjectKey(settings, PLACEABLE_CACHE_SUFFIX, key);
    const entry = await readProcessingCacheEntry<TValue>(client, settings, objectKey);
    return entry as ProcessingCacheEntry<TValue> | null;
  }

  async set<TValue = unknown>(
    key: string,
    value: TValue
  ): Promise<ProcessingCacheEntry<TValue>> {
    const { settings, client } = await this.resolveClient();
    const logicalId = buildPlaceableLogicalId(value);
    const pointerObjectKey = logicalId
      ? buildPointerObjectKey(settings, PLACEABLE_CURRENT_POINTER_SUFFIX, logicalId)
      : null;
    const previousPointer = pointerObjectKey
      ? await readPointerEntry(client, settings, pointerObjectKey)
      : null;
    const objectKey = buildCacheObjectKey(settings, PLACEABLE_CACHE_SUFFIX, key);
    const entry: ProcessingCacheEntry<TValue> = {
      key,
      value,
      storedAt: new Date().toISOString(),
      hits: 0
    };

    await writeJsonObject(client, settings, objectKey, entry);

    if (logicalId && pointerObjectKey) {
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
          buildCacheObjectKey(settings, PLACEABLE_CACHE_SUFFIX, previousPointer.cacheKey)
        );
      }
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

export function buildPlaceableLogicalId(value: unknown): string | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const templateId = typeof record.templateId === "string" ? record.templateId.trim() : "";
  if (!templateId) {
    return null;
  }

  const kind = typeof record.kind === "string" ? record.kind.trim().toLowerCase() : "";
  if (kind === "creature" || kind === "item") {
    return `template:${kind}:${templateId.toLowerCase()}`;
  }

  const subtypeRaw =
    typeof record.placeableSubtype === "string" ? record.placeableSubtype.trim().toLowerCase() : "";
  const subtype = subtypeRaw || "generic";
  const metadata = readRecord(record.metadata);
  const areaInstanceRenderSource = readLogicalIdString(metadata, "areaInstanceRenderSource");
  const areaInstanceLookupStatus = readLogicalIdString(
    metadata,
    "areaInstanceModelLookupStatus"
  );
  const areaInstanceModelResRef =
    readLogicalIdString(metadata, "lookupModelResRef") ??
    readLogicalIdString(metadata, "modelResRef");
  const isAreaInstance =
    areaInstanceRenderSource === "git" ||
    Boolean(areaInstanceLookupStatus) ||
    Boolean(areaInstanceModelResRef);
  if (isAreaInstance) {
    const modelId = areaInstanceModelResRef
      ? `model:${normalizeLogicalIdPart(areaInstanceModelResRef)}`
      : [
          "facts",
          `appearance:${readLogicalIdNumber(metadata, "areaInstanceAppearanceType") ?? "none"}`,
          `generic:${readLogicalIdNumber(metadata, "areaInstanceGenericType") ?? "none"}`
        ].join(":");
    return `placeable-area-instance:${subtype}:${modelId}`;
  }

  return `placeable:${templateId.toLowerCase()}:${subtype}`;
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readLogicalIdString(
  record: Record<string, unknown> | null,
  key: string
): string | null {
  const value = record?.[key];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim().toLowerCase()
    : null;
}

function readLogicalIdNumber(
  record: Record<string, unknown> | null,
  key: string
): string | null {
  const value = record?.[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(Math.trunc(value));
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? String(Math.trunc(parsed)) : null;
  }
  return null;
}

function normalizeLogicalIdPart(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9_.-]+/gu, "_");
}
