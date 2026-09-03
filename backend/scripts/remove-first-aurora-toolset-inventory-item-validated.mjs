#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const source = String.raw`
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;
public static class ARII {
  public delegate bool E(IntPtr h,IntPtr l);
  [StructLayout(LayoutKind.Sequential)] public struct R { public int Left,Top,Right,Bottom; }
  [StructLayout(LayoutKind.Sequential)] public struct P { public int X,Y; }
  [DllImport("user32.dll")] public static extern bool EnumWindows(E c,IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr p,E c,IntPtr l);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);
  [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h,StringBuilder b,int n);
  [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr h,StringBuilder b,int n);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h,out R r);
  [DllImport("user32.dll")] public static extern IntPtr WindowFromPoint(P p);
  [DllImport("user32.dll")] public static extern bool GetCursorPos(out P p);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x,int y);
  [DllImport("user32.dll")] public static extern short GetAsyncKeyState(int v);
  [DllImport("user32.dll")] public static extern void mouse_event(uint f,uint dx,uint dy,uint data,UIntPtr extra);
}
'@
function Text([IntPtr]$h){$b=[Text.StringBuilder]::new(512);[void][ARII]::GetWindowText($h,$b,$b.Capacity);$b.ToString()}
function Class([IntPtr]$h){$b=[Text.StringBuilder]::new(128);[void][ARII]::GetClassName($h,$b,$b.Capacity);$b.ToString()}
function Rect([IntPtr]$h){$r=New-Object 'ARII+R';[void][ARII]::GetWindowRect($h,[ref]$r);$r}
$processes=@(Get-Process nwtoolset -ErrorAction SilentlyContinue)
if($processes.Count-ne1){throw "expected_one_toolset_process:$($processes.Count)"}
[uint32]$processId=$processes[0].Id
$script:dialogs=@()
[void][ARII]::EnumWindows([ARII+E]{param($h,$l);[uint32]$p=0;[void][ARII]::GetWindowThreadProcessId($h,[ref]$p);if($p-eq$processId-and[ARII]::IsWindowVisible($h)-and(Class $h)-eq'TdlgInventory'-and(Text $h)-eq'Inventory Contents'){$script:dialogs+=$h};$true},[IntPtr]::Zero)
if($script:dialogs.Count-ne1){throw "expected_one_inventory_dialog:$($script:dialogs.Count)"}
$dialog=$script:dialogs[0];$dialogRect=Rect $dialog;$screen=[Windows.Forms.Screen]::FromHandle($dialog)
if($screen.Primary){throw 'inventory_dialog_on_primary'}
$script:grids=@();$script:trash=@()
[void][ARII]::EnumChildWindows($dialog,[ARII+E]{param($h,$l);if([ARII]::IsWindowVisible($h)){$r=Rect $h;$w=$r.Right-$r.Left;$height=$r.Bottom-$r.Top;if((Class $h)-eq'TDrawGrid'){$script:grids+=$h};if((Class $h)-eq'TPanel'-and$r.Top-ge($dialogRect.Bottom-50)-and$w-ge40-and$w-le70-and$height-ge25-and$height-le40){$script:trash+=$h}};$true},[IntPtr]::Zero)
if($script:grids.Count-ne1){throw "expected_one_visible_inventory_grid:$($script:grids.Count)"}
if($script:trash.Count-ne1){throw "expected_one_bottom_left_trash_panel:$($script:trash.Count)"}
$grid=$script:grids[0];$trash=$script:trash[0];$gridRect=Rect $grid;$trashRect=Rect $trash
$itemPoint=[ARII+P]@{X=$gridRect.Left+110;Y=$gridRect.Top+38}
$trashPoint=[ARII+P]@{X=[int](($trashRect.Left+$trashRect.Right)/2);Y=[int](($trashRect.Top+$trashRect.Bottom)/2)}
if([ARII]::WindowFromPoint($itemPoint)-ne$grid){throw 'item_point_window_mismatch'}
if([ARII]::WindowFromPoint($trashPoint)-ne$trash){throw 'trash_point_window_mismatch'}
if(([ARII]::GetAsyncKeyState(1)-band0x8000)-ne0-or([ARII]::GetAsyncKeyState(2)-band0x8000)-ne0){throw 'physical_mouse_button_down_abort'}
$original=New-Object 'ARII+P';if(-not[ARII]::GetCursorPos([ref]$original)){throw 'cursor_read_failed'}
try{
  foreach($point in @($itemPoint,$trashPoint)){
    if(-not[ARII]::SetCursorPos($point.X,$point.Y)){throw 'cursor_move_failed'}
    Start-Sleep -Milliseconds 100
    [ARII]::mouse_event(0x0002,0,0,0,[UIntPtr]::Zero);Start-Sleep -Milliseconds 60
    [ARII]::mouse_event(0x0004,0,0,0,[UIntPtr]::Zero);Start-Sleep -Milliseconds 220
  }
}finally{[void][ARII]::SetCursorPos($original.X,$original.Y)}
$alive=@(Get-Process nwtoolset -ErrorAction SilentlyContinue)
if($alive.Count-ne1-or$alive[0].Id-ne$processId-or-not$alive[0].Responding){throw 'toolset_not_live_after_inventory_remove'}
[pscustomobject]@{ok=$true;processId=$processId;dialogHwnd=$dialog.ToInt64();gridHwnd=$grid.ToInt64();trashHwnd=$trash.ToInt64();itemPoint=@{x=$itemPoint.X;y=$itemPoint.Y};trashPoint=@{x=$trashPoint.X;y=$trashPoint.Y};cursorRestored=@{x=$original.X;y=$original.Y};monitor=@{deviceName=$screen.DeviceName;primary=$screen.Primary};safety=@{usesGlobalCursor=$true;usesGlobalMouse=$true;usesGlobalKeyboard=$false;method='validated physical click on first Contents row followed by exact bottom-left trash panel, with WindowFromPoint guards and immediate cursor restore'}}|ConvertTo-Json -Depth 7 -Compress
`;

const output = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", source], {
  encoding: "utf8",
  windowsHide: true,
  timeout: 30_000,
  maxBuffer: 4 * 1024 * 1024,
});
console.log(JSON.stringify(JSON.parse(output.trim()), null, 2));
