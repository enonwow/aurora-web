import { buildAreaTileCatalogCertificationKey } from "./areaTileCatalogFilter";
import type { AreaTileCatalogCertificationIndex } from "./areaTileCatalogFilter";
import type {
  TileCertificationProofStage,
  TileCertificationProofStatus,
} from "../domain/tileCertificationPolicy";

export type AreaTileProductionCertificationUnavailableReason =
  | "NO_ACTIVE_TILESET"
  | "ACCESS_UNAVAILABLE"
  | "FACADE_UNAVAILABLE"
  | "LOAD_FAILED";

export type AreaTileProductionCertificationSource =
  | Readonly<{
      status: "loading";
      tilesetResRef: string;
    }>
  | Readonly<{
      status: "unavailable";
      tilesetResRef: string | null;
      reasonCode: AreaTileProductionCertificationUnavailableReason;
    }>
  | Readonly<{
      status: "ready";
      tilesetResRef: string;
      index: AreaTileCatalogCertificationIndex;
    }>;

export type AreaTileProductionPlacementAdmissionCode =
  | "AREA_TILE_PRODUCTION_PLACEMENT_ADMITTED"
  | "AREA_TILE_CERTIFICATION_LOADING"
  | "AREA_TILE_CERTIFICATION_UNAVAILABLE"
  | "AREA_TILE_CERTIFICATION_TILESET_MISMATCH"
  | "AREA_TILE_CERTIFICATION_ROW_MISSING"
  | "AREA_TILE_CERTIFICATION_EXCLUDED"
  | "AREA_TILE_CERTIFICATION_PROOF_MISSING"
  | "AREA_TILE_CERTIFICATION_PROOF_FAILED";

export type AreaTileProductionPlacementDiagnosticStage =
  | "source"
  | "row"
  | "eligibility"
  | Extract<TileCertificationProofStage, "inventory" | "assetClosure" | "render">;

export type AreaTileProductionPlacementDiagnosticStatus =
  | TileCertificationProofStatus
  | "loading"
  | "unavailable"
  | "mismatch"
  | "excluded";

export interface AreaTileProductionPlacementDiagnostic {
  readonly tileId: number;
  readonly rowId?: string;
  readonly stage: AreaTileProductionPlacementDiagnosticStage;
  readonly status: AreaTileProductionPlacementDiagnosticStatus;
  readonly reasonCode?: string;
}

export interface AreaTileProductionPlacementAdmissionResult {
  readonly allowed: boolean;
  readonly code: AreaTileProductionPlacementAdmissionCode;
  readonly tilesetResRef: string;
  readonly tileIds: readonly number[];
  readonly diagnostics: readonly AreaTileProductionPlacementDiagnostic[];
}

export interface AreaTileProductionPlacementAdmissionInput {
  readonly tilesetResRef: string;
  readonly candidateTileIds: readonly number[];
  readonly certification: AreaTileProductionCertificationSource;
}

export { collectChangedAuroraAreaTileDefinitionIds } from "../../scene/domain/auroraAreaTileTopology";

const REQUIRED_RENDER_PROOF_STAGES = [
  "inventory",
  "assetClosure",
  "render",
] as const;

