import { S3Client } from "@aws-sdk/client-s3";
import { PassThrough } from "node:stream";
import type { RuntimeSettingsRepositoryPort } from "../../src/modules/runtime-settings/application/ports/runtime-settings-repository.port";
import { S3AreaProcessingCacheRepository } from "../../src/modules/areas/adapters/outbound/blob/s3-area-processing-cache.repository";
import { S3PlaceableProcessingCacheRepository } from "../../src/modules/catalog/adapters/outbound/blob/s3-placeable-processing-cache.repository";
import { S3SoundProcessingCacheRepository } from "../../src/modules/sounds/adapters/outbound/blob/s3-sound-processing-cache.repository";
import { S3TileProcessingCacheRepository } from "../../src/modules/tiles/adapters/outbound/blob/s3-tile-processing-cache.repository";

type CacheRepository = {
  get: (key: string) => Promise<{ key: string; value: unknown; storedAt: string; hits: number } | null>;
  set: (key: string, value: unknown) => Promise<{ key: string; value: unknown; storedAt: string; hits: number }>;
  onModuleDestroy: () => void;
};

type RepositoryCtor = new (
  runtimeSettingsRepository: RuntimeSettingsRepositoryPort
) => CacheRepository;

const CASES: Array<{ name: string; suffix: string; Ctor: RepositoryCtor }> = [
  {
    name: "placeable",
    suffix: "cache/placeables",
    Ctor: S3PlaceableProcessingCacheRepository as unknown as RepositoryCtor
  },
  {
    name: "area",
    suffix: "cache/areas",
    Ctor: S3AreaProcessingCacheRepository as unknown as RepositoryCtor
  },
  {
    name: "sound",
    suffix: "cache/sounds",
    Ctor: S3SoundProcessingCacheRepository as unknown as RepositoryCtor
  },
  {
    name: "tile",
    suffix: "cache/tiles",
    Ctor: S3TileProcessingCacheRepository as unknown as RepositoryCtor
  }
];

