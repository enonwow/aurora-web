import {
  CreateBucketCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import type {
  ModuleBlobObjectPayload,
  ModuleBlobSnapshotSummary,
  ModuleBlobStoragePort,
  ModuleBlobSyncResult
} from "../../../application/ports/module-blob-storage.port";
import type { PackedModuleFile } from "../../../application/ports/packed-module-extractor.port";
import type { BlobStorageSettings } from "../../../domain/runtime-settings.types";

const DEFAULT_UPLOAD_CONCURRENCY = 8;

interface ModuleSnapshotManifestEntry {
  sha256: string;
  size: number;
}

interface ModuleSnapshotManifest {
  version: 1;
  generatedAt: string;
  moduleHash: string;
  fileCount: number;
  files: Record<string, ModuleSnapshotManifestEntry>;
}

interface FileDigest {
  key: string;
  bytes: Buffer;
  size: number;
  sha256: string;
}

interface ExistingObjectSummary {
  key: string;
  size: number;
}

@Injectable()
export class S3ModuleBlobStorageService implements ModuleBlobStoragePort {
  async replaceModuleSnapshot(
    settings: BlobStorageSettings,
    files: PackedModuleFile[],
    options?: {
      forceFull?: boolean;
    }
  ): Promise<ModuleBlobSyncResult> {
    const normalizedPrefix = normalizePrefix(settings.modulePrefix);
    if (!normalizedPrefix) {
      throw new Error(
        "blobStorage.modulePrefix cannot be empty when syncing packed module to blob storage."
      );
    }

    const client = createClient(settings);

    try {
      await ensureBucketExists(client, settings.bucket);
      const digests = buildFileDigests(files, normalizedPrefix);
      const manifest = buildManifest(digests);
      const manifestKey = buildManifestKey(normalizedPrefix);
      const previousManifest = await readManifest(
        client,
        settings.bucket,
        manifestKey
      );
      const previousModuleHash = previousManifest?.moduleHash;
      const forceFull = options?.forceFull === true;

      if (
        !forceFull &&
        previousManifest &&
        previousManifest.moduleHash === manifest.moduleHash
      ) {
        return {
          bucket: settings.bucket,
          prefix: normalizedPrefix,
          moduleHash: manifest.moduleHash,
          previousModuleHash,
          status: "noop",
          uploadedFiles: 0,
          uploadedBytes: 0,
          deletedFiles: 0,
          deletedBytes: 0,
          unchangedFiles: manifest.fileCount,
          totalFiles: manifest.fileCount
        };
      }

      const currentKeySet = new Set(digests.map((digest) => digest.key));
      const deletedKeys: string[] = [];
      const deletedSizeByKey = new Map<string, number>();
      const changedDigests: FileDigest[] = [];
      let unchangedFiles = 0;

      if (forceFull) {
        changedDigests.push(...digests);
        const previousEntries = previousManifest?.files ?? {};
        for (const [key, entry] of Object.entries(previousEntries)) {
          if (!currentKeySet.has(key)) {
            deletedKeys.push(key);
            deletedSizeByKey.set(key, entry.size);
          }
        }
      } else if (previousManifest) {
        for (const digest of digests) {
          const previousEntry = previousManifest.files[digest.key];
          if (
            previousEntry &&
            previousEntry.sha256 === digest.sha256 &&
            previousEntry.size === digest.size
          ) {
            unchangedFiles += 1;
            continue;
          }
          changedDigests.push(digest);
        }

        for (const [key, entry] of Object.entries(previousManifest.files)) {
          if (!currentKeySet.has(key)) {
            deletedKeys.push(key);
            deletedSizeByKey.set(key, entry.size);
          }
        }
      } else {
        changedDigests.push(...digests);
        const existing = await listPrefixObjects(client, settings.bucket, normalizedPrefix);
        for (const entry of existing) {
          if (!currentKeySet.has(entry.key)) {
            deletedKeys.push(entry.key);
            deletedSizeByKey.set(entry.key, entry.size);
          }
        }
      }

      let uploadedBytes = 0;
      for (let index = 0; index < changedDigests.length; index += DEFAULT_UPLOAD_CONCURRENCY) {
        const batch = changedDigests.slice(index, index + DEFAULT_UPLOAD_CONCURRENCY);
        uploadedBytes += batch.reduce((sum, item) => sum + item.size, 0);
        await Promise.all(
          batch.map((digest) =>
            client.send(
              new PutObjectCommand({
                Bucket: settings.bucket,
                Key: digest.key,
                Body: digest.bytes,
                ContentType: inferContentType(digest.key)
              })
            )
          )
        );
      }

      if (deletedKeys.length > 0) {
        await deleteObjectKeys(client, settings.bucket, deletedKeys);
      }

      const deletedBytes = deletedKeys.reduce(
        (sum, key) => sum + (deletedSizeByKey.get(key) ?? 0),
        0
      );
      const shouldPersistManifest =
        !previousManifest || forceFull || changedDigests.length > 0 || deletedKeys.length > 0;

      if (shouldPersistManifest) {
        await writeManifest(client, settings.bucket, manifestKey, manifest);
      }

      const status: "noop" | "updated" =
        changedDigests.length === 0 && deletedKeys.length === 0 && previousManifest
          ? "noop"
          : "updated";
      return {
        bucket: settings.bucket,
        prefix: normalizedPrefix,
        moduleHash: manifest.moduleHash,
        previousModuleHash,
        status,
        uploadedFiles: changedDigests.length,
        uploadedBytes,
        deletedFiles: deletedKeys.length,
        deletedBytes,
        unchangedFiles,
        totalFiles: manifest.fileCount
      };
    } finally {
      client.destroy();
    }
  }

  async listModuleSnapshot(
    settings: BlobStorageSettings,
    options?: {
      limit?: number;
      continuationToken?: string;
    }
  ): Promise<ModuleBlobSnapshotSummary> {
    const normalizedPrefix = normalizePrefix(settings.modulePrefix);
    if (!normalizedPrefix) {
      throw new Error(
        "blobStorage.modulePrefix cannot be empty when listing module blob snapshot."
      );
    }

    const client = createClient(settings);
    try {
      const limit = normalizeListLimit(options?.limit);
      const listed = await client.send(
        new ListObjectsV2Command({
          Bucket: settings.bucket,
          Prefix: normalizedPrefix,
          MaxKeys: limit,
          ContinuationToken: options?.continuationToken
        })
      );

      const objects =
        listed.Contents?.map((entry) => ({
          key: entry.Key ?? "",
          size: entry.Size ?? 0,
          lastModified: entry.LastModified?.toISOString(),
          etag: entry.ETag?.replace(/"/gu, "")
        })).filter((entry) => entry.key.length > 0) ?? [];

      const totalBytes = objects.reduce((sum, entry) => sum + entry.size, 0);
      const truncated = Boolean(listed.IsTruncated);
      const manifest = await readManifest(
        client,
        settings.bucket,
        buildManifestKey(normalizedPrefix)
      );

      return {
        bucket: settings.bucket,
        prefix: normalizedPrefix,
        moduleHash: manifest?.moduleHash,
        totalFiles: objects.length,
        totalBytes,
        objects,
        truncated,
        continuationToken: truncated ? listed.NextContinuationToken : undefined
      };
    } catch (error) {
      if (isMissingBucketError(error)) {
        return {
          bucket: settings.bucket,
          prefix: normalizedPrefix,
          totalFiles: 0,
          totalBytes: 0,
          objects: [],
          truncated: false
        };
      }
      throw error;
    } finally {
      client.destroy();
    }
  }

  async getModuleObject(
    settings: BlobStorageSettings,
    key: string
  ): Promise<ModuleBlobObjectPayload | null> {
    const normalizedKey = normalizeObjectKey(key);
    if (!normalizedKey) {
      return null;
    }

    const client = createClient(settings);
    try {
      const response = await client.send(
        new GetObjectCommand({
          Bucket: settings.bucket,
          Key: normalizedKey
        })
      );

      const bytes = await readBodyAsBuffer(response.Body);
      return {
        key: normalizedKey,
        size: bytes.length,
        contentType: response.ContentType ?? inferContentType(normalizedKey),
        etag: response.ETag?.replace(/"/gu, ""),
        lastModified: response.LastModified?.toISOString(),
        bytes
      };
    } catch (error) {
      if (isMissingBucketError(error) || isMissingObjectError(error)) {
        return null;
      }
      throw error;
    } finally {
      client.destroy();
    }
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

async function ensureBucketExists(client: S3Client, bucket: string): Promise<void> {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    return;
  } catch (error) {
    if (!isMissingBucketError(error)) {
      throw error;
    }
  }

  try {
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
  } catch (error) {
    if (!isAlreadyExistingBucketError(error)) {
      throw error;
    }
  }
}

async function listPrefixObjects(
  client: S3Client,
  bucket: string,
  prefix: string
): Promise<ExistingObjectSummary[]> {
  const objects: ExistingObjectSummary[] = [];
  let continuationToken: string | undefined;

  do {
    const listed = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken
      })
    );

    for (const entry of listed.Contents ?? []) {
      if (!entry.Key) {
        continue;
      }
      objects.push({
        key: entry.Key,
        size: entry.Size ?? 0
      });
    }

    continuationToken = listed.IsTruncated
      ? listed.NextContinuationToken
      : undefined;
  } while (continuationToken);

  return objects;
}

async function deleteObjectKeys(
  client: S3Client,
  bucket: string,
  keys: string[]
): Promise<void> {
  const BATCH_SIZE = 1000;

  for (let index = 0; index < keys.length; index += BATCH_SIZE) {
    const batch = keys.slice(index, index + BATCH_SIZE);
    await client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: batch.map((key) => ({ Key: key })),
          Quiet: true
        }
      })
    );
  }
}

