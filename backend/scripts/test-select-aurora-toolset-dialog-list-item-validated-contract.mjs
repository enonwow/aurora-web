#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const atom = resolve("backend/scripts/select-aurora-toolset-dialog-list-item-validated.mjs");
const result = JSON.parse(execFileSync(process.execPath, [atom, "--dialogClass", "TdlgAreaWizard", "--dialogTitle", "Area Wizard", "--targetText", "MicroSet", "--expectedCount", "33", "--compileOnly", "true"], { encoding: "utf8", windowsHide: true }).trim());

assert.deepEqual(result, { ok: true, mode: "compile-only" });
