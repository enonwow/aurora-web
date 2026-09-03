#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  MODEL_PROOF_VERSION,
  buildVerdict,
  createClock,
  deadlineStatus,
  nextState,
  selectFreshLogSlice,
  validateAcceptedRuntimeNwmainCleanupAdmission,
  validateCleanupEvidence,
  validateFailedLaneRecoveryAdmission,
  validateFailedLaneReadyCandidateBinding,
  validatePostRuntimeHiddenToolsetCleanupAdmission,
  validateToolsetOnlyVisibleReadyCleanupAdmission,
  validateModelProofProfile,
  validatePngBytes,
} from "./lib/aurora-model-proof-120s-contract.mjs";
import {
  loadRouteManifestWithSupersession,
  modelProofTimedCoordinatorDigest,
} from "./lib/aurora-model-proof-120s-route-manifest-supersession.mjs";

const hex = (value) => value.repeat(64).slice(0, 64);
const profile = {
  version: MODEL_PROOF_VERSION,
  id: "contract-profile",
  hardLimitMs: 120_000,
  binaryProfile: { path: "C:\\proof\\binary.json", sha256: hex("a") },
  toolsetProfile: { path: "C:\\proof\\toolset.json", sha256: hex("b") },
  runtimeProfile: { path: "C:\\proof\\runtime.json", sha256: hex("c") },
  routeManifest: { path: "C:\\proof\\routes.json", sha256: hex("3") },
  installedModule: { path: "C:\\NWN\\modules\\contract.mod", sha256: hex("d"), byteLength: 10 },
  orderedHakList: [{ resref: "contract", path: "C:\\NWN\\hak\\contract.hak", sha256: hex("e"), byteLength: 11 }],
  resources: {
    mdl: { resref: "contract_model", sha256: hex("f") },
    tga: { resref: "contract_texture", sha256: hex("1") },
    appearance2da: { resref: "appearance", row: 15100, sha256: hex("2") },
  },
  area: { resref: "contract_area", displayName: "Contract Area", entryPoint: [10, 10, 0] },
  fixture: {
    id: "fixture",
    templateResRef: "nw_dwarfmerc001",
    treeObjectText: "Contract Fixture",
    occurrence: 0,
    appearanceRow: 15100,
    position: [10, 14.5, 0],
  },
  runtime: {
    loadingModuleResref: "contract",
    engineLogPath: "C:\\NWN\\logs\\nwclientLog1.txt",
  },
  entryMode: "adopt-exact-clean",
  outputRoot: "C:\\proof\\live",
  policy: {
    noSave: true,
    noBuild: true,
    noRepack: true,
    noFocus: true,
    noCamera: true,
    noRetry: true,
  },
};

assert.equal(validateModelProofProfile(profile).id, "contract-profile");
for (const mutation of [
  (value) => { value.version = "unknown"; },
  (value) => { value.hardLimitMs = 120_001; },
  (value) => { value.fixture.occurrence = -1; },
  (value) => { value.policy.noFocus = false; },
  (value) => { value.policy.noRetry = false; },
  (value) => { value.entryMode = "cold"; },
]) {
  const changed = structuredClone(profile);
  mutation(changed);
  assert.throws(() => validateModelProofProfile(changed));
}

const clock = createClock({ counter: 10_000n, frequency: 1_000n });
assert.equal(clock.hardLimitMs, 120_000);
assert.deepEqual(deadlineStatus(clock, 129_999n), { elapsedMs: 119_999, remainingMs: 1, expired: false });
assert.deepEqual(deadlineStatus(clock, 130_000n), { elapsedMs: 120_000, remainingMs: 0, expired: true });
assert.throws(() => deadlineStatus(clock, 9_999n), /counter_moved_backwards/);
const forgedClock = { ...clock, hardLimitMs: 999_999 };
assert.throws(() => deadlineStatus(forgedClock, 130_000n), /clock_hard_limit_invalid/);
const forgedDeadline = { ...clock, deadlineCounter: "999999" };
assert.throws(() => deadlineStatus(forgedDeadline, 130_000n), /clock_deadline_invalid/);

let state = { status: "ready", dispatches: {}, toolsetVerdict: null, runtimeVerdict: null };
state = nextState(state, "toolset-captured", 20_000n, clock);
state = nextState(state, "record-toolset-visible", 25_000n, clock);
state = nextState(state, "runtime-started", 26_000n, clock);
state = nextState(state, "runtime-captured", 70_000n, clock);
state = nextState(state, "record-runtime-not-visible", 75_000n, clock);
state = nextState(state, "finalize", 80_000n, clock);
assert.equal(state.status, "finalized");
assert.equal(state.dispatches["runtime-captured"], 1);
assert.throws(() => nextState(state, "finalize", 81_000n, clock), /phase_already_dispatched/);
assert.throws(
  () => nextState({ status: "ready", dispatches: {}, toolsetVerdict: null, runtimeVerdict: null }, "runtime-captured", 20_000n, clock),
  /invalid_transition/,
);
assert.throws(
  () => nextState({ status: "runtime_running", dispatches: { "runtime-started": 1 }, toolsetVerdict: "visible", runtimeVerdict: null }, "runtime-started", 30_000n, clock),
  /phase_already_dispatched/,
);

let negative = { status: "ready", dispatches: {}, toolsetVerdict: null, runtimeVerdict: null };
negative = nextState(negative, "toolset-captured", 20_000n, clock);
negative = nextState(negative, "record-toolset-not-visible", 25_000n, clock);
negative = nextState(negative, "finalize", 26_000n, clock);
assert.equal(negative.status, "finalized");
assert.equal(negative.runtimeVerdict, null);

const timedOut = nextState(
  { status: "toolset_visible", dispatches: { "toolset-captured": 1, "record-toolset-visible": 1 }, toolsetVerdict: "visible", runtimeVerdict: null },
  "deadline",
  130_000n,
  clock,
);
assert.equal(timedOut.status, "deadline");
assert.equal(timedOut.toolsetVerdict, "visible");
assert.throws(() => nextState(timedOut, "runtime-captured", 130_001n, clock), /deadline_expired/);

const captureSha = hex("9");
assert.deepEqual(
  buildVerdict({ environment: "toolset", captureSha256: captureSha, expectedCaptureSha256: captureSha, modelVisibility: "visible", inspection: "fixture visible" }),
  { environment: "toolset", captureSha256: captureSha, modelVisibility: "visible", proofCompleteness: "verified", inspection: "fixture visible" },
);
assert.throws(
  () => buildVerdict({ environment: "runtime", captureSha256: hex("8"), expectedCaptureSha256: captureSha, modelVisibility: "visible", inspection: "forged" }),
  /capture_hash_mismatch/,
);
assert.throws(
  () => buildVerdict({ environment: "runtime", captureSha256: captureSha, expectedCaptureSha256: captureSha, modelVisibility: "not_tested", inspection: "none" }),
  /visual_verdict_required/,
);

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
assert.equal(validatePngBytes(png).width, 1);
assert.throws(() => validatePngBytes(Buffer.from("not png")), /invalid_png/);
const corruptPng = Buffer.from(png);
corruptPng[29] ^= 1;
assert.throws(() => validatePngBytes(corruptPng), /invalid_png_crc/);

