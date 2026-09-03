#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const route = readFileSync(resolve(root, "backend/scripts/close-aurora-toolset-stale-build-session.mjs"), "utf8");
const atom = readFileSync(resolve(root, "backend/scripts/close-aurora-toolset-window-no-global-input.mjs"), "utf8");
assert.match(route, /userAuthorizedClose !== "true"/);
assert.match(route, /TOOLSET_CLOSE_AUTHORIZATION_NOT_BOUND_TO_PID/);
assert.match(route, /TdlgVerifyModule/);
assert.match(route, /Build Module/);
assert.match(route, /STALE_BUILD_CLOSE_CONFIRMATION_PENDING/);
assert.match(route, /--expectedPid/);
assert.match(route, /forceStop: false/);
assert.match(atom, /expected_exact_toolset_pid_mismatch/);
assert.match(atom, /PostMessage/);
assert.doesNotMatch(route, /Stop-Process|SendInput|SetCursorPos|SendKeys/);
const observer = readFileSync(resolve(root, "backend/scripts/observe-aurora-toolset-stale-build-close-confirmations.mjs"), "utf8");
assert.match(observer, /postsNoMessages/);
assert.match(observer, /doesNotChooseConfirmation/);
console.log(JSON.stringify({ ok: true, status: "stale_build_session_close_contract_valid" }));
