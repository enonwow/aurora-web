import { AppException } from "../../../common/http/app-exception";
import { validateAndNormalizeAreaRenameCommand } from "../domain/area-rename-command.validation";
import {
  AreaRenameTransactionCoordinator,
  AreaRenameTransactionError,
} from "./area-rename-transaction.coordinator";
import type { ModuleSnapshotBootstrapApplicationService } from "./module-snapshot-bootstrap.application.service";
import type { AreaRenameTransactionDependencies } from "./ports/area-rename-transaction.port";

export interface AreaRenameApplicationDependencies extends AreaRenameTransactionDependencies {
  readonly bootstrap: Pick<
    ModuleSnapshotBootstrapApplicationService,
    "ensureCurrentWorkspaceBootstrapped"
  >;
  readonly caches: Readonly<{
    invalidateAreas(): void;
    invalidateEditing(): void;
    invalidateCatalog(): void;
  }>;
}

export class AreaRenameApplicationService {
  private readonly coordinator: AreaRenameTransactionCoordinator;

  constructor(private readonly dependencies: AreaRenameApplicationDependencies) {
    this.coordinator = new AreaRenameTransactionCoordinator(dependencies);
  }

  async rename(input: Readonly<{
    moduleId: string;
    areaResRef: string;
    actorId: string;
    idempotencyKey: string | undefined;
    ifMatchHeader: string | undefined;
    body: unknown;
  }>) {
    const normalized = validateAndNormalizeAreaRenameCommand(input.body);
    if (!normalized.valid) {
      throw new AppException({
        status: 422,
        code: "AREA_RENAME_INVALID",
        message: "Area rename command is invalid.",
        details: normalized.issues.map(({ path, message }) => ({ path, reason: message })),
      });
    }
    if (normalized.value.moduleId !== input.moduleId ||
        normalized.value.areaResRef !== input.areaResRef.toLowerCase()) {
      throw appError(422, "AREA_RENAME_INVALID", "Path and command identities differ.");
    }
    const bootstrap = await this.dependencies.bootstrap.ensureCurrentWorkspaceBootstrapped();
    if (bootstrap.head.moduleId !== input.moduleId) {
      throw appError(
        404,
        "AREA_RENAME_STORAGE_UNAVAILABLE",
        "Module ID does not identify the current workspace.",
      );
    }
    try {
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
      return result;
    } catch (error) {
      if (error instanceof AreaRenameTransactionError) {
        throw appError(
          error.status,
          error.code,
          error.message,
          error.details,
          error.status === 503,
        );
      }
      throw error;
    }
  }
}

function appError(
  status: number,
  code: string,
  message: string,
  details: readonly string[] = [],
  retryable = false,
): AppException {
  return new AppException({
    status,
    code,
    message,
    details: details.slice(0, 100).map((reason, index) => ({
      path: `details.${index}`,
      reason: reason.slice(0, 1_024),
    })),
    retryable,
  });
}
