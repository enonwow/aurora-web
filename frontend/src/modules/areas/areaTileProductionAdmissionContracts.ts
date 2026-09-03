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