const logRequestAt = "2026-07-22T10:00:00.000Z";
const oldLog = Buffer.from("old historic log\n", "utf8");
const newLine = Buffer.from("Loading Module: contract\n", "utf8");
const oldHash = createHash("sha256").update(oldLog).digest("hex");
const baselineLog = {
  identity: { dev: "1", ino: "2", size: String(oldLog.length), mtimeNs: String(BigInt(Date.parse(logRequestAt)) * 1_000_000n) },
  sha256: oldHash,
};
const appendedBytes = Buffer.concat([oldLog, newLine]);
const appended = selectFreshLogSlice({
  baseline: baselineLog,
  current: { identity: { ...baselineLog.identity, size: String(appendedBytes.length), mtimeNs: String(BigInt(Date.parse(logRequestAt) + 1) * 1_000_000n) } },
  currentBytes: appendedBytes,
  requestCreatedAt: logRequestAt,
});
assert.equal(appended.mode, "append_same_identity");
assert.deepEqual(appended.bytes, newLine);
const truncated = selectFreshLogSlice({
  baseline: baselineLog,
  current: { identity: { ...baselineLog.identity, size: String(newLine.length), mtimeNs: String(BigInt(Date.parse(logRequestAt) + 2) * 1_000_000n) } },
  currentBytes: newLine,
  requestCreatedAt: logRequestAt,
});
assert.equal(truncated.mode, "truncation_observed");
assert.equal(truncated.resetRequired, true);
assert.equal(truncated.bytes.length, 0);
const rotated = selectFreshLogSlice({
  baseline: baselineLog,
  current: { identity: { dev: "1", ino: "3", size: String(newLine.length), mtimeNs: String(BigInt(Date.parse(logRequestAt) + 3) * 1_000_000n) } },
  currentBytes: newLine,
  requestCreatedAt: logRequestAt,
});
assert.equal(rotated.mode, "rotation_observed");
assert.equal(rotated.resetRequired, true);
const resetHeader = Buffer.from("fresh header\n", "utf8");
const resetBaseline = {
  identity: { ...baselineLog.identity, size: String(resetHeader.length), mtimeNs: String(BigInt(Date.parse(logRequestAt) + 2) * 1_000_000n) },
  sha256: createHash("sha256").update(resetHeader).digest("hex"),
};
const afterObservedReset = Buffer.concat([resetHeader, newLine]);
const selectedAfterReset = selectFreshLogSlice({
  baseline: resetBaseline,
  current: { identity: { ...resetBaseline.identity, size: String(afterObservedReset.length), mtimeNs: String(BigInt(Date.parse(logRequestAt) + 3) * 1_000_000n) } },
  currentBytes: afterObservedReset,
  requestCreatedAt: logRequestAt,
});
assert.equal(selectedAfterReset.mode, "append_same_identity");
assert.deepEqual(selectedAfterReset.bytes, newLine);
const staleBaselineBytes = Buffer.concat([newLine, oldLog]);
const staleTokenTruncation = selectFreshLogSlice({
  baseline: {
    identity: { ...baselineLog.identity, size: String(staleBaselineBytes.length) },
    sha256: createHash("sha256").update(staleBaselineBytes).digest("hex"),
  },
  current: { identity: { ...baselineLog.identity, size: String(newLine.length), mtimeNs: String(BigInt(Date.parse(logRequestAt) + 4) * 1_000_000n) } },
  currentBytes: newLine,
  requestCreatedAt: logRequestAt,
});
assert.equal(staleTokenTruncation.resetRequired, true);
assert.equal(staleTokenTruncation.bytes.length, 0);
assert.throws(() => selectFreshLogSlice({
  baseline: baselineLog,
  current: { identity: { ...baselineLog.identity, size: String(newLine.length), mtimeNs: baselineLog.identity.mtimeNs } },
  currentBytes: newLine,
  requestCreatedAt: logRequestAt,
}), /engine_log_not_updated_after_baseline/);

const cleanupReadySession = {
  processId: 700,
  startedAtUtc: "2026-07-22T10:00:00.000Z",
  frameTitle: "BioWare Aurora Neverwinter Nights Toolset - contract.mod",
  area: "contract_area",
};
const runtimeCleanupArtifacts = {
  runtimeCapture: {
    path: "C:\\proof\\live\\runtime\\capture.png",
    sha256: hex("4"),
    byteLength: 100,
    metadataPath: "C:\\proof\\live\\runtime\\capture.json",
    metadataSha256: hex("5"),
  },
  runtimeLog: {
    path: "C:\\proof\\live\\runtime\\engine-log-window.bin",
    sha256: hex("6"),
    byteLength: 40,
    metadataPath: "C:\\proof\\live\\runtime\\engine-log-window.json",
    metadataSha256: hex("7"),
  },
  runtimePacket: {
    path: "C:\\proof\\live\\runtime\\packet.json",
    sha256: hex("8"),
    byteLength: 200,
  },
};
const runtimeCleanupState = {
  version: "aurora-model-proof-120s-state/v1",
  profileId: profile.id,
  profileSha256: hex("a"),
  status: "runtime_captured",
  toolsetVerdict: "visible",
  runtimeVerdict: null,
  artifacts: structuredClone(runtimeCleanupArtifacts),
};
const runtimeCleanupPacket = {
  version: "aurora-model-proof-120s-runtime-packet/v1",
  profileId: profile.id,
  profileSha256: hex("a"),
  process: {
    pid: 701,
    name: "nwmain",
    startedAtUtc: "2026-07-22T10:00:10.000Z",
    responding: true,
    mainWindowHandle: 1701,
    title: "Neverwinter Nights: Enhanced Edition",
  },
  capture: {
    path: runtimeCleanupArtifacts.runtimeCapture.path,
    sha256: runtimeCleanupArtifacts.runtimeCapture.sha256,
    byteLength: runtimeCleanupArtifacts.runtimeCapture.byteLength,
    metadataPath: runtimeCleanupArtifacts.runtimeCapture.metadataPath,
    metadataSha256: runtimeCleanupArtifacts.runtimeCapture.metadataSha256,
  },
  engineLogWindow: {
    path: runtimeCleanupArtifacts.runtimeLog.path,
    sha256: runtimeCleanupArtifacts.runtimeLog.sha256,
    metadataPath: runtimeCleanupArtifacts.runtimeLog.metadataPath,
    metadataSha256: runtimeCleanupArtifacts.runtimeLog.metadataSha256,
  },
};
assert.deepEqual(
  validateCleanupEvidence({
    profileId: profile.id,
    profileSha256: hex("a"),
    state: runtimeCleanupState,
    actualArtifacts: structuredClone(runtimeCleanupArtifacts),
    runtimePacket: runtimeCleanupPacket,
    acceptedProof: { status: "verified" },
    readySession: cleanupReadySession,
  }),
  {
    mode: "runtime",
    runtimeProcess: runtimeCleanupPacket.process,
    toolsetProcess: { pid: 700, startedAtUtc: cleanupReadySession.startedAtUtc },
    acceptedFinalPacket: true,
  },
);
assert.throws(
  () => validateCleanupEvidence({
    profileId: profile.id,
    profileSha256: hex("a"),
    state: runtimeCleanupState,
    actualArtifacts: structuredClone(runtimeCleanupArtifacts),
    runtimePacket: runtimeCleanupPacket,
    acceptedProof: null,
    readySession: cleanupReadySession,
  }),
  /cleanup_runtime_requires_accepted_final_packet/,
);
const missingCleanupCapture = structuredClone(runtimeCleanupArtifacts);
delete missingCleanupCapture.runtimeCapture;
assert.throws(
  () => validateCleanupEvidence({
    profileId: profile.id,
    profileSha256: hex("a"),
    state: runtimeCleanupState,
    actualArtifacts: missingCleanupCapture,
    runtimePacket: runtimeCleanupPacket,
    acceptedProof: { status: "verified" },
    readySession: cleanupReadySession,
  }),
  /cleanup_artifact_missing:runtimeCapture/,
);
const driftedCleanupCapture = structuredClone(runtimeCleanupArtifacts);
driftedCleanupCapture.runtimeCapture.sha256 = hex("9");
assert.throws(
  () => validateCleanupEvidence({
    profileId: profile.id,
    profileSha256: hex("a"),
    state: runtimeCleanupState,
    actualArtifacts: driftedCleanupCapture,
    runtimePacket: runtimeCleanupPacket,
    acceptedProof: { status: "verified" },
    readySession: cleanupReadySession,
  }),
  /cleanup_artifact_hash_drift:runtimeCapture/,
);

