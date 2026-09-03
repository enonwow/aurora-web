import { createHash } from "node:crypto";
import {
  evaluateAreaTileProductionAdmission,
  type AreaTileProductionAdmissionPolicyInput,
  type AreaTileProductionAdmissionRow,
} from "../../src/modules/areas/application/area-tile-production-admission.policy";

const verifiedProofs = Object.freeze({
  inventory: "verified",
  assetClosure: "verified",
  render: "verified",
  visualSeam: "missing",
  setAdjacency: "missing",
  pathReference: "missing",
  pathConnect: "missing",
  wokSeam: "missing",
  persistence: "missing",
  toolset: "missing",
  nwnRuntime: "missing",
} as const);

function row(
  tileId: number,
  overrides: Partial<AreaTileProductionAdmissionRow> = {},
): AreaTileProductionAdmissionRow {
  return Object.freeze({
    tileId,
    rowId: `tile:tms01:${tileId}`,
    capabilityId: "topology_certified_placement_gate",
    eligibility: { status: "eligible" as const },
    proofs: verifiedProofs,
    ...overrides,
  });
}

function input(
  candidateTileIds: readonly number[],
  rows: readonly AreaTileProductionAdmissionRow[],
): AreaTileProductionAdmissionPolicyInput {
  return {
    report: {
      generatedAtIso: "2026-08-21T18:00:00.000Z",
      planId: "plan-01",
      corpusHash: "c".repeat(64),
      profileId: "source-bound-v7",
      ledgerSha256: "d".repeat(64),
      reportSha256: "e".repeat(64),
    },
    tilesetResRef: "TMS01",
    candidateTileIds,
    rows,
  };
}

describe("Area tile production materialization admission policy", () => {
  it("admits the exact deduplicated Tile_ID set and returns reproducible report provenance", () => {
    const result = evaluateAreaTileProductionAdmission(input(
      [7, 2, 7],
      [row(7), row(2)],
    ));
    const expectedSetHash = createHash("sha256")
      .update(JSON.stringify({ tileIds: [2, 7], tilesetResRef: "tms01" }), "utf8")
      .digest("hex");

    expect(result).toEqual({
      allowed: true,
      code: "AREA_TILE_PRODUCTION_ADMITTED",
      tilesetResRef: "tms01",
      tileIds: [2, 7],
      diagnostics: [],
      admission: {
        schemaVersion: "area-tile-production-admission.v1",
        policyVersion: "area-tile-production-admission-policy.v1",
        reportGeneratedAtIso: "2026-08-21T18:00:00.000Z",
        planId: "plan-01",
        corpusHash: "c".repeat(64),
        profileId: "source-bound-v7",
        ledgerSha256: "d".repeat(64),
        reportSha256: "e".repeat(64),
        tilesetResRef: "tms01",
        uniqueTileIdCount: 2,
        tileIdSetSha256: expectedSetHash,
      },
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(result.allowed).toBe(true);
    if (!result.allowed) throw new Error("Expected admitted result");
    expect(Object.isFrozen(result.admission)).toBe(true);
  });

  it("rejects a missing exact row and an excluded row atomically in Tile_ID order", () => {
    const result = evaluateAreaTileProductionAdmission(input(
      [8, 2, 6],
      [
        row(2),
        row(6, {
          eligibility: {
            status: "excluded",
            reasonCode: "certification_plan_excluded",
          },
        }),
      ],
    ));

    expect(result).toEqual({
      allowed: false,
      code: "AREA_TILE_CERTIFICATION_EXCLUDED",
      tilesetResRef: "tms01",
      tileIds: [2, 6, 8],
      diagnostics: [
        {
          tileId: 6,
          rowId: "tile:tms01:6",
          stage: "eligibility",
          status: "excluded",
          reasonCode: "certification_plan_excluded",
        },
        { tileId: 8, stage: "row", status: "missing" },
      ],
    });
    expect(result).not.toHaveProperty("admission");
  });

  it.each(["inventory", "assetClosure", "render"] as const)(
    "rejects missing and failed %s proof independently",
    (stage) => {
      const missing = evaluateAreaTileProductionAdmission(input([3], [row(3, {
        proofs: { ...verifiedProofs, [stage]: "missing" },
      })]));
      const failed = evaluateAreaTileProductionAdmission(input([3], [row(3, {
        proofs: { ...verifiedProofs, [stage]: "failed" },
      })]));

      expect(missing).toMatchObject({
        allowed: false,
        code: "AREA_TILE_CERTIFICATION_PROOF_MISSING",
        diagnostics: [{ tileId: 3, stage, status: "missing" }],
      });
      expect(failed).toMatchObject({
        allowed: false,
        code: "AREA_TILE_CERTIFICATION_PROOF_FAILED",
        diagnostics: [{ tileId: 3, stage, status: "failed" }],
      });
    },
  );

  it("keeps required proof order deterministic and ignores independent connectivity/native dimensions", () => {
    const result = evaluateAreaTileProductionAdmission(input([4], [row(4, {
      proofs: {
        ...verifiedProofs,
        inventory: "failed",
        assetClosure: "missing",
        render: "failed",
        pathConnect: "failed",
        wokSeam: "failed",
        toolset: "failed",
        nwnRuntime: "failed",
      },
    })]));

    expect(result).toMatchObject({
      allowed: false,
      code: "AREA_TILE_CERTIFICATION_PROOF_FAILED",
      diagnostics: [
        { tileId: 4, stage: "inventory", status: "failed" },
        { tileId: 4, stage: "assetClosure", status: "missing" },
        { tileId: 4, stage: "render", status: "failed" },
      ],
    });

    const independentOnly = evaluateAreaTileProductionAdmission(input([5], [row(5, {
      proofs: {
        ...verifiedProofs,
        visualSeam: "failed",
        setAdjacency: "failed",
        pathReference: "failed",
        pathConnect: "failed",
        wokSeam: "failed",
        persistence: "failed",
        toolset: "failed",
        nwnRuntime: "failed",
      },
    })]));
    expect(independentOnly.allowed).toBe(true);
  });
});
