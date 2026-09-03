#!/usr/bin/env node

import { execFileSync } from "node:child_process";

const options = parseArgs(process.argv.slice(2));
const dialogClass = required(options.dialogClass, "--dialogClass");
const dialogTitle = required(options.dialogTitle, "--dialogTitle");
const targetText = required(options.targetText, "--targetText");
const ordinal = optionalOrdinal(options.ordinal ?? "0", "--ordinal");
const compileOnly = String(options.compileOnly ?? "false").toLowerCase() === "true";

const source = String.raw`
$ErrorActionPreference='Stop'
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;
public static class ACT{
  public delegate bool E(IntPtr h,IntPtr l);
  [StructLayout(LayoutKind.Sequential)]public struct R{public int Left,Top,Right,Bottom;}
  [DllImport("user32.dll")]public static extern bool EnumWindows(E c,IntPtr l);
  [DllImport("user32.dll")]public static extern bool EnumChildWindows(IntPtr p,E c,IntPtr l);
  [DllImport("user32.dll")]public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")]public static extern bool IsWindowEnabled(IntPtr h);
  [DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);
  [DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetWindowText(IntPtr h,StringBuilder b,int n);
  [DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetClassName(IntPtr h,StringBuilder b,int n);
  [DllImport("user32.dll")]public static extern bool GetWindowRect(IntPtr h,out R r);
  [DllImport("user32.dll")]public static extern int GetDlgCtrlID(IntPtr h);
  [DllImport("user32.dll",SetLastError=true)]public static extern IntPtr SendMessageTimeout(IntPtr h,uint m,IntPtr w,IntPtr l,uint flags,uint timeout,out IntPtr result);
  [DllImport("user32.dll",EntryPoint="SendMessageTimeoutW",CharSet=CharSet.Unicode,SetLastError=true)]public static extern IntPtr SendMessageTimeoutText(IntPtr h,uint m,IntPtr w,StringBuilder l,uint flags,uint timeout,out IntPtr result);
}
'@
function T([IntPtr]$h){$b=[Text.StringBuilder]::new(2048);[void][ACT]::GetWindowText($h,$b,$b.Capacity);$b.ToString()}
function C([IntPtr]$h){$b=[Text.StringBuilder]::new(128);[void][ACT]::GetClassName($h,$b,$b.Capacity);$b.ToString()}
function Get-R([IntPtr]$h){$r=New-Object 'ACT+R';[void][ACT]::GetWindowRect($h,[ref]$r);$r}
function SM([IntPtr]$h,[uint32]$m,[IntPtr]$w,[IntPtr]$l){$r=[IntPtr]::Zero;$sent=[ACT]::SendMessageTimeout($h,$m,$w,$l,2,2000,[ref]$r);if($sent-eq[IntPtr]::Zero){throw "send_timeout:$m"};$r}
function SMT([IntPtr]$h,[uint32]$m,[IntPtr]$w,[Text.StringBuilder]$l){$r=[IntPtr]::Zero;$sent=[ACT]::SendMessageTimeoutText($h,$m,$w,$l,2,2000,[ref]$r);if($sent-eq[IntPtr]::Zero){throw "send_text_timeout:$m"};$r}

$ps=@(Get-Process nwtoolset -ErrorAction SilentlyContinue)
if($ps.Count-ne1-or-not$ps[0].Responding){throw "expected_one_responding_toolset:$($ps.Count)"}
[uint32]$pid=$ps[0].Id
$script:d=@()
[void][ACT]::EnumWindows([ACT+E]{param($h,$l);[uint32]$p=0;[void][ACT]::GetWindowThreadProcessId($h,[ref]$p);if($p-eq$pid-and[ACT]::IsWindowVisible($h)-and(C $h)-eq$env:DC-and(T $h)-eq$env:DT){$script:d+=$h};$true},[IntPtr]::Zero)
if($script:d.Count-ne1){throw "expected_one_exact_dialog:$($script:d.Count)"}
$dialog=$script:d[0]
$script:found=@()
[void][ACT]::EnumChildWindows($dialog,[ACT+E]{param($h,$l);if([ACT]::IsWindowVisible($h)-and[ACT]::IsWindowEnabled($h)-and(C $h)-eq'TComboBox'){$r=Get-R $h;$script:found+=[pscustomobject]@{h=$h;top=$r.Top;left=$r.Left}};$true},[IntPtr]::Zero)
$combos=@($script:found|Sort-Object top,left)
function Read-Combo([IntPtr]$handle,[int]$ordinal){$count=[int](SM $handle 0x0146 ([IntPtr]::Zero) ([IntPtr]::Zero)).ToInt64();$beforeIndex=[int](SM $handle 0x0147 ([IntPtr]::Zero) ([IntPtr]::Zero)).ToInt64();$beforeText=T $handle;$items=@();for($i=0;$i-lt$count;$i++){$length=[int](SM $handle 0x0149 ([IntPtr]$i) ([IntPtr]::Zero)).ToInt64();if($length-lt0-or$length-gt32767){throw "combo_item_length_invalid:\${ordinal}:\${i}:\${length}"};$buffer=[Text.StringBuilder]::new([Math]::Max(2,$length+1));[void](SMT $handle 0x0148 ([IntPtr]$i) $buffer);$items+=$buffer.ToString()};[pscustomobject]@{ordinal=$ordinal;h=$handle;count=$count;beforeIndex=$beforeIndex;beforeText=$beforeText;items=$items}}
if($env:ORD-eq'auto'){$records=@();for($i=0;$i-lt$combos.Count;$i++){$records+=Read-Combo $combos[$i].h $i};$candidates=@();foreach($record in $records){$matches=@(0..($record.items.Count-1)|Where-Object{$record.items[$_]-ceq$env:TARGET});if($matches.Count-eq1){$candidates+=[pscustomobject]@{record=$record;targetIndex=[int]$matches[0]}}};if($candidates.Count-ne1){throw ('expected_one_visible_combo_with_exact_target:'+($candidates.Count)+':records='+($records|Select-Object ordinal,count,items|ConvertTo-Json -Compress))};$selected=$candidates[0];$combo=$selected.record.h;$count=$selected.record.count;$beforeIndex=$selected.record.beforeIndex;$beforeText=$selected.record.beforeText;$items=$selected.record.items;$ord=$selected.record.ordinal;$targetIndex=$selected.targetIndex}else{$ord=[int]$env:ORD;if($ord-lt0-or$ord-ge$combos.Count){throw "combo_ordinal_out_of_range:\${ord}:$($combos.Count)"};$record=Read-Combo $combos[$ord].h $ord;$combo=$record.h;$count=$record.count;$beforeIndex=$record.beforeIndex;$beforeText=$record.beforeText;$items=$record.items;$matches=@(0..($items.Count-1)|Where-Object{$items[$_]-ceq$env:TARGET});if($matches.Count-ne1){throw ('expected_one_exact_combo_item:'+($matches.Count)+':items='+($items|ConvertTo-Json -Compress))};$targetIndex=[int]$matches[0]}
[void](SM $combo 0x014E ([IntPtr]$targetIndex) ([IntPtr]::Zero))
$id=[ACT]::GetDlgCtrlID($combo)
$notify=[IntPtr][int64](($id-band0xffff)-bor(1-shl16))
[void](SM $dialog 0x0111 $notify $combo)
Start-Sleep -Milliseconds 300
$afterIndex=[int](SM $combo 0x0147 ([IntPtr]::Zero) ([IntPtr]::Zero)).ToInt64()
$afterLength=[int](SM $combo 0x0149 ([IntPtr]$afterIndex) ([IntPtr]::Zero)).ToInt64();if($afterLength-lt0-or$afterLength-gt32767){throw "combo_selected_item_length_invalid:\${afterIndex}:\${afterLength}"};$afterBuffer=[Text.StringBuilder]::new([Math]::Max(2,$afterLength+1));[void](SMT $combo 0x0148 ([IntPtr]$afterIndex) $afterBuffer);$afterText=$afterBuffer.ToString()
if($afterIndex-ne$targetIndex-or$afterText-cne$env:TARGET){throw "combo_readback_mismatch:\${afterIndex}:\${afterText}"}

[pscustomobject]@{
  ok=$true
  processId=$pid
  dialogHwnd=$dialog.ToInt64()
  comboHwnd=$combo.ToInt64()
  ordinal=$ord
  visibleComboCount=$combos.Count
  itemCount=$count
  targetIndex=$targetIndex
  before=[pscustomobject]@{index=$beforeIndex;text=$beforeText}
  after=[pscustomobject]@{index=$afterIndex;text=$afterText}
  safety=[pscustomobject]@{
    usesGlobalCursor=$false
    usesGlobalKeyboard=$false
    usesGlobalMouse=$false
    method='exact dialog and ordered visible combo; bounded SendMessageTimeout; exhaustive exact-text selection; CBN_SELCHANGE; index and text readback'
  }
}|ConvertTo-Json -Depth 6 -Compress
`;

