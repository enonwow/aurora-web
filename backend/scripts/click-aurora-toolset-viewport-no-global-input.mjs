#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const options = parseArgs(process.argv.slice(2));
const moduleName = required(options.module, "--module");
const area = required(options.area, "--area");
const x = requiredInteger(options.x, "--x");
const y = requiredInteger(options.y, "--y");
const expectedMode = required(options.expectedMode ?? "objects", "--expectedMode").toLowerCase();
if (expectedMode !== "objects") throw new Error("Only validated Select Objects clicks are currently supported.");
const doubleClick = String(options.doubleClick ?? "false").toLowerCase() === "true";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const modeProof = JSON.parse(execFileSync(process.execPath, [resolve(scriptDir, "probe-aurora-toolset-selection-mode-no-global-input.mjs"), "--module", moduleName], { encoding: "utf8", windowsHide: true, timeout: 30_000 }).trim());
if (modeProof.toolbar?.buttons?.[1]?.checked !== true || modeProof.toolbar?.buttons?.[0]?.checked !== false) throw new Error("select_objects_mode_not_confirmed");

const source = String.raw`
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System; using System.Text; using System.Runtime.InteropServices;
public static class AuroraViewportClick { public delegate bool E(IntPtr h,IntPtr l); [DllImport("user32.dll")] public static extern bool EnumWindows(E c,IntPtr l); [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr p,E c,IntPtr l); [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h); [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p); [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h,StringBuilder b,int n); [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr h,StringBuilder b,int n); [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h,out RECT r); [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr h,uint m,IntPtr w,IntPtr l); [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr h,uint m,IntPtr w,IntPtr l); [StructLayout(LayoutKind.Sequential)] public struct RECT{public int Left,Top,Right,Bottom;} }
'@
function Text([IntPtr]$h){$b=[Text.StringBuilder]::new(1024);[void][AuroraViewportClick]::GetWindowText($h,$b,$b.Capacity);$b.ToString()};function Class([IntPtr]$h){$b=[Text.StringBuilder]::new(256);[void][AuroraViewportClick]::GetClassName($h,$b,$b.Capacity);$b.ToString()};function Rect([IntPtr]$h){$r=New-Object 'AuroraViewportClick+RECT';[void][AuroraViewportClick]::GetWindowRect($h,[ref]$r);[pscustomobject]@{left=$r.Left;top=$r.Top;width=$r.Right-$r.Left;height=$r.Bottom-$r.Top}}
$ps=@(Get-Process nwtoolset -ErrorAction SilentlyContinue);if($ps.Count-ne1-or$ps[0].Id-ne[int]$env:AVC_PID){throw 'toolset_process_changed_after_mode_probe'};[uint32]$pidValue=$ps[0].Id;$script:frames=@();$top=[AuroraViewportClick+E]{param($h,$l);[uint32]$p=0;[void][AuroraViewportClick]::GetWindowThreadProcessId($h,[ref]$p);if($p-eq$pidValue-and[AuroraViewportClick]::IsWindowVisible($h)-and(Class $h)-eq'TfrmFrame'){$script:frames += [pscustomobject]@{hwnd=$h;text=(Text $h)}};return $true};[void][AuroraViewportClick]::EnumWindows($top,[IntPtr]::Zero);$frame=@($script:frames|Where-Object{$_.text.TrimEnd('*').EndsWith(" - $env:AVC_MODULE",[StringComparison]::OrdinalIgnoreCase)})|Select-Object -First 1;if($null-eq$frame-or$frame.hwnd.ToInt64()-ne[int64]$env:AVC_FRAME){throw 'module_frame_changed_after_mode_probe'};$screen=[Windows.Forms.Screen]::FromHandle($frame.hwnd);if($screen.Primary){throw 'module_on_primary_display'}
$script:viewers=@();$children=[AuroraViewportClick+E]{param($h,$l);$t=(Text $h).Trim();if($t.StartsWith('-')){$t=$t.Substring(1).Trim()};if([AuroraViewportClick]::IsWindowVisible($h)-and(Class $h)-eq'TfrmViewerArea'-and$t-eq$env:AVC_AREA){$script:viewers += $h};return $true};[void][AuroraViewportClick]::EnumChildWindows($frame.hwnd,$children,[IntPtr]::Zero);if($script:viewers.Count-ne1){throw "expected_one_area_viewer:$($script:viewers.Count)"};$script:ports=@();$portCallback=[AuroraViewportClick+E]{param($h,$l);if([AuroraViewportClick]::IsWindowVisible($h)-and(Class $h)-eq'TScrollBox'){$r=Rect $h;if($r.width-ge640-and$r.height-ge480){$script:ports += [pscustomobject]@{hwnd=$h;bounds=$r}}};return $true};[void][AuroraViewportClick]::EnumChildWindows($script:viewers[0],$portCallback,[IntPtr]::Zero);$port=@($script:ports|Sort-Object{$_.bounds.width*$_.bounds.height}-Descending)|Select-Object -First 1;if($null-eq$port){throw 'area_viewport_missing'};$x=[int]$env:AVC_X;$y=[int]$env:AVC_Y;if($x-lt0-or$y-lt0-or$x-ge$port.bounds.width-or$y-ge$port.bounds.height){throw "viewport_point_out_of_bounds:$x,$y"};$lp=[IntPtr][int64](($y-shl16)-bor($x-band0xffff));[void][AuroraViewportClick]::SendMessage($port.hwnd,0x0201,[IntPtr]1,$lp);[void][AuroraViewportClick]::SendMessage($port.hwnd,0x0202,[IntPtr]::Zero,$lp);if($env:AVC_DOUBLE-eq'true'){if(-not[AuroraViewportClick]::PostMessage($port.hwnd,0x0203,[IntPtr]1,$lp)-or-not[AuroraViewportClick]::PostMessage($port.hwnd,0x0202,[IntPtr]::Zero,$lp)){throw 'targeted_double_click_post_failed'}};Start-Sleep -Milliseconds 700
[pscustomobject]@{ok=$true;processId=$pidValue;frameHwnd=$frame.hwnd.ToInt64();viewerHwnd=$script:viewers[0].ToInt64();viewportHwnd=$port.hwnd.ToInt64();viewportBounds=$port.bounds;click=[pscustomobject]@{x=$x;y=$y;double=($env:AVC_DOUBLE-eq'true')};expectedMode='objects';monitor=[pscustomobject]@{deviceName=$screen.DeviceName;primary=$screen.Primary};safety=[pscustomobject]@{usesGlobalCursor=$false;usesGlobalKeyboard=$false;usesGlobalMouse=$false;method='targeted viewport mouse messages to validated Area TScrollBox'}}|ConvertTo-Json -Depth 6 -Compress
`;
const output = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", source], { encoding: "utf8", windowsHide: true, timeout: 30_000, maxBuffer: 1024 * 1024, env: { ...process.env, AVC_PID: String(modeProof.processId), AVC_FRAME: String(modeProof.frameHwnd), AVC_MODULE: moduleName, AVC_AREA: area, AVC_X: String(x), AVC_Y: String(y), AVC_DOUBLE: String(doubleClick) } });
console.log(JSON.stringify({ ...JSON.parse(output.trim()), selectionModeProof: modeProof.toolbar.buttons }, null, 2));

function parseArgs(argv){const r={};for(let i=0;i<argv.length;i+=2){const k=argv[i],v=argv[i+1];if(!k?.startsWith("--")||v===undefined||v.startsWith("--"))throw new Error(`Expected --name <value> near ${k??"end"}.`);r[k.slice(2)]=v;}return r;}
function required(v,n){const s=String(v??"").trim();if(!s)throw new Error(`${n} is required.`);return s;}
function requiredInteger(v,n){const x=Number(required(v,n));if(!Number.isInteger(x))throw new Error(`${n} must be an integer.`);return x;}
