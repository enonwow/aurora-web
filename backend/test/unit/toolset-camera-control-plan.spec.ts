import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const moduleUrl = pathToFileURL(
  resolve(__dirname, "../../scripts/lib/toolset-camera-control-plan.mjs"),
).href;

async function evaluate(source: string) {
  const { stdout } = await execFileAsync("node", ["--input-type=module", "-e", `
    import * as camera from ${JSON.stringify(moduleUrl)};
    console.log(JSON.stringify(await (async () => { ${source} })()));
  `]);
  return JSON.parse(stdout);
}

describe("toolset camera control plan", () => {
  it("maps movement, rotation, pitch, and zoom to camera-only buttons", async () => {
    const result = await evaluate(`
      return Object.keys(camera.TOOLSET_CAMERA_COMMANDS).map((command) =>
        camera.buildToolsetCameraControlPlan({ command })
      );
    `);
    expect(result.map((entry: { buttonIndex: number }) => entry.buttonIndex)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
    ]);
    expect(result.every((entry: { buttonIndex: number }) => entry.buttonIndex < 10)).toBe(true);
    expect(result.slice(0, 4).map((entry: { interaction: string }) => entry.interaction)).toEqual([
      "hold", "hold", "hold", "hold",
    ]);
    expect(result.slice(8).map((entry: { interaction: string }) => entry.interaction)).toEqual([
      "hold", "hold",
    ]);
  });

  it("rejects unsupported commands instead of reaching object-rotation buttons", async () => {
    const result = await evaluate(`
      try { camera.buildToolsetCameraControlPlan({ command: "rotate-selected-object" }); }
      catch (error) { return { code: error.code, message: error.message }; }
    `);
    expect(result.code).toBe("unsupported_toolset_camera_command");
  });

  it("keeps the public plan free of guessed angle or zoom-factor units", async () => {
    const result = await evaluate(`
      return Object.values(camera.TOOLSET_CAMERA_COMMANDS).map((entry) => Object.keys(entry));
    `);
    expect(result.flat()).not.toContain("degrees");
    expect(result.flat()).not.toContain("zoomFactor");
  });

  it("permits micro calibration pulses without exposing duration as a camera unit", async () => {
    const result = await evaluate(`
      return camera.buildToolsetCameraControlPlan({ command: "move-left", holdMs: 1 });
    `);
    expect(result.holdMs).toBe(1);
  });
});
