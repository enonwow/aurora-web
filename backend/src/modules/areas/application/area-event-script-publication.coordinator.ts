import { createHash } from "node:crypto";
import {
  createAreaCreateIdempotencyEntry,
  parseAreaCreateIdempotencyKey,
  resolveAreaCreateIdempotency,
} from "../domain/area-create-idempotency";
import { checkAreaCreateRevisionPrecondition } from "../domain/area-create-preconditions";
import {
  AREA_EVENT_SCRIPT_PUBLICATION_RECEIPT_SCHEMA_VERSION,
  AreaEventScriptPublicationCandidateError,
  buildAreaEventScriptPublicationCandidate,
  buildAreaEventScriptValidationResult,
  type AreaEventScriptPublicationExecutionInput,
  type AreaEventScriptPublicationExecutionResult,
  type AreaEventScriptPublicationReceipt,
  type AreaEventScriptValidationResult,
} from "../domain/area-event-script-publication.types";
import {
  canonicalizeAreaEventScriptSourceCommand,
  type AreaEventScriptSourceCommand,
} from "../domain/area-event-script-source-command";
import type { NwnScriptCompileResult } from "./ports/nwn-script-compiler.port";
import {
  NwnScriptSourceSnapshotError,
} from "./ports/nwn-script-source-snapshot.port";
import type {
  AreaEventScriptPublicationIdempotencyPort,
  AreaEventScriptPublicationTransactionDependencies,
} from "./ports/area-event-script-publication.port";
import type { AreaCreateModuleLease } from "./ports/area-create-transaction.port";

export type AreaEventScriptPublicationErrorCode =
  | "AREA_EVENT_SCRIPT_SOURCE_INVALID"
  | "AREA_EVENT_SCRIPT_INCLUDE_INVALID"
  | "AREA_EVENT_SCRIPT_COMPILE_REJECTED"
  | "AREA_EVENT_SCRIPT_PERMISSION_DENIED"
  | "AREA_EVENT_SCRIPT_IDEMPOTENCY_CONFLICT"
  | "AREA_EVENT_SCRIPT_MODULE_REVISION_CONFLICT"
  | "AREA_EVENT_SCRIPT_READBACK_FAILED"
  | "AREA_EVENT_SCRIPT_TRANSACTION_FAILED"
  | "AREA_EVENT_SCRIPT_ROLLBACK_FAILED"
  | "AREA_EVENT_SCRIPT_STORAGE_UNAVAILABLE";

export class AreaEventScriptPublicationError extends Error {
  constructor(
    readonly code: AreaEventScriptPublicationErrorCode,
    readonly status: number,
    message: string,
    readonly mutationStarted: boolean,
    readonly details: readonly string[] = [],
  ) {
    super(`${code}: ${message}`);
    this.name = "AreaEventScriptPublicationError";
  }
}

export class AreaEventScriptPublicationCoordinator {
  constructor(
    private readonly dependencies: AreaEventScriptPublicationTransactionDependencies,
  ) {}

  async validate(input: Readonly<{
    actorId: string;
    command: AreaEventScriptSourceCommand;
  }>): Promise<AreaEventScriptValidationResult> {
    await this.authorize(input.actorId, input.command.moduleId);
    const prepared = await this.compileExact(input.command);
    return buildAreaEventScriptValidationResult({
      moduleId: input.command.moduleId,
      moduleRevision: prepared.moduleRevision,
      sourceBytes: input.command.sourceBytes,
      compilation: prepared.compilation,
    });
  }

