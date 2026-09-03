import { createHash } from "node:crypto";
import type {
  ModuleBlobStoragePort,
} from "../../src/modules/runtime-settings/application/ports/module-blob-storage.port";
import type { RuntimeSettingsRepositoryPort } from "../../src/modules/runtime-settings/application/ports/runtime-settings-repository.port";
import type { BlobStorageSettings } from "../../src/modules/runtime-settings/domain/runtime-settings.types";
import { MemoryAtomicModuleSnapshotRepository } from "../../src/modules/areas/adapters/outbound/memory/memory-atomic-module-snapshot.repository";
import {
  applyModuleSnapshotChanges,
  buildModuleSnapshotManifestKey,
  createModuleSnapshotManifest,
  hashModuleSnapshotManifest,
} from "../../src/modules/areas/domain/module-snapshot-manifest";
import { CommittedModuleSnapshotReaderService } from "../../src/modules/module-snapshots/adapters/committed-module-snapshot-reader.service";
import { deriveWorkspaceModuleId } from "../../src/modules/module-snapshots/domain/workspace-module-id";
import { MODULE_SNAPSHOT_HEAD_SCHEMA_VERSION } from "../../src/modules/areas/application/ports/atomic-module-snapshot.port";
import type { ModuleSnapshotBootstrapApplicationService } from "../../src/modules/areas/application/module-snapshot-bootstrap.application.service";

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

describe("CommittedModuleSnapshotReaderService", () => {
  it("keeps a captured head stable while a later session observes the one-step successor", async () => {
    const harness = await createHarness();
    const baselineSession = await harness.reader.capture();
    const successorBytes = Buffer.from("successor-area");
    const successorHash = sha256(successorBytes);
    await harness.repository.putContentIfAbsent(successorBytes, successorHash);
    const successor = applyModuleSnapshotChanges(harness.manifest, [
      { logicalKey: "area.are", resourceType: 2012, size: successorBytes.length, sha256: successorHash },
    ]);
    await harness.repository.putManifestIfAbsent(successor);
    await harness.repository.forceHeadForTest({
      schemaVersion: MODULE_SNAPSHOT_HEAD_SCHEMA_VERSION,
      moduleId: successor.moduleId,
      revision: successor.revision,
      manifestKey: buildModuleSnapshotManifestKey(successor),
      manifestSha256: hashModuleSnapshotManifest(successor),
      quarantined: false,
      fencingToken: 1,
      updatedAt: "2026-08-07T12:01:00.000Z",
    });
    const successorSession = await harness.reader.capture();

    await expect(baselineSession.getModuleObject("modules/current/area.are")).resolves.toMatchObject({
      bytes: Buffer.from("baseline-area"),
      etag: sha256(Buffer.from("baseline-area")),
    });
    await expect(successorSession.getModuleObject("modules/current/area.are")).resolves.toMatchObject({
      bytes: successorBytes,
      etag: successorHash,
    });
    expect(baselineSession.revision).toBe(harness.manifest.revision);
    expect(successorSession.revision).toBe(successor.revision);
  });

  it("lists committed logical objects plus internal sources but never raw mutable logical objects", async () => {
    const harness = await createHarness();
    const session = await harness.reader.capture();

    await expect(session.listModuleSnapshot()).resolves.toMatchObject({
      moduleHash: harness.manifest.revision,
      manifestFileCount: 2,
      objects: [
        expect.objectContaining({ key: "modules/current/__aurora/sources/hak/a/tms01.set" }),
        expect.objectContaining({ key: "modules/current/area.are", etag: sha256(Buffer.from("baseline-area")) }),
        expect.objectContaining({ key: "modules/current/module.ifo" }),
      ],
    });
    await expect(
      session.getModuleObject("modules/current/__aurora/sources/hak/a/tms01.set"),
    ).resolves.toMatchObject({ bytes: Buffer.from("set-source") });
    expect(harness.rawStorage.listModuleSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ modulePrefix: "modules/current/__aurora" }),
      expect.any(Object),
    );
    expect(harness.rawStorage.getModuleObject).toHaveBeenCalledTimes(1);
  });

  it("exposes immutable committed descriptors without content storage keys", async () => {
    const harness = await createHarness();
    const session = await harness.reader.capture();

    const descriptors = session.listCommittedObjectDescriptors();

    expect(descriptors).toEqual([
      {
        logicalKey: "area.are",
        resourceType: 2012,
        size: Buffer.byteLength("baseline-area"),
        sha256: sha256(Buffer.from("baseline-area")),
      },
      {
        logicalKey: "module.ifo",
        resourceType: 2014,
        size: Buffer.byteLength("baseline-ifo"),
        sha256: sha256(Buffer.from("baseline-ifo")),
      },
    ]);
    expect(Object.isFrozen(descriptors)).toBe(true);
    expect(Object.isFrozen(descriptors[0])).toBe(true);
    expect(descriptors[0]).not.toHaveProperty("contentKey");
  });

  it("binds continuation tokens to the captured revision", async () => {
    const harness = await createHarness();
    const session = await harness.reader.capture();
    const first = await session.listModuleSnapshot({ limit: 1 });
    expect(first.truncated).toBe(true);
    expect(first.continuationToken).toEqual(expect.any(String));
    await expect(
      session.listModuleSnapshot({ limit: 1, continuationToken: first.continuationToken }),
    ).resolves.toMatchObject({ objects: [expect.any(Object)] });

    const foreignToken = Buffer.from(
      JSON.stringify({ revision: "f".repeat(64), offset: 1 }),
      "utf8",
    ).toString("base64url");
    await expect(
      session.listModuleSnapshot({ continuationToken: foreignToken }),
    ).rejects.toThrow("MODULE_SNAPSHOT_READER_CONTINUATION_INVALID");
  });

  it("fails closed before bootstrap and when the head is quarantined", async () => {
    const emptyRepository = new MemoryAtomicModuleSnapshotRepository({ assertCurrent: jest.fn() });
    const dependencies = createDependencies(emptyRepository);
    await expect(dependencies.reader.capture()).rejects.toThrow(
      "MODULE_SNAPSHOT_READER_NOT_BOOTSTRAPPED",
    );

    const harness = await createHarness();
    const head = await harness.repository.readHead(harness.manifest.moduleId);
    await harness.repository.forceHeadForTest({ ...head!, quarantined: true });
    await expect(harness.reader.capture()).rejects.toThrow(
      "MODULE_SNAPSHOT_READER_QUARANTINED",
    );
  });

  it("bootstraps an absent workspace head on the first committed read", async () => {
    const repository = new MemoryAtomicModuleSnapshotRepository({ assertCurrent: jest.fn() });
    const baseline = Buffer.from("lazy-baseline-area");
    const bootstrap = {
      ensureBootstrapped: jest.fn(async (moduleId: string) => {
        const manifest = createModuleSnapshotManifest({
          moduleId,
          parentRevision: null,
          objects: [
            {
              logicalKey: "area.are",
              resourceType: 2012,
              size: baseline.length,
              sha256: sha256(baseline),
            },
          ],
        });
        const head = await repository.bootstrap(
          manifest,
          { "area.are": baseline },
          NOW,
        );
        return { status: "bootstrapped", head, objectCount: 1, totalBytes: baseline.length };
      }),
    } as unknown as ModuleSnapshotBootstrapApplicationService;
    const dependencies = createDependencies(repository, bootstrap);

    const session = await dependencies.reader.capture();

    expect(bootstrap.ensureBootstrapped).toHaveBeenCalledTimes(1);
    expect(bootstrap.ensureBootstrapped).toHaveBeenCalledWith(
      deriveWorkspaceModuleId(SETTINGS),
    );
    await expect(session.getModuleObject("modules/current/area.are")).resolves.toMatchObject({
      bytes: baseline,
    });
  });
});

