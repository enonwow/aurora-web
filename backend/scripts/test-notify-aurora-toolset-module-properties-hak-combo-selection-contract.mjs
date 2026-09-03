#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const atom = resolve("backend/scripts/notify-aurora-toolset-module-properties-hak-combo-selection-no-global-input.mjs");
const source = readFileSync(atom, "utf8");

assert.match(source, /GetDlgCtrlID/);
assert.match(source, /GetParent/);
assert.match(source, /CB_GETCURSEL|0x0147/);
assert.match(source, /CB_GETLBTEXTLEN|0x0149/);
assert.match(source, /CB_GETLBTEXT|0x0148/);
assert.match(source, /CBN_SELCHANGE/);
assert.match(source, /0x0111/);
assert.match(source, /hak_combo_selection_change_add_not_enabled/);
assert.match(source, /HAK ListBox remains empty/);
assert.doesNotMatch(source, /PostMessage\(/);
assert.doesNotMatch(source, /SM \$candidate\.combo\.h 0x014E/);
assert.doesNotMatch(source, /SetWindowText/);

// This executes the atom's JavaScript template rendering before compiling the
// emitted PowerShell. Static extraction would miss a JavaScript ${...}
// interpolation failure before PowerShell or Toolset is reached.
const rendered = JSON.parse(execFileSync("node", [atom, "m2a_m0_proof", "--render-only"], { encoding: "utf8" }));
assert.equal(rendered.ok, true);
assert.equal(rendered.renderOnly, true);
assert.match(rendered.source, /\$\(\$index\):\$\(\$length\)/);
assert.match(rendered.source, /index=\$\(\$selectedAfter\):text=\$\(\$selectedTextAfter\):list=\$\(\$listAfter\)/);
const parseScript = "[void][ScriptBlock]::Create($env:SOURCE);'powershell_source_parse_ok'";
const output = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", parseScript], { encoding: "utf8", env: { ...process.env, SOURCE: rendered.source } });
assert.match(output, /powershell_source_parse_ok/);
