import type {
  AreaTileProductionAdmissionResult,
} from "../area-tile-production-admission.policy";

export const AREA_TILE_PRODUCTION_ADMISSION = Symbol(
  "AREA_TILE_PRODUCTION_ADMISSION",
);

export type AreaTileProductionAdmissionSourceErrorCode =
  | "AREA_TILE_CERTIFICATION_LEDGER_UNAVAILABLE"
  | "AREA_TILE_CERTIFICATION_LEDGER_INVALID";

export class AreaTileProductionAdmissionSourceError extends Error {
  readonly status = 503 as const;

  constructor(
    readonly code: AreaTileProductionAdmissionSourceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AreaTileProductionAdmissionSourceError";
  }
}

export interface AreaTileProductionAdmissionPort {
  evaluateProductionAdmission(input: Readonly<{
    tilesetResRef: string;
    candidateTileIds: readonly number[];
  }>): Promise<AreaTileProductionAdmissionResult>;
}
