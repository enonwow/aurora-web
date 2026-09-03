#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const source = String.raw`
$ErrorActionPreference='Stop'
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;
public static class AuroraVisibleWindows {
  public delegate bool E(IntPtr h,IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumWindows(E c,IntPtr l);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);
  [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h,StringBuilder b,int n);
  [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr h,StringBuilder b,int n);
}
'@
function T([IntPtr]$h){$b=[Text.StringBuilder]::new(512);[void][AuroraVisibleWindows]::GetWindowText($h,$b,$b.Capacity);$b.ToString()}
function C([IntPtr]$h){$b=[Text.StringBuilder]::new(128);[void][AuroraVisibleWindows]::GetClassName($h,$b,$b.Capacity);$b.ToString()}
$ps=@(Get-Process nwtoolset -ErrorAction SilentlyContinue);if($ps.Count-ne1){throw "expected_one_toolset_process:$($ps.Count)"};[uint32]$pidValue=$ps[0].Id
$script:windows=@();[void][AuroraVisibleWindows]::EnumWindows([AuroraVisibleWindows+E]{param($h,$l);[uint32]$p=0;[void][AuroraVisibleWindows]::GetWindowThreadProcessId($h,[ref]$p);if($p-eq$pidValue-and[AuroraVisibleWindows]::IsWindowVisible($h)){$script:windows+=[pscustomobject]@{hwnd=$h.ToInt64();className=C $h;text=T $h}};$true},[IntPtr]::Zero)
[pscustomobject]@{ok=$true;processId=$pidValue;responding=$ps[0].Responding;windows=$script:windows;safety=@{readOnly=$true;usesGlobalCursor=$false;usesGlobalMouse=$false;usesGlobalKeyboard=$false}}|ConvertTo-Json -Depth 5 -Compress
`;

const output = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", source], {
  encoding: "utf8",
  windowsHide: true,
  timeout: 30_000,
});
console.log(JSON.stringify(JSON.parse(output.trim()), null, 2));
