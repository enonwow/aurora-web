#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..", "..");
const outputDir = resolve(repoRoot, "backend/docs/aurora-reverse/evidence/stage1-palette-standards-2026-07-14");
const run = (script, args = []) => JSON.parse(execFileSync(process.execPath, [resolve(scriptDir, script), ...args], { cwd: repoRoot, encoding: "utf8", windowsHide: true, timeout: 60_000 }).trim());
const checks = {
  placeable: run("validate-aurora-toolset-placeable-placement-proof.mjs", ["backend/docs/aurora-reverse/evidence/placeable-live-standard-2026-07-14/summary.json"]),
  paletteMatrix: run("validate-aurora-toolset-palette-matrix-proof.mjs"),
  polygons: run("validate-aurora-toolset-polygon-placement-proof.mjs"),
  door: run("validate-aurora-toolset-door-hook-proof.mjs")
};
const failures = [];
const check = (condition, code) => { if (!condition) failures.push(code); };
check(checks.placeable.ok === true, "placeable_not_verified");
for (const family of ["npc", "item", "merchant", "sound", "waypoint"]) check(checks.paletteMatrix.ok === true && checks.paletteMatrix.verifiedPlacements?.includes(family), `${family}_not_verified`);
check(checks.polygons.ok === true, "encounter_or_trigger_not_verified");
check(checks.door.ok === true, "door_not_verified");
const roadmap = readFileSync(resolve(repoRoot, "backend/docs/aurora-reverse/aurora-toolset-usage-standards-roadmap-2026-07-14.md"), "utf8");
const stageRows = [...roadmap.matchAll(/^\| AUR-S01-\d{2} \|.*\| \*\*(TAK|CZĘŚCIOWO|NIE|DO AUDYTU)\*\*/gmu)];
check(stageRows.length === 10, "stage1_row_count_invalid");
check(stageRows.every((match) => match[1] === "TAK"), "stage1_contains_non_tak_status");
const result = {
  ok: failures.length === 0,
  validator: "aurora-toolset-stage1-palette-standards/v1",
  acceptedFamilies: ["placeable", "creature", "item", "door", "encounter", "merchant", "sound", "trigger", "waypoint"],
  stage1StandardsAccepted: failures.length === 0 ? 10 : null,
  stage1StandardsTotal: 10,
  checks,
  failures,
  checkedAt: new Date().toISOString()
};
mkdirSync(outputDir, { recursive: true });
writeFileSync(resolve(outputDir, "validator-result.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 1;
