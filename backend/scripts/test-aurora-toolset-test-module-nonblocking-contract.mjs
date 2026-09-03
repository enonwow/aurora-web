#!/usr/bin/env node

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const scriptPath = resolve("backend/scripts/aurora-toolset-test-module-nonblocking.mjs");
assert.ok(existsSync(scriptPath), "nonblocking Test Module route is missing");
const source = readFileSync(scriptPath, "utf8");
assert.match(source, /TEST_MODULE_COMMAND_ID\s*=\s*121/u);
assert.match(source, /TEST_MODULE_TOP_POSITION\s*=\s*4/u);
assert.match(source, /TEST_MODULE_ITEM_POSITION\s*=\s*2/u);
assert.match(source, /PostMessage/u);
assert.doesNotMatch(source, /Start-Sleep/u);
assert.doesNotMatch(source, /titleAfter/u);
assert.match(source, /expected_zero_nwmain/u);

const dryRun = spawnSync(process.execPath, [scriptPath, "dry-run", "--module", "contract.mod"], { encoding: "utf8" });
assert.equal(dryRun.status, 0, dryRun.stderr);
const packet = JSON.parse(dryRun.stdout);
assert.deepEqual(packet.menu, { topPosition: 4, itemPosition: 2, commandId: 121 });
assert.equal(packet.nonblocking, true);
assert.equal(packet.usesGlobalInput, false);
assert.equal(packet.startsNwn, false);

console.log(JSON.stringify({ ok: true, status: "aurora_toolset_test_module_nonblocking_contract_valid" }));
