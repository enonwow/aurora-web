import { createHash } from "node:crypto";
import { canonicalizeAreaDeleteCommand } from "../domain/area-delete-command.validation";
import {
  createAreaCreateIdempotencyEntry,
  parseAreaCreateIdempotencyKey,
  resolveAreaCreateIdempotency,
} from "../domain/area-create-idempotency";
import { checkAreaCreateRevisionPrecondition } from "../domain/area-create-preconditions";
import {
  AREA_DELETE_RECEIPT_SCHEMA_VERSION,
  type AreaDeleteCompiledCandidate,
  type AreaDeleteExecutionInput,
  type AreaDeleteExecutionResult,
  type AreaDeleteModuleState,
  type AreaDeleteReceipt,
} from "../domain/area-delete-transaction.types";
import { AreaDeleteCompilerFailure } from "./area-delete-candidate.compiler";
import type {
  AreaDeleteIdempotencyRepositoryPort,
  AreaDeleteTransactionDependencies,
} from "./ports/area-delete-transaction.port";
import type { AreaCreateModuleLease } from "./ports/area-create-transaction.port";

export type AreaDeleteTransactionErrorCode =
  | "AREA_DELETE_INVALID"
  | "AREA_DELETE_PERMISSION_DENIED"
  | "AREA_DELETE_IDEMPOTENCY_CONFLICT"
  | "AREA_DELETE_MODULE_REVISION_CONFLICT"
  | "AREA_DELETE_PREVIEW_STALE"
  | "AREA_DELETE_ENTRY_AREA_BLOCKED"
  | "AREA_DELETE_REFERENCES_BLOCKED"
  | "AREA_DELETE_SCAN_INCOMPLETE"
  | "AREA_DELETE_MEMBERSHIP_INVALID"
  | "AREA_DELETE_SOURCE_MISSING"
  | "AREA_DELETE_RESOURCE_COLLISION"
  | "AREA_DELETE_READBACK_FAILED"
  | "AREA_DELETE_TRANSACTION_FAILED"
  | "AREA_DELETE_ROLLBACK_FAILED"
  | "AREA_DELETE_STORAGE_UNAVAILABLE";

export class AreaDeleteTransactionError extends Error {
  readonly details: readonly string[];

  constructor(
    readonly code: AreaDeleteTransactionErrorCode,
    readonly status: number,
    message: string,
    readonly mutationStarted: boolean,
    details: readonly string[] = [],
  ) {
    super(message);
    this.name = "AreaDeleteTransactionError";
    this.details = Object.freeze([...details]);
  }
}

export class AreaDeleteTransactionCoordinator {
  constructor(private readonly dependencies: AreaDeleteTransactionDependencies) {}

