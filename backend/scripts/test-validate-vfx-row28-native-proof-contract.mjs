#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "../..");
const script = resolve(root, "backend/scripts/validate-vfx-row28-native-proof.py");
const source = readFileSync(script, "utf8");
for (const token of [
  "FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE",
  "AURORA_VFX_PROOF_TRIGGER fixture=vfx-nwn-web-row28",
  "Loading Module: codex_vfx_row28",
  "saturated-bright-pixel-count(max>=245,channel-range>=35)",
  "valid-single-trigger-visible-native-nwn-oracle",
  "baselineBeforeOnset",
  "postRollHidden",
  "runtime-execution-v9",
  "priorRuntimeExecutionsRejected",
  "aur-s07-runtime-packet/v1",
]) assert.ok(source.includes(token), `missing native proof validation token: ${token}`);

const dir = mkdtempSync(join(tmpdir(), "row28-native-proof-plan-"));
const placeholders = ["video.mp4", "capture.json", "observation.json", "profile.json", "log.txt"];
const run = spawnSync("python", [
  script, "dry-run",
  "--video", join(dir, placeholders[0]),
  "--capture", join(dir, placeholders[1]),
  "--observation", join(dir, placeholders[2]),
  "--profile", join(dir, placeholders[3]),
  "--engineLog", join(dir, placeholders[4]),
  "--outDir", join(dir, "final"),
], { cwd: root, encoding: "utf8" });
assert.equal(run.status, 0, run.stderr);
const result = JSON.parse(run.stdout);
assert.equal(result.status, "vfx_row28_native_proof_validation_plan_valid");
assert.equal(result.readsLockedEngineLogWithFileShareReadWrite, true);
assert.equal(result.writesImmutableFinalPacket, true);
console.log(JSON.stringify({ ok: true, status: "vfx_row28_native_proof_validator_contract_valid" }));