  async execute(
    input: AreaEventScriptPublicationExecutionInput,
  ): Promise<AreaEventScriptPublicationExecutionResult> {
    const key = parseAreaCreateIdempotencyKey(input.idempotencyKey);
    if (!key.valid) {
      throw publicationError(
        "AREA_EVENT_SCRIPT_SOURCE_INVALID",
        422,
        "Script publication requires a valid Idempotency-Key.",
        false,
      );
    }
    const commandHash = createHash("sha256")
      .update(canonicalizeAreaEventScriptSourceCommand(input.command), "utf8")
      .digest("hex");
    if (commandHash !== input.commandHash) {
      throw publicationError(
        "AREA_EVENT_SCRIPT_SOURCE_INVALID",
        422,
        "Script publication command hash is invalid.",
        false,
      );
    }
    const attempt = {
      moduleId: input.command.moduleId,
      key: key.value,
      commandHash,
    };
    await this.authorize(input.actorId, input.command.moduleId);
    const preflight = await resolveStoredIdempotency(this.dependencies.idempotency, attempt);
    if (preflight) return preflight;
    const prepared = await this.compileExact(input.command);
    let candidate;
    try {
      candidate = buildAreaEventScriptPublicationCandidate({
        expectedModuleRevision: input.command.expectedModuleRevision,
        sourceBytes: input.command.sourceBytes,
        compilation: prepared.compilation,
      });
    } catch (error) {
      if (error instanceof AreaEventScriptPublicationCandidateError) {
        throw publicationError(
          error.code === "AREA_EVENT_SCRIPT_COMPILE_REJECTED"
            ? "AREA_EVENT_SCRIPT_COMPILE_REJECTED"
            : "AREA_EVENT_SCRIPT_TRANSACTION_FAILED",
          error.code === "AREA_EVENT_SCRIPT_COMPILE_REJECTED" ? 422 : 500,
          error.message,
          false,
          error.diagnostics.map(formatCompilerDiagnostic),
        );
      }
      throw error;
    }
    const transactionId = this.dependencies.ids.nextTransactionId();
    const lease = await this.dependencies.lock.acquire(
      input.command.moduleId,
      transactionId,
    );
    if (!lease) {
      throw publicationError(
        "AREA_EVENT_SCRIPT_STORAGE_UNAVAILABLE",
        503,
        "The target module lock is unavailable.",
        false,
      );
    }
    return this.executeLocked(
      input,
      key.value,
      commandHash,
      transactionId,
      lease,
      prepared.moduleRevision,
      candidate,
    );
  }

