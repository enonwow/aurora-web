#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const options = parseArgs(process.argv.slice(2));
const evidenceDir = resolve(required(options.evidenceDir, "--evidenceDir"));
const outPath = options.out ? resolve(options.out) : null;
const failures = [];

const createUi = json("create-ui.json");
const positiveAreas = json("areas-after-create-save.json");
const manifest = json(join("area002-after-create-save", "manifest.json"));
const atomicDelete = json("atomic-rerun-delete.json");
const rollbackAreas = json("areas-after-atomic-rerun-save.json");
const finalPreflight = json("atomic-rerun-final-preflight.json");
const positiveSave = json("create-save.json");
const rollbackSave = json("atomic-rerun-save.json");

check(createUi?.ok === true, "create_ui_not_ok");
check(createUi?.menu?.commandId === 133 && createUi?.wizard?.expectedClass === "TdlgAreaWizard", "area_wizard_identity_mismatch");
check(createUi?.wizard?.selectionProof?.tileset === "MicroSet" && createUi?.wizard?.selectionProof?.selectedIndex === 21, "tileset_selection_mismatch");
check(createUi?.wizard?.selectionProof?.size === "Tiny" && createUi?.wizard?.selectionProof?.sizeIndex === 0, "size_selection_mismatch");
check(createUi?.wizard?.closedWith === "Finish" && createUi?.final?.moduleDirty === true, "wizard_finish_not_committed");
check(safeMutation(createUi), "create_ui_safety_contract_failed");

const created = positiveAreas?.areas?.find((area) => area.resref === "area002");
check(positiveAreas?.ok === true && positiveAreas?.areaCount === 4, "positive_area_count_not_4");
check(created?.name === "Area 001" && created?.tag === "Area001", "created_area_identity_mismatch");
check(created?.tileSet === "tms01" && created?.width === 2 && created?.height === 2 && created?.tileCount === 4, "created_area_geometry_or_tileset_mismatch");
check(created?.hasGit === true && created?.hasGic === true, "created_area_resource_triplet_incomplete");
check(manifest?.parsed?.are?.tileSet === "tms01" && manifest?.parsed?.are?.width === 2 && manifest?.parsed?.are?.height === 2 && manifest?.parsed?.are?.tileCount === 4, "source_manifest_are_mismatch");
check(manifest?.parsed?.git?.counts?.total === 0 && manifest?.parsed?.gic?.status === "present", "source_manifest_objects_or_gic_mismatch");
check(manifest?.parsed?.moduleIfo?.areaCount === 4 && manifest?.parsed?.moduleIfo?.areaIndex === 3, "module_ifo_area_entry_mismatch");
check(positiveSave?.ok === true && positiveSave?.titleAfter?.endsWith("s05t0716.mod"), "positive_save_not_verified");

check(atomicDelete?.ok === true && atomicDelete?.areaLabel === "Area 001", "atomic_delete_not_ok");
check(Array.isArray(atomicDelete?.confirmation) && atomicDelete.confirmation.length === 2, "delete_confirmation_count_not_2");
check(atomicDelete?.confirmation?.[0]?.title === "Confirmation" && /remove the area/u.test(atomicDelete?.confirmation?.[0]?.message ?? ""), "first_delete_confirmation_mismatch");
check(atomicDelete?.confirmation?.[1]?.title === "Warning" && /permanently remove the area/u.test(atomicDelete?.confirmation?.[1]?.message ?? ""), "second_delete_confirmation_mismatch");
check(atomicDelete?.confirmation?.every((item) => item.buttonText === "&Tak"), "localized_yes_buttons_not_exact");
check(safeMutation(atomicDelete), "delete_ui_safety_contract_failed");
check(rollbackSave?.ok === true && rollbackSave?.titleAfter?.endsWith("s05t0716.mod"), "rollback_save_not_verified");

const rollbackResrefs = (rollbackAreas?.areas ?? []).map((area) => area.resref).sort();
check(rollbackAreas?.ok === true && rollbackAreas?.areaCount === 3, "rollback_area_count_not_3");
check(JSON.stringify(rollbackResrefs) === JSON.stringify(["area", "area001", "demo"]), "rollback_resrefs_not_exact");
check(!(rollbackAreas?.areas ?? []).some((area) => area.resref === "area002" || area.name === "Area 001"), "created_area_survived_rollback");
check(finalPreflight?.ok === true && finalPreflight?.visibleToolsetWindows?.every((window) => ["TfrmFrame", "TApplication"].includes(window.className)), "final_preflight_not_clean");
check(finalPreflight?.monitor?.deviceName === "\\\\.\\DISPLAY1" && finalPreflight?.monitor?.primary === false, "final_monitor_contract_failed");

const result = {
  ok: failures.length === 0,
  status: failures.length === 0 ? "verified" : "failed",
  standardId: "AUR-S05-05",
  evidenceDir,
  checks: {
    wizard: { commandId: createUi?.menu?.commandId, tileset: createUi?.wizard?.selectionProof?.tileset, size: createUi?.wizard?.selectionProof?.size },
    createdArea: created ?? null,
    sourceObjectCount: manifest?.parsed?.git?.counts?.total ?? null,
    deleteConfirmations: atomicDelete?.confirmation ?? null,
    rollbackAreaCount: rollbackAreas?.areaCount ?? null,
    rollbackResrefs,
    finalUnexpectedWindowCount: Math.max(0, (finalPreflight?.visibleToolsetWindows?.length ?? 0) - 2),
  },
  failureCount: failures.length,
  failures,
};

if (outPath) { mkdirSync(dirname(outPath), { recursive: true }); writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`, "utf8"); }
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exitCode = 2;

function safeMutation(value) {
  return value?.final?.unexpectedWindowCount === 0 && value?.final?.frameEnabled === true &&
    value?.safety?.globalCursor === false && value?.safety?.globalKeyboard === false &&
    value?.safety?.globalMouse === false && value?.safety?.syntheticFocus === false;
}
function json(relativePath) { const path = join(evidenceDir, relativePath); if (!existsSync(path)) { failures.push(`missing:${relativePath}`); return null; } try { return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/u, "")); } catch { failures.push(`invalid_json:${relativePath}`); return null; } }
function check(value, code) { if (!value) failures.push(code); }
function required(value, name) { const text = String(value ?? "").trim(); if (!text) throw new Error(`${name} is required.`); return text; }
function parseArgs(argv) { const result = {}; for (let index = 0; index < argv.length; index += 2) { const key = argv[index], value = argv[index + 1]; if (!key?.startsWith("--") || value === undefined) throw new Error(`Expected --name <value> near ${key ?? "end"}.`); result[key.slice(2)] = value; } return result; }
