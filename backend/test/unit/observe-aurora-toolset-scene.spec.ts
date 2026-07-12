import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const observerUrl = pathToFileURL(
  resolve(__dirname, "../../scripts/observe-aurora-toolset-scene.mjs"),
).href;

describe("Aurora Toolset scene observer contract", () => {
  it("builds area-agnostic source and vision context without inventing a camera pose", async () => {
    const { stdout } = await execFileAsync("node", ["--input-type=module", "-e", `
      import * as observer from ${JSON.stringify(observerUrl)};
      const observation = observer.buildSceneObservation({
        module: "any-module.mod",
        area: "arbitrary_area",
        capturePath: "C:/proof/viewport.png",
        sourceModulePath: "C:/source/module",
        sourcePackDir: "C:/proof/source/area-source-pack",
        sourceManifest: {
          parsed: {
            are: { width: 4, height: 3, tileSet: "tst", tileCount: 12 },
            git: { counts: { placeables: 2, doors: 1, total: 3 } },
          },
        },
        sourceGit: { visualTransformCounts: { placeables: 1 } },
        visualFeatures: { image: { width: 800, height: 600 } },
      });
      console.log(JSON.stringify(observation));
    `]);
    const observation = JSON.parse(stdout);

    expect(observation.target.areaResref).toBe("arbitrary_area");
    expect(observation.sourceScene.area.resref).toBe("arbitrary_area");
    expect(observation.sourceScene.area.tileCount).toBe(12);
    expect(observation.sourceScene.objects.byKind.placeables).toBe(2);
    expect(observation.capture.viewportBounds).toEqual({ width: 800, height: 600 });
    expect(observation.cameraPose.blockerCode).toBe("camera_pose_solver_not_implemented");
    expect(observation.comparison.status).toBe("blocked");
  });

  it("promotes only a confidence-accepted visual grid pose while retaining the semantic blocker", async () => {
    const { stdout } = await execFileAsync("node", ["--input-type=module", "-e", `
      import * as observer from ${JSON.stringify(observerUrl)};
      const observation = observer.buildSceneObservation({
        module: "any-module.mod",
        area: "arbitrary_area",
        capturePath: "C:/proof/viewport.png",
        sourceModulePath: "C:/source/module",
        sourcePackDir: "C:/proof/source/area-source-pack",
        sourceManifest: { parsed: { are: {}, git: { counts: {} } } },
        sourceGit: {},
        visualFeatures: {},
        cameraPoseAnalysis: {
          status: "estimated",
          cameraPose: { yawDegreesModulo90: 12, pitchDegrees: 68, zoomPixelsPerTile: 143, confidence: 0.92 },
          grid: { directionA: 12, directionB: 102 },
          acceptance: { accepted: true, minimumConfidence: 0.7, blockerCode: null },
        },
      });
      console.log(JSON.stringify(observation));
    `]);
    const observation = JSON.parse(stdout);

    expect(observation.cameraPose.status).toBe("estimated");
    expect(observation.cameraPose.pitchDegrees).toBe(68);
    expect(observation.cameraPose.evidence.solver).toBe("aurora-toolset-grid-pose/v1");
    expect(observation.comparison.blockerCodes).toEqual(["scene_semantic_detector_not_implemented"]);
  });
});
