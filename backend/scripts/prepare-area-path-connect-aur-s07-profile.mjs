#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";

import { validatePathConnectDifferentialProfile } from "./lib/tile-path-connect-differential-proof.mjs";

const USER_TEST_MODULE_MODE = "user_owned_test_module_action";
const CENTRAL_TEST_MODULE_MODE = "central_guarded_test_module_action";
const options = parseArgs(process.argv.slice(2));
const runtimeProfileId = options.profileId ?? "aw-path-connect-tms01-7-runtime-v1";
if (!/^[a-z0-9][a-z0-9-]{2,127}$/u.test(runtimeProfileId)) {
  throw new Error("path_connect_runtime_profile_id_invalid");
}
const runtimeLaunchMode = options.launchMode ?? USER_TEST_MODULE_MODE;
if (![USER_TEST_MODULE_MODE, CENTRAL_TEST_MODULE_MODE].includes(runtimeLaunchMode)) {
  throw new Error("path_connect_runtime_launch_mode_invalid");
}
const modulePath = requiredPath(options.module, "--module");
const pathProfilePath = requiredPath(options.pathProfile, "--pathProfile");
const packedReadbackPath = requiredPath(options.packedReadback, "--packedReadback");
const nativeGeometryManifestPath = requiredPath(options.nativeGeometryManifest, "--nativeGeometryManifest");
const positivePngPath = requiredPath(options.positivePng, "--positivePng");
const positiveCapturePath = requiredPath(options.positiveCapture, "--positiveCapture");
const negativePngPath = requiredPath(options.negativePng, "--negativePng");
const negativeCapturePath = requiredPath(options.negativeCapture, "--negativeCapture");
const preScriptPositiveArePath = requiredPath(options.preScriptPositiveAre, "--preScriptPositiveAre");
const preScriptNegativeArePath = requiredPath(options.preScriptNegativeAre, "--preScriptNegativeAre");
const bootstrapProfilePath = requiredPath(options.bootstrapProfile, "--bootstrapProfile");
const engineLogPath = runtimeLaunchMode === CENTRAL_TEST_MODULE_MODE ? requiredPath(options.engineLog, "--engineLog") : null;
const runtimeHarnessPreflightPath = runtimeLaunchMode === CENTRAL_TEST_MODULE_MODE ? requiredPath(options.runtimeHarnessPreflight, "--runtimeHarnessPreflight") : null;
const outDir = resolve(required(options.outDir, "--outDir"));
const finalPathProfilePath = resolve(outDir, "post-binding-path-connect-profile.json");
const geometryGatePath = resolve(outDir, "post-binding-geometry-gate.json");
const runtimeProfilePath = resolve(outDir, "aur-s07-runtime-profile.json");
const readinessPath = resolve(outDir, "aur-s07-runtime-readiness.json");
for (const path of [finalPathProfilePath, geometryGatePath, runtimeProfilePath, readinessPath]) {
  if (existsSync(path)) throw new Error(`path_connect_aur_s07_output_exists:${path}`);
}

const module = fileIdentity(modulePath);
if (runtimeLaunchMode === CENTRAL_TEST_MODULE_MODE && !module.fileName.toLowerCase().endsWith(".mod")) {
  throw new Error("path_connect_runtime_module_path_invalid");
}
const sourcePathProfile = readJson(pathProfilePath);
if (sourcePathProfile.schema !== "aurora-tile-path-connect-profile/v2") throw new Error("path_connect_source_profile_schema_invalid");
assertNoErrors(validatePathConnectDifferentialProfile(sourcePathProfile), "source_path_profile");
const packedReadback = readJson(packedReadbackPath);
if (packedReadback.status !== "packed-runtime-binding-verified" || packedReadback.module?.sha256 !== module.sha256 ||
  packedReadback.area?.resref !== "demo" || packedReadback.area?.onEnter !== "pc_tms01_run" ||
  packedReadback.script?.resref !== "pc_tms01_run" || packedReadback.script?.nss?.exactNormalizedSource !== true ||
  packedReadback.script?.nss?.exactlyOneMain !== true || packedReadback.script?.ncs?.exactCompiledBytecode !== true) {
  throw new Error("path_connect_packed_runtime_binding_invalid");
}

