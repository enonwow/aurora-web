#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./set-aurora-toolset-script-editor-source-no-global-input.mjs", import.meta.url), "utf8");
assert.match(source, /0x00B1/u);
assert.match(source, /0x00C2/u);
assert.match(source, /EM_REPLACESEL/u);
assert.doesNotMatch(source, /SetWindowText/u);
assert.doesNotMatch(source, /foreach\(\$ch in \$input\.ToCharArray\(\)\)/u);
assert.doesNotMatch(source, /Windows\.Forms\.Clipboard/u);
assert.match(source, /script_main_count/u);
assert.match(source, /script_source_readback_mismatch/u);
process.stdout.write("Toolset Script Editor source setter contract: PASS\n");
