#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "../..");
const script = resolve(root, "backend/scripts/create-vfx-row28-native-comparison.py");
const source = readFileSync(script, "utf8");
for (const token of [
  "first-pixel-visible-onset",
  "nwn-row28-meteor-swarm-one-trigger-v8.mp4",
  "aurora-web-row28-one-trigger-v3.mp4",
  "not-matched",
  "not pixel-aligned",
  "libx264",
  "+faststart",
  "startsNwn\": False",
  "startsWebRuntime\": False",
]) assert.ok(source.includes(token), `missing row28 comparison token: ${token}`);

const run = spawnSync("python", [script, "dry-run"], { cwd: root, encoding: "utf8" });
assert.equal(run.status, 0, run.stderr);
const result = JSON.parse(run.stdout);
assert.equal(result.status, "row28_native_comparison_plan_valid");
assert.equal(result.outputFps, 12);
assert.deepEqual(result.outputSize, [1280, 448]);
assert.equal(result.startsNwn, false);
assert.equal(result.startsWebRuntime, false);
console.log(JSON.stringify({ ok: true, status: "row28_native_comparison_contract_valid" }));
