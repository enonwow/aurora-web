import { createHash } from "node:crypto";
import type {
  ModuleBlobObjectPayload,
  ModuleBlobSnapshotSummary,
  ModuleBlobStoragePort,
} from "../../src/modules/runtime-settings/application/ports/module-blob-storage.port";
import type { RuntimeSettingsRepositoryPort } from "../../src/modules/runtime-settings/application/ports/runtime-settings-repository.port";
import type { BlobStorageSettings } from "../../src/modules/runtime-settings/domain/runtime-settings.types";
import { ModuleSnapshotBootstrapApplicationService } from "../../src/modules/areas/application/module-snapshot-bootstrap.application.service";
import { MemoryAtomicModuleSnapshotRepository } from "../../src/modules/areas/adapters/outbound/memory/memory-atomic-module-snapshot.repository";

const NOW = "2026-08-07T12:00:00.000Z";
const SETTINGS: BlobStorageSettings = {
  endpoint: "http://blob.test",
  region: "local",
  bucket: "aurora",
  modulePrefix: "modules/current",
  accessKeyId: "test",
  secretAccessKey: "test",
  forcePathStyle: true,
};

describe("ModuleSnapshotBootstrapApplicationService", () => {
  it("captures every paginated module resource, excludes internal objects, and verifies CAS readback", async () => {
    const pages = twoPassPages([
      object("modules/current/area_one.are", "area"),
      object("modules/current/__aurora/sources/hak/a/model.mdl", "internal"),
      object("modules/current/cache/areas/cache-key.json", "processing-cache"),
      object("modules/current/module.ifo", "ifo"),
      object("modules/current/script.nss", "script"),
    ]);
    const harness = createHarness(pages, {
      "modules/current/area_one.are": Buffer.from("area"),
      "modules/current/__aurora/sources/hak/a/model.mdl": Buffer.from("internal"),
      "modules/current/cache/areas/cache-key.json": Buffer.from("processing-cache"),
      "modules/current/module.ifo": Buffer.from("ifo"),
      "modules/current/script.nss": Buffer.from("script"),
    });

    await expect(harness.service.ensureBootstrapped("module-test")).resolves.toMatchObject({
      status: "bootstrapped",
      objectCount: 3,
      totalBytes: 13,
      head: { moduleId: "module-test", quarantined: false, fencingToken: 0 },
    });

    const head = await harness.repository.readHead("module-test");
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    expect(manifest?.objects).toEqual([
      expect.objectContaining({ logicalKey: "area_one.are", resourceType: 2012 }),
      expect.objectContaining({ logicalKey: "module.ifo", resourceType: 2014 }),
      expect.objectContaining({ logicalKey: "script.nss", resourceType: 2009 }),
    ]);
    expect(harness.storage.getModuleObject).not.toHaveBeenCalledWith(
      SETTINGS,
      "modules/current/__aurora/sources/hak/a/model.mdl",
    );
    expect(harness.storage.getModuleObject).not.toHaveBeenCalledWith(
      SETTINGS,
      "modules/current/cache/areas/cache-key.json",
    );
  });

  it("verifies and returns an existing head without reading mutable live keys", async () => {
    const harness = createHarness(
      twoPassPages([object("modules/current/module.ifo", "ifo")]),
      { "modules/current/module.ifo": Buffer.from("ifo") },
    );
    await harness.service.ensureBootstrapped("module-test");
    jest.clearAllMocks();

    await expect(harness.service.ensureBootstrapped("module-test")).resolves.toMatchObject({
      status: "already_bootstrapped",
      objectCount: 1,
    });
    expect(harness.storage.listModuleSnapshot).not.toHaveBeenCalled();
    expect(harness.storage.getModuleObject).not.toHaveBeenCalled();
  });

  it("shares one bootstrap transaction across concurrent callers for the same module", async () => {
    const moduleIfo = object("modules/current/module.ifo", "ifo");
    const harness = createHarness(
      [page([moduleIfo]), page([moduleIfo])],
      { "modules/current/module.ifo": Buffer.from("ifo") },
    );

    const [first, second] = await Promise.all([
      harness.service.ensureBootstrapped("module-test"),
      harness.service.ensureBootstrapped("module-test"),
    ]);

    expect(first).toEqual(second);
    expect(first.status).toBe("bootstrapped");
    expect(harness.storage.listModuleSnapshot).toHaveBeenCalledTimes(2);
    expect(harness.storage.getModuleObject).toHaveBeenCalledTimes(1);
  });

  it("keeps a bounded inventory budget above the observed 100-page shared namespace", async () => {
    const moduleObject = object("modules/current/module.ifo", "ifo");
    const inventoryPass = Array.from({ length: 101 }, (_, index) =>
      page(
        index === 100
          ? [moduleObject]
          : [object(`modules/current/cache/areas/cache-${index}.json`, "cache")],
        index < 100,
        index < 100 ? `page-${index + 1}` : undefined,
      ),
    );
    const harness = createHarness(
      [...inventoryPass, ...inventoryPass],
      { "modules/current/module.ifo": Buffer.from("ifo") },
    );

    await expect(harness.service.ensureBootstrapped("module-test")).resolves.toMatchObject({
      status: "bootstrapped",
      objectCount: 1,
    });
    expect(harness.storage.listModuleSnapshot).toHaveBeenCalledTimes(202);
  });

  it("fails closed for an unknown resource extension", async () => {
    const harness = createHarness(
      [page([object("modules/current/unknown.xyz", "unknown")])],
      { "modules/current/unknown.xyz": Buffer.from("unknown") },
    );

    await expect(harness.service.ensureBootstrapped("module-test")).rejects.toThrow(
      "AREA_SNAPSHOT_BOOTSTRAP_UNKNOWN_RESOURCE_TYPE",
    );
  });

  it("fails when a listed resource disappears before capture", async () => {
    const harness = createHarness(
      [page([object("modules/current/module.ifo", "ifo")])],
      {},
    );

    await expect(harness.service.ensureBootstrapped("module-test")).rejects.toThrow(
      "AREA_SNAPSHOT_BOOTSTRAP_UNSTABLE",
    );
  });

  it("fails when the mutable inventory changes between the two passes", async () => {
    const before = object("modules/current/module.ifo", "ifo");
    const after = { ...before, size: before.size + 1, etag: "changed" };
    const harness = createHarness(
      [page([before]), page([after])],
      { "modules/current/module.ifo": Buffer.from("ifo") },
    );

    await expect(harness.service.ensureBootstrapped("module-test")).rejects.toThrow(
      "AREA_SNAPSHOT_BOOTSTRAP_UNSTABLE",
    );
  });

  it("rejects case-insensitive logical-key collisions", async () => {
    const objects = [
      object("modules/current/Area.are", "left"),
      object("modules/current/area.ARE", "right"),
    ];
    const harness = createHarness(twoPassPages(objects), {
      "modules/current/Area.are": Buffer.from("left"),
      "modules/current/area.ARE": Buffer.from("right"),
    });

    await expect(harness.service.ensureBootstrapped("module-test")).rejects.toThrow(
      "AREA_SNAPSHOT_MANIFEST_INVALID",
    );
  });

  it("rejects a repeated continuation token", async () => {
    const first = page([object("modules/current/a.are", "a")], true, "same");
    const second = page([object("modules/current/module.ifo", "ifo")], true, "same");
    const harness = createHarness([first, second], {
      "modules/current/a.are": Buffer.from("a"),
      "modules/current/module.ifo": Buffer.from("ifo"),
    });

    await expect(harness.service.ensureBootstrapped("module-test")).rejects.toThrow(
      "AREA_SNAPSHOT_BOOTSTRAP_INVALID_SOURCE",
    );
  });
});