  private async executeLocked(
    input: AreaEventScriptPublicationExecutionInput,
    idempotencyKey: string,
    commandHash: string,
    transactionId: string,
    lease: AreaCreateModuleLease,
    capturedRevision: string,
    candidate: ReturnType<typeof buildAreaEventScriptPublicationCandidate>,
  ): Promise<AreaEventScriptPublicationExecutionResult> {
    let mutationStarted = false;
    try {
      const replay = await resolveStoredIdempotency(this.dependencies.idempotency, {
        moduleId: input.command.moduleId,
        key: idempotencyKey,
        commandHash,
      });
      if (replay) return replay;
      const state = await this.dependencies.storage.readModuleState(input.command.moduleId);
      if (state.moduleId !== input.command.moduleId || state.quarantined) {
        throw publicationError(
          "AREA_EVENT_SCRIPT_STORAGE_UNAVAILABLE",
          503,
          "The target module state is unavailable or quarantined.",
          false,
        );
      }
      const precondition = checkAreaCreateRevisionPrecondition({
        ifMatchHeader: input.ifMatchHeader,
        expectedModuleRevision: input.command.expectedModuleRevision,
        currentModuleRevision: state.revision,
      });
      if (capturedRevision !== state.revision) {
        throw publicationError(
          "AREA_EVENT_SCRIPT_MODULE_REVISION_CONFLICT",
          412,
          "Module revision changed after source compilation.",
          false,
        );
      }
      if (!precondition.matched) {
        if (precondition.code === "stale_revision") {
          throw publicationError(
            "AREA_EVENT_SCRIPT_MODULE_REVISION_CONFLICT",
            412,
            "Module revision changed after source compilation.",
            false,
          );
        }
        throw publicationError(
          "AREA_EVENT_SCRIPT_SOURCE_INVALID",
          422,
          `Script publication revision precondition is invalid: ${precondition.code}.`,
          false,
        );
      }
      const publishedAt = this.dependencies.clock.nowIso();
      await this.dependencies.journal.begin({
        transactionId,
        moduleId: input.command.moduleId,
        targetResRef: input.command.targetResRef,
        actorId: input.actorId,
        idempotencyKey,
        commandHash,
        expectedModuleRevision: input.command.expectedModuleRevision,
        leaseId: lease.leaseId,
        fencingToken: lease.fencingToken,
        candidate,
        createdAt: publishedAt,
      });
      mutationStarted = true;
      await this.dependencies.storage.stage(
        transactionId,
        input.command.moduleId,
        candidate,
        lease,
        publishedAt,
      );
      await this.dependencies.journal.transition(transactionId, "staged", lease);
      await this.dependencies.storage.publish(
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
      await this.dependencies.journal.transition(transactionId, "ifo_committed", lease);
      const readback = await this.dependencies.storage.readBack(
        transactionId,
        input.command.moduleId,
        candidate,
        lease,
      );
      if (!readback.verified) {
        throw publicationError(
          "AREA_EVENT_SCRIPT_READBACK_FAILED",
          500,
          "Published NWScript resources failed independent readback.",
          true,
          readback.diagnostics,
        );
      }
      const receipt: AreaEventScriptPublicationReceipt = Object.freeze({
        schemaVersion: AREA_EVENT_SCRIPT_PUBLICATION_RECEIPT_SCHEMA_VERSION,
        transactionId,
        moduleId: input.command.moduleId,
        targetResRef: input.command.targetResRef,
        previousModuleRevision: state.revision,
        newModuleRevision: readback.newModuleRevision,
        commandHash,
        sourceSha256: candidate.sourceSha256,
        includeSetSha256: candidate.includeSetSha256,
        executionProfileSha256: candidate.executionProfileSha256,
        provider: candidate.provider,
        compilerReceiptSha256: candidate.compilerReceiptSha256,
        resources: readback.resources,
        readbackStatus: "verified",
        warnings: Object.freeze(
          candidate.diagnostics.filter((diagnostic) => diagnostic.severity === "warning"),
        ),
        publishedAt,
      });
      await this.dependencies.journal.recordReadback(transactionId, lease, receipt);
      const retained = createAreaCreateIdempotencyEntry({
        moduleId: input.command.moduleId,
        key: idempotencyKey,
        commandHash,
        createdAt: publishedAt,
        result: receipt,
      });
      await this.dependencies.journal.finalize(transactionId, lease, retained);
      return Object.freeze({ idempotency: "created", receipt: retained.result });
    } catch (error) {
      if (!mutationStarted) throw normalizeError(error, false);
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

  private async compileExact(command: AreaEventScriptSourceCommand): Promise<{
    moduleRevision: string;
    compilation: NwnScriptCompileResult;
  }> {
    try {
      const captured = await this.dependencies.sourceSnapshot.capture({
        moduleId: command.moduleId,
        expectedModuleRevision: command.expectedModuleRevision,
        targetSourceSize: command.sourceBytes.length,
        includeResRefs: command.includeResRefs,
      });
      if (
        captured.moduleId !== command.moduleId ||
        captured.revision !== command.expectedModuleRevision
      ) {
        throw publicationError(
          "AREA_EVENT_SCRIPT_MODULE_REVISION_CONFLICT",
          412,
          "Captured include snapshot identity differs from the requested revision.",
          false,
        );
      }
      const compilation = await this.dependencies.compiler.compile({
        target: { resref: command.targetResRef, bytes: Buffer.from(command.sourceBytes) },
        includes: captured.includes.map((include) => ({
          resref: include.resref,
          bytes: Buffer.from(include.bytes),
        })),
      });
      return { moduleRevision: captured.revision, compilation };
    } catch (error) {
      throw normalizeError(error, false);
    }
  }

  private async authorize(actorId: string, moduleId: string): Promise<void> {
    if (
      !actorId ||
      !(await this.dependencies.authorization.authorize({
        actorId,
        moduleId,
        permission: "area.materialize.update",
      }))
    ) {
      throw publicationError(
        "AREA_EVENT_SCRIPT_PERMISSION_DENIED",
        actorId ? 403 : 401,
        "The actor is not permitted to publish module scripts.",
        false,
      );
    }
  }

  private async compensate(
    moduleId: string,
    transactionId: string,
    candidate: ReturnType<typeof buildAreaEventScriptPublicationCandidate>,
    lease: AreaCreateModuleLease,
    originalError: unknown,
  ): Promise<AreaEventScriptPublicationError> {
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
          await this.dependencies.journal.transition(
            transactionId,
            "compensated",
            lease,
          );
        } catch (error) {
          diagnostics.push(`journal compensated: ${errorMessage(error)}`);
        }
        const normalized = normalizeError(originalError, true);
        return publicationError(
          normalized.code,
          normalized.status,
          normalized.message,
          true,
          [...normalized.details, ...diagnostics],
        );
      }
    } catch (error) {
      diagnostics.push(`compensation: ${errorMessage(error)}`);
    }
    if (diagnostics.length === 0) diagnostics.push("Baseline restoration was not verified.");
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
    return publicationError(
      "AREA_EVENT_SCRIPT_ROLLBACK_FAILED",
      500,
      "Script publication compensation could not prove baseline restoration.",
      true,
      diagnostics,
    );
  }
}

