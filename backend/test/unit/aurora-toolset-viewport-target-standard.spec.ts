import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const standardUrl = pathToFileURL(
  resolve(__dirname, "../../scripts/lib/aurora-toolset-viewport-target-standard.mjs"),
).href;

async function evaluate(source: string) {
  const { stdout } = await execFileAsync("node", ["--input-type=module", "-e", `
    import * as standard from ${JSON.stringify(standardUrl)};
    const result = await (async () => { ${source} })();
    console.log(JSON.stringify(result));
  `]);
  return JSON.parse(stdout);
}

const tileLayout = {
  areaResref: "enon_bakery",
  tiles: [
    { index: 0, x: 0, y: 0, tileId: 10, orientation: 0 },
    { index: 5, x: 1, y: 1, tileId: 197, orientation: 1 },
  ],
};

function targetExpression() {
  return `standard.buildAuroraViewportTarget({
    sourceTile: { index: 5, x: 1, y: 1, tileId: 197, orientation: 1 },
    yawDegrees: 135,
    pitchDegrees: 68,
    zoomPixelsPerTile: 143,
  })`;
}

function completeObservation(cameraPose: Record<string, unknown>) {
  return {
    target: { areaResref: "enon_bakery" },
    sourceScene: { area: { resref: "enon_bakery" } },
    capture: { viewportBounds: { width: 800, height: 600 } },
    cameraPose,
  };
}

describe("Aurora Toolset viewport target standard", () => {
  it("resolves an exact source tile and rejects an incomplete coordinate selector", async () => {
    const result = await evaluate(`
      const layout = ${JSON.stringify(tileLayout)};
      const resolved = standard.resolveSourceTileTarget({ tileLayout: layout, tileX: 1, tileY: 1, tileId: 197, orientation: 1 });
      let errorCode = null;
      try { standard.resolveSourceTileTarget({ tileLayout: layout, tileX: 1 }); } catch (error) { errorCode = error.code; }
      return { resolved, errorCode };
    `);

    expect(result).toEqual({
      resolved: { index: 5, x: 1, y: 1, tileId: 197, orientation: 1 },
      errorCode: "source_tile_coordinates_incomplete",
    });
  });

  it("does not accept a visual outline as a direct Toolset tile identity", async () => {
    const result = await evaluate(`
      const target = ${targetExpression()};
      return standard.evaluateAuroraViewportTarget({
        target,
        observation: ${JSON.stringify(completeObservation({ status: "estimated", yawDegrees: 135, pitchDegrees: 68, zoomPixelsPerTile: 143 }))},
        toolsetSelectionReadback: { status: "estimated", selectionAnchor: { center: { x: 400, y: 300 } } },
      });
    `);

    expect(result.status).toBe("blocked");
    expect(result.blockerCodes).toContain("toolset_selected_tile_identity_unavailable");
  });

  it("rejects modulo-90 yaw as insufficient for a world-angle target", async () => {
    const result = await evaluate(`
      const target = ${targetExpression()};
      return standard.evaluateAuroraViewportTarget({
        target,
        observation: ${JSON.stringify(completeObservation({ status: "estimated", yawDegreesModulo90: 45, pitchDegrees: 68, zoomPixelsPerTile: 143 }))},
        toolsetSelectionReadback: {
          status: "verified",
          tile: { index: 5, x: 1, y: 1, tileId: 197, orientation: 1 },
          selectionCenter: { x: 400, y: 300 },
        },
      });
    `);

    expect(result.status).toBe("blocked");
    expect(result.blockerCodes).toEqual(["camera_world_yaw_readback_unavailable"]);
  });

  it("verifies only an exact tile, full camera readback, and centred selection", async () => {
    const result = await evaluate(`
      const target = ${targetExpression()};
      return standard.evaluateAuroraViewportTarget({
        target,
        observation: ${JSON.stringify(completeObservation({ status: "estimated", yawDegrees: 135.5, yawEvidence: { method: "source-grid-directed-selection/v1" }, pitchDegrees: 67.5, zoomPixelsPerTile: 144 }))},
        toolsetSelectionReadback: {
          status: "verified",
          tile: { index: 5, x: 1, y: 1, tileId: 197, orientation: 1 },
          selectionCenter: { x: 405, y: 295 },
        },
      });
    `);

    expect(result.status).toBe("verified");
    expect(result.blockerCodes).toEqual([]);
    expect(result.verification.selectionCenter.errorPixels).toBeCloseTo(7.071, 3);
  });

  it("accepts a complete source-targeted selection transaction, not an outline alone", async () => {
    const result = await evaluate(`
      const target = ${targetExpression()};
      return standard.evaluateAuroraViewportTarget({
        target,
        observation: ${JSON.stringify(completeObservation({ status: "estimated", yawDegrees: 135, yawEvidence: { method: "source-grid-directed-selection/v1" }, pitchDegrees: 68, zoomPixelsPerTile: 143 }))},
        toolsetSelectionReadback: {
          status: "verified",
          evidenceKind: "source-targeted-visual-selection/v1",
          sourceTile: { index: 5, x: 1, y: 1, tileId: 197, orientation: 1 },
          selectionCenter: { x: 400, y: 300 },
          dispatch: { targetClass: "TScrollBox" },
        },
      });
    `);
    expect(result).toMatchObject({ status: "verified", verification: { tile: { source: "source_targeted_visual_selection" } } });
  });
});