const positive = readArea(sourcePathProfile.positiveAreaResRef);
const negative = readArea(sourcePathProfile.negativeAreaResRef);
validateArea(positive, sourcePathProfile, "positive");
validateArea(negative, sourcePathProfile, "negative");
const entry = runJson("read-aurora-toolset-bootstrap-entry-readback.mjs", ["--module", modulePath]);
if (entry.moduleSha256 !== module.sha256 || entry.area !== "demo" || !Array.isArray(entry.position) ||
  entry.position.length !== 3 || !entry.position.every(Number.isFinite)) throw new Error("path_connect_entry_readback_invalid");

const preScriptPositiveAre = fileIdentity(preScriptPositiveArePath);
const preScriptNegativeAre = fileIdentity(preScriptNegativeArePath);
if (preScriptPositiveAre.sha256 !== positive.areSha256 || preScriptNegativeAre.sha256 !== negative.areSha256) {
  throw new Error("path_connect_geometry_are_changed_after_runtime_binding");
}
const nativeGeometryManifest = readJson(nativeGeometryManifestPath);
if (nativeGeometryManifest.version !== "aurora-toolset-binary-native-geometry-manifest/v1" ||
  nativeGeometryManifest.status !== "area_create_native_save_verified" ||
  nativeGeometryManifest.area?.resref !== sourcePathProfile.positiveAreaResRef) throw new Error("path_connect_native_geometry_manifest_invalid");
const positiveCapture = validateCapture(positiveCapturePath, positivePngPath, sourcePathProfile.positiveAreaResRef);
const negativeCapture = validateCapture(negativeCapturePath, negativePngPath, sourcePathProfile.negativeAreaResRef);

const bootstrapProfile = readJson(bootstrapProfilePath);
const orderedHakList = (bootstrapProfile.orderedHakList ?? []).map((hak, index) => {
  const identity = fileIdentity(requiredPath(hak.path, `orderedHakList[${index}].path`));
  if (identity.sha256 !== hak.sha256 || !/^[a-z0-9_]{1,16}$/u.test(hak.resref ?? "")) throw new Error(`path_connect_ordered_hak_invalid:${index}`);
  return { resref: hak.resref, path: identity.path, sha256: identity.sha256 };
});
if (orderedHakList.length === 0) throw new Error("path_connect_ordered_hak_list_empty");

const finalPathProfile = { ...sourcePathProfile, moduleSha256: module.sha256 };
assertNoErrors(validatePathConnectDifferentialProfile(finalPathProfile), "final_path_profile");
const runtimeEvidence = runtimeLaunchMode === CENTRAL_TEST_MODULE_MODE
  ? validateRuntimeEvidenceInputs(engineLogPath, runtimeHarnessPreflightPath, finalPathProfile, module)
  : null;
