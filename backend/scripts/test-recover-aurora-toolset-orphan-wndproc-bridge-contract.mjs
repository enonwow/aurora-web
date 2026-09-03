#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve("scripts/recover-aurora-toolset-orphan-wndproc-bridge-no-global-input.mjs"), "utf8");
assert.match(source, /orphan_bridge_signature_mismatch/);
assert.match(source, /orphan_bridge_message_mismatch/);
assert.match(source, /wndproc_restore_readback_mismatch/);
assert.match(source, /VirtualFreeEx\(\$process,.*\$orphan/);
assert.match(source, /usesGlobalCursor=\$false/);
assert.doesNotMatch(source, /SendKeys|SendInput|SetCursorPos/);
console.log(JSON.stringify({ ok: true, status: "aurora_toolset_orphan_wndproc_recovery_contract_valid" }));
