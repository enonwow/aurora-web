#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const options = parseArgs(process.argv.slice(2));
const moduleName = required(options.module, "--module");
const source = String.raw`
$ErrorActionPreference='Stop';Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;
public static class ATNM{public delegate bool E(IntPtr h,IntPtr l);[DllImport("user32.dll")]public static extern bool EnumWindows(E c,IntPtr l);[DllImport("user32.dll")]public static extern bool IsWindowVisible(IntPtr h);[DllImport("user32.dll")]public static extern bool IsWindowEnabled(IntPtr h);[DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);[DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetWindowText(IntPtr h,StringBuilder b,int n);[DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetClassName(IntPtr h,StringBuilder b,int n);}
'@
function T([IntPtr]$h){$b=[Text.StringBuilder]::new(512);[void][ATNM]::GetWindowText($h,$b,512);$b.ToString()};function C([IntPtr]$h){$b=[Text.StringBuilder]::new(128);[void][ATNM]::GetClassName($h,$b,128);$b.ToString()}
$ps=@(Get-Process nwtoolset -ErrorAction SilentlyContinue);if($ps.Count-ne1){throw "expected_one_toolset_process:$($ps.Count)"};[uint32]$pid=$ps[0].Id
$script:w=@();[void][ATNM]::EnumWindows([ATNM+E]{param($h,$l);[uint32]$p=0;[void][ATNM]::GetWindowThreadProcessId($h,[ref]$p);if($p-eq$pid-and[ATNM]::IsWindowVisible($h)){$script:w+=[pscustomobject]@{hwnd=$h;className=C $h;text=T $h;enabled=[ATNM]::IsWindowEnabled($h)}};$true},[IntPtr]::Zero)
$frame=@($script:w|Where-Object{$_.className-eq'TfrmFrame'-and$_.text.TrimEnd('*').EndsWith(" - $env:MODULE",[StringComparison]::OrdinalIgnoreCase)});if($frame.Count-ne1){throw "exact_module_frame_missing:$($frame.Count)"};$screen=[Windows.Forms.Screen]::FromHandle($frame[0].hwnd);if($screen.Primary-or$screen.DeviceName-ne'\\.\DISPLAY1'){throw "module_not_on_non_primary_display:$($screen.DeviceName)"};if(-not$frame[0].enabled){throw 'module_frame_disabled_by_modal'}
$unexpected=@($script:w|Where-Object{$_.className-notin@('TfrmFrame','TApplication')});if($unexpected.Count-ne0){throw ('visible_toolset_modal_or_popup:'+($unexpected|ForEach-Object{"$($_.className):$($_.text):$($_.hwnd.ToInt64())"})-join'|')}
[pscustomobject]@{ok=$true;processId=$pid;frameHwnd=$frame[0].hwnd.ToInt64();module=$env:MODULE;visibleToolsetWindows=@($script:w|ForEach-Object{[pscustomobject]@{hwnd=$_.hwnd.ToInt64();className=$_.className;text=$_.text;enabled=$_.enabled}});monitor=[pscustomobject]@{deviceName=$screen.DeviceName;primary=$screen.Primary};safety=[pscustomobject]@{readOnly=$true;usesGlobalCursor=$false;usesGlobalKeyboard=$false;usesGlobalMouse=$false;windowMessagesSent=$false;processMemoryWrites=$false}}|ConvertTo-Json -Depth 6 -Compress
`;
const output = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", source], { encoding: "utf8", windowsHide: true, timeout: 30_000, env: { ...process.env, MODULE: moduleName } });
const result = JSON.parse(output.trim());
if (options.out) {
  const outPath = resolve(options.out);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
}
console.log(JSON.stringify(result, null, 2));

function parseArgs(args){const out={};for(let i=0;i<args.length;i+=2){const key=args[i],value=args[i+1];if(!key?.startsWith("--")||value===undefined)throw new Error(`Expected --name <value> near ${key??"end"}.`);out[key.slice(2)]=value;}return out;}
function required(value,name){const text=String(value??"").trim();if(!text)throw new Error(`${name} is required.`);return text;}
