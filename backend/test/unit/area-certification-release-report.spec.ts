import {
  AREA_CERTIFICATION_RELEASE_REPORT_SCHEMA_VERSION,
  InvalidAreaCertificationReleaseReportError,
  buildAreaCertificationReleaseReport,
} from "../../src/modules/areas/domain/area-certification.release-report";
import {
  AREA_CERTIFICATION_SCHEMA_VERSION,
  type AreaCertificationRow,
  type AreaProofStates,
} from "../../src/modules/areas/domain/area-certification.types";

const PLAN_ID = "1".repeat(64);
const CORPUS_HASH = "2".repeat(64);
const PROFILE_ID = "nwn-ee-default";

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

function productionRow(
  rowId: string,
  proofOverrides: Partial<AreaProofStates> = {},
): AreaCertificationRow {
  return {
    rowId,
    capabilityId: "topology.tile-definition",
    releaseScope: "production",
    eligibility: { status: "eligible" },
    identity: {
      schemaVersion: AREA_CERTIFICATION_SCHEMA_VERSION,
      planId: PLAN_ID,
      corpusHash: CORPUS_HASH,
      profileId: PROFILE_ID,
      subject: { kind: "tile-definition", id: rowId },
    },
    proofs: { ...verifiedProofs(), ...proofOverrides },
  };
}

function plan() {
  return {
    schemaVersion: "area-certification-plan.v1" as const,
    planId: PLAN_ID,
    corpusHash: CORPUS_HASH,
    profileId: PROFILE_ID,
  };
}

describe("area certification release report", () => {
  it("generates a deterministic blocked report from exact immutable rows", () => {
    const rows: AreaCertificationRow[] = [
      productionRow("row:b", { render: "failed", pathConnect: "missing" }),
      {
        ...productionRow("row:excluded"),
        eligibility: { status: "excluded", reason: "Reviewed SET placeholder." },
        identity: undefined,
      },
      productionRow("row:a"),
      {
        ...productionRow("row:development"),
        releaseScope: "development",
        identity: undefined,
      },
    ];

    const report = buildAreaCertificationReleaseReport({
      generatedAtIso: "2026-08-20T09:00:00.000Z",
      plan: plan(),
      rows,
    });

    expect(report.schemaVersion).toBe(AREA_CERTIFICATION_RELEASE_REPORT_SCHEMA_VERSION);
    expect(report.plan).toEqual(plan());
    expect(report.rowLedger.map((row) => row.rowId)).toEqual([
      "row:a",
      "row:b",
      "row:development",
      "row:excluded",
    ]);
    expect(report.aggregate.rows).toEqual({
      total: 4,
      eligible: 3,
      excluded: 1,
      productionEligible: 2,
      developmentEligible: 1,
      productionReady: 1,
      productionBlocked: 1,
    });
    expect(report.release).toEqual({
      status: "blocked",
      readyRowIds: ["row:a"],
      blockedRowIds: ["row:b"],
      excludedRowIds: ["row:excluded"],
      developmentRowIds: ["row:development"],
      blockerCodes: ["unbounded_plan_membership", "production_rows_incomplete"],
      blockingProofs: {
        render: { failedRowIds: ["row:b"], missingRowIds: [] },
        pathConnect: { failedRowIds: [], missingRowIds: ["row:b"] },
      },
    });
    expect(report.ledgerSha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(report.reportSha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.rowLedger)).toBe(true);
    expect(Object.isFrozen(report.rowLedger[0])).toBe(true);
  });

  it("is independent from input row order and changes its digest when proof state changes", () => {
    const rows = [productionRow("row:b"), productionRow("row:a")];
    const input = {
      generatedAtIso: "2026-08-20T09:00:00.000Z",
      plan: plan(),
      rows,
    };
    const forward = buildAreaCertificationReleaseReport(input);
    const reversed = buildAreaCertificationReleaseReport({ ...input, rows: [...rows].reverse() });
    const changed = buildAreaCertificationReleaseReport({
      ...input,
      rows: [productionRow("row:a"), productionRow("row:b", { render: "failed" })],
    });

    expect(reversed).toEqual(forward);
    expect(forward.release).toMatchObject({
      status: "blocked",
      blockerCodes: ["unbounded_plan_membership"],
    });
    expect(changed.ledgerSha256).not.toBe(forward.ledgerSha256);
    expect(changed.reportSha256).not.toBe(forward.reportSha256);
  });

  it("emits an explicit empty-scope blocker instead of claiming release readiness", () => {
    const report = buildAreaCertificationReleaseReport({
      generatedAtIso: "2026-08-20T09:00:00.000Z",
      plan: plan(),
      rows: [],
    });

    expect(report.release).toMatchObject({
      status: "blocked",
      blockerCodes: ["unbounded_plan_membership", "no_production_eligible_rows"],
      readyRowIds: [],
      blockedRowIds: [],
    });
  });

  it.each([
    ["duplicate_row_id", [productionRow("row:a"), productionRow("row:a")]],
    [
      "row_plan_identity_mismatch",
      [
        {
          ...productionRow("row:a"),
          identity: {
            ...productionRow("row:a").identity!,
            planId: "3".repeat(64),
          },
        },
      ],
    ],
  ])("rejects %s", (code, rows) => {
    expect(() => buildAreaCertificationReleaseReport({
      generatedAtIso: "2026-08-20T09:00:00.000Z",
      plan: plan(),
      rows,
    })).toThrow(expect.objectContaining({ code }));
  });

  it("rejects malformed plan and timestamp inputs with diagnostic codes", () => {
    expect(() => buildAreaCertificationReleaseReport({
      generatedAtIso: "not-a-time",
      plan: plan(),
      rows: [],
    })).toThrow(expect.objectContaining({ code: "invalid_generated_at" }));

    expect(() => buildAreaCertificationReleaseReport({
      generatedAtIso: "2026-08-20T09:00:00.000Z",
      plan: { ...plan(), extra: true } as unknown as ReturnType<typeof plan>,
      rows: [],
    })).toThrow(expect.objectContaining({ code: "invalid_plan_keys" }));

    try {
      buildAreaCertificationReleaseReport({
        generatedAtIso: "2026-08-20T09:00:00.000Z",
        plan: { ...plan(), corpusHash: "not-a-sha256" },
        rows: [],
      });
      throw new Error("Expected invalid corpus hash to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidAreaCertificationReleaseReportError);
      expect(error).toMatchObject({ code: "invalid_plan_corpus_hash" });
    }
  });

  it.each([
    ["invalid_certification_row", null],
    ["invalid_row_keys", { ...productionRow("row:a"), extra: true }],
    [
      "invalid_proof_keys",
      {
        ...productionRow("row:a"),
        proofs: { ...verifiedProofs(), inferredConnectivity: "verified" },
      },
    ],
    [
      "invalid_identity_keys",
      {
        ...productionRow("row:a"),
        identity: { ...productionRow("row:a").identity!, hostPath: "C:/secret" },
      },
    ],
  ])("rejects non-contract row shape with %s", (code, row) => {
    expect(() => buildAreaCertificationReleaseReport({
      generatedAtIso: "2026-08-20T09:00:00.000Z",
      plan: plan(),
      rows: [row as AreaCertificationRow],
    })).toThrow(expect.objectContaining({ code }));
  });
});
