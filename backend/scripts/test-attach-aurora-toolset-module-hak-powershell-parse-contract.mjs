#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const atom = resolve("backend/scripts/attach-aurora-toolset-module-hak-no-global-input.mjs");
const source = readFileSync(atom, "utf8");
assert.match(source, /function Tops\(\[uint32\]\$toolsetPid\)/);
assert.doesNotMatch(source, /\$pid\b/);

// A deliberately wrong module name reaches PowerShell parsing but fails before
// any menu/dialog mutation can occur on a live Toolset session.
const result = spawnSync(process.execPath, [atom, "--module", "never_loaded", "--hak", "m2a_m0_proof", "--hakPath", "C:\\Users\\enonw\\Documents\\Neverwinter Nights\\hak\\m2a_m0_proof.hak"], { encoding: "utf8", windowsHide: true, timeout: 30000 });
assert.notEqual(result.status, 0);
assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /Cannot overwrite variable pid/);
assert.match(`${result.stdout}\n${result.stderr}`, /exact_enabled_module_frame_missing|expected_one_responding_toolset/);
