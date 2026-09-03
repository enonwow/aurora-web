import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.join(
  scriptDirectory,
  "create-vfx-onset-aligned-diagnostic-comparison.py"
);

const source = readFileSync(scriptPath, "utf8");
for (const forbiddenIdentity of [
  "VFX_FNF_METEOR_SWARM",
  "sourceRowId",
  "row28",
]) {
  assert.equal(
    source.includes(forbiddenIdentity),
    false,
    `generic onset comparison must not branch or bind behavior by ${forbiddenIdentity}`
  );
}

const result = spawnSync(
  "python",
  [
    scriptPath,
    "dry-run",
    "--left-video",
    "left.mp4",
    "--right-video",
    "right.mp4",
    "--left-sha256",
    "a".repeat(64),
    "--right-sha256",
    "b".repeat(64),
    "--left-onset-seconds",
    "5.0",
    "--right-onset-seconds",
    "2.5",
    "--output-root",
    "out",
  ],
  { encoding: "utf8" }
);

assert.equal(result.status, 0, result.stderr);
const plan = JSON.parse(result.stdout);
assert.equal(plan.ok, true);
assert.equal(plan.status, "onset-aligned-diagnostic-comparison-plan-valid");
assert.equal(plan.alignmentKind, "first-visible-onset");
assert.equal(plan.startsNwn, false);
assert.equal(plan.startsWebRuntime, false);
assert.equal(plan.leftOnsetSeconds, 5);
assert.equal(plan.rightOnsetSeconds, 2.5);

console.log("vfx onset-aligned diagnostic comparison contract passed");
