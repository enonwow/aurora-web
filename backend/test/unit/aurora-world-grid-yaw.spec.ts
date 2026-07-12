import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
const execFileAsync = promisify(execFile);
const url = pathToFileURL(resolve(__dirname, "../../scripts/lib/aurora-world-grid-yaw.mjs")).href;
async function derive(input: unknown) { const { stdout } = await execFileAsync("node", ["--input-type=module", "-e", `import { deriveSourceGridCalibratedYaw } from ${JSON.stringify(url)}; console.log(JSON.stringify(deriveSourceGridCalibratedYaw(${JSON.stringify(input)})));`]); return JSON.parse(stdout); }
const sample = (x: number, y: number, screenX: number, screenY: number) => ({ status: "verified", tile: { index: y * 4 + x, x, y, tileId: 197, orientation: 1 }, selectionCenter: { x: screenX, y: screenY } });
describe("source-grid calibrated Aurora yaw", () => {
  it("derives a full directed bearing from verified +X samples", async () => {
    const result = await derive({ samples: [sample(0, 0, 100, 100), sample(1, 0, 100, 200)] });
    expect(result).toMatchObject({ status: "estimated", yawDegrees: 90, yawEvidence: { coordinateSystem: "aurora-area-source-grid/v1" } });
  });
  it("uses +Y with the documented 90-degree conversion", async () => {
    const result = await derive({ samples: [sample(0, 0, 100, 100), sample(0, 1, 0, 100)] });
    expect(result).toMatchObject({ status: "estimated", yawDegrees: 90 });
  });
  it("rejects an outline-only sample", async () => {
    const bad = sample(0, 0, 0, 0); bad.status = "visual-only";
    await expect(derive({ samples: [bad, sample(1, 0, 10, 0)] })).rejects.toBeTruthy();
  });
  it("blocks when both source axes disagree", async () => {
    const result = await derive({ samples: [sample(0, 0, 0, 0), sample(1, 0, 100, 0), sample(0, 1, 100, 0)] });
    expect(result).toMatchObject({ status: "blocked", blockerCode: "camera_world_yaw_axis_inconsistent" });
  });
});
