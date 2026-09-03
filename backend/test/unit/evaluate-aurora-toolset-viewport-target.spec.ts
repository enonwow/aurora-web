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

  it("verifies an exact native absolute target with independent Eye evidence", async () => {
    const directory = await mkdtemp(join(tmpdir(), "aurora-native-target-"));
    const files: Record<string, string> = {};
    const write = async (name: string, value: unknown) => {
      const path = join(directory, `${name}.json`);
      await writeFile(path, JSON.stringify(value));
      files[name] = path;
    };
    await write("layout", { tiles: [{ index: 136, x: 8, y: 8, tileId: 183, orientation: 1 }] });
    await write("core", { status: "at_target", adapter: { readback: "native", provenance: "native_toolset", binarySha256: "4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24" }, target: { sourceTile: { x: 8, y: 8 }, camera: { yawDegrees: 45, pitchDegrees: 45, zoom: 25.5, centreX: 85, centreY: 85 } }, achievedState: { area: "_ikea", provenance: "native_toolset", camera: { yawDegrees: 45.000003, pitchDegrees: 44.999997, zoom: 25.499999, centreX: 84.55, centreY: 85.16 } } });
    await write("selection", { status: "verified", evidenceKind: "source-targeted-visual-selection/v1", sourceTile: { index: 136, x: 8, y: 8, tileId: 183, orientation: 1 } });
    for (const stage of ["beforeA", "beforeB", "after"]) await write(stage, { status: "verified" });
    await write("baseline", { status: "verified", changedSamples: 0, changedRatio: 0 });
    await write("effect", { status: "verified", changedSamples: 100, changedRatio: 0.5 });
    const outPath = join(directory, "out.json");
    try {
      const { stdout } = await execFileAsync("node", [evaluatorPath,
        "--tileLayout", files.layout, "--out", outPath,
        "--tileIndex", "136", "--tileX", "8", "--tileY", "8", "--tileId", "183", "--orientation", "1",
        "--yawDegrees", "45", "--pitchDegrees", "45", "--zoom", "25.5", "--centreX", "85", "--centreY", "85",
        "--absoluteCoreResult", files.core, "--selectionReadback", files.selection,
        "--eyeBeforeA", files.beforeA, "--eyeBeforeB", files.beforeB, "--eyeAfter", files.after,
        "--eyeBaseline", files.baseline, "--eyeEffect", files.effect,
      ]);
      const result = JSON.parse(stdout);
      const report = JSON.parse(await readFile(outPath, "utf8"));
      expect(result).toMatchObject({ status: "verified", blockerCodes: [] });
      expect(report).toMatchObject({ version: "aurora-toolset-native-viewport-target/v1", verification: { nativeCamera: { status: "verified" }, auroraEye: { status: "verified" } } });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