const liveNwmainCleanupAdmissionInput = {
  profileId: profile.id,
  profileSha256: hex("a"),
  acceptedProof: {
    status: "verified",
    path: "C:\\proof\\live\\final-model-proof.accepted-at-123.json",
    sha256: hex("f"),
  },
  runtimePacket: runtimeCleanupPacket,
  runtimeArtifacts: runtimeCleanupState.artifacts,
  hostState: {
    nwmainCount: 1,
    nwmainProcesses: [{
      pid: 701,
      name: "nwmain",
      startedAtUtc: "2026-07-22T10:00:10.000Z",
      responding: true,
      mainWindowHandle: 1701,
      title: "Neverwinter Nights: Enhanced Edition",
    }],
    nwmainWindows: [{
      hwnd: 1701,
      processId: 701,
      className: "Exo - Main",
      title: "Neverwinter Nights: Enhanced Edition",
      visible: true,
      enabled: true,
      ownerHwnd: 0,
    }],
  },
};
const liveNwmainCleanupAdmission = validateAcceptedRuntimeNwmainCleanupAdmission(liveNwmainCleanupAdmissionInput);
assert.deepEqual(
  liveNwmainCleanupAdmission,
  {
    version: "aurora-model-proof-120s-live-nwmain-cleanup-admission/v1",
    profileId: profile.id,
    profileSha256: hex("a"),
    acceptedProof: liveNwmainCleanupAdmissionInput.acceptedProof,
    process: liveNwmainCleanupAdmissionInput.hostState.nwmainProcesses[0],
    window: liveNwmainCleanupAdmissionInput.hostState.nwmainWindows[0],
    capture: runtimeCleanupPacket.capture,
    engineLogWindow: runtimeCleanupPacket.engineLogWindow,
    gracefulFirst: true,
    forceFallbackRequiresExactIdentity: true,
  },
);
for (const [name, mutate, error] of [
  ["foreign-pid", (value) => { value.hostState.nwmainProcesses[0].pid = 702; }, /cleanup_nwmain_pid_drift/],
  ["start-drift", (value) => { value.hostState.nwmainProcesses[0].startedAtUtc = "2026-07-22T10:00:11.000Z"; }, /cleanup_nwmain_start_drift/],
  ["hwnd-drift", (value) => { value.hostState.nwmainProcesses[0].mainWindowHandle = 1702; }, /cleanup_nwmain_hwnd_drift/],
  ["multiple", (value) => { value.hostState.nwmainProcesses.push({ ...value.hostState.nwmainProcesses[0], pid: 702 }); value.hostState.nwmainCount = 2; }, /cleanup_nwmain_process_count_invalid/],
  ["modal", (value) => { value.hostState.nwmainWindows.push({ hwnd: 1702, processId: 701, className: "#32770", title: "Confirm", visible: true, enabled: true, ownerHwnd: 1701 }); }, /cleanup_nwmain_modal_detected/],
  ["capture-drift", (value) => { value.runtimeArtifacts.runtimeCapture.sha256 = hex("9"); }, /cleanup_capture_packet_hash_drift/],
  ["log-drift", (value) => { value.runtimeArtifacts.runtimeLog.sha256 = hex("9"); }, /cleanup_engine_log_packet_hash_drift/],
  ["missing-accepted", (value) => { value.acceptedProof = null; }, /cleanup_nwmain_accepted_proof_required/],
]) {
  const changed = structuredClone(liveNwmainCleanupAdmissionInput);
  mutate(changed);
  assert.throws(
    () => validateAcceptedRuntimeNwmainCleanupAdmission(changed),
    error,
    name,
  );
}
const toolsetCleanupArtifacts = {
  toolsetCapture: {
    path: "C:\\proof\\live\\toolset\\capture.png",
    sha256: hex("b"),
    byteLength: 100,
    metadataPath: "C:\\proof\\live\\toolset\\capture.json",
    metadataSha256: hex("c"),
  },
  toolsetPacket: {
    path: "C:\\proof\\live\\toolset\\packet.json",
    sha256: hex("d"),
    byteLength: 200,
  },
  toolsetVerdict: {
    path: "C:\\proof\\live\\toolset\\verdict.json",
    sha256: hex("e"),
    byteLength: 80,
  },
};
const toolsetCleanupState = {
  version: "aurora-model-proof-120s-state/v1",
  profileId: profile.id,
  profileSha256: hex("a"),
  status: "finalized",
  toolsetVerdict: "not_visible",
  runtimeVerdict: null,
  artifacts: structuredClone(toolsetCleanupArtifacts),
};
assert.equal(validateCleanupEvidence({
  profileId: profile.id,
  profileSha256: hex("a"),
  state: toolsetCleanupState,
  actualArtifacts: structuredClone(toolsetCleanupArtifacts),
  runtimePacket: null,
  acceptedProof: { status: "verified" },
  readySession: cleanupReadySession,
}).mode, "toolset-only");
assert.throws(
  () => validateCleanupEvidence({
    profileId: profile.id,
    profileSha256: hex("a"),
    state: toolsetCleanupState,
    actualArtifacts: structuredClone(toolsetCleanupArtifacts),
    runtimePacket: null,
    acceptedProof: null,
    readySession: cleanupReadySession,
  }),
  /cleanup_toolset_only_requires_accepted_final_packet/,
);

const toolsetOnlyVisibleR39Input = {
  profileId: "m2a-m0-r39-controllerless-identity-root-model-proof-120s-v2",
  profileSha256: "da24ebf4768d1feff742177652cac8677ed51b6cff35f16ab28f864185d2da2a",
  moduleName: "m2a_m0r39.mod",
  areaResref: "m2a_m0a39",
  acceptedProof: {
    status: "verified",
    path: "C:\\proof\\run-2\\final-model-proof.accepted-at-123.json",
    sha256: hex("f"),
  },
  readySession: {
    processId: 19012,
    startedAtUtc: "2026-07-24T15:09:29.1722743Z",
    frameHwnd: 37225440,
    frameTitle: "BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - m2a_m0r39.mod",
    area: "m2a_m0a39",
  },
  readyProbe: {
    processId: 19012,
    startedAtUtc: "2026-07-24T15:09:29.1722743Z",
    responding: true,
    frameHwnd: 37225440,
    frameTitle: "BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - m2a_m0r39.mod",
    area: "m2a_m0a39",
    nwmainCount: 0,
    modalCount: 0,
  },
  hostState: {
    nwmainCount: 0,
    processes: [{
      pid: 19012,
      startedAtUtc: "2026-07-24T15:09:29.1722743Z",
      responding: true,
    }],
    windows: [{
      hwnd: 37225440,
      processId: 19012,
      className: "TfrmFrame",
      title: "BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - m2a_m0r39.mod",
      visible: true,
      iconic: false,
    }],
  },
};
assert.equal(
  validateToolsetOnlyVisibleReadyCleanupAdmission(toolsetOnlyVisibleR39Input).version,
  "aurora-model-proof-120s-toolset-only-visible-ready-cleanup-admission/v1",
);
for (const [mutate, expected] of [
  [(value) => { value.hostState.windows[0].visible = false; }, /cleanup_visible_frame_not_visible/u],
  [(value) => { value.readyProbe.modalCount = 1; }, /cleanup_visible_probe_modal_present/u],
  [(value) => { value.hostState.nwmainCount = 1; }, /cleanup_visible_nwmain_must_be_zero/u],
]) {
  const changed = structuredClone(toolsetOnlyVisibleR39Input);
  mutate(changed);
  assert.throws(() => validateToolsetOnlyVisibleReadyCleanupAdmission(changed), expected);
}

