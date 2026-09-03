import { createHash } from "node:crypto";
import { buildGffBuffer } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import type { ModuleBlobStoragePort } from "../../src/modules/runtime-settings/application/ports/module-blob-storage.port";
import type { RuntimeSettingsRepositoryPort } from "../../src/modules/runtime-settings/application/ports/runtime-settings-repository.port";
import type { BlobStorageSettings } from "../../src/modules/runtime-settings/domain/runtime-settings.types";
import { MemoryAreaCreateControlStore } from "../../src/modules/areas/adapters/outbound/memory/memory-area-create-control-store";
import { MemoryAtomicModuleSnapshotRepository } from "../../src/modules/areas/adapters/outbound/memory/memory-atomic-module-snapshot.repository";
import { AtomicAreaCreateTransactionStorageAdapter } from "../../src/modules/areas/adapters/outbound/snapshot/atomic-area-create-transaction-storage.adapter";
import { AuroraAreaCreateCompiler } from "../../src/modules/areas/adapters/outbound/blob/aurora-area-create-compiler";
import { AuroraAreaCreateCandidateValidator } from "../../src/modules/areas/adapters/outbound/blob/aurora-area-create-candidate-validator";
import { AuroraAreaCreatePersistedReadbackVerifier } from "../../src/modules/areas/adapters/outbound/blob/aurora-area-create-persisted-readback-verifier";
import { ModuleSnapshotBootstrapApplicationService } from "../../src/modules/areas/application/module-snapshot-bootstrap.application.service";
import { AreaCreateApplicationService } from "../../src/modules/areas/application/area-create.application.service";
import {
  AUR_S05_05_CREATION_PROFILE_FINGERPRINT,
  getAurS0505CreationProfile,
} from "../../src/modules/areas/domain/area-create-profile";
import type { ModuleSnapshotAreaRepository } from "../../src/modules/areas/adapters/outbound/blob/module-snapshot-area.repository";
import type { AreaEditingApplicationService } from "../../src/modules/areas/application/area-editing.application.service";
import { CommittedModuleSnapshotReaderService } from "../../src/modules/module-snapshots/adapters/committed-module-snapshot-reader.service";
import { areaTileProductionAdmissionFixture } from "../unit/helpers/area-tile-production-admission-fixture";

const SETTINGS: BlobStorageSettings = {
  endpoint: "http://blob.test",
  region: "local",
  bucket: "aurora",
  modulePrefix: "modules/current",
  accessKeyId: "test",
  secretAccessKey: "test",
  forcePathStyle: true,
};
const SET_FINGERPRINT = "a".repeat(64);

describe("Area Create atomic application pipeline", () => {
  it("bootstraps, publishes ARE/GIT/GIC/IFO in one head change, verifies, and replays idempotently", async () => {
    const harness = createHarness();
    const profiles = await harness.service.getProfiles("builder-1");
    const command = createCommand(profiles.moduleId, profiles.moduleRevision);

    const created = await harness.service.create({
      moduleId: profiles.moduleId,
      actorId: "builder-1",
      idempotencyKey: "create-area-1",
      ifMatchHeader: `"${profiles.moduleRevision}"`,
      body: command,
    });

    expect(created).toMatchObject({
      idempotency: "created",
      receipt: {
        areaId: "area_new",
        previousModuleRevision: profiles.moduleRevision,
        readbackStatus: "verified",
        resources: [
          expect.objectContaining({ extension: "are", resourceType: 2012 }),
          expect.objectContaining({ extension: "git", resourceType: 2023 }),
          expect.objectContaining({ extension: "gic", resourceType: 2046 }),
        ],
      },
    });
    expect(created.receipt.newModuleRevision).not.toBe(profiles.moduleRevision);
    const head = await harness.repository.readHead(profiles.moduleId);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    expect(manifest?.objects.map((object) => object.logicalKey)).toEqual([
      "area_new.are",
      "area_new.gic",
      "area_new.git",
      "module.ifo",
    ]);
    const committed = await harness.reader.capture();
    expect(committed.revision).toBe(created.receipt.newModuleRevision);
    const publishedAre = await committed.getModuleObject(
      "modules/current/area_new.are",
    );
    expect(publishedAre).toMatchObject({
      key: "modules/current/area_new.are",
      size: expect.any(Number),
      etag: created.receipt.resources.find((resource) => resource.extension === "are")?.sha256,
    });
    expect(harness.areaRepository.invalidateSnapshotIndex).toHaveBeenCalledTimes(1);
    expect(harness.areaEditing.invalidateSnapshotCache).toHaveBeenCalledTimes(1);

    const replayed = await harness.service.create({
      moduleId: profiles.moduleId,
      actorId: "builder-1",
      idempotencyKey: "create-area-1",
      ifMatchHeader: `"${profiles.moduleRevision}"`,
      body: command,
    });
    expect(replayed.idempotency).toBe("replayed");
    expect(replayed.receipt).toEqual(created.receipt);
    expect((await harness.repository.readHead(profiles.moduleId))?.revision).toBe(
      created.receipt.newModuleRevision,
    );
  });

  it("rejects a stale If-Match without publishing any candidate resources", async () => {
    const harness = createHarness();
    const profiles = await harness.service.getProfiles("builder-1");
    const baseline = await harness.repository.readHead(profiles.moduleId);
    const staleRevision = "f".repeat(64);

    await expect(
      harness.service.create({
        moduleId: profiles.moduleId,
        actorId: "builder-1",
        idempotencyKey: "create-area-stale",
        ifMatchHeader: `"${staleRevision}"`,
        body: createCommand(profiles.moduleId, staleRevision),
      }),
    ).rejects.toMatchObject({ code: "AREA_CREATE_MODULE_REVISION_CONFLICT" });
    expect(await harness.repository.readHead(profiles.moduleId)).toEqual(baseline);
    expect(await harness.repository.readContent(contentKeyFor(Buffer.from("candidate")))).toBeNull();
  });
});

