#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { parsePathConnectRuntimeLog } from "./lib/area-path-connect-runtime-harness.mjs";
import { validatePathConnectDifferentialProfile } from "./lib/tile-path-connect-differential-proof.mjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const aurS07Runner = resolve(scriptDirectory, "aur-s07-runtime-execution.mjs");
const differentialValidator = resolve(scriptDirectory, "validate-aurora-tile-path-connect-differential.mjs");

try {
  main();
} catch (error) {
  print({ ok: false, status: "failed", blockerCode: "PATH_CONNECT_AUR_S07_PROOF_ASSEMBLY_FAILED", failures: [error instanceof Error ? error.message : String(error)] });
  process.exitCode = 1;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const aurProfilePath = requiredFile(options.aurProfile, "--aurProfile");
  const aurPacketPath = requiredFile(options.aurPacket, "--aurPacket");
  const pathProfilePath = requiredFile(options.pathProfile, "--pathProfile");
  const rowPath = requiredFile(options.row, "--row");
  const runtimeHarnessPreflightPath = requiredFile(options.runtimeHarnessPreflight, "--runtimeHarnessPreflight");
  const outDir = resolve(required(options.outDir, "--outDir"));
  const pathConnectPacketPath = resolve(outDir, "path-connect-runtime-packet.json");
  const pathConnectProofPath = resolve(outDir, "path-connect-differential-proof.json");
  for (const path of [pathConnectPacketPath, pathConnectProofPath]) if (existsSync(path)) throw new Error(`path_connect_output_already_exists:${path}`);

  const aurValidation = runJson(aurS07Runner, ["validate", "--profile", aurProfilePath, "--packet", aurPacketPath]);
  if (aurValidation.ok !== true || aurValidation.status !== "verified") throw new Error(`aur_s07_runtime_packet_rejected:${(aurValidation.failures ?? []).join(",")}`);

  const aurProfile = readJson(aurProfilePath);
  const aurPacket = readJson(aurPacketPath);
  const pathProfile = readJson(pathProfilePath);
  const row = readJson(rowPath);
  const harness = readJson(runtimeHarnessPreflightPath);
  const profileFailures = validatePathConnectDifferentialProfile(pathProfile, row);
  if (profileFailures.length > 0) throw new Error(`path_connect_profile_rejected:${profileFailures.join(",")}`);
  requireCrossProfileBinding(aurProfile, aurPacket, pathProfile, harness);

  const geometryGatePath = requiredFile(aurProfile.geometryGate?.artifact, "aurProfile.geometryGate.artifact");
  if (sha256File(geometryGatePath) !== aurProfile.geometryGate.sha256) throw new Error("path_connect_geometry_gate_hash_mismatch");
  const geometryGate = readJson(geometryGatePath);
  requireGeometryReadback(geometryGate, pathProfile);

  const aurArtifacts = new Map((aurPacket.artifacts ?? []).map((artifact) => [artifact.kind, artifact]));
  const runtimeCapture = requireBoundArtifact(aurArtifacts, "runtime-capture");
  const engineLog = requireBoundArtifact(aurArtifacts, "engine-load-log");
  const runtime = parsePathConnectRuntimeLog(readFileSync(engineLog.path, "utf8"), harness.binding);
  const pathConnectPacket = {
    schema: "aurora-tile-path-connect-differential-packet/v2",
    profileId: pathProfile.id,
    profileSha256: sha256File(pathProfilePath),
    moduleSha256: pathProfile.moduleSha256,
    positiveAreaResRef: pathProfile.positiveAreaResRef,
    negativeAreaResRef: pathProfile.negativeAreaResRef,
    rowId: pathProfile.rowId,
    toolsetReadback: {
      verified: true,
      tilesetResRef: pathProfile.tilesetResRef,
      definitionFingerprint: pathProfile.definitionFingerprint,
      dimensions: { width: pathProfile.areaWidth, height: pathProfile.areaHeight },
      positive: { areaResRef: pathProfile.positiveAreaResRef, source: pathProfile.source, partner: pathProfile.partner },
      negative: { areaResRef: pathProfile.negativeAreaResRef, control: pathProfile.negativeControl },
    },
    runtime,
    artifacts: {
      toolsetReadback: descriptor(geometryGatePath),
      positiveRuntime: { path: runtimeCapture.path, sha256: runtimeCapture.sha256 },
      negativeRuntime: { path: runtimeCapture.path, sha256: runtimeCapture.sha256 },
      engineLog: { path: engineLog.path, sha256: engineLog.sha256 },
    },
  };
  mkdirSync(outDir, { recursive: true });
  writeFileSync(pathConnectPacketPath, `${JSON.stringify(pathConnectPacket, null, 2)}\n`, { flag: "wx" });
  const differential = runJson(differentialValidator, [
    "--profile", pathProfilePath,
    "--packet", pathConnectPacketPath,
    "--row", rowPath,
    "--out", pathConnectProofPath,
  ]);
  if (differential.ok !== true || differential.status !== "verified" || !existsSync(pathConnectProofPath)) throw new Error(`path_connect_differential_rejected:${(differential.failures ?? []).join(",")}`);
  print({
    ok: true,
    status: "verified",
    aurS07ProfileId: aurProfile.id,
    pathConnectProfileId: pathProfile.id,
    runtime,
    pathConnectPacketPath,
    pathConnectPacketSha256: sha256File(pathConnectPacketPath),
    pathConnectProofPath,
    pathConnectProofSha256: sha256File(pathConnectProofPath),
    artifacts: {
      completeTimedRuntimeCaptureSharedBySequentialPositiveAndNegativeTrials: descriptor(runtimeCapture.path),
      freshEngineLogWindow: descriptor(engineLog.path),
      nativeToolsetGeometryGate: descriptor(geometryGatePath),
    },
  });
}

