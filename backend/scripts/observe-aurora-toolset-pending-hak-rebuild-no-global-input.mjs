#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const moduleName = required(process.argv[2], "<module>");
const source = String.raw`
$ErrorActionPreference='Stop'
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;
public static class PendingHakBuild {
 public delegate bool E(IntPtr h,IntPtr l);
 [DllImport("user32.dll")]public static extern bool EnumWindows(E c,IntPtr l);
 [DllImport("user32.dll")]public static extern bool EnumChildWindows(IntPtr p,E c,IntPtr l);
 [DllImport("user32.dll")]public static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll")]public static extern bool IsWindowEnabled(IntPtr h);
 [DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetWindowText(IntPtr h,StringBuilder b,int n);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetClassName(IntPtr h,StringBuilder b,int n);
}
'@
function Text([IntPtr]$h){$b=[Text.StringBuilder]::new(1024);[void][PendingHakBuild]::GetWindowText($h,$b,$b.Capacity);$b.ToString()}
function WindowClass([IntPtr]$h){$b=[Text.StringBuilder]::new(128);[void][PendingHakBuild]::GetClassName($h,$b,$b.Capacity);$b.ToString()}
function Tops([uint32]$toolsetPid){$script:tops=@();[void][PendingHakBuild]::EnumWindows([PendingHakBuild+E]{param($h,$l);[uint32]$p=0;[void][PendingHakBuild]::GetWindowThreadProcessId($h,[ref]$p);if($p-eq$toolsetPid-and[PendingHakBuild]::IsWindowVisible($h)){$script:tops+=[pscustomobject]@{h=$h;hwnd=$h.ToInt64();className=WindowClass $h;text=Text $h;enabled=[PendingHakBuild]::IsWindowEnabled($h)}};$true},[IntPtr]::Zero);@($script:tops)}
function Kids([IntPtr]$parent){$script:kids=@();[void][PendingHakBuild]::EnumChildWindows($parent,[PendingHakBuild+E]{param($h,$l);if([PendingHakBuild]::IsWindowVisible($h)){$script:kids+=[pscustomobject]@{h=$h;hwnd=$h.ToInt64();className=WindowClass $h;text=Text $h;enabled=[PendingHakBuild]::IsWindowEnabled($h)}};$true},[IntPtr]::Zero);@($script:kids)}
$ps=@(Get-Process nwtoolset -ErrorAction SilentlyContinue);if($ps.Count-ne1-or-not$ps[0].Responding){throw "expected_one_responding_toolset:$($ps.Count)"};[uint32]$toolsetPid=$ps[0].Id
$windows=@(Tops $toolsetPid);$frames=@($windows|Where-Object{$_.className-eq'TfrmFrame'-and$_.text-eq"BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - $env:MODULE.mod*"});if($frames.Count-ne1){throw ('pending_hak_rebuild_frame_unverified:'+($windows|ConvertTo-Json -Compress))}
$build=@($windows|Where-Object{$_.className-eq'TdlgVerifyModule'-and$_.text-eq'Build Module'});$allowed=@($windows|Where-Object{$_.className-notin@('TfrmFrame','TApplication','TdlgVerifyModule','TfrmIFOProp')})
if($allowed.Count-ne0){throw ('pending_hak_rebuild_unexpected_modal:'+($windows|ConvertTo-Json -Compress))}
if($build.Count-eq1){$controls=@(Kids $build[0].h);$done=@($controls|Where-Object{$_.className-in@('TButton','Button')-and$_.text-eq'Done'-and$_.enabled});$buildButton=@($controls|Where-Object{$_.className-in@('TButton','Button')-and$_.text-eq'Build'-and-not$_.enabled});$settledCandidate=($done.Count-eq1-and$buildButton.Count-eq1);$status=if($settledCandidate){'settled_candidate'}else{'building'}}elseif($build.Count-eq0){$controls=@();$settledCandidate=$false;$status='settled'}else{throw ('pending_hak_rebuild_build_modal_ambiguous:'+($windows|ConvertTo-Json -Compress))}
[pscustomobject]@{ok=$true;processId=$toolsetPid;module=$env:MODULE;status=$status;frame=$frames[0];buildModal=if($build.Count-eq1){$build[0]}else{$null};buildControls=if($build.Count-eq1){[pscustomobject]@{doneEnabled=($done.Count-eq1);buildDisabled=($buildButton.Count-eq1)}}else{$null};windows=$windows;safety=[pscustomobject]@{readOnly=$true;usesGlobalCursor=$false;usesGlobalKeyboard=$false;usesGlobalMouse=$false;postsNoMessages=$true;doesNotVerifyHakPersistence=$true}}|ConvertTo-Json -Depth 6 -Compress
`;
const output = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", source], { encoding: "utf8", windowsHide: true, timeout: 15_000, maxBuffer: 1024 * 1024, env: { ...process.env, MODULE: moduleName } });
const observation = JSON.parse(output.trim());
if (observation.status === "settled_candidate") {
  const listAtom = resolve(import.meta.dirname, "read-aurora-toolset-dialog-list-items-no-global-input.mjs");
  const listOutput = execFileSync(process.execPath, [listAtom, "--dialogClass", "TdlgVerifyModule", "--dialogTitle", "Build Module", "--expectedCount", "1"], { encoding: "utf8", windowsHide: true, timeout: 15_000, maxBuffer: 1024 * 1024 });
  const result = JSON.parse(listOutput.trim());
  if (JSON.stringify(result.items) !== JSON.stringify(["No errors found"])) throw new Error(`pending_hak_rebuild_settled_result_unverified:${JSON.stringify(result)}`);
  observation.status = "settled";
  observation.buildResult = result;
}
console.log(JSON.stringify(observation, null, 2));
function required(value, name){const result=String(value??"").trim();if(!/^[a-z0-9_]{1,32}$/iu.test(result))throw new Error(`${name} must be an Aurora resref.`);return result;}
