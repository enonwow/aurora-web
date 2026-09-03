#!/usr/bin/env node
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const evidence = resolve(repoRoot, "backend/docs/aurora-reverse/evidence/overlap-resolution-live-standard-2026-07-14");
const read = (relative) => JSON.parse(readFileSync(resolve(evidence, relative), "utf8").replace(/^\uFEFF/u, ""));
const exists = (relative) => existsSync(resolve(evidence, relative));
const failures = [];
const check = (value, code) => { if (!value) failures.push(code); };
const counts = (relative) => read(`${relative}/manifest.json`).parsed.git.counts;

for (const relative of [
  "baseline/manifest.json", "after-save/manifest.json", "after-undo-1/manifest.json", "final-rollback/manifest.json",
  "baseline/objects.csv", "final-rollback/objects.csv", "placement-1.json", "placement-2.json",
  "selection-click-1.json", "selection-click-2.json", "session-state.json",
  "after-overlap-placement.png", "selection-after-1.png", "selection-after-2.png", "final-rollback.png"
]) check(exists(relative), `missing:${relative}`);

const baseline = counts("baseline");
const afterSave = counts("after-save");
const afterUndo = counts("after-undo-1");
const finalRollback = counts("final-rollback");
check(baseline.creatures === 6 && baseline.total === 18, "baseline_counts_invalid");
check(afterSave.creatures === 8 && afterSave.total === 20, "overlap_fixture_not_plus_two");
check(afterUndo.creatures === 7 && afterUndo.total === 19, "first_undo_not_minus_one");
check(finalRollback.creatures === 6 && finalRollback.total === 18, "final_rollback_counts_invalid");
check(readFileSync(resolve(evidence, "baseline/objects.csv"), "utf8") === readFileSync(resolve(evidence, "final-rollback/objects.csv"), "utf8"), "git_rollback_not_exact");

for (const relative of ["placement-1.json", "placement-2.json", "selection-click-1.json", "selection-click-2.json"]) {
  const safety = read(relative).safety ?? {};
  check(safety.usesGlobalCursor === false && safety.usesGlobalKeyboard === false && safety.usesGlobalMouse === false, `unsafe_input:${relative}`);
}
for (const relative of ["after-overlap-placement.png", "selection-after-1.png", "selection-after-2.png", "final-rollback.png"]) check(statSync(resolve(evidence, relative)).size > 1024, `visual_artifact_invalid:${relative}`);

const session = read("session-state.json");
check(session.phase === "closed", "session_not_closed");
check(session.closeResult?.close?.ok === true && session.closeResult.close.afterProcesses?.length === 0, "clean_close_not_proven");
const finalContainerSha256 = createHash("sha256").update(readFileSync(session.modulePath)).digest("hex").toUpperCase();
const initialContainerSha256 = session.preflight?.moduleSha256 ?? session.moduleSha256;
const exactModuleRollback = finalContainerSha256 === initialContainerSha256;

const result = {
  ok: failures.length === 0,
  functionAccepted: false,
  validator: "aurora-overlap-negative-proof/v1",
  checkedAt: new Date().toISOString(),
  evidence: {
    baseline, afterSave, afterUndo, finalRollback,
    exactGitRollback: failures.includes("git_rollback_not_exact") === false,
    exactModuleRollback,
    initialContainerSha256,
    finalContainerSha256,
    cleanClose: session.closeResult?.close?.ok === true,
    globalInputUsed: false
  },
  blocker: "overlap_selection_identity_not_readable_after_exact_viewport_click",
  failures
};
writeFileSync(resolve(evidence, "validator-result.json"), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 1;
