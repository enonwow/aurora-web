#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const args=process.argv.slice(2);
if(args.length!==0&&(args.length!==2||args[0]!=='--includeHiddenFrameHwnd'||!/^\d+$/.test(args[1])||Number(args[1])<=0))throw Error('Expected optional exact --includeHiddenFrameHwnd');
const hiddenFrameHwnd=args.length===2?args[1]:'0';

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
$hiddenFrameHwnd=[int64]$env:AURORA_TOOLSET_INSPECT_HIDDEN_FRAME_HWND
$script:windows=@();[void][AuroraVisibleWindows]::EnumWindows([AuroraVisibleWindows+E]{param($h,$l);[uint32]$p=0;[void][AuroraVisibleWindows]::GetWindowThreadProcessId($h,[ref]$p);if($p-eq$pidValue){$visible=[AuroraVisibleWindows]::IsWindowVisible($h);$cls=C $h;if($visible-or($h.ToInt64()-eq$hiddenFrameHwnd-and$cls-eq'TfrmFrame')){$script:windows+=[pscustomobject]@{hwnd=$h.ToInt64();className=$cls;text=T $h;visible=$visible}}};$true},[IntPtr]::Zero)
[pscustomobject]@{ok=$true;processId=$pidValue;responding=$ps[0].Responding;windows=$script:windows;safety=@{readOnly=$true;usesGlobalCursor=$false;usesGlobalMouse=$false;usesGlobalKeyboard=$false}}|ConvertTo-Json -Depth 5 -Compress
`;

const output = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", source], {
  encoding: "utf8",
  windowsHide: true,
  env: {...process.env,AURORA_TOOLSET_INSPECT_HIDDEN_FRAME_HWND:hiddenFrameHwnd},
  timeout: 30_000,
});
console.log(JSON.stringify(JSON.parse(output.trim()), null, 2));
