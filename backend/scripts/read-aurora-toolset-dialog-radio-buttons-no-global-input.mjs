#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const options = parseArgs(process.argv.slice(2));
const dialogClass = required(options.dialogClass, "--dialogClass");
const dialogTitle = required(options.dialogTitle, "--dialogTitle");

const source = String.raw`
$ErrorActionPreference='Stop'
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;
public static class ARR{public delegate bool E(IntPtr h,IntPtr l);[DllImport("user32.dll")]public static extern bool EnumWindows(E c,IntPtr l);[DllImport("user32.dll")]public static extern bool EnumChildWindows(IntPtr p,E c,IntPtr l);[DllImport("user32.dll")]public static extern bool IsWindowVisible(IntPtr h);[DllImport("user32.dll")]public static extern bool IsWindowEnabled(IntPtr h);[DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);[DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetWindowText(IntPtr h,StringBuilder b,int n);[DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetClassName(IntPtr h,StringBuilder b,int n);[DllImport("user32.dll",SetLastError=true)]public static extern IntPtr SendMessageTimeout(IntPtr h,uint m,IntPtr w,IntPtr l,uint flags,uint timeout,out IntPtr result);}
'@
function T([IntPtr]$h){$b=[Text.StringBuilder]::new(1024);[void][ARR]::GetWindowText($h,$b,$b.Capacity);$b.ToString()};function C([IntPtr]$h){$b=[Text.StringBuilder]::new(128);[void][ARR]::GetClassName($h,$b,$b.Capacity);$b.ToString()};function SM([IntPtr]$h,[uint32]$m){$r=[IntPtr]::Zero;if([ARR]::SendMessageTimeout($h,$m,[IntPtr]::Zero,[IntPtr]::Zero,2,2000,[ref]$r)-eq[IntPtr]::Zero){throw "radio_read_timeout:$m"};$r}
$ps=@(Get-Process nwtoolset -ErrorAction SilentlyContinue);if($ps.Count-ne1-or-not$ps[0].Responding){throw "expected_one_responding_toolset:$($ps.Count)"};[uint32]$toolsetPid=$ps[0].Id;$script:dialogs=@();[void][ARR]::EnumWindows([ARR+E]{param($h,$l);[uint32]$p=0;[void][ARR]::GetWindowThreadProcessId($h,[ref]$p);if($p-eq$toolsetPid-and[ARR]::IsWindowVisible($h)-and(C $h)-eq$env:DC-and(T $h)-eq$env:DT){$script:dialogs+=$h};$true},[IntPtr]::Zero);if($script:dialogs.Count-ne1){throw "expected_one_exact_dialog:$($script:dialogs.Count)"};$script:radios=@();[void][ARR]::EnumChildWindows($script:dialogs[0],[ARR+E]{param($h,$l);if([ARR]::IsWindowVisible($h)-and(C $h)-eq'TRadioButton'){$script:radios+=[pscustomobject]@{hwnd=$h.ToInt64();text=(T $h);enabled=[ARR]::IsWindowEnabled($h);check=[int](SM $h 0x00F0).ToInt64()}};$true},[IntPtr]::Zero);if($script:radios.Count-eq0){throw 'radio_buttons_missing'};[pscustomobject]@{ok=$true;processId=$toolsetPid;dialogHwnd=$script:dialogs[0].ToInt64();className=$env:DC;title=$env:DT;radios=@($script:radios);safety=[pscustomobject]@{readOnly=$true;usesGlobalCursor=$false;usesGlobalKeyboard=$false;usesGlobalMouse=$false;method='exact Toolset dialog plus bounded BM_GETCHECK readback'}}|ConvertTo-Json -Depth 5 -Compress
`;

const output = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", source], { encoding: "utf8", windowsHide: true, timeout: 20_000, maxBuffer: 1024 * 1024, env: { ...process.env, DC: dialogClass, DT: dialogTitle } });
console.log(JSON.stringify(JSON.parse(output.trim()), null, 2));

function parseArgs(argv) { const result = {}; for (let i = 0; i < argv.length; i += 2) { if (!argv[i]?.startsWith("--") || argv[i + 1] === undefined) throw new Error(`invalid:${argv[i] ?? "end"}`); result[argv[i].slice(2)] = argv[i + 1]; } return result; }
function required(value, name) { const result = String(value ?? "").trim(); if (!result) throw new Error(`${name} is required.`); return result; }
