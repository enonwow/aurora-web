import { performance } from "node:perf_hooks";
import { AppException } from "../../../common/http/app-exception";
import {
  AreaEventScriptPublicationCoordinator,
  AreaEventScriptPublicationError,
} from "./area-event-script-publication.coordinator";
import type { ModuleSnapshotBootstrapApplicationService } from "./module-snapshot-bootstrap.application.service";
import type { AreaEventScriptPublicationTransactionDependencies } from "./ports/area-event-script-publication.port";
import type {
  AreaEventScriptPublicationTelemetryEvent,
  AreaEventScriptPublicationTelemetryPort,
} from "./ports/area-event-script-publication-telemetry.port";
import {
  AreaEventScriptSourceQueryError,
  type AreaEventScriptSourceQueryPort,
} from "./ports/area-event-script-source-query.port";
import {
  validateAndNormalizeAreaEventScriptSourceCommand,
} from "../domain/area-event-script-source-command";

export interface AreaEventScriptPublicationApplicationDependencies
  extends AreaEventScriptPublicationTransactionDependencies {
  readonly bootstrap: Pick<
    ModuleSnapshotBootstrapApplicationService,
    "ensureCurrentWorkspaceBootstrapped"
  >;
  readonly caches: Readonly<{
    invalidateAreas(): void;
    invalidateEditing(): void;
    invalidateCatalog(): void;
  }>;
  readonly telemetry: AreaEventScriptPublicationTelemetryPort;
  readonly sourceQuery: AreaEventScriptSourceQueryPort;
}

export class AreaEventScriptPublicationApplicationService {
  private readonly coordinator: AreaEventScriptPublicationCoordinator;

  constructor(
    private readonly dependencies: AreaEventScriptPublicationApplicationDependencies,
  ) {
    this.coordinator = new AreaEventScriptPublicationCoordinator(dependencies);
  }

  async readSource(input: Readonly<{
    moduleId: string;
    targetResRef: string;
    expectedModuleRevision: string;
    actorId: string;
  }>) {
    const startedAt = performance.now();
    let sourceBytes = 0;
    try {
      assertSourceQueryInput(input);
      await this.assertPathAuthorizationAndWorkspace(
        input,
        input.moduleId,
        input.targetResRef,
      );
      const result = await this.dependencies.sourceQuery.read({
        moduleId: input.moduleId,
        targetResRef: input.targetResRef,
        expectedModuleRevision: input.expectedModuleRevision,
      });
      sourceBytes = result.sourceSize;
      this.emitTelemetry({
        operation: "read_source",
        outcome: "succeeded",
        resultCode: "AREA_EVENT_SCRIPT_SOURCE_READ",
        moduleRevision: result.moduleRevision,
        sourceBytes,
        includeCount: 0,
        diagnosticCount: 0,
        resourceCount: 1,
        durationMs: durationSince(startedAt),
      });
      return result;
    } catch (error) {
      const mapped = mapError(error);
      this.emitTelemetry({
        operation: "read_source",
        outcome: "failed",
        resultCode: resultCodeOf(mapped),
        sourceBytes,
        includeCount: 0,
        diagnosticCount: 0,
        resourceCount: 0,
        durationMs: durationSince(startedAt),
      });
      throw mapped;
    }
  }

  async validate(input: Readonly<{
    moduleId: string;
    targetResRef: string;
    actorId: string;
    body: unknown;
  }>) {
    const startedAt = performance.now();
    let sourceBytes = 0;
    let includeCount = 0;
    try {
      const command = await this.prepareCommand(input);
      sourceBytes = command.sourceBytes.length;
      includeCount = command.includeResRefs.length;
      const result = await this.coordinator.validate({ actorId: input.actorId, command });
      this.emitTelemetry({
        operation: "validate",
        outcome: "succeeded",
        resultCode: "AREA_EVENT_SCRIPT_VALIDATED",
        moduleRevision: result.moduleRevision,
        sourceBytes,
        includeCount,
        diagnosticCount: result.diagnostics.length,
        resourceCount: result.artifacts ? 2 : 0,
        durationMs: durationSince(startedAt),
      });
      return result;
    } catch (error) {
      const mapped = mapError(error);
      this.emitTelemetry({
        operation: "validate",
        outcome: "failed",
        resultCode: resultCodeOf(mapped),
        sourceBytes,
        includeCount,
        diagnosticCount: 0,
        resourceCount: 0,
        durationMs: durationSince(startedAt),
      });
      throw mapped;
    }
  }

  async publish(input: Readonly<{
    moduleId: string;
    targetResRef: string;
    actorId: string;
    idempotencyKey: string | undefined;
    ifMatchHeader: string | undefined;
    body: unknown;
  }>) {
    const startedAt = performance.now();
    let sourceBytes = 0;
    let includeCount = 0;
    try {
      const normalized = validateAndNormalizeAreaEventScriptSourceCommand(input.body);
      if (!normalized.valid) throw sourceInvalid(normalized.issues);
      sourceBytes = normalized.value.sourceBytes.length;
      includeCount = normalized.value.includeResRefs.length;
      await this.assertPathAuthorizationAndWorkspace(
        input,
        normalized.value.moduleId,
        normalized.value.targetResRef,
      );
      const result = await this.coordinator.execute({
        actorId: input.actorId,
        idempotencyKey: input.idempotencyKey ?? "",
        ifMatchHeader: input.ifMatchHeader,
        command: normalized.value,
        commandHash: normalized.commandHash,
      });
      this.dependencies.caches.invalidateAreas();
      this.dependencies.caches.invalidateEditing();
      this.dependencies.caches.invalidateCatalog();
      this.emitTelemetry({
        operation: "publish",
        outcome: "succeeded",
        resultCode: result.idempotency === "created"
          ? "AREA_EVENT_SCRIPT_PUBLISHED"
          : "AREA_EVENT_SCRIPT_PUBLICATION_REPLAYED",
        moduleRevision: result.receipt.newModuleRevision,
        sourceBytes,
        includeCount,
        diagnosticCount: result.receipt.warnings.length,
        resourceCount: result.receipt.resources.length,
        durationMs: durationSince(startedAt),
      });
      return result;
    } catch (error) {
      const mapped = mapError(error);
      this.emitTelemetry({
        operation: "publish",
        outcome: "failed",
        resultCode: resultCodeOf(mapped),
        sourceBytes,
        includeCount,
        diagnosticCount: 0,
        resourceCount: 0,
        durationMs: durationSince(startedAt),
      });
      throw mapped;
    }
  }

