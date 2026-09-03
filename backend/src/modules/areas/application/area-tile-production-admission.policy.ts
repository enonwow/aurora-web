import { createHash } from "node:crypto";
import type { AreaProofStates } from "../domain/area-certification.types";
import {
  AREA_TILE_PRODUCTION_ADMISSION_POLICY_VERSION,
  AREA_TILE_PRODUCTION_ADMISSION_SCHEMA_VERSION,
  type AreaTileProductionAdmissionBinding,
} from "../domain/area-tile-production-admission";

export {
  AREA_TILE_PRODUCTION_ADMISSION_POLICY_VERSION,
  AREA_TILE_PRODUCTION_ADMISSION_SCHEMA_VERSION,
};
export type { AreaTileProductionAdmissionBinding };

export const AREA_TILE_PRODUCTION_REQUIRED_PROOFS = Object.freeze([
  "inventory",
  "assetClosure",
  "render",
] as const);

export type AreaTileProductionAdmissionBlockerCode =
  | "AREA_TILE_CERTIFICATION_ROW_MISSING"
  | "AREA_TILE_CERTIFICATION_EXCLUDED"
  | "AREA_TILE_CERTIFICATION_PROOF_MISSING"
  | "AREA_TILE_CERTIFICATION_PROOF_FAILED";

export type AreaTileProductionAdmissionCode =
  | "AREA_TILE_PRODUCTION_ADMITTED"
  | AreaTileProductionAdmissionBlockerCode;

export interface AreaTileProductionAdmissionReportBinding {
  readonly generatedAtIso: string;
  readonly planId: string;
  readonly corpusHash: string;
  readonly profileId: string;
  readonly ledgerSha256: string;
  readonly reportSha256: string;
}

export type AreaTileProductionAdmissionEligibility =
  | Readonly<{ status: "eligible" }>
  | Readonly<{
      status: "excluded";
      reasonCode: "certification_plan_excluded";
    }>;

export interface AreaTileProductionAdmissionRow {
  readonly tileId: number;
  readonly rowId: string;
  readonly capabilityId: string;
  readonly eligibility: AreaTileProductionAdmissionEligibility;
  readonly proofs: AreaProofStates;
}

export type AreaTileProductionAdmissionDiagnostic =
  | Readonly<{
      tileId: number;
      stage: "row";
      status: "missing";
    }>
  | Readonly<{
      tileId: number;
      rowId: string;
      stage: "eligibility";
      status: "excluded";
      reasonCode: "certification_plan_excluded";
    }>
  | Readonly<{
      tileId: number;
      rowId: string;
      stage: (typeof AREA_TILE_PRODUCTION_REQUIRED_PROOFS)[number];
      status: "missing" | "failed";
    }>;

export interface AreaTileProductionAdmissionPolicyInput {
  readonly report: AreaTileProductionAdmissionReportBinding;
  readonly tilesetResRef: string;
  readonly candidateTileIds: readonly number[];
  readonly rows: readonly AreaTileProductionAdmissionRow[];
}

export type AreaTileProductionAdmissionResult =
  | Readonly<{
      allowed: true;
      code: "AREA_TILE_PRODUCTION_ADMITTED";
      tilesetResRef: string;
      tileIds: readonly number[];
      diagnostics: readonly [];
      admission: AreaTileProductionAdmissionBinding;
    }>
  | Readonly<{
      allowed: false;
      code: AreaTileProductionAdmissionBlockerCode;
      tilesetResRef: string;
      tileIds: readonly number[];
      diagnostics: readonly AreaTileProductionAdmissionDiagnostic[];
    }>;

export function evaluateAreaTileProductionAdmission(
  input: AreaTileProductionAdmissionPolicyInput,
): AreaTileProductionAdmissionResult {
  const tilesetResRef = input.tilesetResRef.trim().toLowerCase();
  const tileIds = Object.freeze(
    [...new Set(input.candidateTileIds)].sort((left, right) => left - right),
  );
  const rowsByTileId = new Map(input.rows.map((row) => [row.tileId, row]));
  const diagnostics: AreaTileProductionAdmissionDiagnostic[] = [];

  for (const tileId of tileIds) {
    const row = rowsByTileId.get(tileId);
    if (!row) {
      diagnostics.push(Object.freeze({
        tileId,
        stage: "row",
        status: "missing",
      }));
      continue;
    }
    if (row.eligibility.status === "excluded") {
      diagnostics.push(Object.freeze({
        tileId,
        rowId: row.rowId,
        stage: "eligibility",
        status: "excluded",
        reasonCode: row.eligibility.reasonCode,
      }));
      continue;
    }
    for (const stage of AREA_TILE_PRODUCTION_REQUIRED_PROOFS) {
      const status = row.proofs[stage];
      if (status === "missing" || status === "failed") {
        diagnostics.push(Object.freeze({
          tileId,
          rowId: row.rowId,
          stage,
          status,
        }));
      }
    }
  }

  if (diagnostics.length > 0) {
    return deepFreeze({
      allowed: false,
      code: blockerCodeFor(diagnostics[0]!),
      tilesetResRef,
      tileIds,
      diagnostics: Object.freeze(diagnostics),
    });
  }

  return deepFreeze({
    allowed: true,
    code: "AREA_TILE_PRODUCTION_ADMITTED",
    tilesetResRef,
    tileIds,
    diagnostics: Object.freeze([]) as readonly [],
    admission: {
      schemaVersion: AREA_TILE_PRODUCTION_ADMISSION_SCHEMA_VERSION,
      policyVersion: AREA_TILE_PRODUCTION_ADMISSION_POLICY_VERSION,
      reportGeneratedAtIso: input.report.generatedAtIso,
      planId: input.report.planId,
      corpusHash: input.report.corpusHash,
      profileId: input.report.profileId,
      ledgerSha256: input.report.ledgerSha256,
      reportSha256: input.report.reportSha256,
      tilesetResRef,
      uniqueTileIdCount: tileIds.length,
      tileIdSetSha256: areaTileProductionAdmissionSetSha256({
        tileIds,
        tilesetResRef,
      }),
    },
  });
}

export function areaTileProductionAdmissionSetSha256(input: Readonly<{
  tileIds: readonly number[];
  tilesetResRef: string;
}>): string {
  return createHash("sha256")
    .update(stableJson({
      tileIds: input.tileIds,
      tilesetResRef: input.tilesetResRef,
    }), "utf8")
    .digest("hex");
}

function blockerCodeFor(
  diagnostic: AreaTileProductionAdmissionDiagnostic,
): AreaTileProductionAdmissionBlockerCode {
  if (diagnostic.stage === "row") {
    return "AREA_TILE_CERTIFICATION_ROW_MISSING";
  }
  if (diagnostic.stage === "eligibility") {
    return "AREA_TILE_CERTIFICATION_EXCLUDED";
  }
  return diagnostic.status === "failed"
    ? "AREA_TILE_CERTIFICATION_PROOF_FAILED"
    : "AREA_TILE_CERTIFICATION_PROOF_MISSING";
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${stableJson(value[key])}`
    ).join(",")}}`;
  }
  const primitive = JSON.stringify(value);
  return primitive === undefined ? "null" : primitive;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return Object.freeze(value);
}
