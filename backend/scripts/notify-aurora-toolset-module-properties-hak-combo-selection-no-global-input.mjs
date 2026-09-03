#!/usr/bin/env node

import { execFileSync } from "node:child_process";

const hak = required(process.argv[2], "<hak>");
const renderOnly = process.argv.includes("--render-only");

// CB_SETCURSEL intentionally does not emit CBN_SELCHANGE. This narrow recovery
// accepts only a preselected exact HAK and proves the parent handler enables
// Add. It never adds, commits, or saves a HAK.
const source = String.raw`
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;
public static class HAKNotify {
  public delegate bool E(IntPtr h,IntPtr l);
  [StructLayout(LayoutKind.Sequential)]public struct R { public int Left,Top,Right,Bottom; }
  [DllImport("user32.dll")]public static extern bool EnumWindows(E c,IntPtr l);
  [DllImport("user32.dll")]public static extern bool EnumChildWindows(IntPtr p,E c,IntPtr l);
  [DllImport("user32.dll")]public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")]public static extern bool IsWindowEnabled(IntPtr h);
  [DllImport("user32.dll")]public static extern IntPtr GetParent(IntPtr h);
  [DllImport("user32.dll")]public static extern int GetDlgCtrlID(IntPtr h);
  [DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);
  [DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetWindowText(IntPtr h,StringBuilder b,int n);
  [DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetClassName(IntPtr h,StringBuilder b,int n);
  [DllImport("user32.dll")]public static extern bool GetWindowRect(IntPtr h,out R r);
  [DllImport("user32.dll",SetLastError=true)]public static extern IntPtr SendMessageTimeout(IntPtr h,uint m,IntPtr w,IntPtr l,uint f,uint t,out IntPtr r);
  [DllImport("user32.dll",EntryPoint="SendMessageTimeoutW",CharSet=CharSet.Unicode,SetLastError=true)]public static extern IntPtr SendMessageTimeoutText(IntPtr h,uint m,IntPtr w,StringBuilder l,uint f,uint t,out IntPtr r);
}
'@
function Text([IntPtr]$h){$b=[Text.StringBuilder]::new(2048);[void][HAKNotify]::GetWindowText($h,$b,$b.Capacity);$b.ToString()}
function WindowClass([IntPtr]$h){$b=[Text.StringBuilder]::new(128);[void][HAKNotify]::GetClassName($h,$b,$b.Capacity);$b.ToString()}
function Bounds([IntPtr]$h){$b=New-Object 'HAKNotify+R';if(-not[HAKNotify]::GetWindowRect($h,[ref]$b)){throw 'hak_combo_selection_change_window_rect_failed'};$b}
function SM([IntPtr]$h,[uint32]$m,[IntPtr]$w,[IntPtr]$l){$r=[IntPtr]::Zero;if([HAKNotify]::SendMessageTimeout($h,$m,$w,$l,2,2000,[ref]$r)-eq[IntPtr]::Zero){throw "hak_combo_selection_change_send_timeout:$m"};$r}
function SMT([IntPtr]$h,[uint32]$m,[IntPtr]$w,[Text.StringBuilder]$b){$r=[IntPtr]::Zero;if([HAKNotify]::SendMessageTimeoutText($h,$m,$w,$b,2,2000,[ref]$r)-eq[IntPtr]::Zero){throw "hak_combo_selection_change_text_timeout:$m"};$r}
function Tops([uint32]$toolsetPid){$script:tops=@();[void][HAKNotify]::EnumWindows([HAKNotify+E]{param($h,$l);[uint32]$p=0;[void][HAKNotify]::GetWindowThreadProcessId($h,[ref]$p);if($p-eq$toolsetPid-and[HAKNotify]::IsWindowVisible($h)){$script:tops+=[pscustomobject]@{h=$h;hwnd=$h.ToInt64();className=WindowClass $h;text=Text $h;enabled=[HAKNotify]::IsWindowEnabled($h)}};$true},[IntPtr]::Zero);@($script:tops)}
function Kids([IntPtr]$parent){$script:kids=@();[void][HAKNotify]::EnumChildWindows($parent,[HAKNotify+E]{param($h,$l);$b=Bounds $h;$script:kids+=[pscustomobject]@{h=$h;hwnd=$h.ToInt64();className=WindowClass $h;text=Text $h;visible=[HAKNotify]::IsWindowVisible($h);enabled=[HAKNotify]::IsWindowEnabled($h);left=$b.Left;top=$b.Top;width=$b.Right-$b.Left;height=$b.Bottom-$b.Top};$true},[IntPtr]::Zero);@($script:kids)}
function Signed32([IntPtr]$value){[BitConverter]::ToInt32([BitConverter]::GetBytes([uint32]$value.ToInt64()),0)}
function ReadItem([IntPtr]$h,[int]$index){$length=[int](SM $h 0x0149 ([IntPtr]$index) ([IntPtr]::Zero)).ToInt64();if($length-lt0-or$length-gt32767){throw "hak_combo_selection_change_item_length_invalid:$($index):$($length)"};$b=[Text.StringBuilder]::new([Math]::Max(2,$length+1));[void](SMT $h 0x0148 ([IntPtr]$index) $b);$b.ToString()}
function ListCount([IntPtr]$h){$count=[int](SM $h 0x018B ([IntPtr]::Zero) ([IntPtr]::Zero)).ToInt64();if($count-lt0-or$count-gt10000){throw "hak_combo_selection_change_list_count_invalid:$count"};$count}

$ps=@(Get-Process nwtoolset -ErrorAction SilentlyContinue);if($ps.Count-ne1-or-not$ps[0].Responding){throw "expected_one_responding_toolset:$($ps.Count)"};[uint32]$toolsetPid=$ps[0].Id
$tops=@(Tops $toolsetPid);$dialogs=@($tops|Where-Object{$_.className-eq'TfrmIFOProp'-and$_.text-eq'Module Properties'});$unexpected=@($tops|Where-Object{$_.className-notin@('TfrmFrame','TApplication','TfrmIFOProp')})
if($dialogs.Count-ne1-or$unexpected.Count-ne0){throw ('hak_combo_selection_change_expected_exact_modal:'+($tops|ConvertTo-Json -Compress))};$dialog=$dialogs[0]
if([Windows.Forms.Screen]::FromHandle($dialog.h).Primary){throw 'hak_combo_selection_change_module_properties_on_primary'}
$content=@(Kids $dialog.h|Where-Object{$_.visible});$combos=@($content|Where-Object{$_.className-eq'TComboBox'-and$_.enabled});$lists=@($content|Where-Object{$_.className-eq'TListBox'-and$_.enabled});$adds=@($content|Where-Object{$_.className-in@('TButton','Button')-and$_.text-eq'Add'})
$candidates=@();foreach($combo in $combos){$nearLists=@($lists|Where-Object{($_.top+$_.height)-le$combo.top-and$combo.top-($_.top+$_.height)-le10-and[math]::Abs($_.left-$combo.left)-le5-and[math]::Abs($_.width-$combo.width)-le5});$nearAdds=@($adds|Where-Object{[math]::Abs($_.top-$combo.top)-le5-and$_.left-gt($combo.left+$combo.width)-and$_.left-($combo.left+$combo.width)-le30});if($nearLists.Count-eq1-and$nearAdds.Count-eq1){$candidates+=[pscustomobject]@{combo=$combo;list=$nearLists[0];add=$nearAdds[0]}}}
if($candidates.Count-ne1){throw ('hak_combo_selection_change_expected_one_combo_by_list_add_geometry:'+($candidates|ConvertTo-Json -Compress))};$candidate=$candidates[0]
$selected=Signed32 (SM $candidate.combo.h 0x0147 ([IntPtr]::Zero) ([IntPtr]::Zero));if($selected-lt0){throw "hak_combo_selection_change_selection_missing:$selected"};$selectedText=ReadItem $candidate.combo.h $selected
if($selectedText-cne$env:HAK){throw "hak_combo_selection_change_selected_item_mismatch:$selectedText"}
$listBefore=ListCount $candidate.list.h;if($listBefore-ne0){throw "hak_combo_selection_change_hak_list_not_empty:$listBefore"}
if([HAKNotify]::IsWindowEnabled($candidate.add.h)){throw 'hak_combo_selection_change_add_already_enabled'}
$parent=[HAKNotify]::GetParent($candidate.combo.h);if($parent-eq[IntPtr]::Zero){throw 'hak_combo_selection_change_parent_missing'};$parentPid=0;[void][HAKNotify]::GetWindowThreadProcessId($parent,[ref]$parentPid);if($parentPid-ne$toolsetPid){throw "hak_combo_selection_change_parent_pid_mismatch:$parentPid"}
$controlId=[HAKNotify]::GetDlgCtrlID($candidate.combo.h);if($controlId-le0){throw "hak_combo_selection_change_control_id_invalid:$controlId"}
# CBN_SELCHANGE (1): WM_COMMAND parent receives LOWORD control ID, HIWORD notification, LPARAM combo HWND.
$w=[IntPtr][int64](($controlId-band0xffff)-bor(1-shl16));[void](SM $parent 0x0111 $w $candidate.combo.h)
$deadline=[DateTime]::UtcNow.AddSeconds(2);do{Start-Sleep -Milliseconds 80;$addEnabled=[HAKNotify]::IsWindowEnabled($candidate.add.h)}while(-not$addEnabled-and[DateTime]::UtcNow-lt$deadline)
$selectedAfter=Signed32 (SM $candidate.combo.h 0x0147 ([IntPtr]::Zero) ([IntPtr]::Zero));$selectedTextAfter=if($selectedAfter-ge0){ReadItem $candidate.combo.h $selectedAfter}else{''};$listAfter=ListCount $candidate.list.h
if($selectedAfter-ne$selected-or$selectedTextAfter-cne$env:HAK-or$listAfter-ne0){throw "hak_combo_selection_change_readback_mismatch:index=$($selectedAfter):text=$($selectedTextAfter):list=$($listAfter)"}
if(-not$addEnabled){throw 'hak_combo_selection_change_add_not_enabled'}
[pscustomobject]@{ok=$true;processId=$toolsetPid;dialog=[pscustomobject]@{hwnd=$dialog.hwnd;className=$dialog.className;text=$dialog.text};combo=[pscustomobject]@{hwnd=$candidate.combo.hwnd;controlId=$controlId;selectedIndex=$selectedAfter;selectedText=$selectedTextAfter;parent=[pscustomobject]@{hwnd=$parent.ToInt64();className=WindowClass $parent;text=Text $parent}};list=[pscustomobject]@{hwnd=$candidate.list.hwnd;itemCount=$listAfter;assertion='HAK ListBox remains empty'};add=[pscustomobject]@{hwnd=$candidate.add.hwnd;enabled=$addEnabled};notification=[pscustomobject]@{message='WM_COMMAND';code='CBN_SELCHANGE';codeValue=1;wParam=$w.ToInt64();lParamComboHwnd=$candidate.combo.hwnd;target='actual combo parent'};safety=[pscustomobject]@{usesGlobalCursor=$false;usesGlobalKeyboard=$false;usesGlobalMouse=$false;addsHak=$false;commitsDialog=$false;savesModule=$false;method='exact selected owner-drawn HAK item; documented CBN_SELCHANGE to actual parent; exact Add/list/selection readback'}}|ConvertTo-Json -Depth 7 -Compress
`;

if (renderOnly) {
  console.log(JSON.stringify({ ok: true, renderOnly: true, source }));
  process.exit(0);
}

const output = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", source], {
  encoding: "utf8",
  windowsHide: true,
  timeout: 30_000,
  maxBuffer: 4 * 1024 * 1024,
  env: { ...process.env, HAK: hak },
});
console.log(JSON.stringify(JSON.parse(output.trim()), null, 2));

function required(value, name) {
  const result = String(value ?? "").trim();
  if (!/^[a-z0-9_]{1,32}$/iu.test(result)) throw new Error(`${name} must be an Aurora resref.`);
  return result;
}
