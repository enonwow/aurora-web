#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const options = args(process.argv.slice(2));
const dialogClass = required(options.dialogClass, "--dialogClass");
const dialogTitle = required(options.dialogTitle, "--dialogTitle");
const ordinal = nonNegativeInteger(options.ordinal ?? "0", "--ordinal");
const delta = options.delta == null ? null : integer(options.delta, "--delta");
const requestedIndex = options.index == null ? null : nonNegativeInteger(options.index, "--index");
if ((delta == null) === (requestedIndex == null)) throw new Error("Provide exactly one of --delta or --index.");
const source = String.raw`
$ErrorActionPreference='Stop'
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;public static class ACI{public delegate bool E(IntPtr h,IntPtr l);[StructLayout(LayoutKind.Sequential)]public struct R{public int Left,Top,Right,Bottom;}[DllImport("user32.dll")]public static extern bool EnumWindows(E c,IntPtr l);[DllImport("user32.dll")]public static extern bool EnumChildWindows(IntPtr p,E c,IntPtr l);[DllImport("user32.dll")]public static extern bool IsWindowVisible(IntPtr h);[DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);[DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetWindowText(IntPtr h,StringBuilder b,int n);[DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetClassName(IntPtr h,StringBuilder b,int n);[DllImport("user32.dll")]public static extern bool GetWindowRect(IntPtr h,out R r);[DllImport("user32.dll")]public static extern IntPtr SendMessage(IntPtr h,uint m,IntPtr w,IntPtr l);[DllImport("user32.dll")]public static extern int GetDlgCtrlID(IntPtr h);}
'@
function T([IntPtr]$h){$b=[Text.StringBuilder]::new(1024);[void][ACI]::GetWindowText($h,$b,$b.Capacity);$b.ToString()};function C([IntPtr]$h){$b=[Text.StringBuilder]::new(256);[void][ACI]::GetClassName($h,$b,$b.Capacity);$b.ToString()};function Get-R([IntPtr]$h){$r=New-Object 'ACI+R';[void][ACI]::GetWindowRect($h,[ref]$r);$r}
$ps=@(Get-Process nwtoolset -ErrorAction SilentlyContinue);if($ps.Count-ne1){throw 'expected_one_toolset_process'};[uint32]$pid=$ps[0].Id;$script:d=@();[void][ACI]::EnumWindows([ACI+E]{param($h,$l);[uint32]$p=0;[void][ACI]::GetWindowThreadProcessId($h,[ref]$p);if($p-eq$pid-and[ACI]::IsWindowVisible($h)-and(C $h)-eq$env:DC-and(T $h)-eq$env:DT){$script:d+=$h};$true},[IntPtr]::Zero);if($script:d.Count-ne1){throw "expected_one_exact_dialog:$($script:d.Count)"};$script:c=@();[void][ACI]::EnumChildWindows($script:d[0],[ACI+E]{param($h,$l);if([ACI]::IsWindowVisible($h)-and(C $h)-eq'TComboBox'){$r=Get-R $h;$script:c+=[pscustomobject]@{h=$h;top=$r.Top;left=$r.Left}};$true},[IntPtr]::Zero);$combos=@($script:c|Sort-Object top,left);$ord=[int]$env:ORD;if($ord-lt0-or$ord-ge$combos.Count){throw ('combo_ordinal_out_of_range:{0}:{1}' -f $ord,$combos.Count)};$combo=$combos[$ord].h;$count=[int][ACI]::SendMessage($combo,0x0146,[IntPtr]::Zero,[IntPtr]::Zero).ToInt64();$before=[int][ACI]::SendMessage($combo,0x0147,[IntPtr]::Zero,[IntPtr]::Zero).ToInt64();$target=if($env:MODE-eq'delta'){$before+[int]$env:VALUE}else{[int]$env:VALUE};if($target-lt0-or$target-ge$count){throw ('combo_target_out_of_range:{0}:{1}' -f $target,$count)};[void][ACI]::SendMessage($combo,0x014E,[IntPtr]$target,[IntPtr]::Zero);$id=[ACI]::GetDlgCtrlID($combo);$w=[IntPtr][int64](($id-band0xffff)-bor(1-shl16));[void][ACI]::SendMessage($script:d[0],0x0111,$w,$combo);Start-Sleep -Milliseconds 700;$after=[int][ACI]::SendMessage($combo,0x0147,[IntPtr]::Zero,[IntPtr]::Zero).ToInt64();if($after-ne$target){throw ('combo_index_readback_mismatch:{0}:{1}' -f $target,$after)};[pscustomobject]@{ok=$true;processId=$pid;dialogHwnd=$script:d[0].ToInt64();comboHwnd=$combo.ToInt64();ordinal=$ord;itemCount=$count;beforeIndex=$before;targetIndex=$target;afterIndex=$after;requiresDialogCommit=$true;safety=@{usesGlobalCursor=$false;usesGlobalKeyboard=$false;usesGlobalMouse=$false;method='exact visible TComboBox ordinal, CB_GETCURSEL/CB_SETCURSEL, CBN_SELCHANGE, exact index readback'}}|ConvertTo-Json -Depth 5 -Compress
`;
const mode = delta == null ? "index" : "delta";
const value = delta == null ? requestedIndex : delta;
const output = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", source], { encoding: "utf8", windowsHide: true, timeout: 30_000, env: { ...process.env, DC: dialogClass, DT: dialogTitle, ORD: String(ordinal), MODE: mode, VALUE: String(value) } });
console.log(JSON.stringify(JSON.parse(output.trim()), null, 2));

function args(argv) { const result = {}; for (let i = 0; i < argv.length; i += 2) result[argv[i].slice(2)] = argv[i + 1]; return result; }
function required(value, name) { if (!value) throw new Error(`${name} required`); return String(value); }
function integer(value, name) { const number = Number(value); if (!Number.isInteger(number)) throw new Error(`${name} must be an integer`); return number; }
function nonNegativeInteger(value, name) { const number = integer(value, name); if (number < 0) throw new Error(`${name} must be non-negative`); return number; }
