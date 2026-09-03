export type TileCertificationProofStatus = "verified" | "failed" | "missing";

export interface TileCertificationProofs {
  readonly inventory: TileCertificationProofStatus;
  readonly assetClosure: TileCertificationProofStatus;
  readonly render: TileCertificationProofStatus;
  readonly visualSeam: TileCertificationProofStatus;
  readonly setAdjacency: TileCertificationProofStatus;
  readonly pathReference: TileCertificationProofStatus;
  readonly pathConnect: TileCertificationProofStatus;
  readonly wokSeam: TileCertificationProofStatus;
  readonly persistence: TileCertificationProofStatus;
  readonly toolset: TileCertificationProofStatus;
  readonly nwnRuntime: TileCertificationProofStatus;
}

export type TileCertificationProofStage = keyof TileCertificationProofs;

export type TileEligibility =
  | { readonly status: "eligible" }
  | {
      readonly status: "excluded";
      readonly reasonCode: string;
      readonly reason: string;
    };

export interface TileCertificationRow {
  readonly rowId: string;
  readonly eligibility: TileEligibility;
  readonly proofs: TileCertificationProofs;
}

export interface TileCertificationReleaseGates {
  readonly featureSliceComplete: boolean;
  readonly tilesetProfileCoverageComplete: boolean;
  readonly areasProductCapabilitiesComplete: boolean;
  readonly allProductionProfilesCertified: boolean;
  readonly fullCorpusCoverageComplete: boolean;
}

export type TileCertificationReleaseLevel = 0 | 1 | 2 | 3 | 4;

export interface TileCertificationDiagnostic {
  readonly rowId: string;
  readonly eligibility: TileEligibility["status"];
  readonly stage: TileCertificationProofStage;
  readonly status: Exclude<TileCertificationProofStatus, "verified">;
  readonly blocksRelease: boolean;
}

export interface TileCertificationReleaseCounts {
  readonly total: number;
  readonly eligible: number;
  readonly excluded: number;
  readonly selectable: number;
  readonly renderable: number;
  readonly connected: number;
  readonly traversable: number;
  readonly failedProofs: number;
  readonly missingProofs: number;
}

export interface TileCertificationReleaseResult {
  readonly level: TileCertificationReleaseLevel;
  readonly counts: TileCertificationReleaseCounts;
  readonly selectableRowIds: readonly string[];
  readonly diagnostics: readonly TileCertificationDiagnostic[];
}

const PROOF_STAGES: readonly TileCertificationProofStage[] = [
  "inventory",
  "assetClosure",
  "render",
  "visualSeam",
  "setAdjacency",
  "pathReference",
  "pathConnect",
  "wokSeam",
  "persistence",
  "toolset",
  "nwnRuntime"
];

const RENDER_PROOF_STAGES: readonly TileCertificationProofStage[] = [
  "inventory",
  "assetClosure",
  "render"
];

const CONNECTION_PROOF_STAGES: readonly TileCertificationProofStage[] = [
  "visualSeam",
  "setAdjacency",
  "pathConnect",
  "wokSeam"
];

const TRAVERSABILITY_PROOF_STAGES: readonly TileCertificationProofStage[] = [
  "persistence",
  "toolset",
  "nwnRuntime"
];

export function isSelectableForProduction(row: TileCertificationRow): boolean {
  return row.eligibility.status === "eligible";
}

export function canRenderInProduction(row: TileCertificationRow): boolean {
  return isSelectableForProduction(row) && areProofsVerified(row.proofs, RENDER_PROOF_STAGES);
}

export function canClaimConnected(row: TileCertificationRow): boolean {
  return (
    canRenderInProduction(row) &&
    areProofsVerified(row.proofs, CONNECTION_PROOF_STAGES)
  );
}

export function canClaimTraversable(row: TileCertificationRow): boolean {
  return (
    canClaimConnected(row) &&
    areProofsVerified(row.proofs, TRAVERSABILITY_PROOF_STAGES)
  );
}

export function aggregateReleaseLevel(
  rows: readonly TileCertificationRow[],
  gates: TileCertificationReleaseGates
): TileCertificationReleaseResult {
  const eligibleRows = rows.filter(isSelectableForProduction);
  const selectableRowIds = eligibleRows.map((row) => row.rowId);
  const renderable = eligibleRows.filter(canRenderInProduction).length;
  const connected = eligibleRows.filter(canClaimConnected).length;
  const traversable = eligibleRows.filter(canClaimTraversable).length;
  const diagnostics = collectDiagnostics(rows);
  const hasCertifiableScope =
    eligibleRows.length > 0 && traversable === eligibleRows.length;

  return {
    level: deriveReleaseLevel(hasCertifiableScope, gates),
    counts: {
      total: rows.length,
      eligible: eligibleRows.length,
      excluded: rows.length - eligibleRows.length,
      selectable: selectableRowIds.length,
      renderable,
      connected,
      traversable,
      failedProofs: diagnostics.filter((diagnostic) => diagnostic.status === "failed").length,
      missingProofs: diagnostics.filter((diagnostic) => diagnostic.status === "missing").length
    },
    selectableRowIds,
    diagnostics
  };
}

function areProofsVerified(
  proofs: TileCertificationProofs,
  stages: readonly TileCertificationProofStage[]
): boolean {
  return stages.every((stage) => proofs[stage] === "verified");
}

function collectDiagnostics(
  rows: readonly TileCertificationRow[]
): TileCertificationDiagnostic[] {
  return rows.flatMap((row) =>
    PROOF_STAGES.flatMap((stage): TileCertificationDiagnostic[] => {
      const status = row.proofs[stage];
      if (status === "verified") {
        return [];
      }

      return [
        {
          rowId: row.rowId,
          eligibility: row.eligibility.status,
          stage,
          status,
          blocksRelease: row.eligibility.status === "eligible"
        }
      ];
    })
  );
}

function deriveReleaseLevel(
  hasCertifiableScope: boolean,
  gates: TileCertificationReleaseGates
): TileCertificationReleaseLevel {
  if (!hasCertifiableScope || !gates.featureSliceComplete) {
    return 0;
  }
  if (!gates.tilesetProfileCoverageComplete) {
    return 1;
  }
  if (
    !gates.areasProductCapabilitiesComplete ||
    !gates.allProductionProfilesCertified
  ) {
    return 2;
  }
  if (!gates.fullCorpusCoverageComplete) {
    return 3;
  }
  return 4;
}
