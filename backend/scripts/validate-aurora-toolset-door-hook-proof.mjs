#!/usr/bin/env node
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const summaryPath = resolve(process.argv[2] ?? "backend/docs/aurora-reverse/evidence/door-hook-live-standard-2026-07-14/summary.json");
const summary = JSON.parse(readFileSync(summaryPath, "utf8"));
const root = dirname(summaryPath);
const failures = [];
const requireValue = (condition, code) => { if (!condition) failures.push(code); };
const requireArtifact = (relativePath, code) => requireValue(Boolean(relativePath) && existsSync(resolve(root, relativePath)) && statSync(resolve(root, relativePath)).size > 0, code);
const readArtifactJson = (relativePath) => JSON.parse(readFileSync(resolve(root, relativePath), "utf8"));

requireValue(summary.version === "aurora-toolset-door-hook-placement-proof/v1", "summary_version_invalid");
requireValue(summary.verdict === "verified", "summary_not_verified");
requireValue(summary.standard === "AUR-S01-04", "standard_id_invalid");
requireValue(summary.session?.singleSession === true, "single_session_missing");
requireValue(summary.session?.globalInputUsed === false, "global_input_used");
requireValue(summary.session?.closedCleanly === true && summary.session?.processCountAfterClose === 0, "session_not_cleanly_closed");
requireValue(summary.fixtureBaseline?.doors === 0 && summary.door?.counts?.doorsAfter === 1, "door_delta_invalid");
requireValue(summary.fixtureBaseline?.total === 1 && summary.door?.counts?.totalAfter === 2, "total_delta_invalid");
requireValue(summary.door?.otherCountersUnchanged === true, "cross_kind_mutation");
requireValue(summary.door?.selectObjectsRestored === true, "select_objects_not_restored");
requireValue(summary.door?.templateResRef === "nw_door_ttr_04", "door_template_invalid");
requireValue(Number.isFinite(summary.door?.x) && Number.isFinite(summary.door?.y) && Number.isFinite(summary.door?.z) && Number.isFinite(summary.door?.bearing), "door_transform_missing");
requireValue(Array.isArray(summary.blockers) && summary.blockers.length === 0, "proof_has_blockers");
requireArtifact(summary.fixtureBaseline?.sourcePack, "fixture_baseline_missing");
for (const [key, value] of Object.entries(summary.artifacts ?? {})) requireArtifact(value, `artifact_missing:${key}`);
requireArtifact("session-close.json", "session_close_missing");

const before = readArtifactJson(summary.fixtureBaseline.sourcePack);
const after = readArtifactJson(summary.artifacts.afterSourcePack);
const action = readArtifactJson(summary.artifacts.action);
const close = readArtifactJson("session-close.json");
const addedDoors = after.objects?.doors ?? [];
requireValue(before.counts?.doors === 0 && before.counts?.total === 1, "actual_fixture_counts_invalid");
requireValue(after.counts?.doors === 1 && after.counts?.total === 2, "actual_after_counts_invalid");
requireValue(addedDoors.length === 1 && addedDoors[0].templateResRef === summary.door.templateResRef && addedDoors[0].tag === summary.door.tag, "actual_added_door_invalid");
requireValue(addedDoors[0]?.x === summary.door.x && addedDoors[0]?.y === summary.door.y && addedDoors[0]?.z === summary.door.z && addedDoors[0]?.bearing === summary.door.bearing, "actual_added_transform_invalid");
requireValue(action.action?.selectObjectsRestored === true && action.action?.selectObjectsToolbar?.buttons?.[0]?.checked === false && action.action?.selectObjectsToolbar?.buttons?.[1]?.checked === true, "actual_selection_mode_invalid");
requireValue(action.safety?.usesGlobalCursor === false && action.safety?.usesGlobalKeyboard === false && action.safety?.usesGlobalMouse === false, "actual_action_unsafe");
requireValue(close.phase === "closed" && close.processCountAfterClose === 0 && close.windowsAfterClose === 0, "actual_close_invalid");

const result = {
  ok: failures.length === 0,
  validator: "aurora-toolset-door-hook-proof/v1",
  summaryPath,
  failures,
  checkedAt: new Date().toISOString()
};
const outputPath = resolve(root, "validator-result.json");
writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ...result, outputPath }, null, 2));
if (!result.ok) process.exitCode = 1;