describe.each(CASES)("S3 processing cache repository (%s)", ({ suffix, Ctor }) => {
  let sendSpy: jest.SpyInstance;
  let destroySpy: jest.SpyInstance;

  beforeEach(() => {
    sendSpy = jest.spyOn(S3Client.prototype as any, "send");
    destroySpy = jest.spyOn(S3Client.prototype as any, "destroy").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function createRuntimeSettingsRepository(
    modulePrefix: string | string[] = "modules/current"
  ): jest.Mocked<RuntimeSettingsRepositoryPort> {
    const prefixes = Array.isArray(modulePrefix) ? modulePrefix : [modulePrefix];
    return {
      get: jest.fn().mockImplementation(async () => ({
        revision: 1,
        updatedAt: "2026-05-25T00:00:00.000Z",
        updatedBy: "test",
        paths: {
          vanillaDataPath: "",
          hakDirectoryPath: "",
          moduleDecompiledPath: "",
          modulePackedPath: "",
          tlkBasePath: "",
          tlkCustomPath: ""
        },
        blobStorage: {
          endpoint: "http://seaweedfs:8333",
          region: "us-east-1",
          bucket: "aurora-module-assets",
          modulePrefix: prefixes.shift() ?? "modules/current",
          accessKeyId: "seaweedfs",
          secretAccessKey: "secret",
          forcePathStyle: true
        },
        telemetryDebugMode: "off",
        hakProfiles: {},
        sources: {
          placeable: {
            includeModuleTemp0: true,
            includeModulePacked: false,
            includeHaks: false,
            includeVanilla: false,
            hakProfileId: "",
            hakPriorityList: []
          },
          tile: {
            includeModuleTemp0: true,
            includeModulePacked: false,
            includeHaks: false,
            includeVanilla: false,
            hakProfileId: "",
            hakPriorityList: []
          },
          area: {
            includeModuleTemp0: true,
            includeModulePacked: false,
            includeHaks: false,
            includeVanilla: false,
            hakProfileId: "",
            hakPriorityList: []
          },
          sound: {
            includeModuleTemp0: true,
            includeModulePacked: false,
            includeHaks: false,
            includeVanilla: false,
            hakProfileId: "",
            hakPriorityList: []
          }
        },
        benchmarkCandidates: {
          placeableHeavyNoVfx: {
            resref: "",
            metrics: { triangles: 0, meshes: 0, emitters: 0 },
            context: { source: "test" }
          },
          placeableHeavyVfx: {
            resref: "",
            metrics: { triangles: 0, meshes: 0, emitters: 0 },
            context: { source: "test" }
          },
          placeableVfxPlcAlternative: {
            resref: "",
            metrics: { triangles: 0, meshes: 0, emitters: 0 },
            context: { source: "test" }
          },
          doorHeavyInstance: {
            resref: "",
            metrics: { triangles: 0, meshes: 0, emitters: 0 },
            context: { source: "test" }
          },
          doorHeavySingleMesh: {
            resref: "",
            metrics: { triangles: 0, meshes: 0, emitters: 0 },
            context: { source: "test" }
          }
        }
      })),
      save: jest.fn()
    };
  }

  it("stores payload in S3 with normalized key", async () => {
    sendSpy.mockResolvedValue({} as never);
    const repository = new Ctor(createRuntimeSettingsRepository(" /modules/current/ "));

    const entry = await repository.set("abc123", { ok: true });

    expect(entry.key).toBe("abc123");
    expect(entry.hits).toBe(0);
    expect(entry.storedAt).toEqual(expect.any(String));
    expect(sendSpy).toHaveBeenCalledTimes(1);

    const putCommand = sendSpy.mock.calls[0][0] as { input: Record<string, unknown> };
    expect(putCommand.input).toMatchObject({
      Bucket: "aurora-module-assets",
      Key: `modules/current/${suffix}/abc123.json`,
      ContentType: "application/json; charset=utf-8"
    });
  });

  it("reads payload from S3 and increments hits", async () => {
    sendSpy.mockResolvedValue({
      Body: {
        transformToString: async () =>
          JSON.stringify({
            key: "cache-key",
            value: { from: "blob" },
            storedAt: "2026-05-25T12:00:00.000Z",
            hits: 2
          })
      }
    } as never);

    const repository = new Ctor(createRuntimeSettingsRepository());
    const result = await repository.get("cache-key");

    expect(result).toEqual({
      key: "cache-key",
      value: { from: "blob" },
      storedAt: "2026-05-25T12:00:00.000Z",
      hits: 3
    });
  });

  it("supports string, binary and stream response bodies", async () => {
    sendSpy
      .mockResolvedValueOnce({
        Body: JSON.stringify({
          key: "string-body",
          value: { ok: 1 },
          storedAt: "2026-05-25T12:00:00.000Z",
          hits: 0
        })
      } as never)
      .mockResolvedValueOnce({
        Body: new Uint8Array(
          Buffer.from(
            JSON.stringify({
              key: "binary-body",
              value: { ok: 2 },
              storedAt: "2026-05-25T12:00:00.000Z",
              hits: 1
            })
          )
        )
      } as never)
      .mockResolvedValueOnce({
        Body: (() => {
          const stream = new PassThrough();
          setImmediate(() => {
            stream.write(
              JSON.stringify({
                key: "stream-body",
                value: { ok: 3 },
                storedAt: "2026-05-25T12:00:00.000Z",
                hits: 2
              })
            );
            stream.end();
          });
          return stream;
        })()
      } as never);

    const repository = new Ctor(createRuntimeSettingsRepository());

    await expect(repository.get("a")).resolves.toMatchObject({ key: "string-body", hits: 1 });
    await expect(repository.get("b")).resolves.toMatchObject({ key: "binary-body", hits: 2 });
    await expect(repository.get("c")).resolves.toMatchObject({ key: "stream-body", hits: 3 });
  });

  it("returns null for missing object and rethrows other errors", async () => {
    sendSpy
      .mockRejectedValueOnce({
        name: "NoSuchKey"
      })
      .mockRejectedValueOnce({
        $metadata: { httpStatusCode: 404 }
      })
      .mockRejectedValueOnce(new Error("boom"));

    const repository = new Ctor(createRuntimeSettingsRepository());

    await expect(repository.get("missing-a")).resolves.toBeNull();
    await expect(repository.get("missing-b")).resolves.toBeNull();
    await expect(repository.get("missing-c")).rejects.toThrow("boom");
  });

  it("throws for unsupported body type", async () => {
    sendSpy.mockResolvedValue({
      Body: { unsupported: true }
    } as never);

    const repository = new Ctor(createRuntimeSettingsRepository());
    await expect(repository.get("unsupported")).rejects.toThrow(
      "Unsupported S3 object body type."
    );
  });

  it("recreates S3 client when blob settings signature changes and destroys on module destroy", async () => {
    sendSpy.mockResolvedValue({} as never);
    const runtimeSettings = createRuntimeSettingsRepository([
      "modules/current",
      "modules/changed"
    ]);
    const repository = new Ctor(runtimeSettings);

    await repository.set("first", { ok: true });
    await repository.set("second", { ok: true });

    expect(destroySpy).toHaveBeenCalledTimes(1);

    repository.onModuleDestroy();
    expect(destroySpy).toHaveBeenCalledTimes(2);
  });
});
