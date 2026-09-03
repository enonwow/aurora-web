import { createHash } from "node:crypto";
import {
  canonicalizeAreaUpdateCommand,
} from "../domain/area-update-command.validation";
import {
  createAreaCreateIdempotencyEntry,
  parseAreaCreateIdempotencyKey,
  resolveAreaCreateIdempotency,
} from "../domain/area-create-idempotency";
import { checkAreaCreateRevisionPrecondition } from "../domain/area-create-preconditions";
import {
  AREA_UPDATE_RECEIPT_SCHEMA_VERSION,
  type AreaUpdateCompiledCandidate,
  type AreaUpdateExecutionInput,
  type AreaUpdateExecutionResult,
  type AreaUpdateModuleState,
  type AreaUpdateReceipt,
} from "../domain/area-update-transaction.types";
import {
  AURORA_AREA_UPDATE_CANDIDATE_VALIDATOR_VERSION,
} from "../adapters/outbound/blob/aurora-area-update-candidate-validator";
import { AreaUpdateCompilerFailure } from "./area-update-candidate.compiler";
import type {
  AreaUpdateIdempotencyRepositoryPort,
  AreaUpdateTransactionDependencies,
} from "./ports/area-update-transaction.port";
import type { AreaCreateModuleLease } from "./ports/area-create-transaction.port";
import {
  AreaTileProductionAdmissionSourceError,
  type AreaTileProductionAdmissionSourceErrorCode,
} from "./ports/area-tile-production-admission.port";
import type {
  AreaTileProductionAdmissionBlockerCode,
} from "./area-tile-production-admission.policy";
import {
  areaTileProductionAdmissionDiagnosticMessages,
} from "./area-tile-production-admission.diagnostics";

export type AreaUpdateTransactionErrorCode =
  | "AREA_UPDATE_INVALID"
  | "AREA_UPDATE_PERMISSION_DENIED"
  | "AREA_UPDATE_IDEMPOTENCY_CONFLICT"
  | "AREA_UPDATE_DRAFT_NOT_FOUND"
  | "AREA_UPDATE_DRAFT_REVISION_CONFLICT"
  | "AREA_UPDATE_MODULE_REVISION_CONFLICT"
  | "AREA_UPDATE_SOURCE_MISSING"
  | "AREA_UPDATE_SOURCE_STALE"
  | "AREA_UPDATE_TILESET_STALE"
  | "AREA_UPDATE_COMPANION_MISSING"
  | "AREA_UPDATE_COMPANION_MISMATCH"
  | "AREA_UPDATE_OBJECT_MUTATION_INVALID"
  | "AREA_UPDATE_CANDIDATE_INVALID"
  | "AREA_UPDATE_READBACK_FAILED"
  | "AREA_UPDATE_TRANSACTION_FAILED"
  | "AREA_UPDATE_ROLLBACK_FAILED"
  | "AREA_UPDATE_STORAGE_UNAVAILABLE"
  | AreaTileProductionAdmissionBlockerCode
  | AreaTileProductionAdmissionSourceErrorCode;

export class AreaUpdateTransactionError extends Error {
  readonly details: readonly string[];

  constructor(
    readonly code: AreaUpdateTransactionErrorCode,
    readonly status: number,
    message: string,
    readonly mutationStarted: boolean,
    details: readonly string[] = [],
  ) {
    super(message);
    this.name = "AreaUpdateTransactionError";
    this.details = Object.freeze([...details]);
  }
}

export class AreaUpdateTransactionCoordinator {
  constructor(private readonly dependencies: AreaUpdateTransactionDependencies) {}