const geometryGate = {
  version: "area-path-connect-post-binding-geometry-gate/v1",
  status: "verified",
  verifiedAt: new Date().toISOString(),
  module,
  pathProfile: { source: artifact(pathProfilePath), finalPath: finalPathProfilePath },
  exactAreaReadback: {
    positive: { area: positive.area, areSha256: positive.areSha256, bytes: preScriptPositiveAre.bytes, unchangedAfterRuntimeBinding: true, tiles: positive.tiles },
    negative: { area: negative.area, areSha256: negative.areSha256, bytes: preScriptNegativeAre.bytes, unchangedAfterRuntimeBinding: true, tiles: negative.tiles },
  },
  nativeEvidence: {
    geometryManifest: artifact(nativeGeometryManifestPath),
    positiveCapture,
    negativeCapture,
  },
  runtimeBinding: artifact(packedReadbackPath),
  claim: "The exact positive and negative ARE payloads are byte-identical to the pre-script native Toolset resources; only Demo.OnEnter and pc_tms01_run NSS/NCS were added.",
};
const geometryGateBytes = Buffer.from(serializeJson(geometryGate), "utf8");
const runtimeProfile = {
  version: "aur-s07-runtime-profile/v1",
  id: runtimeProfileId,
  module: runtimeLaunchMode === CENTRAL_TEST_MODULE_MODE
    ? { path: module.path, sha256: module.sha256, area: "demo", entryPoint: entry.position }
    : { sha256: module.sha256, area: "demo", entryPoint: entry.position },
  orderedHakList,
  fixtures: [
    { id: "path-connect-positive", area: finalPathProfile.positiveAreaResRef, source: finalPathProfile.source, partner: finalPathProfile.partner, expected: { crossedSharedEdge: true, reachedTarget: true, timedOut: false } },
    { id: "path-connect-negative", area: finalPathProfile.negativeAreaResRef, control: finalPathProfile.negativeControl, expected: { crossedSharedEdge: false, reachedTarget: false, timedOut: false } },
  ],
  geometryGate: {
    status: "verified",
    artifact: geometryGatePath,
    sha256: sha256(geometryGateBytes),
  },
  launch: { mode: runtimeLaunchMode, processName: "nwmain" },
  ...(runtimeEvidence ? {
    engineLog: runtimeEvidence.engineLog,
    evidencePolicy: runtimeEvidence.evidencePolicy,
  } : {}),
  noLocalSubstitute: true,
};
mkdirSync(outDir, { recursive: true });
writeJson(finalPathProfilePath, finalPathProfile);
writeJson(geometryGatePath, geometryGate);
writeJson(runtimeProfilePath, runtimeProfile);
const readiness = {
  version: "area-path-connect-aur-s07-runtime-readiness/v1",
  status: "ready-for-aur-s07-dry-run-and-arm",
  generatedAt: new Date().toISOString(),
  module,
  entry,
  positive,
  negative,
  packedReadback: artifact(packedReadbackPath),
  finalPathProfile: artifact(finalPathProfilePath),
  geometryGate: artifact(geometryGatePath),
  runtimeProfile: artifact(runtimeProfilePath),
  runtimeEvidence,
  safety: {
    startsToolset: false,
    startsNwn: false,
    requestsNwnStart: runtimeLaunchMode === CENTRAL_TEST_MODULE_MODE,
    usesGlobalInput: false,
    mutatesModule: false,
  },
};
writeJson(readinessPath, readiness);
console.log(JSON.stringify({ ok: true, status: readiness.status, module, finalPathProfilePath, geometryGatePath, runtimeProfilePath, readinessPath }, null, 2));

function readArea(area) {
  return runJson("read-aurora-toolset-bootstrap-area-readback.mjs", ["--module", modulePath, "--area", area]);
}

function validateArea(readback, profile, role) {
  if (readback.moduleSha256 !== module.sha256 || readback.completeTileList !== true || readback.tileSet !== profile.tilesetResRef ||
    readback.width !== profile.areaWidth || readback.height !== profile.areaHeight || readback.area !== profile[`${role}AreaResRef`]) {
    throw new Error(`path_connect_${role}_area_readback_invalid`);
  }
  const expectedSource = role === "positive" ? profile.source : profile.negativeControl.source;
  const expectedPartner = role === "positive" ? profile.partner : profile.negativeControl.partner;
  for (const [label, expected] of [["source", expectedSource], ["partner", expectedPartner]]) {
    const matches = readback.tiles.filter((tile) => tile.row === expected.row && tile.col === expected.col);
    if (matches.length !== 1 || matches[0].tileId !== expected.tileId || matches[0].orientation !== expected.orientation) {
      throw new Error(`path_connect_${role}_${label}_tile_readback_invalid`);
    }
  }
}

function validateCapture(capturePath, pngPath, area) {
  const capture = readJson(capturePath);
  if (capture.status !== "captured" || capture.expected?.area !== area || capture.context?.contextMismatch !== false ||
    capture.capture?.success !== true || capture.capture?.imageSanity?.ok !== true) throw new Error(`path_connect_capture_invalid:${area}`);
  return { area, manifest: artifact(capturePath), png: artifact(pngPath) };
}

