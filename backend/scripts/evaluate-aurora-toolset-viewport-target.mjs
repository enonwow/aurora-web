#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  buildAuroraViewportTarget,
  evaluateAuroraViewportTarget,
  resolveSourceTileTarget,
} from "./lib/aurora-toolset-viewport-target-standard.mjs";

const options = parseArgs(process.argv.slice(2));
const tileLayoutPath = requiredFile(options.tileLayout, "--tileLayout");
const observationPath = requiredFile(options.observation, "--observation");
const outPath = requiredPath(options.out, "--out");
const tileLayout = readJson(tileLayoutPath);
const rawObservation = readJson(observationPath);
const cameraCalibration = options.cameraCalibration ? readJson(requiredFile(options.cameraCalibration, "--cameraCalibration")) : null;
const observation = mergeCameraCalibration(rawObservation, cameraCalibration);
const selectionReadback = options.selectionReadback ? readJson(requiredFile(options.selectionReadback, "--selectionReadback")) : null;

const sourceTile = resolveSourceTileTarget({
  tileLayout,
  tileIndex: optionalInteger(options.tileIndex, "--tileIndex"),
  tileX: optionalInteger(options.tileX, "--tileX"),
  tileY: optionalInteger(options.tileY, "--tileY"),
  tileId: optionalInteger(options.tileId, "--tileId"),
  orientation: optionalInteger(options.orientation, "--orientation"),
});
const target = buildAuroraViewportTarget({
  sourceTile,
  yawDegrees: requiredNumber(options.yawDegrees, "--yawDegrees"),
  pitchDegrees: requiredNumber(options.pitchDegrees, "--pitchDegrees"),
  zoomPixelsPerTile: requiredNumber(options.zoomPixelsPerTile, "--zoomPixelsPerTile"),
  tolerance: {
    yawDegrees: optionalNumber(options.yawTolerance, "--yawTolerance"),
    pitchDegrees: optionalNumber(options.pitchTolerance, "--pitchTolerance"),
    zoomRatio: optionalNumber(options.zoomToleranceRatio, "--zoomToleranceRatio"),
    screenCenterPixels: optionalNumber(options.centerTolerancePixels, "--centerTolerancePixels"),
  },
});
const evaluation = evaluateAuroraViewportTarget({ target, observation, toolsetSelectionReadback: selectionReadback });
const report = {
  ...evaluation,
  generatedAt: new Date().toISOString(),
  inputs: { tileLayoutPath, observationPath, selectionReadbackPath: options.selectionReadback ? resolve(options.selectionReadback) : null, cameraCalibrationPath: options.cameraCalibration ? resolve(options.cameraCalibration) : null },
  safety: {
    launchesToolset: false,
    usesGlobalCursor: false,
    usesGlobalKeyboard: false,
    usesGlobalMouse: false,
    method: "offline target-contract evaluation; no camera action is dispatched",
  },
};
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ status: report.status, outPath, blockerCodes: report.blockerCodes, report }, null, 2));

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) throw new Error(`Unexpected argument: ${token}`);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) throw new Error(`Missing value for ${token}.`);
    result[token.slice(2)] = value;
    index += 1;
  }
  return result;
}

function readJson(path) { return JSON.parse(readFileSync(path, "utf8")); }
function mergeCameraCalibration(observation, calibration) {
  if (!calibration) return observation;
  if (calibration.status !== "estimated" || !Number.isFinite(Number(calibration.yawDegrees))) return observation;
  return {
    ...observation,
    cameraPose: {
      ...(observation?.cameraPose ?? {}),
      status: observation?.cameraPose?.status === "estimated" ? "estimated" : observation?.cameraPose?.status ?? "blocked",
      yawDegrees: Number(calibration.yawDegrees),
      yawEvidence: calibration.yawEvidence ?? null,
    },
  };
}
function requiredFile(value, name) { const path = resolve(requiredText(value, name)); if (!existsSync(path)) throw new Error(`${name} does not exist: ${path}`); return path; }
function requiredPath(value, name) { return resolve(requiredText(value, name)); }
function requiredText(value, name) { const text = String(value ?? "").trim(); if (!text) throw new Error(`${name} is required.`); return text; }
function requiredNumber(value, name) { const result = Number(requiredText(value, name)); if (!Number.isFinite(result)) throw new Error(`${name} must be numeric.`); return result; }
function optionalNumber(value, name) { if (value === undefined) return undefined; return requiredNumber(value, name); }
function optionalInteger(value, name) { if (value === undefined) return undefined; const result = Number(value); if (!Number.isInteger(result)) throw new Error(`${name} must be an integer.`); return result; }
