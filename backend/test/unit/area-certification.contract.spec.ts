import {
  aggregateAreaCertificationRows,
  type AreaCertificationAggregate,
} from "../../src/modules/areas/domain/area-certification.aggregate";
import {
  AREA_CERTIFICATION_SCHEMA_VERSION,
  AREA_PROOF_DIMENSIONS,
  type AreaCertificationRow,
  type AreaProofStates,
} from "../../src/modules/areas/domain/area-certification.types";
import {
  validateAreaCertificationRow,
} from "../../src/modules/areas/domain/area-certification.validation";

const verifiedProofs = (): AreaProofStates => ({
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
  nwnRuntime: "verified",
});

const productionRow = (
  overrides: Partial<AreaCertificationRow> = {},
): AreaCertificationRow => ({
  rowId: "row:tno01:tile:101",
  capabilityId: "area.tile.render-and-connect",
  releaseScope: "production",
  eligibility: { status: "eligible" },
  identity: {
    schemaVersion: AREA_CERTIFICATION_SCHEMA_VERSION,
    planId: "area-matrix-2026-08-07",
    corpusHash: "sha256:corpus",
    profileId: "nwn-ee-default",
    subject: {
      kind: "tile-definition",
      id: "tno01:101",
    },
  },
  proofs: verifiedProofs(),
  ...overrides,
});