function createHarness() {
  const moduleIfo = buildModuleIfo();
  const rawStorage = {
    listModuleSnapshot: jest.fn(async () => ({
      bucket: SETTINGS.bucket,
      prefix: "modules/current/",
      moduleHash: "mutable-baseline",
      totalFiles: 2,
      totalBytes: moduleIfo.length + 3,
      objects: [
        {
          key: "modules/current/module.ifo",
          size: moduleIfo.length,
          etag: sha256(moduleIfo),
          lastModified: "2026-08-07T12:00:00.000Z",
        },
        {
          key: "modules/current/__aurora/sources/vanilla/tilesets/tms01.set",
          size: 3,
          etag: sha256(Buffer.from("set")),
          lastModified: "2026-08-07T12:00:00.000Z",
        },
      ],
      truncated: false,
    })),
    getModuleObject: jest.fn(async (_settings: BlobStorageSettings, key: string) =>
      key === "modules/current/module.ifo"
        ? {
            key,
            size: moduleIfo.length,
            contentType: "application/octet-stream",
            etag: sha256(moduleIfo),
            lastModified: "2026-08-07T12:00:00.000Z",
            bytes: Buffer.from(moduleIfo),
          }
        : null,
    ),
  } as unknown as ModuleBlobStoragePort;
  const settingsRepository = {
    get: jest.fn(async () => ({ blobStorage: SETTINGS })),
  } as unknown as RuntimeSettingsRepositoryPort;
  const control = new MemoryAreaCreateControlStore();
  const repository = new MemoryAtomicModuleSnapshotRepository(control);
  const bootstrap = new ModuleSnapshotBootstrapApplicationService(
    repository,
    settingsRepository,
    rawStorage,
  );
  const reader = new CommittedModuleSnapshotReaderService(
    repository,
    settingsRepository,
    rawStorage,
  );
  const tilesetSource = {
    resolve: jest.fn(async () => ({ resRef: "tms01", fingerprintSha256: SET_FINGERPRINT })),
  };
  const compiler = new AuroraAreaCreateCompiler(repository, tilesetSource);
  const validator = new AuroraAreaCreateCandidateValidator();
  const storage = new AtomicAreaCreateTransactionStorageAdapter(
    repository,
    new AuroraAreaCreatePersistedReadbackVerifier(),
  );
  const areaRepository = {
    invalidateSnapshotIndex: jest.fn(),
  } as unknown as ModuleSnapshotAreaRepository;
  const areaEditing = {
    invalidateSnapshotCache: jest.fn(),
  } as unknown as AreaEditingApplicationService;
  const service = new AreaCreateApplicationService(
    bootstrap,
    settingsRepository,
    { authorize: jest.fn(async () => true) },
    control,
    control,
    storage,
    compiler,
    validator,
    control,
    tilesetSource,
    {
      resolve: jest.fn(async () => ({
        persistenceStatus: "native-certified" as const,
        materializationAllowed: true as const,
        certificationId: "integration-test-certification",
        blockingProofs: [] as const,
      })),
    },
    {
      evaluateProductionAdmission: jest.fn(async () => ({
        allowed: true as const,
        code: "AREA_TILE_PRODUCTION_ADMITTED" as const,
        tilesetResRef: "tms01",
        tileIds: [12],
        diagnostics: [] as const,
        admission: areaTileProductionAdmissionFixture(),
      })),
    },
    areaRepository,
    areaEditing,
  );
  return { service, repository, reader, areaRepository, areaEditing };
}

function createCommand(moduleId: string, revision: string) {
  const profile = getAurS0505CreationProfile();
  return {
    schemaVersion: "area-create-command.v1",
    moduleId,
    expectedModuleRevision: revision,
    creationProfile: {
      id: profile.id,
      fingerprintSha256: AUR_S05_05_CREATION_PROFILE_FINGERPRINT,
    },
    area: { name: "Created Area", resRef: "area_new", tag: "Created_Tag" },
    tileset: { resRef: "tms01", setFingerprintSha256: SET_FINGERPRINT },
    dimensions: { width: 2, height: 2 },
    initializer: {
      algorithmVersion: profile.initializerAlgorithmVersion,
      seed: profile.initializerSeed,
    },
    tiles: profile.tiles,
    groupInstances: [],
    draft: { id: "draft-1", revision: 1, normalizedSha256: "d".repeat(64) },
    clientCommandId: "command-1",
  };
}

function buildModuleIfo(): Buffer {
  return buildGffBuffer(
    [
      { label: "Mod_Area_list", type: "list", value: [] },
      { label: "Mod_Name", type: "cexolocstring", value: { text: "Test Module" } },
    ],
    "IFO ",
    0xffffffff,
  );
}

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function contentKeyFor(bytes: Buffer): string {
  const hash = sha256(bytes);
  return `__aurora/cas/sha256/${hash.slice(0, 2)}/${hash}`;
}
