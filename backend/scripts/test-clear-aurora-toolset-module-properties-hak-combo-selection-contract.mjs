#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const atom = resolve("backend/scripts/clear-aurora-toolset-module-properties-hak-combo-selection-no-global-input.mjs");
const source = readFileSync(atom, "utf8");
assert.match(source, /function Signed32/);
assert.match(source, /SM \$candidate\.combo\.h 0x014E \(\[IntPtr\]\(-1\)\)/);
assert.match(source, /hak_combo_clear_prestate_invalid/);
assert.match(source, /hak_combo_clear_readback_invalid/);
assert.match(source, /targeted CB_SETCURSEL\(-1\) only/);
assert.doesNotMatch(source, /PostMessage\(/);
const parseScript = "$path=$env:ATOM;$text=Get-Content -Raw $path;$marker='const source = String.raw'+[char]96;$start=$text.IndexOf($marker);if($start-lt0){throw 'source_marker_missing'};$start+=$marker.Length;$end=$text.IndexOf(([char]96+';'),$start);if($end-lt0){throw 'source_terminator_missing'};[void][ScriptBlock]::Create($text.Substring($start,$end-$start));'powershell_source_parse_ok'";
const output = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", parseScript], { encoding: "utf8", env: { ...process.env, ATOM: atom } });
assert.match(output, /powershell_source_parse_ok/);
