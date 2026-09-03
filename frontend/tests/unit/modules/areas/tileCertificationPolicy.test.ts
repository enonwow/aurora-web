import { describe, expect, it } from "vitest";
import {
  aggregateReleaseLevel,
  canClaimConnected,
  canClaimTraversable,
  canRenderInProduction,
  isSelectableForProduction,
  type TileCertificationProofs,
  type TileCertificationRow,
  type TileCertificationReleaseGates
} from "../../../../src/modules/areas/domain/tileCertificationPolicy";

const verifiedProofs: TileCertificationProofs = {
  inventory: "verified",
  assetClosure: "verified",
  render: "verified",
  visualSeam: "verified",
  setAdjacency: "verified",
  pathReference: "verified",
  pathConnect: "verified",
  wokSeam: "verified",
  persistence: "verified",
  toolset: "verified",
  nwnRuntime: "verified"
};

const allReleaseGates: TileCertificationReleaseGates = {
  featureSliceComplete: true,
  tilesetProfileCoverageComplete: true,
  areasProductCapabilitiesComplete: true,
  allProductionProfilesCertified: true,
  fullCorpusCoverageComplete: true
};

function eligibleRow(
  rowId: string,
  proofOverrides: Partial<TileCertificationProofs> = {}
): TileCertificationRow {
  return {
    rowId,
    eligibility: { status: "eligible" },
    proofs: { ...verifiedProofs, ...proofOverrides }
  };
}

function excludedRow(
  rowId: string,
  proofOverrides: Partial<TileCertificationProofs> = {}
): TileCertificationRow {
  return {
    rowId,
    eligibility: {
      status: "excluded",
      reasonCode: "NON_RUNTIME_PLACEHOLDER",
      reason: "The SET row is a reviewed non-runtime placeholder."
    },
    proofs: { ...verifiedProofs, ...proofOverrides }
  };
}

describe("tile certification production policy", () => {
  it("keeps eligibility independent from proof status and never selects excluded rows", () => {
    const eligibleWithMissingProof = eligibleRow("eligible-missing", {
      render: "missing"
    });
    const excludedWithVerifiedProofs = excludedRow("excluded-verified");

    expect(isSelectableForProduction(eligibleWithMissingProof)).toBe(true);
    expect(canRenderInProduction(eligibleWithMissingProof)).toBe(false);
    expect(isSelectableForProduction(excludedWithVerifiedProofs)).toBe(false);
    expect(canRenderInProduction(excludedWithVerifiedProofs)).toBe(false);
    expect(canClaimConnected(excludedWithVerifiedProofs)).toBe(false);
    expect(canClaimTraversable(excludedWithVerifiedProofs)).toBe(false);
  });

  it.each(["inventory", "assetClosure", "render"] as const)(
    "requires verified %s proof before production rendering",
    (stage) => {
      expect(canRenderInProduction(eligibleRow(`missing-${stage}`, { [stage]: "missing" }))).toBe(
        false
      );
      expect(canRenderInProduction(eligibleRow(`failed-${stage}`, { [stage]: "failed" }))).toBe(
        false
      );
    }
  );

  it("allows production rendering only for an eligible row with complete render closure", () => {
    expect(canRenderInProduction(eligibleRow("render-ready"))).toBe(true);
  });

  it.each([
    "render",
    "visualSeam",
    "setAdjacency",
    "pathConnect",
    "wokSeam"
  ] as const)("blocks a connected claim when %s is not verified", (stage) => {
    expect(canClaimConnected(eligibleRow(`missing-${stage}`, { [stage]: "missing" }))).toBe(false);
    expect(canClaimConnected(eligibleRow(`failed-${stage}`, { [stage]: "failed" }))).toBe(false);
  });

  it("never treats PathReference as a substitute for native PathConnect", () => {
    expect(
      canClaimConnected(
        eligibleRow("reference-only", {
          pathReference: "verified",
          pathConnect: "missing"
        })
      )
    ).toBe(false);
    expect(
      canClaimConnected(
        eligibleRow("native-connected", {
          pathReference: "missing",
          pathConnect: "verified"
        })
      )
    ).toBe(true);
  });

  it.each(["persistence", "toolset", "nwnRuntime"] as const)(
    "blocks traversability when %s is not verified",
    (stage) => {
      expect(canClaimConnected(eligibleRow(`connected-${stage}`, { [stage]: "missing" }))).toBe(
        true
      );
      expect(canClaimTraversable(eligibleRow(`missing-${stage}`, { [stage]: "missing" }))).toBe(
        false
      );
      expect(canClaimTraversable(eligibleRow(`failed-${stage}`, { [stage]: "failed" }))).toBe(
        false
      );
    }
  );

  it("allows a traversability claim only after connection and native persistence/runtime proof", () => {
    expect(canClaimTraversable(eligibleRow("traversable"))).toBe(true);
  });
});