const hiddenCleanupAdmissionInput = {
  profileId: profile.id,
  profileSha256: hex("a"),
  moduleName: "contract.mod",
  areaResref: "contract_area",
  acceptedProof: {
    status: "verified",
    path: "C:\\proof\\live\\final-model-proof.accepted-at-123.json",
    sha256: hex("f"),
  },
  readySession: {
    processId: 700,
    startedAtUtc: "2026-07-22T10:00:00.1234567Z",
    frameHwnd: 900,
    frameTitle: "BioWare Aurora Neverwinter Nights Toolset v89 - contract.mod",
    area: "contract_area",
  },
  hostState: {
    nwmainCount: 0,
    processes: [{
      pid: 700,
      startedAtUtc: "2026-07-22T10:00:00.1234567Z",
      responding: true,
    }],
    windows: [
      {
        hwnd: 900,
        processId: 700,
        className: "TfrmFrame",
        title: "BioWare Aurora Neverwinter Nights Toolset v89 - contract.mod",
        visible: false,
        iconic: false,
      },
      {
        hwnd: 901,
        processId: 700,
        className: "TApplication",
        title: "BioWare Aurora Neverwinter Nights Toolset v89",
        visible: true,
        iconic: true,
      },
    ],
  },
};
assert.deepEqual(
  validatePostRuntimeHiddenToolsetCleanupAdmission(hiddenCleanupAdmissionInput),
  {
    version: "aurora-model-proof-120s-post-runtime-hidden-toolset-cleanup-admission/v1",
    profileId: profile.id,
    profileSha256: hex("a"),
    acceptedProof: hiddenCleanupAdmissionInput.acceptedProof,
    process: hiddenCleanupAdmissionInput.hostState.processes[0],
    frame: hiddenCleanupAdmissionInput.hostState.windows[0],
    application: hiddenCleanupAdmissionInput.hostState.windows[1],
    moduleName: "contract.mod",
    areaResref: "contract_area",
    nwmainCount: 0,
    gracefulFirst: true,
    forceFallbackRequiresExactIdentity: true,
  },
);
const hiddenCleanupWithLiveNwmainInput = structuredClone(hiddenCleanupAdmissionInput);
hiddenCleanupWithLiveNwmainInput.hostState.nwmainCount = 1;
hiddenCleanupWithLiveNwmainInput.nwmainAdmission = liveNwmainCleanupAdmission;
assert.deepEqual(
  validatePostRuntimeHiddenToolsetCleanupAdmission(hiddenCleanupWithLiveNwmainInput),
  {
    ...validatePostRuntimeHiddenToolsetCleanupAdmission(hiddenCleanupAdmissionInput),
    nwmainCount: 1,
    nwmainAdmission: liveNwmainCleanupAdmission,
  },
);
for (const [name, mutate, error] of [
  ["missing-accepted", (value) => { value.acceptedProof = null; }, /cleanup_hidden_accepted_proof_required/],
  ["wrong-pid", (value) => { value.hostState.processes[0].pid = 701; }, /cleanup_hidden_process_pid_drift/],
  ["wrong-start", (value) => { value.hostState.processes[0].startedAtUtc = "2026-07-22T10:00:01.1234567Z"; }, /cleanup_hidden_process_start_drift/],
  ["wrong-hwnd", (value) => { value.hostState.windows[0].hwnd = 902; }, /cleanup_hidden_frame_missing/],
  ["wrong-title", (value) => { value.hostState.windows[0].title = "BioWare Aurora Neverwinter Nights Toolset v89 - other.mod"; }, /cleanup_hidden_frame_title_drift/],
  ["dirty", (value) => { value.hostState.windows[0].title = `${value.readySession.frameTitle}*`; }, /cleanup_hidden_frame_dirty/],
  ["visible-frame", (value) => { value.hostState.windows[0].visible = true; }, /cleanup_hidden_frame_not_hidden/],
  ["modal", (value) => { value.hostState.windows.push({ hwnd: 903, processId: 700, className: "TdlgConfirm", title: "Save?", visible: true, iconic: false }); }, /cleanup_hidden_visible_modal/],
  ["second-toolset", (value) => { value.hostState.processes.push({ pid: 702, startedAtUtc: "2026-07-22T10:00:02.000Z", responding: true }); }, /cleanup_hidden_toolset_count_invalid/],
  ["nwmain", (value) => { value.hostState.nwmainCount = 1; }, /cleanup_hidden_nwmain_must_be_zero/],
  ["wrong-area", (value) => { value.readySession.area = "other_area"; }, /cleanup_hidden_ready_area_drift/],
  ["access-violation", (value) => { value.hostState.windows[1].title = "Access Violation"; }, /cleanup_hidden_access_violation/],
]) {
  const changed = structuredClone(hiddenCleanupAdmissionInput);
  mutate(changed);
  assert.throws(
    () => validatePostRuntimeHiddenToolsetCleanupAdmission(changed),
    error,
    name,
  );
}

const failedLaneRecoveryInput = {
  profileId: "failed-lane-profile",
  profileSha256: hex("a"),
  outputRoot: "C:\\proof\\failed",
  state: {
    version: "aurora-model-proof-120s-state/v1",
    profileId: "failed-lane-profile",
    profileSha256: hex("a"),
    status: "ready",
    dispatches: {},
    toolsetVerdict: null,
    runtimeVerdict: null,
    artifacts: {},
    ready: { path: "C:\\proof\\failed\\ready.json", sha256: hex("b") },
  },
  readyPacket: {
    command: "ready",
    status: "MODEL_PROOF_120S_READY",
    profileId: "failed-lane-profile",
    profileSha256: hex("a"),
    session: {
      processId: 700,
      startedAtUtc: "2026-07-24T14:09:56.2909611Z",
      responding: true,
      frameHwnd: 900,
      frameTitle: "BioWare Aurora Neverwinter Nights Toolset v89 - exact.mod",
      area: "exact_area",
      nwmainCount: 0,
      modalCount: 0,
    },
  },
  blocker: {
    version: "aurora-model-proof-120s-blocker/v1",
    code: "MODEL_PROOF_120S_LANE_FAILURE",
    failedCommand: "toolset",
    error: "MODEL_PROOF_120S_NOT_READY:output_root_exists:C:\\proof\\failed",
    visibility: { toolset: "not_tested", runtime: "not_tested" },
  },
  clock: {
    version: "aurora-model-proof-monotonic-clock/v1",
    source: "Windows.QueryPerformanceCounter",
    frequency: "10000000",
    startCounter: "100",
    deadlineCounter: "1200000100",
    hardLimitMs: 120000,
  },
  existingFiles: [
    "blocker.json",
    "ready.json",
    "run-clock.json",
    "state.json",
    "toolset\\caret-readback.json",
    "toolset\\selection-mode.json",
    "toolset\\tree-selection.json",
  ].map((relativePath) => ({ relativePath, sha256: hex("c"), byteLength: 1 })),
  hostSession: {
    processId: 700,
    startedAtUtc: "2026-07-24T14:09:56.2909611Z",
    responding: true,
    frameHwnd: 900,
    frameTitle: "BioWare Aurora Neverwinter Nights Toolset v89 - exact.mod",
    area: "exact_area",
    nwmainCount: 0,
    modalCount: 0,
  },
  nextAttempt: {
    profileId: "failed-lane-profile-attempt-2",
    profileSha256: hex("d"),
    profilePath: "C:\\proof\\attempt-2.json",
    outputRoot: "C:\\proof\\attempt-2",
    prepOutDir: "C:\\proof\\attempt-2-prep",
    outputRootAbsent: true,
    prepOutDirAbsent: true,
    candidateHashesMatch: true,
    distinctPaths: true,
    readySha256: hex("b"),
  },
};
assert.equal(
  validateFailedLaneRecoveryAdmission(failedLaneRecoveryInput).version,
  "aurora-model-proof-120s-failed-lane-recovery-admission/v1",
);
for (const [mutate, expected] of [
  [(value) => { value.state.dispatches.toolset = 1; }, /failed_lane_dispatch_present/u],
  [(value) => { value.hostSession.processId = 701; }, /failed_lane_toolset_pid_drift/u],
  [(value) => { value.nextAttempt.candidateHashesMatch = false; }, /failed_lane_next_candidate_drift/u],
]) {
  const changed = structuredClone(failedLaneRecoveryInput);
  mutate(changed);
  assert.throws(() => validateFailedLaneRecoveryAdmission(changed), expected);
}

