#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";

const summaryPath = resolve(process.argv[2] ?? "backend/docs/aurora-reverse/evidence/copy-paste-placeable-live-2026-07-14/summary.json");
const root = dirname(summaryPath);
const summary = JSON.parse(readFileSync(summaryPath, "utf8"));
const failures = [];
const check = (value, code) => { if (!value) failures.push(code); };
const artifact = (key) => resolve(root, summary.artifacts?.[key] ?? "");
const readJson = (key) => JSON.parse(readFileSync(artifact(key), "utf8").replace(/^\uFEFF/u, ""));
const sha256 = (path) => createHash("sha256").update(readFileSync(path)).digest("hex").toUpperCase();

for (const [key, relativePath] of Object.entries(summary.artifacts ?? {})) {
  check(Boolean(relativePath) && existsSync(resolve(root, relativePath)), `artifact_missing:${key}`);
}

const actions = readJson("actions");
const after = readJson("afterPasteManifest");
const rollback = readJson("rollbackManifest");
const session = readJson("session");

check(summary.version === "aurora-toolset-copy-paste-placeable-proof/v1", "version_invalid");
check(summary.verdict === "verified" && summary.functionAccepted === true, "verdict_invalid");
check(summary.scope?.kind === "placeable" && summary.scope?.templateResRef === "plc_watertrough", "scope_invalid");
check(actions.selection?.target?.text === "Water Trough" && actions.selection?.target?.depth === 3, "source_selection_invalid");
check(actions.copy?.menu?.commandId === 59 && actions.copy?.action === "copy", "copy_command_invalid");
check(actions.menuAfterCopy?.paste?.commandId === 61 && actions.menuAfterCopy?.paste?.enabled === true, "paste_not_enabled_after_copy");
check(actions.paste?.menu?.commandId === 61 && actions.paste?.action === "paste", "paste_command_invalid");
check(actions.commit?.titleAfter?.endsWith("*") === true, "paste_commit_not_dirty");
check(after.parsed?.git?.counts?.placeables === 4 && after.parsed?.git?.counts?.total === 19, "after_save_count_invalid");
check(summary.delta?.addedObject?.templateResRef === "plc_watertrough" && summary.delta?.addedObject?.x === 63.5478 && summary.delta?.addedObject?.y === 24.6024, "added_object_invalid");
check(actions.undo?.menu?.commandId === 56 && actions.undo?.action === "undo", "undo_command_invalid");
check(rollback.parsed?.git?.counts?.placeables === 3 && rollback.parsed?.git?.counts?.total === 18, "rollback_counts_invalid");
check(sha256(artifact("baselineObjects")) === sha256(artifact("rollbackObjects")), "git_rollback_not_exact");
check(session.phase === "closed" && session.closeResult?.close?.afterProcesses?.length === 0, "session_not_cleanly_closed");
check(summary.rollback?.exactGitObjectsCsv === true, "rollback_contract_invalid");
check(summary.rollback?.exactModuleContainer === false, "module_container_drift_not_disclosed");
for (const action of [actions.selection, actions.copy, actions.paste, actions.commit, actions.undo]) {
  check(action?.safety?.usesGlobalCursor === false && action?.safety?.usesGlobalKeyboard === false && action?.safety?.usesGlobalMouse === false, "global_input_used");
}

const result = {
  ok: failures.length === 0,
  validator: "aurora-toolset-copy-paste-placeable-proof/v1",
  functionAccepted: failures.length === 0,
  acceptedFunctions: failures.length === 0 ? ["AUR-S02-06"] : [],
  failures,
  checkedAt: new Date().toISOString()
};
writeFileSync(resolve(root, "validator-result.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 1;
