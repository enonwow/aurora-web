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
const outPath = requiredPath(options.out, "--out");
const tileLayout = readJson(tileLayoutPath);
const absoluteCoreResultPath = options.absoluteCoreResult ? requiredFile(options.absoluteCoreResult, "--absoluteCoreResult") : null;
const observationPath = options.observation ? requiredFile(options.observation, "--observation") : null;
if (!observationPath && !absoluteCoreResultPath) throw new Error("--observation or --absoluteCoreResult is required.");
const rawObservation = observationPath ? readJson(observationPath) : null;
const selectionReadback = options.selectionReadback ? readJson(requiredFile(options.selectionReadback, "--selectionReadback")) : null;

const sourceTile = resolveSourceTileTarget({
  tileLayout,
  tileIndex: optionalInteger(options.tileIndex, "--tileIndex"),
  tileX: optionalInteger(options.tileX, "--tileX"),
  tileY: optionalInteger(options.tileY, "--tileY"),
  tileId: optionalInteger(options.tileId, "--tileId"),
  orientation: optionalInteger(options.orientation, "--orientation"),
});

let evaluation;
if (absoluteCoreResultPath) {
  evaluation = evaluateNativeAbsoluteTarget({
    sourceTile,
    core: readJson(absoluteCoreResultPath),
    selectionReadback,
    eye: {
      beforeA: readOptionalJson(options.eyeBeforeA, "--eyeBeforeA"),
      beforeB: readOptionalJson(options.eyeBeforeB, "--eyeBeforeB"),
      after: readOptionalJson(options.eyeAfter, "--eyeAfter"),
      baseline: readOptionalJson(options.eyeBaseline, "--eyeBaseline"),
      effect: readOptionalJson(options.eyeEffect, "--eyeEffect"),
    },
    requested: {
      yawDegrees: requiredNumber(options.yawDegrees, "--yawDegrees"),
      pitchDegrees: requiredNumber(options.pitchDegrees, "--pitchDegrees"),
      zoom: requiredNumber(options.zoom, "--zoom"),
      centreX: requiredNumber(options.centreX, "--centreX"),
      centreY: requiredNumber(options.centreY, "--centreY"),
    },
    tolerance: {
      yawDegrees: optionalNumber(options.yawTolerance, "--yawTolerance") ?? 1,
      pitchDegrees: optionalNumber(options.pitchTolerance, "--pitchTolerance") ?? 1,
      zoomRatio: optionalNumber(options.zoomToleranceRatio, "--zoomToleranceRatio") ?? 0.05,
      centreWorld: optionalNumber(options.centerToleranceWorld, "--centerToleranceWorld") ?? 1,
    },
  });
} else {
  const cameraCalibration = options.cameraCalibration ? readJson(requiredFile(options.cameraCalibration, "--cameraCalibration")) : null;
  const observation = mergeCameraCalibration(rawObservation, cameraCalibration);
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
  evaluation = evaluateAuroraViewportTarget({ target, observation, toolsetSelectionReadback: selectionReadback });
}
const report = {
  ...evaluation,
  generatedAt: new Date().toISOString(),
  inputs: { tileLayoutPath, observationPath, absoluteCoreResultPath, selectionReadbackPath: options.selectionReadback ? resolve(options.selectionReadback) : null, cameraCalibrationPath: options.cameraCalibration ? resolve(options.cameraCalibration) : null },
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
function readOptionalJson(value, name) { return value ? readJson(requiredFile(value, name)) : null; }
function evaluateNativeAbsoluteTarget({ sourceTile, core, selectionReadback, eye, requested, tolerance }) {
  const blockers = [];
  const fail = (code, reason, details = undefined) => blockers.push({ code, reason, ...(details === undefined ? {} : { details }) });
  const exactBinary = "4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24";
  if (core?.status !== "at_target" || core?.adapter?.readback !== "native" || core?.adapter?.provenance !== "native_toolset") fail("native_absolute_core_unverified", "Absolute controller did not finish at_target with native Toolset readback.");
  if (core?.adapter?.binarySha256 !== exactBinary) fail("native_toolset_binary_mismatch", "Native readback does not identify the approved Toolset binary.");
  const selected = selectionReadback?.sourceTile;
  const tileFields = ["index", "x", "y", "tileId", "orientation"];
  const tileMismatch = tileFields.find((field) => Number(selected?.[field]) !== Number(sourceTile[field]));
  if (selectionReadback?.status !== "verified" || selectionReadback?.evidenceKind !== "source-targeted-visual-selection/v1" || tileMismatch) fail("source_tile_proof_mismatch", "Verified source-targeted tile identity does not match the target.", { mismatch: tileMismatch ?? null });
  if (Number(core?.target?.sourceTile?.x) !== sourceTile.x || Number(core?.target?.sourceTile?.y) !== sourceTile.y) fail("native_core_source_tile_mismatch", "Absolute core target does not match the resolved source tile.");
  const target = { sourceTile, camera: requested, tolerance };
  const coreTarget = core?.target?.camera ?? {};
  for (const key of ["yawDegrees", "pitchDegrees", "zoom", "centreX", "centreY"]) {
    if (!Number.isFinite(Number(coreTarget[key])) || Math.abs(Number(coreTarget[key]) - Number(requested[key])) > 1e-6) fail("native_core_requested_target_mismatch", `Core requested ${key} does not match the canonical target.`, { expected: requested[key], actual: coreTarget[key] ?? null });
  }
  const actual = core?.achievedState?.camera ?? {};
  const checks = {
    yawDegrees: periodicDistance(Number(actual.yawDegrees), requested.yawDegrees, 360) <= tolerance.yawDegrees,
    pitchDegrees: Math.abs(Number(actual.pitchDegrees) - requested.pitchDegrees) <= tolerance.pitchDegrees,
    zoom: Number(actual.zoom) > 0 && Math.abs(Math.log(Number(actual.zoom) / requested.zoom)) <= Math.log(1 + tolerance.zoomRatio),
    centreX: Math.abs(Number(actual.centreX) - requested.centreX) <= tolerance.centreWorld,
    centreY: Math.abs(Number(actual.centreY) - requested.centreY) <= tolerance.centreWorld,
  };
  for (const [axis, ok] of Object.entries(checks)) if (!ok) fail(`native_${axis}_out_of_tolerance`, `Native ${axis} readback is outside tolerance.`, { expected: requested[axis], actual: actual[axis] ?? null });
  for (const stage of ["beforeA", "beforeB", "after"]) if (eye[stage]?.status !== "verified") fail(`aurora_eye_${stage}_missing`, `Aurora Eye ${stage} artifact is not verified.`);
  if (eye.baseline?.status !== "verified" || !Number.isFinite(Number(eye.baseline?.changedRatio)) || Number(eye.baseline.changedRatio) > 0.001) fail("aurora_eye_baseline_unstable", "Aurora Eye before-a/b baseline exceeds the 0.1% noise ceiling.");
  if (eye.effect?.status !== "verified" || !(Number(eye.effect?.changedSamples) > 0)) fail("aurora_eye_effect_missing", "Aurora Eye did not independently observe the commanded visual change.");
  return {
    version: "aurora-toolset-native-viewport-target/v1",
    status: blockers.length === 0 ? "verified" : "blocked",
    target,
    observation: { areaResref: core?.achievedState?.area ?? null, cameraPoseStatus: core?.achievedState?.provenance ?? "missing" },
    verification: { nativeCamera: { status: Object.values(checks).every(Boolean) ? "verified" : "blocked", achieved: actual, checks }, sourceTile: { status: tileMismatch ? "blocked" : "verified", tile: sourceTile }, auroraEye: { status: blockers.some((item) => item.code.startsWith("aurora_eye_")) ? "blocked" : "verified", baseline: eye.baseline, effect: eye.effect } },
    blockerCodes: blockers.map((item) => item.code),
    blockers,
    rule: "Acceptance requires exact source-tile identity, native Toolset absolute-state readback within explicit tolerances, and an independent stable-before/changed-after Aurora Eye transaction.",
  };
}
function periodicDistance(left, right, period) { const raw = Math.abs((left - right) % period); return Math.min(raw, period - raw); }
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
