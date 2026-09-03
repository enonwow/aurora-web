#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const tab = String(process.argv[process.argv.indexOf("--tab") + 1] ?? "").trim();
const positions = { Basic: 22, Lock: 64, Trap: 105, Scripts: 148, Advanced: 202, Description: 269, Comments: 337 };
if (!positions[tab]) throw new Error(`Unsupported --tab ${JSON.stringify(tab)}.`);
const source = String.raw`
$ErrorActionPreference='Stop';Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;public static class APPT{public delegate bool E(IntPtr h,IntPtr l);[StructLayout(LayoutKind.Sequential)]public struct R{public int Left,Top,Right,Bottom;}[StructLayout(LayoutKind.Sequential)]public struct P{public int X,Y;}[DllImport("user32.dll")]public static extern bool EnumWindows(E c,IntPtr l);[DllImport("user32.dll")]public static extern bool EnumChildWindows(IntPtr p,E c,IntPtr l);[DllImport("user32.dll")]public static extern bool IsWindowVisible(IntPtr h);[DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);[DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetWindowText(IntPtr h,StringBuilder b,int n);[DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetClassName(IntPtr h,StringBuilder b,int n);[DllImport("user32.dll")]public static extern bool GetWindowRect(IntPtr h,out R r);[DllImport("user32.dll")]public static extern IntPtr WindowFromPoint(P p);[DllImport("user32.dll")]public static extern bool PostMessage(IntPtr h,uint m,IntPtr w,IntPtr l);}
'@
function T([IntPtr]$h){$b=[Text.StringBuilder]::new(256);[void][APPT]::GetWindowText($h,$b,$b.Capacity);$b.ToString()};function C([IntPtr]$h){$b=[Text.StringBuilder]::new(128);[void][APPT]::GetClassName($h,$b,$b.Capacity);$b.ToString()};function Get-R([IntPtr]$h){$r=New-Object 'APPT+R';[void][APPT]::GetWindowRect($h,[ref]$r);$r}
$ps=@(Get-Process nwtoolset -ErrorAction SilentlyContinue);if($ps.Count-ne1){throw 'expected_one_toolset_process'};[uint32]$pid=$ps[0].Id;$script:d=@();[void][APPT]::EnumWindows([APPT+E]{param($h,$l);[uint32]$p=0;[void][APPT]::GetWindowThreadProcessId($h,[ref]$p);if($p-eq$pid-and[APPT]::IsWindowVisible($h)-and(C $h)-eq'TdlgPlaceableEdit'-and(T $h)-eq'Placeable Object Properties'){$script:d+=$h};$true},[IntPtr]::Zero);if($script:d.Count-ne1){throw "expected_one_placeable_properties:$($script:d.Count)"};$dialog=$script:d[0];$screen=[Windows.Forms.Screen]::FromHandle($dialog);if($screen.Primary){throw 'dialog_on_primary'};$script:p=@();[void][APPT]::EnumChildWindows($dialog,[APPT+E]{param($h,$l);if([APPT]::IsWindowVisible($h)-and(C $h)-eq'TPageControl'){$script:p+=$h};$true},[IntPtr]::Zero);if($script:p.Count-ne1){throw "expected_one_page_control:$($script:p.Count)"};$page=$script:p[0];$r=Get-R $page;$x=[int]$env:X;$y=[int]$env:Y;if($x-lt0-or$y-lt0-or$x-ge($r.Right-$r.Left)-or$y-ge($r.Bottom-$r.Top)){throw 'tab_point_out_of_page_bounds'};$point=[APPT+P]@{X=$r.Left+$x;Y=$r.Top+$y};$hit=[APPT]::WindowFromPoint($point);$lp=[IntPtr][int64](($y-shl16)-bor($x-band0xffff));if(-not[APPT]::PostMessage($page,0x0201,[IntPtr]1,$lp)-or-not[APPT]::PostMessage($page,0x0202,[IntPtr]::Zero,$lp)){throw 'tab_click_post_failed'};Start-Sleep -Milliseconds 700;$script:tabs=@();[void][APPT]::EnumChildWindows($page,[APPT+E]{param($h,$l);if([APPT]::IsWindowVisible($h)-and(C $h)-eq'TTabSheet'){$script:tabs+=[pscustomobject]@{hwnd=$h.ToInt64();text=T $h}};$true},[IntPtr]::Zero);$active=@($script:tabs|Where-Object{$_.text-eq$env:TAB});if($active.Count-ne1){throw ('target_tab_not_active:'+($script:tabs|ConvertTo-Json -Compress))};[pscustomobject]@{ok=$true;processId=$pid;dialogHwnd=$dialog.ToInt64();pageControlHwnd=$page.ToInt64();targetTab=$env:TAB;click=@{screenX=$point.X;screenY=$point.Y;localX=$x;localY=$y;physicalTopWindowHwnd=$hit.ToInt64();physicalTopWindowClass=C $hit};activeTab=$active[0];monitor=@{deviceName=$screen.DeviceName;primary=$screen.Primary};safety=@{usesGlobalCursor=$false;usesGlobalMouse=$false;usesGlobalKeyboard=$false;method='exact Placeable Object Properties page-control HWND, targeted WM_LBUTTONDOWN/UP, then visible TTabSheet readback'}}|ConvertTo-Json -Depth 7 -Compress
`;
let output;
let lastError;
for (const y of [11, 12, 10]) {
  try {
    output = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", source], { encoding: "utf8", windowsHide: true, timeout: 30_000, env: { ...process.env, TAB: tab, X: String(positions[tab]), Y: String(y) } });
    break;
  } catch (error) { lastError = error; }
}
if (!output) throw lastError;
console.log(JSON.stringify(JSON.parse(output.trim()), null, 2));
