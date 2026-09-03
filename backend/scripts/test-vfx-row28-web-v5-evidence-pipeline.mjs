#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "../..");
const validator = resolve(root, "backend/scripts/validate-vfx-row28-web-v5.py");
const validatorV6 = resolve(root, "backend/scripts/validate-vfx-row28-web-v6.py");
const comparison = resolve(
  root,
  "backend/scripts/create-vfx-row28-native-comparison-v5.py"
);
const profileGenerator = resolve(
  root,
  "backend/scripts/create-vfx-web-proof-profile.mjs"
);
const fixtureGenerator = resolve(
  root,
  "backend/scripts/create-vfx-nwn-web-row28-fixture.ts"
);
const python =
  process.env.AURORA_PROOF_PYTHON ??
  "C:/Users/enonw/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe";

const validatorSource = readFileSync(validator, "utf8");
for (const token of [
  "positive-delta-luma-mean-from-frame-zero-baseline",
  "timing.get(\"playbackRate\")",
  "timing.get(\"playbackDelaySeconds\")",
  "timing.get(\"method\")",
  "TIMING_TOLERANCE_SECONDS = 1.0 / FPS",
  "PEAK_PHASE_TOLERANCE_SECONDS = 0.5",
  "pass-legacy-automated-visual-and-timing-gates",
  '"visualClassificationRequired": True',
  "retailPixelParityClaimAllowed\": False",
  "startsNwn\": False",
  "startsWebRuntime\": False"
]) {
  assert.ok(validatorSource.includes(token), `missing row28 v5 validator token: ${token}`);
}

const fixtureGeneratorSource = readFileSync(fixtureGenerator, "utf8");
for (const token of [
  "RETAIL_PROOF_SIMULATION_STEP_SECONDS = 1 / 60",
  "PROOF_SERIALIZED_FRAME_STRIDE = 2",
  "simulationStepEvidence",
  "sampleRuntimeFrames",
  "runtimePlaybackRate: 1",
  "runtimePlaybackDelaySeconds: 0",
  '"retail-client-source-animation-rate"',
  "nativeTriggerRelativeOnsetSeconds: 1",
  "nativeTriggerRelativeLastVisibleSeconds: 3",
  "sourceOnsetSeconds: 871 / 1728",
  "sourceDynamicPeakSeconds: 589 / 432",
  "sourceLastVisibleSeconds: 11147 / 3456"
]) {
  assert.ok(
    fixtureGeneratorSource.includes(token),
    `missing row28 60 Hz fixture token: ${token}`
  );
}
assert.equal(
  fixtureGeneratorSource.includes(
    "const dtSeconds = animationLengthSeconds / animationTickCount"
  ),
  false,
  "row28 proof simulation must not derive its runtime step from a 30 Hz MDL timeline"
);
const comparisonSource = readFileSync(comparison, "utf8");
for (const token of [
  "retail-client-rate-backed-source-event-trigger-alignment-no-independent-onset-shift",
  "NWN_TRIGGER_VIDEO_SECONDS = 49.0 / 12.0",
  "RELATIVE_SAMPLES = [-0.5, 0.0, 0.5, 1.0, 4.0 / 3.0, 5.0 / 3.0, 2.0, 3.0, 3.5]",
  "nwn-row28-meteor-swarm-one-trigger-v8.mp4",
  "pass-automated-source-clock-visual-anchor-and-runtime-gates",
  "requires-human-frame-classification",
  "UNCLASSIFIED AUTOMATED COMPARISON",
  "exactPixelIdentityClaimed\": False",
  "requiresAcceptedWebV6Validation\": True",
  "startsNwn\": False",
  "startsWebRuntime\": False"
]) {
  assert.ok(comparisonSource.includes(token), `missing row28 v5 comparison token: ${token}`);
}

const validatorV6Source = readFileSync(validatorV6, "utf8");
for (const token of [
  '"calibration-v18-client-animation-rate"',
  '"source-aligned-playback-calibration-summary.json"',
  "def analyze_frames_with_native_lifecycle_metric",
  "saturated-bright-pixel-count(max>=245,channel-range>=35)",
  'native_timing = timing_calibration["immutableNwnOracle"]',
  'native_onset = float(native_timing["nativeOnsetRelativeSeconds"])',
  'native_peak = float(native_timing["nativePeakRelativeSeconds"])',
  'native_last = float(native_timing["nativeLastVisibleRelativeSeconds"])',
  'native_duration = float(native_timing["nativeVisibleDurationSeconds"])',
  '"status": "pass-automated-source-clock-visual-anchor-and-runtime-gates"',
  '"visualClassificationRequired": True',
  '"status": "requires-human-frame-classification"'
]) {
  assert.ok(validatorV6Source.includes(token), `missing row28 v6 validator token: ${token}`);
}
for (const rejectedToken of [
  '"calibration-v7-retail-profile"',
  '"retail-profile-calibration-summary.json"',
  '"calibration-v6-source-time"',
  '"source-time-calibration-summary.json"',
  '"status": "pass-very-close-native-visual-and-timing-profile"',
  "positive-delta-luma-mean-from-frame-zero-baseline\",\n        \"onset\""
]) {
  assert.equal(
    validatorV6Source.includes(rejectedToken),
    false,
    `stale row28 v6 validator token remains: ${rejectedToken}`
  );
}

const profileGeneratorSource = readFileSync(profileGenerator, "utf8");
for (const token of [
  'record.path.includes("/calibration-v5/")',
  'record.path.includes("/calibration-v7-retail-profile/")',
  'record.path.includes("/calibration-v8-native-lifecycle/")',
  'record.path.includes("/calibration-v18-client-animation-rate/")',
  "calibration-v18-client-animation-rate/source-aligned-playback-calibration-summary.json",
  "calibration-v18-client-animation-rate/client-animation-playback-audit.json",
  "const nativeOracleCalibration",
  "runtimePlaybackRate: nativeOracleCalibration.runtimePlaybackRate",
  "runtimePlaybackDelaySeconds: nativeOracleCalibration.runtimePlaybackDelaySeconds",
  "timingStatus: \"retail-client-source-rate-and-source-event-aligned-native-trigger\""
]) {
  assert.ok(
    profileGeneratorSource.includes(token),
    `missing row28 proof-profile calibration token: ${token}`
  );
}

for (const staleClaim of [
  "very-close calibrated profile",
  '"parity": "very-close-profile-calibrated"'
]) {
  assert.equal(
    comparisonSource.includes(staleClaim),
    false,
    `comparison must not pre-classify the fresh visual result: ${staleClaim}`
  );
}

for (const [script, expectedStatus] of [
  [validator, "row28_web_v5_validation_plan_valid"],
  [validatorV6, "row28_web_v6_validation_plan_valid"],
  [comparison, "row28_v5_native_comparison_plan_valid"]
]) {
  const run = spawnSync(python, [script, "dry-run"], {
    cwd: root,
    encoding: "utf8"
  });
  assert.equal(run.status, 0, run.stderr);
  const result = JSON.parse(run.stdout);
  assert.equal(result.status, expectedStatus);
  assert.equal(result.startsNwn, false);
  assert.equal(result.startsWebRuntime, false);
  assert.equal(result.requiresExplicitInputHashes, true);
}

console.log(
  JSON.stringify({
    ok: true,
    status: "row28_web_v5_evidence_pipeline_contract_valid",
    startsNwn: false,
    startsWebRuntime: false
  })
);
