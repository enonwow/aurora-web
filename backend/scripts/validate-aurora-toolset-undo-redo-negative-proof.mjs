#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const summaryPath = resolve(process.argv[2] ?? "backend/docs/aurora-reverse/evidence/redo-live-standard-2026-07-14/summary.json");
const root = dirname(summaryPath);
const summary = JSON.parse(readFileSync(summaryPath, "utf8"));
const failures = [];
const check = (value, code) => { if (!value) failures.push(code); };
const read = (path) => JSON.parse(readFileSync(resolve(root, path), "utf8").replace(/^\uFEFF/u, ""));
for (const [key, path] of Object.entries(summary.artifacts ?? {})) check(Boolean(path) && existsSync(resolve(root, path)), `artifact_missing:${key}`);

const before = read(summary.artifacts.baseline);
const after = read(summary.artifacts.afterRedo);
const mutation = read(summary.artifacts.mutationAction);
const beforeUndo = read(summary.artifacts.toolbarBeforeUndo);
const afterUndo = read(summary.artifacts.toolbarAfterUndo);
const afterRedo = read(summary.artifacts.toolbarAfterRedo);
const close = read(summary.artifacts.sessionClose);
const creatureBefore = before.objects.creatures[4];
const creatureAfter = after.objects.creatures[4];

check(summary.verdict === "failed" && summary.blockerCode === "redo_no_structural_delta", "negative_verdict_invalid");
check(mutation.fields?.[0]?.after === "61,47" && mutation.fields?.[2]?.after === "0,25", "requested_mutation_missing");
check(beforeUndo.toolbar?.buttons?.[4]?.enabled === true && beforeUndo.toolbar?.buttons?.[5]?.enabled === false, "before_undo_state_invalid");
check(afterUndo.toolbar?.buttons?.[4]?.enabled === false && afterUndo.toolbar?.buttons?.[5]?.enabled === true, "after_undo_state_invalid");
check(afterRedo.toolbar?.buttons?.[4]?.enabled === true && afterRedo.toolbar?.buttons?.[5]?.enabled === false, "after_redo_state_invalid");
check(before.source.sha256 === after.source.sha256, "expected_negative_git_equality_missing");
check(creatureBefore.x === creatureAfter.x && creatureBefore.y === creatureAfter.y && creatureBefore.z === creatureAfter.z, "expected_negative_transform_equality_missing");
check(close.phase === "closed" && close.processCountAfterClose === 0, "session_not_closed");

const result = { ok: failures.length === 0, validator: "aurora-toolset-undo-redo-negative-proof/v1", functionAccepted: false, blockerCode: summary.blockerCode, failures, checkedAt: new Date().toISOString() };
writeFileSync(resolve(root, "validator-result.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 1;
