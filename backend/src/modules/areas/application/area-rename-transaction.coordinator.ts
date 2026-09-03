import { createHash } from "node:crypto";
import { canonicalizeAreaRenameCommand } from "../domain/area-rename-command.validation";
import {
  createAreaCreateIdempotencyEntry,
  parseAreaCreateIdempotencyKey,
  resolveAreaCreateIdempotency,
} from "../domain/area-create-idempotency";
import { checkAreaCreateRevisionPrecondition } from "../domain/area-create-preconditions";
import {
  AREA_RENAME_RECEIPT_SCHEMA_VERSION,
  type AreaRenameCompiledCandidate,
  type AreaRenameExecutionInput,
  type AreaRenameExecutionResult,
  type AreaRenameModuleState,
  type AreaRenameReceipt,
} from "../domain/area-rename-transaction.types";
import { AreaRenameCompilerFailure } from "./area-rename-candidate.compiler";
import type {
  AreaRenameIdempotencyRepositoryPort,
  AreaRenameTransactionDependencies,
} from "./ports/area-rename-transaction.port";
import type { AreaCreateModuleLease } from "./ports/area-create-transaction.port";

export type AreaRenameTransactionErrorCode =
  | "AREA_RENAME_INVALID"
  | "AREA_RENAME_PERMISSION_DENIED"
  | "AREA_RENAME_IDEMPOTENCY_CONFLICT"
  | "AREA_RENAME_MODULE_REVISION_CONFLICT"
  | "AREA_RENAME_PREVIEW_STALE"
  | "AREA_RENAME_REFERENCES_BLOCKED"
  | "AREA_RENAME_SCAN_INCOMPLETE"
  | "AREA_RENAME_IDENTITY_INVALID"
  | "AREA_RENAME_MEMBERSHIP_INVALID"
  | "AREA_RENAME_SOURCE_MISSING"
  | "AREA_RENAME_RESOURCE_COLLISION"
  | "AREA_RENAME_READBACK_FAILED"
  | "AREA_RENAME_TRANSACTION_FAILED"
  | "AREA_RENAME_ROLLBACK_FAILED"
  | "AREA_RENAME_STORAGE_UNAVAILABLE";

export class AreaRenameTransactionError extends Error {
  readonly details: readonly string[];

  constructor(
    readonly code: AreaRenameTransactionErrorCode,
    readonly status: number,
    message: string,
    readonly mutationStarted: boolean,
    details: readonly string[] = [],
  ) {
    super(message);
    this.name = "AreaRenameTransactionError";
    this.details = Object.freeze([...details]);
  }
}

export class AreaRenameTransactionCoordinator {
  constructor(private readonly dependencies: AreaRenameTransactionDependencies) {}

  async execute(input: AreaRenameExecutionInput): Promise<AreaRenameExecutionResult> {
    const keyResult = parseAreaCreateIdempotencyKey(input.idempotencyKey);
    if (!keyResult.valid) {
      throw transactionError(
        "AREA_RENAME_INVALID", 422, "Area rename requires a valid Idempotency-Key.", false,
      );
    }
    const computedCommandHash = createHash("sha256")
      .update(canonicalizeAreaRenameCommand(input.command), "utf8")
      .digest("hex");
    if (computedCommandHash !== input.commandHash) {
      throw transactionError(
        "AREA_RENAME_INVALID", 422, "Area rename command hash is invalid.", false,
      );
    }
    const attempt = {
      moduleId: input.command.moduleId,
      key: keyResult.value,
      commandHash: computedCommandHash,
    };
    const preflight = await resolveStoredIdempotency(this.dependencies.idempotency, attempt);
    if (preflight) return preflight;

    if (!input.actorId || !(await this.dependencies.authorization.authorize({
      actorId: input.actorId,
      moduleId: input.command.moduleId,
      permission: "area.materialize.rename",
    }))) {
      throw transactionError(
        "AREA_RENAME_PERMISSION_DENIED",
        input.actorId ? 403 : 401,
        "The actor is not permitted to rename the target Area.",
        false,
      );
    }
    const transactionId = this.dependencies.ids.nextTransactionId();
    const lease = await this.dependencies.lock.acquire(input.command.moduleId, transactionId);
    if (!lease) {
      throw transactionError(
        "AREA_RENAME_STORAGE_UNAVAILABLE", 503, "The target module lock is unavailable.", false,
      );
    }
    return this.executeLocked(input, computedCommandHash, keyResult.value, transactionId, lease);
  }

