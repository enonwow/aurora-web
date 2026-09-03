export const AREA_TILE_PRODUCTION_ADMISSION_SCHEMA_VERSION =
  "area-tile-production-admission.v1" as const;

export const AREA_TILE_PRODUCTION_ADMISSION_POLICY_VERSION =
  "area-tile-production-admission-policy.v1" as const;

export interface AreaTileProductionAdmissionBinding {
  readonly schemaVersion: typeof AREA_TILE_PRODUCTION_ADMISSION_SCHEMA_VERSION;
  readonly policyVersion: typeof AREA_TILE_PRODUCTION_ADMISSION_POLICY_VERSION;
  readonly reportGeneratedAtIso: string;
  readonly planId: string;
  readonly corpusHash: string;
  readonly profileId: string;
  readonly ledgerSha256: string;
  readonly reportSha256: string;
  readonly tilesetResRef: string;
  readonly uniqueTileIdCount: number;
  readonly tileIdSetSha256: string;
}

export function sameAreaTileProductionAdmissionBinding(
  left: AreaTileProductionAdmissionBinding | null | undefined,
  right: AreaTileProductionAdmissionBinding | null | undefined,
): boolean {
  if (!left || !right) {
    return false;
  }
  return (
    left.schemaVersion === right.schemaVersion &&
    left.policyVersion === right.policyVersion &&
    left.reportGeneratedAtIso === right.reportGeneratedAtIso &&
    left.planId === right.planId &&
    left.corpusHash === right.corpusHash &&
    left.profileId === right.profileId &&
    left.ledgerSha256 === right.ledgerSha256 &&
    left.reportSha256 === right.reportSha256 &&
    left.tilesetResRef === right.tilesetResRef &&
    left.uniqueTileIdCount === right.uniqueTileIdCount &&
    left.tileIdSetSha256 === right.tileIdSetSha256
  );
}
