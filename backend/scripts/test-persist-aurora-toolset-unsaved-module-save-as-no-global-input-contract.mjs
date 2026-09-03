#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const atom = resolve("backend/scripts/persist-aurora-toolset-unsaved-module-save-as-no-global-input.mjs");
const result = JSON.parse(execFileSync(process.execPath, [atom, "--module", "m2a_vs_m0", "--output", "C:\\Users\\enonw\\Documents\\Neverwinter Nights\\modules\\m2a_vs_m0.mod", "--expectedFrameTitle", "BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17*", "--compileOnly", "true"], { encoding: "utf8", windowsHide: true }).trim());
assert.deepEqual(result, { ok: true, mode: "compile-only" });
const source = readFileSync(atom, "utf8");
assert.match(source, /TdlgModuleSelect/);
assert.match(source, /save_as_destination_exists/);
assert.match(source, /\$dialog=\$null;try\{/);
assert.match(source, /PostMessage\(\$cancel\[0\]\.h,0x00F5/);
assert.doesNotMatch(source, /SetCursorPos|SendInput|SendKeys|SetWindowPos/);
