import type {
  AreaTileProductionAdmissionBinding,
} from "../../../src/modules/areas/application/area-tile-production-admission.policy";

export function areaTileProductionAdmissionFixture(
  tilesetResRef = "tms01",
): AreaTileProductionAdmissionBinding {
  return Object.freeze({
    schemaVersion: "area-tile-production-admission.v1",
    policyVersion: "area-tile-production-admission-policy.v1",
    reportGeneratedAtIso: "2026-08-21T18:00:00.000Z",
    planId: "plan-fixture",
    corpusHash: "a".repeat(64),
    profileId: "source-bound-v7",
    ledgerSha256: "b".repeat(64),
    reportSha256: "c".repeat(64),
    tilesetResRef,
    uniqueTileIdCount: 1,
    tileIdSetSha256: "d".repeat(64),
  });
}
