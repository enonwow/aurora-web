import {
  AREA_CERTIFICATION_PLAN_SCHEMA_VERSION_V2,
  InvalidAreaCertificationPlanError,
  buildAreaCertificationPlan,
  type AreaCertificationPlanRowSeed,
} from "../../src/modules/areas/domain/area-certification.plan";
import {
  buildAreaCertificationReleaseReport,
} from "../../src/modules/areas/domain/area-certification.release-report";
import {
  type AreaProofStates,
} from "../../src/modules/areas/domain/area-certification.types";

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

function seed(
  rowId: string,
  overrides: Partial<AreaCertificationPlanRowSeed> = {},
): AreaCertificationPlanRowSeed {
  return {
    rowId,
    capabilityId: "certification_all_definition_render",
    releaseScope: "production",
    eligibility: { status: "eligible" },
    subject: { kind: "tile-definition", id: rowId },
    proofs: verifiedProofs(),
    ...overrides,
  };
}

describe("area certification immutable plan", () => {
  it("binds the complete ordered row membership and seeds exact immutable identities", () => {
    const result = buildAreaCertificationPlan({
      corpusHash: CORPUS_HASH,
      profileId: PROFILE_ID,
      rows: [seed("tms01:2"), seed("tms01:1")],
    });

    expect(result.plan).toMatchObject({
      schemaVersion: AREA_CERTIFICATION_PLAN_SCHEMA_VERSION_V2,
      corpusHash: CORPUS_HASH,
      profileId: PROFILE_ID,
      rowCount: 2,
      planId: expect.stringMatching(/^[a-f0-9]{64}$/u),
      plannedRowsSha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
    });
    expect(result.rows.map((row) => row.rowId)).toEqual(["tms01:1", "tms01:2"]);
    expect(result.rows[0]?.identity).toEqual({
      schemaVersion: "area-certification.v1",
      planId: result.plan.planId,
      corpusHash: CORPUS_HASH,
      profileId: PROFILE_ID,
      subject: { kind: "tile-definition", id: "tms01:1" },
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.plan)).toBe(true);
    expect(Object.isFrozen(result.rows)).toBe(true);
    expect(Object.isFrozen(result.rows[0])).toBe(true);
  });

  it("is independent from input order and proof progress but changes for plan semantics", () => {
    const first = seed("tms01:1");
    const second = seed("tms01:2");
    const forward = buildAreaCertificationPlan({
      corpusHash: CORPUS_HASH,
      profileId: PROFILE_ID,
      rows: [first, second],
    });
    const reversed = buildAreaCertificationPlan({
      corpusHash: CORPUS_HASH,
      profileId: PROFILE_ID,
      rows: [second, first],
    });
    const proofProgress = buildAreaCertificationPlan({
      corpusHash: CORPUS_HASH,
      profileId: PROFILE_ID,
      rows: [
        seed("tms01:1", { proofs: { ...verifiedProofs(), nwnRuntime: "missing" } }),
        second,
      ],
    });
    const changedEligibility = buildAreaCertificationPlan({
      corpusHash: CORPUS_HASH,
      profileId: PROFILE_ID,
      rows: [
        seed("tms01:1", {
          eligibility: { status: "excluded", reason: "Reviewed non-runtime row." },
        }),
        second,
      ],
    });

    expect(reversed.plan).toEqual(forward.plan);
    expect(proofProgress.plan).toEqual(forward.plan);
    expect(proofProgress.rows).not.toEqual(forward.rows);
    expect(changedEligibility.plan.planId).not.toBe(forward.plan.planId);
    expect(changedEligibility.plan.plannedRowsSha256).not.toBe(
      forward.plan.plannedRowsSha256,
    );
  });

  it("rejects duplicate, malformed, and identity-shaped seed input with diagnostic codes", () => {
    expect(() => buildAreaCertificationPlan({
      corpusHash: CORPUS_HASH,
      profileId: PROFILE_ID,
      rows: [seed("duplicate"), seed("duplicate")],
    })).toThrow(expect.objectContaining({ code: "duplicate_row_id" }));

    expect(() => buildAreaCertificationPlan({
      corpusHash: "not-a-hash",
      profileId: PROFILE_ID,
      rows: [],
    })).toThrow(expect.objectContaining({ code: "invalid_corpus_hash" }));

    try {
      buildAreaCertificationPlan({
        corpusHash: CORPUS_HASH,
        profileId: PROFILE_ID,
        rows: [{ ...seed("unexpected"), planId: "3".repeat(64) } as AreaCertificationPlanRowSeed],
      });
      throw new Error("Expected the unexpected seed key to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidAreaCertificationPlanError);
      expect(error).toMatchObject({ code: "invalid_row_keys" });
    }
  });

  it("makes release reports fail closed when a v2 plan row is missing or changed", () => {
    const built = buildAreaCertificationPlan({
      corpusHash: CORPUS_HASH,
      profileId: PROFILE_ID,
      rows: [seed("tms01:1"), seed("tms01:2")],
    });
    const input = {
      generatedAtIso: "2026-08-21T08:00:00.000Z",
      plan: built.plan,
    };

    expect(buildAreaCertificationReleaseReport({
      ...input,
      rows: built.rows,
    }).release.status).toBe("ready");
    expect(() => buildAreaCertificationReleaseReport({
      ...input,
      rows: built.rows.slice(0, 1),
    })).toThrow(expect.objectContaining({ code: "plan_row_count_mismatch" }));
    expect(() => buildAreaCertificationReleaseReport({
      ...input,
      rows: built.rows.map((row, index) =>
        index === 0 ? { ...row, capabilityId: "certification_all_connection_rows" } : row),
    })).toThrow(expect.objectContaining({ code: "plan_rows_fingerprint_mismatch" }));
    const forgedPlanId = "f".repeat(64);
    expect(() => buildAreaCertificationReleaseReport({
      ...input,
      plan: { ...built.plan, planId: forgedPlanId },
      rows: built.rows.map((row) => ({
        ...row,
        identity: { ...row.identity!, planId: forgedPlanId },
      })),
    })).toThrow(expect.objectContaining({ code: "invalid_plan_id_binding" }));
  });
});
