import {
  validateAndNormalizeAreaCreateCommand,
} from "../../src/modules/areas/domain/area-create-command.validation";
import {
  AreaCreateTransactionCoordinator,
  AreaCreateTransactionError,
} from "../../src/modules/areas/application/area-create-transaction.coordinator";
import {
  createAreaCreateIdempotencyEntry,
} from "../../src/modules/areas/domain/area-create-idempotency";
import type {
  AreaCreateTransactionDependencies,
} from "../../src/modules/areas/application/ports/area-create-transaction.port";
import {
  AreaTileProductionAdmissionSourceError,
} from "../../src/modules/areas/application/ports/area-tile-production-admission.port";
import type {
  AreaCreateReceipt,
} from "../../src/modules/areas/domain/area-create-transaction.types";
import {
  AREA_TRANSACTION_POST_BEGIN_FAULT_POINTS,
  injectAreaTransactionBeginFault,
  injectAreaTransactionPostBeginFault,
} from "./helpers/area-transaction-fault-matrix";

function admittedTileProduction() {
  return Object.freeze({
    allowed: true as const,
    code: "AREA_TILE_PRODUCTION_ADMITTED" as const,
    tilesetResRef: "tms01",
    tileIds: Object.freeze([0, 1, 2, 3]),
    diagnostics: Object.freeze([]) as readonly [],
    admission: Object.freeze({
      schemaVersion: "area-tile-production-admission.v1" as const,
      policyVersion: "area-tile-production-admission-policy.v1" as const,
      reportGeneratedAtIso: "2026-08-21T18:00:00.000Z",
      planId: "plan-01",
      corpusHash: "c".repeat(64),
      profileId: "source-bound-v7",
      ledgerSha256: "3".repeat(64),
      reportSha256: "4".repeat(64),
      tilesetResRef: "tms01",
      uniqueTileIdCount: 4,
      tileIdSetSha256: "5".repeat(64),
    }),
  });
}

function commandInput(): Record<string, unknown> {
  return {
    schemaVersion: "area-create-command.v1",
    moduleId: "module:test",
    expectedModuleRevision: "revision-7",
    creationProfile: {
      id: "profile-v1",
      fingerprintSha256: "a".repeat(64),
    },
    area: { name: "Test Area", resRef: "AREA_NEW", tag: "Area_Tag" },
    tileset: {
      resRef: "TMS01",
      setFingerprintSha256: "b".repeat(64),
    },
    dimensions: { width: 2, height: 2 },
    initializer: { algorithmVersion: "lcg.v1", seed: 7 },
    tiles: Array.from({ length: 4 }, (_, index) => ({
      row: Math.floor(index / 2),
      col: index % 2,
      tileId: index,
      orientation: 0,
      height: 0,
      mainLight1: 0,
      mainLight2: 0,
      sourceLight1: 0,
      sourceLight2: 0,
      animLoop1: 1,
      animLoop2: 1,
      animLoop3: 1,
    })),
    groupInstances: [],
    draft: {
      id: "draft:test",
      revision: 3,
      normalizedSha256: "c".repeat(64),
    },
    clientCommandId: "command:test",
  };
}

