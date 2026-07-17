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
    expect(result.sourceDelta).toBeDefined();
    expect(result.sourceDelta?.module.uploadedFiles).toBe(2);
    expect(result.sourceDelta?.hak.uploadedFiles).toBe(0);
    expect(result.sourceDelta?.vanilla.uploadedFiles).toBe(0);
    expect(result.sourceDelta?.index.uploadedFiles).toBe(0);
    expect(result.moduleHash).toEqual(expect.any(String));
    expect(putCalls.some((key) => key.includes("__aurora/meta/module-snapshots/"))).toBe(
      true
    );
    const manifestKey = putCalls.find((key) =>
      key.includes("__aurora/meta/module-snapshots/")
    );
    expect(manifestKey).toBeDefined();
    const manifestRaw = store.get(settings.bucket)?.get(manifestKey!)?.body.toString("utf-8");
    expect(manifestRaw).toBeDefined();
    const manifest = JSON.parse(manifestRaw!) as {
      sourceTotals?: Record<string, { files: number; bytes: number }>;
      sourceDelta?: Record<string, { uploadedFiles: number }>;
    };
    expect(manifest.sourceTotals?.module?.files).toBe(2);
    expect(manifest.sourceDelta?.module?.uploadedFiles).toBe(2);

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
    expect(result.sourceDelta).toBeDefined();
    expect(result.sourceDelta?.module.unchangedFiles).toBe(2);
    expect(result.sourceDelta?.module.unchangedBytes).toBe(
      Buffer.byteLength("area-v1", "utf-8") + Buffer.byteLength("texture-v1", "utf-8")
    );
    expect(putCalls.length).toBe(previousPutCalls);
  });

  it("returns noop with unchanged classification for module, hak, vanilla and index", async () => {
    await service.replaceModuleSnapshot(settings, [
      file("areas/test.are", "module-v1"),
      file("__aurora/sources/hak/lc_core/h_fire.dds", "hak-v1"),
      file("__aurora/sources/vanilla/textures/v_stone.tga", "vanilla-v1"),
      file("__aurora/meta/texture-index.v1.json", "{\"version\":1}")
    ]);

    const result = await service.replaceModuleSnapshot(settings, [
      file("areas/test.are", "module-v1"),
      file("__aurora/sources/hak/lc_core/h_fire.dds", "hak-v1"),
      file("__aurora/sources/vanilla/textures/v_stone.tga", "vanilla-v1"),
      file("__aurora/meta/texture-index.v1.json", "{\"version\":1}")
    ]);

    expect(result.status).toBe("noop");
    expect(result.sourceDelta?.module.unchangedFiles).toBe(1);
    expect(result.sourceDelta?.hak.unchangedFiles).toBe(1);
    expect(result.sourceDelta?.vanilla.unchangedFiles).toBe(1);
    expect(result.sourceDelta?.index.unchangedFiles).toBe(1);
    expect(result.sourceDelta?.module.unchangedBytes).toBe(byteLength("module-v1"));
    expect(result.sourceDelta?.hak.unchangedBytes).toBe(byteLength("hak-v1"));
    expect(result.sourceDelta?.vanilla.unchangedBytes).toBe(byteLength("vanilla-v1"));
    expect(result.sourceDelta?.index.unchangedBytes).toBe(byteLength("{\"version\":1}"));
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
    expect(result.sourceDelta).toBeDefined();
    expect(result.sourceDelta?.module.uploadedFiles).toBe(2);
    expect(result.sourceDelta?.module.deletedFiles).toBe(1);
    expect(result.sourceDelta?.module.unchangedFiles).toBe(1);
  });

  it("keeps top-level upload/delete counters equal to sourceDelta sums", async () => {
    await service.replaceModuleSnapshot(settings, [
      file("areas/a.are", "module-a-v1"),
      file("areas/b.are", "module-b-v1"),
      file("__aurora/sources/hak/lc_core/h_01.dds", "hak-1-v1"),
      file("__aurora/sources/hak/lc_core/h_02.dds", "hak-2-v1"),
      file("__aurora/sources/vanilla/textures/v_01.tga", "vanilla-1-v1"),
      file("__aurora/meta/texture-index.v1.json", "{\"version\":1}")
    ]);

    const result = await service.replaceModuleSnapshot(settings, [
      file("areas/a.are", "module-a-v1"),
      file("areas/b.are", "module-b-v2"),
      file("__aurora/sources/hak/lc_core/h_01.dds", "hak-1-v2"),
      file("__aurora/sources/vanilla/textures/v_02.tga", "vanilla-2-v1"),
      file("__aurora/meta/texture-index.v1.json", "{\"version\":2}")
    ]);

    expect(result.sourceDelta).toBeDefined();
    const buckets = Object.values(result.sourceDelta!);

    const uploadedFilesFromSources = buckets.reduce(
      (sum, item) => sum + item.uploadedFiles,
      0
    );
    const uploadedBytesFromSources = buckets.reduce(
      (sum, item) => sum + item.uploadedBytes,
      0
    );
    const deletedFilesFromSources = buckets.reduce(
      (sum, item) => sum + item.deletedFiles,
      0
    );
    const deletedBytesFromSources = buckets.reduce(
      (sum, item) => sum + item.deletedBytes,
      0
    );

    expect(result.uploadedFiles).toBe(uploadedFilesFromSources);
    expect(result.uploadedBytes).toBe(uploadedBytesFromSources);
    expect(result.deletedFiles).toBe(deletedFilesFromSources);
    expect(result.deletedBytes).toBe(deletedBytesFromSources);
  });

  it("classifies hak, vanilla and index namespaces in per-source delta", async () => {
    await service.replaceModuleSnapshot(settings, [
      file("__aurora/sources/hak/lc_core/h_fire.dds", "hak-v1"),
      file("__aurora/sources/vanilla/textures/v_stone.tga", "vanilla-v1"),
      file("__aurora/meta/texture-index.v1.json", "{\"version\":1}"),
      file("areas/test.are", "area-v1")
    ]);

    const result = await service.replaceModuleSnapshot(settings, [
      file("__aurora/sources/hak/lc_core/h_fire.dds", "hak-v2"),
      file("__aurora/meta/texture-index.v1.json", "{\"version\":2}"),
      file("areas/test.are", "area-v1")
    ]);

    expect(result.sourceDelta).toBeDefined();
    expect(result.sourceDelta?.hak.uploadedFiles).toBe(1);
    expect(result.sourceDelta?.hak.deletedFiles).toBe(0);
    expect(result.sourceDelta?.hak.unchangedFiles).toBe(0);
    expect(result.sourceDelta?.vanilla.deletedFiles).toBe(1);
    expect(result.sourceDelta?.index.uploadedFiles).toBe(1);
    expect(result.sourceDelta?.module.unchangedFiles).toBe(1);
  });

  it("stores sourceTotals with files and bytes for non-module namespaces", async () => {
    await service.replaceModuleSnapshot(settings, [
      file("areas/test.are", "module-v1"),
      file("__aurora/sources/hak/lc_core/h_fire.dds", "hak-v1"),
      file("__aurora/sources/hak/lc_core/h_ice.dds", "hak-v2"),
      file("__aurora/sources/vanilla/textures/v_stone.tga", "vanilla-v1"),
      file("__aurora/meta/texture-index.v1.json", "{\"version\":1}")
    ]);

    const manifestKey = putCalls
      .filter((key) => key.includes("__aurora/meta/module-snapshots/"))
      .at(-1);
    expect(manifestKey).toBeDefined();

    const manifestRaw = store.get(settings.bucket)?.get(manifestKey!)?.body.toString("utf-8");
    expect(manifestRaw).toBeDefined();
    const manifest = JSON.parse(manifestRaw!) as {
      sourceTotals?: Record<string, { files: number; bytes: number }>;
    };

    expect(manifest.sourceTotals?.hak?.files).toBe(2);
    expect(manifest.sourceTotals?.hak?.bytes).toBe(
      byteLength("hak-v1") + byteLength("hak-v2")
    );
    expect(manifest.sourceTotals?.vanilla?.files).toBe(1);
    expect(manifest.sourceTotals?.vanilla?.bytes).toBe(byteLength("vanilla-v1"));
    expect(manifest.sourceTotals?.index?.files).toBe(1);
    expect(manifest.sourceTotals?.index?.bytes).toBe(byteLength("{\"version\":1}"));
  });

  it("keeps sync path operational when manifest contains negative file size", async () => {
    await service.replaceModuleSnapshot(settings, [file("areas/test.are", "area-v1")]);

    const manifestKey = putCalls
      .filter((key) => key.includes("__aurora/meta/module-snapshots/"))
      .at(-1);
    expect(manifestKey).toBeDefined();

    const bucketStore = store.get(settings.bucket);
    expect(bucketStore).toBeDefined();
    const manifestEntry = bucketStore!.get(manifestKey!);
    expect(manifestEntry).toBeDefined();

    const manifest = JSON.parse(manifestEntry!.body.toString("utf-8")) as {
      files: Record<string, { sha256: string; size: number }>;
    };
    const firstKey = Object.keys(manifest.files)[0];
    manifest.files[firstKey].size = -42;

    bucketStore!.set(manifestKey!, {
      body: Buffer.from(JSON.stringify(manifest), "utf-8"),
      lastModified: new Date("2026-05-24T10:10:00.000Z"),
      etag: "\"neg-size\""
    });

    const result = await service.replaceModuleSnapshot(settings, []);

    expect(result.status).toBe("updated");
    expect(result.deletedFiles).toBe(1);
    expect(result.deletedBytes).toBe(-42);
  });

  it("returns object payload for existing module object key", async () => {
    await service.replaceModuleSnapshot(settings, [file("models/p_gate.mdl", "model-v1")]);

    const object = await service.getModuleObject(settings, "modules/current/models/p_gate.mdl");

    expect(object).not.toBeNull();
    expect(object?.key).toBe("modules/current/models/p_gate.mdl");
    expect(object?.bytes.toString("utf-8")).toBe("model-v1");
    expect(object?.contentType).toBe("application/octet-stream");
  });

  it("serves derived glb assets with a GLTF binary content type", async () => {
    await service.replaceModuleSnapshot(settings, [
      file("__aurora/derived/models/p_gate.glb", "glb-v1")
    ]);

    const object = await service.getModuleObject(
      settings,
      "modules/current/__aurora/derived/models/p_gate.glb"
    );

    expect(object?.contentType).toBe("model/gltf-binary");
  });

  it("serves module texture assets with image content types", async () => {
    await service.replaceModuleSnapshot(settings, [
      file("textures/p_gate.dds", "dds-v1"),
      file("textures/p_gate.tga", "tga-v1"),
      file("textures/p_gate.png", "png-v1"),
      file("textures/p_gate.webp", "webp-v1")
    ]);

    await expect(
      service.getModuleObject(settings, "modules/current/textures/p_gate.dds")
    ).resolves.toMatchObject({ contentType: "image/vnd-ms.dds" });
    await expect(
      service.getModuleObject(settings, "modules/current/textures/p_gate.tga")
    ).resolves.toMatchObject({ contentType: "image/x-tga" });
    await expect(
      service.getModuleObject(settings, "modules/current/textures/p_gate.png")
    ).resolves.toMatchObject({ contentType: "image/png" });
    await expect(
      service.getModuleObject(settings, "modules/current/textures/p_gate.webp")
    ).resolves.toMatchObject({ contentType: "image/webp" });
  });

  it("returns null for missing module object key", async () => {
    const object = await service.getModuleObject(settings, "modules/current/missing.file");
    expect(object).toBeNull();
  });

  it("throws when blob settings signature changes during service lifetime", async () => {
    await service.listModuleSnapshot(settings, { limit: 10 });

    const changedSettings: BlobStorageSettings = {
      ...settings,
      endpoint: "http://localhost:9444"
    };

    await expect(service.listModuleSnapshot(changedSettings, { limit: 10 })).rejects.toThrow(
      "blobStorage settings changed during application lifetime"
    );
  });
});

function file(fileName: string, content: string) {
  return {
    fileName,
    resourceType: 0,
    bytes: Buffer.from(content, "utf-8")
  };
}

function byteLength(value: string): number {
  return Buffer.byteLength(value, "utf-8");
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
