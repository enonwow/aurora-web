#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve("backend/scripts/set-aurora-toolset-dialog-edit-text-validated.mjs"), "utf8");

// Regression contract for the observed blank-after-WM_SETTEXT Module Wizard field.
// This is deliberately offline: it verifies the canonical fallback branch without
// touching the preserved live Toolset session.
assert.match(source, /SendMessageTimeoutText/);
assert.match(source, /wm_settext_send_timeout/);
assert.match(source, /SetWindowText/);
assert.match(source, /setwindowtext_fallback/);
assert.match(source, /edit_readback_mismatch/);
assert.match(source, /edit_expected_before_mismatch/);
assert.match(source, /EXPECTED_BEFORE/);
assert.match(source, /__AURORA_EXPECT_EMPTY_EDIT_V1__/);
assert.doesNotMatch(source, /SetCursorPos|SendInput|SendKeys|mouse_event|keybd_event/);

const environmentProbe = execFileSync("powershell.exe", ["-NoProfile", "-Command", "@{empty=($env:EMPTY -eq $null); token=$env:TOKEN}|ConvertTo-Json -Compress"], { encoding: "utf8", windowsHide: true, env: { ...process.env, EMPTY: "", TOKEN: "__AURORA_EXPECT_EMPTY_EDIT_V1__" } });
const environment = JSON.parse(environmentProbe);
assert.equal(environment.empty, true);
assert.equal(environment.token, "__AURORA_EXPECT_EMPTY_EDIT_V1__");
