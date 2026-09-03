#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const atom = resolve("backend/scripts/probe-aurora-toolset-edit-menu-popup-no-global-input.mjs");
const source = readFileSync(atom, "utf8");

assert.match(source, /SC_KEYMENU/);
assert.match(source, /0x0112/);
assert.match(source, /0xF100/);
assert.match(source, /menuMnemonic='e'/);
assert.match(source, /GetWindow\(.*4/);
assert.match(source, /GetParent/);
assert.match(source, /0x01E1/);
assert.match(source, /0x0100/);
assert.match(source, /0x0101/);
assert.match(source, /popup_close_not_durable/);
assert.match(source, /usesGlobalCursor=\$false/);
assert.match(source, /usesGlobalKeyboard=\$false/);
assert.match(source, /usesGlobalMouse=\$false/);
