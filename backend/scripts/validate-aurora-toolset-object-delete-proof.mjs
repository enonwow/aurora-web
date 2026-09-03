#!/usr/bin/env node
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const summaryPath = resolve(process.argv[2] ?? "backend/docs/aurora-reverse/evidence/door-hook-live-standard-2026-07-14/delete-summary.json");
const summary = JSON.parse(readFileSync(summaryPath, "utf8"));
const root = dirname(summaryPath);
const failures = [];
const check = (condition, code) => { if (!condition) failures.push(code); };

check(summary.version === "aurora-toolset-object-delete-proof/v1", "summary_version_invalid");
check(summary.verdict === "verified" && summary.standard === "AUR-S02-08", "verdict_or_standard_invalid");
check(summary.session?.singleSession === true && summary.session?.globalInputUsed === false, "unsafe_or_multi_session");
check(summary.session?.closedCleanly === true && summary.session?.processCountAfterClose === 0, "session_not_closed");
check(summary.counts?.doorsBefore === 1 && summary.counts?.doorsAfter === 0, "target_kind_delta_invalid");
check(summary.counts?.totalBefore === 2 && summary.counts?.totalAfter === 1, "total_delta_invalid");
check(summary.counts?.waypointsBefore === 1 && summary.counts?.waypointsAfter === 1 && summary.counts?.otherCountersUnchanged === true, "cross_kind_mutation");
check(summary.deletedObject?.templateResRef === "nw_door_ttr_04" && summary.deletedObject?.tag === "BARN_DOOR_HOME", "deleted_identity_invalid");
check(Array.isArray(summary.blockers) && summary.blockers.length === 0, "proof_has_blockers");
for (const [key, value] of Object.entries(summary.artifacts ?? {})) check(Boolean(value) && existsSync(resolve(root, value)) && statSync(resolve(root, value)).size > 0, `artifact_missing:${key}`);

const before = JSON.parse(readFileSync(resolve(root, summary.artifacts.beforeSourcePack), "utf8"));
const after = JSON.parse(readFileSync(resolve(root, summary.artifacts.afterSourcePack), "utf8"));
const action = JSON.parse(readFileSync(resolve(root, summary.artifacts.action), "utf8"));
const close = JSON.parse(readFileSync(resolve(root, summary.artifacts.sessionClose), "utf8"));
const beforeDoor = before.objects?.doors?.[0];
check(before.counts?.doors === 1 && before.counts?.waypoints === 1 && before.counts?.total === 2, "actual_before_counts_invalid");
check(after.counts?.doors === 0 && after.counts?.waypoints === 1 && after.counts?.total === 1, "actual_after_counts_invalid");
check(beforeDoor?.templateResRef === summary.deletedObject.templateResRef && beforeDoor?.tag === summary.deletedObject.tag, "actual_deleted_identity_invalid");
check((after.objects?.doors ?? []).length === 0, "actual_door_still_present");
check(action.delete?.virtualKeyCode === 46 && action.dirtyTitleObserved === true, "actual_delete_action_invalid");
check(action.safety?.usesGlobalCursor === false && action.safety?.usesGlobalKeyboard === false && action.safety?.usesGlobalMouse === false, "actual_delete_action_unsafe");
check(close.phase === "closed" && close.processCountAfterClose === 0 && close.windowsAfterClose === 0, "actual_close_invalid");

const result = { ok: failures.length === 0, validator: "aurora-toolset-object-delete-proof/v1", summaryPath, failures, checkedAt: new Date().toISOString() };
const outputPath = resolve(root, "delete-validator-result.json");
writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ...result, outputPath }, null, 2));
if (!result.ok) process.exitCode = 1;