export function evaluateAreaTileProductionPlacementAdmission(
  input: AreaTileProductionPlacementAdmissionInput,
): AreaTileProductionPlacementAdmissionResult {
  const tilesetResRef = normalizeTilesetResRef(input.tilesetResRef);
  const tileIds = [...new Set(input.candidateTileIds)].sort((left, right) => left - right);
  const sourceFailure = evaluateSourceFailure(
    input.certification,
    tilesetResRef,
    tileIds,
  );
  if (sourceFailure) return sourceFailure;
  if (input.certification.status !== "ready") {
    return sourceFailureResultForImpossibleNonReadySource(tilesetResRef, tileIds);
  }

  const diagnostics: AreaTileProductionPlacementDiagnostic[] = [];
  for (const tileId of tileIds) {
    const certificationRow = input.certification.index.get(
      buildAreaTileCatalogCertificationKey(tilesetResRef, tileId),
    );
    if (!certificationRow) {
      diagnostics.push({
        tileId,
        stage: "row",
        status: "missing",
      });
      continue;
    }
    if (certificationRow.eligibility.status === "excluded") {
      diagnostics.push({
        tileId,
        rowId: certificationRow.rowId,
        stage: "eligibility",
        status: "excluded",
        reasonCode: certificationRow.eligibility.reasonCode,
      });
      continue;
    }
    for (const stage of REQUIRED_RENDER_PROOF_STAGES) {
      const status = certificationRow.proofs[stage];
      if (status !== "verified") {
        diagnostics.push({
          tileId,
          rowId: certificationRow.rowId,
          stage,
          status,
        });
      }
    }
  }

  if (diagnostics.length === 0) {
    return {
      allowed: true,
      code: "AREA_TILE_PRODUCTION_PLACEMENT_ADMITTED",
      tilesetResRef,
      tileIds,
      diagnostics,
    };
  }

  return {
    allowed: false,
    code: codeForDiagnostic(diagnostics[0]),
    tilesetResRef,
    tileIds,
    diagnostics,
  };
}

export function formatAreaTileProductionPlacementBlocker(
  result: AreaTileProductionPlacementAdmissionResult,
): string {
  if (result.allowed) return "Tile placement is admitted.";
  const first = result.diagnostics[0];
  const subject = first ? ` Tile_ID ${first.tileId}` : "";
  const stage = first ? ` at ${first.stage}` : "";
  return `${result.code}:${subject}${stage}.`;
}

function evaluateSourceFailure(
  certification: AreaTileProductionCertificationSource,
  tilesetResRef: string,
  tileIds: readonly number[],
): AreaTileProductionPlacementAdmissionResult | null {
  if (certification.status === "loading") {
    return sourceFailure(
      "AREA_TILE_CERTIFICATION_LOADING",
      "loading",
      tilesetResRef,
      tileIds,
    );
  }
  if (certification.status === "unavailable") {
    return sourceFailure(
      "AREA_TILE_CERTIFICATION_UNAVAILABLE",
      "unavailable",
      tilesetResRef,
      tileIds,
      certification.reasonCode,
    );
  }
  if (normalizeTilesetResRef(certification.tilesetResRef) !== tilesetResRef) {
    return sourceFailure(
      "AREA_TILE_CERTIFICATION_TILESET_MISMATCH",
      "mismatch",
      tilesetResRef,
      tileIds,
    );
  }
  return null;
}

function sourceFailure(
  code: AreaTileProductionPlacementAdmissionCode,
  status: Extract<
    AreaTileProductionPlacementDiagnosticStatus,
    "loading" | "unavailable" | "mismatch"
  >,
  tilesetResRef: string,
  tileIds: readonly number[],
  reasonCode?: string,
): AreaTileProductionPlacementAdmissionResult {
  return {
    allowed: false,
    code,
    tilesetResRef,
    tileIds,
    diagnostics: tileIds.map((tileId) => ({
      tileId,
      stage: "source",
      status,
      ...(reasonCode ? { reasonCode } : {}),
    })),
  };
}

function sourceFailureResultForImpossibleNonReadySource(
  tilesetResRef: string,
  tileIds: readonly number[],
): AreaTileProductionPlacementAdmissionResult {
  return sourceFailure(
    "AREA_TILE_CERTIFICATION_UNAVAILABLE",
    "unavailable",
    tilesetResRef,
    tileIds,
    "LOAD_FAILED",
  );
}

function codeForDiagnostic(
  diagnostic: AreaTileProductionPlacementDiagnostic,
): AreaTileProductionPlacementAdmissionCode {
  if (diagnostic.stage === "row") return "AREA_TILE_CERTIFICATION_ROW_MISSING";
  if (diagnostic.stage === "eligibility") return "AREA_TILE_CERTIFICATION_EXCLUDED";
  return diagnostic.status === "failed"
    ? "AREA_TILE_CERTIFICATION_PROOF_FAILED"
    : "AREA_TILE_CERTIFICATION_PROOF_MISSING";
}

function normalizeTilesetResRef(value: string): string {
  return value.trim().toLowerCase();
}
