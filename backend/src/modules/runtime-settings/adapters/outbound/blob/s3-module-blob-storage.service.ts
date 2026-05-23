import {
  CreateBucketCommand,
  DeleteObjectsCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { Injectable } from "@nestjs/common";
import type {
  ModuleBlobStoragePort,
  ModuleBlobSyncResult
} from "../../../application/ports/module-blob-storage.port";
import type { PackedModuleFile } from "../../../application/ports/packed-module-extractor.port";
import type { BlobStorageSettings } from "../../../domain/runtime-settings.types";

const DEFAULT_UPLOAD_CONCURRENCY = 8;

@Injectable()
export class S3ModuleBlobStorageService implements ModuleBlobStoragePort {
  async replaceModuleSnapshot(
    settings: BlobStorageSettings,
    files: PackedModuleFile[]
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
      await clearPrefix(client, settings.bucket, normalizedPrefix);

      let uploadedBytes = 0;

      for (let index = 0; index < files.length; index += DEFAULT_UPLOAD_CONCURRENCY) {
        const batch = files.slice(index, index + DEFAULT_UPLOAD_CONCURRENCY);
        await Promise.all(
          batch.map(async (file) => {
            uploadedBytes += file.bytes.length;
            const key = `${normalizedPrefix}${file.fileName}`;
            await client.send(
              new PutObjectCommand({
                Bucket: settings.bucket,
                Key: key,
                Body: file.bytes,
                ContentType: inferContentType(file.fileName)
              })
            );
          })
        );
      }

      return {
        bucket: settings.bucket,
        prefix: normalizedPrefix,
        uploadedFiles: files.length,
        uploadedBytes
      };
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

async function clearPrefix(
  client: S3Client,
  bucket: string,
  prefix: string
): Promise<void> {
  let continuationToken: string | undefined;

  do {
    const listed = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken
      })
    );

    const keys =
      listed.Contents?.map((entry) => entry.Key).filter(
        (key): key is string => typeof key === "string" && key.length > 0
      ) ?? [];

    if (keys.length > 0) {
      await client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: {
            Objects: keys.map((key) => ({ Key: key })),
            Quiet: true
          }
        })
      );
    }

    continuationToken = listed.IsTruncated
      ? listed.NextContinuationToken
      : undefined;
  } while (continuationToken);
}

function normalizePrefix(value: string): string {
  const trimmed = value.trim().replace(/^\/+/, "").replace(/\/+$/, "");
  if (!trimmed) {
    return "";
  }
  return `${trimmed}/`;
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