function buildFileDigests(
  files: PackedModuleFile[],
  normalizedPrefix: string
): FileDigest[] {
  const seen = new Set<string>();
  const digests: FileDigest[] = [];
  for (const file of files) {
    const normalizedFileName = normalizeFileName(file.fileName);
    const key = `${normalizedPrefix}${normalizedFileName}`;
    if (seen.has(key)) {
      throw new Error(
        `Duplicate module file name detected while syncing snapshot: ${normalizedFileName}`
      );
    }
    seen.add(key);
    const bytes = Buffer.from(file.bytes);
    digests.push({
      key,
      bytes,
      size: bytes.length,
      sha256: hashBytes(bytes)
    });
  }

  digests.sort((left, right) => left.key.localeCompare(right.key));
  return digests;
}

function buildManifest(digests: FileDigest[]): ModuleSnapshotManifest {
  const files: Record<string, ModuleSnapshotManifestEntry> = {};
  for (const digest of digests) {
    files[digest.key] = {
      sha256: digest.sha256,
      size: digest.size
    };
  }
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    moduleHash: hashManifestFiles(files),
    fileCount: digests.length,
    files
  };
}

function hashManifestFiles(files: Record<string, ModuleSnapshotManifestEntry>): string {
  const keys = Object.keys(files).sort((left, right) => left.localeCompare(right));
  const hash = createHash("sha256");
  for (const key of keys) {
    const entry = files[key];
    hash.update(key);
    hash.update("\n");
    hash.update(entry.sha256);
    hash.update("\n");
    hash.update(String(entry.size));
    hash.update("\n");
  }
  return hash.digest("hex");
}

function hashBytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function normalizeFileName(value: string): string {
  return value.replace(/^[/\\]+/u, "").replace(/\\/gu, "/");
}

function buildManifestKey(prefix: string): string {
  const encoded = Buffer.from(prefix, "utf-8")
    .toString("base64")
    .replace(/\+/gu, "-")
    .replace(/\//gu, "_")
    .replace(/=+$/gu, "");
  return `__aurora/meta/module-snapshots/${encoded}.json`;
}

async function readManifest(
  client: S3Client,
  bucket: string,
  key: string
): Promise<ModuleSnapshotManifest | null> {
  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key
      })
    );
    const raw = await readBodyAsString(response.Body);
    if (!raw || raw.trim().length === 0) {
      return null;
    }
    const parsed = JSON.parse(raw) as unknown;
    return parseManifest(parsed);
  } catch (error) {
    if (isMissingObjectError(error) || isMissingBucketError(error)) {
      return null;
    }
    throw error;
  }
}

function parseManifest(value: unknown): ModuleSnapshotManifest | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as {
    version?: number;
    generatedAt?: string;
    moduleHash?: string;
    fileCount?: number;
    files?: unknown;
  };
  if (
    record.version !== 1 ||
    typeof record.generatedAt !== "string" ||
    typeof record.moduleHash !== "string" ||
    typeof record.fileCount !== "number" ||
    !record.files ||
    typeof record.files !== "object"
  ) {
    return null;
  }

  const files: Record<string, ModuleSnapshotManifestEntry> = {};
  for (const [key, entry] of Object.entries(record.files as Record<string, unknown>)) {
    if (!entry || typeof entry !== "object") {
      return null;
    }
    const typed = entry as { sha256?: string; size?: number };
    if (typeof typed.sha256 !== "string" || typeof typed.size !== "number") {
      return null;
    }
    files[key] = {
      sha256: typed.sha256,
      size: typed.size
    };
  }

  return {
    version: 1,
    generatedAt: record.generatedAt,
    moduleHash: record.moduleHash,
    fileCount: record.fileCount,
    files
  };
}

