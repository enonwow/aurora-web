#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "../..");
const validator = resolve(root, "backend/scripts/validate-vfx-row28-web-v6.py");
const python =
  process.env.AURORA_PROOF_PYTHON ??
  "C:/Users/enonw/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe";

const source = readFileSync(validator, "utf8");
for (const token of [
  "visualAnchorCalibrationMustRemainSourceTime",
  "sourceToWallFormula",
  "visualCalibrationAnchor",
  "dynamicPeak",
  "nearest-captured-frame-to-source-time-calibration-anchor",
  "pass-automated-source-clock-visual-anchor-and-runtime-gates",
  "nativeLifecycleErrorsAreReportedNotAutoAccepted",
  '"startsNwn": False',
  '"startsWebRuntime": False'
]) {
  assert.ok(source.includes(token), `missing row28 v6 validator token: ${token}`);
}

const run = spawnSync(python, [validator, "dry-run"], {
  cwd: root,
  encoding: "utf8"
});
assert.equal(run.status, 0, run.stderr);
const result = JSON.parse(run.stdout);
assert.equal(result.status, "row28_web_v6_validation_plan_valid");
assert.equal(result.startsNwn, false);
assert.equal(result.startsWebRuntime, false);
assert.equal(result.requiresExplicitInputHashes, true);
assert.equal(result.separatesDynamicPeakFromVisualCalibrationAnchor, true);

console.log(
  JSON.stringify({
    ok: true,
    status: "row28_web_v6_evidence_pipeline_contract_valid",
    startsNwn: false,
    startsWebRuntime: false
  })
);
