#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const source = String.raw`
$ErrorActionPreference='Stop'
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;public static class LocationControls{public delegate bool E(IntPtr h,IntPtr l);[StructLayout(LayoutKind.Sequential)]public struct RECT{public int Left,Top,Right,Bottom;}[DllImport("user32.dll")]public static extern bool EnumWindows(E c,IntPtr l);[DllImport("user32.dll")]public static extern bool EnumChildWindows(IntPtr p,E c,IntPtr l);[DllImport("user32.dll")]public static extern bool IsWindowVisible(IntPtr h);[DllImport("user32.dll")]public static extern bool IsWindowEnabled(IntPtr h);[DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);[DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetWindowText(IntPtr h,StringBuilder b,int n);[DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetClassName(IntPtr h,StringBuilder b,int n);[DllImport("user32.dll")]public static extern bool GetWindowRect(IntPtr h,out RECT r);[DllImport("user32.dll")]public static extern int GetDlgCtrlID(IntPtr h);[DllImport("user32.dll",EntryPoint="GetWindowLong")]public static extern int GetWindowLong32(IntPtr h,int n);[DllImport("user32.dll")]public static extern IntPtr SendMessage(IntPtr h,uint m,IntPtr w,IntPtr l);}
'@
function T([IntPtr]$h){$b=[Text.StringBuilder]::new(256);[void][LocationControls]::GetWindowText($h,$b,$b.Capacity);$b.ToString()}
function C([IntPtr]$h){$b=[Text.StringBuilder]::new(128);[void][LocationControls]::GetClassName($h,$b,$b.Capacity);$b.ToString()}
function B([IntPtr]$h){$r=New-Object 'LocationControls+RECT';[void][LocationControls]::GetWindowRect($h,[ref]$r);$r}
$ps=@(Get-Process nwtoolset -ErrorAction SilentlyContinue);if($ps.Count-ne1){throw 'expected_one_toolset_process'};[uint32]$toolsetPid=$ps[0].Id
$script:dialogs=@();[void][LocationControls]::EnumWindows([LocationControls+E]{param($h,$l);[uint32]$q=0;[void][LocationControls]::GetWindowThreadProcessId($h,[ref]$q);if($q-eq$toolsetPid-and[LocationControls]::IsWindowVisible($h)-and(C $h)-eq'TdlgLocation'-and(T $h)-eq'Adjust Location'){$script:dialogs+=$h};$true},[IntPtr]::Zero);if($script:dialogs.Count-ne1){throw "expected_one_adjust_location:$($script:dialogs.Count)"}
$dialog=$script:dialogs[0];$script:controls=@();[void][LocationControls]::EnumChildWindows($dialog,[LocationControls+E]{param($h,$l);if([LocationControls]::IsWindowVisible($h)){$r=B $h;$class=C $h;$entry=[ordered]@{hwnd=$h.ToInt64();className=$class;text=T $h;enabled=[LocationControls]::IsWindowEnabled($h);style=('0x{0:X8}' -f [uint32][LocationControls]::GetWindowLong32($h,-16));controlId=[LocationControls]::GetDlgCtrlID($h);left=$r.Left;top=$r.Top;width=$r.Right-$r.Left;height=$r.Bottom-$r.Top};if($class-eq'TUpDown'){$entry.buddyHwnd=[LocationControls]::SendMessage($h,0x046A,[IntPtr]::Zero,[IntPtr]::Zero).ToInt64();$entry.position=[LocationControls]::SendMessage($h,0x0472,[IntPtr]::Zero,[IntPtr]::Zero).ToInt64()};$script:controls+=[pscustomobject]$entry};$true},[IntPtr]::Zero)
[pscustomobject]@{ok=$true;processId=$toolsetPid;dialogHwnd=$dialog.ToInt64();controls=@($script:controls|Sort-Object top,left);safety=[pscustomobject]@{readOnly=$true;usesGlobalCursor=$false;usesGlobalKeyboard=$false;usesGlobalMouse=$false;method='validated Adjust Location control enumeration, styles, enabled state, and read-only TUpDown buddy/position messages'}}|ConvertTo-Json -Depth 6 -Compress
`;

const output = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", source], { encoding: "utf8", windowsHide: true, timeout: 30000 }).trim();
console.log(JSON.stringify(JSON.parse(output), null, 2));
