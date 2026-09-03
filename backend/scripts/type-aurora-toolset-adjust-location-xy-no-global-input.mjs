#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const options = parseArgs(process.argv.slice(2));
for (const name of ["expectedX", "expectedY", "x", "y"]) if (!options[name]) throw new Error(`--${name} required`);

const source = String.raw`
$ErrorActionPreference='Stop'
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;public static class LocationChar{public delegate bool E(IntPtr h,IntPtr l);[StructLayout(LayoutKind.Sequential)]public struct RECT{public int Left,Top,Right,Bottom;}[DllImport("user32.dll")]public static extern bool EnumWindows(E c,IntPtr l);[DllImport("user32.dll")]public static extern bool EnumChildWindows(IntPtr p,E c,IntPtr l);[DllImport("user32.dll")]public static extern bool IsWindowVisible(IntPtr h);[DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);[DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetWindowText(IntPtr h,StringBuilder b,int n);[DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetClassName(IntPtr h,StringBuilder b,int n);[DllImport("user32.dll")]public static extern bool GetWindowRect(IntPtr h,out RECT r);[DllImport("user32.dll")]public static extern IntPtr SendMessage(IntPtr h,uint m,IntPtr w,IntPtr l);}
'@
function T([IntPtr]$h){$b=[Text.StringBuilder]::new(256);[void][LocationChar]::GetWindowText($h,$b,$b.Capacity);$b.ToString()}
function C([IntPtr]$h){$b=[Text.StringBuilder]::new(128);[void][LocationChar]::GetClassName($h,$b,$b.Capacity);$b.ToString()}
function B([IntPtr]$h){$r=New-Object 'LocationChar+RECT';[void][LocationChar]::GetWindowRect($h,[ref]$r);$r}
$ps=@(Get-Process nwtoolset -ErrorAction SilentlyContinue);if($ps.Count-ne1){throw 'expected_one_toolset_process'};[uint32]$toolsetPid=$ps[0].Id
$script:dialogs=@();[void][LocationChar]::EnumWindows([LocationChar+E]{param($h,$l);[uint32]$q=0;[void][LocationChar]::GetWindowThreadProcessId($h,[ref]$q);if($q-eq$toolsetPid-and[LocationChar]::IsWindowVisible($h)-and(C $h)-eq'TdlgLocation'-and(T $h)-eq'Adjust Location'){$script:dialogs+=$h};$true},[IntPtr]::Zero);if($script:dialogs.Count-ne1){throw "expected_one_adjust_location:$($script:dialogs.Count)"}
$dialog=$script:dialogs[0];$dr=B $dialog;$script:raw=@();[void][LocationChar]::EnumChildWindows($dialog,[LocationChar+E]{param($h,$l);if([LocationChar]::IsWindowVisible($h)-and(C $h)-eq'TEdit'){$r=B $h;if($r.Left-lt($dr.Left+170)-and$r.Top-ge($dr.Top+40)-and$r.Top-lt($dr.Top+140)){$script:raw+=[pscustomobject]@{h=$h;r=$r;text=(T $h)}}};$true},[IntPtr]::Zero);$fields=@($script:raw|Sort-Object{$_.r.Top});if($fields.Count-ne3){throw "expected_three_position_fields:$($fields.Count)"}
$before=@($fields|ForEach-Object{$_.text});if($before[0]-ne$env:EX-or$before[1]-ne$env:EY){throw "position_field_mismatch:$($before|ConvertTo-Json -Compress)"};$requested=@($env:NX,$env:NY)
for($i=0;$i-lt2;$i++){[void][LocationChar]::SendMessage($fields[$i].h,0x00B1,[IntPtr]::Zero,[IntPtr](-1));[void][LocationChar]::SendMessage($fields[$i].h,0x0303,[IntPtr]::Zero,[IntPtr]::Zero);foreach($ch in ([string]$requested[$i]).ToCharArray()){[void][LocationChar]::SendMessage($fields[$i].h,0x0102,[IntPtr][int][char]$ch,[IntPtr]::Zero);Start-Sleep -Milliseconds 35}}
Start-Sleep -Milliseconds 250;$after=@($fields|ForEach-Object{T $_.h});if($after[0]-ne$requested[0]-or$after[1]-ne$requested[1]-or$after[2]-ne$before[2]){throw "native_char_readback_mismatch:$($after|ConvertTo-Json -Compress)"}
[pscustomobject]@{ok=$true;processId=$toolsetPid;dialogHwnd=$dialog.ToInt64();before=$before;after=$after;safety=[pscustomobject]@{usesGlobalCursor=$false;usesGlobalKeyboard=$false;usesGlobalMouse=$false;method='validated X/Y TEdit EM_SETSEL plus WM_CLEAR and targeted per-character WM_CHAR; Z untouched'}}|ConvertTo-Json -Compress
`;

const output = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", source], { encoding: "utf8", windowsHide: true, timeout: 30000, env: { ...process.env, EX: options.expectedX, EY: options.expectedY, NX: options.x, NY: options.y } }).trim();
console.log(JSON.stringify(JSON.parse(output), null, 2));

function parseArgs(argv) { const result = {}; for (let index = 0; index < argv.length; index += 2) result[argv[index].slice(2)] = argv[index + 1]; return result; }
