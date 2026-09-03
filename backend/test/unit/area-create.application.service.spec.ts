import type { BlobStorageSettings } from "../../src/modules/runtime-settings/domain/runtime-settings.types";
import type { RuntimeSettingsRepositoryPort } from "../../src/modules/runtime-settings/application/ports/runtime-settings-repository.port";
import type { ModuleSnapshotAreaRepository } from "../../src/modules/areas/adapters/outbound/blob/module-snapshot-area.repository";
import { AreaCreateApplicationService } from "../../src/modules/areas/application/area-create.application.service";
import type { AreaEditingApplicationService } from "../../src/modules/areas/application/area-editing.application.service";
import type { ModuleSnapshotBootstrapApplicationService } from "../../src/modules/areas/application/module-snapshot-bootstrap.application.service";
import type {
  AreaCreateAuthorizationPort,
  AreaCreateCandidateValidatorPort,
  AreaCreateCompilerPort,
  AreaCreateIdempotencyRepositoryPort,
  AreaCreateModuleLockPort,
  AreaCreateTilesetSourcePort,
  AreaCreateTransactionJournalPort,
  AreaCreateTransactionStoragePort,
} from "../../src/modules/areas/application/ports/area-create-transaction.port";
import type { AreaCreateMaterializationGatePort } from "../../src/modules/areas/application/ports/area-create-materialization-gate.port";
import {
  AreaTileProductionAdmissionSourceError,
  type AreaTileProductionAdmissionPort,
} from "../../src/modules/areas/application/ports/area-tile-production-admission.port";
import type { AreaCreateCommand } from "../../src/modules/areas/domain/area-create-command.types";
import {
  AUR_S05_05_CREATION_PROFILE_FINGERPRINT,
  getAurS0505CreationProfile,
} from "../../src/modules/areas/domain/area-create-profile";
import type { AreaCreateCompiledCandidate } from "../../src/modules/areas/domain/area-create-transaction.types";
import { deriveWorkspaceModuleId } from "../../src/modules/module-snapshots/domain/workspace-module-id";
import type { CatalogApplicationService } from "../../src/modules/catalog/application/catalog.application.service";

const BLOB_SETTINGS: BlobStorageSettings = {
  endpoint: "http://blob.test",
  region: "local",
  bucket: "aurora",
  modulePrefix: "modules/current",
  accessKeyId: "test",
  secretAccessKey: "test",
  forcePathStyle: true,
};
const MODULE_ID = deriveWorkspaceModuleId(BLOB_SETTINGS);
const MODULE_REVISION = "revision-current";
const SET_FINGERPRINT = "a".repeat(64);

function admittedTileProduction(candidateTileIds: readonly number[]) {
  const tileIds = [...new Set(candidateTileIds)].sort((left, right) => left - right);
  return Object.freeze({
    allowed: true as const,
    code: "AREA_TILE_PRODUCTION_ADMITTED" as const,
    tilesetResRef: "tms01",
    tileIds: Object.freeze(tileIds),
    diagnostics: Object.freeze([]) as readonly [],
    admission: Object.freeze({
      schemaVersion: "area-tile-production-admission.v1" as const,
      policyVersion: "area-tile-production-admission-policy.v1" as const,
      reportGeneratedAtIso: "2026-08-21T18:00:00.000Z",
      planId: "plan-01",
      corpusHash: "c".repeat(64),
      profileId: "source-bound-v7",
      ledgerSha256: "4".repeat(64),
      reportSha256: "5".repeat(64),
      tilesetResRef: "tms01",
      uniqueTileIdCount: tileIds.length,
      tileIdSetSha256: "6".repeat(64),
    }),
  });
}

