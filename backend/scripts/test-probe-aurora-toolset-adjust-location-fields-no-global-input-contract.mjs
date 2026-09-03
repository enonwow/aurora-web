import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = readFileSync(fileURLToPath(new URL("./probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", import.meta.url)), "utf8");
const focusExitSource = readFileSync(fileURLToPath(new URL("./focus-exit-aurora-toolset-adjust-location-xy-no-global-input.mjs", import.meta.url)), "utf8");
const focusTypeSource = readFileSync(fileURLToPath(new URL("./focus-type-aurora-toolset-adjust-location-xy-no-global-input.mjs", import.meta.url)), "utf8");

assert.match(source, /SendMessageTimeout/);
assert.match(source, /0x000D/);
assert.match(source, /wm_gettext_timeout/);
assert.match(source, /usesGlobalCursor=\$false/);
assert.match(source, /usesGlobalKeyboard=\$false/);
assert.match(source, /usesGlobalMouse=\$false/);
assert.doesNotMatch(source, /GetWindowText\(/);
assert.match(focusExitSource, /SendMessageTimeout/);
assert.match(focusExitSource, /0x000D/);
assert.match(focusExitSource, /wm_gettext_timeout/);
assert.doesNotMatch(focusExitSource, /GetWindowText\(/);
assert.match(focusTypeSource, /SendMessageTimeout/);
assert.match(focusTypeSource, /0x000D/);
assert.match(focusTypeSource, /wm_gettext_timeout/);
assert.doesNotMatch(focusTypeSource, /GetWindowText\(/);

console.log(JSON.stringify({ ok: true, contract: "adjust-location-probe-uses-bounded-wm-gettext/v1" }));
