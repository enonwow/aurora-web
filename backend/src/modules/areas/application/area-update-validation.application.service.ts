import { createHash } from "node:crypto";
import { AppException } from "../../../common/http/app-exception";
import { AURORA_AREA_UPDATE_CANDIDATE_VALIDATOR_VERSION } from "../adapters/outbound/blob/aurora-area-update-candidate-validator";
import { readModuleIfoStartLocation } from "../adapters/outbound/blob/aurora-gff-module-ifo-area-writer";
import {
  parseAreaAudioEnvironmentFromGitGff,
  parseAreaVariablesFromGitGff,
  parseAreaVisualEnvironmentCatalogSelectionFromAreGff,
  parseAreaVisualEnvironmentFromAreGff,
  parseAreaVisualEnvironmentScalarControlsFromAreGff,
} from "../adapters/outbound/blob/aurora-gff-area-parser";
import type { ModuleSnapshotBootstrapApplicationService } from "./module-snapshot-bootstrap.application.service";
import {
  AreaUpdateCompilerFailure,
} from "./area-update-candidate.compiler";
import type { AreaUpdateAuthorizationPort } from "./ports/area-update-validation.port";
import type { AreaCreateTransactionStoragePort } from "./ports/area-create-transaction.port";
import type { AreaUpdateCompilerPort } from "./ports/area-update-transaction.port";
import {
  AreaTileProductionAdmissionSourceError,
  type AreaTileProductionAdmissionPort,
} from "./ports/area-tile-production-admission.port";
import type {
  AreaTileProductionAdmissionDiagnostic,
} from "./area-tile-production-admission.policy";
import {
  formatAreaTileProductionAdmissionDiagnostic,
} from "./area-tile-production-admission.diagnostics";
import type { AreaUpdateCommand } from "../domain/area-update-command.types";
import type { AreaUpdateCompiledCandidate } from "../domain/area-update-transaction.types";
import { areaModuleStartLocationsEqual } from "../domain/area-module-start-location";
import { areaAudioEnvironmentsEqual } from "../domain/area-audio-environment";
import {
  isExistingAreaVisualEnvironmentCatalogSelectionMutation,
  isResolvedAreaVisualEnvironmentCatalogSelectionMutation,
} from "../domain/area-visual-environment-catalog-selection-mutation";
import { areaVisualEnvironmentsEqual } from "../domain/area-visual-environment";
import { areaVisualEnvironmentScalarControlsEqual } from "../domain/area-visual-environment-scalar-controls";
import {
  auroraVariableEntriesEqual,
  auroraVariableSourceEntriesEqual,
  type AuroraVariableTargetEntry,
} from "../domain/aurora-variable-table";
import { validateAndNormalizeAreaUpdateValidationCommand } from "../domain/area-update-validation-command.validation";

export const AREA_UPDATE_VALIDATION_RECEIPT_SCHEMA_VERSION =
  "area-update-validation-receipt.v1" as const;

const CANDIDATE_RESOURCE_TYPES = Object.freeze({
  are: 2012,
  git: 2023,
  gic: 2046,
} as const);

export interface AreaUpdateValidationDependencies {
  readonly bootstrap: Pick<
    ModuleSnapshotBootstrapApplicationService,
    "ensureCurrentWorkspaceBootstrapped"
  >;
  readonly authorization: AreaUpdateAuthorizationPort;
  readonly storage: Pick<AreaCreateTransactionStoragePort, "readModuleState">;
  readonly compiler: AreaUpdateCompilerPort;
  readonly tileAdmission: AreaTileProductionAdmissionPort;
  readonly ids: Readonly<{ nextValidationId(): string }>;
  readonly clock: Readonly<{ now(): Date }>;
}

export class AreaUpdateValidationApplicationService {
  constructor(private readonly dependencies: AreaUpdateValidationDependencies) {}