  async execute(input: AreaDeleteExecutionInput): Promise<AreaDeleteExecutionResult> {
    const keyResult = parseAreaCreateIdempotencyKey(input.idempotencyKey);
    if (!keyResult.valid) {
      throw transactionError(
        "AREA_DELETE_INVALID", 422, "Area Delete requires a valid Idempotency-Key.", false,
      );
    }
    const computedCommandHash = createHash("sha256")
      .update(canonicalizeAreaDeleteCommand(input.command), "utf8")
      .digest("hex");
    if (computedCommandHash !== input.commandHash) {
      throw transactionError(
        "AREA_DELETE_INVALID", 422, "Area Delete command hash is invalid.", false,
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
        permission: "area.materialize.delete",
      }))
    ) {
      throw transactionError(
        "AREA_DELETE_PERMISSION_DENIED",
        input.actorId ? 403 : 401,
        "The actor is not permitted to delete the target Area.",
        false,
      );
    }
    const transactionId = this.dependencies.ids.nextTransactionId();
    const lease = await this.dependencies.lock.acquire(input.command.moduleId, transactionId);
    if (!lease) {
      throw transactionError(
        "AREA_DELETE_STORAGE_UNAVAILABLE", 503, "The target module lock is unavailable.", false,
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
    input: AreaDeleteExecutionInput,
    commandHash: string,
    idempotencyKey: string,
    transactionId: string,
    lease: AreaCreateModuleLease,
  ): Promise<AreaDeleteExecutionResult> {
    let mutationStarted = false;
    let candidate: AreaDeleteCompiledCandidate | undefined;
    try {
      const replay = await resolveStoredIdempotency(this.dependencies.idempotency, {
        moduleId: input.command.moduleId,
        key: idempotencyKey,
        commandHash,
      });
      if (replay) return replay;
      const moduleState = await this.dependencies.storage.readModuleState(input.command.moduleId);
      validateModuleState(input.command.moduleId, moduleState);
      if (moduleState.quarantined) {
        throw transactionError(
          "AREA_DELETE_STORAGE_UNAVAILABLE",
          503,
          "The target module is quarantined after an unresolved mutation.",
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
            "AREA_DELETE_MODULE_REVISION_CONFLICT",
            412,
            "The module revision changed before Area Delete acquired the lock.",
            false,
            [`expected=${precondition.expected ?? ""}`, `actual=${precondition.actual ?? ""}`],
          );
        }
        throw transactionError(
          "AREA_DELETE_INVALID",
          422,
          `Area Delete revision precondition is invalid: ${precondition.code}.`,
          false,
        );
      }

      candidate = await this.dependencies.compiler.compile(
        input.command,
        moduleState,
        input.actorId,
        transactionId,
      );
      const deletedAt = this.dependencies.clock.nowIso();
      await this.dependencies.journal.begin({
        transactionId,
        moduleId: input.command.moduleId,
        areaResRef: input.command.areaResRef,
        actorId: input.actorId,
        idempotencyKey,
        commandHash,
        expectedModuleRevision: input.command.expectedModuleRevision,
        previewSha256: candidate.preview.previewSha256,
        leaseId: lease.leaseId,
        fencingToken: lease.fencingToken,
        candidate,
        createdAt: deletedAt,
      });

      mutationStarted = true;
      await this.dependencies.storage.stage(
        transactionId, input.command.moduleId, candidate, lease,
      );
      await this.dependencies.journal.transition(transactionId, "staged", lease);
      await this.dependencies.storage.commitResources(
        transactionId, input.command.moduleId, candidate, lease,
      );
      await this.dependencies.journal.transition(transactionId, "resources_committed", lease);
      await this.dependencies.storage.commitModuleIfo(
        transactionId, input.command.moduleId, candidate, lease,
      );
      await this.dependencies.journal.transition(transactionId, "ifo_committed", lease);

      const readback = await this.dependencies.storage.readBack(
        transactionId, input.command.moduleId, candidate, lease,
      );
      if (!readback.verified) {
        throw transactionError(
          "AREA_DELETE_READBACK_FAILED",
          500,
          "Committed Area Delete failed independent readback.",
          true,
          readback.diagnostics,
        );
      }
      const receipt: AreaDeleteReceipt = Object.freeze({
        schemaVersion: AREA_DELETE_RECEIPT_SCHEMA_VERSION,
        transactionId,
        areaResRef: input.command.areaResRef,
        moduleId: input.command.moduleId,
        previousModuleRevision: moduleState.revision,
        newModuleRevision: readback.newModuleRevision,
        commandHash,
        previewSha256: candidate.preview.previewSha256,
        scanVersion: candidate.preview.scanVersion,
        removedResources: readback.removedResources,
        moduleIfo: Object.freeze({
          key: readback.moduleIfo.key,
          baselineSha256: candidate.moduleIfo.baselineSha256,
          candidateSha256: readback.moduleIfo.sha256,
          size: readback.moduleIfo.size,
        }),
        survivorCount: readback.survivorCount,
        blockerCount: 0,
        readbackStatus: "verified",
        warnings: Object.freeze([]),
        deletedAt,
      });
      await this.dependencies.journal.recordReadback(transactionId, lease, receipt);
      const retained = createAreaCreateIdempotencyEntry({
        moduleId: input.command.moduleId,
        key: idempotencyKey,
        commandHash,
        createdAt: deletedAt,
        result: receipt,
      });
      await this.dependencies.journal.finalize(transactionId, lease, retained);
      return Object.freeze({ idempotency: "created", receipt: retained.result });
    } catch (error) {
      if (!mutationStarted || !candidate) throw normalizeTransactionError(error, false);
      throw await this.compensate(
        input.command.moduleId, transactionId, candidate, lease, error,
      );
    } finally {
      await this.dependencies.lock.release(lease);
    }
  }

  private async compensate(
    moduleId: string,
    transactionId: string,
    candidate: AreaDeleteCompiledCandidate,
    lease: AreaCreateModuleLease,
    originalError: unknown,
  ): Promise<AreaDeleteTransactionError> {
    const diagnostics: string[] = [];
    try {
      await this.dependencies.journal.transition(transactionId, "compensation_pending", lease);
    } catch (error) {
      diagnostics.push(`journal compensation_pending: ${errorMessage(error)}`);
    }
    try {
      const compensation = await this.dependencies.storage.compensate(
        transactionId, moduleId, candidate, lease,
      );
      diagnostics.push(...compensation.diagnostics);
      if (compensation.restored) {
        try {
          await this.dependencies.journal.transition(transactionId, "compensated", lease);
        } catch (error) {
          diagnostics.push(`journal compensated: ${errorMessage(error)}`);
        }
        const normalized = normalizeTransactionError(originalError, true);
        if (normalized.code !== "AREA_DELETE_TRANSACTION_FAILED") {
          return new AreaDeleteTransactionError(
            normalized.code,
            normalized.status,
            normalized.message,
            true,
            [...normalized.details, ...diagnostics],
          );
        }
        return transactionError(
          "AREA_DELETE_TRANSACTION_FAILED",
          500,
          "Area Delete failed and the baseline was independently restored.",
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
      await this.dependencies.storage.quarantine(moduleId, transactionId, diagnostics, lease);
    } catch (error) {
      diagnostics.push(`quarantine: ${errorMessage(error)}`);
    }
    try {
      await this.dependencies.journal.transition(transactionId, "quarantine_required", lease);
    } catch (error) {
      diagnostics.push(`journal quarantine_required: ${errorMessage(error)}`);
    }
    return transactionError(
      "AREA_DELETE_ROLLBACK_FAILED",
      500,
      "Area Delete compensation could not prove baseline restoration; the module requires quarantine.",
      true,
      diagnostics,
    );
  }
}

async function resolveStoredIdempotency(
  repository: AreaDeleteIdempotencyRepositoryPort,
  attempt: Readonly<{ moduleId: string; key: string; commandHash: string }>,
): Promise<AreaDeleteExecutionResult | null> {
  const resolution = resolveAreaCreateIdempotency(
    await repository.read(attempt.moduleId, attempt.key),
    attempt,
  );
  switch (resolution.kind) {
    case "new": return null;
    case "replay":
      return Object.freeze({ idempotency: "replayed", receipt: resolution.entry.result });
    case "conflict":
      throw transactionError(
        "AREA_DELETE_IDEMPOTENCY_CONFLICT", 409,
        "The Idempotency-Key is already bound to another Area Delete command.", false,
        [`existing=${resolution.existingCommandHash}`, `attempted=${resolution.attemptedCommandHash}`],
      );
    case "scope_mismatch":
      throw transactionError(
        "AREA_DELETE_TRANSACTION_FAILED", 500,
        "The idempotency repository returned a result outside the requested scope.", false,
      );
  }
}

function validateModuleState(moduleId: string, state: AreaDeleteModuleState): void {
  if (state.moduleId !== moduleId) {
    throw transactionError(
      "AREA_DELETE_TRANSACTION_FAILED", 500,
      "Module storage returned state for another module.", false,
    );
  }
}

function normalizeTransactionError(
  error: unknown,
  mutationStarted: boolean,
): AreaDeleteTransactionError {
  if (error instanceof AreaDeleteTransactionError) return error;
  if (error instanceof AreaDeleteCompilerFailure) {
    return transactionError(
      error.code, error.status, error.message, mutationStarted, error.details,
    );
  }
  const message = errorMessage(error);
  return transactionError(
    "AREA_DELETE_TRANSACTION_FAILED", 500, message, mutationStarted, [message],
  );
}

function transactionError(
  code: AreaDeleteTransactionErrorCode,
  status: number,
  message: string,
  mutationStarted: boolean,
  details: readonly string[] = [],
): AreaDeleteTransactionError {
  return new AreaDeleteTransactionError(code, status, message, mutationStarted, details);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
