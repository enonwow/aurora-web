import {
  CreateBucketCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { S3ModuleBlobStorageService } from "../../src/modules/runtime-settings/adapters/outbound/blob/s3-module-blob-storage.service";
import type { BlobStorageSettings } from "../../src/modules/runtime-settings/domain/runtime-settings.types";

interface MockObjectEntry {
  body: Buffer;
  lastModified: Date;
  etag: string;
}

describe("S3ModuleBlobStorageService", () => {
  const settings: BlobStorageSettings = {
    endpoint: "http://localhost:8333",
    region: "us-east-1",
    bucket: "aurora-module-assets",
    modulePrefix: "modules/current",
    accessKeyId: "seaweedfs",
    secretAccessKey: "seaweedfs-secret",
    forcePathStyle: true
  };

  let service: S3ModuleBlobStorageService;
  let sendSpy: jest.SpyInstance;
  let store: Map<string, Map<string, MockObjectEntry>>;
  let putCalls: string[];

  beforeEach(() => {
    service = new S3ModuleBlobStorageService();
    store = new Map();
    putCalls = [];

    sendSpy = jest
      .spyOn(S3Client.prototype, "send")
      .mockImplementation(async (command: unknown) => {
        if (command instanceof HeadBucketCommand) {
          const bucket = command.input.Bucket!;
          if (store.has(bucket)) {
            return {};
          }
          throw missingBucketError();
        }

        if (command instanceof CreateBucketCommand) {
          const bucket = command.input.Bucket!;
          if (!store.has(bucket)) {
            store.set(bucket, new Map());
          }
          return {};
        }

        if (command instanceof PutObjectCommand) {
          const bucket = command.input.Bucket!;
          const key = command.input.Key!;
          const bucketStore = ensureBucket(store, bucket);
          const body = toBuffer(command.input.Body);
          bucketStore.set(key, {
            body,
            lastModified: new Date("2026-05-24T10:00:00.000Z"),
            etag: `"${body.length.toString(16)}"`
          });
          putCalls.push(key);
          return {};
        }

        if (command instanceof GetObjectCommand) {
          const bucket = command.input.Bucket!;
          const key = command.input.Key!;
          const entry = store.get(bucket)?.get(key);
          if (!entry) {
            throw missingObjectError();
          }
          return {
            Body: {
              transformToString: async () => entry.body.toString("utf-8")
            }
          };
        }

        if (command instanceof ListObjectsV2Command) {
          const bucket = command.input.Bucket!;
          const prefix = command.input.Prefix ?? "";
          const all =
            [...(store.get(bucket)?.entries() ?? [])]
              .filter(([key]) => key.startsWith(prefix))
              .sort(([left], [right]) => left.localeCompare(right));
          const maxKeys = command.input.MaxKeys ?? all.length;
          const selected = all.slice(0, maxKeys);
          return {
            Contents: selected.map(([key, value]) => ({
              Key: key,
              Size: value.body.length,
              LastModified: value.lastModified,
              ETag: value.etag
            })),
            IsTruncated: selected.length < all.length,
            NextContinuationToken: undefined
          };
        }

        if (command instanceof DeleteObjectsCommand) {
          const bucket = command.input.Bucket!;
          const bucketStore = ensureBucket(store, bucket);
          const objects = command.input.Delete?.Objects ?? [];
          for (const objectEntry of objects) {
            if (objectEntry.Key) {
              bucketStore.delete(objectEntry.Key);
            }
          }
          return {};
        }

        throw new Error("Unexpected S3 command in test.");
      });
  });

  afterEach(() => {
    sendSpy.mockRestore();
  });

  it("creates first snapshot and stores manifest hash", async () => {
    const result = await service.replaceModuleSnapshot(settings, [
      file("areas/test.are", "area-v1"),
      file("textures/t_walls.dds", "texture-v1")
    ]);

    expect(result.status).toBe("updated");
    expect(result.uploadedFiles).toBe(2);
    expect(result.deletedFiles).toBe(0);
    expect(result.unchangedFiles).toBe(0);
    expect(result.totalFiles).toBe(2);
    expect(result.moduleHash).toEqual(expect.any(String));
    expect(putCalls.some((key) => key.includes("__aurora/meta/module-snapshots/"))).toBe(
      true
    );

    const summary = await service.listModuleSnapshot(settings, { limit: 200 });
    expect(summary.totalFiles).toBe(2);
    expect(summary.moduleHash).toBe(result.moduleHash);
  });

  it("returns noop when hashes are unchanged", async () => {
    await service.replaceModuleSnapshot(settings, [
      file("areas/test.are", "area-v1"),
      file("textures/t_walls.dds", "texture-v1")
    ]);
    const previousPutCalls = putCalls.length;

    const result = await service.replaceModuleSnapshot(settings, [
      file("areas/test.are", "area-v1"),
      file("textures/t_walls.dds", "texture-v1")
    ]);

    expect(result.status).toBe("noop");
    expect(result.uploadedFiles).toBe(0);
    expect(result.deletedFiles).toBe(0);
    expect(result.unchangedFiles).toBe(2);
    expect(putCalls.length).toBe(previousPutCalls);
  });

  it("uploads only changed files and deletes removed files", async () => {
    await service.replaceModuleSnapshot(settings, [
      file("areas/test.are", "area-v1"),
      file("placeables/p1.utp", "p1-v1"),
      file("textures/t1.dds", "t1-v1")
    ]);

    const result = await service.replaceModuleSnapshot(settings, [
      file("areas/test.are", "area-v1"),
      file("placeables/p1.utp", "p1-v2"),
      file("textures/t2.dds", "t2-v1")
    ]);

    expect(result.status).toBe("updated");
    expect(result.uploadedFiles).toBe(2);
    expect(result.deletedFiles).toBe(1);
    expect(result.unchangedFiles).toBe(1);
    expect(result.totalFiles).toBe(3);
  });

  it("returns object payload for existing module object key", async () => {
    await service.replaceModuleSnapshot(settings, [file("models/p_gate.mdl", "model-v1")]);

    const object = await service.getModuleObject(settings, "modules/current/models/p_gate.mdl");

    expect(object).not.toBeNull();
    expect(object?.key).toBe("modules/current/models/p_gate.mdl");
    expect(object?.bytes.toString("utf-8")).toBe("model-v1");
    expect(object?.contentType).toBe("application/octet-stream");
  });

  it("returns null for missing module object key", async () => {
    const object = await service.getModuleObject(settings, "modules/current/missing.file");
    expect(object).toBeNull();
  });
});

function file(fileName: string, content: string) {
  return {
    fileName,
    resourceType: 0,
    bytes: Buffer.from(content, "utf-8")
  };
}

function toBuffer(value: unknown): Buffer {
  if (Buffer.isBuffer(value)) {
    return value;
  }
  if (value instanceof Uint8Array) {
    return Buffer.from(value);
  }
  if (typeof value === "string") {
    return Buffer.from(value, "utf-8");
  }
  throw new Error("Unsupported mock body type.");
}

function ensureBucket(
  allBuckets: Map<string, Map<string, MockObjectEntry>>,
  bucket: string
): Map<string, MockObjectEntry> {
  const existing = allBuckets.get(bucket);
  if (existing) {
    return existing;
  }
  const created = new Map<string, MockObjectEntry>();
  allBuckets.set(bucket, created);
  return created;
}

function missingBucketError() {
  return {
    name: "NotFound",
    $metadata: {
      httpStatusCode: 404
    }
  };
}

function missingObjectError() {
  return {
    name: "NoSuchKey",
    $metadata: {
      httpStatusCode: 404
    }
  };
}
