#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
  resolve("backend/scripts/commit-aurora-toolset-creature-properties-no-global-input.mjs"),
  "utf8",
);

assert.doesNotMatch(
  source,
  /function Tops\(\[uint32\]\$pid\)/u,
  "PowerShell's $PID automatic variable is read-only and cannot be a function parameter",
);
assert.doesNotMatch(
  source,
  /\[uint32\]\$pid=\$ps\[0\]\.Id/u,
  "the Toolset process ID must not be assigned to PowerShell's $PID automatic variable",
);
assert.match(source, /function Tops\(\[uint32\]\$toolsetProcessId\)/u);
assert.match(source, /\[uint32\]\$toolsetProcessId=\$ps\[0\]\.Id/u);
assert.doesNotMatch(source, /SendKeys|SetCursorPos|mouse_event|keybd_event|WM_CHAR|0x0102/iu);

console.log(JSON.stringify({ ok: true, contract: "creature-properties-commit-no-readonly-pid" }));