function validateRuntimeEvidenceInputs(engineLogPath, runtimeHarnessPreflightPath, profile, module) {
  const engineLog = fileIdentity(engineLogPath);
  if (engineLog.fileName.toLowerCase() !== "nwclientlog1.txt") throw new Error("path_connect_runtime_engine_log_invalid");
  const harness = readJson(runtimeHarnessPreflightPath);
  const binding = harness?.binding;
  if (harness?.schema !== "aurora-area-path-connect-runtime-harness-preflight/v1" || harness.script?.resref !== "pc_tms01_run" || harness.script?.exactlyOneMain !== true || binding?.profileId !== profile.id || binding?.rowId !== profile.rowId || !Number.isFinite(binding?.settleSeconds) || binding.settleSeconds <= 0 || !Number.isFinite(binding?.trialSeconds) || binding.trialSeconds <= 0) throw new Error("path_connect_runtime_engine_log_invalid");
  const minimumCaptureDurationSeconds = Math.ceil((2 * binding.settleSeconds) + (2 * binding.trialSeconds) + 2);
  if (minimumCaptureDurationSeconds < 2 || minimumCaptureDurationSeconds > 90) throw new Error("path_connect_runtime_engine_log_invalid");
  return {
    engineLog: {
      path: engineLog.path,
      loadingModuleResref: basename(module.path, ".mod"),
      requiredTokens: [
        `AURORA_PATH_CONNECT_START profile=${binding.profileId} row=${binding.rowId}`,
        "AURORA_PATH_CONNECT_POSITIVE crossedSharedEdge=",
        "AURORA_PATH_CONNECT_NEGATIVE crossedSharedEdge=",
        "AURORA_PATH_CONNECT_COMPLETE failures=0",
      ],
    },
    evidencePolicy: {
      version: "aur-s07-runtime-evidence-policy/v1",
      minimumCaptureDurationSeconds,
      requiredArtifactKinds: [
        "runtime-observation",
        "runtime-capture",
        "runtime-capture-metadata",
        "engine-load-log",
        "engine-load-log-metadata",
        "runtime-visual-review",
      ],
    },
    runtimeHarnessPreflight: artifact(runtimeHarnessPreflightPath),
  };
}

function runJson(script, args) {
  return JSON.parse(execFileSync(process.execPath, [resolve("scripts", script), ...args], { encoding: "utf8", windowsHide: true, timeout: 60_000, maxBuffer: 12 * 1024 * 1024 }).trim());
}

function artifact(path) {
  const identity = fileIdentity(path);
  return { path: identity.path, sha256: identity.sha256, bytes: identity.bytes };
}

function fileIdentity(path) {
  const resolved = resolve(path);
  const bytes = readFileSync(resolved);
  return { path: resolved, sha256: sha256(bytes), bytes: statSync(resolved).size, fileName: basename(resolved) };
}

function assertNoErrors(errors, label) {
  if (errors.length > 0) throw new Error(`path_connect_${label}_invalid:${errors.join(",")}`);
}

function readJson(path) { return JSON.parse(readFileSync(path, "utf8")); }
function serializeJson(value) { return `${JSON.stringify(value, null, 2)}\n`; }
function writeJson(path, value) { writeFileSync(path, serializeJson(value), { encoding: "utf8", flag: "wx" }); }
function sha256(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
function requiredPath(value, label) { const result = resolve(required(value, label)); if (!existsSync(result)) throw new Error(`missing_path:${label}:${result}`); return result; }
function required(value, label) { const result = String(value ?? "").trim(); if (!result) throw new Error(`missing:${label}`); return result; }
function parseArgs(argv) { const result = {}; for (let index = 0; index < argv.length; index += 2) { const key = argv[index], value = argv[index + 1]; if (!key?.startsWith("--") || value === undefined || value.startsWith("--")) throw new Error(`invalid_argument:${key ?? "end"}`); result[key.slice(2)] = value; } return result; }
