import { CatalogApplicationService } from "../../src/modules/catalog/application/catalog.application.service";
import type { CommittedModuleSnapshotReaderPort } from "../../src/modules/module-snapshots/application/ports/committed-module-snapshot-reader.port";
import type { ModuleBlobStoragePort } from "../../src/modules/runtime-settings/application/ports/module-blob-storage.port";

describe("CatalogApplicationService committed module reads", () => {
  it("lists resources from one captured committed revision and never from mutable logical keys", async () => {
    const rawStorage = {
      listModuleSnapshot: jest.fn(async () => {
        throw new Error("mutable listing must not be used");
      }),
      getModuleObject: jest.fn(async () => {
        throw new Error("mutable object read must not be used");
      }),
    } as unknown as ModuleBlobStoragePort;
    const captured = {
      moduleId: "workspace-test",
      revision: "a".repeat(64),
      capturedAt: "2026-08-07T12:00:00.000Z",
      listModuleSnapshot: jest.fn(async () => ({
        bucket: "aurora",
        prefix: "modules/current/",
        moduleHash: "a".repeat(64),
        totalFiles: 1,
        totalBytes: 3,
        objects: [
          {
            key: "modules/current/on_enter.nss",
            size: 3,
            etag: "a".repeat(64),
            lastModified: "2026-08-07T12:00:00.000Z",
          },
        ],
        truncated: false,
      })),
      getModuleObject: jest.fn(),
    };
    const committedReader = {
      capture: jest.fn(async () => captured),
    } as unknown as CommittedModuleSnapshotReaderPort;
    const service = new CatalogApplicationService(
      {} as never,
      {} as never,
      undefined,
      {
        get: jest.fn(async () => ({
          blobStorage: {
            endpoint: "http://blob.test",
            region: "local",
            bucket: "aurora",
            modulePrefix: "modules/current",
            accessKeyId: "test",
            secretAccessKey: "test",
            forcePathStyle: true,
          },
        })),
      } as never,
      rawStorage,
      undefined,
      undefined,
      committedReader,
    );

    await expect(
      service.listCreatureResourceOptions({ kind: "script", limit: 10 }),
    ).resolves.toEqual({
      kind: "script",
      total: 1,
      items: [{ resRef: "on_enter", label: "on_enter" }],
    });
    expect(committedReader.capture).toHaveBeenCalledTimes(1);
    expect(captured.listModuleSnapshot).toHaveBeenCalledTimes(1);
    expect(rawStorage.listModuleSnapshot).not.toHaveBeenCalled();
    expect(rawStorage.getModuleObject).not.toHaveBeenCalled();

    service.invalidateTemplateSnapshotCaches();
    await service.listCreatureResourceOptions({ kind: "script", limit: 10 });
    expect(committedReader.capture).toHaveBeenCalledTimes(2);
  });
});
