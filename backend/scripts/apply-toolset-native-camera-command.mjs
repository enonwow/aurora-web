#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { buildToolsetCameraControlPlan } from "./lib/toolset-camera-control-plan.mjs";

const options = parseArgs(process.argv.slice(2));
const moduleName = required(options.module, "--module");
const area = required(options.area, "--area").toLowerCase();
const plan = buildToolsetCameraControlPlan({ command: required(options.command, "--command"), holdMs: integer(options.holdMs ?? 20, "--holdMs"), steps: 1 });

const source = String.raw`
$ErrorActionPreference='Stop';Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;
public static class AuroraNativeCameraCommand {
 public delegate bool EnumWindowsProc(IntPtr h,IntPtr l);
 [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc c,IntPtr l);
 [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr p,EnumWindowsProc c,IntPtr l);
 [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h,StringBuilder b,int n);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr h,StringBuilder b,int n);
 [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h,out RECT r);
 [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr h,uint m,IntPtr w,IntPtr l);
 [StructLayout(LayoutKind.Sequential)] public struct RECT{public int Left,Top,Right,Bottom;}
}
'@
function Text([IntPtr]$h){$b=New-Object Text.StringBuilder 1024;[void][AuroraNativeCameraCommand]::GetWindowText($h,$b,$b.Capacity);$b.ToString()}
function Class([IntPtr]$h){$b=New-Object Text.StringBuilder 256;[void][AuroraNativeCameraCommand]::GetClassName($h,$b,$b.Capacity);$b.ToString()}
function Rect([IntPtr]$h){$r=New-Object 'AuroraNativeCameraCommand+RECT';[void][AuroraNativeCameraCommand]::GetWindowRect($h,[ref]$r);[pscustomobject]@{left=$r.Left;top=$r.Top;width=$r.Right-$r.Left;height=$r.Bottom-$r.Top}}
$ids=@(Get-Process nwtoolset -ErrorAction SilentlyContinue|%{[uint32]$_.Id});if($ids.Count-ne1){throw "toolset_process_unavailable: expected one process, found $($ids.Count)."}
$script:frames=@();$top=[AuroraNativeCameraCommand+EnumWindowsProc]{param($h,$l)[uint32]$p=0;[void][AuroraNativeCameraCommand]::GetWindowThreadProcessId($h,[ref]$p);if($p-eq$ids[0]-and[AuroraNativeCameraCommand]::IsWindowVisible($h)){$script:frames+=,[pscustomobject]@{h=$h;title=(Text $h)}};return $true};[void][AuroraNativeCameraCommand]::EnumWindows($top,[IntPtr]::Zero)
$frame=@($script:frames|?{$_.title.EndsWith(" - $env:ANC_MODULE",[StringComparison]::OrdinalIgnoreCase)})|select -First 1;if($null-eq$frame){throw 'toolset_module_window_unavailable: exact module frame missing.'};$screen=[Windows.Forms.Screen]::FromHandle($frame.h);if($screen.DeviceName-ne'\\.\DISPLAY1'-or$screen.Primary){throw 'toolset_physical_second_display_required: exact module is not on non-primary DISPLAY1.'}
$script:texts=@();$script:viewers=@();$child=[AuroraNativeCameraCommand+EnumWindowsProc]{param($h,$l)$t=(Text $h);if($t){$script:texts+=,$t};$n=$t.Trim();if($n.StartsWith('-')){$n=$n.Substring(1).Trim()};if((Class $h)-eq'TfrmViewerArea'-and$n-eq$env:ANC_AREA){$script:viewers+=,$h};return $true};[void][AuroraNativeCameraCommand]::EnumChildWindows($frame.h,$child,[IntPtr]::Zero)
$all=(@($script:frames.title)+@($script:texts))-join[Environment]::NewLine;if($all-match'Access violation|List index out of bounds|Read of address|Write of address|Loading Inventory List|did not close properly|try to recover|recover it'){throw 'toolset_unsafe_state: critical modal or recovery text detected.'};if($script:viewers.Count-ne1){throw "toolset_viewer_unavailable: expected one exact Area viewer, found $($script:viewers.Count)."}
$script:buttons=@();$controls=[AuroraNativeCameraCommand+EnumWindowsProc]{param($h,$l)if([AuroraNativeCameraCommand]::IsWindowVisible($h)-and(Class $h)-eq'TBitBtn'){$r=Rect $h;if($r.width-ge20-and$r.width-le32-and$r.height-ge20-and$r.height-le32){$script:buttons+=,[pscustomobject]@{h=$h;r=$r}}};return $true};[void][AuroraNativeCameraCommand]::EnumChildWindows($script:viewers[0],$controls,[IntPtr]::Zero)
$ordered=@($script:buttons|sort {$_.r.left});if($ordered.Count-ne13){throw "toolset_camera_toolbar_invalid: expected 13 buttons, found $($ordered.Count)."};$button=$ordered[[int]$env:ANC_BUTTON];$x=[int]($button.r.width/2);$y=[int]($button.r.height/2);$lp=[IntPtr][int64](($y-shl16)-bor($x-band0xffff));[void][AuroraNativeCameraCommand]::SendMessage($button.h,0x0200,[IntPtr]::Zero,$lp);[void][AuroraNativeCameraCommand]::SendMessage($button.h,0x0201,[IntPtr]1,$lp);Start-Sleep -Milliseconds ([int]$env:ANC_HOLD);[void][AuroraNativeCameraCommand]::SendMessage($button.h,0x0202,[IntPtr]::Zero,$lp);Start-Sleep -Milliseconds 150
[pscustomobject]@{status='applied';processId=$ids[0];module=$env:ANC_MODULE;area=$env:ANC_AREA;command=$env:ANC_COMMAND;buttonIndex=[int]$env:ANC_BUTTON;holdMs=[int]$env:ANC_HOLD;safety=[pscustomobject]@{usesGlobalCursor=$false;usesGlobalKeyboard=$false;usesGlobalMouse=$false;processMemoryWrites=$false;method='targeted messages to exact validated TBitBtn'}}|ConvertTo-Json -Depth 5 -Compress
`;

const output = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", source], { encoding: "utf8", env: { ...process.env, ANC_MODULE: moduleName, ANC_AREA: area, ANC_COMMAND: plan.command, ANC_BUTTON: String(plan.buttonIndex), ANC_HOLD: String(plan.holdMs) }, timeout: 30_000, windowsHide: true });
console.log(JSON.stringify(JSON.parse(output.trim()), null, 2));

function parseArgs(args){const out={};for(let i=0;i<args.length;i+=2){const k=args[i],v=args[i+1];if(!k?.startsWith("--")||v===undefined)throw new Error("Expected --key value arguments.");out[k.slice(2)]=v;}return out;}
function required(value,name){const text=String(value??"").trim();if(!text)throw new Error(`${name} is required.`);return text;}
function integer(value,name){const number=Number(value);if(!Number.isInteger(number))throw new Error(`${name} must be an integer.`);return number;}
