#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const runner = resolve("backend/scripts/aur-s07-runtime-execution.mjs");
const dir = mkdtempSync(join(tmpdir(), "aur-s07-runtime-"));
try {
  const hash = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
  const geometryGatePath = join(dir, "geometry-gate.json");
  writeFileSync(geometryGatePath, JSON.stringify({ status: "verified" }));
  const profile = {
    version: "aur-s07-runtime-profile/v1", id: "test-runtime-v1",
    module: { sha256: "a".repeat(64), area: "proof_area", entryPoint: [5, 5] },
    orderedHakList: [{ resref: "proof_hak", sha256: "b".repeat(64) }],
    geometryGate: {
      status: "verified",
      artifact: geometryGatePath,
      sha256: hash(geometryGatePath)
    },
    fixtures: [{ id: "model", resref: "model_resref", position: [10, 10] }],
    launch: { mode: "user_owned_test_module_action", processName: "nwmain" },
  };
  const profilePath = join(dir, "profile.json"); writeFileSync(profilePath, JSON.stringify(profile));
  const plan = runJson([runner, "dry-run", "--profile", profilePath, "--outDir", dir]);
  assert.equal(plan.ok, true); assert.equal(plan.launch.mode, "user_owned_test_module_action");
  const vanillaProfilePath = join(dir, "vanilla-profile.json");
  writeFileSync(vanillaProfilePath, JSON.stringify({ ...profile, id: "test-vanilla-runtime-v1", orderedHakList: [] }));
  const vanillaPlan = runJson([runner, "dry-run", "--profile", vanillaProfilePath, "--outDir", join(dir, "vanilla-out")]);
  assert.equal(vanillaPlan.ok, true); assert.equal(vanillaPlan.profileId, "test-vanilla-runtime-v1");
  const invalidHakProfilePath = join(dir, "invalid-hak-profile.json");
  writeFileSync(invalidHakProfilePath, JSON.stringify({ ...profile, id: "test-invalid-hak-runtime-v1", orderedHakList: null }));
  assert.throws(
    () => runJson([runner, "dry-run", "--profile", invalidHakProfilePath, "--outDir", join(dir, "invalid-hak-out")]),
    /runtime_profile_fixture_or_hak_invalid/u
  );
  const staleGeometryProfilePath = join(dir, "stale-geometry-profile.json");
  writeFileSync(staleGeometryProfilePath, JSON.stringify({
    ...profile,
    id: "test-stale-geometry-runtime-v1",
    geometryGate: { ...profile.geometryGate, sha256: "0".repeat(64) }
  }));
  assert.throws(
    () => runJson([runner, "dry-run", "--profile", staleGeometryProfilePath, "--outDir", join(dir, "stale-geometry-out")]),
    /area_geometry_gate_hash_mismatch/u
  );
  const request = runJson([runner, "arm", "--profile", profilePath, "--outDir", dir]);
  assert.equal(request.ok, true); assert.equal(request.startsNwn, false);
  const capture = join(dir, "runtime.png"), log = join(dir, "nwn.log"), observation = join(dir, "runtime-observation.json");
  writeFileSync(capture, "visible model pixels"); writeFileSync(log, "module loaded"); writeFileSync(observation, JSON.stringify({ version: "aur-s07-runtime-observation/v1", profileId: profile.id, process: { name: "nwmain", pid: 123 }, moduleSha256: profile.module.sha256, area: profile.module.area, entryPoint: profile.module.entryPoint }));
  const packet = { version: "aur-s07-runtime-packet/v1", profileId: profile.id, moduleSha256: profile.module.sha256, area: profile.module.area, entryPoint: profile.module.entryPoint, fixtures: profile.fixtures, modelVisibility: { status: "visible", blank: false, placeholder: false }, artifacts: [{ kind: "runtime-observation", path: observation, sha256: hash(observation) }, { kind: "runtime-capture", path: capture, sha256: hash(capture) }, { kind: "engine-load-log", path: log, sha256: hash(log) }] };
  const packetPath = join(dir, "packet.json"); writeFileSync(packetPath, JSON.stringify(packet));
  assert.equal(runJson([runner, "validate", "--profile", profilePath, "--packet", packetPath]).status, "verified");
  packet.modelVisibility.blank = true; writeFileSync(packetPath, JSON.stringify(packet));
  const rejected = runJson([runner, "validate", "--profile", profilePath, "--packet", packetPath]);
  assert.equal(rejected.status, "failed"); assert.match(rejected.failures.join(" "), /runtime_model_blank_or_placeholder/);
  packet.modelVisibility.blank = false; packet.area = "wrong_area"; writeFileSync(packetPath, JSON.stringify(packet));
  const wrongArea = runJson([runner, "validate", "--profile", profilePath, "--packet", packetPath]);
  assert.equal(wrongArea.status, "failed"); assert.match(wrongArea.failures.join(" "), /runtime_packet_target_mismatch/);

  const modulePath = join(dir, "central.mod"), hakPath = join(dir, "central.hak");
  writeFileSync(modulePath, "immutable module"); writeFileSync(hakPath, "immutable hak");
  const centralDir = join(dir, "central-out");
  const engineLogPath = join(dir, "nwclientLog1.txt");
  writeFileSync(engineLogPath, "historical log line\n");
  const centralProfile = {
    ...profile,
    id: "test-central-runtime-v1",
    module: { ...profile.module, path: modulePath, sha256: hash(modulePath) },
    orderedHakList: [{ resref: "proof_hak", path: hakPath, sha256: hash(hakPath) }],
    launch: { mode: "central_guarded_test_module_action", processName: "nwmain" },
    engineLog: {
      path: engineLogPath,
      loadingModuleResref: "central",
      requiredTokens: ["AURORA_PATH_CONNECT_COMPLETE failures=0"],
    },
    evidencePolicy: {
      version: "aur-s07-runtime-evidence-policy/v1",
      minimumCaptureDurationSeconds: 8,
      requiredArtifactKinds: [
        "runtime-observation",
        "runtime-capture",
        "runtime-capture-metadata",
        "engine-load-log",
        "engine-load-log-metadata",
        "runtime-visual-review",
      ],
    },
  };
  const centralProfilePath = join(dir, "central-profile.json"); writeFileSync(centralProfilePath, JSON.stringify(centralProfile));
  const centralPlan = runJson([runner, "dry-run", "--profile", centralProfilePath, "--outDir", centralDir]);
  assert.equal(centralPlan.launch.mode, "central_guarded_test_module_action"); assert.equal(centralPlan.startsNwn, false); assert.equal(centralPlan.usesGlobalInput, false);
  const centralArm = runJson([runner, "arm", "--profile", centralProfilePath, "--outDir", centralDir]);
  assert.equal(centralArm.startsNwn, false); assert.equal(centralArm.usesGlobalInput, false);
  const armed = JSON.parse(readFileSync(join(centralDir, "aur-s07-runtime-launch-request.json"), "utf8"));
  assert.equal(armed.action, "central_guarded_test_module_action"); assert.match(armed.dispatchCommand, /dispatch-test-module/u); assert.equal(armed.modulePath, modulePath);
  assert.equal(armed.profileSha256, hash(centralProfilePath));
  assert.throws(() => runJson([runner, "arm", "--profile", centralProfilePath, "--outDir", centralDir]), /runtime_launch_request_already_exists/u);

  const baselineResult = runJson([runner, "baseline-engine-log", "--profile", centralProfilePath, "--outDir", centralDir]);
  assert.equal(baselineResult.status, "recorded");
  assert.equal(baselineResult.sourcePath, engineLogPath);
  const observationPath = join(centralDir, "aur-s07-runtime-observation.json");
  const processIdentity = { name: "nwmain", pid: 321, startedAt: new Date(Date.now() + 250).toISOString() };
  writeFileSync(observationPath, JSON.stringify({
    version: "aur-s07-runtime-observation/v1",
    observedAt: new Date().toISOString(),
    profileId: centralProfile.id,
    profileSha256: hash(centralProfilePath),
    process: processIdentity,
    moduleSha256: centralProfile.module.sha256,
    area: centralProfile.module.area,
    entryPoint: centralProfile.module.entryPoint,
  }));
  appendFileSync(engineLogPath, "[test] Loading Module: central\n[test] AURORA_PATH_CONNECT_COMPLETE failures=0\n");
  const freshTimestamp = new Date(Date.now() + 2_000);
  utimesSync(engineLogPath, freshTimestamp, freshTimestamp);
  const logCapture = runJson([runner, "capture-engine-log", "--profile", centralProfilePath, "--outDir", centralDir, "--timeoutMs", "2000"]);
  assert.equal(logCapture.status, "captured");
  assert.equal(existsSync(logCapture.windowPath), true);
  assert.match(readFileSync(logCapture.windowPath, "utf8"), /Loading Module: central/u);
  assert.match(readFileSync(logCapture.windowPath, "utf8"), /AURORA_PATH_CONNECT_COMPLETE failures=0/u);

  const runtimeCapturePath = join(centralDir, "aur-s07-runtime-capture.mp4");
  writeFileSync(runtimeCapturePath, Buffer.alloc(12_000, 7));
  const captureResultPath = join(centralDir, "aur-s07-runtime-capture.json");
  writeFileSync(captureResultPath, JSON.stringify({
    version: "aurora-nwmain-proof-video-capture/v1",
    ok: true,
    status: "verified",
    process: { ...processIdentity, startedAtUtc: processIdentity.startedAt, hwnd: 7001, responding: true },
    capture: {
      source: "physical desktop pixels clipped to the exact owned nwmain client area",
      path: runtimeCapturePath,
      sha256: hash(runtimeCapturePath),
      sizeBytes: readFileSync(runtimeCapturePath).byteLength,
      width: 1280,
      height: 720,
      fps: 12,
      requestedDurationSeconds: 10,
      startedAt: new Date().toISOString(),
      finishedAt: new Date(Date.now() + 10_000).toISOString(),
      validation: { decode: "verified", codec: "h264", faststart: true },
    },
    monitor: { deviceName: "\\\\.\\DISPLAY1", primary: false },
    identityObservation: { allStable: true, allProbePointsOwnedByNwmain: true },
    safety: { startsNwn: false, usesGlobalInput: false, changesZOrder: false, activatesWindow: false },
  }));
  const visualReview = runJson([runner, "record-visual-review", "--profile", centralProfilePath, "--outDir", centralDir, "--captureResult", captureResultPath, "--modelVisibility", "visible", "--blank", "false", "--placeholder", "false", "--notes", "contract fixture reviewed"]);
  assert.equal(visualReview.status, "accepted");
  const assembled = runJson([runner, "assemble-packet", "--profile", centralProfilePath, "--outDir", centralDir, "--captureResult", captureResultPath]);
  assert.equal(assembled.status, "verified");
  assert.equal(existsSync(assembled.packetPath), true);
  const assembledPacket = JSON.parse(readFileSync(assembled.packetPath, "utf8"));
  assert.deepEqual(assembledPacket.artifacts.map((artifact) => artifact.kind), centralProfile.evidencePolicy.requiredArtifactKinds);
  assert.equal(runJson([runner, "validate", "--profile", centralProfilePath, "--packet", assembled.packetPath]).status, "verified");
  assembledPacket.artifacts.find((artifact) => artifact.kind === "runtime-capture-metadata").sha256 = "0".repeat(64);
  const tamperedPacketPath = join(centralDir, "tampered-packet.json");
  writeFileSync(tamperedPacketPath, JSON.stringify(assembledPacket));
  const metadataRejected = runJson([runner, "validate", "--profile", centralProfilePath, "--packet", tamperedPacketPath]);
  assert.equal(metadataRejected.status, "failed");
  assert.match(metadataRejected.failures.join(" "), /runtime_artifact_hash_mismatch:runtime-capture-metadata/u);

  const source = readFileSync(runner, "utf8");
  assert.match(source, /aurora-toolset-test-module-nonblocking\.mjs/u);
  assert.match(source, /restore-aurora-toolset-frame-noactivate\.mjs/u);
  assert.match(source, /--ensureNonPrimary",\s*"true/u);
  assert.match(source, /activatesFrame\s*!==\s*false/u);
  assert.match(source, /startsNwnDirectly:\s*false/u);
  assert.match(source, /selectFreshLogSlice/u);
  assert.match(source, /baseline-engine-log/u);
  assert.match(source, /capture-engine-log/u);
  assert.match(source, /record-visual-review/u);
  assert.match(source, /assemble-packet/u);
  assert.match(source, /mainWindowHandle/u);
  assert.match(source, /runtime_process_window_not_ready/u);
  assert.doesNotMatch(source, /Start-Process\s+.*nwmain/iu);
  const restoreSource = readFileSync(resolve("backend/scripts/restore-aurora-toolset-frame-noactivate.mjs"), "utf8");
  assert.match(restoreSource, /SW_SHOWNOACTIVATE/u); assert.match(restoreSource, /expected_one_nonprimary_screen/u); assert.match(restoreSource, /0x0014/u);
  assert.doesNotMatch(restoreSource, /SetForegroundWindow|BringWindowToTop|SendInput|SetCursorPos/u);
} finally { rmSync(dir, { recursive: true, force: true }); }

function runJson(args) { return JSON.parse(execFileSync(process.execPath, args, { encoding: "utf8" })); }
