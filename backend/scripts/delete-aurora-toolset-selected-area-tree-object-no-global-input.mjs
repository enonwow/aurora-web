#!/usr/bin/env node

import { execFileSync } from "node:child_process";

const options = parseArgs(process.argv.slice(2));
const moduleName = required(options.module, "--module");

const source = String.raw`
$ErrorActionPreference='Stop';Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;
public static class ATD{public delegate bool E(IntPtr h,IntPtr l);[StructLayout(LayoutKind.Sequential)]public struct R{public int Left,Top,Right,Bottom;}[DllImport("user32.dll")]public static extern bool EnumWindows(E c,IntPtr l);[DllImport("user32.dll")]public static extern bool EnumChildWindows(IntPtr p,E c,IntPtr l);[DllImport("user32.dll")]public static extern bool IsWindowVisible(IntPtr h);[DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);[DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetWindowText(IntPtr h,StringBuilder b,int n);[DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetClassName(IntPtr h,StringBuilder b,int n);[DllImport("user32.dll")]public static extern bool GetWindowRect(IntPtr h,out R r);[DllImport("user32.dll")]public static extern IntPtr SendMessage(IntPtr h,uint m,IntPtr w,IntPtr l);}
'@
function T([IntPtr]$h){$b=[Text.StringBuilder]::new(1024);[void][ATD]::GetWindowText($h,$b,$b.Capacity);$b.ToString()};function C([IntPtr]$h){$b=[Text.StringBuilder]::new(128);[void][ATD]::GetClassName($h,$b,$b.Capacity);$b.ToString()};function Bounds([IntPtr]$h){$r=New-Object 'ATD+R';[void][ATD]::GetWindowRect($h,[ref]$r);$r}
$ps=@(Get-Process nwtoolset -ErrorAction SilentlyContinue);if($ps.Count-ne1){throw "expected_one_toolset_process:$($ps.Count)"};[uint32]$pid=$ps[0].Id
$script:f=@();[void][ATD]::EnumWindows([ATD+E]{param($h,$l);[uint32]$p=0;[void][ATD]::GetWindowThreadProcessId($h,[ref]$p);if($p-eq$pid-and[ATD]::IsWindowVisible($h)-and(C $h)-eq'TfrmFrame'-and(T $h).TrimEnd('*').EndsWith(" - $env:M",[StringComparison]::OrdinalIgnoreCase)){$script:f+=$h};$true},[IntPtr]::Zero);if($script:f.Count-ne1){throw 'exact_frame_missing'};$screen=[Windows.Forms.Screen]::FromHandle($script:f[0]);if($screen.Primary){throw 'frame_on_primary'}
$script:t=@();[void][ATD]::EnumChildWindows($script:f[0],[ATD+E]{param($h,$l);if([ATD]::IsWindowVisible($h)-and(C $h)-eq'TTreeView'){$r=Bounds $h;if(($r.Right-$r.Left)-ge250-and($r.Bottom-$r.Top)-ge700-and$r.Left-lt-1600){$script:t+=$h}};$true},[IntPtr]::Zero);if($script:t.Count-ne1){throw "expected_one_area_tree:$($script:t.Count)"};$selected=[ATD]::SendMessage($script:t[0],0x110A,[IntPtr]9,[IntPtr]::Zero);if($selected-eq[IntPtr]::Zero){throw 'area_tree_selection_missing'};$before=T $script:f[0];[void][ATD]::SendMessage($script:t[0],0x0100,[IntPtr]46,[IntPtr]::Zero);[void][ATD]::SendMessage($script:t[0],0x0101,[IntPtr]46,[IntPtr]::Zero);Start-Sleep -Milliseconds 700;$after=T $script:f[0];if(-not$after.EndsWith('*')){throw 'delete_did_not_dirty_module'}
[pscustomobject]@{ok=$true;processId=$pid;frameHwnd=$script:f[0].ToInt64();treeHwnd=$script:t[0].ToInt64();selectedHandle=$selected.ToInt64();titleBefore=$before;titleAfter=$after;safety=[pscustomobject]@{usesGlobalCursor=$false;usesGlobalKeyboard=$false;usesGlobalMouse=$false;method='validated selected Area TTreeView item plus targeted WM_KEYDOWN/WM_KEYUP VK_DELETE'}}|ConvertTo-Json -Depth 5 -Compress
`;

const output = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", source], {
  encoding: "utf8",
  windowsHide: true,
  timeout: 30_000,
  env: { ...process.env, M: moduleName },
});
console.log(JSON.stringify(JSON.parse(output.trim()), null, 2));

function parseArgs(argv) { const result = {}; for (let index = 0; index < argv.length; index += 2) { const key = argv[index], value = argv[index + 1]; if (!key?.startsWith("--") || value === undefined) throw new Error(`Expected --name <value> near ${key ?? "end"}.`); result[key.slice(2)] = value; } return result; }
function required(value, name) { const text = String(value ?? "").trim(); if (!text) throw new Error(`${name} is required.`); return text; }