  async validate(input: Readonly<{
    moduleId: string;
    areaResRef: string;
    actorId: string;
    body: unknown;
  }>) {
    const normalized = validateAndNormalizeAreaUpdateValidationCommand(input.body);
    if (!normalized.valid) {
      throw appError(
        422,
        "AREA_UPDATE_INVALID",
        "Area Update validation command is invalid.",
        normalized.issues.map((entry) => ({ path: entry.path, reason: entry.message })),
      );
    }
    if (
      normalized.value.moduleId !== input.moduleId ||
      normalized.value.areaResRef !== input.areaResRef.toLowerCase()
    ) {
      throw appError(
        422,
        "AREA_UPDATE_INVALID",
        "Path and command identities differ.",
      );
    }
    if (!input.actorId) {
      throw appError(
        401,
        "AREA_UPDATE_PERMISSION_DENIED",
        "Authenticated actor is missing.",
      );
    }
    if (
      !(await this.dependencies.authorization.authorize({
        actorId: input.actorId,
        moduleId: input.moduleId,
        permission: "area.materialize.update",
      }))
    ) {
      throw appError(
        403,
        "AREA_UPDATE_PERMISSION_DENIED",
        "Actor cannot validate Area Update materialization.",
      );
    }

    const bootstrap = await this.dependencies.bootstrap.ensureCurrentWorkspaceBootstrapped();
    if (bootstrap.head.moduleId !== input.moduleId) {
      throw appError(
        404,
        "AREA_UPDATE_STORAGE_UNAVAILABLE",
        "Module ID does not identify the current workspace.",
      );
    }
    const moduleState = await this.dependencies.storage.readModuleState(input.moduleId);
    if (moduleState.quarantined) {
      throw appError(
        503,
        "AREA_UPDATE_STORAGE_UNAVAILABLE",
        "The current module snapshot is quarantined.",
        [],
        true,
      );
    }
    if (moduleState.revision !== normalized.value.expectedModuleRevision) {
      throw appError(
        412,
        "AREA_UPDATE_MODULE_REVISION_CONFLICT",
        "The module revision changed before validation.",
        [
          {
            path: "expectedModuleRevision",
            reason: `expected=${normalized.value.expectedModuleRevision};actual=${moduleState.revision}`,
          },
        ],
      );
    }

    const validationId = this.dependencies.ids.nextValidationId();
    const updateCommand: AreaUpdateCommand = Object.freeze({
      schemaVersion: "area-update-command.v1",
      moduleId: normalized.value.moduleId,
      areaResRef: normalized.value.areaResRef,
      expectedModuleRevision: normalized.value.expectedModuleRevision,
      draft: Object.freeze({ ...normalized.value.draft }),
      clientCommandId: normalized.value.clientCommandId,
    });
    let candidate: AreaUpdateCompiledCandidate;
    try {
      candidate = await this.dependencies.compiler.compile(
        updateCommand,
        moduleState,
        input.actorId,
        validationId,
      );
    } catch (error) {
      if (error instanceof AreaUpdateCompilerFailure) {
        throw appError(
          error.status,
          error.code,
          error.message,
          error.details.slice(0, 32).map((reason) => ({
            path: "candidate",
            reason: reason.slice(0, 256),
          })),
          error.code === "AREA_UPDATE_STORAGE_UNAVAILABLE",
        );
      }
      throw error;
    }

    const summaries = summarizeCandidate(candidate, normalized.value.areaResRef);
    let tileAdmission;
    try {
      tileAdmission = await this.dependencies.tileAdmission.evaluateProductionAdmission({
        tilesetResRef: candidate.projectedDraft.tilesetResRef,
        candidateTileIds: candidate.projectedDraft.tiles.map((tile) => tile.tileId),
      });
    } catch (error) {
      if (error instanceof AreaTileProductionAdmissionSourceError) {
        throw appError(503, error.code, error.message, [], true);
      }
      throw error;
    }
    if (!tileAdmission.allowed) {
      throw appError(
        422,
        tileAdmission.code,
        "The complete Area candidate is not admitted for production materialization.",
        admissionDetails(tileAdmission.diagnostics),
      );
    }
    const createdAt = this.dependencies.clock.now();
    return Object.freeze({
      schemaVersion: AREA_UPDATE_VALIDATION_RECEIPT_SCHEMA_VERSION,
      validationId,
      commandHash: normalized.commandHash,
      moduleId: input.moduleId,
      moduleRevision: moduleState.revision,
      areaResRef: normalized.value.areaResRef,
      sourceAreaSha256: candidate.sourceAreaSha256,
      draft: Object.freeze({ ...normalized.value.draft }),
      setFingerprintSha256: candidate.setFingerprintSha256,
      tileProductionAdmission: tileAdmission.admission,
      candidateAre: Object.freeze({
        fileName: summaries.are.fileName,
        resourceType: summaries.are.resourceType,
        size: summaries.are.size,
        sha256: summaries.are.sha256,
      }),
      candidateResources: summaries.resources,
      candidateModuleIfo: summaries.moduleIfo,
      ...(candidate.unchangedCompanions
        ? { unchangedCompanions: candidate.unchangedCompanions }
        : {}),
      ...(candidate.objectMutation
        ? { objectMutation: candidate.objectMutation }
        : {}),
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
      validatorVersion: AURORA_AREA_UPDATE_CANDIDATE_VALIDATOR_VERSION,
      createdAt: createdAt.toISOString(),
      expiresAt: new Date(createdAt.getTime() + 5 * 60_000).toISOString(),
    });
  }
}

