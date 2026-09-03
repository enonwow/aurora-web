#!/usr/bin/env node

import { execFileSync } from "node:child_process";

const options = parseArgs(process.argv.slice(2));
const dialogClass = required(options.dialogClass, "--dialogClass");
const dialogTitle = required(options.dialogTitle, "--dialogTitle");
const targetText = required(options.targetText, "--targetText");
const compileOnly = String(options.compileOnly ?? "false").toLowerCase() === "true";

const source = String.raw`
$ErrorActionPreference='Stop'
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;
public static class ACD{
  public delegate bool E(IntPtr h,IntPtr l);
  [StructLayout(LayoutKind.Sequential)]public struct RECT{public int Left,Top,Right,Bottom;}
  [DllImport("user32.dll")]public static extern bool EnumWindows(E c,IntPtr l);
  [DllImport("user32.dll")]public static extern bool EnumChildWindows(IntPtr p,E c,IntPtr l);
  [DllImport("user32.dll")]public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")]public static extern bool IsWindowEnabled(IntPtr h);
  [DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);
  [DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetWindowText(IntPtr h,StringBuilder b,int n);
  [DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetClassName(IntPtr h,StringBuilder b,int n);
  [DllImport("user32.dll")]public static extern bool GetWindowRect(IntPtr h,out RECT r);
  [DllImport("user32.dll")]public static extern bool GetClientRect(IntPtr h,out RECT r);
  [DllImport("user32.dll",SetLastError=true)]public static extern IntPtr SendMessageTimeout(IntPtr h,uint m,IntPtr w,IntPtr l,uint flags,uint timeout,out IntPtr result);
  [DllImport("user32.dll",EntryPoint="SendMessageTimeoutW",CharSet=CharSet.Unicode,SetLastError=true)]public static extern IntPtr SendMessageTimeoutText(IntPtr h,uint m,IntPtr w,StringBuilder l,uint flags,uint timeout,out IntPtr result);
  [DllImport("user32.dll",SetLastError=true)]public static extern bool PostMessage(IntPtr h,uint m,IntPtr w,IntPtr l);
}
'@
function Text([IntPtr]$h){$b=[Text.StringBuilder]::new(2048);[void][ACD]::GetWindowText($h,$b,$b.Capacity);$b.ToString()}
function Class([IntPtr]$h){$b=[Text.StringBuilder]::new(128);[void][ACD]::GetClassName($h,$b,$b.Capacity);$b.ToString()}
function Rect([IntPtr]$h){$r=New-Object 'ACD+RECT';if(-not[ACD]::GetWindowRect($h,[ref]$r)){throw 'window_rect_failed'};$r}
function I32([IntPtr]$value){[BitConverter]::ToInt32([BitConverter]::GetBytes([uint64]$value.ToInt64()),0)}
function SM([IntPtr]$h,[uint32]$m,[IntPtr]$w,[IntPtr]$l){$result=[IntPtr]::Zero;$sent=[ACD]::SendMessageTimeout($h,$m,$w,$l,2,2000,[ref]$result);if($sent-eq[IntPtr]::Zero){throw "send_timeout:$m"};$result}
function SMT([IntPtr]$h,[uint32]$m,[IntPtr]$w,[Text.StringBuilder]$l){$result=[IntPtr]::Zero;$sent=[ACD]::SendMessageTimeoutText($h,$m,$w,$l,2,2000,[ref]$result);if($sent-eq[IntPtr]::Zero){throw "send_text_timeout:$m"};$result}
function Find-ComboExactItem([IntPtr]$h,[string]$text){$count=I32(SM $h 0x0146 ([IntPtr]::Zero) ([IntPtr]::Zero));if($count-lt1-or$count-gt32767){throw "combo_count_invalid:$count"};for($i=0;$i-lt$count;$i++){$length=I32(SM $h 0x0149 ([IntPtr]$i) ([IntPtr]::Zero));if($length-lt0-or$length-gt32767){throw "combo_item_length_invalid:$($i):$length"};$buffer=[Text.StringBuilder]::new([Math]::Max(2,$length+1));[void](SMT $h 0x0148 ([IntPtr]$i) $buffer);if($buffer.ToString()-ceq$text){return [pscustomobject]@{index=$i;count=$count}}};throw 'expected_one_basic_appearance_exact_target:0'}
function Find-VisibleComboLBox([uint32]$toolsetProcessId){$script:lists=@();[void][ACD]::EnumWindows([ACD+E]{param($h,$l);[uint32]$p=0;[void][ACD]::GetWindowThreadProcessId($h,[ref]$p);if($p-eq$toolsetProcessId-and[ACD]::IsWindowVisible($h)-and(Class $h)-eq'ComboLBox'){$script:lists+=$h};$true},[IntPtr]::Zero);@($script:lists)}

$ps=@(Get-Process nwtoolset -ErrorAction SilentlyContinue)
if($ps.Count-ne1-or-not$ps[0].Responding){throw "expected_one_responding_toolset:$($ps.Count)"}
[uint32]$pid=$ps[0].Id
$script:dialogs=@();[void][ACD]::EnumWindows([ACD+E]{param($h,$l);[uint32]$p=0;[void][ACD]::GetWindowThreadProcessId($h,[ref]$p);if($p-eq$pid-and[ACD]::IsWindowVisible($h)-and(Class $h)-eq$env:DC-and(Text $h)-eq$env:DT){$script:dialogs+=$h};$true},[IntPtr]::Zero)
if($script:dialogs.Count-ne1){throw "expected_one_exact_dialog:$($script:dialogs.Count)"}
$dialog=$script:dialogs[0]
$script:found=@();[void][ACD]::EnumChildWindows($dialog,[ACD+E]{param($h,$l);if([ACD]::IsWindowVisible($h)-and[ACD]::IsWindowEnabled($h)-and(Class $h)-eq'TComboBox'){$r=Rect $h;$script:found+=[pscustomobject]@{h=$h;top=$r.Top;left=$r.Left;width=$r.Right-$r.Left}};$true},[IntPtr]::Zero)
$combos=@($script:found|Sort-Object top,left);$appearanceCandidates=@();foreach($candidate in $combos){$above=@($combos|Where-Object{$_.left-eq$candidate.left-and$_.width-eq$candidate.width-and$candidate.top-$_.top-eq26});$below=@($combos|Where-Object{$_.left-eq$candidate.left-and$_.width-eq$candidate.width-and$_.top-$candidate.top-eq52});if($above.Count-eq1-and$below.Count-eq1){$appearanceCandidates+=$candidate}}
if($appearanceCandidates.Count-ne1){throw ('expected_one_basic_appearance_combo:'+($appearanceCandidates.Count)+':controls='+($combos|Select-Object top,left,width|ConvertTo-Json -Compress))}
$combo=$appearanceCandidates[0].h;$comboOrdinal=[Array]::IndexOf($combos,$appearanceCandidates[0]);$match=Find-ComboExactItem $combo $env:TARGET;$targetIndex=$match.index
if(-not[ACD]::PostMessage($combo,0x014F,[IntPtr]1,[IntPtr]::Zero)){throw 'post_combo_show_dropdown_failed'}
$list=[IntPtr]::Zero;for($attempt=0;$attempt-lt25;$attempt++){$lists=Find-VisibleComboLBox $pid;if($lists.Count-eq1){$list=$lists[0];break};Start-Sleep -Milliseconds 80}
if($list-eq[IntPtr]::Zero){throw 'expected_one_visible_combolbox_after_show_dropdown'}
$listCount=I32(SM $list 0x018B ([IntPtr]::Zero) ([IntPtr]::Zero));if($listCount-ne$match.count){[void][ACD]::PostMessage($combo,0x014F,[IntPtr]::Zero,[IntPtr]::Zero);throw "combolbox_item_count_mismatch:$($match.count):$listCount"};$listTargetIndex=$targetIndex
$itemHeight=I32(SM $list 0x01A1 ([IntPtr]0) ([IntPtr]::Zero));if($itemHeight-le0-or$itemHeight-gt4096){throw "list_item_height_invalid:$itemHeight"};if(-not[ACD]::PostMessage($list,0x0197,[IntPtr]$listTargetIndex,[IntPtr]::Zero)){throw 'post_combolbox_set_top_index_failed'};Start-Sleep -Milliseconds 200;$topIndex=I32(SM $list 0x018E ([IntPtr]::Zero) ([IntPtr]::Zero));$client=New-Object 'ACD+RECT';if(-not[ACD]::GetClientRect($list,[ref]$client)){throw 'list_client_rect_failed'};$clientWidth=$client.Right-$client.Left;$visibleRows=[Math]::Floor(($client.Bottom-$client.Top)/$itemHeight);if($topIndex-lt0-or$listTargetIndex-lt$topIndex-or$listTargetIndex-gt($topIndex+$visibleRows)){throw "combolbox_target_not_visible_after_scroll:$($listTargetIndex):$($topIndex):$visibleRows"};$x=[Math]::Max(2,[Math]::Min($clientWidth-2,10));$y=(($listTargetIndex-$topIndex)*$itemHeight)+[Math]::Floor($itemHeight/2);$lParam=[IntPtr][int64](($x-band0xffff)-bor(($y-band0xffff)-shl16));if(-not[ACD]::PostMessage($list,0x0201,[IntPtr]1,$lParam)){throw 'post_combolbox_lbuttondown_failed'};if(-not[ACD]::PostMessage($list,0x0202,[IntPtr]::Zero,$lParam)){throw 'post_combolbox_lbuttonup_failed'}
$afterIndex=-1;$afterText='';for($attempt=0;$attempt-lt25;$attempt++){$afterIndex=I32(SM $combo 0x0147 ([IntPtr]::Zero) ([IntPtr]::Zero));if($afterIndex-ge0){$length=I32(SM $combo 0x0149 ([IntPtr]$afterIndex) ([IntPtr]::Zero));if($length-ge0-and$length-le32767){$buffer=[Text.StringBuilder]::new([Math]::Max(2,$length+1));[void](SMT $combo 0x0148 ([IntPtr]$afterIndex) $buffer);$afterText=$buffer.ToString();if($afterText-ceq$env:TARGET){break}}};Start-Sleep -Milliseconds 80}
if($afterIndex-ne$targetIndex-or$afterText-cne$env:TARGET){throw "combolbox_selection_readback_mismatch:$($afterIndex):$afterText"}
[pscustomobject]@{ok=$true;processId=$pid;dialogHwnd=$dialog.ToInt64();comboHwnd=$combo.ToInt64();comboOrdinal=$comboOrdinal;comboTargetIndex=$targetIndex;comboLBoxHwnd=$list.ToInt64();after=[pscustomobject]@{index=$afterIndex;text=$afterText};safety=[pscustomobject]@{usesGlobalCursor=$false;usesGlobalKeyboard=$false;usesGlobalMouse=$false;method='exact Basic Appearance topology and exact visible ComboLBox item after LB_SETTOPINDEX; targeted WM_LBUTTONDOWN/UP only; native selection readback'}}|ConvertTo-Json -Depth 6 -Compress
`;

if (compileOnly) {
  const output = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", "[ScriptBlock]::Create($env:AURORA_COMBO_DROPDOWN_SOURCE)|Out-Null; @{ok=$true;mode='compile-only'}|ConvertTo-Json -Compress"], { encoding: "utf8", windowsHide: true, timeout: 20_000, env: { ...process.env, AURORA_COMBO_DROPDOWN_SOURCE: source } });
  console.log(JSON.stringify(JSON.parse(output.trim()), null, 2));
  process.exit(0);
}

const output = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", source], { encoding: "utf8", windowsHide: true, timeout: 45_000, maxBuffer: 4 * 1024 * 1024, env: { ...process.env, DC: dialogClass, DT: dialogTitle, TARGET: targetText } });
console.log(JSON.stringify(JSON.parse(output.trim()), null, 2));

function parseArgs(argv) { const result = {}; for (let index = 0; index < argv.length; index += 2) { const key = argv[index]; const value = argv[index + 1]; if (!key?.startsWith("--") || value === undefined) throw new Error(`Expected --name <value> near ${key ?? "end"}.`); result[key.slice(2)] = value; } return result; }
function required(value, name) { const result = String(value ?? "").trim(); if (!result) throw new Error(`${name} is required.`); return result; }
