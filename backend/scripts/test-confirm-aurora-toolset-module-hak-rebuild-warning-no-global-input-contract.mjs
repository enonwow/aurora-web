#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const atom = resolve("backend/scripts/confirm-aurora-toolset-module-hak-rebuild-warning-no-global-input.mjs");
const source = readFileSync(atom, "utf8");

assert.match(source, /change the list of Hak \(Paks\|Files\) used by this module/i);
assert.match(source, /full build/i);
assert.match(source, /Are you sure you wish to continue/i);
assert.match(source, /&Yes|&Tak/);
assert.match(source, /warning_semantics_unverified/);
assert.match(source, /warning_affirmative_button_unverified/);
assert.match(source, /warning_transition_unverified/);
assert.match(source, /buildStarted/);
assert.doesNotMatch(source, /AddSeconds\(60\)/);
assert.match(source, /PostMessage/);
assert.doesNotMatch(source, /SendKeys|SendInput|SetCursorPos/);

const parseScript = "$path=$env:ATOM;$text=Get-Content -Raw $path;$marker='const source = String.raw'+[char]96;$start=$text.IndexOf($marker);if($start-lt0){throw 'source_marker_missing'};$start+=$marker.Length;$end=$text.IndexOf(([char]96+';'),$start);if($end-lt0){throw 'source_terminator_missing'};[void][ScriptBlock]::Create($text.Substring($start,$end-$start));'powershell_source_parse_ok'";
const output = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", parseScript], { encoding: "utf8", env: { ...process.env, ATOM: atom } });
assert.match(output, /powershell_source_parse_ok/);
