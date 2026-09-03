import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const PROFILE_PATH = path.join(
  REPO_ROOT,
  "backend/docs/aurora-reverse/evidence/vfx-nwn-web-row28/proof-profile-v3.json"
);

const profile = JSON.parse(fs.readFileSync(PROFILE_PATH, "utf8"));
assert.equal(profile.version, "aurora-vfx-proof-profile/v3");
assert.equal(profile.profileId, "vfx-nwn-web-row28-web-proof-v3");
assert.equal(profile.fixtureId, "vfx-nwn-web-row28");
assert.equal(profile.supersedes?.profileId, "vfx-nwn-web-row28-web-proof-v2");
assert.equal(
  profile.supersedes?.sha256,
  "c5a4ce76d7a6144ddaaf4e7010beae754b64b809c7933c1946adfff2044d4b40"
);
assert.deepEqual(profile.sourceIdentity, {
  rowId: 28,
  sourceLabel: "VFX_FNF_METEOR_SWEARM",
  publicConstant: "VFX_FNF_METEOR_SWARM",
  sourceModel: "vff_rainmeteor",
  sourceModelSha256: "ea57f0346166314602d9d473873cedde791f9911ef90722c114481a0b6ebf29b",
  sourceTableSha256: "acefe76f7fb14e88916ae1ade40dd5108b8a2f601eaada82a67f751b4eb56ea2"
});

for (const input of profile.fixtureInputs ?? []) verifyRecord(input, REPO_ROOT);
for (const input of profile.immutableCaptureInputSnapshots ?? []) {
  verifyRecord(input, REPO_ROOT);
}
for (const input of profile.captureToolchain ?? []) verifyRecord(input, REPO_ROOT);
verifyRecord(profile.validator, REPO_ROOT);

assert.equal(profile.singlePlayback?.authorization, "pending-explicit-retry-authorization");
assert.equal(profile.singlePlayback?.captureTag, "v3");
assert.equal(profile.singlePlayback?.intentionalTriggerCount, 1);
assert.equal(profile.singlePlayback?.automaticRetry, false);
assert.equal(profile.singlePlayback?.loop, false);
assert.equal(profile.singlePlayback?.captureMethod, "direct-cdp-Page.captureScreenshot");
assert.equal(profile.singlePlayback?.allowPartialEvidence, false);
assert.equal(profile.singlePlayback?.screencastFallbackAllowed, false);
assert.equal(profile.acceptance?.runtimeObservabilityVersion, "aurora-vfx-runtime-observability/v1");
assert.equal(profile.acceptance?.retailParityClaimAllowed, false);

const expectedOutputs = profile.singlePlayback?.expectedOutputs ?? [];
assert.ok(expectedOutputs.length >= 5, "The profile must reserve all final proof outputs.");
for (const relativePath of expectedOutputs) {
  const outputPath = path.resolve(REPO_ROOT, relativePath);
  assert.equal(
    fs.existsSync(outputPath),
    false,
    `Pre-capture output already exists and cannot be overwritten: ${outputPath}`
  );
}

assert.equal(profile.retailOracle?.status, "missing");
assert.equal(profile.retailOracle?.captureAuthorized, false);
assert.equal(profile.retailOracle?.parityClaimAllowed, false);
assert.ok(
  profile.retailOracle?.blockers?.includes("exact-row28-retail-oracle-not-captured")
);

console.log(
  JSON.stringify({
    status: "ready-for-explicitly-authorized-single-playback",
    profileId: profile.profileId,
    fixtureId: profile.fixtureId,
    fixtureInputCount: profile.fixtureInputs.length,
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