function createHarness(
  pages: ModuleBlobSnapshotSummary[],
  bytesByKey: Readonly<Record<string, Buffer>>,
) {
  let pageIndex = 0;
  const storage = {
    listModuleSnapshot: jest.fn(async () => pages[Math.min(pageIndex++, pages.length - 1)]),
    getModuleObject: jest.fn(async (_settings: BlobStorageSettings, key: string) => {
      const bytes = bytesByKey[key];
      if (!bytes) {
        return null;
      }
      return payload(key, bytes);
    }),
  } as unknown as jest.Mocked<ModuleBlobStoragePort>;
  const settingsRepository = {
    get: jest.fn(async () => ({ blobStorage: SETTINGS })),
  } as unknown as RuntimeSettingsRepositoryPort;
  const repository = new MemoryAtomicModuleSnapshotRepository({
    assertCurrent: jest.fn(),
  });
  const service = new ModuleSnapshotBootstrapApplicationService(
    repository,
    settingsRepository,
    storage,
    () => new Date(NOW),
  );
  return { service, repository, storage };
}

function twoPassPages(objects: ReturnType<typeof object>[]): ModuleBlobSnapshotSummary[] {
  const midpoint = Math.max(1, Math.ceil(objects.length / 2));
  const first = objects.slice(0, midpoint);
  const second = objects.slice(midpoint);
  if (second.length === 0) {
    return [page(first), page(first)];
  }
  return [
    page(first, true, "p2"),
    page(second),
    page(first, true, "p2"),
    page(second),
  ];
}

function page(
  objects: ReturnType<typeof object>[],
  truncated = false,
  continuationToken?: string,
): ModuleBlobSnapshotSummary {
  return {
    bucket: SETTINGS.bucket,
    prefix: "modules/current/",
    moduleHash: "stable-module-hash",
    totalFiles: objects.length,
    totalBytes: objects.reduce((sum, entry) => sum + entry.size, 0),
    objects,
    truncated,
    continuationToken,
  };
}

function object(key: string, value: string) {
  const bytes = Buffer.from(value);
  return {
    key,
    size: bytes.length,
    etag: sha256(bytes),
    lastModified: NOW,
  };
}

function payload(key: string, bytes: Buffer): ModuleBlobObjectPayload {
  return {
    key,
    size: bytes.length,
    contentType: "application/octet-stream",
    etag: sha256(bytes),
    lastModified: NOW,
    bytes: Buffer.from(bytes),
  };
}

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}
