import { AppException } from "../../../common/http/app-exception";
import {
  AreaRenameImpactScanner,
  AreaRenamePreviewError,
} from "./area-rename-impact-scanner";
import type { ModuleSnapshotBootstrapApplicationService } from "./module-snapshot-bootstrap.application.service";
import type { AreaRenameAuthorizationPort } from "./ports/area-rename-transaction.port";
import { validateAndNormalizeAreaRenamePreviewCommand } from "../domain/area-rename-command.validation";

export interface AreaRenamePreviewApplicationDependencies {
  readonly bootstrap: Pick<
    ModuleSnapshotBootstrapApplicationService,
    "ensureCurrentWorkspaceBootstrapped"
  >;
  readonly authorization: AreaRenameAuthorizationPort;
  readonly scanner: Pick<AreaRenameImpactScanner, "scan">;
}

export class AreaRenamePreviewApplicationService {
  constructor(private readonly dependencies: AreaRenamePreviewApplicationDependencies) {}

  async preview(input: Readonly<{
    actorId: string;
    moduleId: string;
    areaResRef: string;
    ifMatchHeader: string | undefined;
    body: unknown;
  }>) {
    const normalized = validateAndNormalizeAreaRenamePreviewCommand(input.body);
    if (!normalized.valid) {
      throw appError(
        422,
        "AREA_RENAME_INVALID",
        "Area rename preview command is invalid.",
        normalized.issues.map((issue) => ({ path: issue.path, reason: issue.message })),
      );
    }
    if (normalized.value.moduleId !== input.moduleId ||
        normalized.value.areaResRef !== input.areaResRef.toLowerCase()) {
      throw appError(422, "AREA_RENAME_INVALID", "Path and command identities differ.");
    }
    if (input.ifMatchHeader !== `"${normalized.value.expectedModuleRevision}"`) {
      throw appError(
        422,
        "AREA_RENAME_INVALID",
        "Area rename preview requires one exact strong If-Match revision.",
      );
    }
    if (!input.actorId) {
      throw appError(401, "AREA_RENAME_PERMISSION_DENIED", "Authenticated actor is missing.");
    }
    if (!(await this.dependencies.authorization.authorize({
      actorId: input.actorId,
      moduleId: input.moduleId,
      permission: "area.materialize.rename",
    }))) {
      throw appError(
        403,
        "AREA_RENAME_PERMISSION_DENIED",
        "Actor cannot preview Area rename materialization.",
      );
    }
    const bootstrap = await this.dependencies.bootstrap.ensureCurrentWorkspaceBootstrapped();
    if (bootstrap.head.moduleId !== input.moduleId) {
      throw appError(404, "AREA_RENAME_SOURCE_MISSING", "Module ID is outside the current workspace.");
    }
    try {
      return await this.dependencies.scanner.scan({
        moduleId: normalized.value.moduleId,
        areaResRef: normalized.value.areaResRef,
        targetAreaResRef: normalized.value.targetAreaResRef,
        expectedModuleRevision: normalized.value.expectedModuleRevision,
      });
    } catch (error) {
      if (error instanceof AreaRenamePreviewError) {
        throw appError(
          error.status,
          error.code,
          error.message,
          error.details.map((reason) => ({ path: "preview", reason })),
          error.status >= 500,
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
  details: Array<{ path: string; reason: string }> = [],
  retryable = false,
): AppException {
  return new AppException({ status, code, message, details, retryable });
}
