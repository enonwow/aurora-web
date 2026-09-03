#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const atom = resolve("backend/scripts/select-aurora-toolset-dialog-combo-item-dropdown-no-global-input.mjs");
const source = readFileSync(atom, "utf8");
assert.match(source, /CB_SHOWDROPDOWN|0x014F/);
assert.match(source, /ComboLBox/);
assert.match(source, /WM_LBUTTONDOWN|0x0201/);
assert.match(source, /WM_LBUTTONUP|0x0202/);
assert.match(source, /CB_GETLBTEXTLEN|0x0149/);
assert.match(source, /expected_one_basic_appearance_combo/);
assert.match(source, /Find-ComboExactItem/);
assert.match(source, /CB_GETLBTEXTLEN|0x0149/);
assert.match(source, /CB_GETLBTEXT|0x0148/);
assert.match(source, /LB_GETCOUNT|0x018B/);
assert.match(source, /LB_SETTOPINDEX|0x0197/);
assert.match(source, /LB_GETTOPINDEX|0x018E/);
assert.match(source, /timeout: 45_000/);
assert.doesNotMatch(source, /SendInput|SendKeys|SetCursorPos/);
const output = execFileSync(process.execPath, [atom, "--dialogClass", "TdlgCreatureEdit", "--dialogTitle", "Creature Properties", "--targetText", "M2A_M0_MESHY_RIGID", "--compileOnly", "true"], { encoding: "utf8" });
const parsed = JSON.parse(output);
assert.equal(parsed.ok, true);
assert.equal(parsed.mode, "compile-only");
console.log(JSON.stringify({ ok: true, atom, checks: ["native ComboLBox selection", "no global input", "PowerShell compiles"] }, null, 2));
