#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDir, "../docs/aurora-reverse/evidence/bearing-undo-redo-live-standard-2026-07-14");
const failures = [];
const phases = Object.fromEntries(["baseline", "mutated", "undo", "redo", "final"].map((name) => [name, readJson(`${name}/raw.git.summary.json`)]));
const csvHashes = Object.fromEntries(["baseline", "mutated", "undo", "redo", "final"].map((name) => [name, sha256(`${name}/objects.csv`)]));
const targetAt = (phase) => phase.objects.creatures.find((row) => row.templateResRef === "nw_dwarfmerc001" && row.tag === "NW_DWARFMERC001" && row.x === 53.23 && row.y === 52.46 && row.z === 0);
const targets = Object.fromEntries(Object.entries(phases).map(([name, phase]) => [name, targetAt(phase)]));

for (const [name, target] of Object.entries(targets)) if (!target) failures.push(`${name}_target_missing`);
expect(targets.baseline?.bearing === 270, "baseline_bearing_not_270");
expect(targets.mutated?.bearing === 225, "mutated_bearing_not_225");
expect(targets.undo?.bearing === 270, "undo_bearing_not_270");
expect(targets.redo?.bearing === 225, "redo_bearing_not_225");
expect(targets.final?.bearing === 270, "final_bearing_not_270");
expect(csvHashes.baseline === csvHashes.undo && csvHashes.baseline === csvHashes.final, "baseline_undo_final_csv_mismatch");
expect(csvHashes.mutated === csvHashes.redo, "mutated_redo_csv_mismatch");
expect(csvHashes.baseline !== csvHashes.mutated, "mutation_csv_has_no_delta");

const baselineCounts = JSON.stringify(phases.baseline.counts);
for (const [name, phase] of Object.entries(phases)) expect(JSON.stringify(phase.counts) === baselineCounts, `${name}_counts_changed`);

const panelAction = readJson("28-bearing-panel-45-click.json");
expect(panelAction.click?.x === 12 && panelAction.click?.y === 12, "bearing_panel_target_mismatch");
expect(safe(panelAction), "bearing_panel_action_used_global_input");
for (const file of ["34-bearing-undo.json", "38-bearing-redo.json", "42-bearing-final-undo.json"]) expect(safe(readJson(file)), `${file}_used_global_input`);

const beforeUndo = readJson("33-toolbar-before-undo.json").toolbar.buttons;
const afterUndo = readJson("35-toolbar-after-undo.json").toolbar.buttons;
const afterRedo = readJson("39-toolbar-after-redo.json").toolbar.buttons;
expect(button(beforeUndo, 4)?.enabled === true && button(beforeUndo, 5)?.enabled === false, "toolbar_before_undo_invalid");
expect(button(afterUndo, 5)?.enabled === true, "redo_not_enabled_after_undo");
expect(button(afterRedo, 4)?.enabled === true && button(afterRedo, 5)?.enabled === false, "toolbar_after_redo_invalid");

const state = readJson("session-state.json");
expect(state.phase === "closed", "session_not_closed");
expect((state.closeResult?.close?.afterProcesses ?? []).length === 0, "toolset_process_remained_after_close");
for (const png of ["29-bearing-panel-45.png", "31-bearing-panel-unsaved.png", "36-bearing-undo-unsaved.png", "40-bearing-redo-unsaved.png", "43-bearing-final-undo-unsaved.png"]) {
  const path = resolve(root, png);
  expect(existsSync(path) && statSync(path).size > 1024, `${png}_missing_or_too_small`);
}

const result = {
  ok: failures.length === 0,
  validator: "aurora-toolset-bearing-undo-redo-proof/v1",
  acceptedFunctions: failures.length === 0 ? ["AUR-S02-04", "AUR-S02-09"] : [],
  csvHashes,
  failures,
  checkedAt: new Date().toISOString(),
};
writeFileSync(resolve(root, "validator-result.json"), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 1;

function readJson(path) { return JSON.parse(readFileSync(resolve(root, path), "utf8").replace(/^\uFEFF/, "")); }
function sha256(path) { return createHash("sha256").update(readFileSync(resolve(root, path))).digest("hex").toUpperCase(); }
function expect(condition, code) { if (!condition) failures.push(code); }
function safe(action) { const safety = action?.safety ?? {}; return safety.usesGlobalCursor === false && safety.usesGlobalKeyboard === false && safety.usesGlobalMouse === false; }
function button(buttons, commandId) { return buttons.find((entry) => entry.commandId === commandId); }