  private async executeLocked(
    input: AreaRenameExecutionInput,
    commandHash: string,
    idempotencyKey: string,
    transactionId: string,
    lease: AreaCreateModuleLease,
  ): Promise<AreaRenameExecutionResult> {
    let mutationStarted = false;
    let candidate: AreaRenameCompiledCandidate | undefined;
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
          "AREA_RENAME_STORAGE_UNAVAILABLE",
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
            "AREA_RENAME_MODULE_REVISION_CONFLICT",
            412,
            "The module revision changed before Area rename acquired the lock.",
            false,
            [`expected=${precondition.expected ?? ""}`, `actual=${precondition.actual ?? ""}`],
          );
        }
        throw transactionError(
          "AREA_RENAME_INVALID",
          422,
          `Area rename revision precondition is invalid: ${precondition.code}.`,
          false,
        );
      }

      candidate = await this.dependencies.compiler.compile(
        input.command, moduleState, input.actorId, transactionId,
      );
      const renamedAt = this.dependencies.clock.nowIso();
      await this.dependencies.journal.begin({
        transactionId,
        moduleId: input.command.moduleId,
        areaResRef: input.command.areaResRef,
        targetAreaResRef: input.command.targetAreaResRef,
        actorId: input.actorId,
        idempotencyKey,
        commandHash,
        expectedModuleRevision: input.command.expectedModuleRevision,
        previewSha256: candidate.preview.previewSha256,
        leaseId: lease.leaseId,
        fencingToken: lease.fencingToken,
        candidate,
        createdAt: renamedAt,
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
          "AREA_RENAME_READBACK_FAILED",
          500,
          "Committed Area rename failed independent readback.",
          true,
          readback.diagnostics,
        );
      }
      const receipt: AreaRenameReceipt = Object.freeze({
        schemaVersion: AREA_RENAME_RECEIPT_SCHEMA_VERSION,
        transactionId,
        moduleId: input.command.moduleId,
        areaResRef: input.command.areaResRef,
        targetAreaResRef: input.command.targetAreaResRef,
        previousModuleRevision: moduleState.revision,
        newModuleRevision: readback.newModuleRevision,
        commandHash,
        previewSha256: candidate.preview.previewSha256,
        scanVersion: candidate.preview.scanVersion,
        resources: readback.resources,
        moduleIfo: readback.moduleIfo,
        entryAreaUpdated: readback.entryAreaUpdated,
        blockerCount: 0,
        warningCount: candidate.preview.warningCount,
        readbackStatus: "verified",
        warnings: Object.freeze([]),
        renamedAt,
      });
      await this.dependencies.journal.recordReadback(transactionId, lease, receipt);
      const retained = createAreaCreateIdempotencyEntry({
        moduleId: input.command.moduleId,
        key: idempotencyKey,
        commandHash,
        createdAt: renamedAt,
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
    candidate: AreaRenameCompiledCandidate,
    lease: AreaCreateModuleLease,
    originalError: unknown,
  ): Promise<AreaRenameTransactionError> {
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
        if (normalized.code !== "AREA_RENAME_TRANSACTION_FAILED") {
          return new AreaRenameTransactionError(
            normalized.code,
            normalized.status,
            normalized.message,
            true,
            [...normalized.details, ...diagnostics],
          );
        }
        return transactionError(
          "AREA_RENAME_TRANSACTION_FAILED",
          500,
          "Area rename failed and the baseline was independently restored.",
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
      "AREA_RENAME_ROLLBACK_FAILED",
      500,
      "Area rename compensation could not prove baseline restoration; the module requires quarantine.",
      true,
      diagnostics,
    );
  }
}

async function resolveStoredIdempotency(
  repository: AreaRenameIdempotencyRepositoryPort,
  attempt: Readonly<{ moduleId: string; key: string; commandHash: string }>,
): Promise<AreaRenameExecutionResult | null> {
  const resolution = resolveAreaCreateIdempotency(
    await repository.read(attempt.moduleId, attempt.key), attempt,
  );
  switch (resolution.kind) {
    case "new": return null;
    case "replay":
      return Object.freeze({ idempotency: "replayed", receipt: resolution.entry.result });
    case "conflict":
      throw transactionError(
        "AREA_RENAME_IDEMPOTENCY_CONFLICT",
        409,
        "The Idempotency-Key is already bound to another Area rename command.",
        false,
        [`existing=${resolution.existingCommandHash}`, `attempted=${resolution.attemptedCommandHash}`],
      );
    case "scope_mismatch":
      throw transactionError(
        "AREA_RENAME_TRANSACTION_FAILED",
        500,
        "The idempotency repository returned a result outside the requested scope.",
        false,
      );
  }
}

function validateModuleState(moduleId: string, state: AreaRenameModuleState): void {
  if (state.moduleId !== moduleId) {
    throw transactionError(
      "AREA_RENAME_TRANSACTION_FAILED",
      500,
      "Module storage returned state for another module.",
      false,
    );
  }
}

function normalizeTransactionError(
  error: unknown,
  mutationStarted: boolean,
): AreaRenameTransactionError {
  if (error instanceof AreaRenameTransactionError) return error;
  if (error instanceof AreaRenameCompilerFailure) {
    return transactionError(error.code, error.status, error.message, mutationStarted, error.details);
  }
  const message = errorMessage(error);
  return transactionError(
    "AREA_RENAME_TRANSACTION_FAILED", 500, message, mutationStarted, [message],
  );
}

function transactionError(
  code: AreaRenameTransactionErrorCode,
  status: number,
  message: string,
  mutationStarted: boolean,
  details: readonly string[] = [],
): AreaRenameTransactionError {
  return new AreaRenameTransactionError(code, status, message, mutationStarted, details);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