function createHarness() {
  const events: string[] = [];
  const validation = validateAndNormalizeAreaCreateCommand(commandInput());
  if (!validation.valid) {
    throw new Error("Test command must remain valid");
  }

  const candidate = {
    areaId: "area_new",
    resources: [
      resource("are", 2012, "d"),
      resource("git", 2023, "e"),
      resource("gic", 2013, "f"),
    ],
    moduleIfo: {
      key: "modules/test/module.ifo",
      fileName: "module.ifo",
      resourceType: 2014,
      baselineBytes: Buffer.from("ifo-before"),
      baselineSha256: "1".repeat(64),
      candidateBytes: Buffer.from("ifo-after"),
      candidateSha256: "2".repeat(64),
    },
  } as const;

  const dependencies: AreaCreateTransactionDependencies = {
    authorization: {
      authorize: jest.fn(async () => {
        events.push("authorize");
        return true;
      }),
    },
    lock: {
      acquire: jest.fn(async () => {
        events.push("lock.acquire");
        return {
          leaseId: "lease-1",
          moduleId: "module:test",
          ownerTransactionId: "transaction-1",
          fencingToken: 1,
          expiresAt: "2026-08-07T12:00:30.000Z",
        };
      }),
      release: jest.fn(async () => {
        events.push("lock.release");
        return true;
      }),
    },
    idempotency: {
      read: jest.fn(async () => {
        events.push("idempotency.read");
        return null;
      }),
    },
    storage: {
      readModuleState: jest.fn(async () => {
        events.push("storage.read-state");
        return {
          moduleId: "module:test",
          revision: "revision-7",
          quarantined: false,
        };
      }),
      findResourceCollisions: jest.fn(async () => {
        events.push("storage.collisions");
        return [];
      }),
      stage: jest.fn(async () => {
        events.push("storage.stage");
      }),
      commitResources: jest.fn(async () => {
        events.push("storage.commit-resources");
      }),
      commitModuleIfo: jest.fn(async () => {
        events.push("storage.commit-ifo");
      }),
      readBack: jest.fn(async () => {
        events.push("storage.readback");
        return {
          verified: true,
          newModuleRevision: "revision-8",
          resources: candidate.resources.map(({ bytes: _bytes, ...entry }) => entry),
          moduleIfo: {
            key: candidate.moduleIfo.key,
            size: candidate.moduleIfo.candidateBytes.length,
            sha256: candidate.moduleIfo.candidateSha256,
          },
          diagnostics: [],
        };
      }),
      compensate: jest.fn(async () => {
        events.push("storage.compensate");
        return { restored: true, diagnostics: [] };
      }),
      quarantine: jest.fn(async () => {
        events.push("storage.quarantine");
      }),
    },
    compiler: {
      compile: jest.fn(async () => {
        events.push("compiler.compile");
        return candidate;
      }),
    },
    validator: {
      validate: jest.fn(async () => {
        events.push("validator.validate");
        return { valid: true as const, issues: [] as const };
      }),
    },
    tileAdmission: {
      evaluateProductionAdmission: jest.fn(async () => {
        events.push("tile-admission.evaluate");
        return admittedTileProduction();
      }),
    },
    journal: {
      begin: jest.fn(async () => {
        events.push("journal.begin");
      }),
      transition: jest.fn(async (_id, state) => {
        events.push(`journal.${state}`);
      }),
      recordReadback: jest.fn(async () => {
        events.push("journal.readback_verified");
      }),
      finalize: jest.fn(async () => {
        events.push("journal.finalize");
      }),
      readJournal: jest.fn(async () => null),
      listRecoverable: jest.fn(async () => []),
    },
    ids: { nextTransactionId: () => "transaction-1" },
    clock: { nowIso: () => "2026-08-07T12:00:00.000Z" },
  };

  return {
    events,
    validation,
    candidate,
    dependencies,
    coordinator: new AreaCreateTransactionCoordinator(dependencies),
  };
}

function resource(extension: "are" | "git" | "gic", resourceType: number, hash: string) {
  const bytes = Buffer.from(extension);
  return {
    extension,
    key: `modules/test/area_new.${extension}`,
    fileName: `area_new.${extension}`,
    resourceType,
    bytes,
    size: bytes.length,
    sha256: hash.repeat(64),
  } as const;
}

function execute(harness: ReturnType<typeof createHarness>) {
  return harness.coordinator.execute({
    actorId: "actor-1",
    idempotencyKey: "area-create-1",
    ifMatchHeader: '"revision-7"',
    command: harness.validation.value,
    commandHash: harness.validation.commandHash,
  });
}