async function writeManifest(
  client: S3Client,
  bucket: string,
  key: string,
  manifest: ModuleSnapshotManifest
): Promise<void> {
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: JSON.stringify(manifest),
      ContentType: "application/json"
    })
  );
}

async function readBodyAsString(body: unknown): Promise<string> {
  if (typeof body === "string") {
    return body;
  }
  if (body instanceof Uint8Array) {
    return Buffer.from(body).toString("utf-8");
  }
  if (body && typeof body === "object") {
    const withTransform = body as { transformToString?: () => Promise<string> };
    if (typeof withTransform.transformToString === "function") {
      return withTransform.transformToString();
    }
  }
  throw new Error("Unable to read S3 object body as string.");
}

async function readBodyAsBuffer(body: unknown): Promise<Buffer> {
  if (body instanceof Uint8Array) {
    return Buffer.from(body);
  }

  if (typeof body === "string") {
    return Buffer.from(body, "utf-8");
  }

  if (body && typeof body === "object") {
    const withTransformBytes = body as {
      transformToByteArray?: () => Promise<Uint8Array>;
      transformToString?: () => Promise<string>;
      on?: (event: string, listener: (...args: unknown[]) => void) => void;
    };

    if (typeof withTransformBytes.transformToByteArray === "function") {
      const bytes = await withTransformBytes.transformToByteArray();
      return Buffer.from(bytes);
    }

    if (typeof withTransformBytes.transformToString === "function") {
      const value = await withTransformBytes.transformToString();
      return Buffer.from(value, "utf-8");
    }

    if (typeof withTransformBytes.on === "function") {
      const chunks: Buffer[] = [];
      await new Promise<void>((resolve, reject) => {
        withTransformBytes.on!("data", (chunk: unknown) => {
          if (chunk instanceof Buffer) {
            chunks.push(chunk);
            return;
          }
          if (chunk instanceof Uint8Array) {
            chunks.push(Buffer.from(chunk));
            return;
          }
          chunks.push(Buffer.from(String(chunk), "utf-8"));
        });
        withTransformBytes.on!("error", reject);
        withTransformBytes.on!("end", () => resolve());
      });
      return Buffer.concat(chunks);
    }
  }

  throw new Error("Unable to read S3 object body as bytes.");
}

function normalizePrefix(value: string): string {
  const trimmed = value.trim().replace(/^\/+/, "").replace(/\/+$/, "");
  if (!trimmed) {
    return "";
  }
  return `${trimmed}/`;
}

function normalizeObjectKey(value: string): string {
  return value.trim().replace(/^\/+/u, "");
}

function isMissingBucketError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const withName = error as { name?: string; $metadata?: { httpStatusCode?: number } };
  return (
    withName.name === "NotFound" ||
    withName.name === "NoSuchBucket" ||
    withName.$metadata?.httpStatusCode === 404
  );
}

function isAlreadyExistingBucketError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const withName = error as { name?: string };
  return (
    withName.name === "BucketAlreadyOwnedByYou" ||
    withName.name === "BucketAlreadyExists"
  );
}

function isMissingObjectError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const withName = error as { name?: string; $metadata?: { httpStatusCode?: number } };
  return withName.name === "NoSuchKey" || withName.$metadata?.httpStatusCode === 404;
}

function inferContentType(fileName: string): string {
  const extension = fileName.split(".").pop()?.toLowerCase();
  switch (extension) {
    case "txt":
    case "ini":
    case "nss":
    case "2da":
    case "txi":
    case "mtr":
      return "text/plain; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}

function normalizeListLimit(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 200;
  }
  const rounded = Math.trunc(value);
  return Math.min(Math.max(rounded, 1), 1000);
}
