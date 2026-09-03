#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runAbsoluteToolsetCameraControl } from "./lib/toolset-absolute-camera-core.mjs";

const options = parseArgs(process.argv.slice(2));
const scriptDir = dirname(fileURLToPath(import.meta.url));
const probePath = resolve(scriptDir, "probe-toolset-native-camera-readback.mjs");
const commandPath = resolve(scriptDir, "apply-toolset-native-camera-command.mjs");
const moduleName = required(options.module, "--module");
const area = required(options.area, "--area").toLowerCase();
const selectionProof = JSON.parse(readFileSync(resolve(required(options.selectionProof, "--selectionProof")), "utf8"));
if (selectionProof.status !== "verified" || selectionProof.evidenceKind !== "source-targeted-visual-selection/v1") throw new Error("Verified source selection proof is required.");
const sourceTile = selectionProof.sourceTile;
const responseModels = Object.fromEntries(required(options.models, "--models").split(",").map((entry) => {
  const separator = entry.indexOf("=");
  if (separator < 1) throw new Error(`Invalid model mapping ${entry}.`);
  const command = entry.slice(0, separator);
  return [command, JSON.parse(readFileSync(resolve(entry.slice(separator + 1)), "utf8"))];
}));
const holdMs = {
  "rotate-clockwise": hold(options.rotateHoldMs ?? 30, "--rotateHoldMs"),
  "rotate-counterclockwise": hold(options.rotateHoldMs ?? 30, "--rotateHoldMs"),
  "pitch-down": hold(options.pitchHoldMs ?? 20, "--pitchHoldMs"),
  "pitch-up": hold(options.pitchHoldMs ?? 20, "--pitchHoldMs"),
  "zoom-in": hold(options.zoomHoldMs ?? 20, "--zoomHoldMs"),
  "zoom-out": hold(options.zoomHoldMs ?? 20, "--zoomHoldMs"),
};

const adapter = {
  async describe() { return { status: "ready", readback: "native", provenance: "native_toolset", binarySha256: "4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24" }; },
  async readState() {
    const binding = runJson(probePath, ["--module", moduleName, "--area", area, "--display", "\\\\.\\DISPLAY1"]);
    if (binding.status !== "camera_bound_read_only") throw new Error("Native camera probe is not ready.");
    return { area, provenance: "native_toolset", sourceTile, camera: binding.camera.nativeState };
  },
  async selectSourceTile(target) {
    if (target.area !== area || target.sourceTile.x !== sourceTile.x || target.sourceTile.y !== sourceTile.y) throw new Error("Native adapter only accepts the independently verified selected source tile.");
  },
  async applyBoundedCommand({ command, controlledAxis }) {
    const model = responseModels[command];
    if (!model || !(command in holdMs)) throw new Error(`No bounded native command configuration for ${command}.`);
    const expectedAxis = { "rotate-clockwise": "yawDegrees", "rotate-counterclockwise": "yawDegrees", "pitch-down": "pitchDegrees", "pitch-up": "pitchDegrees", "zoom-in": "zoomLogRatio", "zoom-out": "zoomLogRatio" }[command];
    if (controlledAxis !== expectedAxis) throw new Error(`Command ${command} cannot control ${controlledAxis}.`);
    runJson(commandPath, ["--module", moduleName, "--area", area, "--command", command, "--holdMs", String(holdMs[command])]);
  },
};

const result = await runAbsoluteToolsetCameraControl({
  adapter,
  target: { area, sourceTile, camera: { yawDegrees: number(options.yaw, "--yaw"), pitchDegrees: number(options.pitch, "--pitch"), zoom: number(options.zoom, "--zoom"), centreX: number(options.centreX, "--centreX"), centreY: number(options.centreY, "--centreY") } },
  tolerance: { yawDegrees: number(options.yawTolerance ?? 1, "--yawTolerance"), pitchDegrees: number(options.pitchTolerance ?? 1, "--pitchTolerance"), zoomLogRatio: number(options.zoomTolerance ?? Math.log(1.05), "--zoomTolerance"), centreX: number(options.centreTolerance ?? 1, "--centreTolerance"), centreY: number(options.centreTolerance ?? 1, "--centreTolerance") },
  responseModels,
  maxCorrections: Number(options.maxCorrections ?? 12),
});
const out = resolve(required(options.out, "--out"));mkdirSync(dirname(out),{recursive:true});writeFileSync(out,`${JSON.stringify(result,null,2)}\n`,`utf8`);console.log(JSON.stringify(result,null,2));

function runJson(path,args){return JSON.parse(execFileSync(process.execPath,[path,...args],{encoding:"utf8",maxBuffer:1024*1024*8,timeout:60000,windowsHide:true}).trim());}
function parseArgs(args){const out={};for(let i=0;i<args.length;i+=2){const k=args[i],v=args[i+1];if(!k?.startsWith("--")||v===undefined)throw new Error("Expected --key value arguments.");out[k.slice(2)]=v;}return out;}
function required(value,name){const text=String(value??"").trim();if(!text)throw new Error(`${name} is required.`);return text;}
function number(value,name){const parsed=Number(value);if(!Number.isFinite(parsed))throw new Error(`${name} must be finite.`);return parsed;}
function hold(value,name){const parsed=Number(value);if(!Number.isInteger(parsed)||parsed<1||parsed>5000)throw new Error(`${name} must be an integer from 1 to 5000.`);return parsed;}
