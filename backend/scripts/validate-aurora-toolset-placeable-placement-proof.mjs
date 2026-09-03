#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const summaryArg = process.argv[2];
if (!summaryArg) {
  console.error("Usage: node backend/scripts/validate-aurora-toolset-placeable-placement-proof.mjs <summary.json>");
  process.exit(2);
}

const summaryPath = path.resolve(summaryArg);
const summaryDir = path.dirname(summaryPath);
const failures = [];

let proof;
try {
  proof = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
} catch (error) {
  emit(false, [{ code: "summary_unreadable", detail: String(error?.message ?? error) }]);
  process.exit(2);
}

expectEqual(proof.version, "aurora-toolset-placeable-placement-proof/v1", "version_invalid");
expectEqual(proof.verdict, "verified", "verdict_not_verified");

const session = proof.session ?? {};
expectPositiveInteger(session.processId, "session_pid_invalid");
expectEqual(session.singleSession, true, "session_not_single");
expectEqual(session.responding, true, "session_not_responding_at_capture");
expectNonEmptyString(session.proofMonitor, "proof_monitor_missing");
expectEqual(session.globalCursorUsed, false, "global_cursor_used");
expectEqual(session.globalKeyboardUsed, false, "global_keyboard_used");
expectEqual(session.globalMouseUsed, false, "global_mouse_used");
expectEqual(session.userConfigurationMutated, false, "user_configuration_mutated");
expectEqual(session.closedCleanly, true, "toolset_not_closed_cleanly");

const moduleProof = proof.module ?? {};
expectNonEmptyString(moduleProof.sourcePath, "source_module_path_missing");
expectNonEmptyString(moduleProof.workingPath, "working_module_path_missing");
expectSha256(moduleProof.sourceSha256Before, "source_hash_before_invalid");
expectSha256(moduleProof.sourceSha256After, "source_hash_after_invalid");
expectSha256(moduleProof.workingSha256Before, "working_hash_before_invalid");
expectSha256(moduleProof.workingSha256After, "working_hash_after_invalid");
expectEqual(moduleProof.sourceSha256Before, moduleProof.sourceSha256After, "source_module_hash_changed");
if (moduleProof.workingSha256Before === moduleProof.workingSha256After) {
  fail("working_module_hash_unchanged");
}
expectPositiveInteger(moduleProof.savedSizeBytes, "saved_module_size_invalid");
expectEqual(moduleProof.saveConfirmed, true, "save_not_confirmed");

expectNonEmptyString(proof.area?.resref, "area_resref_missing");
expectNonEmptyString(proof.area?.name, "area_name_missing");
expectEqual(proof.palette?.family, "Placeables", "palette_family_invalid");
if (!Array.isArray(proof.palette?.path) || proof.palette.path.length === 0 || proof.palette.path.some((part) => !isNonEmptyString(part))) {
  fail("palette_path_invalid");
}
expectNonEmptyString(proof.palette?.selectedLeaf, "palette_leaf_missing");

const before = proof.counts?.before;
const after = proof.counts?.after;
const delta = proof.counts?.delta;
for (const kind of countKinds()) {
  expectNonNegativeInteger(before?.[kind], `before_${kind}_invalid`);
  expectNonNegativeInteger(after?.[kind], `after_${kind}_invalid`);
}
expectEqual(delta?.placeables, 1, "placeable_delta_not_one");
expectEqual(delta?.total, 1, "total_delta_not_one");
if (Number.isInteger(before?.placeables) && Number.isInteger(after?.placeables)) {
  expectEqual(after.placeables - before.placeables, 1, "placeable_counts_inconsistent");
}
if (Number.isInteger(before?.total) && Number.isInteger(after?.total)) {
  expectEqual(after.total - before.total, 1, "total_counts_inconsistent");
}
for (const kind of countKinds().filter((kind) => kind !== "placeables" && kind !== "total")) {
  if (Number.isInteger(before?.[kind]) && Number.isInteger(after?.[kind])) {
    expectEqual(after[kind], before[kind], `cross_kind_changed_${kind}`);
  }
}
expectEqual(proof.counts?.crossKindUnchanged, true, "cross_kind_unconfirmed");

expectEqual(proof.addedObject?.kind, "placeable", "added_object_kind_invalid");
expectNonEmptyString(proof.addedObject?.templateResRef, "added_object_resref_missing");
for (const axis of ["x", "y", "z"]) {
  if (!Number.isFinite(proof.addedObject?.[axis])) {
    fail(`added_object_${axis}_invalid`);
  }
}

if (!Array.isArray(proof.blockers)) {
  fail("blockers_not_array");
} else if (proof.blockers.length !== 0) {
  fail("verified_packet_has_blockers", { blockerCount: proof.blockers.length });
}

const requiredArtifacts = [
  "beforeFull",
  "paletteSelection",
  "afterPlacementFull",
  "afterSaveFull",
  "placeableCrop",
  "baselineManifest",
  "baselineObjects",
  "afterSaveManifest",
  "afterSaveObjects",
  "closeResult"
];
for (const key of requiredArtifacts) {
  const value = proof.artifacts?.[key];
  if (!isNonEmptyString(value)) {
    fail("artifact_path_missing", { artifact: key });
    continue;
  }
  const artifactPath = path.isAbsolute(value) ? value : path.resolve(summaryDir, value);
  try {
    const stat = fs.statSync(artifactPath);
    if (!stat.isFile() || stat.size <= 0) {
      fail("artifact_empty_or_not_file", { artifact: key, path: artifactPath });
    }
  } catch {
    fail("artifact_missing", { artifact: key, path: artifactPath });
  }
}

emit(failures.length === 0, failures);
if (failures.length > 0) {
  process.exitCode = 2;
}

function countKinds() {
  return [
    "placeables",
    "doors",
    "creatures",
    "encounters",
    "items",
    "sounds",
    "stores",
    "triggers",
    "waypoints",
    "total"
  ];
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function expectNonEmptyString(value, code) {
  if (!isNonEmptyString(value)) {
    fail(code);
  }
}

function expectPositiveInteger(value, code) {
  if (!Number.isInteger(value) || value <= 0) {
    fail(code, { actual: value });
  }
}

function expectNonNegativeInteger(value, code) {
  if (!Number.isInteger(value) || value < 0) {
    fail(code, { actual: value });
  }
}

function expectSha256(value, code) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/i.test(value)) {
    fail(code);
  }
}

function expectEqual(actual, expected, code) {
  if (actual !== expected) {
    fail(code, { actual, expected });
  }
}

function fail(code, details = {}) {
  failures.push({ code, ...details });
}

function emit(ok, validationFailures) {
  console.log(JSON.stringify({
    version: "aurora-toolset-placeable-placement-validation/v1",
    ok,
    summaryPath,
    failureCount: validationFailures.length,
    failures: validationFailures
  }, null, 2));
}
