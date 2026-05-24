import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Injectable, Inject } from "@nestjs/common";
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

@Injectable()
export class S3PlaceableProcessingCacheRepository
  implements PlaceableProcessingCachePort
{
  constructor(
    @Inject(RUNTIME_SETTINGS_REPOSITORY)
    private readonly runtimeSettingsRepository: RuntimeSettingsRepositoryPort
  ) {}

  async get<TValue = unknown>(key: string): Promise<ProcessingCacheEntry<TValue> | null> {
    const settings = await this.getBlobSettings();
    const objectKey = buildObjectKey(settings, key);
    const client = createClient(settings);

    try {
      const response = await client.send(
        new GetObjectCommand({
          Bucket: settings.bucket,
          Key: objectKey
        })
      );
      const bodyText = await readBodyAsString(response.Body);
      const parsed = JSON.parse(bodyText) as ProcessingCacheEntry<TValue>;
      const nextHits = parsed.hits + 1;
      const nextEntry: ProcessingCacheEntry<TValue> = {
        key: parsed.key,
        value: parsed.value,
        storedAt: parsed.storedAt,
        hits: nextHits
      };

      await client.send(
        new PutObjectCommand({
          Bucket: settings.bucket,
          Key: objectKey,
          Body: JSON.stringify(nextEntry),
          ContentType: "application/json; charset=utf-8"
        })
      );

      return structuredClone(nextEntry);
    } catch (error) {
      if (isMissingObjectError(error)) {
        return null;
      }
      throw error;
    } finally {
      client.destroy();
    }
  }

  async set<TValue = unknown>(
    key: string,
    value: TValue
  ): Promise<ProcessingCacheEntry<TValue>> {
    const settings = await this.getBlobSettings();
    const objectKey = buildObjectKey(settings, key);
    const entry: ProcessingCacheEntry<TValue> = {
      key,
      value: structuredClone(value),
      storedAt: new Date().toISOString(),
      hits: 0
    };

    const client = createClient(settings);
    try {
      await client.send(
        new PutObjectCommand({
          Bucket: settings.bucket,
          Key: objectKey,
          Body: JSON.stringify(entry),
          ContentType: "application/json; charset=utf-8"
        })
      );
    } finally {
      client.destroy();
    }

    return structuredClone(entry);
  }

  private async getBlobSettings(): Promise<BlobStorageSettings> {
    const settings = await this.runtimeSettingsRepository.get();
    return settings.blobStorage;
  }
}

function createClient(settings: BlobStorageSettings): S3Client {
  return new S3Client({
    endpoint: settings.endpoint,
    region: settings.region,
    forcePathStyle: settings.forcePathStyle,
    credentials: {
      accessKeyId: settings.accessKeyId,
      secretAccessKey: settings.secretAccessKey
    }
  });
}

function buildObjectKey(settings: BlobStorageSettings, cacheKey: string): string {
  const normalizedPrefix = normalizePrefix(settings.modulePrefix);
  return `${normalizedPrefix}${PLACEABLE_CACHE_SUFFIX}/${cacheKey}.json`;
}

function normalizePrefix(value: string): string {
  const trimmed = value.trim().replace(/^\/+/u, "").replace(/\/+$/u, "");
  if (!trimmed) {
    return "";
  }
  return `${trimmed}/`;
}

function isMissingObjectError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const withName = error as { name?: string; $metadata?: { httpStatusCode?: number } };
  return (
    withName.name === "NoSuchKey" ||
    withName.name === "NotFound" ||
    withName.$metadata?.httpStatusCode === 404
  );
}

async function readBodyAsString(body: unknown): Promise<string> {
  if (!body) {
    return "";
  }

  if (typeof body === "string") {
    return body;
  }

  const withTransform = body as { transformToString?: () => Promise<string> };
  if (typeof withTransform.transformToString === "function") {
    return withTransform.transformToString();
  }

  if (body instanceof Uint8Array) {
    return Buffer.from(body).toString("utf-8");
  }

  const streamLike = body as {
    on?: (event: string, listener: (...args: unknown[]) => void) => void;
  };
  if (typeof streamLike.on === "function") {
    const chunks: Buffer[] = [];
    return new Promise<string>((resolve, reject) => {
      streamLike.on!("data", (chunk: unknown) => {
        if (typeof chunk === "string") {
          chunks.push(Buffer.from(chunk));
          return;
        }
        if (chunk instanceof Uint8Array) {
          chunks.push(Buffer.from(chunk));
        }
      });
      streamLike.on!("error", reject);
      streamLike.on!("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    });
  }

  throw new Error("Unsupported S3 object body type.");
}
