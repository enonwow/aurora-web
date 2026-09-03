#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const root = resolve(process.cwd());
const evidence = resolve(root, "backend/docs/aurora-reverse/evidence/stage4-live-2026-07-16");
const outputIndex = process.argv.indexOf("--out");
const output = resolve(outputIndex >= 0 ? process.argv[outputIndex + 1] : `${evidence}/stage4-completion-validation.json`);
const files = {
  core: `${evidence}/stage4-core-validation.json`,
  npcInventory: `${evidence}/s04-03-item-npc-inventory/manifest.json`,
  placeableInventory: `${evidence}/s04-04-inventory-placeable/manifest.json`,
};

const reports = Object.fromEntries(Object.entries(files).map(([key, path]) => [key, JSON.parse(readFileSync(path, "utf8"))]));
const expected = Array.from({ length: 8 }, (_, index) => `AUR-S04-${String(index + 1).padStart(2, "0")}`);
const accepted = [...new Set([...reports.core.acceptedFunctions, ...reports.npcInventory.acceptedFunctions, ...reports.placeableInventory.acceptedFunctions])].sort();
const live = liveState();
const checks = {
  coreAccepted: reports.core.ok === true,
  npcInventoryAccepted: reports.npcInventory.ok === true,
  placeableInventoryAccepted: reports.placeableInventory.ok === true,
  allEightExact: JSON.stringify(accepted) === JSON.stringify(expected),
  oneRespondingToolset: live.toolsetCount === 1 && live.toolset?.responding === true,
  exactWorkingModuleOpen: live.toolset?.frameTitle?.endsWith(" - codex_npc_item_live_20260713.mod") === true,
  toolsetOnNonPrimaryDisplay: live.toolset?.monitor?.primary === false,
  nwmainClosed: live.nwmainCount === 0,
};
const ok = Object.values(checks).every(Boolean);
const report = {
  version: "aurora-toolset-stage4-completion/v1",
  generatedAt: new Date().toISOString(),
  ok,
  stage: 4,
  totalFunctions: 8,
  acceptedFunctions: accepted,
  checks,
  live,
  evidence: Object.fromEntries(Object.entries(files).map(([key, path]) => [key, relative(path)])),
};

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (!ok) process.exitCode = 1;

function liveState() {
  const source = String.raw`
$ErrorActionPreference='Stop';Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;public static class S4L{public delegate bool E(IntPtr h,IntPtr l);[DllImport("user32.dll")]public static extern bool EnumWindows(E c,IntPtr l);[DllImport("user32.dll")]public static extern bool IsWindowVisible(IntPtr h);[DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);[DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetWindowText(IntPtr h,StringBuilder b,int n);[DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetClassName(IntPtr h,StringBuilder b,int n);}
'@
function T([IntPtr]$h){$b=[Text.StringBuilder]::new(1024);[void][S4L]::GetWindowText($h,$b,$b.Capacity);$b.ToString()};function C([IntPtr]$h){$b=[Text.StringBuilder]::new(128);[void][S4L]::GetClassName($h,$b,$b.Capacity);$b.ToString()}
$ts=@(Get-Process nwtoolset -ErrorAction SilentlyContinue);$nw=@(Get-Process nwmain -ErrorAction SilentlyContinue);$value=$null;if($ts.Count-eq1){[uint32]$pid=$ts[0].Id;$script:f=@();[void][S4L]::EnumWindows([S4L+E]{param($h,$l);[uint32]$p=0;[void][S4L]::GetWindowThreadProcessId($h,[ref]$p);if($p-eq$pid-and[S4L]::IsWindowVisible($h)-and(C $h)-eq'TfrmFrame'){$script:f+=$h};$true},[IntPtr]::Zero);if($script:f.Count-eq1){$screen=[Windows.Forms.Screen]::FromHandle($script:f[0]);$value=[pscustomobject]@{pid=$pid;responding=$ts[0].Responding;frameHwnd=$script:f[0].ToInt64();frameTitle=(T $script:f[0]);monitor=[pscustomobject]@{deviceName=$screen.DeviceName;primary=$screen.Primary}}}}
[pscustomobject]@{toolsetCount=$ts.Count;nwmainCount=$nw.Count;toolset=$value}|ConvertTo-Json -Depth 5 -Compress
`;
  return JSON.parse(execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", source], { encoding: "utf8", windowsHide: true, timeout: 30_000 }).trim());
}
function relative(path) { return path.slice(root.length + 1).replaceAll("\\", "/"); }
