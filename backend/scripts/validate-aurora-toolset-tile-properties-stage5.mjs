#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const options = parseArgs(process.argv.slice(2));
const baselineDir = resolve(required(options.baselineDir, "--baselineDir"));
const positiveDir = resolve(required(options.positiveDir, "--positiveDir"));
const rollbackDir = options.rollbackDir ? resolve(options.rollbackDir) : null;
const positiveUiPath = resolve(required(options.positiveUi, "--positiveUi"));
const rollbackUiPath = options.rollbackUi ? resolve(options.rollbackUi) : null;
const outPath = options.out ? resolve(options.out) : null;
const failures = [];

const baselineTiles = rows(baselineDir, "tiles.csv");
const positiveTiles = rows(positiveDir, "tiles.csv");
const positiveDiffs = diffRows(baselineTiles, positiveTiles);
check(baselineTiles.length === 64 && positiveTiles.length === 64, "tile_count_not_64");
check(
  positiveDiffs.length === 1 &&
    positiveDiffs[0]?.index === 38 &&
    positiveDiffs[0]?.field === "mainLight1" &&
    positiveDiffs[0]?.before === "1" &&
    positiveDiffs[0]?.after === "2",
  "positive_delta_not_exact_main_light_1_1_to_2_at_tile_38",
);
check(equalFile(join(baselineDir, "objects.csv"), join(positiveDir, "objects.csv")), "positive_objects_changed");

const positiveUi = json(positiveUiPath, "positive_ui_missing_or_invalid");
check(positiveUi?.ok === true, "positive_ui_not_ok");
check(positiveUi?.selection?.model === "tcm02_a20_04", "positive_ui_model_mismatch");
check(positiveUi?.selection?.tileId === 183 && positiveUi?.selection?.orientation === 2, "positive_ui_tile_identity_mismatch");
check(positiveUi?.selection?.x === 65 && positiveUi?.selection?.y === 45, "positive_ui_tile_position_mismatch");
check(positiveUi?.dialog?.action?.kind === "SetMainLight1" && positiveUi?.dialog?.action?.swatchIndex === 2, "positive_ui_action_mismatch");
check(safeUi(positiveUi), "positive_ui_safety_contract_failed");

let rollbackDiffs = null;
let rollbackUi = null;
if (rollbackDir) {
  const rollbackTiles = rows(rollbackDir, "tiles.csv");
  rollbackDiffs = diffRows(baselineTiles, rollbackTiles);
  check(rollbackDiffs.length === 0, "rollback_tiles_not_exact");
  for (const file of ["tiles.csv", "tile-contract.csv", "objects.csv"]) {
    check(equalFile(join(baselineDir, file), join(rollbackDir, file)), `rollback_${file.replaceAll(".", "_")}_not_byte_exact`);
  }
  check(Boolean(rollbackUiPath), "rollback_ui_path_missing");
  rollbackUi = rollbackUiPath ? json(rollbackUiPath, "rollback_ui_missing_or_invalid") : null;
  check(rollbackUi?.ok === true, "rollback_ui_not_ok");
  check(rollbackUi?.dialog?.action?.kind === "SetMainLight1" && rollbackUi?.dialog?.action?.swatchIndex === 1, "rollback_ui_action_mismatch");
  check(safeUi(rollbackUi), "rollback_ui_safety_contract_failed");
}

const result = {
  ok: failures.length === 0,
  status: failures.length === 0 ? "verified" : "failed",
  baselineDir,
  positiveDir,
  rollbackDir,
  checks: {
    tileCount: baselineTiles.length,
    positiveDiffs,
    positiveObjectsByteExact: equalFile(join(baselineDir, "objects.csv"), join(positiveDir, "objects.csv")),
    rollbackDiffs,
    rollbackByteExact: rollbackDir
      ? Object.fromEntries(["tiles.csv", "tile-contract.csv", "objects.csv"].map((file) => [file, equalFile(join(baselineDir, file), join(rollbackDir, file))]))
      : null,
    baselineHashes: hashes(baselineDir),
    positiveHashes: hashes(positiveDir),
    rollbackHashes: rollbackDir ? hashes(rollbackDir) : null,
  },
  failureCount: failures.length,
  failures,
};

if (outPath) {
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
}
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exitCode = 2;

function safeUi(value) {
  return value?.bridge?.executedOnGuiThread === true && value?.bridge?.restored === true &&
    value?.final?.unexpectedWindowCount === 0 && value?.final?.frameEnabled === true &&
    value?.safety?.globalCursor === false && value?.safety?.globalKeyboard === false &&
    value?.safety?.globalMouse === false && value?.safety?.syntheticFocus === false;
}
function rows(dir, file) {
  const path = join(dir, file);
  if (!existsSync(path)) { failures.push(`missing:${path}`); return []; }
  return parseCsv(readFileSync(path, "utf8"));
}
function diffRows(beforeRows, afterRows) {
  const diffs = [];
  if (beforeRows.length !== afterRows.length) return [{ field: "__rowCount", before: String(beforeRows.length), after: String(afterRows.length) }];
  for (let index = 0; index < beforeRows.length; index += 1) {
    const fields = new Set([...Object.keys(beforeRows[index]), ...Object.keys(afterRows[index])]);
    for (const field of fields) if (beforeRows[index][field] !== afterRows[index][field]) diffs.push({ index, field, before: beforeRows[index][field], after: afterRows[index][field] });
  }
  return diffs;
}
function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/u); if (lines.length < 2) return [];
  const headers = csvLine(lines[0]);
  return lines.slice(1).map((line) => Object.fromEntries(headers.map((header, index) => [header, csvLine(line)[index] ?? ""])));
}
function csvLine(line) {
  const values = []; let value = "", quoted = false;
  for (let index = 0; index < line.length; index += 1) { const char = line[index]; if (char === '"') { if (quoted && line[index + 1] === '"') { value += '"'; index += 1; } else quoted = !quoted; } else if (char === "," && !quoted) { values.push(value); value = ""; } else value += char; }
  values.push(value); return values;
}
function json(path, code) { try { return JSON.parse(readFileSync(path, "utf8")); } catch { failures.push(code); return null; } }
function equalFile(left, right) { return existsSync(left) && existsSync(right) && readFileSync(left).equals(readFileSync(right)); }
function hashes(dir) { return Object.fromEntries(["tiles.csv", "tile-contract.csv", "objects.csv"].map((file) => [file, hash(join(dir, file))])); }
function hash(path) { return existsSync(path) ? createHash("sha256").update(readFileSync(path)).digest("hex") : null; }
function check(value, code) { if (!value) failures.push(code); }
function required(value, name) { const text = String(value ?? "").trim(); if (!text) throw new Error(`${name} is required.`); return text; }
function parseArgs(argv) { const result = {}; for (let index = 0; index < argv.length; index += 2) { const key = argv[index], value = argv[index + 1]; if (!key?.startsWith("--") || value === undefined) throw new Error(`Expected --name <value> near ${key ?? "end"}.`); result[key.slice(2)] = value; } return result; }
