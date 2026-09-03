import { createHash } from "node:crypto";
import {
  canonicalizeAreaCreateCommand,
} from "../domain/area-create-command.validation";
import {
  createAreaCreateIdempotencyEntry,
  parseAreaCreateIdempotencyKey,
  resolveAreaCreateIdempotency,
} from "../domain/area-create-idempotency";
import {
  checkAreaCreateRevisionPrecondition,
} from "../domain/area-create-preconditions";
import {
  AREA_CREATE_RECEIPT_SCHEMA_VERSION,
  type AreaCreateCompiledCandidate,
  type AreaCreateExecutionInput,
  type AreaCreateExecutionResult,
  type AreaCreateModuleState,
  type AreaCreateReceipt,
} from "../domain/area-create-transaction.types";
import {
  AreaCreateCompilerFailure,
  type AreaCreateIdempotencyRepositoryPort,
  type AreaCreateModuleLease,
  type AreaCreateTransactionDependencies,
} from "./ports/area-create-transaction.port";
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

export type AreaCreateTransactionErrorCode =
  | "AREA_CREATE_PROFILE_UNSUPPORTED"
  | "AREA_CREATE_PROFILE_STALE"
  | "AREA_CREATE_TILESET_STALE"
  | "AREA_CREATE_DRAFT_INVALID"
  | "AREA_CREATE_IDEMPOTENCY_CONFLICT"
  | "AREA_CREATE_PERMISSION_DENIED"
  | "AREA_CREATE_STORAGE_UNAVAILABLE"
  | "AREA_CREATE_MODULE_REVISION_CONFLICT"
  | "AREA_CREATE_RESOURCE_COLLISION"
  | "AREA_CREATE_CANDIDATE_INVALID"
  | "AREA_CREATE_READBACK_FAILED"
  | "AREA_CREATE_TRANSACTION_FAILED"
  | "AREA_CREATE_ROLLBACK_FAILED"
  | AreaTileProductionAdmissionBlockerCode
  | AreaTileProductionAdmissionSourceErrorCode;

export class AreaCreateTransactionError extends Error {
  readonly details: readonly string[];

  constructor(
    readonly code: AreaCreateTransactionErrorCode,
    readonly status: number,
    message: string,
    readonly mutationStarted: boolean,
    details: readonly string[] = [],
  ) {
    super(message);
    this.name = "AreaCreateTransactionError";
    this.details = Object.freeze([...details]);
  }
}

export class AreaCreateTransactionCoordinator {
  constructor(private readonly dependencies: AreaCreateTransactionDependencies) {}

  async execute(input: AreaCreateExecutionInput): Promise<AreaCreateExecutionResult> {
    const keyResult = parseAreaCreateIdempotencyKey(input.idempotencyKey);
    if (!keyResult.valid) {
      throw transactionError(
        "AREA_CREATE_DRAFT_INVALID",
        422,
        "Area Create requires a valid Idempotency-Key.",
        false,
      );
    }

    const computedCommandHash = createHash("sha256")
      .update(canonicalizeAreaCreateCommand(input.command), "utf8")
      .digest("hex");
    if (computedCommandHash !== input.commandHash) {
      throw transactionError(
        "AREA_CREATE_DRAFT_INVALID",
        422,
        "Area Create command hash does not match the normalized command.",
        false,
      );
    }

    const transactionId = this.dependencies.ids.nextTransactionId();
    const attempt = {
      moduleId: input.command.moduleId,
      key: keyResult.value,
      commandHash: computedCommandHash,
    };
    const preflight = await resolveStoredIdempotency(
      this.dependencies.idempotency,
      attempt,
    );
    if (preflight) {
      return preflight;
    }

    const authorized = await this.dependencies.authorization.authorize({
      actorId: input.actorId,
      moduleId: input.command.moduleId,
      permission: "area.create",
    });
    if (!authorized) {
      throw transactionError(
        "AREA_CREATE_PERMISSION_DENIED",
        403,
        "The actor is not permitted to create an Area in the target module.",
        false,
      );
    }

    const lease = await this.dependencies.lock.acquire(
      input.command.moduleId,
      transactionId,
    );
    if (!lease) {
      throw transactionError(
        "AREA_CREATE_STORAGE_UNAVAILABLE",
        503,
        "The target module lock is unavailable.",
        false,
      );
    }

    return this.executeLocked(input, computedCommandHash, keyResult.value, transactionId, lease);
  }

