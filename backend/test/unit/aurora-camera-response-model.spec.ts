import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
const execFileAsync=promisify(execFile);const url=pathToFileURL(resolve(__dirname,"../../scripts/lib/aurora-camera-response-model.mjs")).href;
async function estimate(input:unknown){const{stdout}=await execFileAsync("node",["--input-type=module","-e",`import { estimateAuroraCameraResponseModels } from ${JSON.stringify(url)}; console.log(JSON.stringify(estimateAuroraCameraResponseModels(${JSON.stringify(input)})));`]);return JSON.parse(stdout);}
const measurement=(command:string,before:any,after:any)=>({command,beforePose:before,afterPose:after});
describe("Aurora camera response model",()=>{
 it("uses a median of measured numeric transitions",async()=>{const result=await estimate({measurements:[measurement("pitch-up",{yawDegrees:0,pitchDegrees:60,zoomPixelsPerTile:100},{yawDegrees:0,pitchDegrees:62,zoomPixelsPerTile:100}),measurement("pitch-up",{yawDegrees:0,pitchDegrees:60,zoomPixelsPerTile:100},{yawDegrees:0,pitchDegrees:62.2,zoomPixelsPerTile:100}),measurement("pitch-up",{yawDegrees:0,pitchDegrees:60,zoomPixelsPerTile:100},{yawDegrees:0,pitchDegrees:61.9,zoomPixelsPerTile:100})]});expect(result).toMatchObject({status:"measured",models:{"pitch-up":{pitchDegrees:2,sampleCount:3}}});});
 it("blocks a command with contradictory response direction",async()=>{const result=await estimate({measurements:[measurement("zoom-in",{zoomPixelsPerTile:100},{zoomPixelsPerTile:110}),measurement("zoom-in",{zoomPixelsPerTile:100},{zoomPixelsPerTile:90}),measurement("zoom-in",{zoomPixelsPerTile:100},{zoomPixelsPerTile:110})]});expect(result).toMatchObject({status:"blocked",blockers:[expect.objectContaining({blockerCode:"camera_response_direction_inconsistent"})]});});
 it("does not accept too few samples",async()=>{const result=await estimate({measurements:[measurement("rotate-clockwise",{yawDegrees:0},{yawDegrees:3})]});expect(result).toMatchObject({status:"blocked",blockers:[expect.objectContaining({blockerCode:"camera_response_samples_insufficient"})]});});
});