const exactR39ReadyCandidateShape = {
  readyPacket: {
    module: {
      path: "C:\\Users\\enonw\\Documents\\Neverwinter Nights\\modules\\m2a_m0r39.mod",
      sha256: "d751b6a66c8887bae6f86402508e9b8385dbb99da110c40272bd435bf254fed1",
    },
    area: {
      resref: "m2a_m0a39",
      displayName: "Meshy2Aurora M0 binary vertical-slice area",
      entryPoint: [10, 10, 0],
    },
    fixture: {
      id: "m0_fixture",
      templateResRef: "nw_dwarfmerc001",
      treeObjectText: "Meshy M0 animated-donor fixture",
      occurrence: 0,
      appearanceRow: 15100,
      position: [10, 14.5, 0],
    },
  },
  profile: {
    installedModule: {
      path: "C:\\Users\\enonw\\Documents\\Neverwinter Nights\\modules\\m2a_m0r39.mod",
      sha256: "d751b6a66c8887bae6f86402508e9b8385dbb99da110c40272bd435bf254fed1",
      byteLength: 14729,
    },
    area: {
      resref: "m2a_m0a39",
      displayName: "Meshy2Aurora M0 binary vertical-slice area",
      entryPoint: [10, 10, 0],
    },
    fixture: {
      id: "m0_fixture",
      templateResRef: "nw_dwarfmerc001",
      treeObjectText: "Meshy M0 animated-donor fixture",
      occurrence: 0,
      appearanceRow: 15100,
      position: [10, 14.5, 0],
    },
  },
};
assert.equal(
  validateFailedLaneReadyCandidateBinding(exactR39ReadyCandidateShape).version,
  "aurora-model-proof-120s-failed-lane-ready-candidate-binding/v1",
);
for (const [mutate, expected] of [
  [(value) => { value.readyPacket.module.path = "C:\\wrong.mod"; }, /failed_lane_ready_module_path_drift/u],
  [(value) => { value.readyPacket.module.byteLength = 14729; }, /failed_lane_ready_module_shape_drift/u],
  [(value) => { value.readyPacket.area.resref = "wrong"; }, /failed_lane_ready_area_drift/u],
]) {
  const changed = structuredClone(exactR39ReadyCandidateShape);
  mutate(changed);
  assert.throws(() => validateFailedLaneReadyCandidateBinding(changed), expected);
}

const supersessionRoot = mkdtempSync(join(tmpdir(), "aurora-model-proof-route-supersession-"));
const supersessionRoutes = {
  timed: join(supersessionRoot, "timed-route.mjs"),
  cleanup: join(supersessionRoot, "cleanup-route.mjs"),
  coordinator: join(supersessionRoot, "coordinator.mjs"),
  contractTest: join(supersessionRoot, "contract-test.mjs"),
  compatibility: join(supersessionRoot, "compatibility.mjs"),
  continuation: join(supersessionRoot, "continuation.mjs"),
};
const writeCompat = (path, bytes) => writeFileSync(path, bytes);
const identity = (path) => ({
  path,
  sha256: createHash("sha256").update(readFileSync(path)).digest("hex"),
  byteLength: statSync(path).size,
});
writeCompat(supersessionRoutes.timed, "timed-v1\n");
writeCompat(supersessionRoutes.cleanup, "cleanup-final\n");
writeCompat(
  supersessionRoutes.coordinator,
  [
    'import { loadRouteManifestWithSupersession } from "./lib/aurora-model-proof-120s-route-manifest-supersession.mjs";',
    "const timed = 'unchanged';",
    "function loadContext(path) {",
    "  return loadRouteManifestWithSupersession(path);",
    "}",
    "",
    "function verifyImmutableInputs() { return timed; }",
    "",
  ].join("\n"),
);
writeCompat(supersessionRoutes.contractTest, "contract-final\n");
writeCompat(supersessionRoutes.compatibility, "compatibility-v1\n");
writeCompat(supersessionRoutes.continuation, "continuation-v1\n");
const historicalRoutes = [
  { path: supersessionRoutes.timed, sha256: createHash("sha256").update("timed-v1\n").digest("hex"), byteLength: Buffer.byteLength("timed-v1\n") },
  { path: supersessionRoutes.cleanup, sha256: createHash("sha256").update("cleanup-old\n").digest("hex"), byteLength: Buffer.byteLength("cleanup-old\n") },
  { path: supersessionRoutes.coordinator, sha256: createHash("sha256").update("coordinator-old\n").digest("hex"), byteLength: Buffer.byteLength("coordinator-old\n") },
  { path: supersessionRoutes.contractTest, sha256: createHash("sha256").update("contract-old\n").digest("hex"), byteLength: Buffer.byteLength("contract-old\n") },
];
const intermediateRoutes = [
  historicalRoutes[0],
  { path: supersessionRoutes.cleanup, sha256: createHash("sha256").update("cleanup-intermediate\n").digest("hex"), byteLength: Buffer.byteLength("cleanup-intermediate\n") },
  historicalRoutes[2],
  historicalRoutes[3],
];
const currentRoutes = [
  identity(supersessionRoutes.timed),
  identity(supersessionRoutes.cleanup),
  identity(supersessionRoutes.coordinator),
  identity(supersessionRoutes.contractTest),
  identity(supersessionRoutes.compatibility),
];
const historicalManifestPath = join(supersessionRoot, "historical.json");
const intermediateManifestPath = join(supersessionRoot, "intermediate.json");
const currentManifestPath = join(supersessionRoot, "current.json");
writeCompat(historicalManifestPath, `${JSON.stringify({ version: "aurora-model-proof-120s-route-manifest/v1", routes: historicalRoutes }, null, 2)}\n`);
writeCompat(intermediateManifestPath, `${JSON.stringify({ version: "aurora-model-proof-120s-route-manifest/v1", routes: intermediateRoutes }, null, 2)}\n`);
const historicalIdentity = identity(historicalManifestPath);
const intermediateIdentity = identity(intermediateManifestPath);
const coordinatorTimedDigest = modelProofTimedCoordinatorDigest(readFileSync(supersessionRoutes.coordinator, "utf8"));
const currentManifestFixture = {
  version: "aurora-model-proof-120s-route-manifest/v1",
  supersession: {
    version: "aurora-model-proof-120s-route-manifest-supersession/v1",
    from: historicalIdentity,
    intermediate: intermediateIdentity,
    cleanupChangedRoutes: [supersessionRoutes.cleanup],
    compatibilityChangedRoutes: [supersessionRoutes.cleanup, supersessionRoutes.coordinator, supersessionRoutes.contractTest],
    compatibilityAddedRoutes: [supersessionRoutes.compatibility],
    coordinatorSemanticLock: {
      routePath: supersessionRoutes.coordinator,
      mode: "model-proof-coordinator-excluding-route-manifest-load/v1",
      sha256: coordinatorTimedDigest,
    },
  },
  routes: currentRoutes,
};
writeCompat(currentManifestPath, `${JSON.stringify(currentManifestFixture, null, 2)}\n`);
const supersessionAdmission = loadRouteManifestWithSupersession({
  manifestPath: currentManifestPath,
  expectedSha256: historicalIdentity.sha256,
});
assert.equal(supersessionAdmission.admission.version, "aurora-model-proof-120s-route-manifest-supersession-admission/v1");
assert.equal(supersessionAdmission.admission.from.sha256, historicalIdentity.sha256);
assert.equal(supersessionAdmission.admission.intermediate.sha256, intermediateIdentity.sha256);
assert.equal(supersessionAdmission.admission.to.sha256, identity(currentManifestPath).sha256);
assert.equal(supersessionAdmission.admission.timedSemanticsUnchanged, true);
assert.equal(loadRouteManifestWithSupersession({
  manifestPath: currentManifestPath,
  expectedSha256: identity(currentManifestPath).sha256,
}).admission, null);