describe("aggregateReleaseLevel", () => {
  it("reaches full-corpus level only through every ordered gate and fully traversable eligible rows", () => {
    const result = aggregateReleaseLevel(
      [eligibleRow("eligible"), excludedRow("reviewed-exclusion")],
      allReleaseGates
    );

    expect(result.level).toBe(4);
    expect(result.counts).toEqual({
      total: 2,
      eligible: 1,
      excluded: 1,
      selectable: 1,
      renderable: 1,
      connected: 1,
      traversable: 1,
      failedProofs: 0,
      missingProofs: 0
    });
    expect(result.selectableRowIds).toEqual(["eligible"]);
    expect(result.diagnostics).toEqual([]);
  });

  it.each([
    ["featureSliceComplete", 0],
    ["tilesetProfileCoverageComplete", 1],
    ["areasProductCapabilitiesComplete", 2],
    ["allProductionProfilesCertified", 2],
    ["fullCorpusCoverageComplete", 3]
  ] as const)("cannot jump past a missing %s gate", (gate, expectedLevel) => {
    const result = aggregateReleaseLevel([eligibleRow(`gate-${gate}`)], {
      ...allReleaseGates,
      [gate]: false
    });

    expect(result.level).toBe(expectedLevel);
  });

  it("keeps every failed and missing proof visible, including diagnostics for excluded rows", () => {
    const result = aggregateReleaseLevel(
      [
        eligibleRow("eligible-failed", {
          render: "failed",
          pathConnect: "missing"
        }),
        excludedRow("excluded-missing", {
          wokSeam: "missing"
        })
      ],
      allReleaseGates
    );

    expect(result.level).toBe(0);
    expect(result.counts.renderable).toBe(0);
    expect(result.counts.failedProofs).toBe(1);
    expect(result.counts.missingProofs).toBe(2);
    expect(result.diagnostics).toEqual([
      {
        rowId: "eligible-failed",
        eligibility: "eligible",
        stage: "render",
        status: "failed",
        blocksRelease: true
      },
      {
        rowId: "eligible-failed",
        eligibility: "eligible",
        stage: "pathConnect",
        status: "missing",
        blocksRelease: true
      },
      {
        rowId: "excluded-missing",
        eligibility: "excluded",
        stage: "wokSeam",
        status: "missing",
        blocksRelease: false
      }
    ]);
    expect(result.selectableRowIds).toEqual(["eligible-failed"]);
  });

  it("does not let verified PathReference promote a release when PathConnect is missing", () => {
    const result = aggregateReleaseLevel(
      [
        eligibleRow("reference-is-not-connection", {
          pathReference: "verified",
          pathConnect: "missing"
        })
      ],
      allReleaseGates
    );

    expect(result.level).toBe(0);
    expect(result.counts.connected).toBe(0);
    expect(result.counts.traversable).toBe(0);
    expect(result.diagnostics).toContainEqual({
      rowId: "reference-is-not-connection",
      eligibility: "eligible",
      stage: "pathConnect",
      status: "missing",
      blocksRelease: true
    });
  });

  it("does not certify an empty release scope", () => {
    const result = aggregateReleaseLevel([], allReleaseGates);

    expect(result.level).toBe(0);
    expect(result.counts.total).toBe(0);
    expect(result.selectableRowIds).toEqual([]);
  });

  it("does not mutate rows or gates while deriving the release result", () => {
    const rows = [eligibleRow("immutable")];
    const gates = { ...allReleaseGates };
    const rowsBefore = structuredClone(rows);
    const gatesBefore = structuredClone(gates);

    aggregateReleaseLevel(rows, gates);

    expect(rows).toEqual(rowsBefore);
    expect(gates).toEqual(gatesBefore);
  });
});