async function createHarness() {
  const repository = new MemoryAtomicModuleSnapshotRepository({ assertCurrent: jest.fn() });
  const area = Buffer.from("baseline-area");
  const ifo = Buffer.from("baseline-ifo");
  const manifest = createModuleSnapshotManifest({
    moduleId: deriveWorkspaceModuleId(SETTINGS),
    parentRevision: null,
    objects: [
      { logicalKey: "area.are", resourceType: 2012, size: area.length, sha256: sha256(area) },
      { logicalKey: "module.ifo", resourceType: 2014, size: ifo.length, sha256: sha256(ifo) },
    ],
  });
  await repository.bootstrap(manifest, { "area.are": area, "module.ifo": ifo }, NOW);
  return { repository, manifest, ...createDependencies(repository) };
}

function createDependencies(
  repository: MemoryAtomicModuleSnapshotRepository,
  bootstrap?: ModuleSnapshotBootstrapApplicationService,
) {
  const internalKey = "modules/current/__aurora/sources/hak/a/tms01.set";
  const rawStorage = {
    listModuleSnapshot: jest.fn(async () => ({
      bucket: SETTINGS.bucket,
      prefix: "modules/current/",
      totalFiles: 2,
      totalBytes: 24,
      objects: [
        { key: "modules/current/area.are", size: 11, etag: "raw-mutable" },
        { key: internalKey, size: 10, etag: sha256(Buffer.from("set-source")) },
      ],
      truncated: false,
    })),
    getModuleObject: jest.fn(async (_settings: BlobStorageSettings, key: string) =>
      key === internalKey
        ? {
            key,
            size: 10,
            contentType: "text/plain",
            etag: sha256(Buffer.from("set-source")),
            bytes: Buffer.from("set-source"),
          }
        : null,
    ),
  } as unknown as jest.Mocked<ModuleBlobStoragePort>;
  const settingsRepository = {
    get: jest.fn(async () => ({ blobStorage: SETTINGS })),
  } as unknown as RuntimeSettingsRepositoryPort;
  const reader = new CommittedModuleSnapshotReaderService(
    repository,
    settingsRepository,
    rawStorage,
    bootstrap,
  );
  return { reader, rawStorage };
}

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}
