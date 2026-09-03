import {
  AreaTileCertificationQueryApplicationService,
} from "../../src/modules/areas/application/area-tile-certification-query.application.service";
import type {
  AreaCertificationLedgerSourcePort,
} from "../../src/modules/areas/application/ports/area-certification-ledger-source.port";
import {
  AreaTileProductionAdmissionSourceError,
} from "../../src/modules/areas/application/ports/area-tile-production-admission.port";
import {
  buildAreaCertificationPlan,
} from "../../src/modules/areas/domain/area-certification.plan";
import {
  buildAreaCertificationReleaseReport,
} from "../../src/modules/areas/domain/area-certification.release-report";
import type {
  AreaCertificationPlanRowSeed,
} from "../../src/modules/areas/domain/area-certification.plan";

const renderClosedProofs = Object.freeze({
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

function seed(
  tilesetResRef: string,
  tileId: number,
  eligibility: AreaCertificationPlanRowSeed["eligibility"] = { status: "eligible" },
): AreaCertificationPlanRowSeed {
  return {
    rowId: `tile:${tilesetResRef}:${tileId}`,
    capabilityId: "topology_certified_placement_gate",
    releaseScope: "production",
    eligibility,
    subject: { kind: "tile-definition", id: `${tilesetResRef}:${tileId}` },
    proofs: renderClosedProofs,
  };
}

function report() {
  const built = buildAreaCertificationPlan({
    corpusHash: "c".repeat(64),
    profileId: "source-bound-v7",
    rows: [
      seed("tms01", 12),
      seed("tms01", 2, { status: "excluded", reason: "No authoring fixture." }),
      seed("tms01", 7),
      seed("tin01", 1),
    ],
  });
  return buildAreaCertificationReleaseReport({
    generatedAtIso: "2026-08-21T18:00:00.000Z",
    plan: built.plan,
    rows: built.rows,
  });
}

function source(value: unknown | null): AreaCertificationLedgerSourcePort {
  return {
    readReleaseReport: jest.fn(async () => value),
  };
}

describe("AreaTileCertificationQueryApplicationService", () => {
  it("evaluates materialization admission from the same exact indexed report", async () => {
    const ledger = report();
    const service = new AreaTileCertificationQueryApplicationService(source(ledger));

    const admitted = await service.evaluateProductionAdmission({
      tilesetResRef: "TMS01",
      candidateTileIds: [12, 7, 12],
    });
    expect(admitted).toMatchObject({
      allowed: true,
      code: "AREA_TILE_PRODUCTION_ADMITTED",
      tileIds: [7, 12],
      admission: {
        schemaVersion: "area-tile-production-admission.v1",
        policyVersion: "area-tile-production-admission-policy.v1",
        reportGeneratedAtIso: ledger.generatedAtIso,
        planId: ledger.plan.planId,
        corpusHash: ledger.plan.corpusHash,
        profileId: ledger.plan.profileId,
        ledgerSha256: ledger.ledgerSha256,
        reportSha256: ledger.reportSha256,
        tilesetResRef: "tms01",
        uniqueTileIdCount: 2,
        tileIdSetSha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
      },
    });

    await expect(service.evaluateProductionAdmission({
      tilesetResRef: "tms01",
      candidateTileIds: [7, 99],
    })).resolves.toMatchObject({
      allowed: false,
      code: "AREA_TILE_CERTIFICATION_ROW_MISSING",
      diagnostics: [{ tileId: 99, stage: "row", status: "missing" }],
    });
  });

  it("keeps source failures transport-neutral for transaction callers", async () => {
    const unavailable = new AreaTileCertificationQueryApplicationService(source(null));
    await expect(unavailable.evaluateProductionAdmission({
      tilesetResRef: "tms01",
      candidateTileIds: [7],
    })).rejects.toEqual(new AreaTileProductionAdmissionSourceError(
      "AREA_TILE_CERTIFICATION_LEDGER_UNAVAILABLE",
      "The Area tile-certification ledger is unavailable.",
    ));

    const tampered = structuredClone(report());
    (tampered as any).rowLedger[0].proofs.render = "missing";
    const invalid = new AreaTileCertificationQueryApplicationService(source(tampered));
    await expect(invalid.evaluateProductionAdmission({
      tilesetResRef: "tms01",
      candidateTileIds: [7],
    })).rejects.toMatchObject({
      name: "AreaTileProductionAdmissionSourceError",
      code: "AREA_TILE_CERTIFICATION_LEDGER_INVALID",
    });
  });

  it("validates the immutable report and returns one deterministic tileset page", async () => {
    const ledger = report();
    const ledgerSource = source(structuredClone(ledger));
    const service = new AreaTileCertificationQueryApplicationService(ledgerSource);

    await expect(service.getTilesetPage("tms01", { limit: 2, offset: 0 }))
      .resolves.toEqual({
        schemaVersion: "area-tile-certification-page.v1",
        generatedAtIso: ledger.generatedAtIso,
        planId: ledger.plan.planId,
        corpusHash: ledger.plan.corpusHash,
        profileId: ledger.plan.profileId,
        ledgerSha256: ledger.ledgerSha256,
        reportSha256: ledger.reportSha256,
        tilesetResRef: "tms01",
        items: [
          expect.objectContaining({
            tileId: 2,
            rowId: "tile:tms01:2",
            eligibility: {
              status: "excluded",
              reasonCode: "certification_plan_excluded",
              reason: "No authoring fixture.",
            },
          }),
          expect.objectContaining({
            tileId: 7,
            rowId: "tile:tms01:7",
            eligibility: { status: "eligible" },
          }),
        ],
        total: 3,
        limit: 2,
        offset: 0,
      });

    expect(ledgerSource.readReleaseReport).toHaveBeenCalledTimes(1);
  });

  it("returns an empty valid page for a tileset absent from a valid ledger", async () => {
    const ledger = report();
    const service = new AreaTileCertificationQueryApplicationService(source(ledger));

    await expect(service.getTilesetPage("tno01", { limit: 256, offset: 0 }))
      .resolves.toMatchObject({
        tilesetResRef: "tno01",
        items: [],
        total: 0,
        limit: 256,
        offset: 0,
      });
  });

  it("fails closed when the ledger source is unconfigured or the report changes without new hashes", async () => {
    const unavailable = new AreaTileCertificationQueryApplicationService(source(null));
    await expect(unavailable.getTilesetPage("tms01", { limit: 256, offset: 0 }))
      .rejects.toMatchObject({
        status: 503,
        code: "AREA_TILE_CERTIFICATION_LEDGER_UNAVAILABLE",
      });

    const tampered = structuredClone(report());
    (tampered as any).rowLedger[0].proofs.render = "missing";
    const invalid = new AreaTileCertificationQueryApplicationService(source(tampered));
    await expect(invalid.getTilesetPage("tms01", { limit: 256, offset: 0 }))
      .rejects.toMatchObject({
        status: 503,
        code: "AREA_TILE_CERTIFICATION_LEDGER_INVALID",
      });
  });

  it("rejects a non-canonical or duplicate tile-definition subject identity", async () => {
    const malformed = structuredClone(report());
    (malformed as any).rowLedger[0].identity.subject.id = "tms01:02";
    const malformedService = new AreaTileCertificationQueryApplicationService(source(malformed));
    await expect(malformedService.getTilesetPage("tms01", { limit: 256, offset: 0 }))
      .rejects.toMatchObject({ code: "AREA_TILE_CERTIFICATION_LEDGER_INVALID" });

    const duplicate = structuredClone(report());
    (duplicate as any).rowLedger[1].identity.subject.id =
      (duplicate as any).rowLedger[0].identity.subject.id;
    const duplicateService = new AreaTileCertificationQueryApplicationService(source(duplicate));
    await expect(duplicateService.getTilesetPage("tms01", { limit: 256, offset: 0 }))
      .rejects.toMatchObject({ code: "AREA_TILE_CERTIFICATION_LEDGER_INVALID" });
  });

  it("rejects reports whose HTTP projection exceeds bounded text contracts", async () => {
    const oversizedReasonPlan = buildAreaCertificationPlan({
      corpusHash: "c".repeat(64),
      profileId: "source-bound-v7",
      rows: [seed("tms01", 1, {
        status: "excluded",
        reason: "x".repeat(1_025),
      })],
    });
    const oversizedReasonReport = buildAreaCertificationReleaseReport({
      generatedAtIso: "2026-08-21T18:00:00.000Z",
      plan: oversizedReasonPlan.plan,
      rows: oversizedReasonPlan.rows,
    });
    await expect(new AreaTileCertificationQueryApplicationService(
      source(oversizedReasonReport),
    ).getTilesetPage("tms01", { limit: 256, offset: 0 }))
      .rejects.toMatchObject({ code: "AREA_TILE_CERTIFICATION_LEDGER_INVALID" });

    const oversizedRowPlan = buildAreaCertificationPlan({
      corpusHash: "c".repeat(64),
      profileId: "source-bound-v7",
      rows: [{ ...seed("tms01", 1), rowId: "r".repeat(257) }],
    });
    const oversizedRowReport = buildAreaCertificationReleaseReport({
      generatedAtIso: "2026-08-21T18:00:00.000Z",
      plan: oversizedRowPlan.plan,
      rows: oversizedRowPlan.rows,
    });
    await expect(new AreaTileCertificationQueryApplicationService(
      source(oversizedRowReport),
    ).getTilesetPage("tms01", { limit: 256, offset: 0 }))
      .rejects.toMatchObject({ code: "AREA_TILE_CERTIFICATION_LEDGER_INVALID" });
  });
});