for (const [name, mutate, error] of [
  ["wrong-from", (value) => { value.supersession.from.sha256 = hex("f"); }, /route_manifest_supersession_from_identity_mismatch/],
  ["timed-route-drift", (value) => { value.routes[0].sha256 = hex("e"); }, /route_manifest_current_route_identity_drift/],
  ["unexpected-changed-route", (value) => { value.supersession.compatibilityChangedRoutes.push(supersessionRoutes.timed); }, /route_manifest_supersession_changed_set_mismatch/],
  ["unexpected-added-route", (value) => { value.supersession.compatibilityAddedRoutes = []; }, /route_manifest_supersession_added_set_mismatch/],
  ["coordinator-semantic-drift", (value) => { value.supersession.coordinatorSemanticLock.sha256 = hex("d"); }, /route_manifest_coordinator_semantic_drift/],
]) {
  const changedPath = join(supersessionRoot, `${name}.json`);
  const changed = structuredClone(currentManifestFixture);
  mutate(changed);
  writeCompat(changedPath, `${JSON.stringify(changed, null, 2)}\n`);
  assert.throws(() => loadRouteManifestWithSupersession({
    manifestPath: changedPath,
    expectedSha256: historicalIdentity.sha256,
  }), error);
}

const v2IntermediatePath = join(supersessionRoot, "v2-intermediate.json");
const v2CurrentPath = join(supersessionRoot, "v2-current.json");
writeCompat(v2IntermediatePath, `${JSON.stringify({
  version: "aurora-model-proof-120s-route-manifest/v1",
  routes: currentRoutes,
}, null, 2)}\n`);
const v2IntermediateIdentity = identity(v2IntermediatePath);
const v2CurrentFixture = {
  version: "aurora-model-proof-120s-route-manifest/v1",
  supersession: {
    version: "aurora-model-proof-120s-route-manifest-supersession/v2",
    from: historicalIdentity,
    transitions: [
      {
        to: intermediateIdentity,
        changedRoutes: [supersessionRoutes.cleanup],
        addedRoutes: [],
      },
      {
        to: v2IntermediateIdentity,
        changedRoutes: [supersessionRoutes.cleanup, supersessionRoutes.coordinator, supersessionRoutes.contractTest],
        addedRoutes: [supersessionRoutes.compatibility],
      },
      {
        toCurrent: true,
        changedRoutes: [],
        addedRoutes: [supersessionRoutes.continuation],
      },
    ],
    coordinatorSemanticLock: {
      routePath: supersessionRoutes.coordinator,
      mode: "model-proof-coordinator-excluding-route-manifest-load/v1",
      sha256: coordinatorTimedDigest,
    },
  },
  routes: [...currentRoutes, identity(supersessionRoutes.continuation)],
};
writeCompat(v2CurrentPath, `${JSON.stringify(v2CurrentFixture, null, 2)}\n`);
const v2Admission = loadRouteManifestWithSupersession({
  manifestPath: v2CurrentPath,
  expectedSha256: historicalIdentity.sha256,
});
assert.equal(v2Admission.admission.version, "aurora-model-proof-120s-route-manifest-supersession-admission/v2");
assert.equal(v2Admission.admission.transitions.length, 3);
assert.equal(v2Admission.admission.transitions[1].to.sha256, v2IntermediateIdentity.sha256);
assert.equal(v2Admission.admission.to.sha256, identity(v2CurrentPath).sha256);
assert.equal(v2Admission.admission.timedSemanticsUnchanged, true);

const v2IntermediateAdmission = loadRouteManifestWithSupersession({
  manifestPath: v2CurrentPath,
  expectedSha256: v2IntermediateIdentity.sha256,
});
assert.equal(v2IntermediateAdmission.admission.version, "aurora-model-proof-120s-route-manifest-supersession-admission/v2");
assert.equal(v2IntermediateAdmission.admission.from.sha256, v2IntermediateIdentity.sha256);
assert.equal(v2IntermediateAdmission.admission.transitions.length, 1);
assert.equal(v2IntermediateAdmission.admission.transitions[0].from.sha256, v2IntermediateIdentity.sha256);
assert.equal(v2IntermediateAdmission.admission.to.sha256, identity(v2CurrentPath).sha256);
assert.throws(() => loadRouteManifestWithSupersession({
  manifestPath: v2CurrentPath,
  expectedSha256: hex("a"),
}), /route_manifest_supersession_expected_hash_not_in_chain/);

for (const [name, mutate, error] of [
  ["v2-missing-transition", (value) => { value.supersession.transitions.splice(1, 1); }, /route_manifest_supersession_transition_1_added_set_mismatch/],
  ["v2-nonfinal-current", (value) => { value.supersession.transitions[0] = { ...value.supersession.transitions[0], toCurrent: true }; }, /route_manifest_supersession_transition_0_target_invalid/],
  ["v2-undeclared-added", (value) => { value.supersession.transitions[2].addedRoutes = []; }, /route_manifest_supersession_transition_2_added_set_mismatch/],
  ["v2-intermediate-identity", (value) => { value.supersession.transitions[1].to.sha256 = hex("b"); }, /route_manifest_supersession_transition_1_to_identity_mismatch/],
]) {
  const changedPath = join(supersessionRoot, `${name}.json`);
  const changed = structuredClone(v2CurrentFixture);
  mutate(changed);
  writeCompat(changedPath, `${JSON.stringify(changed, null, 2)}\n`);
  assert.throws(() => loadRouteManifestWithSupersession({
    manifestPath: changedPath,
    expectedSha256: historicalIdentity.sha256,
  }), error);
}

const v2IntermediateBadSuffixPath = join(supersessionRoot, "v2-intermediate-bad-suffix.json");
const v2IntermediateBadSuffix = structuredClone(v2CurrentFixture);
v2IntermediateBadSuffix.supersession.transitions[2].addedRoutes = [];
writeCompat(v2IntermediateBadSuffixPath, `${JSON.stringify(v2IntermediateBadSuffix, null, 2)}\n`);
assert.throws(() => loadRouteManifestWithSupersession({
  manifestPath: v2IntermediateBadSuffixPath,
  expectedSha256: v2IntermediateIdentity.sha256,
}), /route_manifest_supersession_transition_2_added_set_mismatch/);

const publishedRouteManifestPath = resolve(
  fileURLToPath(new URL(".", import.meta.url)),
  "..",
  "..",
  "skills",
  "aurora-model-proof-120s",
  "references",
  "route-manifest-v1.json",
);
const r33PinnedRouteAdmission = loadRouteManifestWithSupersession({
  manifestPath: publishedRouteManifestPath,
  expectedSha256: "2f381f5fefdda97a3248de9a757ab720b05cae8cc9748495ef23c674e38f3347",
});
assert.equal(r33PinnedRouteAdmission.admission.from.sha256, "2f381f5fefdda97a3248de9a757ab720b05cae8cc9748495ef23c674e38f3347");
assert.equal(r33PinnedRouteAdmission.admission.timedSemanticsUnchanged, true);
assert.equal(
  r33PinnedRouteAdmission.admission.coordinatorSemanticLock.sha256,
  "2d25dea2cf510b565bed79072fd496d5c10663d5f6a9856b2d68b00bacc2952b",
);

const fixtureRoot = mkdtempSync(join(tmpdir(), "aurora-model-proof-120s-"));
const binaryPath = join(fixtureRoot, "binary.json");
const toolsetPath = join(fixtureRoot, "toolset.json");
const runtimePath = join(fixtureRoot, "runtime.json");
const lineagePath = join(fixtureRoot, "lineage.json");
const routeManifestPath = join(fixtureRoot, "routes.json");
const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
const fileHash = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");

