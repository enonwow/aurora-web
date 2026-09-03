import {
  AREA_TILE_CERTIFICATION_PUBLICATION_POLICY_VERSION,
  InvalidAreaTileCertificationPublicationError,
  buildAreaTileCertificationPublication,
  type AreaTileCertificationPublicationInput,
} from "../../src/modules/areas/domain/area-tile-certification-publication";

const SHA = {
  catalog: "1".repeat(64),
  sourceInventory: "2".repeat(64),
  modelSourceInventory: "3".repeat(64),
  matrixPlan: "4".repeat(64),
  matrixContract: "5".repeat(64),
  runtimeBuildProfile: "6".repeat(64),
  runtimeBuildBinding: "7".repeat(64),
} as const;

function input(): AreaTileCertificationPublicationInput {
  return {
    generatedAtIso: "2026-08-21T12:34:29.161Z",
    binding: {
      catalogSha256: SHA.catalog,
      sourceInventorySha256: SHA.sourceInventory,
      modelSourceInventorySha256: SHA.modelSourceInventory,
      matrixPlanId: SHA.matrixPlan,
      matrixManifestSchema: "aurora-tile-add-connect-matrix/v2",
      matrixContractRevision: "path-node-aware-v8",
      matrixContractFingerprint: SHA.matrixContract,
      runtimeBuildProfileId: "area-tiles-runtime-build-v8",
      runtimeBuildProfileSha256: SHA.runtimeBuildProfile,
      runtimeBuildBindingSha256: SHA.runtimeBuildBinding,
      profileId: "area-tiles-99-source-bound-v8",
    },
    catalogRows: [
      {
        tilesetResRef: "tms01",
        tileId: 2,
        modelSourceStatus: "source_missing",
      },
      {
        tilesetResRef: "tms01",
        tileId: 0,
        modelSourceStatus: "source_resolved",
      },
      {
        tilesetResRef: "tms01",
        tileId: 1,
        modelSourceStatus: "intentional_placeholder",
      },
      {
        tilesetResRef: "tms01",
        tileId: 3,
        modelSourceStatus: "invalid_missing_model_field",
      },
    ],
    acceptedAddRenderSubjects: ["tms01:0"],
  };
}

describe("Area tile-certification publication", () => {
  it("builds one deterministic immutable report and binds the publication policy", () => {
    const first = buildAreaTileCertificationPublication(input());
    const reorderedInput = input();
    const second = buildAreaTileCertificationPublication({
      ...reorderedInput,
      catalogRows: [...reorderedInput.catalogRows].reverse(),
      acceptedAddRenderSubjects: [...reorderedInput.acceptedAddRenderSubjects].reverse(),
    });

    expect(first.corpus.policyVersion).toBe(
      AREA_TILE_CERTIFICATION_PUBLICATION_POLICY_VERSION,
    );
    expect(first.report).toEqual(second.report);
    expect(first.report.plan.schemaVersion).toBe("area-certification-plan.v2");
    expect(first.plan.rowCount).toBe(4);
    expect(first.report.plan.corpusHash).toBe(first.corpusHash);
    expect(first.report.plan.profileId).toBe("area-tiles-99-source-bound-v8");
    expect(first.corpus.runtimeBuildProfileId).toBe("area-tiles-runtime-build-v8");
    expect(first.corpus.runtimeBuildBindingSha256).toBe(SHA.runtimeBuildBinding);
  });

  it("maps source eligibility and promotes only exact Add/Render dimensions", () => {
    const { report } = buildAreaTileCertificationPublication(input());
    const rows = new Map(report.rowLedger.map((row) => [row.identity!.subject.id, row]));

    expect(rows.get("tms01:0")).toMatchObject({
      rowId: "tile:tms01:0",
      capabilityId: "topology_certified_placement_gate",
      releaseScope: "production",
      eligibility: { status: "eligible" },
      proofs: {
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
      },
    });
    expect(rows.get("tms01:1")).toMatchObject({
      eligibility: {
        status: "excluded",
        reason: "TILE_MODEL_INTENTIONAL_PLACEHOLDER",
      },
      proofs: { inventory: "missing", assetClosure: "missing", render: "missing" },
    });
    expect(rows.get("tms01:2")).toMatchObject({
      eligibility: { status: "eligible" },
      proofs: { inventory: "failed", assetClosure: "missing", render: "missing" },
    });
    expect(rows.get("tms01:3")).toMatchObject({
      eligibility: { status: "eligible" },
      proofs: { inventory: "failed", assetClosure: "missing", render: "missing" },
    });
    expect(report.release.status).toBe("blocked");
  });

  it.each([
    [
      "duplicate_catalog_subject",
      (value: AreaTileCertificationPublicationInput) => ({
        ...value,
        catalogRows: [...value.catalogRows, value.catalogRows[0]],
      }),
    ],
    [
      "unknown_model_source_status",
      (value: AreaTileCertificationPublicationInput) => ({
        ...value,
        catalogRows: value.catalogRows.map((row, index) => index === 0
          ? { ...row, modelSourceStatus: "guessed" as "source_missing" }
          : row),
      }),
    ],
    [
      "accepted_subject_not_in_catalog",
      (value: AreaTileCertificationPublicationInput) => ({
        ...value,
        acceptedAddRenderSubjects: ["tms01:99"],
      }),
    ],
    [
      "accepted_subject_not_source_resolved",
      (value: AreaTileCertificationPublicationInput) => ({
        ...value,
        acceptedAddRenderSubjects: ["tms01:2"],
      }),
    ],
  ])("fails closed with %s", (expectedCode, mutate) => {
    expect(() => buildAreaTileCertificationPublication(mutate(input()))).toThrow(
      expect.objectContaining<Partial<InvalidAreaTileCertificationPublicationError>>({
        code: expectedCode,
      }),
    );
  });

  it("rejects binding drift and noncanonical generation time", () => {
    expect(() => buildAreaTileCertificationPublication({
      ...input(),
      binding: { ...input().binding, matrixPlanId: "not-a-hash" },
    })).toThrow(expect.objectContaining({ code: "invalid_binding" }));
    expect(() => buildAreaTileCertificationPublication({
      ...input(),
      generatedAtIso: "2026-08-21",
    })).toThrow(expect.objectContaining({ code: "invalid_generated_at" }));
  });
});
