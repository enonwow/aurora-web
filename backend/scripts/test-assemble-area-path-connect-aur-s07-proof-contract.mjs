#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const assembler = resolve("backend/scripts/assemble-area-path-connect-aur-s07-proof.mjs");
const root = mkdtempSync(join(tmpdir(), "path-connect-aur-s07-assembler-"));
const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
const sha256 = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const artifact = (kind, path) => ({ kind, path, sha256: sha256(path) });

try {
  const modulePath = join(root, "path_connect.mod");
  writeFileSync(modulePath, "immutable module");
  const moduleSha256 = sha256(modulePath);
  const negativeControl = {
    referenceStatus: "reference-mismatch",
    source: { tileId: 7, pathNode: "d", orientation: 0, edge: "right", row: 0, col: 0 },
    partner: { tileId: 6, pathNode: "e", orientation: 0, edge: "left", row: 0, col: 1 },
    sourceLanes: [0], partnerLanes: [-4, 0, 4], matchingLanes: [0], sourceOnlyLanes: [], partnerOnlyLanes: [-4, 4],
    sourceRegionsByLane: [{ lane: 0, regions: [0] }],
    partnerRegionsByLane: [{ lane: -4, regions: [2] }, { lane: 0, regions: [1] }, { lane: 4, regions: [0] }],
    reason: "path-node-reference-mismatch",
  };
  const row = {
    schema: "aurora-tile-add-connect-matrix-row/v1",
    id: "tms01:7", tilesetResRef: "tms01", tileId: 7, definitionFingerprint: "d".repeat(64),
    fixture: { kind: "tile", chunkId: "chunk", caseIndex: 0, width: 2, height: 2, cells: [
      { role: "source", row: 0, col: 0, tileId: 7 },
      { role: "partner", row: 0, col: 1, tileId: 5 },
    ] },
    connect: { status: "planned", partnerTileId: 5 },
    pathConnect: {
      status: "blocked", sourcePathNode: "d", partnerPathNode: "b",
      reference: { status: "reference-match", source: { orientation: 0 }, partner: { orientation: 0 }, sourceEdge: "right", partnerEdge: "left", matchingLanes: [0] },
      negativeControl,
    },
  };
  const pathProfile = {
    schema: "aurora-tile-path-connect-profile/v2", id: "tms01-7-right-5-path-connect-v2", approved: true,
    moduleSha256, positiveAreaResRef: "pc_tms01_pos", negativeAreaResRef: "pc_tms01_neg", areaWidth: 2, areaHeight: 2,
    tilesetResRef: "tms01", definitionFingerprint: row.definitionFingerprint, rowId: row.id,
    source: negativeControl.source,
    partner: { tileId: 5, pathNode: "b", orientation: 0, edge: "left", row: 0, col: 1 },
    matchingLanes: [0], negativeControl,
  };
  const rowPath = join(root, "row.json");
  const pathProfilePath = join(root, "path-profile.json");
  writeJson(rowPath, row);
  writeJson(pathProfilePath, pathProfile);

  const geometryGatePath = join(root, "geometry-gate.json");
  writeJson(geometryGatePath, {
    version: "area-path-connect-post-binding-geometry-gate/v1", status: "verified",
    module: { path: modulePath, sha256: moduleSha256 },
    exactAreaReadback: {
      positive: { area: pathProfile.positiveAreaResRef, unchangedAfterRuntimeBinding: true, tiles: [pathProfile.source, pathProfile.partner] },
      negative: { area: pathProfile.negativeAreaResRef, unchangedAfterRuntimeBinding: true, tiles: [negativeControl.source, negativeControl.partner] },
    },
  });
  const runtimeHarnessPath = join(root, "runtime-harness-preflight.json");
  const binding = {
    profileId: pathProfile.id, rowId: pathProfile.rowId,
    positiveAreaTag: "AW_PC_TMS01_POS", negativeAreaTag: "AW_PC_TMS01_NEG",
    sharedEdgeX: 10, source: { x: 7.5, y: 5, z: 0 }, target: { x: 12.5, y: 5, z: 0 },
    settleSeconds: 0.5, trialSeconds: 2.5, reachedDistance: 1,
  };
  writeJson(runtimeHarnessPath, { schema: "aurora-area-path-connect-runtime-harness-preflight/v1", binding });

  const engineLogPath = join(root, "engine-log-window.bin");
  writeFileSync(engineLogPath, [
    "[test] Loading Module: path_connect",
    `[test] AURORA_PATH_CONNECT_START profile=${binding.profileId} row=${binding.rowId}`,
    "[test] AURORA_PATH_CONNECT_POSITIVE crossedSharedEdge=true reachedTarget=true timedOut=false x=12.5 y=5.0",
    "[test] AURORA_PATH_CONNECT_NEGATIVE crossedSharedEdge=false reachedTarget=false timedOut=false x=9.4 y=5.0",
    "[test] AURORA_PATH_CONNECT_COMPLETE failures=0",
  ].join("\n"));
  const aurProfile = {
    version: "aur-s07-runtime-profile/v1", id: "path-connect-runtime-v4",
    module: { path: modulePath, sha256: moduleSha256, area: "demo", entryPoint: [21.5, 19.5, 0] },
    orderedHakList: [],
    fixtures: [
      { id: "path-connect-positive", area: pathProfile.positiveAreaResRef, source: pathProfile.source, partner: pathProfile.partner, expected: { crossedSharedEdge: true, reachedTarget: true, timedOut: false } },
      { id: "path-connect-negative", area: pathProfile.negativeAreaResRef, control: pathProfile.negativeControl, expected: { crossedSharedEdge: false, reachedTarget: false, timedOut: false } },
    ],
    geometryGate: { status: "verified", artifact: geometryGatePath, sha256: sha256(geometryGatePath) },
    launch: { mode: "central_guarded_test_module_action", processName: "nwmain" },
    engineLog: {
      path: engineLogPath, loadingModuleResref: "path_connect",
      requiredTokens: [
        `AURORA_PATH_CONNECT_START profile=${binding.profileId} row=${binding.rowId}`,
        "AURORA_PATH_CONNECT_POSITIVE crossedSharedEdge=",
        "AURORA_PATH_CONNECT_NEGATIVE crossedSharedEdge=",
        "AURORA_PATH_CONNECT_COMPLETE failures=0",
      ],
    },
    evidencePolicy: {
      version: "aur-s07-runtime-evidence-policy/v1", minimumCaptureDurationSeconds: 8,
      requiredArtifactKinds: ["runtime-observation", "runtime-capture", "runtime-capture-metadata", "engine-load-log", "engine-load-log-metadata", "runtime-visual-review"],
    },
  };
  const aurProfilePath = join(root, "aur-profile.json");
  writeJson(aurProfilePath, aurProfile);
  const aurProfileSha256 = sha256(aurProfilePath);
  const runtimeProcess = { name: "nwmain", pid: 1234, startedAt: "2026-08-27T12:00:00.000Z" };
  const observationPath = join(root, "observation.json");
  writeJson(observationPath, { version: "aur-s07-runtime-observation/v1", profileId: aurProfile.id, profileSha256: aurProfileSha256, process: runtimeProcess, moduleSha256, area: "demo", entryPoint: aurProfile.module.entryPoint });
  const capturePath = join(root, "capture.mp4");
  writeFileSync(capturePath, Buffer.alloc(12_000, 9));
  const captureMetadataPath = join(root, "capture.json");
  writeJson(captureMetadataPath, {
    version: "aurora-nwmain-proof-video-capture/v1", ok: true, status: "verified",
    process: { name: "nwmain", pid: runtimeProcess.pid, startedAtUtc: runtimeProcess.startedAt, hwnd: 9001, responding: true },
    capture: { source: "physical desktop pixels clipped to the exact owned nwmain client area", path: capturePath, sha256: sha256(capturePath), sizeBytes: readFileSync(capturePath).byteLength, requestedDurationSeconds: 10, validation: { decode: "verified", codec: "h264", faststart: true } },
    monitor: { deviceName: "\\\\.\\DISPLAY1", primary: false }, identityObservation: { allStable: true, allProbePointsOwnedByNwmain: true },
    safety: { startsNwn: false, usesGlobalInput: false, changesZOrder: false, activatesWindow: false },
  });
  const logMetadataPath = join(root, "engine-log-window.json");
  writeJson(logMetadataPath, {
    version: "aur-s07-engine-log-window/v1", profileId: aurProfile.id, profileSha256: aurProfileSha256, moduleSha256,
    sourcePath: engineLogPath, windowPath: engineLogPath, windowSha256: sha256(engineLogPath), loadingModuleResref: "path_connect",
    requiredTokens: aurProfile.engineLog.requiredTokens.map((token) => ({ token, present: true })), process: runtimeProcess,
  });
  const reviewPath = join(root, "visual-review.json");
  writeJson(reviewPath, {
    version: "aur-s07-runtime-visual-review/v1", status: "accepted", profileId: aurProfile.id, profileSha256: aurProfileSha256, moduleSha256,
    capture: { path: capturePath, sha256: sha256(capturePath), bytes: readFileSync(capturePath).byteLength },
    modelVisibility: { status: "visible", blank: false, placeholder: false }, notes: "contract fixture reviewed",
  });
  const aurPacket = {
    version: "aur-s07-runtime-packet/v1", profileId: aurProfile.id, profileSha256: aurProfileSha256, moduleSha256, area: "demo", entryPoint: aurProfile.module.entryPoint,
    fixtures: aurProfile.fixtures, modelVisibility: { status: "visible", blank: false, placeholder: false },
    artifacts: [
      artifact("runtime-observation", observationPath), artifact("runtime-capture", capturePath), artifact("runtime-capture-metadata", captureMetadataPath),
      artifact("engine-load-log", engineLogPath), artifact("engine-load-log-metadata", logMetadataPath), artifact("runtime-visual-review", reviewPath),
    ],
  };
  const aurPacketPath = join(root, "aur-packet.json");
  writeJson(aurPacketPath, aurPacket);

  const outDir = join(root, "accepted");
  const accepted = run("--aurProfile", aurProfilePath, "--aurPacket", aurPacketPath, "--pathProfile", pathProfilePath, "--row", rowPath, "--runtimeHarnessPreflight", runtimeHarnessPath, "--outDir", outDir);
  assert.equal(accepted.status, 0, accepted.stderr || accepted.stdout);
  const result = JSON.parse(accepted.stdout);
  assert.equal(result.status, "verified");
  assert.equal(result.runtime.positive.crossedSharedEdge, true);
  assert.equal(result.runtime.negative.crossedSharedEdge, false);
  assert.equal(sha256(result.pathConnectPacketPath), result.pathConnectPacketSha256);
  assert.equal(sha256(result.pathConnectProofPath), result.pathConnectProofSha256);

  writeFileSync(engineLogPath, "tampered after packet\n");
  const rejected = run("--aurProfile", aurProfilePath, "--aurPacket", aurPacketPath, "--pathProfile", pathProfilePath, "--row", rowPath, "--runtimeHarnessPreflight", runtimeHarnessPath, "--outDir", join(root, "rejected"));
  assert.notEqual(rejected.status, 0);
  assert.match(`${rejected.stdout}\n${rejected.stderr}`, /runtime_artifact_hash_mismatch:engine-load-log/u);
  process.stdout.write("Area PathConnect AUR-S07 proof assembler contract: PASS\n");
} finally {
  rmSync(root, { recursive: true, force: true });
}

function run(...args) {
  return spawnSync(process.execPath, [assembler, ...args], { encoding: "utf8" });
}
