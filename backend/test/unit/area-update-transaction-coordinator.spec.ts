import {
  AreaUpdateTransactionCoordinator,
} from "../../src/modules/areas/application/area-update-transaction.coordinator";
import { AreaUpdateCompilerFailure } from "../../src/modules/areas/application/area-update-candidate.compiler";
import type {
  AreaUpdateTransactionDependencies,
} from "../../src/modules/areas/application/ports/area-update-transaction.port";
import {
  AreaTileProductionAdmissionSourceError,
} from "../../src/modules/areas/application/ports/area-tile-production-admission.port";
import { createAreaCreateIdempotencyEntry } from "../../src/modules/areas/domain/area-create-idempotency";
import { validateAndNormalizeAreaUpdateCommand } from "../../src/modules/areas/domain/area-update-command.validation";
import {
  AREA_TRANSACTION_POST_BEGIN_FAULT_POINTS,
  injectAreaTransactionBeginFault,
  injectAreaTransactionPostBeginFault,
} from "./helpers/area-transaction-fault-matrix";

const REVISION_1 = "1".repeat(64);
const REVISION_2 = "2".repeat(64);

function admittedTileProduction() {
  return Object.freeze({
    allowed: true as const,
    code: "AREA_TILE_PRODUCTION_ADMITTED" as const,
    tilesetResRef: "tin01",
    tileIds: Object.freeze([2, 7]),
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
      tilesetResRef: "tin01",
      uniqueTileIdCount: 2,
      tileIdSetSha256: "5".repeat(64),
    }),
  });
}

