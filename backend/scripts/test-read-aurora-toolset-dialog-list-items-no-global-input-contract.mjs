#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
const atom = resolve("backend/scripts/read-aurora-toolset-dialog-list-items-no-global-input.mjs");
const result = JSON.parse(execFileSync(process.execPath, [atom, "--dialogClass", "TdlgModuleWizard", "--dialogTitle", "Module Wizard", "--compileOnly", "true"], { encoding: "utf8", windowsHide: true }).trim());
assert.deepEqual(result, { ok: true, mode: "compile-only" });
