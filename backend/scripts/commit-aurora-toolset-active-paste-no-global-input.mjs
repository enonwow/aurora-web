#!/usr/bin/env node

import { execFileSync } from "node:child_process";

const options = parseArgs(process.argv.slice(2));
const moduleName = required(options.module, "--module");
const area = required(options.area, "--area");
const x = integer(options.x, "--x");
const y = integer(options.y, "--y");

const source = String.raw`
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System; using System.Text; using System.Runtime.InteropServices;
public static class AuroraPasteCommit {
 public delegate bool E(IntPtr h,IntPtr l);
 [DllImport("user32.dll")] public static extern bool EnumWindows(E c,IntPtr l);
 [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr p,E c,IntPtr l);
 [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h,StringBuilder b,int n);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr h,StringBuilder b,int n);
 [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h,out RECT r);
 [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr h,uint m,IntPtr w,IntPtr l);
 [StructLayout(LayoutKind.Sequential)] public struct RECT{public int Left,Top,Right,Bottom;}
}
'@
function Text([IntPtr]$h){$b=[Text.StringBuilder]::new(1024);[void][AuroraPasteCommit]::GetWindowText($h,$b,$b.Capacity);$b.ToString()}
function Class([IntPtr]$h){$b=[Text.StringBuilder]::new(256);[void][AuroraPasteCommit]::GetClassName($h,$b,$b.Capacity);$b.ToString()}
function Rect([IntPtr]$h){$r=New-Object 'AuroraPasteCommit+RECT';[void][AuroraPasteCommit]::GetWindowRect($h,[ref]$r);[pscustomobject]@{left=$r.Left;top=$r.Top;width=$r.Right-$r.Left;height=$r.Bottom-$r.Top}}
$p=@(Get-Process nwtoolset -ErrorAction SilentlyContinue);if($p.Count-ne1){throw "expected_one_toolset_process:$($p.Count)"};[uint32]$pid=$p[0].Id
$script:frames=@();[void][AuroraPasteCommit]::EnumWindows([AuroraPasteCommit+E]{param($h,$l);[uint32]$q=0;[void][AuroraPasteCommit]::GetWindowThreadProcessId($h,[ref]$q);if($q-eq$pid-and[AuroraPasteCommit]::IsWindowVisible($h)-and(Class $h)-eq'TfrmFrame'){$script:frames += [pscustomobject]@{h=$h;text=(Text $h)}};$true},[IntPtr]::Zero)
$frame=@($script:frames|Where-Object{$_.text.TrimEnd('*').EndsWith(" - $env:APC_MODULE",[StringComparison]::OrdinalIgnoreCase)})|Select-Object -First 1;if($null-eq$frame){throw 'expected_module_frame_missing'};$screen=[Windows.Forms.Screen]::FromHandle($frame.h);if($screen.Primary){throw 'module_on_primary_display'}
$script:viewers=@();[void][AuroraPasteCommit]::EnumChildWindows($frame.h,[AuroraPasteCommit+E]{param($h,$l);$t=(Text $h).Trim().TrimStart('-').Trim();if([AuroraPasteCommit]::IsWindowVisible($h)-and(Class $h)-eq'TfrmViewerArea'-and$t-eq$env:APC_AREA){$script:viewers += $h};$true},[IntPtr]::Zero);if($script:viewers.Count-ne1){throw "expected_one_area_viewer:$($script:viewers.Count)"}
$script:ports=@();[void][AuroraPasteCommit]::EnumChildWindows($script:viewers[0],[AuroraPasteCommit+E]{param($h,$l);if([AuroraPasteCommit]::IsWindowVisible($h)-and(Class $h)-eq'TScrollBox'){$r=Rect $h;if($r.width-ge640-and$r.height-ge480){$script:ports += [pscustomobject]@{h=$h;r=$r}}};$true},[IntPtr]::Zero);$port=@($script:ports|Sort-Object{$_.r.width*$_.r.height}-Descending)|Select-Object -First 1;if($null-eq$port){throw 'area_viewport_missing'}
$x=[int]$env:APC_X;$y=[int]$env:APC_Y;if($x-lt0-or$y-lt0-or$x-ge$port.r.width-or$y-ge$port.r.height){throw "viewport_point_out_of_bounds:$x,$y"};$lp=[IntPtr][int64](($y-shl16)-bor($x-band0xffff));[void][AuroraPasteCommit]::SendMessage($port.h,0x0200,[IntPtr]::Zero,$lp);[void][AuroraPasteCommit]::SendMessage($port.h,0x0201,[IntPtr]1,$lp);[void][AuroraPasteCommit]::SendMessage($port.h,0x0202,[IntPtr]::Zero,$lp);Start-Sleep -Milliseconds 800
[pscustomobject]@{ok=$true;processId=$pid;frameHwnd=$frame.h.ToInt64();viewerHwnd=$script:viewers[0].ToInt64();viewportHwnd=$port.h.ToInt64();viewportBounds=$port.r;click=[pscustomobject]@{x=$x;y=$y};titleAfter=(Text $frame.h);monitor=[pscustomobject]@{deviceName=$screen.DeviceName;primary=$screen.Primary};safety=[pscustomobject]@{usesGlobalCursor=$false;usesGlobalKeyboard=$false;usesGlobalMouse=$false;method='validated active Toolset Area viewport and targeted mouse messages only; commits the already-active Paste preview'}}|ConvertTo-Json -Depth 6 -Compress
`;

const output = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", source], {
  encoding: "utf8", windowsHide: true, timeout: 30_000, maxBuffer: 1024 * 1024,
  env: { ...process.env, APC_MODULE: moduleName, APC_AREA: area, APC_X: String(x), APC_Y: String(y) }
}).trim();
console.log(JSON.stringify(JSON.parse(output), null, 2));

function parseArgs(argv) { const result = {}; for (let i = 0; i < argv.length; i += 2) { const key = argv[i], value = argv[i + 1]; if (!key?.startsWith("--") || value === undefined || value.startsWith("--")) throw new Error(`Expected --name <value> near ${key ?? "end"}.`); result[key.slice(2)] = value; } return result; }
function required(value, name) { const text = String(value ?? "").trim(); if (!text) throw new Error(`${name} is required.`); return text; }
function integer(value, name) { const result = Number(required(value, name)); if (!Number.isInteger(result)) throw new Error(`${name} must be an integer.`); return result; }