  private emitTelemetry(
    event: Omit<AreaEventScriptPublicationTelemetryEvent, "schemaVersion">,
  ): void {
    try {
      this.dependencies.telemetry.emit(Object.freeze({
        schemaVersion: "area-event-script-publication-telemetry.v1",
        ...event,
      }));
    } catch {
      // Observability must never change validation or publication semantics.
    }
  }

  private async prepareCommand(input: Readonly<{
    moduleId: string;
    targetResRef: string;
    actorId: string;
    body: unknown;
  }>) {
    const normalized = validateAndNormalizeAreaEventScriptSourceCommand(input.body);
    if (!normalized.valid) throw sourceInvalid(normalized.issues);
    await this.assertPathAuthorizationAndWorkspace(
      input,
      normalized.value.moduleId,
      normalized.value.targetResRef,
    );
    return normalized.value;
  }

  private async assertPathAuthorizationAndWorkspace(
    path: Readonly<{ moduleId: string; targetResRef: string; actorId: string }>,
    bodyModuleId: string,
    bodyTargetResRef: string,
  ): Promise<void> {
    if (path.moduleId !== bodyModuleId || path.targetResRef !== bodyTargetResRef) {
      throw new AppException({
        status: 422,
        code: "AREA_EVENT_SCRIPT_SOURCE_INVALID",
        message: "Path and script command identities differ.",
      });
    }
    if (
      !path.actorId ||
      !(await this.dependencies.authorization.authorize({
        actorId: path.actorId,
        moduleId: path.moduleId,
        permission: "area.materialize.update",
      }))
    ) {
      throw new AppException({
        status: path.actorId ? 403 : 401,
        code: "AREA_EVENT_SCRIPT_PERMISSION_DENIED",
        message: "The actor is not permitted to access module scripts.",
      });
    }
    const bootstrap = await this.dependencies.bootstrap.ensureCurrentWorkspaceBootstrapped();
    if (bootstrap.head.moduleId !== path.moduleId) {
      throw new AppException({
        status: 404,
        code: "AREA_EVENT_SCRIPT_STORAGE_UNAVAILABLE",
        message: "Module ID does not identify the current workspace.",
      });
    }
  }
}

function sourceInvalid(
  issues: readonly Readonly<{ path: string; message: string }>[],
): AppException {
  return new AppException({
    status: 422,
    code: "AREA_EVENT_SCRIPT_SOURCE_INVALID",
    message: "Area event-script source command is invalid.",
    details: issues.slice(0, 100).map((issue) => ({
      path: issue.path.slice(0, 256),
      reason: issue.message.slice(0, 1_024),
    })),
  });
}

function mapError(error: unknown): unknown {
  if (error instanceof AppException) return error;
  if (error instanceof AreaEventScriptSourceQueryError) {
    const status = error.code === "AREA_EVENT_SCRIPT_SOURCE_NOT_FOUND"
      ? 404
      : error.code === "AREA_EVENT_SCRIPT_MODULE_REVISION_CONFLICT"
        ? 412
        : error.code === "AREA_EVENT_SCRIPT_SOURCE_INVALID"
          ? 422
          : 503;
    return new AppException({
      status,
      code: error.code,
      message: "Area event-script source query failed.",
      retryable: status === 503,
    });
  }
  if (error instanceof AreaEventScriptPublicationError) {
    return new AppException({
      status: error.status,
      code: error.code,
      message: error.message.slice(0, 1_024),
      details: error.details.slice(0, 100).map((reason, index) => ({
        path: `details.${index}`,
        reason: reason.slice(0, 1_024),
      })),
      retryable: error.status === 503,
    });
  }
  return new AppException({
    status: 500,
    code: "AREA_EVENT_SCRIPT_TRANSACTION_FAILED",
    message: "Area event-script operation failed unexpectedly.",
  });
}

function resultCodeOf(error: unknown): string {
  if (error instanceof AppException) return error.code;
  if (error instanceof AreaEventScriptPublicationError) return error.code;
  return "AREA_EVENT_SCRIPT_TRANSACTION_FAILED";
}

function assertSourceQueryInput(input: Readonly<{
  moduleId: string;
  targetResRef: string;
  expectedModuleRevision: string;
}>): void {
  if (
    !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u.test(input.moduleId ?? "") ||
    !/^[a-z0-9_]{1,16}$/u.test(input.targetResRef ?? "") ||
    input.targetResRef === "nwscript" ||
    !/^[a-f0-9]{64}$/u.test(input.expectedModuleRevision ?? "")
  ) {
    throw new AppException({
      status: 422,
      code: "AREA_EVENT_SCRIPT_SOURCE_INVALID",
      message: "Area event-script source query is invalid.",
    });
  }
}

function durationSince(startedAt: number): number {
  return Math.max(0, Math.round(performance.now() - startedAt));
}
