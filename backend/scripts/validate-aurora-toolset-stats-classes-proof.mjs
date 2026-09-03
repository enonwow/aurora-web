#!/usr/bin/env node
import { readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const options = parseArgs(process.argv.slice(2));
const paths = Object.fromEntries(
  [
    "baseline",
    "strengthAfter",
    "strengthRollback",
    "classAfter",
    "classRollback",
    "strengthPng",
    "strengthRollbackPng",
    "classPng",
    "classRollbackPng",
    "out",
  ].map((key) => [key, resolve(required(options[key], `--${key}`))]),
);
const target = { x: 53.23, y: 52.46, tag: "NW_DWARFMERC001" };

const snapshots = Object.fromEntries(
  ["baseline", "strengthAfter", "strengthRollback", "classAfter", "classRollback"].map((key) => [key, creature(paths[key])]),
);
const state = Object.fromEntries(
  Object.entries(snapshots).map(([key, entry]) => [key, {
    strength: Number(entry.creatureMetadata?.strength),
    classes: entries(entry, "classListEntries"),
  }]),
);
const fighter1 = [{ classId: 4, level: 1 }];
const fighter2 = [{ classId: 4, level: 2 }];
const checks = {
  baselineExact: state.baseline.strength === 15 && same(state.baseline.classes, fighter1),
  strengthAfterExact: state.strengthAfter.strength === 17 && same(state.strengthAfter.classes, fighter1),
  strengthRollbackExact: state.strengthRollback.strength === 15 && same(state.strengthRollback.classes, fighter1),
  classAfterExact: state.classAfter.strength === 15 && same(state.classAfter.classes, fighter2),
  classRollbackExact: state.classRollback.strength === 15 && same(state.classRollback.classes, fighter1),
  strengthScreenshotPresent: png(paths.strengthPng),
  strengthRollbackScreenshotPresent: png(paths.strengthRollbackPng),
  classScreenshotPresent: png(paths.classPng),
  classRollbackScreenshotPresent: png(paths.classRollbackPng),
};
const ok = Object.values(checks).every(Boolean);
const report = {
  version: "aurora-toolset-stats-classes-proof/v1",
  generatedAt: new Date().toISOString(),
  ok,
  target,
  expectedTransitions: { strength: "15 -> 17 -> 15", fighterLevel: "1 -> 2 -> 1" },
  checks,
  readback: state,
  evidence: paths,
};
writeFileSync(paths.out, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (!ok) process.exitCode = 1;

function creature(path) {
  const parsed = JSON.parse(readFileSync(path, "utf8"));
  const matches = (parsed.objects?.creatures ?? []).filter(
    (entry) => entry.x === target.x && entry.y === target.y && entry.tag === target.tag,
  );
  if (matches.length !== 1) throw new Error(`Expected one exact creature in ${path}, got ${matches.length}.`);
  return matches[0];
}
function entries(creatureEntry, key) {
  const raw = creatureEntry.creatureMetadata?.[key];
  return raw ? JSON.parse(String(raw)) : [];
}
function png(path) { return statSync(path).size > 10_000; }
function same(actual, expected) { return JSON.stringify(actual) === JSON.stringify(expected); }
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