  async execute(input: AreaUpdateExecutionInput): Promise<AreaUpdateExecutionResult> {
    const keyResult = parseAreaCreateIdempotencyKey(input.idempotencyKey);
    if (!keyResult.valid) {
      throw transactionError(
        "AREA_UPDATE_INVALID",
        422,
        "Area Update requires a valid Idempotency-Key.",
        false,
      );
    }
    const computedCommandHash = createHash("sha256")
      .update(canonicalizeAreaUpdateCommand(input.command), "utf8")
      .digest("hex");
    if (computedCommandHash !== input.commandHash) {
      throw transactionError(
        "AREA_UPDATE_INVALID",
        422,
        "Area Update command hash does not match the normalized command.",
        false,
      );
    }

    const attempt = {
      moduleId: input.command.moduleId,
      key: keyResult.value,
      commandHash: computedCommandHash,
    };
    const preflight = await resolveStoredIdempotency(this.dependencies.idempotency, attempt);
    if (preflight) return preflight;

    if (
      !input.actorId ||
      !(await this.dependencies.authorization.authorize({
        actorId: input.actorId,
        moduleId: input.command.moduleId,
        permission: "area.materialize.update",
      }))
    ) {
      throw transactionError(
        "AREA_UPDATE_PERMISSION_DENIED",
        input.actorId ? 403 : 401,
        "The actor is not permitted to update the target Area.",
        false,
      );
    }

    const transactionId = this.dependencies.ids.nextTransactionId();
    const lease = await this.dependencies.lock.acquire(
      input.command.moduleId,
      transactionId,
    );
    if (!lease) {
      throw transactionError(
        "AREA_UPDATE_STORAGE_UNAVAILABLE",
        503,
        "The target module lock is unavailable.",
        false,
      );
    }
    return this.executeLocked(
      input,
      computedCommandHash,
      keyResult.value,
      transactionId,
      lease,
    );
  }

