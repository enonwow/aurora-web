#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const path = resolve("scripts/prepare-area-path-connect-aur-s07-profile.mjs");
assert.equal(existsSync(path), true);
const source = readFileSync(path, "utf8");
for (const token of [
  "aur-s07-runtime-profile/v1",
  "aurora-tile-path-connect-profile/v2",
  "area-path-connect-post-binding-geometry-gate/v1",
  "packed-runtime-binding-verified",
  "read-aurora-toolset-bootstrap-area-readback.mjs",
  "read-aurora-toolset-bootstrap-entry-readback.mjs",
  "user_owned_test_module_action",
  "central_guarded_test_module_action",
  "options.launchMode",
  "path_connect_runtime_launch_mode_invalid",
  "path: module.path",
  "positiveAreaResRef",
  "negativeAreaResRef",
  "pc_tms01_run",
  "artifact: geometryGatePath",
  "sha256: sha256(geometryGateBytes)",
  "options.profileId",
  "path_connect_runtime_profile_id_invalid",
  "options.engineLog",
  "path_connect_runtime_engine_log_invalid",
  "loadingModuleResref",
  "requiredTokens",
  "aur-s07-runtime-evidence-policy/v1",
  "runtime-capture-metadata",
  "engine-load-log-metadata",
  "runtime-visual-review",
]) assert.match(source, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
assert.doesNotMatch(source, /Start-Process|spawn\(|SendKeys|SendInput|SetCursorPos/u);
assert.match(source, /\[USER_TEST_MODULE_MODE, CENTRAL_TEST_MODULE_MODE\]\.includes\(runtimeLaunchMode\)/u);

console.log(JSON.stringify({ ok: true, status: "prepare_area_path_connect_aur_s07_profile_contract_valid" }));
