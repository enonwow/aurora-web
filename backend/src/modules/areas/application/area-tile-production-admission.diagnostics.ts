import type {
  AreaTileProductionAdmissionDiagnostic,
} from "./area-tile-production-admission.policy";

export function formatAreaTileProductionAdmissionDiagnostic(
  diagnostic: AreaTileProductionAdmissionDiagnostic,
): string {
  return [
    `tileId=${diagnostic.tileId}`,
    ...(diagnostic.stage !== "row" ? [`rowId=${diagnostic.rowId}`] : []),
    `stage=${diagnostic.stage}`,
    `status=${diagnostic.status}`,
    ...(diagnostic.stage === "eligibility"
      ? [`reasonCode=${diagnostic.reasonCode}`]
      : []),
  ].join(";").slice(0, 256);
}

export function areaTileProductionAdmissionDiagnosticMessages(
  diagnostics: readonly AreaTileProductionAdmissionDiagnostic[],
): readonly string[] {
  return Object.freeze(
    diagnostics.slice(0, 32).map(formatAreaTileProductionAdmissionDiagnostic),
  );
}