  private async executeLocked(
    input: AreaUpdateExecutionInput,
    commandHash: string,
    idempotencyKey: string,
    transactionId: string,
    lease: AreaCreateModuleLease,
  ): Promise<AreaUpdateExecutionResult> {
    let mutationStarted = false;
    let candidate: AreaUpdateCompiledCandidate | undefined;
    try {
      const replay = await resolveStoredIdempotency(this.dependencies.idempotency, {
        moduleId: input.command.moduleId,
        key: idempotencyKey,
        commandHash,
      });
      if (replay) return replay;

      const moduleState = await this.dependencies.storage.readModuleState(
        input.command.moduleId,
      );
      validateModuleState(input.command.moduleId, moduleState);
      if (moduleState.quarantined) {
        throw transactionError(
          "AREA_UPDATE_STORAGE_UNAVAILABLE",
          503,
          "The target module is quarantined after an unresolved transaction failure.",
          false,
        );
      }
      const precondition = checkAreaCreateRevisionPrecondition({
        ifMatchHeader: input.ifMatchHeader,
        expectedModuleRevision: input.command.expectedModuleRevision,
        currentModuleRevision: moduleState.revision,
      });
      if (!precondition.matched) {
        if (precondition.code === "stale_revision") {
          throw transactionError(
            "AREA_UPDATE_MODULE_REVISION_CONFLICT",
            412,
            "The module revision changed before Area Update acquired the lock.",
            false,
            [
              `expected=${precondition.expected ?? ""}`,
              `actual=${precondition.actual ?? ""}`,
            ],
          );
        }
        throw transactionError(
          "AREA_UPDATE_INVALID",
          422,
          `Area Update revision precondition is invalid: ${precondition.code}.`,
          false,
        );
      }

      candidate = await this.dependencies.compiler.compile(
        input.command,
        moduleState,
        input.actorId,
        transactionId,
      );
      let tileAdmission;
      try {
        tileAdmission = await this.dependencies.tileAdmission.evaluateProductionAdmission({
          tilesetResRef: candidate.projectedDraft.tilesetResRef,
          candidateTileIds: candidate.projectedDraft.tiles.map((tile) => tile.tileId),
        });
      } catch (error) {
        if (error instanceof AreaTileProductionAdmissionSourceError) {
          throw transactionError(
            error.code,
            503,
            error.message,
            false,
          );
        }
        throw error;
      }
      if (!tileAdmission.allowed) {
        throw transactionError(
          tileAdmission.code,
          422,
          "The complete Area candidate is not admitted for production materialization.",
          false,
          areaTileProductionAdmissionDiagnosticMessages(tileAdmission.diagnostics),
        );
      }
      const updatedAt = this.dependencies.clock.nowIso();
      await this.dependencies.journal.begin({
        transactionId,
        moduleId: input.command.moduleId,
        areaResRef: input.command.areaResRef,
        actorId: input.actorId,
        idempotencyKey,
        commandHash,
        expectedModuleRevision: input.command.expectedModuleRevision,
        sourceAreaSha256: candidate.sourceAreaSha256,
        candidateAreaSha256: candidate.candidateAreaSha256,
        setFingerprintSha256: candidate.setFingerprintSha256,
        tileProductionAdmission: tileAdmission.admission,
        draftRevision: input.command.draft.revision,
        draftNormalizedSha256: input.command.draft.normalizedSha256,
        leaseId: lease.leaseId,
        fencingToken: lease.fencingToken,
        candidate,
        createdAt: updatedAt,
      });

      mutationStarted = true;
      await this.dependencies.storage.stage(
        transactionId,
        input.command.moduleId,
        candidate,
        lease,
      );
      await this.dependencies.journal.transition(transactionId, "staged", lease);
      await this.dependencies.storage.commitResources(
        transactionId,
        input.command.moduleId,
        candidate,
        lease,
      );
      await this.dependencies.journal.transition(
        transactionId,
        "resources_committed",
        lease,
      );
      await this.dependencies.storage.commitModuleIfo(
        transactionId,
        input.command.moduleId,
        candidate,
        lease,
      );
      await this.dependencies.journal.transition(transactionId, "ifo_committed", lease);

      const readback = await this.dependencies.storage.readBack(
        transactionId,
        input.command.moduleId,
        candidate,
        lease,
      );
      if (!readback.verified) {
        throw transactionError(
          "AREA_UPDATE_READBACK_FAILED",
          500,
          "Committed Area Update resources failed independent readback.",
          true,
          readback.diagnostics,
        );
      }
      const receipt: AreaUpdateReceipt = Object.freeze({
        schemaVersion: AREA_UPDATE_RECEIPT_SCHEMA_VERSION,
        transactionId,
        areaResRef: input.command.areaResRef,
        moduleId: input.command.moduleId,
        previousModuleRevision: moduleState.revision,
        newModuleRevision: readback.newModuleRevision,
        sourceAreaSha256: candidate.sourceAreaSha256,
        candidateAreaSha256: candidate.candidateAreaSha256,
        draft: Object.freeze({ ...input.command.draft }),
        setFingerprintSha256: candidate.setFingerprintSha256,
        tileProductionAdmission: tileAdmission.admission,
        commandHash,
        validatorVersion: AURORA_AREA_UPDATE_CANDIDATE_VALIDATOR_VERSION,
        resources: readback.resources,
        moduleIfo: readback.moduleIfo,
        ...(candidate.unchangedCompanions
          ? { unchangedCompanions: candidate.unchangedCompanions }
          : {}),
        ...(candidate.objectMutation ? { objectMutation: candidate.objectMutation } : {}),
        ...(candidate.moduleStartLocationMutation
          ? { moduleStartLocationMutation: candidate.moduleStartLocationMutation }
          : {}),
        ...(candidate.audioEnvironmentMutation
          ? { audioEnvironmentMutation: candidate.audioEnvironmentMutation }
          : {}),
        ...(candidate.variableMutation
          ? { variableMutation: candidate.variableMutation }
          : {}),
        ...(candidate.visualEnvironmentCatalogSelectionMutation
          ? {
              visualEnvironmentCatalogSelectionMutation:
                candidate.visualEnvironmentCatalogSelectionMutation,
            }
          : {}),
        readbackStatus: "verified",
        warnings: Object.freeze([]),
        updatedAt,
      });
      await this.dependencies.journal.recordReadback(transactionId, lease, receipt);
      const retained = createAreaCreateIdempotencyEntry({
        moduleId: input.command.moduleId,
        key: idempotencyKey,
        commandHash,
        createdAt: updatedAt,
        result: receipt,
      });
      await this.dependencies.journal.finalize(transactionId, lease, retained);
      return Object.freeze({ idempotency: "created", receipt: retained.result });
    } catch (error) {
      if (!mutationStarted || !candidate) {
        throw normalizeTransactionError(error, false);
      }
      throw await this.compensate(
        input.command.moduleId,
        transactionId,
        candidate,
        lease,
        error,
      );
    } finally {
      await this.dependencies.lock.release(lease);
    }
  }

