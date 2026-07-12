import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
const execFileAsync=promisify(execFile);const url=pathToFileURL(resolve(__dirname,"../../scripts/lib/aurora-camera-closed-loop-controller.mjs")).href;
async function plan(input:unknown){const{stdout}=await execFileAsync("node",["--input-type=module","-e",`import { planAuroraCameraCorrection } from ${JSON.stringify(url)}; console.log(JSON.stringify(planAuroraCameraCorrection(${JSON.stringify(input)})));`]);return JSON.parse(stdout);}
const base={currentPose:{yawDegrees:350,pitchDegrees:60,zoomPixelsPerTile:100},targetPose:{yawDegrees:10,pitchDegrees:66,zoomPixelsPerTile:105},tolerance:{yawDegrees:2,pitchDegrees:1,zoomRatio:0.03},responseModels:{"rotate-clockwise":{status:"measured",yawDegrees:4},"pitch-up":{status:"measured",pitchDegrees:2},"zoom-in":{status:"measured",zoomLogRatio:0.08}}};
describe("Aurora camera closed loop controller",()=>{
 it("selects a single measured primitive, not a time-derived angle",async()=>{const result=await plan(base);expect(result).toMatchObject({status:"dispatch_one_then_reobserve",command:"rotate-clockwise",controlledDimension:"yawDegrees"});expect(result.invariant).toContain("recompute numeric pose");});
 it("stops at a numeric target",async()=>{const result=await plan({...base,targetPose:{yawDegrees:351,pitchDegrees:60.5,zoomPixelsPerTile:102}});expect(result).toMatchObject({status:"at_target"});});
 it("blocks instead of guessing an uncalibrated control direction",async()=>{const result=await plan({...base,responseModels:{"pitch-down":{status:"measured",pitchDegrees:-2}}});expect(result).toMatchObject({status:"blocked",blockerCode:"camera_response_model_missing"});});
});
