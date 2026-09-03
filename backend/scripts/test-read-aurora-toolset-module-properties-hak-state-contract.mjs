#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const atom = resolve("backend/scripts/read-aurora-toolset-module-properties-hak-state-no-global-input.mjs");
const source = readFileSync(atom, "utf8");

assert.match(source, /CB_GETLBTEXTLEN|0x0149/);
assert.match(source, /CB_GETLBTEXT|0x0148/);
assert.match(source, /LB_GETTEXTLEN|0x018A/);
assert.match(source, /LB_GETTEXT|0x0189/);
assert.match(source, /function Signed32/);
assert.match(source, /hak_state_expected_one_combo_by_list_add_geometry/);
assert.match(source, /readOnly=\$true/);
assert.doesNotMatch(source, /PostMessage\(/);
assert.doesNotMatch(source, /SetWindowText/);

const parseScript = "$path=$env:ATOM;$text=Get-Content -Raw $path;$marker='const source = String.raw'+[char]96;$start=$text.IndexOf($marker);if($start-lt0){throw 'source_marker_missing'};$start+=$marker.Length;$end=$text.IndexOf(([char]96+';'),$start);if($end-lt0){throw 'source_terminator_missing'};[void][ScriptBlock]::Create($text.Substring($start,$end-$start));'powershell_source_parse_ok'";
const output = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", parseScript], { encoding: "utf8", env: { ...process.env, ATOM: atom } });
assert.match(output, /powershell_source_parse_ok/);
