#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const summaryPath = resolve(process.argv[2] ?? "backend/docs/aurora-reverse/evidence/overlap-topmost-selection-live-2026-07-14/summary.json");
const root = dirname(summaryPath);
const summary = JSON.parse(readFileSync(summaryPath, "utf8"));
const failures = [];
const check = (value, code) => { if (!value) failures.push(code); };
const file = (key) => resolve(root, summary.artifacts?.[key] ?? "");
const json = (key) => JSON.parse(readFileSync(file(key), "utf8").replace(/^\uFEFF/u, ""));
const hash = (path) => createHash("sha256").update(readFileSync(path)).digest("hex").toUpperCase();

for (const [key, relative] of Object.entries(summary.artifacts ?? {})) check(Boolean(relative) && existsSync(resolve(root, relative)), `artifact_missing:${key}`);
const actions = json("actions");
const after = json("afterOverlapManifest");
const rollback = json("rollbackManifest");
const session = json("session");

check(summary.version === "aurora-overlap-topmost-selection-proof/v1", "version_invalid");
check(summary.functionAccepted === true && summary.verdict === "verified", "verdict_invalid");
check(summary.scope?.resolution === "deterministic_topmost_selection", "scope_invalid");
check(actions.placements?.length === 2 && actions.placements.every((item) => item.viewport?.x === 1040 && item.viewport?.y === 620), "placement_points_invalid");
check(after.parsed?.git?.counts?.creatures === 7 && after.parsed?.git?.counts?.placeables === 4 && after.parsed?.git?.counts?.total === 20, "fixture_counts_invalid");
check(summary.fixture?.overlap?.creature?.x === 60.4528 && summary.fixture?.overlap?.placeable?.x === 60.4528 && summary.fixture.overlap.creature.y === 28.7291 && summary.fixture.overlap.placeable.y === 28.7291, "fixture_coordinates_invalid");
check(actions.selection?.first?.text === "Water Trough" && actions.selection?.second?.text === "Water Trough", "selection_text_invalid");
check(actions.selection?.first?.handle > 0 && actions.selection.first.handle === actions.selection.second.handle, "selection_not_stable");
check(actions.selection?.first?.safety?.usesGlobalCursor === false && actions.selection.first.safety?.usesGlobalKeyboard === false && actions.selection.first.safety?.usesGlobalMouse === false, "global_input_used");
check(actions.undo?.length === 2 && actions.undo.every((item) => item.commandId === 56), "undo_contract_invalid");
check(rollback.parsed?.git?.counts?.creatures === 6 && rollback.parsed?.git?.counts?.placeables === 3 && rollback.parsed?.git?.counts?.total === 18, "rollback_counts_invalid");
check(hash(file("baselineObjects")) === hash(file("rollbackObjects")), "rollback_objects_not_exact");
check(session.phase === "closed" && session.closeResult?.close?.afterProcesses?.length === 0, "session_not_cleanly_closed");
check(summary.rollback?.exactGitObjectsCsv === true && summary.rollback?.exactModuleContainer === false, "rollback_disclosure_invalid");

const result = { ok: failures.length === 0, validator: "aurora-overlap-topmost-selection-proof/v1", functionAccepted: failures.length === 0, acceptedFunctions: failures.length === 0 ? ["AUR-S02-10"] : [], failures, checkedAt: new Date().toISOString() };
writeFileSync(resolve(root, "validator-result.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 1;
