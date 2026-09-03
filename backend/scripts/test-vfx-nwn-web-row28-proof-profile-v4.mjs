import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const PROFILE_PATH = path.join(
  REPO_ROOT,
  "backend/docs/aurora-reverse/evidence/vfx-nwn-web-row28/proof-profile-v4.json"
);

const profile = JSON.parse(fs.readFileSync(PROFILE_PATH, "utf8"));
assert.equal(profile.version, "aurora-vfx-proof-profile/v4");
assert.equal(profile.profileId, "vfx-nwn-web-row28-web-proof-v4");
assert.equal(profile.fixtureId, "vfx-nwn-web-row28");
assert.equal(profile.supersedes?.profileId, "vfx-nwn-web-row28-web-proof-v3");
verifyRecord(profile.supersedes, REPO_ROOT);
assert.deepEqual(profile.sourceIdentity, {
  rowId: 28,
  sourceLabel: "VFX_FNF_METEOR_SWEARM",
  publicConstant: "VFX_FNF_METEOR_SWARM",
  sourceModel: "vff_rainmeteor",
  sourceModelSha256: "ea57f0346166314602d9d473873cedde791f9911ef90722c114481a0b6ebf29b",
  sourceTableSha256: "acefe76f7fb14e88916ae1ade40dd5108b8a2f601eaada82a67f751b4eb56ea2"
});

for (const input of profile.fixtureInputs ?? []) verifyRecord(input, REPO_ROOT);
for (const input of profile.runtimeSourceInputs ?? []) verifyRecord(input, REPO_ROOT);
for (const input of profile.immutableNativeOracle ?? []) verifyRecord(input, REPO_ROOT);
for (const input of profile.calibrationInputs ?? []) verifyRecord(input, REPO_ROOT);
for (const input of profile.captureToolchain ?? []) verifyRecord(input, REPO_ROOT);
verifyRecord(profile.validator, REPO_ROOT);

assert.equal(profile.calibration?.status, "accepted-spatial-and-peak-radiance-calibration");
assert.equal(profile.calibration?.additiveParticleRadianceScale, 14);
assert.equal(profile.calibration?.bloomMultiplier, 2);
assert.deepEqual(profile.calibration?.effectOriginAlignmentAuroraXyz, [1.25, 3.55, 0]);
assert.equal(profile.calibration?.energyAndCentroidGate, "pass");

assert.equal(profile.runtimeBuildIdentity?.frontendPort, 5129);
assert.equal(profile.runtimeBuildIdentity?.backendPort, 3029);
assert.equal(
  profile.runtimeBuildIdentity?.token,
  "worktree-348e8ff0e27677b7c611c56afa4d706685b393f0-row28-final-v4"
);

assert.equal(profile.singlePlayback?.authorization, "explicit-user-authorization-current-goal");
assert.equal(profile.singlePlayback?.captureTag, "v4");
assert.equal(profile.singlePlayback?.fps, 12);
assert.equal(profile.singlePlayback?.durationMs, 9000);
assert.equal(profile.singlePlayback?.capturePort, 9784);
assert.deepEqual(profile.singlePlayback?.expectedViewport, { width: 1460, height: 810 });
assert.equal(profile.singlePlayback?.intentionalTriggerCount, 1);
assert.equal(profile.singlePlayback?.automaticRetry, false);
assert.equal(profile.singlePlayback?.loop, false);
assert.equal(profile.singlePlayback?.diagnostics, false);
assert.equal(profile.singlePlayback?.captureMethod, "direct-cdp-Page.captureScreenshot");
assert.equal(profile.singlePlayback?.allowPartialEvidence, false);
assert.equal(profile.singlePlayback?.screencastFallbackAllowed, false);
assert.equal(profile.acceptance?.runtimeObservabilityVersion, "aurora-vfx-runtime-observability/v1");
assert.equal(profile.acceptance?.retailPixelParityClaimAllowed, false);

const expectedOutputs = profile.singlePlayback?.expectedOutputs ?? [];
assert.equal(expectedOutputs.length, 5, "The profile must reserve the five canonical proof outputs.");
for (const relativePath of expectedOutputs) {
  const outputPath = path.resolve(REPO_ROOT, relativePath);
  assert.equal(
    fs.existsSync(outputPath),
    false,
    `Pre-capture output already exists and cannot be overwritten: ${outputPath}`
  );
}

assert.equal(profile.retailOracle?.status, "verified-immutable-native-runtime-oracle");
assert.equal(profile.retailOracle?.captureAuthorized, false);
assert.equal(profile.retailOracle?.nativeRelaunchAllowed, false);
assert.equal(profile.retailOracle?.parityClaimAllowed, false);
assert.equal(profile.retailOracle?.oneTriggerVerified, true);

console.log(
  JSON.stringify({
    status: "ready-for-authorized-single-playback",
    profileId: profile.profileId,
    fixtureId: profile.fixtureId,
    fixtureInputCount: profile.fixtureInputs.length,
    runtimeSourceInputCount: profile.runtimeSourceInputs.length,
    nativeOracleInputCount: profile.immutableNativeOracle.length,
    calibrationInputCount: profile.calibrationInputs.length,
    captureToolchainInputCount: profile.captureToolchain.length,
    reservedOutputCount: expectedOutputs.length,
    intentionalTriggerCountPerformed: 0,
    authorization: profile.singlePlayback.authorization,
    retailOracleStatus: profile.retailOracle.status
  })
);

function verifyRecord(record, basePath) {
  assert.ok(record && typeof record.path === "string" && record.path.length > 0);
  assert.match(record.sha256, /^[a-f0-9]{64}$/u);
  const filePath = path.isAbsolute(record.path)
    ? record.path
    : path.resolve(basePath, record.path);
  assert.ok(fs.existsSync(filePath), `Bound input is missing: ${filePath}`);
  const bytes = fs.readFileSync(filePath);
  assert.equal(bytes.byteLength, record.sizeBytes, `Size mismatch: ${filePath}`);
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    record.sha256,
    `SHA-256 mismatch: ${filePath}`
  );
}