function admissionDetails(
  diagnostics: readonly AreaTileProductionAdmissionDiagnostic[],
): Array<{ path: string; reason: string }> {
  return diagnostics.slice(0, 32).map((diagnostic, index) => ({
    path: `tileProductionAdmission.${index}`,
    reason: formatAreaTileProductionAdmissionDiagnostic(diagnostic),
  }));
}

function summarizeCandidate(
  candidate: AreaUpdateCompiledCandidate,
  expectedAreaResRef: string,
) {
  if (candidate.areaId !== expectedAreaResRef || candidate.resources.length !== 3) {
    throw malformedCandidate("Candidate identity or resource count is invalid.");
  }
  const resources = (["are", "git", "gic"] as const).map((extension) => {
    const matches = candidate.resources.filter((entry) => entry.extension === extension);
    const entry = matches[0];
    if (
      matches.length !== 1 ||
      !entry ||
      entry.fileName.toLowerCase() !== `${expectedAreaResRef}.${extension}` ||
      entry.resourceType !== CANDIDATE_RESOURCE_TYPES[extension] ||
      entry.size !== entry.bytes.length ||
      entry.sha256 !== sha256Hex(entry.bytes)
    ) {
      throw malformedCandidate(
        `Candidate ${extension.toUpperCase()} metadata failed exact validation.`,
      );
    }
    return Object.freeze({
      extension,
      fileName: entry.fileName,
      resourceType: entry.resourceType,
      size: entry.size,
      sha256: entry.sha256,
    });
  });
  const are = resources[0]!;
  const git = resources[1]!;
  const gic = resources[2]!;
  if (candidate.candidateAreaSha256 !== are.sha256) {
    throw malformedCandidate("Candidate ARE identity differs from the compiler summary.");
  }
  if (
    candidate.moduleIfo.fileName.toLowerCase() !== "module.ifo" ||
    candidate.moduleIfo.resourceType !== 2014 ||
    candidate.moduleIfo.candidateBytes.length === 0 ||
    candidate.moduleIfo.candidateSha256 !== sha256Hex(candidate.moduleIfo.candidateBytes)
  ) {
    throw malformedCandidate("Candidate module IFO metadata failed exact validation.");
  }
  const hasObjectMutation = candidate.objectMutation !== undefined;
  const hasAudioEnvironmentMutation = candidate.audioEnvironmentMutation !== undefined;
  const hasVariableMutation = candidate.variableMutation !== undefined;
  const hasUnchangedCompanions = candidate.unchangedCompanions !== undefined;
  if (
    (hasObjectMutation || hasAudioEnvironmentMutation || hasVariableMutation) ===
    hasUnchangedCompanions
  ) {
    throw malformedCandidate("Candidate must report exactly one companion summary mode.");
  }
  if (
    candidate.objectMutation &&
    (
      candidate.objectMutation.candidateGitSha256 !== git.sha256 ||
      candidate.objectMutation.candidateGicSha256 !== gic.sha256
    )
  ) {
    throw malformedCandidate("Object mutation summary differs from GIT/GIC candidates.");
  }
  if (
    candidate.unchangedCompanions &&
    (
      candidate.unchangedCompanions.gitSha256 !== git.sha256 ||
      candidate.unchangedCompanions.gicSha256 !== gic.sha256 ||
      candidate.unchangedCompanions.moduleIfoSha256 !==
        (candidate.moduleStartLocationMutation
          ? candidate.moduleIfo.baselineSha256
          : candidate.moduleIfo.candidateSha256)
    )
  ) {
    throw malformedCandidate("Unchanged companion summary differs from the candidates.");
  }
  if (candidate.moduleStartLocationMutation && (
    candidate.moduleStartLocationMutation.sourceIfoSha256 !== candidate.moduleIfo.baselineSha256 ||
    candidate.moduleStartLocationMutation.candidateIfoSha256 !== candidate.moduleIfo.candidateSha256
  )) {
    throw malformedCandidate("Module start-location summary differs from the IFO candidate.");
  }
  if (candidate.moduleStartLocationMutation) {
    const baselineValue = readModuleIfoStartLocation(candidate.moduleIfo.baselineBytes);
    const candidateValue = readModuleIfoStartLocation(candidate.moduleIfo.candidateBytes);
    if (!baselineValue
        || !candidateValue
        || !areaModuleStartLocationsEqual(
          baselineValue,
          candidate.moduleStartLocationMutation.expectedValue,
        )
        || !areaModuleStartLocationsEqual(
          candidateValue,
          candidate.moduleStartLocationMutation.value,
        )) {
      throw malformedCandidate(
        "Module start-location tuple failed independent baseline/candidate readback.",
      );
    }
  }
  if (candidate.audioEnvironmentMutation) {
    if (
      candidate.audioEnvironmentMutation.sourceGitSha256 !==
        candidate.projectedDraft.audioEnvironment?.sourceGitSha256 ||
      candidate.audioEnvironmentMutation.candidateGitSha256 !== git.sha256 ||
      !areaAudioEnvironmentsEqual(
        candidate.audioEnvironmentMutation.expectedValue,
        candidate.projectedDraft.audioEnvironment?.expectedValue,
      ) ||
      !areaAudioEnvironmentsEqual(
        candidate.audioEnvironmentMutation.value,
        candidate.projectedDraft.audioEnvironment?.value,
      )
    ) {
      throw malformedCandidate("Area audio summary differs from the projected draft or GIT candidate.");
    }
    const candidateValue = parseAreaAudioEnvironmentFromGitGff(
      candidate.resources.find((entry) => entry.extension === "git")!.bytes,
    );
    if (!candidateValue || !areaAudioEnvironmentsEqual(
      candidateValue,
      candidate.audioEnvironmentMutation.value,
    )) {
      throw malformedCandidate(
        "Area audio tuple failed independent candidate GIT readback.",
      );
    }
  }
  if (candidate.variableMutation) {
    const projected = candidate.projectedDraft.variables;
    if (
      !projected ||
      candidate.variableMutation.sourceGitSha256 !== projected.sourceGitSha256 ||
      candidate.variableMutation.candidateGitSha256 !== git.sha256 ||
      !auroraVariableSourceEntriesEqual(
        candidate.variableMutation.expectedEntries,
        projected.expectedEntries,
      ) ||
      !variableTargetsEqual(candidate.variableMutation.entries, projected.entries)
    ) {
      throw malformedCandidate(
        "Area variable summary differs from the projected draft or GIT candidate.",
      );
    }
    const candidateValue = parseAreaVariablesFromGitGff(
      candidate.resources.find((entry) => entry.extension === "git")!.bytes,
    );
    if (!candidateValue || !auroraVariableEntriesEqual(
      candidateValue.expectedEntries,
      candidate.variableMutation.entries,
    )) {
      throw malformedCandidate(
        "Area variable table failed independent typed ordered candidate GIT readback.",
      );
    }
  }
  const projectedVisualSelection =
    candidate.projectedDraft.visualEnvironmentCatalogSelection;
  const resolvedVisualSelection =
    candidate.visualEnvironmentCatalogSelectionMutation;
  if ((projectedVisualSelection === undefined) !== (resolvedVisualSelection === undefined)) {
    throw malformedCandidate(
      "Area visual-selection summary presence differs from the projected draft.",
    );
  }
  if (projectedVisualSelection && resolvedVisualSelection) {
    if (!isExistingAreaVisualEnvironmentCatalogSelectionMutation(
      projectedVisualSelection,
    ) || !isResolvedAreaVisualEnvironmentCatalogSelectionMutation(
      resolvedVisualSelection,
    ) || projectedVisualSelection.catalogIdentity.environmentSha256
      !== resolvedVisualSelection.catalogIdentity.environmentSha256
      || projectedVisualSelection.catalogIdentity.skyBoxesSha256
        !== resolvedVisualSelection.catalogIdentity.skyBoxesSha256
      || !visualCatalogSelectionOrdinalsEqual(
        projectedVisualSelection.expectedValue,
        resolvedVisualSelection.expectedValue,
      )
      || !areaVisualEnvironmentsEqual(
        projectedVisualSelection.expectedValue.visualEnvironment,
        resolvedVisualSelection.expectedValue.visualEnvironment,
      )
      || !areaVisualEnvironmentScalarControlsEqual(
        projectedVisualSelection.expectedValue.visualEnvironmentScalarControls,
        resolvedVisualSelection.expectedValue.visualEnvironmentScalarControls,
      )
      || !visualCatalogSelectionOrdinalsEqual(
        projectedVisualSelection.value,
        resolvedVisualSelection.value,
      )
      || (projectedVisualSelection.value.visualEnvironmentOverride !== undefined
        && !areaVisualEnvironmentsEqual(
          projectedVisualSelection.value.visualEnvironmentOverride,
          resolvedVisualSelection.value.visualEnvironment,
        ))
      || (projectedVisualSelection.value.visualEnvironmentScalarControlsOverride
        !== undefined && !areaVisualEnvironmentScalarControlsEqual(
          projectedVisualSelection.value.visualEnvironmentScalarControlsOverride,
          resolvedVisualSelection.value.visualEnvironmentScalarControls,
        ))
      || (resolvedVisualSelection.lightingSchemeChanged
        && (candidate.projectedDraft.visualEnvironment !== undefined
          || candidate.projectedDraft.visualEnvironmentScalarControls !== undefined))) {
      throw malformedCandidate(
        "Area visual-selection summary differs from the projected catalog-bound draft.",
      );
    }
    const areBytes = candidate.resources.find(
      (entry) => entry.extension === "are",
    )!.bytes;
    const candidateSelection =
      parseAreaVisualEnvironmentCatalogSelectionFromAreGff(areBytes);
    const candidateVisual = parseAreaVisualEnvironmentFromAreGff(areBytes);
    const candidateScalars =
      parseAreaVisualEnvironmentScalarControlsFromAreGff(areBytes);
    if (!candidateSelection || !candidateVisual || !candidateScalars
        || !visualCatalogSelectionOrdinalsEqual(
          candidateSelection,
          resolvedVisualSelection.value,
        )
        || !areaVisualEnvironmentsEqual(
          candidateVisual,
          resolvedVisualSelection.value.visualEnvironment,
        )
        || !areaVisualEnvironmentScalarControlsEqual(
          candidateScalars,
          resolvedVisualSelection.value.visualEnvironmentScalarControls,
        )) {
      throw malformedCandidate(
        "Area visual selection failed independent candidate ARE readback.",
      );
    }
  }
  return Object.freeze({
    are,
    resources: Object.freeze(resources),
    moduleIfo: Object.freeze({
      fileName: candidate.moduleIfo.fileName,
      resourceType: candidate.moduleIfo.resourceType,
      size: candidate.moduleIfo.candidateBytes.length,
      sha256: candidate.moduleIfo.candidateSha256,
    }),
  });
}

function variableTargetsEqual(
  left: readonly AuroraVariableTargetEntry[],
  right: readonly AuroraVariableTargetEntry[],
): boolean {
  return left.length === right.length && left.every((entry, index) => {
    const candidate = right[index];
    return candidate !== undefined && entry.name === candidate.name &&
      entry.type === candidate.type && Object.is(entry.value, candidate.value);
  });
}

function visualCatalogSelectionOrdinalsEqual(
  left: Readonly<{ lightingSchemeRowIndex: number; skyBoxRowIndex: number }>,
  right: Readonly<{ lightingSchemeRowIndex: number; skyBoxRowIndex: number }>,
): boolean {
  return left.lightingSchemeRowIndex === right.lightingSchemeRowIndex
    && left.skyBoxRowIndex === right.skyBoxRowIndex;
}

function malformedCandidate(reason: string): AppException {
  return appError(
    422,
    "AREA_UPDATE_CANDIDATE_INVALID",
    "Compiled Area Update candidate is internally inconsistent.",
    [{ path: "candidate", reason }],
  );
}

function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
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