if (compileOnly) {
  const output = execFileSync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", "[ScriptBlock]::Create($env:AURORA_COMBO_ATOM_SOURCE)|Out-Null; @{ok=$true;mode='compile-only'}|ConvertTo-Json -Compress"],
    { encoding: "utf8", windowsHide: true, timeout: 20_000, env: { ...process.env, AURORA_COMBO_ATOM_SOURCE: source } },
  );
  console.log(JSON.stringify(JSON.parse(output.trim()), null, 2));
  process.exit(0);
}

const output = execFileSync(
  "powershell.exe",
  ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", source],
  {
    encoding: "utf8",
    windowsHide: true,
    timeout: 20_000,
    maxBuffer: 4 * 1024 * 1024,
    env: {
      ...process.env,
      DC: dialogClass,
      DT: dialogTitle,
      TARGET: targetText,
      ORD: String(ordinal),
    },
  },
);
console.log(JSON.stringify(JSON.parse(output.trim()), null, 2));

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined) {
      throw new Error(`Expected --name <value> near ${key ?? "end"}.`);
    }
    result[key.slice(2)] = value;
  }
  return result;
}

function required(value, name) {
  const result = String(value ?? "").trim();
  if (!result) throw new Error(`${name} is required.`);
  return result;
}

function nonNegativeInteger(value, name) {
  const result = Number(value);
  if (!Number.isInteger(result) || result < 0) throw new Error(`${name} must be a non-negative integer.`);
  return result;
}
function optionalOrdinal(value, name) { if (String(value).toLowerCase() === "auto") return "auto"; return nonNegativeInteger(value, name); }
