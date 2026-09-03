import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const PROFILE_PATH = path.join(
  REPO_ROOT,
  "backend/docs/aurora-reverse/evidence/vfx-nwn-web-row28/proof-profile-v8.json"
);
const profile = JSON.parse(fs.readFileSync(PROFILE_PATH, "utf8"));

assert.equal(profile.version, "aurora-vfx-proof-profile/v8");
assert.equal(profile.profileId, "vfx-nwn-web-row28-web-proof-v8");
assert.equal(profile.fixtureId, "vfx-nwn-web-row28");
assert.equal(profile.proofCompleteness, "missing-awaiting-fresh-capture");
verifyRecord(profile.supersedes);
for (const attempt of profile.rejectedCaptureAttempts ?? []) verifyRecord(attempt);
assert.equal(profile.rejectedCaptureAttempts?.length, 2);

for (const key of [
  "fixtureInputs",
  "runtimeSourceInputs",
  "immutableNativeOracle",
  "calibrationInputs",
  "captureToolchain",
  "postCaptureToolchain"
]) {
  assert.ok(Array.isArray(profile[key]) && profile[key].length > 0, `${key} must be non-empty`);
  for (const record of profile[key]) verifyRecord(record);
}
verifyRecord(profile.validator);

assert.deepEqual(profile.sourceIdentity, {
  rowId: 28,
  sourceLabel: "VFX_FNF_METEOR_SWEARM",
  publicConstant: "VFX_FNF_METEOR_SWARM",
  sourceModel: "vff_rainmeteor",
  sourceModelSha256: "ea57f0346166314602d9d473873cedde791f9911ef90722c114481a0b6ebf29b"
});
assert.equal(profile.calibration?.additiveParticleRadianceScale, 14);
assert.equal(profile.calibration?.bloomMultiplier, 2);
assert.deepEqual(profile.calibration?.effectOriginAlignmentAuroraXyz, [1.25, 3.55, 0]);
assert.equal(profile.calibration?.runtimePlaybackRate, 5 / 3);
assert.equal(profile.calibration?.runtimePlaybackDelaySeconds, 2 / 15);
assert.equal(profile.calibration?.predictedVisibleDurationSeconds, 2);
assert.equal(profile.calibration?.globalAuroraTimingClaim, false);

const expectedDigest =
  "sha256:30b324755392678d80276b971a3df9815283cee23ea546b650bbba6e3d2098f6";
assert.equal(profile.runtimeBuildIdentity?.frontendImageDigest, expectedDigest);
assert.equal(profile.runtimeBuildIdentity?.backendImageDigest, expectedDigest);
assert.match(expectedDigest, /^sha256:[0-9a-f]{64}$/u);
assert.equal(
  profile.runtimeBuildIdentity?.token,
  "worktree-348e8ff0e27677b7c611c56afa4d706685b393f0-row28-final-v5d"
);
assert.equal(profile.runtimeBuildIdentity?.frontendPort, 5173);
assert.equal(profile.runtimeBuildIdentity?.backendPort, 3000);

assert.deepEqual(profile.resourceSafety, {
  backendFamilyLimit: 1,
  frontendFamilyLimit: 1,
  captureFamilyLimit: 1,
  managedNodeHeapLimitMb: 1024,
  chromeRendererProcessLimit: 2,
  captureLock: "repository-global-proof-capture-lock",
  directChromeLaunchAllowed: false,
  ownedProcessTreeCleanupRequired: true
});
assert.deepEqual(profile.captureStagingPolicy, {
  stagingRoot: "os-temporary-directory",
  workingTreeWritesBeforeProofGate: false,
  publishAfterProofGate: true,
  cleanupAlways: true
});

assert.equal(profile.singlePlayback?.authorization, "explicit-user-resume-current-goal");
assert.equal(profile.singlePlayback?.captureTag, "v5d");
assert.equal(profile.singlePlayback?.fps, 12);
assert.equal(profile.singlePlayback?.durationMs, 9000);
assert.equal(profile.singlePlayback?.capturePort, 9786);
assert.deepEqual(profile.singlePlayback?.expectedViewport, { width: 1460, height: 810 });
assert.equal(profile.singlePlayback?.intentionalTriggerCount, 1);
assert.equal(profile.singlePlayback?.automaticRetry, false);
assert.equal(profile.singlePlayback?.loop, false);
assert.equal(profile.singlePlayback?.diagnostics, false);
assert.equal(profile.singlePlayback?.captureMethod, "direct-cdp-Page.captureScreenshot");
assert.equal(profile.singlePlayback?.allowPartialEvidence, false);
assert.equal(profile.singlePlayback?.screencastFallbackAllowed, false);

assert.equal(profile.acceptance?.runtimeObservabilityVersion, "aurora-vfx-runtime-observability/v1");
assert.equal(profile.acceptance?.nativeOnsetToleranceSeconds, 1 / 12);
assert.equal(profile.acceptance?.nativeLastVisibleToleranceSeconds, 1 / 12);
assert.equal(profile.acceptance?.nativeVisibleDurationToleranceSeconds, 1 / 12);
assert.equal(profile.acceptance?.nativePeakPhaseToleranceSeconds, 0.5);
assert.equal(profile.acceptance?.retailPixelParityClaimAllowed, false);

const expectedOutputs = profile.singlePlayback?.expectedOutputs ?? [];
assert.equal(expectedOutputs.length, 5);
for (const relativePath of expectedOutputs) {
  assert.equal(
    fs.existsSync(path.resolve(REPO_ROOT, relativePath)),
    false,
    `Pre-capture output exists: ${relativePath}`
  );
}

assert.equal(profile.retailOracle?.status, "verified-immutable-native-runtime-oracle");
assert.equal(profile.retailOracle?.captureAuthorized, false);
assert.equal(profile.retailOracle?.nativeRelaunchAllowed, false);
assert.equal(profile.retailOracle?.oneTriggerVerified, true);

const harness = fs.readFileSync(path.resolve(REPO_ROOT, profile.singlePlayback.harness), "utf8");
for (const pattern of [
  /proof-capture-lock-auto\.cjs/u,
  /--renderer-process-limit=2/u,
  /mkdtempSync/u,
  /os\.tmpdir\(\)/u,
  /publishCaptureArtifacts/u
]) {
  assert.match(harness, pattern);
}
assert.doesNotMatch(harness, /const FRAME_DIR = path\.join\(PROOF_ROOT/u);

console.log(
  JSON.stringify({
    status: "ready-for-authorized-single-playback",
    profileId: profile.profileId,
    fixtureId: profile.fixtureId,
    captureTag: profile.singlePlayback.captureTag,
    reservedOutputCount: expectedOutputs.length,
    intentionalTriggerCountPerformed: 0,
    imageDigest: expectedDigest,
    stagingPolicy: profile.captureStagingPolicy,
    resourceSafety: profile.resourceSafety,
    retailOracleStatus: profile.retailOracle.status
  })
);

function verifyRecord(record) {
  assert.ok(record && typeof record.path === "string" && record.path.length > 0);
  assert.match(record.sha256, /^[a-f0-9]{64}$/u);
  const filePath = path.isAbsolute(record.path) ? record.path : path.resolve(REPO_ROOT, record.path);
  assert.ok(fs.existsSync(filePath), `Bound input is missing: ${filePath}`);
  const bytes = fs.readFileSync(filePath);
  assert.equal(bytes.byteLength, record.sizeBytes, `Size mismatch: ${filePath}`);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), record.sha256);
}
