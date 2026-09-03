import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const url = pathToFileURL(resolve(__dirname, "../../scripts/lib/toolset-native-camera-response-model.mjs")).href;
async function build(input: unknown) { const { stdout } = await execFileAsync("node", ["--input-type=module", "-e", `import { buildNativeToolsetCameraResponseModel } from ${JSON.stringify(url)}; console.log(JSON.stringify(buildNativeToolsetCameraResponseModel(${JSON.stringify(input)})));`]); return JSON.parse(stdout); }
const transition = (id: string, yaw: number) => ({ id, status: "verified", command: "yaw-plus", adapter: { readback: "native", binarySha256: "4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24" }, before: { provenance: "native_toolset", area: "enon_bakery", sourceTile: { x: 1, y: 2 }, camera: { yawDegrees: yaw, pitchDegrees: 45, zoom: 2, centreX: 10, centreY: 20 } }, after: { provenance: "native_toolset", area: "enon_bakery", sourceTile: { x: 1, y: 2 }, camera: { yawDegrees: yaw + 5, pitchDegrees: 45, zoom: 2, centreX: 10, centreY: 20 } } });

describe("native Toolset camera response model", () => {
  it("builds a core-compatible median model from three version-pinned native transitions", async () => {
    const result = await build({ command: "yaw-plus", transitions: [transition("a", 0), transition("b", 30), transition("c", 60)] });
    expect(result).toMatchObject({ status: "measured", source: "native_readback", command: "yaw-plus", sampleCount: 3, deltas: { yawDegrees: 5, pitchDegrees: 0, zoomLogRatio: 0, centreX: 0, centreY: 0 } });
  });

  it("rejects an unpinned visual transition", async () => {
    const source = `import { buildNativeToolsetCameraResponseModel } from ${JSON.stringify(url)}; try { buildNativeToolsetCameraResponseModel({ command: "yaw-plus", transitions: [${JSON.stringify({ ...transition("a", 0), adapter: { readback: "visual" } })}, ${JSON.stringify(transition("b", 30))}, ${JSON.stringify(transition("c", 60))}] }); } catch (error) { console.log(JSON.stringify({ code: error.code })); }`;
    const { stdout } = await execFileAsync("node", ["--input-type=module", "-e", source]);
    expect(JSON.parse(stdout)).toEqual({ code: "toolset_camera_response_transition_not_native" });
  });
});
