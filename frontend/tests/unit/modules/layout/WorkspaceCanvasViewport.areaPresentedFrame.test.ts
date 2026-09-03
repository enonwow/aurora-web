// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { writeAreaPresentedFrameDataset } from "../../../../src/modules/layout/components/WorkspaceCanvasViewport";

describe("Area presented-frame diagnostics", () => {
  it("binds the presented frame to the settled terrain and camera build", () => {
    const container = document.createElement("div");
    container.dataset.areaTerrainBuildId = "terrain-build-2";
    container.dataset.areaTerrainTileStateDigest = "digest-2";
    container.dataset.areaCameraFrameTerrainBuildId = "terrain-build-2";
    container.dataset.areaCameraFrameTileStateDigest = "digest-2";
    container.dataset.areaCameraFrameCoverageStatus = "pass";

    const first = writeAreaPresentedFrameDataset(
      container.dataset,
      "2026-07-19T12:00:00.000Z"
    );
    const second = writeAreaPresentedFrameDataset(
      container.dataset,
      "2026-07-19T12:00:01.000Z"
    );

    expect(first).toMatchObject({
      sequence: 1,
      terrainBuildId: "terrain-build-2",
      tileStateDigest: "digest-2",
      cameraTerrainBuildId: "terrain-build-2",
      cameraTileStateDigest: "digest-2",
      cameraCoverageStatus: "pass",
      presentedAt: "2026-07-19T12:00:00.000Z"
    });
    expect(first.settlementToken).not.toBe(second.settlementToken);
    expect(second.sequence).toBe(2);
    expect(container.dataset.areaPresentedFrameSettlementToken).toBe(
      second.settlementToken
    );
  });

  it("keeps missing camera/terrain bindings explicit instead of inventing readiness", () => {
    const container = document.createElement("div");

    const snapshot = writeAreaPresentedFrameDataset(container.dataset, "now");

    expect(snapshot.terrainBuildId).toBe("terrain-build-missing");
    expect(snapshot.tileStateDigest).toBe("tile-state-digest-missing");
    expect(snapshot.cameraCoverageStatus).toBe("missing");
  });
});
