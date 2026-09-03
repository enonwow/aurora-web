import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const url = pathToFileURL(resolve(__dirname, "../../scripts/lib/toolset-absolute-camera-core.mjs")).href;
const sha = "4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24";

function state(camera: any, tile = { x: 2, y: 2 }) { return { area: "enon_bakery", sourceTile: tile, camera, provenance: "native_toolset" }; }
const target = { area: "enon_bakery", sourceTile: { x: 2, y: 2 }, camera: { yawDegrees: 45, pitchDegrees: 45, zoom: 12, centreX: 2.5, centreY: 2.5 } };
const tolerance = { yawDegrees: 0.1, pitchDegrees: 0.1, zoomLogRatio: 0.01, centreX: 0.01, centreY: 0.01 };
const models = {
  "yaw-plus": { status: "measured", source: "native_readback", sampleCount: 3, deltas: { yawDegrees: 5, pitchDegrees: 0, zoomLogRatio: 0, centreX: 0, centreY: 0 } },
  "pitch-plus": { status: "measured", source: "native_readback", sampleCount: 3, deltas: { yawDegrees: 0, pitchDegrees: 5, zoomLogRatio: 0, centreX: 0, centreY: 0 } },
  "zoom-plus": { status: "measured", source: "native_readback", sampleCount: 3, deltas: { yawDegrees: 0, pitchDegrees: 0, zoomLogRatio: 0.1, centreX: 0, centreY: 0 } },
  "pan-x-plus": { status: "measured", source: "native_readback", sampleCount: 3, deltas: { yawDegrees: 0, pitchDegrees: 0, zoomLogRatio: 0, centreX: 0.5, centreY: 0 } },
  "pan-y-plus": { status: "measured", source: "native_readback", sampleCount: 3, deltas: { yawDegrees: 0, pitchDegrees: 0, zoomLogRatio: 0, centreX: 0, centreY: 0.5 } },
};
async function invoke(expression: string) { const { stdout } = await execFileAsync("node", ["--input-type=module", "-e", `import * as core from ${JSON.stringify(url)}; ${expression}`]); return JSON.parse(stdout); }

describe("native absolute Toolset camera core", () => {
  it("rejects a visual or unversioned adapter before it can command Aurora", async () => {
    const result = await invoke(`try { await core.runAbsoluteToolsetCameraControl({adapter:{describe:async()=>({status:'ready',readback:'visual',binarySha256:${JSON.stringify(sha)}}),readState:async()=>(${JSON.stringify(state(target.camera))})},target:${JSON.stringify(target)},tolerance:${JSON.stringify(tolerance)},responseModels:${JSON.stringify(models)}}) } catch(error) { console.log(JSON.stringify({code:error.code})) }`);
    expect(result).toEqual({ code: "camera_state_adapter_unavailable" });
  });

  it("requires exact native Area and source-tile readback", async () => {
    const current = state(target.camera, { x: 1, y: 2 });
    const result = await invoke(`try { await core.runAbsoluteToolsetCameraControl({adapter:{describe:async()=>({status:'ready',readback:'native',binarySha256:${JSON.stringify(sha)}}),readState:async()=>(${JSON.stringify(current)}),selectSourceTile:async()=>{}},target:${JSON.stringify(target)},tolerance:${JSON.stringify(tolerance)},responseModels:${JSON.stringify(models)}}) } catch(error) { console.log(JSON.stringify({code:error.code})) }`);
    expect(result).toEqual({ code: "toolset_source_tile_readback_mismatch" });
  });

  it("accepts 45 degree yaw/pitch only from native readback", async () => {
    const current = state(target.camera);
    const result = await invoke(`const adapter={describe:async()=>({status:'ready',readback:'native',binarySha256:${JSON.stringify(sha)},provenance:'bridge'}),readState:async()=>(${JSON.stringify(current)})}; console.log(JSON.stringify(await core.runAbsoluteToolsetCameraControl({adapter,target:${JSON.stringify(target)},tolerance:${JSON.stringify(tolerance)},responseModels:${JSON.stringify(models)}})))`);
    expect(result.status).toBe("at_target");
    expect(result.achievedState.camera).toMatchObject({ yawDegrees: 45, pitchDegrees: 45 });
    expect(result.adapter.readback).toBe("native");
  });

  it("selects the requested tile, corrects one native axis, then re-reads it", async () => {
    const start = state({ ...target.camera, yawDegrees: 40 }, { x: 1, y: 2 });
    const result = await invoke(`let current=${JSON.stringify(start)}; const calls=[]; const adapter={describe:async()=>({status:'ready',readback:'native',binarySha256:${JSON.stringify(sha)}}),readState:async()=>current,selectSourceTile:async()=>{calls.push('select');current={...current,sourceTile:{x:2,y:2}}},applyBoundedCommand:async({command})=>{calls.push(command);current={...current,camera:{...current.camera,yawDegrees:current.camera.yawDegrees+5}}}}; const result=await core.runAbsoluteToolsetCameraControl({adapter,target:${JSON.stringify(target)},tolerance:${JSON.stringify(tolerance)},responseModels:${JSON.stringify(models)}}); console.log(JSON.stringify({status:result.status,calls,corrections:result.corrections.length,yaw:result.achievedState.camera.yawDegrees}))`);
    expect(result).toEqual({ status: "at_target", calls: ["select", "yaw-plus"], corrections: 1, yaw: 45 });
  });

  it("fails closed when only a coupled correction is available", async () => {
    const assessment = { status: "correction_required", unresolved: ["yawDegrees"], errors: { yawDegrees: 10 } };
    const coupled = { "bad-yaw": { ...models["yaw-plus"], deltas: { ...models["yaw-plus"].deltas, centreX: 1 } } };
    const result = await invoke(`try { core.chooseNativeCorrection({assessment:${JSON.stringify(assessment)},responseModels:${JSON.stringify(coupled)},tolerance:${JSON.stringify(tolerance)}}) } catch(error) { console.log(JSON.stringify({code:error.code})) }`);
    expect(result).toEqual({ code: "toolset_camera_response_model_coupled" });
  });
});
