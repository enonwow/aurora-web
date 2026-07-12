import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const moduleUrl = pathToFileURL(
  resolve(__dirname, "../../scripts/lib/aurora-visual-camera-pose.mjs"),
).href;

async function evaluate(source: string) {
  const { stdout } = await execFileAsync("node", ["--input-type=module", "-e", `
    import * as cameraPose from ${JSON.stringify(moduleUrl)};
    const analysis = (yaw, pitch, zoom) => ({
      cameraPose: { yawDegreesModulo90: yaw, pitchDegrees: pitch, zoomPixelsPerTile: zoom, confidence: 1 },
      acceptance: { accepted: true },
    });
    console.log(JSON.stringify(await (async () => { ${source} })()));
  `]);
  return JSON.parse(stdout);
}

describe("Aurora visual camera pose transitions", () => {
  it("unwraps a small yaw rotation across the modulo-90 boundary", async () => {
    const result = await evaluate(`
      return cameraPose.buildVisualCameraTransition({ before: analysis(88, 70, 200), after: analysis(2, 70, 200) });
    `);
    expect(result.yawDeltaModulo90Degrees).toBe(4);
  });

  it("requires a numeric pitch delta instead of accepting an image-only change", async () => {
    const result = await evaluate(`
      const transition = cameraPose.buildVisualCameraTransition({ before: analysis(20, 90, 200), after: analysis(20, 90, 200) });
      return cameraPose.requireMeasuredCameraCommand({ command: "pitch-up", transition });
    `);
    expect(result.status).toBe("blocked");
    expect(result.blockerCode).toBe("toolset_camera_pitch_delta_not_proven");
  });

  it("reports zoom as a visual scale ratio", async () => {
    const result = await evaluate(`
      const transition = cameraPose.buildVisualCameraTransition({ before: analysis(20, 70, 200), after: analysis(20, 70, 220) });
      return cameraPose.requireMeasuredCameraCommand({ command: "zoom-in", transition });
    `);
    expect(result).toEqual({ status: "measured", metric: "zoomRatio", value: 1.1 });
  });
});
