import { createHash } from "node:crypto";
import { Agent as HttpAgent } from "node:http";
import { Agent as HttpsAgent } from "node:https";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import type { BlobStorageSettings } from "../../modules/runtime-settings/domain/runtime-settings.types";

const DEFAULT_BLOB_S3_MAX_SOCKETS = 128;
const DEFAULT_BLOB_S3_SOCKET_WARNING_TIMEOUT_MS = 30_000;
const DEFAULT_BLOB_S3_REQUEST_TIMEOUT_MS = 120_000;

function readPositiveIntegerEnv(name: string, fallback: number): number {
  const raw = Number(process.env[name]);
  if (Number.isInteger(raw) && raw > 0) {
    return raw;
  }
  return fallback;
}

export function createBlobS3RequestHandler(): NodeHttpHandler {
  const maxSockets = readPositiveIntegerEnv(
    "AURORA_BLOB_S3_MAX_SOCKETS",
    DEFAULT_BLOB_S3_MAX_SOCKETS
  );
  return new NodeHttpHandler({
    httpAgent: new HttpAgent({
      keepAlive: true,
      maxSockets
    }),
    httpsAgent: new HttpsAgent({
      keepAlive: true,
      maxSockets
    }),
    requestTimeout: readPositiveIntegerEnv(
      "AURORA_BLOB_S3_REQUEST_TIMEOUT_MS",
      DEFAULT_BLOB_S3_REQUEST_TIMEOUT_MS
    ),
    socketAcquisitionWarningTimeout: readPositiveIntegerEnv(
      "AURORA_BLOB_S3_SOCKET_WARNING_TIMEOUT_MS",
      DEFAULT_BLOB_S3_SOCKET_WARNING_TIMEOUT_MS
    )
  });
}

export interface S3ProcessingCacheEntry<TValue = unknown> {
  key: string;
  value: TValue;
  storedAt: string;
  hits: number;
}

export interface S3CachePointerEntry {
  logicalId: string;
  cacheKey: string;
  updatedAt: string;
}

export function createBlobS3Client(settings: BlobStorageSettings): S3Client {
  return new S3Client({
    endpoint: settings.endpoint,
    region: settings.region,
    forcePathStyle: settings.forcePathStyle,
    requestHandler: createBlobS3RequestHandler(),
    credentials: {
      accessKeyId: settings.accessKeyId,
      secretAccessKey: settings.secretAccessKey
    }
  });
}

export function buildBlobSettingsSignature(settings: BlobStorageSettings): string {
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

export function buildCacheObjectKey(
  settings: BlobStorageSettings,
  cacheSuffix: string,
  cacheKey: string
): string {
  return `${normalizePrefix(settings.modulePrefix)}${cacheSuffix}/${cacheKey}.json`;
}

export function buildPointerObjectKey(
  settings: BlobStorageSettings,
  pointerSuffix: string,
  logicalId: string
): string {
  const pointerId = createHash("sha256").update(logicalId).digest("hex");
  return `${normalizePrefix(settings.modulePrefix)}${pointerSuffix}/${pointerId}.json`;
}

export async function readProcessingCacheEntry<TValue>(
  client: S3Client,
  settings: BlobStorageSettings,
  objectKey: string,
  abortSignal?: AbortSignal
): Promise<S3ProcessingCacheEntry<TValue> | null> {
  const parsed = await readJsonObject<S3ProcessingCacheEntry<TValue>>(
    client,
    settings,
    objectKey,
    abortSignal
  );
  if (!parsed) {
    return null;
  }

  return {
    key: parsed.key,
    value: parsed.value,
    storedAt: parsed.storedAt,
    hits: parsed.hits + 1
  };
}

export async function writeJsonObject(
  client: S3Client,
  settings: BlobStorageSettings,
  objectKey: string,
  payload: unknown,
  abortSignal?: AbortSignal
): Promise<void> {
  await client.send(
    new PutObjectCommand({
      Bucket: settings.bucket,
      Key: objectKey,
      Body: JSON.stringify(payload),
      ContentType: "application/json; charset=utf-8"
    }),
    abortSignal ? { abortSignal } : undefined
  );
}

export async function readPointerEntry(
  client: S3Client,
  settings: BlobStorageSettings,
  pointerObjectKey: string,
  abortSignal?: AbortSignal
): Promise<S3CachePointerEntry | null> {
  try {
    const parsed = await readJsonObject<S3CachePointerEntry>(
      client,
      settings,
      pointerObjectKey,
      abortSignal
    );
    if (
      !parsed ||
      typeof parsed.logicalId !== "string" ||
      typeof parsed.cacheKey !== "string"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function deletePreviousObjectIfPointerStable(
  client: S3Client,
  settings: BlobStorageSettings,
  pointerObjectKey: string,
  expectedCurrentCacheKey: string,
  previousObjectKey: string,
  abortSignal?: AbortSignal
): Promise<void> {
  const pointer = await readPointerEntry(client, settings, pointerObjectKey, abortSignal);
  if (!pointer || pointer.cacheKey !== expectedCurrentCacheKey) {
    return;
  }

  await deleteObjectIfExists(client, settings, previousObjectKey, abortSignal);
}

function normalizePrefix(value: string): string {
  const trimmed = value.trim().replace(/^\/+/u, "").replace(/\/+$/u, "");
  if (!trimmed) {
    return "";
  }
  return `${trimmed}/`;
}

async function readJsonObject<TValue>(
  client: S3Client,
  settings: BlobStorageSettings,
  objectKey: string,
  abortSignal?: AbortSignal
): Promise<TValue | null> {
  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: settings.bucket,
        Key: objectKey
      }),
      abortSignal ? { abortSignal } : undefined
    );
    const bodyText = await readBodyAsString(response.Body);
    return JSON.parse(bodyText) as TValue;
  } catch (error) {
    if (isMissingObjectError(error)) {
      return null;
    }
    throw error;
  }
}

async function deleteObjectIfExists(
  client: S3Client,
  settings: BlobStorageSettings,
  objectKey: string,
  abortSignal?: AbortSignal
): Promise<void> {
  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: settings.bucket,
        Key: objectKey
      }),
      abortSignal ? { abortSignal } : undefined
    );
  } catch (error) {
    if (!isMissingObjectError(error)) {
      throw error;
    }
  }
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
