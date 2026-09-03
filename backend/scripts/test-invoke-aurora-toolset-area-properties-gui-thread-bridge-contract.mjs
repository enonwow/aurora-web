#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve("scripts/invoke-aurora-toolset-area-properties-gui-thread-bridge.mjs"), "utf8");
assert.match(source, /dialogAction/);
assert.match(source, /\["cancel", "ok"\]/);
assert.match(source, /DIALOG_ACTION/);
assert.match(source, /exact_dialog_action_button_missing/);
assert.match(source, /closedWith=\$env:DIALOG_ACTION/);
assert.match(source, /semanticDeltaClaimed=\$false/);
assert.match(source, /onEnterScript/);
assert.match(source, /ON_ENTER_SCRIPT/);
assert.match(source, /cbOnEnter/);
assert.match(source, /cbOnScriptEnter/);
assert.match(source, /function I32/);
assert.match(source, /2147483648/);
assert.match(source, /4294967296/);
assert.doesNotMatch(source, /\$bits-ge0x80000000/);
assert.match(source, /CB_FINDSTRINGEXACT/);
assert.match(source, /SendMessageTimeoutText/);
assert.match(source, /CB_GETLBTEXT/);
assert.match(source, /SendMessageTimeoutBuilder/);
assert.match(source, /selected_item_readback_timeout/);
assert.match(source, /on_enter_script_population_failed/);
assert.match(source, /on_enter_script_resource_missing/);
assert.match(source, /on_enter_script_readback_mismatch/);
assert.match(source, /scriptBinding=\$scriptBinding/);
assert.match(source, /\$hasOnEnterScript=-not \[string\]::IsNullOrEmpty\(\$env:ON_ENTER_SCRIPT\)/);
assert.match(source, /if\(\$hasOnEnterScript\)/);
assert.match(source, /semanticDeltaClaimed=\$hasOnEnterScript/);
assert.doesNotMatch(source, /\$env:ON_ENTER_SCRIPT-ne''/);
assert.doesNotMatch(source, /SendKeys|SendInput|SetCursorPos/);
assert.doesNotMatch(source, /\$buttonText:/);

console.log(JSON.stringify({ ok: true, status: "aurora_toolset_area_properties_gui_thread_bridge_contract_valid" }));
