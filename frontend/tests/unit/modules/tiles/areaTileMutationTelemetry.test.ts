import { describe, expect, it } from "vitest";
import type { AreaScene, SceneTile } from "../../../../src/modules/scene/contracts";
import type { AreaTileProcessContractReadiness } from "../../../../src/modules/tiles/application/areaTileProcessContractReadiness";
import {
  buildAreaTileMutationTrace,
  buildAreaTileMutationTraceDatasetPayload,
  buildAreaTileStateDigest,
  evaluateAreaTileMutationContractSettlement,
  resolveAreaTileMutationChangedCellBand
} from "../../../../src/modules/tiles/application/areaTileMutationTelemetry";

function tile(overrides: Partial<SceneTile> = {}): SceneTile {
  return {
    id: "tile-0-0",
    row: 0,
    col: 0,
    terrain: "corridor",
    orientation: 0,
    rotateTexture: false,
    plot: false,
    tileId: 1,
    modelResRef: "abc01_tile_01",
    height: 0,
    ...overrides
  };
}

function scene(tiles: SceneTile[]): AreaScene {
  return {
    sceneId: "area-1",
    areaName: "Area 1",
    width: 2,
    height: 2,
    tiles,
    objects: [],
    updatedAtUnixMs: 1,
    source: "local_draft"
  };
}

function readiness(
  overrides: Partial<AreaTileProcessContractReadiness> = {}
): AreaTileProcessContractReadiness {
  return {
    status: "ready",
    areaId: "area-1",
    expectedCandidateCount: 1,
    pendingCandidateCount: 0,
    checkedCandidateCount: 1,
    readyCandidateCount: 1,
    blockedCandidateCount: 0,
    candidateSample: "tile_abc01_tile_01",
    readySample: "tile_abc01_tile_01:key",
    sourceObjectKeySample: "source",
    sourceAssetContractSample: "ready",
    blockerSummary: "none",
    sourceAssetReadyCount: 1,
    sourceAssetBlockedCount: 0,
    mdlSourceReadyCount: 1,
    mdlSourceBlockedCount: 0,
    glbGeometryReadyCount: 1,
    glbGeometryBlockedCount: 0,
    materialTextureContractReadyCount: 1,
    materialBindingBlockedCount: 0,
    renderLoaderReadyCount: 1,
    renderLoaderBlockedCount: 0,
    textureMaterialBlockerSummary: "none",
    renderAssetContractBlockerSummary: "none",
    mdlGlbMaterialBlockerSummary: "none",
    entries: [],
    ...overrides
  };
}

