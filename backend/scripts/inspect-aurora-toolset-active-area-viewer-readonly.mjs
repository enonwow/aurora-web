#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const options = parseArgs(process.argv.slice(2));
const moduleName = required(options.module, "--module");
const source = String.raw`
$ErrorActionPreference='Stop';Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;
public static class AAVI{
 public delegate bool E(IntPtr h,IntPtr l);
 [DllImport("user32.dll")]public static extern bool EnumWindows(E c,IntPtr l);
 [DllImport("user32.dll")]public static extern bool EnumChildWindows(IntPtr p,E c,IntPtr l);
 [DllImport("user32.dll")]public static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetWindowText(IntPtr h,StringBuilder b,int n);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetClassName(IntPtr h,StringBuilder b,int n);
}
'@
function T([IntPtr]$h){$b=[Text.StringBuilder]::new(512);[void][AAVI]::GetWindowText($h,$b,512);$b.ToString()}
function C([IntPtr]$h){$b=[Text.StringBuilder]::new(128);[void][AAVI]::GetClassName($h,$b,128);$b.ToString()}
$ps=@(Get-Process nwtoolset -ErrorAction SilentlyContinue);if($ps.Count-ne1-or-not$ps[0].Responding){throw 'expected_one_responding_toolset'};[uint32]$targetProcessId=$ps[0].Id
$script:frames=@();[void][AAVI]::EnumWindows([AAVI+E]{param($h,$l);[uint32]$p=0;[void][AAVI]::GetWindowThreadProcessId($h,[ref]$p);if($p-eq$targetProcessId-and[AAVI]::IsWindowVisible($h)-and(C $h)-eq'TfrmFrame'){$title=(T $h).TrimEnd();if($title.EndsWith('*')){$title=$title.Substring(0,$title.Length-1).TrimEnd()};if($title.EndsWith(" - $env:AAVI_MODULE",[StringComparison]::OrdinalIgnoreCase)){$script:frames+=$h}};$true},[IntPtr]::Zero)
if($script:frames.Count-ne1){throw ('exact_module_frame_missing:'+($script:frames.Count))};$frame=$script:frames[0];$screen=[Windows.Forms.Screen]::FromHandle($frame)
$script:viewers=@();[void][AAVI]::EnumChildWindows($frame,[AAVI+E]{param($h,$l);if([AAVI]::IsWindowVisible($h)-and(C $h)-eq'TfrmViewerArea'){$text=(T $h).Trim().TrimStart('-').Trim();$script:viewers+=[pscustomobject]@{hwnd=$h.ToInt64();text=$text}};$true},[IntPtr]::Zero)
if($script:viewers.Count-gt1){throw ('active_area_viewer_ambiguous:'+($script:viewers|ConvertTo-Json -Compress))}
$area=if($script:viewers.Count-eq1){$script:viewers[0].text.ToLowerInvariant()}else{$null};if($null-ne$area-and$area-notmatch'^[a-z0-9_]{1,16}$'){throw 'active_area_resref_invalid'}
[pscustomobject]@{ok=$true;processId=$targetProcessId;frameHwnd=$frame.ToInt64();areaResref=$area;viewerHwnd=if($script:viewers.Count-eq1){$script:viewers[0].hwnd}else{$null};viewerCount=$script:viewers.Count;monitor=[pscustomobject]@{deviceName=$screen.DeviceName;primary=$screen.Primary};safety=[pscustomobject]@{readOnly=$true;usesGlobalCursor=$false;usesGlobalKeyboard=$false;usesGlobalMouse=$false;windowMessagesSent=$false}}|ConvertTo-Json -Depth 4 -Compress
`;
const value = JSON.parse(execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", source], {
  encoding: "utf8", windowsHide: true, timeout: 15_000, maxBuffer: 1024 * 1024,
  env: { ...process.env, AAVI_MODULE: moduleName }, stdio: ["ignore", "pipe", "ignore"],
}).trim());
process.stdout.write(`${JSON.stringify(value)}\n`);

function parseArgs(argv) { const out = {}; for (let index = 0; index < argv.length; index += 2) { const key = argv[index], value = argv[index + 1]; if (!key?.startsWith("--") || value == null || value.startsWith("--")) throw new Error("arguments_invalid"); out[key.slice(2)] = value; } return out; }
function required(value, name) { if (typeof value !== "string" || value.length < 1 || value.length > 256 || value.includes("\0")) throw new Error(`${name}_invalid`); return value; }
