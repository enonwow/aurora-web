#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const source = String.raw`
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;
public static class HAKRead {
  public delegate bool E(IntPtr h,IntPtr l);
  [StructLayout(LayoutKind.Sequential)]public struct R { public int Left,Top,Right,Bottom; }
  [DllImport("user32.dll")]public static extern bool EnumWindows(E c,IntPtr l);
  [DllImport("user32.dll")]public static extern bool EnumChildWindows(IntPtr p,E c,IntPtr l);
  [DllImport("user32.dll")]public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")]public static extern bool IsWindowEnabled(IntPtr h);
  [DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);
  [DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetWindowText(IntPtr h,StringBuilder b,int n);
  [DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetClassName(IntPtr h,StringBuilder b,int n);
  [DllImport("user32.dll")]public static extern bool GetWindowRect(IntPtr h,out R r);
  [DllImport("user32.dll",SetLastError=true)]public static extern IntPtr SendMessageTimeout(IntPtr h,uint m,IntPtr w,IntPtr l,uint f,uint t,out IntPtr r);
  [DllImport("user32.dll",EntryPoint="SendMessageTimeoutW",CharSet=CharSet.Unicode,SetLastError=true)]public static extern IntPtr SendMessageTimeoutText(IntPtr h,uint m,IntPtr w,StringBuilder l,uint f,uint t,out IntPtr r);
}
'@
function Text([IntPtr]$h){$b=[Text.StringBuilder]::new(2048);[void][HAKRead]::GetWindowText($h,$b,$b.Capacity);$b.ToString()}
function WindowClass([IntPtr]$h){$b=[Text.StringBuilder]::new(128);[void][HAKRead]::GetClassName($h,$b,$b.Capacity);$b.ToString()}
function Bounds([IntPtr]$h){$b=New-Object 'HAKRead+R';if(-not[HAKRead]::GetWindowRect($h,[ref]$b)){throw 'hak_state_window_rect_failed'};$b}
function SM([IntPtr]$h,[uint32]$m,[IntPtr]$w){$r=[IntPtr]::Zero;if([HAKRead]::SendMessageTimeout($h,$m,$w,[IntPtr]::Zero,2,2000,[ref]$r)-eq[IntPtr]::Zero){throw "hak_state_send_timeout:$m"};$r}
function SMT([IntPtr]$h,[uint32]$m,[IntPtr]$w,[Text.StringBuilder]$b){$r=[IntPtr]::Zero;if([HAKRead]::SendMessageTimeoutText($h,$m,$w,$b,2,2000,[ref]$r)-eq[IntPtr]::Zero){throw "hak_state_text_timeout:$m"};$r}
function Tops([uint32]$toolsetPid){$script:tops=@();[void][HAKRead]::EnumWindows([HAKRead+E]{param($h,$l);[uint32]$p=0;[void][HAKRead]::GetWindowThreadProcessId($h,[ref]$p);if($p-eq$toolsetPid-and[HAKRead]::IsWindowVisible($h)){$script:tops+=[pscustomobject]@{h=$h;hwnd=$h.ToInt64();className=WindowClass $h;text=Text $h;enabled=[HAKRead]::IsWindowEnabled($h)}};$true},[IntPtr]::Zero);@($script:tops)}
function Kids([IntPtr]$parent){$script:kids=@();[void][HAKRead]::EnumChildWindows($parent,[HAKRead+E]{param($h,$l);$b=Bounds $h;$script:kids+=[pscustomobject]@{h=$h;hwnd=$h.ToInt64();className=WindowClass $h;text=Text $h;visible=[HAKRead]::IsWindowVisible($h);enabled=[HAKRead]::IsWindowEnabled($h);left=$b.Left;top=$b.Top;width=$b.Right-$b.Left;height=$b.Bottom-$b.Top};$true},[IntPtr]::Zero);@($script:kids)}
function Signed32([IntPtr]$value){[BitConverter]::ToInt32([BitConverter]::GetBytes([uint32]$value.ToInt64()),0)}
function ReadItems([IntPtr]$h,[uint32]$countMessage,[uint32]$lengthMessage,[uint32]$textMessage){$count=[int](SM $h $countMessage ([IntPtr]::Zero)).ToInt64();if($count-lt0-or$count-gt10000){throw "hak_state_item_count_invalid:$count"};$items=@();for($i=0;$i-lt$count;$i++){$length=[int](SM $h $lengthMessage ([IntPtr]$i)).ToInt64();if($length-lt0-or$length-gt32767){throw "hak_state_item_length_invalid:\${i}:\${length}"};$b=[Text.StringBuilder]::new([Math]::Max(2,$length+1));[void](SMT $h $textMessage ([IntPtr]$i) $b);$items+=$b.ToString()};@($items)}

$ps=@(Get-Process nwtoolset -ErrorAction SilentlyContinue);if($ps.Count-ne1-or-not$ps[0].Responding){throw "expected_one_responding_toolset:$($ps.Count)"};[uint32]$toolsetPid=$ps[0].Id
$tops=@(Tops $toolsetPid);$dialogs=@($tops|Where-Object{$_.className-eq'TfrmIFOProp'-and$_.text-eq'Module Properties'});$unexpected=@($tops|Where-Object{$_.className-notin@('TfrmFrame','TApplication','TfrmIFOProp')})
if($dialogs.Count-ne1-or$unexpected.Count-ne0){throw ('hak_state_expected_exact_modal:'+($tops|ConvertTo-Json -Compress))};$dialog=$dialogs[0]
if([Windows.Forms.Screen]::FromHandle($dialog.h).Primary){throw 'hak_state_module_properties_on_primary'}
$content=@(Kids $dialog.h|Where-Object{$_.visible});$combos=@($content|Where-Object{$_.className-eq'TComboBox'-and$_.enabled});$lists=@($content|Where-Object{$_.className-eq'TListBox'-and$_.enabled});$adds=@($content|Where-Object{$_.className-in@('TButton','Button')-and$_.text-eq'Add'})
$candidates=@();foreach($combo in $combos){$nearLists=@($lists|Where-Object{($_.top+$_.height)-le$combo.top-and$combo.top-($_.top+$_.height)-le10-and[math]::Abs($_.left-$combo.left)-le5-and[math]::Abs($_.width-$combo.width)-le5});$nearAdds=@($adds|Where-Object{[math]::Abs($_.top-$combo.top)-le5-and$_.left-gt($combo.left+$combo.width)-and$_.left-($combo.left+$combo.width)-le30});if($nearLists.Count-eq1-and$nearAdds.Count-eq1){$candidates+=[pscustomobject]@{combo=$combo;list=$nearLists[0];add=$nearAdds[0]}}}
if($candidates.Count-ne1){throw ('hak_state_expected_one_combo_by_list_add_geometry:'+($candidates|ConvertTo-Json -Compress))};$candidate=$candidates[0]
$comboItems=ReadItems $candidate.combo.h 0x0146 0x0149 0x0148;$listItems=ReadItems $candidate.list.h 0x018B 0x018A 0x0189;$selectedRaw=[uint32](SM $candidate.combo.h 0x0147 ([IntPtr]::Zero)).ToInt64();$selected=Signed32 ([IntPtr][int64]$selectedRaw)
if($selected-lt-1-or($selected-ge$comboItems.Count)){throw "hak_state_selected_index_invalid:$selected"}
[pscustomobject]@{ok=$true;processId=$toolsetPid;dialog=[pscustomobject]@{hwnd=$dialog.hwnd;className=$dialog.className;text=$dialog.text};combo=[pscustomobject]@{hwnd=$candidate.combo.hwnd;itemCount=$comboItems.Count;selectedIndexRaw=$selectedRaw;selectedIndex=$selected;items=$comboItems};list=[pscustomobject]@{hwnd=$candidate.list.hwnd;itemCount=$listItems.Count;items=$listItems};add=[pscustomobject]@{hwnd=$candidate.add.hwnd;enabled=[HAKRead]::IsWindowEnabled($candidate.add.h)};safety=[pscustomobject]@{readOnly=$true;usesGlobalCursor=$false;usesGlobalKeyboard=$false;usesGlobalMouse=$false;method='validated list-plus-Add combo topology; CB_GETLBTEXTLEN/CB_GETLBTEXT and LB_GETTEXTLEN/LB_GETTEXT only'}}|ConvertTo-Json -Depth 7 -Compress
`;

const output = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", source], { encoding: "utf8", windowsHide: true, timeout: 30_000, maxBuffer: 4 * 1024 * 1024 });
console.log(JSON.stringify(JSON.parse(output.trim()), null, 2));
