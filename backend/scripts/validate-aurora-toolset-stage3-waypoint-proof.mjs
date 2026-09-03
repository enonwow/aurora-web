#!/usr/bin/env node
import { readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const options = parseArgs(process.argv.slice(2));
const paths = Object.fromEntries(
  ["baseline", "after", "rollback", "baselinePng", "afterPng", "rollbackPng", "out"]
    .map((key) => [key, resolve(required(options[key], `--${key}`))]),
);
const baseline = waypoint(paths.baseline);
const after = waypoint(paths.after);
const rollback = waypoint(paths.rollback);
const stableFields = ["templateResRef", "x", "y", "z", "bearing"];
const checks = {
  baselineTagExact: baseline.tag === "CODEX_WAYPOINT_REDO2",
  changedTagExact: after.tag === "CODEX_STAGE3_WP_PROOF",
  rollbackTagExact: rollback.tag === baseline.tag,
  afterGeometryPreserved: stableFields.every((key) => after[key] === baseline[key]),
  rollbackGeometryPreserved: stableFields.every((key) => rollback[key] === baseline[key]),
  baselineScreenshotPresent: png(paths.baselinePng),
  changedScreenshotPresent: png(paths.afterPng),
  rollbackScreenshotPresent: png(paths.rollbackPng),
};
const ok = Object.values(checks).every(Boolean);
const report = {
  version: "aurora-toolset-stage3-waypoint-proof/v1",
  generatedAt: new Date().toISOString(),
  ok,
  expectedTransition: "CODEX_WAYPOINT_REDO2 -> CODEX_STAGE3_WP_PROOF -> CODEX_WAYPOINT_REDO2",
  checks,
  readback: { baseline, after, rollback },
  evidence: paths,
};
writeFileSync(paths.out, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (!ok) process.exitCode = 1;

function waypoint(path) {
  const parsed = JSON.parse(readFileSync(path, "utf8"));
  const entries = parsed.objects?.waypoints ?? [];
  if (entries.length !== 1) throw new Error(`Expected one waypoint in ${path}, got ${entries.length}.`);
  return entries[0];
}
function png(path) { return statSync(path).size > 1_000; }
function parseArgs(argv) {
  const out = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index], value = argv[index + 1];
    if (!key?.startsWith("--") || value == null) throw new Error(`Expected --name <value> near ${key ?? "end"}.`);
    out[key.slice(2)] = value;
  }
  return out;
}
function required(value, name) {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`${name} is required.`);
  return text;
}
