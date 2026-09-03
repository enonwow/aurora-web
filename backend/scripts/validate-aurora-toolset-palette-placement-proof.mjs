#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const summaryArg = process.argv[2];
if (!summaryArg) {
  console.error("Usage: node backend/scripts/validate-aurora-toolset-palette-placement-proof.mjs <summary.json>");
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

const kindContracts = {
  creature: { countKey: "creatures", paletteFamily: "Creatures" },
  door: { countKey: "doors", paletteFamily: "Doors" },
  encounter: { countKey: "encounters", paletteFamily: "Encounters" },
  item: { countKey: "items", paletteFamily: "Items" },
  store: { countKey: "stores", paletteFamily: "Merchants" },
  placeable: { countKey: "placeables", paletteFamily: "Placeables" },
  sound: { countKey: "sounds", paletteFamily: "Sounds" },
  trigger: { countKey: "triggers", paletteFamily: "Triggers" },
  waypoint: { countKey: "waypoints", paletteFamily: "Waypoints" },
};

expectEqual(proof.version, "aurora-toolset-palette-placement-proof/v1", "version_invalid");
expectEqual(proof.verdict, "verified", "verdict_not_verified");
expectNonEmptyString(proof.standardId, "standard_id_missing");

const operationKind = proof.operation?.kind;
const contract = kindContracts[operationKind];
if (!contract) fail("operation_kind_invalid", { actual: operationKind });
if (contract) expectEqual(proof.operation?.countKey, contract.countKey, "operation_count_key_invalid");

const session = proof.session ?? {};
expectPositiveInteger(session.processId, "session_pid_invalid");
expectEqual(session.singleSession, true, "session_not_single");
expectNonEmptyString(session.sequenceId, "session_sequence_id_missing");
expectPositiveInteger(session.sequenceStep, "session_sequence_step_invalid");
expectPositiveInteger(session.sequenceStepCount, "session_sequence_step_count_invalid");
if (Number.isInteger(session.sequenceStep) && Number.isInteger(session.sequenceStepCount) && session.sequenceStep > session.sequenceStepCount) {
  fail("session_sequence_step_out_of_range");
}
expectEqual(session.respondingAtCapture, true, "session_not_responding_at_capture");
expectNonEmptyString(session.proofMonitor, "proof_monitor_missing");
expectEqual(session.globalCursorUsed, false, "global_cursor_used");
expectEqual(session.globalKeyboardUsed, false, "global_keyboard_used");
expectEqual(session.globalMouseUsed, false, "global_mouse_used");
expectEqual(session.userConfigurationMutated, false, "user_configuration_mutated");
expectEqual(session.closedCleanly, true, "toolset_not_closed_cleanly");

const moduleProof = proof.module ?? {};
expectNonEmptyString(moduleProof.sourcePath, "source_module_path_missing");
expectNonEmptyString(moduleProof.workingPath, "working_module_path_missing");
for (const [key, code] of [
  ["sourceSha256Before", "source_hash_before_invalid"],
  ["sourceSha256After", "source_hash_after_invalid"],
  ["workingSha256BeforeSession", "working_hash_before_session_invalid"],
  ["workingSha256AfterSession", "working_hash_after_session_invalid"],
]) {
  expectSha256(moduleProof[key], code);
}
expectEqual(moduleProof.sourceSha256Before, moduleProof.sourceSha256After, "source_module_hash_changed");
if (moduleProof.workingSha256BeforeSession === moduleProof.workingSha256AfterSession) {
  fail("working_module_session_hash_unchanged");
}
expectNonNegativeInteger(moduleProof.workingBytesBeforeStep, "working_bytes_before_step_invalid");
expectPositiveInteger(moduleProof.workingBytesAfterStep, "working_bytes_after_step_invalid");
if (Number.isInteger(moduleProof.workingBytesBeforeStep) && Number.isInteger(moduleProof.workingBytesAfterStep) && moduleProof.workingBytesAfterStep === moduleProof.workingBytesBeforeStep) {
  fail("working_module_step_size_unchanged");
}
expectEqual(moduleProof.saveConfirmed, true, "save_not_confirmed");
expectEqual(moduleProof.afterSaveTitleClean, true, "after_save_title_dirty");

expectNonEmptyString(proof.area?.resref, "area_resref_missing");
expectNonEmptyString(proof.area?.name, "area_name_missing");
if (contract) expectEqual(proof.palette?.family, contract.paletteFamily, "palette_family_invalid");
if (!Array.isArray(proof.palette?.path) || proof.palette.path.length === 0 || proof.palette.path.some((part) => !isNonEmptyString(part))) {
  fail("palette_path_invalid");
}
expectNonEmptyString(proof.palette?.selectedLeaf, "palette_leaf_missing");
expectEqual(proof.palette?.selectObjectsRestored, true, "select_objects_not_restored");

const before = proof.counts?.before;
const after = proof.counts?.after;
const delta = proof.counts?.delta;
for (const key of countKeys()) {
  expectNonNegativeInteger(before?.[key], `before_${key}_invalid`);
  expectNonNegativeInteger(after?.[key], `after_${key}_invalid`);
}
if (contract) {
  expectEqual(delta?.[contract.countKey], 1, "target_delta_not_one");
  if (Number.isInteger(before?.[contract.countKey]) && Number.isInteger(after?.[contract.countKey])) {
    expectEqual(after[contract.countKey] - before[contract.countKey], 1, "target_counts_inconsistent");
  }
}
expectEqual(delta?.total, 1, "total_delta_not_one");
if (Number.isInteger(before?.total) && Number.isInteger(after?.total)) {
  expectEqual(after.total - before.total, 1, "total_counts_inconsistent");
}
for (const key of countKeys().filter((key) => key !== "total" && key !== contract?.countKey)) {
  if (Number.isInteger(before?.[key]) && Number.isInteger(after?.[key])) {
    expectEqual(after[key], before[key], `cross_kind_changed_${key}`);
  }
}
expectEqual(proof.counts?.crossKindUnchanged, true, "cross_kind_unconfirmed");

expectEqual(proof.addedObject?.kind, operationKind, "added_object_kind_invalid");
expectNonEmptyString(proof.addedObject?.templateResRef, "added_object_resref_missing");
for (const axis of ["x", "y", "z"]) {
  if (!Number.isFinite(proof.addedObject?.[axis])) fail(`added_object_${axis}_invalid`);
}

expectEqual(proof.visualProof?.beforeViewportRendered, true, "before_viewport_not_rendered");
expectEqual(proof.visualProof?.afterPlacementViewportRendered, true, "after_placement_viewport_not_rendered");
expectEqual(proof.visualProof?.selectedLeafVisible, true, "selected_leaf_not_visible");
expectEqual(proof.visualProof?.objectVisible, true, "placed_object_not_visible");

if (!Array.isArray(proof.blockers)) {
  fail("blockers_not_array");
} else if (proof.blockers.length !== 0) {
  fail("verified_packet_has_blockers", { blockerCount: proof.blockers.length });
}

for (const key of [
  "beforeFull",
  "paletteSelection",
  "afterPlacementFull",
  "afterSaveFull",
  "objectCrop",
  "baselineManifest",
  "baselineObjects",
  "afterSaveManifest",
  "afterSaveObjects",
  "closeResult",
]) {
  const value = proof.artifacts?.[key];
  if (!isNonEmptyString(value)) {
    fail("artifact_path_missing", { artifact: key });
    continue;
  }
  const artifactPath = path.isAbsolute(value) ? value : path.resolve(summaryDir, value);
  try {
    const stat = fs.statSync(artifactPath);
    if (!stat.isFile() || stat.size <= 0) fail("artifact_empty_or_not_file", { artifact: key, path: artifactPath });
  } catch {
    fail("artifact_missing", { artifact: key, path: artifactPath });
  }
}

emit(failures.length === 0, failures);
if (failures.length > 0) process.exitCode = 2;

function countKeys() {
  return ["placeables", "doors", "creatures", "encounters", "items", "sounds", "stores", "triggers", "waypoints", "total"];
}
function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}
function expectNonEmptyString(value, code) {
  if (!isNonEmptyString(value)) fail(code);
}
function expectPositiveInteger(value, code) {
  if (!Number.isInteger(value) || value <= 0) fail(code, { actual: value });
}
function expectNonNegativeInteger(value, code) {
  if (!Number.isInteger(value) || value < 0) fail(code, { actual: value });
}
function expectSha256(value, code) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/i.test(value)) fail(code);
}
function expectEqual(actual, expected, code) {
  if (actual !== expected) fail(code, { actual, expected });
}
function fail(code, details = {}) {
  failures.push({ code, ...details });
}
function emit(ok, validationFailures) {
  console.log(JSON.stringify({
    version: "aurora-toolset-palette-placement-validation/v1",
    ok,
    summaryPath,
    operationKind: proof?.operation?.kind ?? null,
    failureCount: validationFailures.length,
    failures: validationFailures,
  }, null, 2));
}
