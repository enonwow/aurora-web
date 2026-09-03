#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.argv[2] ?? "backend/docs/aurora-reverse/evidence/palette-placement-corrected-live-2026-07-14");
const summary = readJson("summary.json");
const failures = [];

const expectedSteps = [
  ["baseline", { creatures: 5, items: 2, stores: 0, sounds: 0, waypoints: 0, doors: 1, total: 11 }],
  ["after-npc", { creatures: 6, items: 2, stores: 0, sounds: 0, waypoints: 0, doors: 1, total: 12 }],
  ["after-item", { creatures: 6, items: 3, stores: 0, sounds: 0, waypoints: 0, doors: 1, total: 13 }],
  ["after-merchant", { creatures: 6, items: 3, stores: 1, sounds: 0, waypoints: 0, doors: 1, total: 14 }],
  ["after-sound", { creatures: 6, items: 3, stores: 1, sounds: 1, waypoints: 0, doors: 1, total: 15 }],
  ["after-waypoint", { creatures: 6, items: 3, stores: 1, sounds: 1, waypoints: 1, doors: 1, total: 16 }],
  ["after-door-attempt", { creatures: 6, items: 3, stores: 1, sounds: 1, waypoints: 1, doors: 1, total: 16 }],
];

for (const [step, expected] of expectedSteps) {
  const manifest = readJson(`${step}/manifest.json`);
  const actual = manifest?.parsed?.git?.counts ?? {};
  for (const [key, value] of Object.entries(expected)) {
    if (actual[key] !== value) failures.push(`${step}:${key}:expected_${value}:actual_${actual[key]}`);
  }
}

for (const [name, file] of Object.entries({
  npc: "02-npc-action.json",
  item: "04-item-action.json",
  merchant: "06-merchant-action.json",
  sound: "08-sound-action.json",
  waypoint: "10-waypoint-action.json",
})) {
  const action = readJson(file)?.action;
  const buttons = action?.selectObjectsToolbar?.buttons ?? [];
  const terrain = buttons.find((entry) => entry.index === 0);
  const objects = buttons.find((entry) => entry.index === 1);
  if (action?.selectObjectsRestored !== true) failures.push(`${name}:select_objects_not_restored`);
  if (terrain?.checked !== false || objects?.checked !== true || objects?.commandId !== 1) {
    failures.push(`${name}:native_selection_mode_readback_invalid`);
  }
}

for (const file of ["01-before.png", "03-npc-placed.png", "05-item-placed.png", "07-merchant-placed.png", "09-sound-placed.png", "11-waypoint-placed.png", "13-door-attempt.png"]) {
  const path = resolve(root, file);
  if (!existsSync(path) || statSync(path).size < 100_000) failures.push(`${file}:missing_or_too_small`);
}

const session = readJson("session-state.json");
if (session?.phase !== "closed") failures.push("session_not_closed");
if ((session?.closeResult?.close?.afterProcesses ?? []).length !== 0) failures.push("toolset_processes_remain");
if (session?.closeResult?.close?.safety?.usesGlobalCursor !== false) failures.push("close_global_cursor_not_false");

const waypointHash = sha256("after-waypoint/objects.csv");
const doorAttemptHash = sha256("after-door-attempt/objects.csv");
if (waypointHash !== doorAttemptHash) failures.push("door_attempt_changed_objects_csv");
if (summary?.verdict !== "verified_with_one_documented_negative") failures.push("summary_verdict_invalid");
if (summary?.session?.processId !== 10844) failures.push("summary_pid_invalid");

const result = {
  ok: failures.length === 0,
  status: failures.length === 0 ? "verified" : "failed",
  root,
  verifiedPlacements: ["npc", "item", "merchant", "sound", "waypoint"],
  documentedNegative: "door_requires_valid_hook_target",
  failureCount: failures.length,
  failures,
};
writeFileSync(resolve(root, "validator-result.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 1;

function readJson(relativePath) {
  const path = resolve(root, relativePath);
  if (!existsSync(path)) {
    failures.push(`${relativePath}:missing`);
    return null;
  }
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    failures.push(`${relativePath}:invalid_json:${error.message}`);
    return null;
  }
}

function sha256(relativePath) {
  return createHash("sha256").update(readFileSync(resolve(root, relativePath))).digest("hex").toUpperCase();
}
