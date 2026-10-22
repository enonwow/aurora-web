#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const options = parseArgs(process.argv.slice(2));
const dialogClass = required(options.dialogClass, "--dialogClass");
const dialogTitle = required(options.dialogTitle, "--dialogTitle");
const expectedCount = options.expectedCount == null ? null : positiveInteger(options.expectedCount, "--expectedCount");
const compileOnly = String(options.compileOnly ?? "false").toLowerCase() === "true";

const source = String.raw`
$ErrorActionPreference='Stop'
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;public static class ARL{public delegate bool E(IntPtr h,IntPtr l);[DllImport("user32.dll")]public static extern bool EnumWindows(E c,IntPtr l);[DllImport("user32.dll")]public static extern bool EnumChildWindows(IntPtr p,E c,IntPtr l);[DllImport("user32.dll")]public static extern bool IsWindowVisible(IntPtr h);[DllImport("user32.dll")]public static extern bool IsWindowEnabled(IntPtr h);[DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);[DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetWindowText(IntPtr h,StringBuilder b,int n);[DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetClassName(IntPtr h,StringBuilder b,int n);[DllImport("user32.dll",SetLastError=true)]public static extern IntPtr SendMessageTimeout(IntPtr h,uint m,IntPtr w,IntPtr l,uint flags,uint timeout,out IntPtr result);[DllImport("user32.dll",EntryPoint="SendMessageTimeoutW",CharSet=CharSet.Unicode,SetLastError=true)]public static extern IntPtr SendMessageTimeoutText(IntPtr h,uint m,IntPtr w,StringBuilder l,uint flags,uint timeout,out IntPtr result);}
'@
function T([IntPtr]$h){$b=[Text.StringBuilder]::new(1024);[void][ARL]::GetWindowText($h,$b,$b.Capacity);$b.ToString()};function C([IntPtr]$h){$b=[Text.StringBuilder]::new(128);[void][ARL]::GetClassName($h,$b,$b.Capacity);$b.ToString()};function SM([IntPtr]$h,[uint32]$m,[IntPtr]$w,[IntPtr]$l){$r=[IntPtr]::Zero;if([ARL]::SendMessageTimeout($h,$m,$w,$l,2,2000,[ref]$r)-eq[IntPtr]::Zero){throw "list_read_timeout:$m"};$r};function SMT([IntPtr]$h,[uint32]$m,[IntPtr]$w,[Text.StringBuilder]$l){$r=[IntPtr]::Zero;if([ARL]::SendMessageTimeoutText($h,$m,$w,$l,2,2000,[ref]$r)-eq[IntPtr]::Zero){throw "list_read_text_timeout:$m"};$r}
$ps=@(Get-Process nwtoolset -ErrorAction SilentlyContinue);if($ps.Count-ne1-or-not$ps[0].Responding){throw "expected_one_responding_toolset:$($ps.Count)"};[uint32]$toolsetPid=$ps[0].Id;$script:d=@();[void][ARL]::EnumWindows([ARL+E]{param($h,$l);[uint32]$p=0;[void][ARL]::GetWindowThreadProcessId($h,[ref]$p);if($p-eq$toolsetPid-and[ARL]::IsWindowVisible($h)-and(C $h)-eq$env:DC-and(T $h)-eq$env:DT){$script:d+=$h};$true},[IntPtr]::Zero);if($script:d.Count-ne1){throw "expected_one_exact_dialog:$($script:d.Count)"};$script:lists=@();[void][ARL]::EnumChildWindows($script:d[0],[ARL+E]{param($h,$l);if([ARL]::IsWindowVisible($h)-and[ARL]::IsWindowEnabled($h)-and(C $h)-eq'TListBox'){$script:lists+=$h};$true},[IntPtr]::Zero);if($script:lists.Count-ne1){throw "expected_one_visible_enabled_list:$($script:lists.Count)"};$list=$script:lists[0];$count=[int](SM $list 0x018B ([IntPtr]::Zero) ([IntPtr]::Zero)).ToInt64();if($env:COUNT-ne'__UNSET__'-and$count-ne[int]$env:COUNT){throw ('list_count_mismatch:{0}:{1}' -f $count,$env:COUNT)};$selected=[int](SM $list 0x0188 ([IntPtr]::Zero) ([IntPtr]::Zero)).ToInt64();$items=@();for($i=0;$i-lt$count;$i++){$len=[int](SM $list 0x018A ([IntPtr]$i) ([IntPtr]::Zero)).ToInt64();$b=[Text.StringBuilder]::new([Math]::Max(2,$len+1));[void](SMT $list 0x0189 ([IntPtr]$i) $b);$items+=$b.ToString()};[pscustomobject]@{ok=$true;processId=$toolsetPid;dialogHwnd=$script:d[0].ToInt64();listHwnd=$list.ToInt64();itemCount=$count;selectedIndex=$selected;items=$items;safety=[pscustomobject]@{readOnly=$true;usesGlobalInput=$false;usesGlobalCursor=$false;usesGlobalKeyboard=$false;usesGlobalMouse=$false;usesGlobalMouseWheel=$false;savesModule=$false;changesIniOrMru=$false;method='exact dialog and unique enabled TListBox; bounded LB_GETCOUNT/LB_GETTEXTLEN/LB_GETTEXT readback only'}}|ConvertTo-Json -Depth 5 -Compress
`;

if (compileOnly) {
  const output = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", "[ScriptBlock]::Create($env:AURORA_READ_LIST_SOURCE)|Out-Null; @{ok=$true;mode='compile-only'}|ConvertTo-Json -Compress"], { encoding: "utf8", windowsHide: true, env: { ...process.env, AURORA_READ_LIST_SOURCE: source } });
  console.log(JSON.stringify(JSON.parse(output.trim()), null, 2));
  process.exit(0);
}

const output = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", source], { encoding: "utf8", windowsHide: true, env: { ...process.env, DC: dialogClass, DT: dialogTitle, COUNT: expectedCount == null ? "__UNSET__" : String(expectedCount) } });
console.log(JSON.stringify(JSON.parse(output.trim()), null, 2));

function parseArgs(argv) { const result = {}; for (let index = 0; index < argv.length; index += 2) { const key = argv[index], value = argv[index + 1]; if (!key?.startsWith("--") || value === undefined) throw new Error(`Expected --name <value> near ${key ?? "end"}.`); result[key.slice(2)] = value; } return result; }
function required(value, name) { const result = String(value ?? "").trim(); if (!result) throw new Error(`${name} is required.`); return result; }
function positiveInteger(value, name) { const result = Number(value); if (!Number.isInteger(result) || result <= 0) throw new Error(`${name} must be a positive integer.`); return result; }
