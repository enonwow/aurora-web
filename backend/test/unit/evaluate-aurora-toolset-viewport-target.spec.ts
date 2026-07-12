import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const evaluatorPath = resolve(__dirname, "../../scripts/evaluate-aurora-toolset-viewport-target.mjs");

describe("Aurora Toolset viewport target evaluator", () => {
  it("writes a fail-closed report without dispatching camera input", async () => {
    const directory = await mkdtemp(join(tmpdir(), "aurora-viewport-target-"));
    const layoutPath = join(directory, "layout.json");
    const observationPath = join(directory, "observation.json");
    const outPath = join(directory, "target.json");
    await writeFile(layoutPath, JSON.stringify({
      areaResref: "enon_bakery",
      tiles: [{ index: 5, x: 1, y: 1, tileId: 197, orientation: 1 }],
    }));
    await writeFile(observationPath, JSON.stringify({
      target: { areaResref: "enon_bakery" },
      sourceScene: { area: { resref: "enon_bakery" } },
      capture: { viewportBounds: { width: 800, height: 600 } },
      cameraPose: { status: "estimated", yawDegreesModulo90: 45, pitchDegrees: 68, zoomPixelsPerTile: 143 },
    }));

    try {
      const { stdout } = await execFileAsync("node", [
        evaluatorPath,
        "--tileLayout", layoutPath,
        "--observation", observationPath,
        "--out", outPath,
        "--tileX", "1", "--tileY", "1", "--tileId", "197", "--orientation", "1",
        "--yawDegrees", "135", "--pitchDegrees", "68", "--zoomPixelsPerTile", "143",
      ]);
      const result = JSON.parse(stdout);
      const report = JSON.parse(await readFile(outPath, "utf8"));

      expect(result.status).toBe("blocked");
      expect(report.safety).toMatchObject({
        launchesToolset: false,
        usesGlobalCursor: false,
        usesGlobalKeyboard: false,
        usesGlobalMouse: false,
      });
      expect(report.blockerCodes).toEqual(expect.arrayContaining([
        "toolset_selected_tile_identity_unavailable",
        "camera_world_yaw_readback_unavailable",
        "toolset_selection_center_unavailable",
      ]));
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