describe("Area Create transaction coordinator", () => {
  it("constructs a stable typed error with immutable empty diagnostics by default", () => {
    const error = new AreaCreateTransactionError(
      "AREA_CREATE_TRANSACTION_FAILED",
      500,
      "failure",
      false,
    );
    expect(error).toMatchObject({
      name: "AreaCreateTransactionError",
      code: "AREA_CREATE_TRANSACTION_FAILED",
      status: 500,
      message: "failure",
      mutationStarted: false,
      details: [],
    });
    expect(Object.isFrozen(error.details)).toBe(true);
  });

  it("commits resources before IFO and stores idempotency only after verified readback", async () => {
    const harness = createHarness();

    const result = await execute(harness);

    expect(result.idempotency).toBe("created");
    expect(result.receipt).toEqual(
      expect.objectContaining({
        schemaVersion: "area-create-receipt.v1",
        transactionId: "transaction-1",
        areaId: "area_new",
        moduleId: "module:test",
        previousModuleRevision: "revision-7",
        newModuleRevision: "revision-8",
        readbackStatus: "verified",
        validatorVersion: "area-create-resource-set-validator.v1",
        tileProductionAdmission: admittedTileProduction().admission,
        warnings: [],
      }),
    );
    expect(result.receipt.resources).toHaveLength(3);
    expect(harness.dependencies.journal.begin).toHaveBeenCalledWith(
      expect.objectContaining({
        tileProductionAdmission: admittedTileProduction().admission,
      }),
    );
    expect(harness.dependencies.journal.finalize).toHaveBeenCalledWith(
      "transaction-1",
      expect.objectContaining({
        leaseId: "lease-1",
        fencingToken: 1,
      }),
      expect.objectContaining({
        moduleId: "module:test",
        key: "area-create-1",
        commandHash: harness.validation.commandHash,
        result: result.receipt,
      }),
    );
    expect(harness.events).toEqual([
      "idempotency.read",
      "authorize",
      "lock.acquire",
      "idempotency.read",
      "storage.read-state",
      "storage.collisions",
      "compiler.compile",
      "validator.validate",
      "tile-admission.evaluate",
      "journal.begin",
      "storage.stage",
      "journal.staged",
      "storage.commit-resources",
      "journal.resources_committed",
      "storage.commit-ifo",
      "journal.ifo_committed",
      "storage.readback",
      "journal.readback_verified",
      "journal.finalize",
      "lock.release",
    ]);
  });

  it("replays an immutable result before authorization, locking, or storage", async () => {
    const harness = createHarness();
    const originalReceipt = receiptFixture();
    (harness.dependencies.idempotency.read as jest.Mock).mockResolvedValue(
      createAreaCreateIdempotencyEntry({
        moduleId: "module:test",
        key: "area-create-1",
        commandHash: harness.validation.commandHash,
        createdAt: "2026-08-07T12:00:00.000Z",
        result: originalReceipt,
      }),
    );

    const result = await execute(harness);

    expect(result).toEqual({ idempotency: "replayed", receipt: originalReceipt });
    expect(harness.dependencies.authorization.authorize).not.toHaveBeenCalled();
    expect(harness.dependencies.lock.acquire).not.toHaveBeenCalled();
    expect(harness.dependencies.storage.stage).not.toHaveBeenCalled();
  });

  it("rejects an idempotency payload conflict before mutation", async () => {
    const harness = createHarness();
    (harness.dependencies.idempotency.read as jest.Mock).mockResolvedValue(
      createAreaCreateIdempotencyEntry({
        moduleId: "module:test",
        key: "area-create-1",
        commandHash: "9".repeat(64),
        createdAt: "2026-08-07T12:00:00.000Z",
        result: receiptFixture(),
      }),
    );

    await expect(execute(harness)).rejects.toMatchObject({
      name: "AreaCreateTransactionError",
      code: "AREA_CREATE_IDEMPOTENCY_CONFLICT",
      status: 409,
      message: "The Idempotency-Key is already bound to a different normalized command.",
      mutationStarted: false,
      details: [
        `existing=${"9".repeat(64)}`,
        `attempted=${harness.validation.commandHash}`,
      ],
    });
    expect(harness.dependencies.lock.acquire).not.toHaveBeenCalled();
  });

  it("rejects an invalid command hash before idempotency, authorization, or locking", async () => {
    const harness = createHarness();

    await expect(
      harness.coordinator.execute({
        actorId: "actor-1",
        idempotencyKey: "area-create-1",
        ifMatchHeader: '"revision-7"',
        command: harness.validation.value,
        commandHash: "0".repeat(64),
      }),
    ).rejects.toMatchObject({
      code: "AREA_CREATE_DRAFT_INVALID",
      status: 422,
      message: "Area Create command hash does not match the normalized command.",
      mutationStarted: false,
      details: [],
    });
    expect(harness.dependencies.idempotency.read).not.toHaveBeenCalled();
    expect(harness.dependencies.authorization.authorize).not.toHaveBeenCalled();
    expect(harness.dependencies.lock.acquire).not.toHaveBeenCalled();
  });

  it("rejects a malformed idempotency key with a precise pre-mutation error", async () => {
    const harness = createHarness();
    await expect(
      harness.coordinator.execute({
        actorId: "actor-1",
        idempotencyKey: "invalid key",
        ifMatchHeader: '"revision-7"',
        command: harness.validation.value,
        commandHash: harness.validation.commandHash,
      }),
    ).rejects.toMatchObject({
      name: "AreaCreateTransactionError",
      code: "AREA_CREATE_DRAFT_INVALID",
      status: 422,
      message: "Area Create requires a valid Idempotency-Key.",
      mutationStarted: false,
      details: [],
    });
    expect(harness.dependencies.idempotency.read).not.toHaveBeenCalled();
  });

  it("enforces explicit area.create authorization before lock acquisition", async () => {
    const harness = createHarness();
    (harness.dependencies.authorization.authorize as jest.Mock).mockImplementation(async () => {
      harness.events.push("authorize");
      return false;
    });

    await expect(execute(harness)).rejects.toMatchObject({
      code: "AREA_CREATE_PERMISSION_DENIED",
      status: 403,
      message: "The actor is not permitted to create an Area in the target module.",
      mutationStarted: false,
      details: [],
    });
    expect(harness.dependencies.authorization.authorize).toHaveBeenCalledWith({
      actorId: "actor-1",
      moduleId: "module:test",
      permission: "area.create",
    });
    expect(harness.dependencies.lock.acquire).not.toHaveBeenCalled();
  });

  it("fails before module inspection when the scoped lock is unavailable", async () => {
    const harness = createHarness();
    (harness.dependencies.lock.acquire as jest.Mock).mockImplementation(async () => {
      harness.events.push("lock.acquire");
      return null;
    });

    await expect(execute(harness)).rejects.toMatchObject({
      code: "AREA_CREATE_STORAGE_UNAVAILABLE",
      status: 503,
      message: "The target module lock is unavailable.",
      mutationStarted: false,
      details: [],
    });
    expect(harness.dependencies.storage.readModuleState).not.toHaveBeenCalled();
  });

  it("rechecks idempotency under the module lock and replays without storage mutation", async () => {
    const harness = createHarness();
    const retained = createAreaCreateIdempotencyEntry({
      moduleId: "module:test",
      key: "area-create-1",
      commandHash: harness.validation.commandHash,
      createdAt: "2026-08-07T12:00:00.000Z",
      result: receiptFixture(),
    });
    (harness.dependencies.idempotency.read as jest.Mock)
      .mockImplementationOnce(async () => {
        harness.events.push("idempotency.read");
        return null;
      })
      .mockImplementationOnce(async () => {
        harness.events.push("idempotency.read");
        return retained;
      });

    const result = await execute(harness);

    expect(result.idempotency).toBe("replayed");
    expect(harness.dependencies.storage.readModuleState).not.toHaveBeenCalled();
    expect(harness.events).toEqual([
      "idempotency.read",
      "authorize",
      "lock.acquire",
      "idempotency.read",
      "lock.release",
    ]);
  });

  it("rechecks the locked current revision and releases without staging on conflict", async () => {
    const harness = createHarness();
    (harness.dependencies.storage.readModuleState as jest.Mock).mockImplementation(async () => {
      harness.events.push("storage.read-state");
      return { moduleId: "module:test", revision: "revision-8", quarantined: false };
    });

    await expect(execute(harness)).rejects.toMatchObject({
      code: "AREA_CREATE_MODULE_REVISION_CONFLICT",
      status: 412,
      message: "The target module revision changed before Area Create acquired the lock.",
      mutationStarted: false,
      details: ["expected=revision-7", "actual=revision-8"],
    });
    expect(harness.dependencies.compiler.compile).not.toHaveBeenCalled();
    expect(harness.dependencies.storage.stage).not.toHaveBeenCalled();
    expect(harness.events.at(-1)).toBe("lock.release");
  });

  it("rejects missing If-Match and a module-state scope mismatch before compilation", async () => {
    const missingHeader = createHarness();
    await expect(
      missingHeader.coordinator.execute({
        actorId: "actor-1",
        idempotencyKey: "area-create-1",
        ifMatchHeader: undefined,
        command: missingHeader.validation.value,
        commandHash: missingHeader.validation.commandHash,
      }),
    ).rejects.toMatchObject({
      code: "AREA_CREATE_DRAFT_INVALID",
      status: 422,
      message: "Area Create revision precondition is invalid: missing_if_match.",
      mutationStarted: false,
      details: [],
    });

    const scopeMismatch = createHarness();
    (scopeMismatch.dependencies.storage.readModuleState as jest.Mock).mockResolvedValue({
      moduleId: "module:other",
      revision: "revision-7",
      quarantined: false,
    });
    await expect(execute(scopeMismatch)).rejects.toMatchObject({
      code: "AREA_CREATE_TRANSACTION_FAILED",
      status: 500,
      message: "Module storage returned state for a different module.",
      mutationStarted: false,
      details: [],
    });
    expect(scopeMismatch.dependencies.storage.findResourceCollisions).not.toHaveBeenCalled();
  });

  it("rejects an independently invalid candidate before journal or storage mutation", async () => {
    const harness = createHarness();
    (harness.dependencies.validator.validate as jest.Mock).mockImplementation(async () => {
      harness.events.push("validator.validate");
      return { valid: false, issues: [{ code: "ARE_ROOT_INCOMPLETE", message: "blocked" }] };
    });

    await expect(execute(harness)).rejects.toMatchObject({
      code: "AREA_CREATE_CANDIDATE_INVALID",
      status: 422,
      message: "The compiled Area resource set failed independent validation.",
      mutationStarted: false,
      details: ["ARE_ROOT_INCOMPLETE: blocked"],
    });
    expect(harness.dependencies.journal.begin).not.toHaveBeenCalled();
    expect(harness.dependencies.storage.stage).not.toHaveBeenCalled();
  });

  it("rejects an uncertified complete candidate after independent validation and before journaling", async () => {
    const harness = createHarness();
    (harness.dependencies.tileAdmission.evaluateProductionAdmission as jest.Mock)
      .mockImplementation(async () => {
        harness.events.push("tile-admission.evaluate");
        return {
          allowed: false,
          code: "AREA_TILE_CERTIFICATION_PROOF_FAILED",
          tilesetResRef: "tms01",
          tileIds: [0, 1, 2, 3],
          diagnostics: [{
            tileId: 2,
            rowId: "tile:tms01:2",
            stage: "render",
            status: "failed",
          }],
        };
      });

    await expect(execute(harness)).rejects.toMatchObject({
      code: "AREA_TILE_CERTIFICATION_PROOF_FAILED",
      status: 422,
      mutationStarted: false,
      details: ["tileId=2;rowId=tile:tms01:2;stage=render;status=failed"],
    });
    expect(harness.dependencies.tileAdmission.evaluateProductionAdmission)
      .toHaveBeenCalledWith({
        tilesetResRef: "tms01",
        candidateTileIds: [0, 1, 2, 3],
      });
    expect(harness.dependencies.journal.begin).not.toHaveBeenCalled();
    expect(harness.dependencies.storage.stage).not.toHaveBeenCalled();
    expect(harness.dependencies.storage.compensate).not.toHaveBeenCalled();
    expect(harness.dependencies.lock.release).toHaveBeenCalledTimes(1);
  });

  it("maps an unavailable admission ledger before mutation and releases the lease", async () => {
    const harness = createHarness();
    (harness.dependencies.tileAdmission.evaluateProductionAdmission as jest.Mock)
      .mockRejectedValue(new AreaTileProductionAdmissionSourceError(
        "AREA_TILE_CERTIFICATION_LEDGER_UNAVAILABLE",
        "The Area tile-certification ledger is unavailable.",
      ));

    await expect(execute(harness)).rejects.toMatchObject({
      code: "AREA_TILE_CERTIFICATION_LEDGER_UNAVAILABLE",
      status: 503,
      mutationStarted: false,
      details: [],
    });
    expect(harness.dependencies.journal.begin).not.toHaveBeenCalled();
    expect(harness.dependencies.storage.stage).not.toHaveBeenCalled();
    expect(harness.dependencies.lock.release).toHaveBeenCalledTimes(1);
  });

  it("normalizes an unexpected compiler failure as pre-mutation and releases the lock", async () => {
    const harness = createHarness();
    (harness.dependencies.compiler.compile as jest.Mock).mockRejectedValue(
      new Error("compiler exploded"),
    );

    await expect(execute(harness)).rejects.toMatchObject({
      code: "AREA_CREATE_TRANSACTION_FAILED",
      status: 500,
      message: "compiler exploded",
      mutationStarted: false,
      details: ["compiler exploded"],
    });
    expect(harness.dependencies.journal.begin).not.toHaveBeenCalled();
    expect(harness.dependencies.storage.compensate).not.toHaveBeenCalled();
    expect(harness.events.at(-1)).toBe("lock.release");
  });

  it("rejects collisions and quarantined modules before compilation", async () => {
    const collisionHarness = createHarness();
    (collisionHarness.dependencies.storage.findResourceCollisions as jest.Mock)
      .mockResolvedValue(["modules/test/area_new.are"]);
    await expect(execute(collisionHarness)).rejects.toMatchObject({
      code: "AREA_CREATE_RESOURCE_COLLISION",
      status: 409,
      message: "One or more target Area resources already exist.",
      mutationStarted: false,
      details: ["modules/test/area_new.are"],
    });
    expect(collisionHarness.dependencies.compiler.compile).not.toHaveBeenCalled();

    const quarantineHarness = createHarness();
    (quarantineHarness.dependencies.storage.readModuleState as jest.Mock).mockResolvedValue({
      moduleId: "module:test",
      revision: "revision-7",
      quarantined: true,
    });
    await expect(execute(quarantineHarness)).rejects.toMatchObject({
      code: "AREA_CREATE_STORAGE_UNAVAILABLE",
      status: 503,
      message: "The target module is quarantined after an unresolved transaction failure.",
      mutationStarted: false,
      details: [],
    });
    expect(quarantineHarness.dependencies.storage.findResourceCollisions).not.toHaveBeenCalled();
  });

  it("fails closed when idempotency storage returns an entry from another scope", async () => {
    const harness = createHarness();
    (harness.dependencies.idempotency.read as jest.Mock).mockResolvedValue(
      createAreaCreateIdempotencyEntry({
        moduleId: "module:other",
        key: "area-create-1",
        commandHash: harness.validation.commandHash,
        createdAt: "2026-08-07T12:00:00.000Z",
        result: receiptFixture(),
      }),
    );

    await expect(execute(harness)).rejects.toMatchObject({
      code: "AREA_CREATE_TRANSACTION_FAILED",
      status: 500,
      message:
        "The idempotency repository returned an entry outside the requested module/key scope.",
      mutationStarted: false,
      details: [],
    });
    expect(harness.dependencies.authorization.authorize).not.toHaveBeenCalled();
  });

  it("preserves the readback failure code after verified compensation", async () => {
    const harness = createHarness();
    (harness.dependencies.storage.readBack as jest.Mock).mockImplementation(async () => {
      harness.events.push("storage.readback");
      return {
        verified: false,
        newModuleRevision: "revision-8",
        resources: [],
        moduleIfo: { key: "module.ifo", size: 0, sha256: "0".repeat(64) },
        diagnostics: ["ARE hash mismatch"],
      };
    });

    await expect(execute(harness)).rejects.toMatchObject({
      code: "AREA_CREATE_READBACK_FAILED",
      status: 500,
      message: "Committed Area resources failed independent readback.",
      mutationStarted: true,
      details: expect.arrayContaining(["ARE hash mismatch"]),
    });
    expect(harness.dependencies.storage.compensate).toHaveBeenCalledTimes(1);
    expect(harness.dependencies.journal.finalize).not.toHaveBeenCalled();
  });

  it("retains diagnostics from journal failures while still restoring the baseline", async () => {
    const harness = createHarness();
    (harness.dependencies.storage.commitModuleIfo as jest.Mock).mockRejectedValue(
      new Error("commit failed"),
    );
    (harness.dependencies.journal.transition as jest.Mock).mockImplementation(
      async (_id: string, state: string) => {
        harness.events.push(`journal.${state}`);
        if (state === "compensation_pending") {
          throw new Error("pending journal failed");
        }
        if (state === "compensated") {
          throw new Error("compensated journal failed");
        }
      },
    );

    await expect(execute(harness)).rejects.toMatchObject({
      code: "AREA_CREATE_TRANSACTION_FAILED",
      mutationStarted: true,
      details: expect.arrayContaining([
        "commit failed",
        "journal compensation_pending: pending journal failed",
        "journal compensated: compensated journal failed",
      ]),
    });
    expect(harness.dependencies.storage.compensate).toHaveBeenCalledTimes(1);
  });

  it("compensates when atomic finalization fails before retaining a result", async () => {
    const harness = createHarness();
    (harness.dependencies.journal.finalize as jest.Mock).mockImplementation(async () => {
      harness.events.push("journal.finalize");
      throw new Error("injected atomic finalization failure");
    });

    await expect(execute(harness)).rejects.toMatchObject({
      code: "AREA_CREATE_TRANSACTION_FAILED",
      status: 500,
      message: "Area Create failed and the baseline state was independently restored.",
      mutationStarted: true,
      details: expect.arrayContaining(["injected atomic finalization failure"]),
    });
    expect(harness.dependencies.storage.compensate).toHaveBeenCalledTimes(1);
    expect(harness.dependencies.storage.quarantine).not.toHaveBeenCalled();
  });

  it("compensates an IFO commit failure and never stores idempotent success", async () => {
    const harness = createHarness();
    (harness.dependencies.storage.commitModuleIfo as jest.Mock).mockImplementation(async () => {
      harness.events.push("storage.commit-ifo");
      throw new Error("injected IFO failure");
    });

    await expect(execute(harness)).rejects.toMatchObject({
      code: "AREA_CREATE_TRANSACTION_FAILED",
      status: 500,
      message: "Area Create failed and the baseline state was independently restored.",
      mutationStarted: true,
    });
    expect(harness.dependencies.storage.compensate).toHaveBeenCalledTimes(1);
    expect(harness.dependencies.journal.finalize).not.toHaveBeenCalled();
    expect(harness.events).toEqual(
      expect.arrayContaining([
        "journal.compensation_pending",
        "storage.compensate",
        "journal.compensated",
        "lock.release",
      ]),
    );
    expect(harness.dependencies.storage.quarantine).not.toHaveBeenCalled();
  });

  it("quarantines the module when compensation cannot prove baseline restoration", async () => {
    const harness = createHarness();
    (harness.dependencies.storage.commitModuleIfo as jest.Mock).mockRejectedValue(
      new Error("injected IFO failure"),
    );
    (harness.dependencies.storage.compensate as jest.Mock).mockImplementation(async () => {
      harness.events.push("storage.compensate");
      return { restored: false, diagnostics: ["IFO mismatch after restore"] };
    });

    await expect(execute(harness)).rejects.toMatchObject({
      code: "AREA_CREATE_ROLLBACK_FAILED",
      status: 500,
      message:
        "Area Create compensation could not prove baseline restoration; the module requires quarantine.",
      mutationStarted: true,
      details: ["IFO mismatch after restore"],
    });
    expect(harness.dependencies.storage.quarantine).toHaveBeenCalledWith(
      "module:test",
      "transaction-1",
      expect.arrayContaining(["IFO mismatch after restore"]),
      expect.objectContaining({ leaseId: "lease-1", fencingToken: 1 }),
    );
    expect(harness.dependencies.journal.finalize).not.toHaveBeenCalled();
    expect(harness.events.at(-1)).toBe("lock.release");
  });

  it("records thrown compensation/quarantine/journal failures in rollback diagnostics", async () => {
    const harness = createHarness();
    (harness.dependencies.storage.commitModuleIfo as jest.Mock).mockRejectedValue(
      new Error("commit failed"),
    );
    (harness.dependencies.storage.compensate as jest.Mock).mockRejectedValue(
      new Error("compensation exploded"),
    );
    (harness.dependencies.storage.quarantine as jest.Mock).mockRejectedValue(
      new Error("quarantine write failed"),
    );
    (harness.dependencies.journal.transition as jest.Mock).mockImplementation(
      async (_id: string, state: string) => {
        if (state === "quarantine_required") {
          throw new Error("quarantine journal failed");
        }
      },
    );

    await expect(execute(harness)).rejects.toMatchObject({
      code: "AREA_CREATE_ROLLBACK_FAILED",
      mutationStarted: true,
      details: [
        "compensation: compensation exploded",
        "quarantine: quarantine write failed",
        "journal quarantine_required: quarantine journal failed",
      ],
    });
    expect(harness.dependencies.storage.quarantine).toHaveBeenCalledTimes(1);
  });

  it("adds a deterministic diagnostic when compensation returns no explanation", async () => {
    const harness = createHarness();
    (harness.dependencies.storage.commitModuleIfo as jest.Mock).mockRejectedValue(
      new Error("commit failed"),
    );
    (harness.dependencies.storage.compensate as jest.Mock).mockResolvedValue({
      restored: false,
      diagnostics: [],
    });

    await expect(execute(harness)).rejects.toMatchObject({
      code: "AREA_CREATE_ROLLBACK_FAILED",
      details: ["Compensation did not verify restoration of the baseline state."],
    });
    expect(harness.dependencies.journal.transition).toHaveBeenCalledWith(
      "transaction-1",
      "quarantine_required",
      expect.objectContaining({ leaseId: "lease-1", fencingToken: 1 }),
    );
  });

  it("does not compensate when durable journal creation fails before mutation", async () => {
    const harness = createHarness();
    const error = injectAreaTransactionBeginFault(harness.dependencies);

    await expect(execute(harness)).rejects.toMatchObject({
      code: "AREA_CREATE_TRANSACTION_FAILED",
      mutationStarted: false,
      details: [error.message],
    });
    expect(harness.dependencies.storage.stage).not.toHaveBeenCalled();
    expect(harness.dependencies.storage.compensate).not.toHaveBeenCalled();
    expect(harness.dependencies.lock.release).toHaveBeenCalledTimes(1);
  });

  it.each(AREA_TRANSACTION_POST_BEGIN_FAULT_POINTS)(
    "compensates the complete post-begin fault boundary %s",
    async (point) => {
      const harness = createHarness();
      const error = injectAreaTransactionPostBeginFault(harness.dependencies, point);

      await expect(execute(harness)).rejects.toMatchObject({
        code: "AREA_CREATE_TRANSACTION_FAILED",
        mutationStarted: true,
        details: expect.arrayContaining([error.message]),
      });
      expect(harness.dependencies.storage.compensate).toHaveBeenCalledTimes(1);
      expect(harness.dependencies.storage.quarantine).not.toHaveBeenCalled();
      expect(harness.dependencies.lock.release).toHaveBeenCalledTimes(1);
    },
  );
});

function receiptFixture(): AreaCreateReceipt {
  return {
    schemaVersion: "area-create-receipt.v1",
    transactionId: "transaction-existing",
    areaId: "area_new",
    resRef: "area_new",
    name: "Test Area",
    tag: "Area_Tag",
    moduleId: "module:test",
    previousModuleRevision: "revision-7",
    newModuleRevision: "revision-8",
    profileId: "profile-v1",
    profileFingerprintSha256: "a".repeat(64),
    setFingerprintSha256: "b".repeat(64),
    tileProductionAdmission: admittedTileProduction().admission,
    draftNormalizedSha256: "c".repeat(64),
    commandHash: "d".repeat(64),
    validatorVersion: "validator-v1",
    resources: [],
    moduleIfo: { key: "module.ifo", size: 1, sha256: "e".repeat(64) },
    readbackStatus: "verified",
    warnings: [],
    createdAt: "2026-08-07T12:00:00.000Z",
  };
}
