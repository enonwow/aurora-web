#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const atom = resolve("backend/scripts/select-aurora-toolset-dialog-combo-item-timeout-validated.mjs");
const result = JSON.parse(execFileSync(process.execPath, [atom, "--dialogClass", "TdlgCreatureEdit", "--dialogTitle", "Creature Properties", "--targetText", "M2A_M0_MESHY_RIGID", "--ordinal", "1", "--compileOnly", "true"], { encoding: "utf8", windowsHide: true }).trim());

assert.deepEqual(result, { ok: true, mode: "compile-only" });
const source = readFileSync(atom, "utf8");
assert.match(source, /function Get-R\(/u);
assert.doesNotMatch(source, /function R\(/u);
assert.match(source, /CB_GETLBTEXTLEN|0x0149/u);
assert.match(source, /CB_GETLBTEXT|0x0148/u);
assert.match(source, /SendMessageTimeoutText/u);
assert.match(source, /expected_one_visible_combo_with_exact_target/u);
assert.match(source, /ORD-eq'auto'/u);
