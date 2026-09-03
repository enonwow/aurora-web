#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const source = String.raw`
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;
public static class HAKClear {
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
}
'@
function Text([IntPtr]$h){$b=[Text.StringBuilder]::new(2048);[void][HAKClear]::GetWindowText($h,$b,$b.Capacity);$b.ToString()}
function WindowClass([IntPtr]$h){$b=[Text.StringBuilder]::new(128);[void][HAKClear]::GetClassName($h,$b,$b.Capacity);$b.ToString()}
function Bounds([IntPtr]$h){$b=New-Object 'HAKClear+R';if(-not[HAKClear]::GetWindowRect($h,[ref]$b)){throw 'hak_combo_clear_window_rect_failed'};$b}
function SM([IntPtr]$h,[uint32]$m,[IntPtr]$w){$r=[IntPtr]::Zero;if([HAKClear]::SendMessageTimeout($h,$m,$w,[IntPtr]::Zero,2,2000,[ref]$r)-eq[IntPtr]::Zero){throw "hak_combo_clear_send_timeout:$m"};$r}
function Signed32([IntPtr]$value){[BitConverter]::ToInt32([BitConverter]::GetBytes([uint32]$value.ToInt64()),0)}
function Tops([uint32]$toolsetPid){$script:tops=@();[void][HAKClear]::EnumWindows([HAKClear+E]{param($h,$l);[uint32]$p=0;[void][HAKClear]::GetWindowThreadProcessId($h,[ref]$p);if($p-eq$toolsetPid-and[HAKClear]::IsWindowVisible($h)){$script:tops+=[pscustomobject]@{h=$h;hwnd=$h.ToInt64();className=WindowClass $h;text=Text $h}};$true},[IntPtr]::Zero);@($script:tops)}
function Kids([IntPtr]$parent){$script:kids=@();[void][HAKClear]::EnumChildWindows($parent,[HAKClear+E]{param($h,$l);$b=Bounds $h;$script:kids+=[pscustomobject]@{h=$h;hwnd=$h.ToInt64();className=WindowClass $h;text=Text $h;visible=[HAKClear]::IsWindowVisible($h);enabled=[HAKClear]::IsWindowEnabled($h);left=$b.Left;top=$b.Top;width=$b.Right-$b.Left;height=$b.Bottom-$b.Top};$true},[IntPtr]::Zero);@($script:kids)}
$ps=@(Get-Process nwtoolset -ErrorAction SilentlyContinue);if($ps.Count-ne1-or-not$ps[0].Responding){throw "expected_one_responding_toolset:$($ps.Count)"};[uint32]$toolsetPid=$ps[0].Id
$tops=@(Tops $toolsetPid);$dialogs=@($tops|Where-Object{$_.className-eq'TfrmIFOProp'-and$_.text-eq'Module Properties'});$unexpected=@($tops|Where-Object{$_.className-notin@('TfrmFrame','TApplication','TfrmIFOProp')});if($dialogs.Count-ne1-or$unexpected.Count-ne0){throw ('hak_combo_clear_expected_exact_modal:'+($tops|ConvertTo-Json -Compress))};$dialog=$dialogs[0]
if([Windows.Forms.Screen]::FromHandle($dialog.h).Primary){throw 'hak_combo_clear_module_properties_on_primary'}
$content=@(Kids $dialog.h|Where-Object{$_.visible});$combos=@($content|Where-Object{$_.className-eq'TComboBox'-and$_.enabled});$lists=@($content|Where-Object{$_.className-eq'TListBox'-and$_.enabled});$adds=@($content|Where-Object{$_.className-in@('TButton','Button')-and$_.text-eq'Add'})
$candidates=@();foreach($combo in $combos){$nearLists=@($lists|Where-Object{($_.top+$_.height)-le$combo.top-and$combo.top-($_.top+$_.height)-le10-and[math]::Abs($_.left-$combo.left)-le5-and[math]::Abs($_.width-$combo.width)-le5});$nearAdds=@($adds|Where-Object{[math]::Abs($_.top-$combo.top)-le5-and$_.left-gt($combo.left+$combo.width)-and$_.left-($combo.left+$combo.width)-le30});if($nearLists.Count-eq1-and$nearAdds.Count-eq1){$candidates+=[pscustomobject]@{combo=$combo;list=$nearLists[0];add=$nearAdds[0]}}};if($candidates.Count-ne1){throw ('hak_combo_clear_expected_one_combo_by_list_add_geometry:'+($candidates|ConvertTo-Json -Compress))};$candidate=$candidates[0]
$listCount=[int](SM $candidate.list.h 0x018B ([IntPtr]::Zero)).ToInt64();$before=Signed32 (SM $candidate.combo.h 0x0147 ([IntPtr]::Zero));if($before-lt0-or$listCount-ne0-or[HAKClear]::IsWindowEnabled($candidate.add.h)){throw "hak_combo_clear_prestate_invalid:before=$before:listCount=$listCount:addEnabled=$([HAKClear]::IsWindowEnabled($candidate.add.h))"}
[void](SM $candidate.combo.h 0x014E ([IntPtr](-1)))
$after=Signed32 (SM $candidate.combo.h 0x0147 ([IntPtr]::Zero));$afterListCount=[int](SM $candidate.list.h 0x018B ([IntPtr]::Zero));$afterAddEnabled=[HAKClear]::IsWindowEnabled($candidate.add.h);if($after-ne-1-or$afterListCount-ne0-or$afterAddEnabled){throw "hak_combo_clear_readback_invalid:after=$after:listCount=$afterListCount:addEnabled=$afterAddEnabled"}
[pscustomobject]@{ok=$true;processId=$toolsetPid;dialogHwnd=$dialog.hwnd;comboHwnd=$candidate.combo.hwnd;listHwnd=$candidate.list.hwnd;addHwnd=$candidate.add.hwnd;beforeIndex=$before;afterIndex=$after;listCount=$afterListCount;addEnabled=$afterAddEnabled;safety=[pscustomobject]@{usesGlobalCursor=$false;usesGlobalKeyboard=$false;usesGlobalMouse=$false;method='targeted CB_SETCURSEL(-1) only after exact HAK ListBox-plus-Add topology; native selection/list/Add readback'}}|ConvertTo-Json -Depth 6 -Compress
`;
const output = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", source], { encoding: "utf8", windowsHide: true, timeout: 30_000, maxBuffer: 2 * 1024 * 1024 });
console.log(JSON.stringify(JSON.parse(output.trim()), null, 2));