describe("AreaCreateApplicationService HTTP boundary", () => {
  it("profiles authorizes the authenticated actor for the exact workspace module", async () => {
    const harness = createHarness();

    const result = await harness.service.getProfiles("actor-builder");

    expect(harness.authorization.authorize).toHaveBeenCalledWith({
      actorId: "actor-builder",
      moduleId: MODULE_ID,
      permission: "area.create",
    });
    expect(result).toMatchObject({
      moduleId: MODULE_ID,
      moduleRevision: MODULE_REVISION,
      profiles: [
        {
          id: "aur-s05-05-microset-tiny-2x2.v1",
          fingerprintSha256: AUR_S05_05_CREATION_PROFILE_FINGERPRINT,
          setFingerprintSha256: SET_FINGERPRINT,
          persistenceStatus: "structural-candidate-awaiting-native-certification",
          materializationAllowed: false,
          certificationId: null,
          blockingProofs: ["runtime-canvas", "toolset-save-build", "nwn-runtime-load"],
        },
      ],
    });
  });

  it("profiles rejects an absent actor before workspace discovery", async () => {
    const harness = createHarness();

    await expect(harness.service.getProfiles("")).rejects.toMatchObject({
      code: "AREA_CREATE_PERMISSION_DENIED",
      status: 401,
    });
    expect(harness.settingsRepository.get).not.toHaveBeenCalled();
    expect(harness.authorization.authorize).not.toHaveBeenCalled();
  });

  it("profiles fails closed when application authorization denies the actor", async () => {
    const harness = createHarness({ authorized: false });

    await expect(harness.service.getProfiles("actor-viewer")).rejects.toMatchObject({
      code: "AREA_CREATE_PERMISSION_DENIED",
      status: 403,
    });
    expect(harness.bootstrap.ensureCurrentWorkspaceBootstrapped).not.toHaveBeenCalled();
    expect(harness.tilesetSource.resolve).not.toHaveBeenCalled();
  });

  it("validate compiles and independently validates without invoking transaction writes", async () => {
    const harness = createHarness();
    const command = createCommand();

    const result = await harness.service.validate(
      MODULE_ID,
      "actor-builder",
      command,
    );

    expect(harness.compiler.compile).toHaveBeenCalledWith(
      command,
      {
        moduleId: MODULE_ID,
        revision: MODULE_REVISION,
        quarantined: false,
      },
      expect.stringMatching(/^validation-/u),
    );
    expect(harness.validator.validate).toHaveBeenCalledWith(command, harness.candidate);
    expect(harness.tileAdmission.evaluateProductionAdmission).toHaveBeenCalledWith({
      tilesetResRef: "tms01",
      candidateTileIds: command.tiles.map((tile) => tile.tileId),
    });
    expect(result).toMatchObject({
      commandHash: expect.stringMatching(/^[a-f0-9]{64}$/u),
      moduleId: MODULE_ID,
      moduleRevision: MODULE_REVISION,
      validatorVersion: "validator-test.v1",
      tileProductionAdmission: admittedTileProduction(
        command.tiles.map((tile) => tile.tileId),
      ).admission,
      resources: [
        expect.objectContaining({ fileName: "area_new.are", extension: "are" }),
      ],
      moduleIfo: expect.objectContaining({ fileName: "module.ifo" }),
    });
    expect(harness.storage.stage).not.toHaveBeenCalled();
    expect(harness.storage.commitResources).not.toHaveBeenCalled();
    expect(harness.storage.commitModuleIfo).not.toHaveBeenCalled();
  });

  it("validate rejects an uncertified complete tile grid after candidate validation", async () => {
    const harness = createHarness();
    harness.tileAdmission.evaluateProductionAdmission.mockResolvedValue({
      allowed: false,
      code: "AREA_TILE_CERTIFICATION_EXCLUDED",
      tilesetResRef: "tms01",
      tileIds: [0],
      diagnostics: [{
        tileId: 0,
        rowId: "tile:tms01:0",
        stage: "eligibility",
        status: "excluded",
        reasonCode: "certification_plan_excluded",
      }],
    } as never);

    await expect(harness.service.validate(
      MODULE_ID,
      "actor-builder",
      createCommand(),
    )).rejects.toMatchObject({
      code: "AREA_TILE_CERTIFICATION_EXCLUDED",
      status: 422,
      details: [{
        path: "details.0",
        reason:
          "tileId=0;rowId=tile:tms01:0;stage=eligibility;status=excluded;reasonCode=certification_plan_excluded",
      }],
    });
    expect(harness.storage.stage).not.toHaveBeenCalled();
    expect(harness.journal.begin).not.toHaveBeenCalled();
  });

  it("validate maps an invalid ledger as retryable without transaction writes", async () => {
    const harness = createHarness();
    harness.tileAdmission.evaluateProductionAdmission.mockRejectedValue(
      new AreaTileProductionAdmissionSourceError(
        "AREA_TILE_CERTIFICATION_LEDGER_INVALID",
        "The Area tile-certification ledger is invalid.",
      ),
    );

    await expect(harness.service.validate(
      MODULE_ID,
      "actor-builder",
      createCommand(),
    )).rejects.toMatchObject({
      code: "AREA_TILE_CERTIFICATION_LEDGER_INVALID",
      status: 503,
      retryable: true,
    });
    expect(harness.journal.begin).not.toHaveBeenCalled();
  });

  it.each(["validate", "create"] as const)(
    "%s rejects a path/body module mismatch before bootstrap, authorization, or mutation",
    async (operation) => {
      const harness = createHarness();
      const mismatched = { ...createCommand(), moduleId: "another-module" };

      const promise =
        operation === "validate"
          ? harness.service.validate(MODULE_ID, "actor-builder", mismatched)
          : harness.service.create({
              moduleId: MODULE_ID,
              actorId: "actor-builder",
              idempotencyKey: "create-area-1",
              ifMatchHeader: `"${MODULE_REVISION}"`,
              body: mismatched,
            });

      await expect(promise).rejects.toMatchObject({
        code: "AREA_CREATE_DRAFT_INVALID",
        status: 422,
      });
      expect(harness.bootstrap.ensureCurrentWorkspaceBootstrapped).not.toHaveBeenCalled();
      expect(harness.authorization.authorize).not.toHaveBeenCalled();
      expect(harness.storage.stage).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["missing", undefined],
    ["empty", ""],
    ["whitespace", "invalid key"],
    ["too long", "x".repeat(129)],
  ])(
    "create rejects a %s Idempotency-Key before authorization, locking, or compilation",
    async (_description, idempotencyKey) => {
      const harness = createHarness({ materializationAllowed: true });

      await expect(
        harness.service.create({
          moduleId: MODULE_ID,
          actorId: "actor-builder",
          idempotencyKey,
          ifMatchHeader: `"${MODULE_REVISION}"`,
          body: createCommand(),
        }),
      ).rejects.toMatchObject({
        code: "AREA_CREATE_DRAFT_INVALID",
        status: 422,
      });
      expect(harness.authorization.authorize).not.toHaveBeenCalled();
      expect(harness.lock.acquire).not.toHaveBeenCalled();
      expect(harness.compiler.compile).not.toHaveBeenCalled();
      expect(harness.storage.stage).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["missing", undefined],
    ["weak", `W/"${MODULE_REVISION}"`],
    ["unquoted", MODULE_REVISION],
    ["multiple", `"${MODULE_REVISION}", "other"`],
  ])(
    "create rejects a %s If-Match after locking but before compilation or mutation",
    async (_description, ifMatchHeader) => {
      const harness = createHarness({ materializationAllowed: true });

      await expect(
        harness.service.create({
          moduleId: MODULE_ID,
          actorId: "actor-builder",
          idempotencyKey: "create-area-precondition",
          ifMatchHeader,
          body: createCommand(),
        }),
      ).rejects.toMatchObject({
        code: "AREA_CREATE_DRAFT_INVALID",
        status: 422,
      });
      expect(harness.lock.acquire).toHaveBeenCalledTimes(1);
      expect(harness.lock.release).toHaveBeenCalledTimes(1);
      expect(harness.compiler.compile).not.toHaveBeenCalled();
      expect(harness.storage.stage).not.toHaveBeenCalled();
    },
  );

  it("create rejects a body/header revision mismatch before compilation or mutation", async () => {
    const harness = createHarness({ materializationAllowed: true });

    await expect(
      harness.service.create({
        moduleId: MODULE_ID,
        actorId: "actor-builder",
        idempotencyKey: "create-area-mismatch",
        ifMatchHeader: '"different-revision"',
        body: createCommand(),
      }),
    ).rejects.toMatchObject({
      code: "AREA_CREATE_DRAFT_INVALID",
      status: 422,
    });
    expect(harness.compiler.compile).not.toHaveBeenCalled();
    expect(harness.tileAdmission.evaluateProductionAdmission).not.toHaveBeenCalled();
    expect(harness.storage.stage).not.toHaveBeenCalled();
  });

  it("create forwards the authenticated actor through authorization and invalidates read caches after commit", async () => {
    const harness = createHarness({ materializationAllowed: true });

    const result = await harness.service.create({
      moduleId: MODULE_ID,
      actorId: "actor-builder",
      idempotencyKey: "create-area-success",
      ifMatchHeader: `"${MODULE_REVISION}"`,
      body: createCommand(),
    });

    expect(harness.authorization.authorize).toHaveBeenCalledWith({
      actorId: "actor-builder",
      moduleId: MODULE_ID,
      permission: "area.create",
    });
    expect(result).toMatchObject({
      idempotency: "created",
      receipt: {
        moduleId: MODULE_ID,
        previousModuleRevision: MODULE_REVISION,
        newModuleRevision: "revision-created",
        readbackStatus: "verified",
      },
    });
    expect(harness.areaRepository.invalidateSnapshotIndex).toHaveBeenCalledTimes(1);
    expect(harness.areaEditing.invalidateSnapshotCache).toHaveBeenCalledTimes(1);
    expect(harness.catalog.invalidateTemplateSnapshotCaches).toHaveBeenCalledTimes(1);
  });

  it("create fails closed before authorization, locking, compilation, or mutation when native certification is missing", async () => {
    const harness = createHarness();

    await expect(
      harness.service.create({
        moduleId: MODULE_ID,
        actorId: "actor-builder",
        idempotencyKey: "create-area-blocked",
        ifMatchHeader: `"${MODULE_REVISION}"`,
        body: createCommand(),
      }),
    ).rejects.toMatchObject({
      code: "AREA_CREATE_PROFILE_NOT_CERTIFIED",
      status: 501,
      retryable: false,
    });
    expect(harness.authorization.authorize).not.toHaveBeenCalled();
    expect(harness.lock.acquire).not.toHaveBeenCalled();
    expect(harness.compiler.compile).not.toHaveBeenCalled();
    expect(harness.storage.stage).not.toHaveBeenCalled();
  });
});

