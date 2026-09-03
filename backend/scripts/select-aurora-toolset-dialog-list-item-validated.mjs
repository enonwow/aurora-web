#!/usr/bin/env node

import { execFileSync } from "node:child_process";

const options = parseArgs(process.argv.slice(2));
const dialogClass = required(options.dialogClass, "--dialogClass");
const dialogTitle = required(options.dialogTitle, "--dialogTitle");
const targetText = required(options.targetText, "--targetText");
const expectedCount = optionalPositiveInteger(options.expectedCount, "--expectedCount");
const compileOnly = String(options.compileOnly ?? "false").toLowerCase() === "true";

const source = String.raw`
$ErrorActionPreference='Stop'
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;
public static class ALI{
  public delegate bool E(IntPtr h,IntPtr l);
  [DllImport("user32.dll")]public static extern bool EnumWindows(E c,IntPtr l);
  [DllImport("user32.dll")]public static extern bool EnumChildWindows(IntPtr p,E c,IntPtr l);
  [DllImport("user32.dll")]public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")]public static extern bool IsWindowEnabled(IntPtr h);
  [DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);
  [DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetWindowText(IntPtr h,StringBuilder b,int n);
  [DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetClassName(IntPtr h,StringBuilder b,int n);
  [DllImport("user32.dll")]public static extern IntPtr GetParent(IntPtr h);
  [DllImport("user32.dll")]public static extern int GetDlgCtrlID(IntPtr h);
  [DllImport("user32.dll",SetLastError=true)]public static extern IntPtr SendMessageTimeout(IntPtr h,uint m,IntPtr w,IntPtr l,uint flags,uint timeout,out IntPtr result);
  [DllImport("user32.dll",EntryPoint="SendMessageTimeoutW",CharSet=CharSet.Unicode,SetLastError=true)]public static extern IntPtr SendMessageTimeoutText(IntPtr h,uint m,IntPtr w,StringBuilder l,uint flags,uint timeout,out IntPtr result);
}
'@
function T([IntPtr]$h){$b=[Text.StringBuilder]::new(1024);[void][ALI]::GetWindowText($h,$b,$b.Capacity);$b.ToString()}
function C([IntPtr]$h){$b=[Text.StringBuilder]::new(256);[void][ALI]::GetClassName($h,$b,$b.Capacity);$b.ToString()}
function SM([IntPtr]$h,[uint32]$m,[IntPtr]$w,[IntPtr]$l){$r=[IntPtr]::Zero;$sent=[ALI]::SendMessageTimeout($h,$m,$w,$l,2,2000,[ref]$r);if($sent-eq[IntPtr]::Zero){throw "send_timeout:$m"};$r}
function SMT([IntPtr]$h,[uint32]$m,[IntPtr]$w,[Text.StringBuilder]$l){$r=[IntPtr]::Zero;$sent=[ALI]::SendMessageTimeoutText($h,$m,$w,$l,2,2000,[ref]$r);if($sent-eq[IntPtr]::Zero){throw "send_text_timeout:$m"};$r}

$ps=@(Get-Process nwtoolset -ErrorAction SilentlyContinue)
if($ps.Count-ne1-or-not$ps[0].Responding){throw "expected_one_responding_toolset:$($ps.Count)"}
[uint32]$pid=$ps[0].Id
$script:d=@()
[void][ALI]::EnumWindows([ALI+E]{
  param($h,$l)
  [uint32]$p=0
  [void][ALI]::GetWindowThreadProcessId($h,[ref]$p)
  if($p-eq$pid-and[ALI]::IsWindowVisible($h)-and(C $h)-eq$env:DC-and(T $h)-eq$env:DT){$script:d+=$h}
  $true
},[IntPtr]::Zero)
if($script:d.Count-ne1){throw "expected_one_exact_dialog:$($script:d.Count)"}

$script:lists=@()
[void][ALI]::EnumChildWindows($script:d[0],[ALI+E]{
  param($h,$l)
  if([ALI]::IsWindowVisible($h)-and[ALI]::IsWindowEnabled($h)-and(C $h)-eq'TListBox'){$script:lists+=$h}
  $true
},[IntPtr]::Zero)
if($script:lists.Count-ne1){throw "expected_one_visible_enabled_list:$($script:lists.Count)"}
$list=$script:lists[0]
$count=[int](SM $list 0x018B ([IntPtr]::Zero) ([IntPtr]::Zero)).ToInt64()
if($env:COUNT-ne'__UNSET__'-and$count-ne[int]$env:COUNT){throw ('list_count_mismatch:{0}:{1}' -f $count,$env:COUNT)}
$before=[int](SM $list 0x0188 ([IntPtr]::Zero) ([IntPtr]::Zero)).ToInt64()
$items=@()
for($i=0;$i-lt$count;$i++){
  $len=[int](SM $list 0x018A ([IntPtr]$i) ([IntPtr]::Zero)).ToInt64()
  $b=[Text.StringBuilder]::new([Math]::Max(2,$len+1))
  [void](SMT $list 0x0189 ([IntPtr]$i) $b)
  $items+=$b.ToString()
}
$matches=@(0..($items.Count-1)|Where-Object{$items[$_]-ceq$env:TARGET})
if($matches.Count-ne1){throw "expected_one_exact_list_item:$($matches.Count)"}
$target=[int]$matches[0]
[void](SM $list 0x0186 ([IntPtr]$target) ([IntPtr]::Zero))
$parent=[ALI]::GetParent($list)
$id=[ALI]::GetDlgCtrlID($list)
$notify=[IntPtr][int64]((1-shl16)-bor($id-band0xffff))
[void](SM $parent 0x0111 $notify $list)
Start-Sleep -Milliseconds 200
$after=[int](SM $list 0x0188 ([IntPtr]::Zero) ([IntPtr]::Zero)).ToInt64()
if($after-ne$target){throw ('list_selection_mismatch:{0}:{1}' -f $after,$target)}

$script:buttons=@()
[void][ALI]::EnumChildWindows($script:d[0],[ALI+E]{
  param($h,$l)
  if([ALI]::IsWindowVisible($h)-and(C $h)-in@('TButton','Button')){
    $script:buttons+=[pscustomobject]@{text=T $h;enabled=[ALI]::IsWindowEnabled($h)}
  }
  $true
},[IntPtr]::Zero)
[pscustomobject]@{
  ok=$true
  processId=$pid
  dialogHwnd=$script:d[0].ToInt64()
  listHwnd=$list.ToInt64()
  itemCount=$count
  targetText=$env:TARGET
  targetIndex=$target
  beforeIndex=$before
  afterIndex=$after
  buttons=$script:buttons
  safety=[pscustomobject]@{
    usesGlobalInput=$false
    usesGlobalCursor=$false
    usesGlobalKeyboard=$false
    usesGlobalMouse=$false
    usesGlobalMouseWheel=$false
    savesModule=$false
    changesIniOrMru=$false
    method='exact dialog and unique visible TListBox; bounded SendMessageTimeout; exact text selection; native LBN_SELCHANGE to the actual list parent'
  }
}|ConvertTo-Json -Depth 6 -Compress
`;

if (compileOnly) {
  const output = execFileSync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", "[ScriptBlock]::Create($env:AURORA_LIST_ATOM_SOURCE)|Out-Null; @{ok=$true;mode='compile-only'}|ConvertTo-Json -Compress"],
    { encoding: "utf8", windowsHide: true, timeout: 20_000, env: { ...process.env, AURORA_LIST_ATOM_SOURCE: source } },
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
    env: {
      ...process.env,
      DC: dialogClass,
      DT: dialogTitle,
      TARGET: targetText,
      COUNT: expectedCount == null ? "__UNSET__" : String(expectedCount),
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

function optionalPositiveInteger(value, name) {
  if (value == null || value === "") return null;
  const result = Number(value);
  if (!Number.isInteger(result) || result <= 0) throw new Error(`${name} must be a positive integer.`);
  return result;
}
