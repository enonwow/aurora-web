#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const options = args(process.argv.slice(2));
const dialogClass = required(options.dialogClass, "--dialogClass");
const dialogTitle = required(options.dialogTitle, "--dialogTitle");
const checkboxText = required(options.checkboxText, "--checkboxText");
const checked = requiredBoolean(options.checked, "--checked");
const source = String.raw`
$ErrorActionPreference='Stop'
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;public static class ASC{public delegate bool E(IntPtr h,IntPtr l);[DllImport("user32.dll")]public static extern bool EnumWindows(E c,IntPtr l);[DllImport("user32.dll")]public static extern bool EnumChildWindows(IntPtr p,E c,IntPtr l);[DllImport("user32.dll")]public static extern bool IsWindowVisible(IntPtr h);[DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);[DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetWindowText(IntPtr h,StringBuilder b,int n);[DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetClassName(IntPtr h,StringBuilder b,int n);[DllImport("user32.dll")]public static extern IntPtr SendMessage(IntPtr h,uint m,IntPtr w,IntPtr l);[DllImport("user32.dll")]public static extern bool PostMessage(IntPtr h,uint m,IntPtr w,IntPtr l);}
'@
function T([IntPtr]$h){$b=[Text.StringBuilder]::new(1024);[void][ASC]::GetWindowText($h,$b,$b.Capacity);$b.ToString()};function C([IntPtr]$h){$b=[Text.StringBuilder]::new(256);[void][ASC]::GetClassName($h,$b,$b.Capacity);$b.ToString()}
$ps=@(Get-Process nwtoolset -ErrorAction SilentlyContinue);if($ps.Count-ne1){throw 'expected_one_toolset_process'};[uint32]$pid=$ps[0].Id;$script:d=@();[void][ASC]::EnumWindows([ASC+E]{param($h,$l);[uint32]$p=0;[void][ASC]::GetWindowThreadProcessId($h,[ref]$p);if($p-eq$pid-and[ASC]::IsWindowVisible($h)-and(C $h)-eq$env:DC-and(T $h)-eq$env:DT){$script:d+=$h};$true},[IntPtr]::Zero);if($script:d.Count-ne1){throw "expected_one_exact_dialog:$($script:d.Count)"};$script:c=@();[void][ASC]::EnumChildWindows($script:d[0],[ASC+E]{param($h,$l);if([ASC]::IsWindowVisible($h)-and(C $h)-eq'TCheckBox'-and(T $h)-eq$env:CT){$script:c+=$h};$true},[IntPtr]::Zero);if($script:c.Count-ne1){throw "expected_one_visible_exact_checkbox:$($script:c.Count)"};$box=$script:c[0];$before=([ASC]::SendMessage($box,0x00F0,[IntPtr]::Zero,[IntPtr]::Zero).ToInt64()-ne0);$target=($env:CHECKED-eq'true');$changed=$false;if($before-ne$target){if(-not[ASC]::PostMessage($box,0x00F5,[IntPtr]::Zero,[IntPtr]::Zero)){throw 'checkbox_click_post_failed'};Start-Sleep -Milliseconds 500;$changed=$true};$after=([ASC]::SendMessage($box,0x00F0,[IntPtr]::Zero,[IntPtr]::Zero).ToInt64()-ne0);if($after-ne$target){throw ('checkbox_readback_mismatch:{0}:{1}:{2}' -f $before,$after,$target)};[pscustomobject]@{ok=$true;processId=$pid;dialogHwnd=$script:d[0].ToInt64();checkboxHwnd=$box.ToInt64();dialogClass=$env:DC;dialogTitle=$env:DT;checkboxText=$env:CT;before=$before;after=$after;changed=$changed;safety=@{usesGlobalCursor=$false;usesGlobalKeyboard=$false;usesGlobalMouse=$false;method='exact visible TCheckBox, BM_GETCHECK before/after, targeted BM_CLICK only when needed'}}|ConvertTo-Json -Depth 5 -Compress
`;
const output = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", source], { encoding: "utf8", windowsHide: true, timeout: 30_000, env: { ...process.env, DC: dialogClass, DT: dialogTitle, CT: checkboxText, CHECKED: String(checked) } });
console.log(JSON.stringify(JSON.parse(output.trim()), null, 2));

function args(argv) { const result = {}; for (let i = 0; i < argv.length; i += 2) result[argv[i].slice(2)] = argv[i + 1]; return result; }
function required(value, name) { if (!value) throw new Error(`${name} required`); return String(value); }
function requiredBoolean(value, name) { if (!/^(true|false)$/iu.test(String(value))) throw new Error(`${name} must be true or false`); return String(value).toLowerCase() === "true"; }
