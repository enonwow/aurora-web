#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve("backend/scripts/select-aurora-toolset-creature-properties-tab-no-global-input.mjs"), "utf8");
assert.match(source, /TCM_GETITEMW|0x133C/u);
assert.match(source, /TCM_GETITEMRECT|0x130A/u);
assert.match(source, /ReadProcessMemory/u);
assert.match(source, /target_tab_not_active/u);
assert.doesNotMatch(source, /const positions =/u);
assert.match(source, /Remove-Item Alias:R -Force/u);