async function resolveStoredIdempotency(
  repository: AreaEventScriptPublicationIdempotencyPort,
  attempt: Readonly<{ moduleId: string; key: string; commandHash: string }>,
): Promise<AreaEventScriptPublicationExecutionResult | null> {
  const resolution = resolveAreaCreateIdempotency(await repository.read(
    attempt.moduleId,
    attempt.key,
  ), attempt);
  switch (resolution.kind) {
    case "new": return null;
    case "replay": return Object.freeze({
      idempotency: "replayed",
      receipt: resolution.entry.result,
    });
    case "conflict":
      throw publicationError(
        "AREA_EVENT_SCRIPT_IDEMPOTENCY_CONFLICT",
        409,
        "The Idempotency-Key is already bound to another script publication.",
        false,
      );
    case "scope_mismatch":
      throw publicationError(
        "AREA_EVENT_SCRIPT_TRANSACTION_FAILED",
        500,
        "Idempotency storage returned a result outside the requested scope.",
        false,
      );
  }
}

function normalizeError(error: unknown, mutationStarted: boolean): AreaEventScriptPublicationError {
  if (error instanceof AreaEventScriptPublicationError) return error;
  if (error instanceof NwnScriptSourceSnapshotError) {
    return publicationError(
      error.code,
      error.code === "AREA_EVENT_SCRIPT_MODULE_REVISION_CONFLICT"
        ? 412
        : error.code === "AREA_EVENT_SCRIPT_INCLUDE_INVALID"
          ? 422
          : 503,
      error.message,
      mutationStarted,
    );
  }
  if (hasCompilerProviderCode(error)) {
    if (error.code === "NWNSCRIPT_COMPILER_INPUT_INVALID") {
      return publicationError(
        "AREA_EVENT_SCRIPT_INCLUDE_INVALID",
        422,
        "NWScript compiler input exceeds the canonical source/include contract.",
        mutationStarted,
        [error.code],
      );
    }
    return publicationError(
      "AREA_EVENT_SCRIPT_STORAGE_UNAVAILABLE",
      503,
      "NWScript compiler provider is unavailable or failed its identity contract.",
      mutationStarted,
      [error.code],
    );
  }
  return publicationError(
    "AREA_EVENT_SCRIPT_TRANSACTION_FAILED",
    500,
    errorMessage(error),
    mutationStarted,
  );
}

function hasCompilerProviderCode(error: unknown): error is { code: string } {
  return typeof error === "object" && error !== null &&
    typeof (error as { code?: unknown }).code === "string" &&
    (error as { code: string }).code.startsWith("NWNSCRIPT_COMPILER_");
}

function publicationError(
  code: AreaEventScriptPublicationErrorCode,
  status: number,
  message: string,
  mutationStarted: boolean,
  details: readonly string[] = [],
): AreaEventScriptPublicationError {
  return new AreaEventScriptPublicationError(code, status, message, mutationStarted, details);
}

function formatCompilerDiagnostic(diagnostic: Readonly<{
  code: string;
  line?: number;
  column?: number;
  message: string;
}>): string {
  const position = diagnostic.line === undefined
    ? ""
    : ` line=${diagnostic.line}${diagnostic.column === undefined ? "" : ` column=${diagnostic.column}`}`;
  return `${diagnostic.code}${position}: ${diagnostic.message}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