describe("Area capability certification contract", () => {
  it("keeps the complete proof-state vocabulary explicit and stable", () => {
    expect(AREA_PROOF_DIMENSIONS).toEqual([
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
      "nwnRuntime",
    ]);
  });

  it("accepts and freezes a fully identified eligible production row", () => {
    const result = validateAreaCertificationRow(productionRow());

    expect(result.valid).toBe(true);
    if (!result.valid) {
      throw new Error("Expected a valid certification row");
    }

    expect(Object.isFrozen(result.value)).toBe(true);
    expect(Object.isFrozen(result.value.eligibility)).toBe(true);
    expect(Object.isFrozen(result.value.identity)).toBe(true);
    expect(Object.isFrozen(result.value.identity?.subject)).toBe(true);
    expect(Object.isFrozen(result.value.proofs)).toBe(true);
  });

  it("rejects an eligible production row without immutable certification identity", () => {
    const result = validateAreaCertificationRow(
      productionRow({ identity: undefined }),
    );

    expect(result).toEqual({
      valid: false,
      issues: [
        expect.objectContaining({
          code: "production_identity_required",
          path: "identity",
        }),
      ],
    });
  });

  it("rejects incomplete identity fields for an eligible production row", () => {
    const input = productionRow({
      identity: {
        schemaVersion: AREA_CERTIFICATION_SCHEMA_VERSION,
        planId: " ",
        corpusHash: "sha256:corpus",
        profileId: "nwn-ee-default",
        subject: { kind: "tile-definition", id: "" },
      },
    });

    const result = validateAreaCertificationRow(input);

    expect(result.valid).toBe(false);
    if (result.valid) {
      throw new Error("Expected identity validation to fail");
    }
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "identity.planId" }),
        expect.objectContaining({ path: "identity.subject.id" }),
      ]),
    );
  });

  it("requires a non-blank exclusion reason", () => {
    const result = validateAreaCertificationRow(
      productionRow({
        eligibility: { status: "excluded", reason: "   " },
        identity: undefined,
      }),
    );

    expect(result).toEqual({
      valid: false,
      issues: [
        expect.objectContaining({
          code: "exclusion_reason_required",
          path: "eligibility.reason",
        }),
      ],
    });
  });

  it("forbids a reason on an eligible row", () => {
    const input = productionRow() as unknown as Record<string, unknown>;
    input.eligibility = {
      status: "eligible",
      reason: "This row should not carry an exclusion explanation",
    };

    const result = validateAreaCertificationRow(input);

    expect(result).toEqual({
      valid: false,
      issues: [
        expect.objectContaining({
          code: "eligible_reason_forbidden",
          path: "eligibility.reason",
        }),
      ],
    });
  });

  it("rejects a missing or unsupported state independently for every proof dimension", () => {
    for (const dimension of AREA_PROOF_DIMENSIONS) {
      const missingInput = productionRow() as unknown as {
        proofs: Record<string, unknown>;
      };
      delete missingInput.proofs[dimension];

      const missingResult = validateAreaCertificationRow(missingInput);
      expect(missingResult).toEqual({
        valid: false,
        issues: [
          expect.objectContaining({
            code: "invalid_proof_state",
            path: `proofs.${dimension}`,
          }),
        ],
      });

      const unsupportedInput = productionRow() as unknown as {
        proofs: Record<string, unknown>;
      };
      unsupportedInput.proofs[dimension] = "inferred";

      const unsupportedResult = validateAreaCertificationRow(unsupportedInput);
      expect(unsupportedResult).toEqual({
        valid: false,
        issues: [
          expect.objectContaining({
            code: "invalid_proof_state",
            path: `proofs.${dimension}`,
          }),
        ],
      });
    }
  });

  it("aggregates rows deterministically regardless of input order", () => {
    const rows = [
      productionRow(),
      productionRow({
        rowId: "row:tno01:tile:102",
        proofs: {
          ...verifiedProofs(),
          render: "failed",
          pathConnect: "missing",
        },
      }),
      productionRow({
        rowId: "row:tno01:tile:placeholder",
        eligibility: {
          status: "excluded",
          reason: "SET placeholder is not selectable in production",
        },
        identity: undefined,
        proofs: Object.fromEntries(
          AREA_PROOF_DIMENSIONS.map((dimension) => [dimension, "missing"]),
        ) as unknown as AreaProofStates,
      }),
      productionRow({
        rowId: "row:development:tile:probe",
        releaseScope: "development",
        identity: undefined,
      }),
    ];

    const forward = aggregateAreaCertificationRows(rows);
    const reversed = aggregateAreaCertificationRows([...rows].reverse());

    expect(reversed).toEqual(forward);
    expect(forward.rows).toEqual({
      total: 4,
      eligible: 3,
      excluded: 1,
      productionEligible: 2,
      developmentEligible: 1,
      productionReady: 1,
      productionBlocked: 1,
    });
    expect(Object.isFrozen(forward)).toBe(true);
    expect(Object.isFrozen(forward.proofs.pathConnect)).toBe(true);
  });

  it("never promotes PathReference evidence into PathConnect counts or readiness", () => {
    const aggregate: AreaCertificationAggregate = aggregateAreaCertificationRows([
      productionRow({
        proofs: {
          ...verifiedProofs(),
          pathReference: "verified",
          pathConnect: "missing",
        },
      }),
    ]);

    expect(aggregate.proofs.pathReference).toEqual({
      verified: 1,
      failed: 0,
      missing: 0,
    });
    expect(aggregate.proofs.pathConnect).toEqual({
      verified: 0,
      failed: 0,
      missing: 1,
    });
    expect(aggregate.rows.productionReady).toBe(0);
    expect(aggregate.rows.productionBlocked).toBe(1);
  });

  it("does not count excluded or development rows in production proof totals", () => {
    const aggregate = aggregateAreaCertificationRows([
      productionRow({
        eligibility: {
          status: "excluded",
          reason: "Not selectable under the production profile",
        },
        identity: undefined,
        proofs: {
          ...verifiedProofs(),
          render: "failed",
        },
      }),
      productionRow({
        rowId: "row:development:tile:probe",
        releaseScope: "development",
        identity: undefined,
        proofs: {
          ...verifiedProofs(),
          render: "failed",
        },
      }),
    ]);

    expect(aggregate.proofs.render).toEqual({
      verified: 0,
      failed: 0,
      missing: 0,
    });
  });

  it("refuses to aggregate invalid rows instead of silently changing denominators", () => {
    const invalidRow = productionRow({ identity: undefined });

    expect(() => aggregateAreaCertificationRows([invalidRow])).toThrow(
      /row:tno01:tile:101.*production_identity_required/,
    );
  });
});