writeJson(lineagePath, { version: "contract-lineage/v1", status: "verified" });
writeJson(routeManifestPath, { version: "aurora-model-proof-120s-route-manifest/v1", routes: [] });

writeJson(binaryPath, {
  version: "aurora-toolset-binary-module-bootstrap-profile/v1",
  id: "contract-binary",
  module: { resref: "contract", path: "C:\\proof\\contract.mod", sha256: hex("d") },
  area: { resref: "contract_area", width: 2, height: 2 },
  entryPoint: { area: "contract_area", position: [10, 10, 0] },
  orderedHakList: [{ resref: "contract", path: "C:\\NWN\\hak\\contract.hak", sha256: hex("e") }],
  fixtures: [{ id: "fixture", templateResRef: "nw_dwarfmerc001", appearanceType: 15100, position: [10, 14.5, 0] }],
  noLocalToolsetAdapter: true,
});
writeJson(toolsetPath, {
  version: "aurora-toolset-binary-module-toolset-proof-profile/v1",
  id: "contract-toolset",
  binaryProfile: { path: binaryPath, sha256: fileHash(binaryPath) },
  fixtureSelection: { fixtureId: "fixture", treeObjectText: "Contract Fixture", occurrence: 0 },
  capture: { targetClass: "TScrollBox", allowUniformScene: false },
  noSave: true,
  noLocalToolsetAdapter: true,
});
writeJson(runtimePath, {
  version: "aur-s07-runtime-profile/v1",
  id: "contract-runtime",
  module: { sha256: hex("d"), area: "contract_area", entryPoint: [10, 10, 0] },
  orderedHakList: [{ resref: "contract", sha256: hex("e") }],
  geometryGate: { status: "verified", evidence: lineagePath },
  fixtures: [{ id: "fixture", resref: "contract_model", templateResRef: "nw_dwarfmerc001", appearanceRow: 15100, position: [10, 14.5, 0] }],
  launch: { mode: "user_owned_test_module_action", processName: "nwmain" },
  noLocalSubstitute: true,
});
const cliProfile = {
  ...profile,
  binaryProfile: { path: binaryPath, sha256: fileHash(binaryPath) },
  toolsetProfile: { path: toolsetPath, sha256: fileHash(toolsetPath) },
  runtimeProfile: { path: runtimePath, sha256: fileHash(runtimePath) },
  routeManifest: { path: routeManifestPath, sha256: fileHash(routeManifestPath) },
  outputRoot: join(fixtureRoot, "out"),
};
const cliProfilePath = join(fixtureRoot, "profile.json");
writeJson(cliProfilePath, cliProfile);
const cliPath = resolve("backend/scripts/aurora-model-proof-120s.mjs");
const coordinatorSource = readFileSync(cliPath, "utf8");
const toolsetCloseSource = readFileSync(resolve("backend/scripts/close-aurora-toolset-window-no-global-input.mjs"), "utf8");
assert.doesNotMatch(coordinatorSource, /slo:\s*\{[^}]*verified:\s*true/su);
assert.doesNotMatch(coordinatorSource, /Math\.max\(500,/u);
assert.match(coordinatorSource, /runtime-started/);
assert.match(coordinatorSource, /verifyResourcesFromOrderedHaks/);
assert.match(coordinatorSource, /runtime_observation_rejected/);
assert.match(coordinatorSource, /runtime_window_preparation_rejected/);
assert.match(coordinatorSource, /prepare-nwmain-proof-window-no-global-input\.mjs/);
assert.match(coordinatorSource, /windowPreparation:\s*\{\s*path:\s*windowPreparationPath/su);
assert.match(coordinatorSource, /windowSurfaceLease:\s*capture\.zOrderLease/u);
assert.match(coordinatorSource, /temporaryZOrderLease:\s*capture\.zOrderLease\.lifted/u);
assert.match(coordinatorSource, /zOrderRestored:\s*capture\.zOrderLease\.restore\.succeeded/u);
assert.match(coordinatorSource, /runtime_packet_zorder_lease_restore_drift/u);
assert.match(coordinatorSource, /status: "pending_qpc_acceptance"/);
assert.match(coordinatorSource, /final-model-proof\.accepted-at-/);
assert.match(coordinatorSource, /validatePublishedAcceptance/);
assert.match(coordinatorSource, /case "cleanup"/);
  assert.match(coordinatorSource, /case "cleanup-dry-run"/);
  assert.match(coordinatorSource, /case "recover-failed-lane-dry-run"/);
  assert.match(coordinatorSource, /case "recover-failed-lane"/);
assert.match(coordinatorSource, /validatePostRuntimeHiddenToolsetCleanupAdmission/);
assert.match(coordinatorSource, /validateAcceptedRuntimeNwmainCleanupAdmission/);
assert.match(coordinatorSource, /exact_live_runtime_admitted/);
assert.match(coordinatorSource, /cleanup_nwmain_closed_window_identity_drift/);
assert.match(coordinatorSource, /nwmainWindows/);
assert.match(coordinatorSource, /status: "already_closed"/);
assert.match(coordinatorSource, /--allowHiddenExactFrame", String\(allowHiddenExactFrame\)/);
assert.match(coordinatorSource, /close-or-terminate/);
assert.match(coordinatorSource, /cleanup\.json/);
assert.match(coordinatorSource, /preparationWelcomeDismiss:\s*resolve\(SCRIPT_DIR,\s*"close-aurora-toolset-dialog-no-global-input\.mjs"\)/u);
assert.doesNotMatch(coordinatorSource, /Stop-Process -Id \$expectedPid -Force/);
assert.match(toolsetCloseSource, /Stop-Process -Id \$expectedPid -Force/);
  assert.match(coordinatorSource, /cleanup_process_count_after_invalid/);
  assert.match(coordinatorSource, /failed-lane-recovery-plan\.json/);
  assert.match(coordinatorSource, /failed_lane_process_count_after_invalid/);
  assert.match(coordinatorSource, /zero_process_new_attempt_admitted/);
assert.doesNotMatch(
  coordinatorSource,
  /LIVE_COMMANDS\s*=\s*new Set\(\[[^\]]*"cleanup"/su,
  "cleanup must remain outside the 120-second LIVE_COMMANDS budget",
);
assert.match(toolsetCloseSource, /allowHiddenExactFrame/u);
assert.match(toolsetCloseSource, /hiddenExactFrame/u);
assert.match(toolsetCloseSource, /PostMessage\(\[IntPtr\]\$window\.hwnd,\s*\$WM_CLOSE/u);
assert.doesNotMatch(toolsetCloseSource, /ShowWindow|SetForegroundWindow|SetActiveWindow|BringWindowToTop/u);
const postProofCleanupLockMode = "model-proof-coordinator-excluding-route-manifest-load-and-post-proof-cleanup/v2";
const timedCoordinatorDigest = modelProofTimedCoordinatorDigest(coordinatorSource, postProofCleanupLockMode);
assert.equal(
  timedCoordinatorDigest,
  "2d25dea2cf510b565bed79072fd496d5c10663d5f6a9856b2d68b00bacc2952b",
  "post-proof cleanup additions must preserve the certified timed coordinator digest",
);
const cleanupOnlyMutation = coordinatorSource.replace(
  "cleanup_dry_run_unbound_nwmain_present",
  "cleanup_dry_run_unbound_nwmain_present_contract_mutation",
);
assert.notEqual(cleanupOnlyMutation, coordinatorSource);
assert.equal(
  modelProofTimedCoordinatorDigest(cleanupOnlyMutation, postProofCleanupLockMode),
  timedCoordinatorDigest,
  "post-proof cleanup implementation must be excluded from the timed semantic lock",
);
const timedMutation = coordinatorSource.replace(
  "runtime_window_preparation_rejected",
  "runtime_window_preparation_rejected_contract_mutation",
);
assert.notEqual(timedMutation, coordinatorSource);
assert.notEqual(
  modelProofTimedCoordinatorDigest(timedMutation, postProofCleanupLockMode),
  timedCoordinatorDigest,
  "a timed-run mutation must change the timed semantic lock",
);
assert.throws(
  () => modelProofTimedCoordinatorDigest(coordinatorSource, "unknown-lock-mode/v1"),
  /route_manifest_coordinator_semantic_lock_invalid/u,
);
const cli = spawnSync(process.execPath, [cliPath, "dry-run", "--profile", cliProfilePath], { encoding: "utf8" });
assert.equal(cli.status, 0, cli.stderr);
const cliPacket = JSON.parse(cli.stdout);
assert.equal(cliPacket.status, "model_proof_120s_plan_valid");
assert.equal(cliPacket.hardLimitMs, 120_000);
assert.equal(cliPacket.requiresProofReadySession, true);
assert.ok(cliPacket.publicCommands.includes("cleanup"));
  assert.ok(cliPacket.publicCommands.includes("cleanup-dry-run"));
  assert.ok(cliPacket.publicCommands.includes("recover-failed-lane-dry-run"));
  assert.ok(cliPacket.publicCommands.includes("recover-failed-lane"));
for (const route of cliPacket.ownedChildRoutes) {
  assert.doesNotMatch(route, /geometry-observe|focus|camera|save|build/iu);
}

if (process.env.AURORA_MODEL_PROOF_PREFLIGHT_ROUTE_REGRESSION !== "child") {
  const sourceModulePath = join(fixtureRoot, "contract.mod");
  const installedModulePath = join(fixtureRoot, "installed-contract.mod");
  const hakPath = join(fixtureRoot, "contract.hak");
  const mdlBytes = Buffer.from("contract mdl\n", "utf8");
  const tgaBytes = Buffer.from("contract tga\n", "utf8");
  const appearanceBytes = Buffer.from("2DA V2.0\n\n", "utf8");
  const moduleBytes = Buffer.from("offline preflight route-identity module\n", "utf8");
  const hakBytes = buildErf("HAK ", [
    { resref: "contract_model", type: 2002, bytes: mdlBytes },
    { resref: "contract_texture", type: 3, bytes: tgaBytes },
    { resref: "appearance", type: 2017, bytes: appearanceBytes },
  ]);
  writeFileSync(sourceModulePath, moduleBytes);
  writeFileSync(installedModulePath, moduleBytes);
  writeFileSync(hakPath, hakBytes);
  writeJson(binaryPath, {
    version: "aurora-toolset-binary-module-bootstrap-profile/v1",
    id: "contract-binary",
    module: { resref: "contract", path: sourceModulePath, sha256: fileHash(sourceModulePath) },
    area: { resref: "contract_area", width: 2, height: 2 },
    entryPoint: { area: "contract_area", position: [10, 10, 0] },
    orderedHakList: [{ resref: "contract", path: hakPath, sha256: fileHash(hakPath) }],
    fixtures: [{ id: "fixture", templateResRef: "nw_dwarfmerc001", appearanceType: 15100, position: [10, 14.5, 0] }],
    noLocalToolsetAdapter: true,
  });
  writeJson(toolsetPath, {
    version: "aurora-toolset-binary-module-toolset-proof-profile/v1",
    id: "contract-toolset",
    binaryProfile: { path: binaryPath, sha256: fileHash(binaryPath) },
    fixtureSelection: { fixtureId: "fixture", treeObjectText: "Contract Fixture", occurrence: 0 },
    capture: { targetClass: "TScrollBox", allowUniformScene: false },
    noSave: true,
    noLocalToolsetAdapter: true,
  });
  writeJson(runtimePath, {
    version: "aur-s07-runtime-profile/v1",
    id: "contract-runtime",
    module: { sha256: fileHash(installedModulePath), area: "contract_area", entryPoint: [10, 10, 0] },
    orderedHakList: [{ resref: "contract", sha256: fileHash(hakPath) }],
    geometryGate: { status: "verified", evidence: lineagePath },
    fixtures: [{ id: "fixture", resref: "contract_model", templateResRef: "nw_dwarfmerc001", appearanceRow: 15100, position: [10, 14.5, 0] }],
    launch: { mode: "user_owned_test_module_action", processName: "nwmain" },
    noLocalSubstitute: true,
  });
  const publishedPreflightProfilePath = join(fixtureRoot, "published-preflight-profile.json");
  writeJson(publishedPreflightProfilePath, {
    ...profile,
    binaryProfile: { path: binaryPath, sha256: fileHash(binaryPath) },
    toolsetProfile: { path: toolsetPath, sha256: fileHash(toolsetPath) },
    runtimeProfile: { path: runtimePath, sha256: fileHash(runtimePath) },
    routeManifest: {
      path: publishedRouteManifestPath,
      sha256: "41ea27ff899a65eae34a101c00739e402c09dfa6bb918e7b21a59d34b3f341ae",
    },
    installedModule: {
      path: installedModulePath,
      sha256: fileHash(installedModulePath),
      byteLength: statSync(installedModulePath).size,
    },
    orderedHakList: [{
      resref: "contract",
      path: hakPath,
      sha256: fileHash(hakPath),
      byteLength: statSync(hakPath).size,
    }],
    resources: {
      mdl: { resref: "contract_model", sha256: createHash("sha256").update(mdlBytes).digest("hex") },
      tga: { resref: "contract_texture", sha256: createHash("sha256").update(tgaBytes).digest("hex") },
      appearance2da: { resref: "appearance", row: 15100, sha256: createHash("sha256").update(appearanceBytes).digest("hex") },
    },
    outputRoot: join(fixtureRoot, "published-preflight-out"),
  });
  const publicPreflight = spawnSync(process.execPath, [
    cliPath,
    "preflight",
    "--profile", publishedPreflightProfilePath,
  ], {
    encoding: "utf8",
    windowsHide: true,
    timeout: 120_000,
    env: { ...process.env, AURORA_MODEL_PROOF_PREFLIGHT_ROUTE_REGRESSION: "child" },
  });
  const publicPreflightOutput = `${publicPreflight.stdout}\n${publicPreflight.stderr}`;
  assert.notEqual(publicPreflight.status, 0, "dummy MOD must stop only after published route identity admission");
  assert.doesNotMatch(publicPreflightOutput, /route_manifest_identity_set_mismatch/u);
  assert.match(publicPreflightOutput, /bootstrap_area_module_index_missing/u);
}

console.log(JSON.stringify({ ok: true, status: "aurora_model_proof_120s_contract_valid" }));

function buildErf(signature, entries) {
  const headerSize = 160;
  const keyOffset = headerSize;
  const resourceOffset = keyOffset + entries.length * 24;
  const payloadOffset = resourceOffset + entries.length * 8;
  const totalLength = payloadOffset + entries.reduce((sum, entry) => sum + entry.bytes.length, 0);
  const output = Buffer.alloc(totalLength);
  output.write(signature, 0, "ascii");
  output.write("V1.0", 4, "ascii");
  output.writeUInt32LE(entries.length, 16);
  output.writeUInt32LE(keyOffset, 24);
  output.writeUInt32LE(resourceOffset, 28);
  let payloadCursor = payloadOffset;
  for (const [index, entry] of entries.entries()) {
    const key = keyOffset + index * 24;
    output.write(entry.resref, key, 16, "ascii");
    output.writeUInt32LE(index, key + 16);
    output.writeUInt16LE(entry.type, key + 20);
    output.writeUInt32LE(payloadCursor, resourceOffset + index * 8);
    output.writeUInt32LE(entry.bytes.length, resourceOffset + index * 8 + 4);
    entry.bytes.copy(output, payloadCursor);
    payloadCursor += entry.bytes.length;
  }
  return output;
}
