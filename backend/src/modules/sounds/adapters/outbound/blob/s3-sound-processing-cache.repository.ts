import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Inject, Injectable, OnModuleDestroy } from "@nestjs/common";
import {
  RUNTIME_SETTINGS_REPOSITORY,
  type RuntimeSettingsRepositoryPort
} from "../../../../runtime-settings/application/ports/runtime-settings-repository.port";
import type { BlobStorageSettings } from "../../../../runtime-settings/domain/runtime-settings.types";
import type {
  SoundProcessingCacheEntry,
  SoundProcessingCachePort
} from "../../../application/ports/sound-processing-cache.port";
import type { SoundProcessingResult } from "../../../domain/sound.types";

const SOUND_CACHE_SUFFIX = "cache/sounds";

@Injectable()
export class S3SoundProcessingCacheRepository
  implements SoundProcessingCachePort, OnModuleDestroy
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

  async get(key: string): Promise<SoundProcessingCacheEntry | null> {
    const { settings, client } = await this.resolveClient();
    const objectKey = buildObjectKey(settings, key);

    try {
      const response = await client.send(
        new GetObjectCommand({
          Bucket: settings.bucket,
          Key: objectKey
        })
      );
      const bodyText = await readBodyAsString(response.Body);
      const parsed = JSON.parse(bodyText) as SoundProcessingCacheEntry;
      return {
        key: parsed.key,
        value: parsed.value,
        storedAt: parsed.storedAt,
        hits: parsed.hits + 1
      };
    } catch (error) {
      if (isMissingObjectError(error)) {
        return null;
      }
      throw error;
    }
  }

  async set(key: string, value: SoundProcessingResult): Promise<SoundProcessingCacheEntry> {
    const { settings, client } = await this.resolveClient();
    const objectKey = buildObjectKey(settings, key);
    const entry: SoundProcessingCacheEntry = {
      key,
      value,
      storedAt: new Date().toISOString(),
      hits: 0
    };

    await client.send(
      new PutObjectCommand({
        Bucket: settings.bucket,
        Key: objectKey,
        Body: JSON.stringify(entry),
        ContentType: "application/json; charset=utf-8"
      })
    );

    return entry;
  }

  private async getBlobSettings(): Promise<BlobStorageSettings> {
    const settings = await this.runtimeSettingsRepository.get();
    return settings.blobStorage;
  }

  private async resolveClient(): Promise<{ settings: BlobStorageSettings; client: S3Client }> {
    const settings = await this.getBlobSettings();
    const signature = buildSettingsSignature(settings);

    if (!this.client || this.clientSignature !== signature) {
      this.client?.destroy();
      this.client = createClient(settings);
      this.clientSignature = signature;
    }

    return {
      settings,
      client: this.client!
    };
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
  return `${normalizedPrefix}${SOUND_CACHE_SUFFIX}/${cacheKey}.json`;
}

function normalizePrefix(value: string): string {
  const trimmed = value.trim().replace(/^\/+/u, "").replace(/\/+$/u, "");
  if (!trimmed) {
    return "";
  }
  return `${trimmed}/`;
}

function buildSettingsSignature(settings: BlobStorageSettings): string {
  return [
    settings.endpoint,
    settings.region,
    settings.bucket,
    settings.modulePrefix,
    settings.accessKeyId,
    settings.secretAccessKey,
    String(settings.forcePathStyle)
  ].join("|");
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