describe("Area tile mutation telemetry", () => {
  it("changes the full tile-state digest when orientation changes without changing model resrefs", () => {
    const before = scene([tile()]);
    const after = scene([tile({ orientation: 1 })]);

    expect(buildAreaTileStateDigest(before)).not.toBe(buildAreaTileStateDigest(after));
  });

  it("records exact before and after tile identity for an update", () => {
    const before = scene([tile()]);
    const after = scene([
      tile({
        tileId: 7,
        modelResRef: "abc01_tile_07",
        orientation: 2,
        rotateTexture: true,
        height: 1
      })
    ]);

    const trace = buildAreaTileMutationTrace(
      before,
      after,
      4,
      "2026-07-19T12:00:00.000Z"
    );

    expect(trace).toMatchObject({
      version: "aurora-area-tile-mutation-trace/v1",
      operationId: "area-tile-mutation:area-1:4",
      revision: 4,
      sceneId: "area-1",
      changedTileCount: 1,
      changedTiles: [
        {
          change: "updated",
          row: 0,
          col: 0,
          before: {
            sceneTileId: "tile-0-0",
            tileId: 1,
            modelResRef: "abc01_tile_01",
            orientation: 0,
            rotateTexture: false,
            height: 0
          },
          after: {
            sceneTileId: "tile-0-0",
            tileId: 7,
            modelResRef: "abc01_tile_07",
            orientation: 2,
            rotateTexture: true,
            height: 1
          }
        }
      ]
    });
    expect(trace?.tileStateDigestBefore).not.toBe(trace?.tileStateDigestAfter);
    expect(trace?.contractSceneKeyBefore).not.toBe(trace?.contractSceneKeyAfter);
  });

  it("returns no trace for an unchanged tile state", () => {
    const current = scene([tile()]);
    const next = { ...current, updatedAtUnixMs: 2 };

    expect(buildAreaTileMutationTrace(current, next, 2, "now")).toBeNull();
  });

  it("stays pending until the exact mutation revision and readiness key converge", () => {
    const before = scene([tile()]);
    const after = scene([tile({ orientation: 1 })]);
    const trace = buildAreaTileMutationTrace(before, after, 3, "now");
    expect(trace).not.toBeNull();

    const settlement = evaluateAreaTileMutationContractSettlement({
      trace,
      appliedRevision: 2,
      currentSceneKey: trace!.contractSceneKeyAfter,
      readinessSceneKey: trace!.contractSceneKeyAfter,
      requestPhase: "ready",
      readiness: readiness()
    });

    expect(settlement.status).toBe("pending");
    expect(settlement.blockers).toContain("mutation_revision_not_applied");
  });

  it("blocks a failed request instead of reporting settlement", () => {
    const trace = buildAreaTileMutationTrace(
      scene([tile()]),
      scene([tile({ orientation: 1 })]),
      3,
      "now"
    );

    const settlement = evaluateAreaTileMutationContractSettlement({
      trace,
      appliedRevision: 3,
      currentSceneKey: trace!.contractSceneKeyAfter,
      readinessSceneKey: trace!.contractSceneKeyAfter,
      requestPhase: "failed",
      readiness: null
    });

    expect(settlement.status).toBe("blocked");
    expect(settlement.blockers).toContain("tile_process_request_failed");
  });

  it("reports ready only for the exact applied revision and complete readiness", () => {
    const trace = buildAreaTileMutationTrace(
      scene([tile()]),
      scene([tile({ orientation: 1 })]),
      3,
      "now"
    );

    const settlement = evaluateAreaTileMutationContractSettlement({
      trace,
      appliedRevision: 3,
      currentSceneKey: trace!.contractSceneKeyAfter,
      readinessSceneKey: trace!.contractSceneKeyAfter,
      requestPhase: "ready",
      readiness: readiness()
    });

    expect(settlement).toMatchObject({
      version: "aurora-area-tile-mutation-contract-settlement/v1",
      operationId: trace!.operationId,
      revision: 3,
      status: "ready",
      blockers: []
    });
  });

  it("maps mutation size to low-cardinality telemetry bands", () => {
    expect(resolveAreaTileMutationChangedCellBand(1)).toBe("1");
    expect(resolveAreaTileMutationChangedCellBand(4)).toBe("2-4");
    expect(resolveAreaTileMutationChangedCellBand(16)).toBe("5-16");
    expect(resolveAreaTileMutationChangedCellBand(17)).toBe("17+");
  });

  it("bounds the development DOM replay packet without changing trace totals", () => {
    const before = scene(
      Array.from({ length: 20 }, (_, index) =>
        tile({
          id: `tile-0-${index}`,
          col: index,
          tileId: index
        })
      )
    );
    const after = scene(
      before.tiles.map((entry) => ({
        ...entry,
        orientation: 1 as const
      }))
    );
    const trace = buildAreaTileMutationTrace(
      before,
      after,
      8,
      "2026-07-19T12:00:00.000Z"
    );

    const payload = buildAreaTileMutationTraceDatasetPayload(trace!, 8);

    expect(payload.changedTileCount).toBe(20);
    expect(payload.changedTiles).toHaveLength(8);
    expect(payload.changedTileSampleCount).toBe(8);
    expect(payload.changedTileOmittedCount).toBe(12);
  });
});