describe("Area Update transaction coordinator", () => {
  it("publishes and reads back the exact candidate before finalizing idempotency", async () => {
    const harness = createHarness();

    const result = await execute(harness);

    expect(result.idempotency).toBe("created");
    expect(result.receipt).toMatchObject({
      schemaVersion: "area-update-receipt.v1",
      transactionId: "update-tx-01",
      areaResRef: "crypt01",
      previousModuleRevision: REVISION_1,
      newModuleRevision: REVISION_2,
      sourceAreaSha256: "a".repeat(64),
      candidateAreaSha256: "b".repeat(64),
      draft: harness.validation.value.draft,
      tileProductionAdmission: admittedTileProduction().admission,
      commandHash: harness.validation.commandHash,
      validatorVersion: "aurora-area-update-candidate-validator.v1",
      readbackStatus: "verified",
      warnings: [],
      updatedAt: "2026-08-12T12:00:00.000Z",
    });
    expect(harness.dependencies.journal.begin).toHaveBeenCalledWith({
      transactionId: "update-tx-01",
      moduleId: "workspace:module-01",
      areaResRef: "crypt01",
      actorId: "actor-01",
      idempotencyKey: "update-01",
      commandHash: harness.validation.commandHash,
      expectedModuleRevision: REVISION_1,
      sourceAreaSha256: "a".repeat(64),
      candidateAreaSha256: "b".repeat(64),
      setFingerprintSha256: "e".repeat(64),
      tileProductionAdmission: admittedTileProduction().admission,
      draftRevision: 3,
      draftNormalizedSha256: "d".repeat(64),
      leaseId: "lease-01",
      fencingToken: 1,
      candidate: harness.candidate,
      createdAt: "2026-08-12T12:00:00.000Z",
    });
    expect(harness.events).toEqual([
      "idempotency.read",
      "authorize",
      "lock.acquire",
      "idempotency.read",
      "storage.read-state",
      "compiler.compile",
      "tile-admission.evaluate",
      "journal.begin",
      "storage.stage",
      "journal.staged",
      "storage.commit-resources",
      "journal.resources_committed",
      "storage.commit-ifo",
      "journal.ifo_committed",
      "storage.readback",
      "journal.record-readback",
      "journal.finalize",
      "lock.release",
    ]);
  });

  it("carries the bounded Area audio mutation summary into the verified receipt", async () => {
    const harness = createHarness();
    const audioEnvironmentMutation = Object.freeze({
      expectedValue: Object.freeze({
        ambientSoundDayId: 41,
        ambientSoundNightId: 42,
        ambientSoundDayVolume: 101,
        ambientSoundNightVolume: 102,
        environmentAudioId: 7,
        musicBattleId: 13,
        musicDayId: 11,
        musicNightId: 12,
        musicDelayMilliseconds: 3000,
      }),
      value: Object.freeze({
        ambientSoundDayId: 41,
        ambientSoundNightId: 42,
        ambientSoundDayVolume: 55,
        ambientSoundNightVolume: 102,
        environmentAudioId: 7,
        musicBattleId: 13,
        musicDayId: 11,
        musicNightId: 12,
        musicDelayMilliseconds: -4000,
      }),
      sourceGitSha256: "1".repeat(64),
      candidateGitSha256: "c".repeat(64),
    });
    const { unchangedCompanions: _unchanged, ...changedCandidate } = harness.candidate;
    (harness.dependencies.compiler.compile as jest.Mock).mockImplementation(async () => {
      harness.events.push("compiler.compile");
      return { ...changedCandidate, audioEnvironmentMutation };
    });

    const result = await execute(harness);

    expect(result.receipt.audioEnvironmentMutation).toEqual(audioEnvironmentMutation);
    expect(harness.dependencies.journal.recordReadback).toHaveBeenCalledWith(
      "update-tx-01",
      expect.any(Object),
      expect.objectContaining({ audioEnvironmentMutation }),
    );
  });

  it("carries the bounded typed ordered Area variable summary into the verified receipt", async () => {
    const harness = createHarness();
    const variableMutation = Object.freeze({
      expectedEntries: Object.freeze([
        Object.freeze({ sourceIndex: 0, name: "COUNT", type: "int" as const, value: 3 }),
      ]),
      entries: Object.freeze([
        Object.freeze({ name: "COUNT", type: "int" as const, value: 7 }),
      ]),
      sourceGitSha256: "1".repeat(64),
      candidateGitSha256: "c".repeat(64),
    });
    const { unchangedCompanions: _unchanged, ...changedCandidate } = harness.candidate;
    (harness.dependencies.compiler.compile as jest.Mock).mockImplementation(async () => {
      harness.events.push("compiler.compile");
      return { ...changedCandidate, variableMutation };
    });

    const result = await execute(harness);

    expect(result.receipt.variableMutation).toEqual(variableMutation);
    expect(harness.dependencies.journal.recordReadback).toHaveBeenCalledWith(
      "update-tx-01",
      expect.any(Object),
      expect.objectContaining({ variableMutation }),
    );
  });

  it("rejects an uncertified complete candidate under the lease before journal or staging", async () => {
    const harness = createHarness();
    (harness.dependencies.tileAdmission.evaluateProductionAdmission as jest.Mock)
      .mockImplementation(async () => {
        harness.events.push("tile-admission.evaluate");
        return {
          allowed: false,
          code: "AREA_TILE_CERTIFICATION_ROW_MISSING",
          tilesetResRef: "tin01",
          tileIds: [2, 7, 99],
          diagnostics: [{ tileId: 99, stage: "row", status: "missing" }],
        };
      });

    await expect(execute(harness)).rejects.toMatchObject({
      code: "AREA_TILE_CERTIFICATION_ROW_MISSING",
      status: 422,
      mutationStarted: false,
      details: ["tileId=99;stage=row;status=missing"],
    });
    expect(harness.dependencies.tileAdmission.evaluateProductionAdmission)
      .toHaveBeenCalledWith({
        tilesetResRef: "tin01",
        candidateTileIds: [7, 2, 7],
      });
    expect(harness.dependencies.journal.begin).not.toHaveBeenCalled();
    expect(harness.dependencies.storage.stage).not.toHaveBeenCalled();
    expect(harness.dependencies.storage.compensate).not.toHaveBeenCalled();
    expect(harness.dependencies.lock.release).toHaveBeenCalledTimes(1);
    expect(harness.events).toEqual([
      "idempotency.read",
      "authorize",
      "lock.acquire",
      "idempotency.read",
      "storage.read-state",
      "compiler.compile",
      "tile-admission.evaluate",
      "lock.release",
    ]);
  });

  it("maps a ledger source failure without beginning mutation and still releases the lease", async () => {
    const harness = createHarness();
    (harness.dependencies.tileAdmission.evaluateProductionAdmission as jest.Mock)
      .mockImplementation(async () => {
        harness.events.push("tile-admission.evaluate");
        throw new AreaTileProductionAdmissionSourceError(
          "AREA_TILE_CERTIFICATION_LEDGER_UNAVAILABLE",
          "The Area tile-certification ledger is unavailable.",
        );
      });

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

  it("replays a retained receipt without authorization, lock, or publication", async () => {
    const harness = createHarness();
    (harness.dependencies.idempotency.read as jest.Mock).mockResolvedValue(
      createAreaCreateIdempotencyEntry({
        moduleId: "workspace:module-01",
        key: "update-01",
        commandHash: harness.validation.commandHash,
        createdAt: "2026-08-12T12:00:00.000Z",
        result: harness.receipt,
      }),
    );

    const result = await execute(harness);

    expect(result).toEqual({ idempotency: "replayed", receipt: harness.receipt });
    expect(harness.dependencies.authorization.authorize).not.toHaveBeenCalled();
    expect(harness.dependencies.lock.acquire).not.toHaveBeenCalled();
    expect(harness.dependencies.storage.stage).not.toHaveBeenCalled();
  });

  it("fails before compilation when the strong revision precondition is stale", async () => {
    const harness = createHarness();
    (harness.dependencies.storage.readModuleState as jest.Mock).mockResolvedValue({
      moduleId: "workspace:module-01",
      revision: REVISION_2,
      quarantined: false,
    });

    await expect(execute(harness)).rejects.toMatchObject({
      code: "AREA_UPDATE_MODULE_REVISION_CONFLICT",
      status: 412,
      mutationStarted: false,
    });
    expect(harness.dependencies.compiler.compile).not.toHaveBeenCalled();
    expect(harness.dependencies.storage.stage).not.toHaveBeenCalled();
    expect(harness.events.at(-1)).toBe("lock.release");
  });

  it("restores the baseline when exact published readback fails", async () => {
    const harness = createHarness();
    (harness.dependencies.storage.readBack as jest.Mock).mockImplementation(async () => {
      harness.events.push("storage.readback");
      return {
        verified: false,
        newModuleRevision: REVISION_2,
        resources: [],
        moduleIfo: { key: "module.ifo", size: 0, sha256: "0".repeat(64) },
        diagnostics: ["ARE_UPDATE_READBACK_MISMATCH"],
      };
    });

    await expect(execute(harness)).rejects.toMatchObject({
      code: "AREA_UPDATE_READBACK_FAILED",
      status: 500,
      mutationStarted: true,
      details: expect.arrayContaining(["ARE_UPDATE_READBACK_MISMATCH"]),
    });
    expect(harness.dependencies.storage.compensate).toHaveBeenCalledTimes(1);
    expect(harness.dependencies.storage.quarantine).not.toHaveBeenCalled();
    expect(harness.dependencies.journal.finalize).not.toHaveBeenCalled();
  });

  it("quarantines the module when baseline restoration cannot be proved", async () => {
    const harness = createHarness();
    (harness.dependencies.storage.commitModuleIfo as jest.Mock).mockRejectedValue(
      new Error("head publication failed"),
    );
    (harness.dependencies.storage.compensate as jest.Mock).mockResolvedValue({
      restored: false,
      diagnostics: ["BASELINE_UNPROVEN"],
    });

    await expect(execute(harness)).rejects.toMatchObject({
      code: "AREA_UPDATE_ROLLBACK_FAILED",
      status: 500,
      mutationStarted: true,
      details: expect.arrayContaining(["BASELINE_UNPROVEN"]),
    });
    expect(harness.dependencies.storage.quarantine).toHaveBeenCalledTimes(1);
    expect(harness.dependencies.journal.transition).toHaveBeenCalledWith(
      "update-tx-01",
      "quarantine_required",
      expect.any(Object),
    );
  });

  it.each([
    ["", 401],
    ["actor-01", 403],
  ] as const)("rejects an unauthorized actor %p before lock acquisition", async (actorId, status) => {
    const harness = createHarness();
    (harness.dependencies.authorization.authorize as jest.Mock).mockResolvedValue(false);

    await expect(execute(harness, { actorId })).rejects.toMatchObject({
      code: "AREA_UPDATE_PERMISSION_DENIED",
      status,
      mutationStarted: false,
    });
    if (actorId) {
      expect(harness.dependencies.authorization.authorize).toHaveBeenCalledWith({
        actorId,
        moduleId: "workspace:module-01",
        permission: "area.materialize.update",
      });
    } else {
      expect(harness.dependencies.authorization.authorize).not.toHaveBeenCalled();
    }
    expect(harness.dependencies.lock.acquire).not.toHaveBeenCalled();
  });

  it("rejects malformed idempotency and a forged normalized-command hash", async () => {
    const malformed = createHarness();
    await expect(execute(malformed, { idempotencyKey: "bad key" })).rejects.toMatchObject({
      code: "AREA_UPDATE_INVALID",
      status: 422,
      mutationStarted: false,
    });
    expect(malformed.dependencies.idempotency.read).not.toHaveBeenCalled();

    const forged = createHarness();
    await expect(execute(forged, { commandHash: "0".repeat(64) })).rejects.toMatchObject({
      code: "AREA_UPDATE_INVALID",
      status: 422,
      mutationStarted: false,
    });
    expect(forged.dependencies.idempotency.read).not.toHaveBeenCalled();
  });

  it("rejects retained idempotency conflicts and repository scope corruption", async () => {
    const conflict = createHarness();
    (conflict.dependencies.idempotency.read as jest.Mock).mockResolvedValue({
      moduleId: "workspace:module-01",
      key: "update-01",
      commandHash: "0".repeat(64),
      createdAt: "2026-08-12T11:00:00.000Z",
      result: conflict.receipt,
    });
    await expect(execute(conflict)).rejects.toMatchObject({
      code: "AREA_UPDATE_IDEMPOTENCY_CONFLICT",
      status: 409,
      details: [
        `existing=${"0".repeat(64)}`,
        `attempted=${conflict.validation.commandHash}`,
      ],
    });

    const corrupt = createHarness();
    (corrupt.dependencies.idempotency.read as jest.Mock).mockResolvedValue({
      moduleId: "workspace:other",
      key: "update-01",
      commandHash: corrupt.validation.commandHash,
      createdAt: "2026-08-12T11:00:00.000Z",
      result: corrupt.receipt,
    });
    await expect(execute(corrupt)).rejects.toMatchObject({
      code: "AREA_UPDATE_TRANSACTION_FAILED",
      status: 500,
      mutationStarted: false,
    });
  });

  it("rechecks idempotency inside the lock and releases without compiling on a concurrent replay", async () => {
    const harness = createHarness();
    const retained = createAreaCreateIdempotencyEntry({
      moduleId: "workspace:module-01",
      key: "update-01",
      commandHash: harness.validation.commandHash,
      createdAt: "2026-08-12T12:00:00.000Z",
      result: harness.receipt,
    });
    (harness.dependencies.idempotency.read as jest.Mock)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(retained);

    await expect(execute(harness)).resolves.toEqual({
      idempotency: "replayed",
      receipt: harness.receipt,
    });
    expect(harness.dependencies.storage.readModuleState).not.toHaveBeenCalled();
    expect(harness.dependencies.compiler.compile).not.toHaveBeenCalled();
    expect(harness.dependencies.lock.release).toHaveBeenCalledTimes(1);
  });

  it("fails closed for lock contention, quarantined storage, and cross-module storage state", async () => {
    const locked = createHarness();
    (locked.dependencies.lock.acquire as jest.Mock).mockResolvedValue(null);
    await expect(execute(locked)).rejects.toMatchObject({
      code: "AREA_UPDATE_STORAGE_UNAVAILABLE",
      status: 503,
      mutationStarted: false,
    });

    for (const state of [
      { moduleId: "workspace:module-01", revision: REVISION_1, quarantined: true },
      { moduleId: "workspace:other", revision: REVISION_1, quarantined: false },
    ]) {
      const harness = createHarness();
      (harness.dependencies.storage.readModuleState as jest.Mock).mockResolvedValue(state);
      await expect(execute(harness)).rejects.toMatchObject({
        code: state.quarantined ? "AREA_UPDATE_STORAGE_UNAVAILABLE" : "AREA_UPDATE_TRANSACTION_FAILED",
        status: state.quarantined ? 503 : 500,
        mutationStarted: false,
      });
      expect(harness.dependencies.compiler.compile).not.toHaveBeenCalled();
      expect(harness.dependencies.lock.release).toHaveBeenCalledTimes(1);
    }
  });

  it.each([undefined, "not-an-etag", `"${REVISION_2}"`])(
    "rejects invalid revision precondition %p without mutation",
    async (ifMatchHeader) => {
      const harness = createHarness();
      await expect(execute(harness, { ifMatchHeader })).rejects.toMatchObject({
        code: "AREA_UPDATE_INVALID",
        status: 422,
        mutationStarted: false,
      });
      expect(harness.dependencies.compiler.compile).not.toHaveBeenCalled();
      expect(harness.dependencies.lock.release).toHaveBeenCalledTimes(1);
    },
  );

  it("preserves a typed compiler failure before the mutation starts", async () => {
    const harness = createHarness();
    (harness.dependencies.compiler.compile as jest.Mock).mockRejectedValue(
      new AreaUpdateCompilerFailure(
        "AREA_UPDATE_SOURCE_STALE",
        412,
        "source changed",
        ["expected=a", "actual=b"],
      ),
    );

    await expect(execute(harness)).rejects.toMatchObject({
      code: "AREA_UPDATE_SOURCE_STALE",
      status: 412,
      message: "source changed",
      details: ["expected=a", "actual=b"],
      mutationStarted: false,
    });
    expect(harness.dependencies.storage.compensate).not.toHaveBeenCalled();
  });

  it("compensates a stage failure and retains the original typed error", async () => {
    const harness = createHarness();
    (harness.dependencies.storage.stage as jest.Mock).mockRejectedValue(
      new AreaUpdateCompilerFailure("AREA_UPDATE_STORAGE_UNAVAILABLE", 503, "stage failed"),
    );

    await expect(execute(harness)).rejects.toMatchObject({
      code: "AREA_UPDATE_STORAGE_UNAVAILABLE",
      status: 503,
      mutationStarted: true,
    });
    expect(harness.dependencies.journal.transition).toHaveBeenCalledWith(
      "update-tx-01",
      "compensation_pending",
      expect.any(Object),
    );
    expect(harness.dependencies.storage.compensate).toHaveBeenCalledTimes(1);
    expect(harness.dependencies.journal.transition).toHaveBeenCalledWith(
      "update-tx-01",
      "compensated",
      expect.any(Object),
    );
  });

  it("does not compensate when durable journal creation fails before mutation starts", async () => {
    const harness = createHarness();
    (harness.dependencies.journal.begin as jest.Mock).mockRejectedValue(
      new Error("journal unavailable"),
    );

    await expect(execute(harness)).rejects.toMatchObject({
      name: "AreaUpdateTransactionError",
      code: "AREA_UPDATE_TRANSACTION_FAILED",
      status: 500,
      message: "journal unavailable",
      mutationStarted: false,
      details: ["journal unavailable"],
    });
    expect(harness.dependencies.storage.stage).not.toHaveBeenCalled();
    expect(harness.dependencies.storage.compensate).not.toHaveBeenCalled();
    expect(harness.dependencies.lock.release).toHaveBeenCalledTimes(1);
  });

  it("normalizes an untyped stage failure after independently restored compensation", async () => {
    const harness = createHarness();
    (harness.dependencies.storage.stage as jest.Mock).mockRejectedValue("disk offline");

    await expect(execute(harness)).rejects.toMatchObject({
      code: "AREA_UPDATE_TRANSACTION_FAILED",
      status: 500,
      message: "Area Update failed and the baseline state was independently restored.",
      mutationStarted: true,
      details: ["disk offline"],
    });
    expect(harness.dependencies.storage.compensate).toHaveBeenCalledTimes(1);
  });

  it("retains a terminal-journal diagnostic when restoration succeeds but compensated recording fails", async () => {
    const harness = createHarness();
    (harness.dependencies.storage.stage as jest.Mock).mockRejectedValue("disk offline");
    (harness.dependencies.journal.transition as jest.Mock).mockImplementation(
      async (_transactionId: string, state: string) => {
        if (state === "compensated") throw new Error("terminal journal unavailable");
      },
    );

    await expect(execute(harness)).rejects.toMatchObject({
      code: "AREA_UPDATE_TRANSACTION_FAILED",
      mutationStarted: true,
      details: ["disk offline", "journal compensated: terminal journal unavailable"],
    });
  });

  it("surfaces bounded diagnostics when compensation and quarantine bookkeeping fail", async () => {
    const harness = createHarness();
    (harness.dependencies.storage.commitModuleIfo as jest.Mock).mockRejectedValue("publish failed");
    (harness.dependencies.journal.transition as jest.Mock).mockImplementation(
      async (_transactionId: string, state: string) => {
        if (state === "compensation_pending") {
          throw new Error("pending journal unavailable");
        }
        if (state === "quarantine_required") {
          throw new Error("quarantine journal unavailable");
        }
      },
    );
    (harness.dependencies.storage.compensate as jest.Mock).mockRejectedValue(
      new Error("restore unavailable"),
    );
    (harness.dependencies.storage.quarantine as jest.Mock).mockRejectedValue(
      new Error("quarantine unavailable"),
    );

    await expect(execute(harness)).rejects.toMatchObject({
      code: "AREA_UPDATE_ROLLBACK_FAILED",
      mutationStarted: true,
      details: [
        "journal compensation_pending: pending journal unavailable",
        "compensation: restore unavailable",
        "quarantine: quarantine unavailable",
        "journal quarantine_required: quarantine journal unavailable",
      ],
    });
    expect(harness.dependencies.lock.release).toHaveBeenCalledTimes(1);
  });

  it("does not compensate when durable journal creation fails before mutation", async () => {
    const harness = createHarness();
    const error = injectAreaTransactionBeginFault(harness.dependencies);

    await expect(execute(harness)).rejects.toMatchObject({
      code: "AREA_UPDATE_TRANSACTION_FAILED",
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
        code: "AREA_UPDATE_TRANSACTION_FAILED",
        mutationStarted: true,
        details: expect.arrayContaining([error.message]),
      });
      expect(harness.dependencies.storage.compensate).toHaveBeenCalledTimes(1);
      expect(harness.dependencies.storage.quarantine).not.toHaveBeenCalled();
      expect(harness.dependencies.lock.release).toHaveBeenCalledTimes(1);
    },
  );
});

function createHarness() {
  const events: string[] = [];
  const validation = validateAndNormalizeAreaUpdateCommand({
    schemaVersion: "area-update-command.v1",
    moduleId: "workspace:module-01",
    areaResRef: "crypt01",
    expectedModuleRevision: REVISION_1,
    draft: { id: "draft-01", revision: 3, normalizedSha256: "d".repeat(64) },
    clientCommandId: "client-command-01",
  });
  if (!validation.valid) throw new Error("Test command must remain valid.");
  const candidate = {
    areaId: "crypt01",
    sourceAreaSha256: "a".repeat(64),
    candidateAreaSha256: "b".repeat(64),
    setFingerprintSha256: "e".repeat(64),
    projectedDraft: {
      areaResRef: "crypt01",
      name: "Crypt 01",
      width: 3,
      height: 1,
      tilesetResRef: "tin01",
      tilesetFingerprint: "e".repeat(64),
      areaFingerprint: "a".repeat(64),
      tiles: [
        { row: 0, col: 0, tileId: 7, orientation: 0, height: 0 },
        { row: 0, col: 1, tileId: 2, orientation: 0, height: 0 },
        { row: 0, col: 2, tileId: 7, orientation: 0, height: 0 },
      ],
    },
    unchangedCompanions: {
      gitSha256: "c".repeat(64),
      gicSha256: "f".repeat(64),
      moduleIfoSha256: "9".repeat(64),
    },
    resources: [
      resource("are", 2012, "are", "b"),
      resource("git", 2023, "git", "c"),
      resource("gic", 2046, "gic", "f"),
    ],
    moduleIfo: {
      key: "module.ifo",
      fileName: "module.ifo",
      resourceType: 2014,
      baselineBytes: Buffer.from("ifo"),
      baselineSha256: "9".repeat(64),
      candidateBytes: Buffer.from("ifo"),
      candidateSha256: "9".repeat(64),
    },
  } as const;
  const receipt = {
    schemaVersion: "area-update-receipt.v1" as const,
    transactionId: "update-tx-01",
    areaResRef: "crypt01",
    moduleId: "workspace:module-01",
    previousModuleRevision: REVISION_1,
    newModuleRevision: REVISION_2,
    sourceAreaSha256: "a".repeat(64),
    candidateAreaSha256: "b".repeat(64),
    draft: validation.value.draft,
    setFingerprintSha256: "e".repeat(64),
    tileProductionAdmission: admittedTileProduction().admission,
    commandHash: validation.commandHash,
    validatorVersion: "aurora-area-update-candidate-validator.v1",
    resources: candidate.resources.map(({ bytes: _bytes, ...entry }) => entry),
    moduleIfo: {
      key: "module.ifo",
      size: candidate.moduleIfo.candidateBytes.length,
      sha256: candidate.moduleIfo.candidateSha256,
    },
    unchangedCompanions: candidate.unchangedCompanions,
    readbackStatus: "verified" as const,
    warnings: [] as const,
    updatedAt: "2026-08-12T12:00:00.000Z",
  };
  const dependencies: AreaUpdateTransactionDependencies = {
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
          leaseId: "lease-01",
          moduleId: "workspace:module-01",
          ownerTransactionId: "update-tx-01",
          fencingToken: 1,
          expiresAt: "2026-08-12T12:00:30.000Z",
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
        return { moduleId: "workspace:module-01", revision: REVISION_1, quarantined: false };
      }),
      stage: jest.fn(async () => { events.push("storage.stage"); }),
      commitResources: jest.fn(async () => { events.push("storage.commit-resources"); }),
      commitModuleIfo: jest.fn(async () => { events.push("storage.commit-ifo"); }),
      readBack: jest.fn(async () => {
        events.push("storage.readback");
        return {
          verified: true,
          newModuleRevision: REVISION_2,
          resources: candidate.resources.map(({ bytes: _bytes, ...entry }) => entry),
          moduleIfo: {
            key: "module.ifo",
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
      quarantine: jest.fn(async () => { events.push("storage.quarantine"); }),
    },
    compiler: {
      compile: jest.fn(async () => {
        events.push("compiler.compile");
        return candidate;
      }),
    },
    tileAdmission: {
      evaluateProductionAdmission: jest.fn(async () => {
        events.push("tile-admission.evaluate");
        return admittedTileProduction();
      }),
    },
    journal: {
      begin: jest.fn(async () => { events.push("journal.begin"); }),
      transition: jest.fn(async (_id, state) => { events.push(`journal.${state}`); }),
      recordReadback: jest.fn(async () => { events.push("journal.record-readback"); }),
      finalize: jest.fn(async () => { events.push("journal.finalize"); }),
      readJournal: jest.fn(async () => null),
      listRecoverable: jest.fn(async () => []),
    },
    ids: { nextTransactionId: () => "update-tx-01" },
    clock: { nowIso: () => "2026-08-12T12:00:00.000Z" },
  };
  return {
    events,
    validation,
    candidate,
    receipt,
    dependencies,
    coordinator: new AreaUpdateTransactionCoordinator(dependencies),
  };
}

function execute(
  harness: ReturnType<typeof createHarness>,
  overrides: Partial<{
    actorId: string;
    idempotencyKey: string;
    ifMatchHeader: string | undefined;
    commandHash: string;
  }> = {},
) {
  return harness.coordinator.execute({
    actorId: overrides.actorId ?? "actor-01",
    idempotencyKey: overrides.idempotencyKey ?? "update-01",
    ifMatchHeader: Object.prototype.hasOwnProperty.call(overrides, "ifMatchHeader")
      ? overrides.ifMatchHeader
      : `"${REVISION_1}"`,
    command: harness.validation.value,
    commandHash: overrides.commandHash ?? harness.validation.commandHash,
  });
}

function resource(
  extension: "are" | "git" | "gic",
  resourceType: number,
  value: string,
  hashSeed: string,
) {
  const bytes = Buffer.from(value);
  return {
    extension,
    key: `crypt01.${extension}`,
    fileName: `crypt01.${extension}`,
    resourceType,
    bytes,
    size: bytes.length,
    sha256: hashSeed.repeat(64),
  } as const;
}