function createHarness(
  options: Readonly<{
    authorized?: boolean;
    materializationAllowed?: boolean;
  }> = {},
) {
  const candidate = createCandidate();
  const bootstrap = {
    ensureCurrentWorkspaceBootstrapped: jest.fn(async () => ({
      head: { moduleId: MODULE_ID, revision: MODULE_REVISION },
    })),
  };
  const settingsRepository = {
    get: jest.fn(async () => ({ blobStorage: BLOB_SETTINGS })),
  };
  const authorization = {
    authorize: jest.fn(async () => options.authorized ?? true),
  };
  const lease = {
    leaseId: "lease-1",
    moduleId: MODULE_ID,
    ownerTransactionId: "transaction-1",
    fencingToken: 1,
    expiresAt: "2026-08-07T12:05:00.000Z",
  };
  const lock = {
    acquire: jest.fn(async (_moduleId: string, transactionId: string) => ({
      ...lease,
      ownerTransactionId: transactionId,
    })),
    release: jest.fn(async () => true),
  };
  const idempotency = { read: jest.fn(async () => null) };
  const storage = {
    readModuleState: jest.fn(async () => ({
      moduleId: MODULE_ID,
      revision: MODULE_REVISION,
      quarantined: false,
    })),
    findResourceCollisions: jest.fn(async () => []),
    stage: jest.fn(async () => undefined),
    commitResources: jest.fn(async () => undefined),
    commitModuleIfo: jest.fn(async () => undefined),
    readBack: jest.fn(async () => ({
      verified: true as const,
      newModuleRevision: "revision-created",
      resources: candidate.resources.map(({ bytes: _bytes, ...resource }) => resource),
      moduleIfo: {
        key: candidate.moduleIfo.key,
        size: candidate.moduleIfo.candidateBytes.length,
        sha256: candidate.moduleIfo.candidateSha256,
      },
      diagnostics: [],
    })),
    compensate: jest.fn(async () => ({ restored: true, diagnostics: [] })),
    quarantine: jest.fn(async () => undefined),
  };
  const compiler = { compile: jest.fn(async () => candidate) };
  const validator = {
    version: "validator-test.v1",
    validate: jest.fn(async () => ({ valid: true as const, issues: [] as const })),
  };
  const journal = {
    begin: jest.fn(async () => undefined),
    transition: jest.fn(async () => undefined),
    recordReadback: jest.fn(async () => undefined),
    finalize: jest.fn(async () => undefined),
    readJournal: jest.fn(async () => null),
    listRecoverable: jest.fn(async () => []),
  };
  const tilesetSource = {
    resolve: jest.fn(async () => ({
      resRef: "tms01",
      fingerprintSha256: SET_FINGERPRINT,
    })),
  };
  const materializationGate = {
    resolve: jest.fn(async () =>
      options.materializationAllowed
        ? {
            persistenceStatus: "native-certified" as const,
            materializationAllowed: true as const,
            certificationId: "aur-s05-05-native-proof-test",
            blockingProofs: [] as const,
          }
        : {
            persistenceStatus:
              "structural-candidate-awaiting-native-certification" as const,
            materializationAllowed: false as const,
            certificationId: null,
            blockingProofs: [
              "runtime-canvas",
              "toolset-save-build",
              "nwn-runtime-load",
            ] as const,
          },
    ),
  };
  const tileAdmission = {
    evaluateProductionAdmission: jest.fn(async (input: Readonly<{
      candidateTileIds: readonly number[];
    }>) => admittedTileProduction(input.candidateTileIds)),
  };
  const areaRepository = { invalidateSnapshotIndex: jest.fn() };
  const areaEditing = { invalidateSnapshotCache: jest.fn() };
  const catalog = { invalidateTemplateSnapshotCaches: jest.fn() };

  const service = new AreaCreateApplicationService(
    bootstrap as unknown as ModuleSnapshotBootstrapApplicationService,
    settingsRepository as unknown as RuntimeSettingsRepositoryPort,
    authorization as unknown as AreaCreateAuthorizationPort,
    lock as unknown as AreaCreateModuleLockPort,
    idempotency as unknown as AreaCreateIdempotencyRepositoryPort,
    storage as unknown as AreaCreateTransactionStoragePort,
    compiler as unknown as AreaCreateCompilerPort,
    validator as unknown as AreaCreateCandidateValidatorPort,
    journal as unknown as AreaCreateTransactionJournalPort,
    tilesetSource as unknown as AreaCreateTilesetSourcePort,
    materializationGate as unknown as AreaCreateMaterializationGatePort,
    tileAdmission as unknown as AreaTileProductionAdmissionPort,
    areaRepository as unknown as ModuleSnapshotAreaRepository,
    areaEditing as unknown as AreaEditingApplicationService,
    catalog as unknown as CatalogApplicationService,
  );

  return {
    service,
    bootstrap,
    settingsRepository,
    authorization,
    lock,
    idempotency,
    storage,
    compiler,
    validator,
    journal,
    tilesetSource,
    materializationGate,
    tileAdmission,
    areaRepository,
    areaEditing,
    catalog,
    candidate,
  };
}

function createCommand(): AreaCreateCommand {
  const profile = getAurS0505CreationProfile();
  return {
    schemaVersion: "area-create-command.v1",
    moduleId: MODULE_ID,
    expectedModuleRevision: MODULE_REVISION,
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

function createCandidate(): AreaCreateCompiledCandidate {
  const areaBytes = Buffer.from("area");
  const ifoBytes = Buffer.from("ifo-candidate");
  return {
    areaId: "area_new",
    resources: [
      {
        extension: "are",
        key: "area_new.are",
        fileName: "area_new.are",
        resourceType: 2012,
        bytes: areaBytes,
        size: areaBytes.length,
        sha256: "1".repeat(64),
      },
    ],
    moduleIfo: {
      key: "module.ifo",
      fileName: "module.ifo",
      resourceType: 2014,
      baselineBytes: Buffer.from("ifo-baseline"),
      baselineSha256: "2".repeat(64),
      candidateBytes: ifoBytes,
      candidateSha256: "3".repeat(64),
    },
  };
}