function requireCrossProfileBinding(aurProfile, aurPacket, pathProfile, harness) {
  if (aurProfile.version !== "aur-s07-runtime-profile/v1" || aurPacket.version !== "aur-s07-runtime-packet/v1" || aurProfile.module?.sha256 !== pathProfile.moduleSha256 || aurPacket.moduleSha256 !== pathProfile.moduleSha256) throw new Error("path_connect_aur_s07_module_binding_mismatch");
  if (harness.schema !== "aurora-area-path-connect-runtime-harness-preflight/v1" || harness.binding?.profileId !== pathProfile.id || harness.binding?.rowId !== pathProfile.rowId) throw new Error("path_connect_runtime_harness_binding_mismatch");
  const expectedFixtures = [
    { id: "path-connect-positive", area: pathProfile.positiveAreaResRef, source: pathProfile.source, partner: pathProfile.partner, expected: { crossedSharedEdge: true, reachedTarget: true, timedOut: false } },
    { id: "path-connect-negative", area: pathProfile.negativeAreaResRef, control: pathProfile.negativeControl, expected: { crossedSharedEdge: false, reachedTarget: false, timedOut: false } },
  ];
  if (JSON.stringify(aurProfile.fixtures) !== JSON.stringify(expectedFixtures) || JSON.stringify(aurPacket.fixtures) !== JSON.stringify(expectedFixtures)) throw new Error("path_connect_aur_s07_fixture_binding_mismatch");
  const requiredTokens = aurProfile.engineLog?.requiredTokens ?? [];
  for (const token of [
    `AURORA_PATH_CONNECT_START profile=${pathProfile.id} row=${pathProfile.rowId}`,
    "AURORA_PATH_CONNECT_POSITIVE crossedSharedEdge=",
    "AURORA_PATH_CONNECT_NEGATIVE crossedSharedEdge=",
    "AURORA_PATH_CONNECT_COMPLETE failures=0",
  ]) if (!requiredTokens.includes(token)) throw new Error("path_connect_aur_s07_log_token_binding_mismatch");
}

function requireGeometryReadback(gate, profile) {
  if (gate.version !== "area-path-connect-post-binding-geometry-gate/v1" || gate.status !== "verified" || gate.module?.sha256 !== profile.moduleSha256) throw new Error("path_connect_geometry_gate_invalid");
  for (const [role, areaResRef, source, partner] of [
    ["positive", profile.positiveAreaResRef, profile.source, profile.partner],
    ["negative", profile.negativeAreaResRef, profile.negativeControl.source, profile.negativeControl.partner],
  ]) {
    const readback = gate.exactAreaReadback?.[role];
    if (readback?.area !== areaResRef || readback.unchangedAfterRuntimeBinding !== true || !tilePresent(readback.tiles, source) || !tilePresent(readback.tiles, partner)) throw new Error(`path_connect_geometry_${role}_readback_invalid`);
  }
}

function tilePresent(tiles, expected) {
  return Array.isArray(tiles) && tiles.some((tile) => tile.row === expected.row && tile.col === expected.col && tile.tileId === expected.tileId && tile.orientation === expected.orientation);
}

function requireBoundArtifact(artifacts, kind) {
  const artifact = artifacts.get(kind);
  const path = requiredFile(artifact?.path, `aurPacket.artifacts.${kind}`);
  const actual = sha256File(path);
  if (actual !== artifact.sha256) throw new Error(`runtime_artifact_hash_mismatch:${kind}`);
  return { path, sha256: actual };
}

function runJson(script, args) {
  const stdout = execFileSync(process.execPath, [script, ...args], { encoding: "utf8", windowsHide: true, timeout: 30_000, maxBuffer: 4 * 1024 * 1024 });
  return JSON.parse(stdout);
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index], value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined || value.startsWith("--")) throw new Error(`invalid_argument:${key ?? "end"}`);
    const name = key.slice(2);
    if (Object.hasOwn(result, name)) throw new Error(`duplicate_argument:${name}`);
    result[name] = value;
  }
  return result;
}

function requiredFile(value, label) { const path = resolve(required(value, label)); if (!existsSync(path) || !statSync(path).isFile()) throw new Error(`missing_file:${label}:${path}`); return path; }
function required(value, label) { const text = String(value ?? "").trim(); if (!text) throw new Error(`missing:${label}`); return text; }
function readJson(path) { return JSON.parse(readFileSync(path, "utf8")); }
function sha256File(path) { return createHash("sha256").update(readFileSync(path)).digest("hex"); }
function descriptor(path) { return { path: resolve(path), sha256: sha256File(path) }; }
function print(value) { process.stdout.write(`${JSON.stringify(value, null, 2)}\n`); }