  private async executeLocked(
    input: AreaCreateExecutionInput,
    commandHash: string,
    idempotencyKey: string,
    transactionId: string,
    lease: AreaCreateModuleLease,
  ): Promise<AreaCreateExecutionResult> {
    let mutationStarted = false;
    let candidate: AreaCreateCompiledCandidate | undefined;
    try {
      const lockedReplay = await resolveStoredIdempotency(this.dependencies.idempotency, {
        moduleId: input.command.moduleId,
        key: idempotencyKey,
        commandHash,
      });
      if (lockedReplay) {
        return lockedReplay;
      }

      const moduleState = await this.dependencies.storage.readModuleState(
        input.command.moduleId,
      );
      validateModuleState(input.command.moduleId, moduleState);
      if (moduleState.quarantined) {
        throw transactionError(
          "AREA_CREATE_STORAGE_UNAVAILABLE",
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
            "AREA_CREATE_MODULE_REVISION_CONFLICT",
            412,
            "The target module revision changed before Area Create acquired the lock.",
            false,
            [
              `expected=${precondition.expected ?? ""}`,
              `actual=${precondition.actual ?? ""}`,
            ],
          );
        }
        throw transactionError(
          "AREA_CREATE_DRAFT_INVALID",
          422,
          `Area Create revision precondition is invalid: ${precondition.code}.`,
          false,
        );
      }

      const collisions = await this.dependencies.storage.findResourceCollisions(
        input.command.moduleId,
        input.command.area.resRef,
        ["are", "git", "gic"],
      );
      if (collisions.length > 0) {
        throw transactionError(
          "AREA_CREATE_RESOURCE_COLLISION",
          409,
          "One or more target Area resources already exist.",
          false,
          collisions,
        );
      }

      candidate = await this.dependencies.compiler.compile(
        input.command,
        moduleState,
        transactionId,
      );
      const candidateValidation = await this.dependencies.validator.validate(
        input.command,
        candidate,
      );
      if (!candidateValidation.valid) {
        throw transactionError(
          "AREA_CREATE_CANDIDATE_INVALID",
          422,
          "The compiled Area resource set failed independent validation.",
          false,
          candidateValidation.issues.map((issue) => `${issue.code}: ${issue.message}`),
        );
      }
      let tileAdmission;
      try {
        tileAdmission = await this.dependencies.tileAdmission.evaluateProductionAdmission({
          tilesetResRef: input.command.tileset.resRef,
          candidateTileIds: input.command.tiles.map((tile) => tile.tileId),
        });
      } catch (error) {
        if (error instanceof AreaTileProductionAdmissionSourceError) {
          throw transactionError(error.code, 503, error.message, false);
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

      const createdAt = this.dependencies.clock.nowIso();
      await this.dependencies.journal.begin({
        transactionId,
        moduleId: input.command.moduleId,
        actorId: input.actorId,
        idempotencyKey,
        commandHash,
        expectedModuleRevision: input.command.expectedModuleRevision,
        profileId: input.command.creationProfile.id,
        profileFingerprintSha256: input.command.creationProfile.fingerprintSha256,
        setFingerprintSha256: input.command.tileset.setFingerprintSha256,
        tileProductionAdmission: tileAdmission.admission,
        draftRevision: input.command.draft.revision,
        draftNormalizedSha256: input.command.draft.normalizedSha256,
        leaseId: lease.leaseId,
        fencingToken: lease.fencingToken,
        candidate,
        createdAt,
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
          "AREA_CREATE_READBACK_FAILED",
          500,
          "Committed Area resources failed independent readback.",
          true,
          readback.diagnostics,
        );
      }
      const receipt: AreaCreateReceipt = {
        schemaVersion: AREA_CREATE_RECEIPT_SCHEMA_VERSION,
        transactionId,
        areaId: candidate.areaId,
        resRef: input.command.area.resRef,
        name: input.command.area.name,
        tag: input.command.area.tag,
        moduleId: input.command.moduleId,
        previousModuleRevision: moduleState.revision,
        newModuleRevision: readback.newModuleRevision,
        profileId: input.command.creationProfile.id,
        profileFingerprintSha256: input.command.creationProfile.fingerprintSha256,
        setFingerprintSha256: input.command.tileset.setFingerprintSha256,
        tileProductionAdmission: tileAdmission.admission,
        draftNormalizedSha256: input.command.draft.normalizedSha256,
        commandHash,
        validatorVersion:
          this.dependencies.validator.version ?? "area-create-resource-set-validator.v1",
        resources: readback.resources,
        moduleIfo: readback.moduleIfo,
        readbackStatus: "verified",
        warnings: [],
        createdAt,
      };
      await this.dependencies.journal.recordReadback(
        transactionId,
        lease,
        receipt,
      );
      const retained = createAreaCreateIdempotencyEntry({
        moduleId: input.command.moduleId,
        key: idempotencyKey,
        commandHash,
        createdAt,
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
    candidate: AreaCreateCompiledCandidate,
    lease: AreaCreateModuleLease,
    originalError: unknown,
  ): Promise<AreaCreateTransactionError> {
    const diagnostics: string[] = [];
    try {
      await this.dependencies.journal.transition(
        transactionId,
        "compensation_pending",
        lease,
      );
    } catch (journalError) {
      diagnostics.push(`journal compensation_pending: ${errorMessage(journalError)}`);
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
          await this.dependencies.journal.transition(
            transactionId,
            "compensated",
            lease,
          );
        } catch (journalError) {
          diagnostics.push(`journal compensated: ${errorMessage(journalError)}`);
        }
        const normalized = normalizeTransactionError(originalError, true);
        if (normalized.code !== "AREA_CREATE_TRANSACTION_FAILED") {
          return new AreaCreateTransactionError(
            normalized.code,
            normalized.status,
            normalized.message,
            true,
            [...normalized.details, ...diagnostics],
          );
        }
        return new AreaCreateTransactionError(
          "AREA_CREATE_TRANSACTION_FAILED",
          500,
          "Area Create failed and the baseline state was independently restored.",
          true,
          [errorMessage(originalError), ...diagnostics],
        );
      }
    } catch (compensationError) {
      diagnostics.push(`compensation: ${errorMessage(compensationError)}`);
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
    } catch (quarantineError) {
      diagnostics.push(`quarantine: ${errorMessage(quarantineError)}`);
    }
    try {
      await this.dependencies.journal.transition(
        transactionId,
        "quarantine_required",
        lease,
      );
    } catch (journalError) {
      diagnostics.push(`journal quarantine_required: ${errorMessage(journalError)}`);
    }
    return new AreaCreateTransactionError(
      "AREA_CREATE_ROLLBACK_FAILED",
      500,
      "Area Create compensation could not prove baseline restoration; the module requires quarantine.",
      true,
      diagnostics,
    );
  }
}

async function resolveStoredIdempotency(
  repository: AreaCreateIdempotencyRepositoryPort,
  attempt: Readonly<{ moduleId: string; key: string; commandHash: string }>,
): Promise<AreaCreateExecutionResult | null> {
  const existing = await repository.read(attempt.moduleId, attempt.key);
  const resolution = resolveAreaCreateIdempotency(existing, attempt);
  switch (resolution.kind) {
    case "new":
      return null;
    case "replay":
      return Object.freeze({ idempotency: "replayed", receipt: resolution.entry.result });
    case "conflict":
      throw transactionError(
        "AREA_CREATE_IDEMPOTENCY_CONFLICT",
        409,
        "The Idempotency-Key is already bound to a different normalized command.",
        false,
        [
          `existing=${resolution.existingCommandHash}`,
          `attempted=${resolution.attemptedCommandHash}`,
        ],
      );
    case "scope_mismatch":
      throw transactionError(
        "AREA_CREATE_TRANSACTION_FAILED",
        500,
        "The idempotency repository returned an entry outside the requested module/key scope.",
        false,
      );
  }
}

function validateModuleState(moduleId: string, state: AreaCreateModuleState): void {
  if (state.moduleId !== moduleId) {
    throw transactionError(
      "AREA_CREATE_TRANSACTION_FAILED",
      500,
      "Module storage returned state for a different module.",
      false,
    );
  }
}

function normalizeTransactionError(
  error: unknown,
  mutationStarted: boolean,
): AreaCreateTransactionError {
  if (error instanceof AreaCreateTransactionError) {
    return error;
  }
  if (error instanceof AreaCreateCompilerFailure) {
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
    "AREA_CREATE_TRANSACTION_FAILED",
    500,
    message,
    mutationStarted,
    [message],
  );
}

function transactionError(
  code: AreaCreateTransactionErrorCode,
  status: number,
  message: string,
  mutationStarted: boolean,
  details: readonly string[] = [],
): AreaCreateTransactionError {
  return new AreaCreateTransactionError(code, status, message, mutationStarted, details);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
