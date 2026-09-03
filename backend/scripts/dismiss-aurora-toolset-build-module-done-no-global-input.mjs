#!/usr/bin/env node

import { execFileSync } from "node:child_process";

const moduleName = required(process.argv[2], "<module>");
const source = String.raw`
$ErrorActionPreference='Stop'
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;
public static class BuildDone {
 public delegate bool E(IntPtr h,IntPtr l);
 [DllImport("user32.dll")]public static extern bool EnumWindows(E c,IntPtr l);
 [DllImport("user32.dll")]public static extern bool EnumChildWindows(IntPtr p,E c,IntPtr l);
 [DllImport("user32.dll")]public static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll")]public static extern bool IsWindowEnabled(IntPtr h);
 [DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetWindowText(IntPtr h,StringBuilder b,int n);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetClassName(IntPtr h,StringBuilder b,int n);
 [DllImport("user32.dll",SetLastError=true)]public static extern bool PostMessage(IntPtr h,uint m,IntPtr w,IntPtr l);
}
'@
function Text([IntPtr]$h){$b=[Text.StringBuilder]::new(1024);[void][BuildDone]::GetWindowText($h,$b,$b.Capacity);$b.ToString()}
function WindowClass([IntPtr]$h){$b=[Text.StringBuilder]::new(128);[void][BuildDone]::GetClassName($h,$b,$b.Capacity);$b.ToString()}
function Tops([uint32]$p){$script:tops=@();[void][BuildDone]::EnumWindows([BuildDone+E]{param($h,$l);[uint32]$owner=0;[void][BuildDone]::GetWindowThreadProcessId($h,[ref]$owner);if($owner-eq$p-and[BuildDone]::IsWindowVisible($h)){$script:tops+=[pscustomobject]@{h=$h;hwnd=$h.ToInt64();className=WindowClass $h;text=Text $h;enabled=[BuildDone]::IsWindowEnabled($h)}};$true},[IntPtr]::Zero);@($script:tops)}
function Kids([IntPtr]$p){$script:kids=@();[void][BuildDone]::EnumChildWindows($p,[BuildDone+E]{param($h,$l);$script:kids+=[pscustomobject]@{h=$h;hwnd=$h.ToInt64();className=WindowClass $h;text=Text $h;visible=[BuildDone]::IsWindowVisible($h);enabled=[BuildDone]::IsWindowEnabled($h)};$true},[IntPtr]::Zero);@($script:kids)}
$ps=@(Get-Process nwtoolset -ErrorAction SilentlyContinue);if($ps.Count-ne1-or-not$ps[0].Responding){throw "expected_one_responding_toolset:$($ps.Count)"};[uint32]$toolsetPid=$ps[0].Id
$before=@(Tops $toolsetPid);$frame=@($before|Where-Object{$_.className-eq'TfrmFrame'-and$_.text-eq"BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - $env:MODULE.mod*"});$build=@($before|Where-Object{$_.className-eq'TdlgVerifyModule'-and$_.text-eq'Build Module'});$unexpected=@($before|Where-Object{$_.className-notin@('TfrmFrame','TApplication','TdlgVerifyModule','TfrmIFOProp')})
if($frame.Count-ne1-or$build.Count-ne1-or$unexpected.Count-ne0){throw ('build_done_modal_stack_unverified:'+($before|ConvertTo-Json -Compress))}
$controls=@(Kids $build[0].h|Where-Object{$_.visible});$done=@($controls|Where-Object{$_.className-in@('TButton','Button')-and$_.text-eq'Done'-and$_.enabled});$start=@($controls|Where-Object{$_.className-in@('TButton','Button')-and$_.text-eq'Build'-and-not$_.enabled})
if($done.Count-ne1-or$start.Count-ne1){throw ('build_done_controls_unverified:'+($controls|ConvertTo-Json -Compress))}
if(-not[BuildDone]::PostMessage($done[0].h,0x00F5,[IntPtr]::Zero,[IntPtr]::Zero)){throw 'build_done_post_failed'}
$deadline=[DateTime]::UtcNow.AddSeconds(5);$after=@();do{Start-Sleep -Milliseconds 80;$after=@(Tops $toolsetPid)}while(@($after|Where-Object{$_.className-eq'TdlgVerifyModule'-and$_.text-eq'Build Module'}).Count-ne0-and[DateTime]::UtcNow-lt$deadline)
if(@($after|Where-Object{$_.className-eq'TdlgVerifyModule'-and$_.text-eq'Build Module'}).Count-ne0){throw ('build_done_modal_did_not_close:'+($after|ConvertTo-Json -Compress))}
$final=@($after|Where-Object{$_.className-eq'TfrmFrame'-and$_.text-eq"BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - $env:MODULE.mod*"});$remaining=@($after|Where-Object{$_.className-notin@('TfrmFrame','TApplication','TfrmIFOProp')})
if($final.Count-ne1-or$remaining.Count-ne0-or-not(Get-Process -Id $toolsetPid).Responding){throw ('build_done_final_state_unverified:'+($after|ConvertTo-Json -Compress))}
[pscustomobject]@{ok=$true;processId=$toolsetPid;module=$env:MODULE;done=[pscustomobject]@{hwnd=$done[0].hwnd;text=$done[0].text;buildDisabled=$true};frame=$final[0];windows=$after;safety=[pscustomobject]@{usesGlobalCursor=$false;usesGlobalKeyboard=$false;usesGlobalMouse=$false;method='exact settled Build Module controls plus targeted Done BM_CLICK only'}}|ConvertTo-Json -Depth 6 -Compress
`;
const output = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", source], { encoding: "utf8", windowsHide: true, timeout: 15_000, maxBuffer: 1024 * 1024, env: { ...process.env, MODULE: moduleName } });
console.log(JSON.stringify(JSON.parse(output.trim()), null, 2));
function required(value, name){const result=String(value??"").trim();if(!/^[a-z0-9_]{1,32}$/iu.test(result))throw new Error(`${name} must be an Aurora resref.`);return result;}
