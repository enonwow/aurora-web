#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const atom=resolve("backend/scripts/dismiss-aurora-toolset-build-module-done-no-global-input.mjs");
const source=readFileSync(atom,"utf8");
assert.match(source,/TdlgVerifyModule/);assert.match(source,/Build Module/);assert.match(source,/text-eq'Done'/);assert.match(source,/text-eq'Build'-and-not\$_.enabled/);assert.match(source,/0x00F5/);assert.match(source,/build_done_modal_did_not_close/);assert.doesNotMatch(source,/SendInput|SetCursorPos|SendKeys/);
const parse="$path=$env:ATOM;$text=Get-Content -Raw $path;$marker='const source = String.raw'+[char]96;$start=$text.IndexOf($marker);if($start-lt0){throw 'source_marker_missing'};$start+=$marker.Length;$end=$text.IndexOf(([char]96+';'),$start);if($end-lt0){throw 'source_terminator_missing'};[void][ScriptBlock]::Create($text.Substring($start,$end-$start));'powershell_source_parse_ok'";
assert.match(execFileSync("powershell.exe",["-NoProfile","-NonInteractive","-ExecutionPolicy","Bypass","-Command",parse],{encoding:"utf8",env:{...process.env,ATOM:atom}}),/powershell_source_parse_ok/);
