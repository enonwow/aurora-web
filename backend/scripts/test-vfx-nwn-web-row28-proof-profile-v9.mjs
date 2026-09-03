#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const PROFILE_PATH = path.resolve(
  REPO_ROOT,
  process.env.VFX_PROOF_PROFILE_PATH ??
    "backend/docs/aurora-reverse/evidence/vfx-nwn-web-row28/proof-profile-v9.json"
);
const EXPECTED_CAPTURE_TAG = process.env.VFX_EXPECTED_CAPTURE_TAG ?? "v6a";
const profile = JSON.parse(fs.readFileSync(PROFILE_PATH, "utf8"));

assert.equal(profile.version, "aurora-vfx-proof-profile/v9");
assert.equal(profile.fixtureId, "vfx-nwn-web-row28");
assert.equal(profile.proofCompleteness, "missing-awaiting-fresh-capture");
assert.equal(profile.identityNeutrality?.exactIdentityBranchesAllowed, false);
assert.equal(profile.identityNeutrality?.proofBindingIdentityChecksAllowed, true);
assert.match(profile.runtimeBuildIdentity?.frontendImageDigest, /^sha256:[a-f0-9]{64}$/u);
assert.equal(
  profile.runtimeBuildIdentity?.frontendImageDigest,
  profile.runtimeBuildIdentity?.backendImageDigest
);

for (const key of [
  "fixtureInputs",
  "runtimeSourceInputs",
  "immutableNativeOracle",
  "calibrationInputs",
  "captureToolchain",
  "postCaptureToolchain",
  "profileToolchain"
]) {
  assert.ok(Array.isArray(profile[key]) && profile[key].length > 0, `${key} must be non-empty`);
  for (const record of profile[key]) verifyRecord(record);
}
verifyRecord(profile.supersedes);
verifyRecord(profile.validator);
assert.ok(
  profile.fixtureInputs.some((record) => record.path.endsWith("/presentation-profile.json")),
  "presentation profile must be bound"
);
assert.ok(
  profile.runtimeSourceInputs.some((record) =>
    record.path.endsWith("/vfx.application.service.ts")
  ),
  "the shared VFX application runtime must be bound"
);
assert.ok(
  profile.runtimeSourceInputs.some((record) =>
    record.path.endsWith("/aurora-vfx-render-contract.ts")
  ),
  "the recursive child-frame render contract must be bound"
);
assert.ok(
  profile.runtimeSourceInputs.some((record) =>
    record.path.endsWith("/health.controller.ts")
  ),
  "the backend runtime revision identity must be bound"
);
assert.ok(
  profile.runtimeSourceInputs.some((record) =>
    record.path.endsWith("/auroraVfxCanonicalRenderer.test.ts")
  ),
  "the instance-bound child-frame renderer regression must be bound"
);
assert.ok(
  profile.runtimeSourceInputs.some((record) =>
    record.path.endsWith("/placeableThreeAssetLoader.ts")
  ),
  "the shared Aurora model texture/material adapter must be bound"
);
assert.ok(
  profile.runtimeSourceInputs.some((record) =>
    record.path.endsWith("/auroraMdlSourceMaterialLighting.ts")
  ),
  "the shared Aurora source-material lighting adapter must be bound"
);
assert.ok(
  profile.captureToolchain.some((record) =>
    record.path.endsWith("/check-vfx-asset-identity-neutral-branches.mjs")
  ),
  "identity-neutral static gate must be bound"
);
assert.equal(profile.singlePlayback?.captureTag, EXPECTED_CAPTURE_TAG);
assert.equal(profile.singlePlayback?.intentionalTriggerCount, 1);
assert.equal(profile.singlePlayback?.automaticRetry, false);
assert.equal(profile.singlePlayback?.loop, false);
assert.equal(profile.singlePlayback?.diagnostics, false);
assert.equal(profile.singlePlayback?.captureMethod, "direct-cdp-Page.captureScreenshot");
assert.deepEqual(profile.singlePlayback?.expectedViewport, { width: 1460, height: 810 });
assert.equal(profile.singlePlayback?.expectedOutputs?.length, 5);
for (const relativePath of profile.singlePlayback.expectedOutputs) {
  assert.equal(fs.existsSync(path.resolve(REPO_ROOT, relativePath)), false, `Output exists: ${relativePath}`);
}
assert.equal(profile.retailOracle?.captureAuthorized, false);
assert.equal(profile.retailOracle?.nativeRelaunchAllowed, false);

console.log(
  JSON.stringify({
    status: "ready-for-single-identity-neutral-web-capture",
    profileId: profile.profileId,
    captureTag: profile.singlePlayback.captureTag,
    retailOracleStatus: profile.retailOracle.status
  })
);

function verifyRecord(record) {
  assert.ok(record && typeof record.path === "string" && record.path.length > 0);
  assert.match(record.sha256, /^[a-f0-9]{64}$/u);
  const filePath = path.isAbsolute(record.path) ? record.path : path.resolve(REPO_ROOT, record.path);
  const bytes = fs.readFileSync(filePath);
  assert.equal(bytes.byteLength, record.sizeBytes, `Size mismatch: ${filePath}`);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), record.sha256);
}