  private async compensate(
    moduleId: string,
    transactionId: string,
    candidate: AreaUpdateCompiledCandidate,
    lease: AreaCreateModuleLease,
    originalError: unknown,
  ): Promise<AreaUpdateTransactionError> {
    const diagnostics: string[] = [];
    try {
      await this.dependencies.journal.transition(
        transactionId,
        "compensation_pending",
        lease,
      );
    } catch (error) {
      diagnostics.push(`journal compensation_pending: ${errorMessage(error)}`);
    }
    try {
      const compensation = await this.dependencies.storage.compensate(
        transactionId,
        moduleId,
        candidate,
        lease,
      );
      diagnostics.push(...compensation.diagnostics);
      if (compensation.restored) {
        try {
          await this.dependencies.journal.transition(transactionId, "compensated", lease);
        } catch (error) {
          diagnostics.push(`journal compensated: ${errorMessage(error)}`);
        }
        const normalized = normalizeTransactionError(originalError, true);
        if (normalized.code !== "AREA_UPDATE_TRANSACTION_FAILED") {
          return new AreaUpdateTransactionError(
            normalized.code,
            normalized.status,
            normalized.message,
            true,
            [...normalized.details, ...diagnostics],
          );
        }
        return transactionError(
          "AREA_UPDATE_TRANSACTION_FAILED",
          500,
          "Area Update failed and the baseline state was independently restored.",
          true,
          [errorMessage(originalError), ...diagnostics],
        );
      }
    } catch (error) {
      diagnostics.push(`compensation: ${errorMessage(error)}`);
    }
    if (diagnostics.length === 0) {
      diagnostics.push("Compensation did not verify restoration of the baseline state.");
    }
    try {
      await this.dependencies.storage.quarantine(
        moduleId,
        transactionId,
        diagnostics,
        lease,
      );
    } catch (error) {
      diagnostics.push(`quarantine: ${errorMessage(error)}`);
    }
    try {
      await this.dependencies.journal.transition(
        transactionId,
        "quarantine_required",
        lease,
      );
    } catch (error) {
      diagnostics.push(`journal quarantine_required: ${errorMessage(error)}`);
    }
    return transactionError(
      "AREA_UPDATE_ROLLBACK_FAILED",
      500,
      "Area Update compensation could not prove baseline restoration; the module requires quarantine.",
      true,
      diagnostics,
    );
  }
}

async function resolveStoredIdempotency(
  repository: AreaUpdateIdempotencyRepositoryPort,
  attempt: Readonly<{ moduleId: string; key: string; commandHash: string }>,
): Promise<AreaUpdateExecutionResult | null> {
  const resolution = resolveAreaCreateIdempotency(
    await repository.read(attempt.moduleId, attempt.key),
    attempt,
  );
  switch (resolution.kind) {
    case "new":
      return null;
    case "replay":
      return Object.freeze({ idempotency: "replayed", receipt: resolution.entry.result });
    case "conflict":
      throw transactionError(
        "AREA_UPDATE_IDEMPOTENCY_CONFLICT",
        409,
        "The Idempotency-Key is already bound to another Area Update command.",
        false,
        [
          `existing=${resolution.existingCommandHash}`,
          `attempted=${resolution.attemptedCommandHash}`,
        ],
      );
    case "scope_mismatch":
      throw transactionError(
        "AREA_UPDATE_TRANSACTION_FAILED",
        500,
        "The idempotency repository returned a result outside the requested scope.",
        false,
      );
  }
}

function validateModuleState(moduleId: string, state: AreaUpdateModuleState): void {
  if (state.moduleId !== moduleId) {
    throw transactionError(
      "AREA_UPDATE_TRANSACTION_FAILED",
      500,
      "Module storage returned state for another module.",
      false,
    );
  }
}

function normalizeTransactionError(
  error: unknown,
  mutationStarted: boolean,
): AreaUpdateTransactionError {
  if (error instanceof AreaUpdateTransactionError) return error;
  if (error instanceof AreaUpdateCompilerFailure) {
    return transactionError(
      error.code,
      error.status,
      error.message,
      mutationStarted,
      error.details,
    );
  }
  const message = errorMessage(error);
  return transactionError(
    "AREA_UPDATE_TRANSACTION_FAILED",
    500,
    message,
    mutationStarted,
    [message],
  );
}

function transactionError(
  code: AreaUpdateTransactionErrorCode,
  status: number,
  message: string,
  mutationStarted: boolean,
  details: readonly string[] = [],
): AreaUpdateTransactionError {
  return new AreaUpdateTransactionError(code, status, message, mutationStarted, details);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
