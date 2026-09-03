#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const options = parseArgs(process.argv.slice(2));
const itemText = required(options.itemText, "--itemText");
const inspectOnly = String(options.inspectOnly ?? "false").toLowerCase() === "true";
if (!inspectOnly) {
  throw new Error("Deprecated unsafe execution path: physical/global cursor D&D is forbidden. Use invoke-aurora-toolset-native-inventory-drop-no-global-input.mjs.");
}
const destinationKind = String(options.destination ?? "inventory").trim().toLowerCase();
if (!new Set(["inventory", "amulet"]).has(destinationKind)) {
  throw new Error("--destination must be inventory or amulet");
}

const source = String.raw`
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;
public static class ATID {
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
  [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr h,uint m,IntPtr w,IntPtr l);
  [DllImport("user32.dll")] public static extern IntPtr WindowFromPoint(P p);
  [DllImport("user32.dll")] public static extern bool GetCursorPos(out P p);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x,int y);
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h,IntPtr a,int x,int y,int w,int hgt,uint f);
  [DllImport("user32.dll")] public static extern short GetAsyncKeyState(int v);
  [DllImport("user32.dll")] public static extern void mouse_event(uint f,uint dx,uint dy,uint data,UIntPtr extra);
  [DllImport("kernel32.dll",SetLastError=true)] public static extern IntPtr OpenProcess(uint a,bool i,uint p);
  [DllImport("kernel32.dll",SetLastError=true)] public static extern IntPtr VirtualAllocEx(IntPtr p,IntPtr a,UIntPtr s,uint t,uint pr);
  [DllImport("kernel32.dll",SetLastError=true)] public static extern bool VirtualFreeEx(IntPtr p,IntPtr a,UIntPtr s,uint t);
  [DllImport("kernel32.dll",SetLastError=true)] public static extern bool ReadProcessMemory(IntPtr p,IntPtr a,byte[] b,UIntPtr s,out UIntPtr r);
  [DllImport("kernel32.dll",SetLastError=true)] public static extern bool WriteProcessMemory(IntPtr p,IntPtr a,byte[] b,UIntPtr s,out UIntPtr w);
  [DllImport("kernel32.dll")] public static extern bool CloseHandle(IntPtr h);
}
'@
function Text([IntPtr]$h){$b=[Text.StringBuilder]::new(512);[void][ATID]::GetWindowText($h,$b,$b.Capacity);$b.ToString()}
function Class([IntPtr]$h){$b=[Text.StringBuilder]::new(128);[void][ATID]::GetClassName($h,$b,$b.Capacity);$b.ToString()}
function Rect([IntPtr]$h){$r=New-Object 'ATID+R';[void][ATID]::GetWindowRect($h,[ref]$r);$r}

$processes=@(Get-Process nwtoolset -ErrorAction SilentlyContinue)
if($processes.Count-ne1){throw "expected_one_toolset_process:$($processes.Count)"}
[uint32]$processId=$processes[0].Id
$script:dialogs=@()
[void][ATID]::EnumWindows([ATID+E]{param($h,$l);[uint32]$p=0;[void][ATID]::GetWindowThreadProcessId($h,[ref]$p);if($p-eq$processId-and[ATID]::IsWindowVisible($h)-and(Class $h)-eq'TdlgInventory'-and(Text $h)-eq'Inventory Contents'){$script:dialogs+=$h};$true},[IntPtr]::Zero)
if($script:dialogs.Count-ne1){throw "expected_one_inventory_dialog:$($script:dialogs.Count)"}
$dialog=$script:dialogs[0]
$screen=[Windows.Forms.Screen]::FromHandle($dialog)
if($screen.Primary){throw 'inventory_dialog_on_primary'}
$script:trees=@();$script:grids=@();$script:panels=@()
[void][ATID]::EnumChildWindows($dialog,[ATID+E]{param($h,$l);if([ATID]::IsWindowVisible($h)){if((Class $h)-eq'TTreeView'){$script:trees+=$h};if((Class $h)-eq'TDrawGrid'){$script:grids+=$h};if((Class $h)-eq'TPanel'){$script:panels+=$h}};$true},[IntPtr]::Zero)
if($script:trees.Count-ne1){throw "expected_one_visible_inventory_tree:$($script:trees.Count)"}
if($script:grids.Count-ne1){throw "expected_one_visible_inventory_grid:$($script:grids.Count)"}
$tree=$script:trees[0];$grid=$script:grids[0]
$proc=[ATID]::OpenProcess(0x38,$false,$processId);if($proc-eq[IntPtr]::Zero){throw 'open_process_failed'}
$remote=[ATID]::VirtualAllocEx($proc,[IntPtr]::Zero,[UIntPtr]::new(1024),0x1000,4);if($remote-eq[IntPtr]::Zero){[void][ATID]::CloseHandle($proc);throw 'remote_alloc_failed'}
$dialogRaised=$false
try{
  function ReadNode([IntPtr]$item){$b=New-Object byte[] 32;[BitConverter]::GetBytes([uint32]1).CopyTo($b,0);[BitConverter]::GetBytes([uint32]$item.ToInt64()).CopyTo($b,4);[BitConverter]::GetBytes([uint32]($remote.ToInt64()+64)).CopyTo($b,16);[BitConverter]::GetBytes([int]400).CopyTo($b,20);[UIntPtr]$w=[UIntPtr]::Zero;if(-not[ATID]::WriteProcessMemory($proc,$remote,$b,[UIntPtr]::new(32),[ref]$w)){throw 'tree_remote_write_failed'};if([ATID]::SendMessage($tree,0x113E,[IntPtr]::Zero,$remote).ToInt64()-eq0){throw 'tree_getitem_failed'};$textBytes=New-Object byte[] 800;[UIntPtr]$read=[UIntPtr]::Zero;if(-not[ATID]::ReadProcessMemory($proc,[IntPtr]($remote.ToInt64()+64),$textBytes,[UIntPtr]::new(800),[ref]$read)){throw 'tree_remote_read_failed'};[pscustomobject]@{handle=$item;text=([Text.Encoding]::Unicode.GetString($textBytes).Split([char]0)[0])}}
  $script:visitedCount=0;$script:visitedPreview=@();$script:foundNode=$null
  function FindNode([IntPtr]$item){while($item-ne[IntPtr]::Zero-and$null-eq$script:foundNode){$node=ReadNode $item;$script:visitedCount++;if($script:visitedPreview.Count-lt80){$script:visitedPreview+=$node.text};if($node.text-eq$env:ITEM_TEXT){$script:foundNode=$node;return};$child=[ATID]::SendMessage($tree,0x110A,[IntPtr]4,$item);if($child-ne[IntPtr]::Zero){FindNode $child};$item=[ATID]::SendMessage($tree,0x110A,[IntPtr]1,$item)}}
  $root=[ATID]::SendMessage($tree,0x110A,[IntPtr]0,[IntPtr]::Zero)
  FindNode $root
  if($null-eq$script:foundNode){throw "inventory_palette_item_missing:$($env:ITEM_TEXT):visited=$script:visitedCount:preview=$($script:visitedPreview -join '|')"}
  $item=$script:foundNode.handle
  [void][ATID]::SendMessage($tree,0x1114,[IntPtr]::Zero,$item)
  [void][ATID]::SendMessage($tree,0x110B,[IntPtr]9,$item)
  $rb=New-Object byte[] 16;[BitConverter]::GetBytes([uint32]$item.ToInt64()).CopyTo($rb,0);[UIntPtr]$written=[UIntPtr]::Zero
  if(-not[ATID]::WriteProcessMemory($proc,$remote,$rb,[UIntPtr]::new(16),[ref]$written)){throw 'tree_rect_write_failed'}
  if([ATID]::SendMessage($tree,0x1104,[IntPtr]1,$remote).ToInt64()-eq0){throw 'tree_getitemrect_failed'}
  [UIntPtr]$read=[UIntPtr]::Zero;if(-not[ATID]::ReadProcessMemory($proc,$remote,$rb,[UIntPtr]::new(16),[ref]$read)){throw 'tree_rect_read_failed'}
  $itemRect=[pscustomobject]@{left=[BitConverter]::ToInt32($rb,0);top=[BitConverter]::ToInt32($rb,4);right=[BitConverter]::ToInt32($rb,8);bottom=[BitConverter]::ToInt32($rb,12)}
  $treeRect=Rect $tree;$gridRect=Rect $grid
  $source=[ATID+P]@{X=$treeRect.Left+[int](($itemRect.left+$itemRect.right)/2);Y=$treeRect.Top+[int](($itemRect.top+$itemRect.bottom)/2)}
  if($env:DESTINATION_KIND-eq'inventory'){$destinationHwnd=$grid;$destinationRect=$gridRect}else{
    $panelRows=@($script:panels|ForEach-Object{$r=Rect $_;[pscustomobject]@{h=$_;r=$r;width=$r.Right-$r.Left;height=$r.Bottom-$r.Top}})
    $amuletCandidates=@($panelRows|Where-Object{$candidate=$_;$candidate.width-eq32-and$candidate.height-eq64-and@($panelRows|Where-Object{$_.width-eq64-and$_.height-eq64-and$_.r.Left-eq$candidate.r.Right-and$_.r.Top-eq$candidate.r.Top}).Count-eq1})
    if($amuletCandidates.Count-ne1){throw "expected_one_amulet_slot_by_boot_neighbor:$($amuletCandidates.Count)"}
    $destinationHwnd=$amuletCandidates[0].h;$destinationRect=$amuletCandidates[0].r
  }
  $destination=if($env:DESTINATION_KIND-eq'inventory'){
    [ATID+P]@{X=$gridRect.Left+110;Y=$gridRect.Top+38}
  }else{
    [ATID+P]@{X=[int](($destinationRect.Left+$destinationRect.Right)/2);Y=[int](($destinationRect.Top+$destinationRect.Bottom)/2)}
  }
  if($env:INSPECT_ONLY-eq'true'){
    [pscustomobject]@{ok=$true;processId=$processId;dialogHwnd=$dialog.ToInt64();item=$env:ITEM_TEXT;visitedCount=$script:visitedCount;visitedPreview=$script:visitedPreview;source=@{x=$source.X;y=$source.Y;treeHwnd=$tree.ToInt64()};destination=@{kind=$env:DESTINATION_KIND;x=$destination.X;y=$destination.Y;targetHwnd=$destinationHwnd.ToInt64()};monitor=@{deviceName=$screen.DeviceName;primary=$screen.Primary};safety=@{readOnly=$true;usesGlobalCursor=$false;usesGlobalMouse=$false;usesGlobalKeyboard=$false;method='early-stop remote inventory TreeView identity and target rectangle readback only'}}|ConvertTo-Json -Depth 7 -Compress
    return
  }
  if(-not[ATID]::SetWindowPos($dialog,[IntPtr](-1),0,0,0,0,0x0013)){throw 'inventory_dialog_topmost_noactivate_failed'};$dialogRaised=$true;Start-Sleep -Milliseconds 150
  if([ATID]::WindowFromPoint($source)-ne$tree){throw 'source_window_from_point_mismatch'}
  if([ATID]::WindowFromPoint($destination)-ne$destinationHwnd){throw 'destination_window_from_point_mismatch'}
  if(([ATID]::GetAsyncKeyState(1)-band0x8000)-ne0-or([ATID]::GetAsyncKeyState(2)-band0x8000)-ne0){throw 'physical_mouse_button_down_abort'}
  $original=New-Object 'ATID+P';if(-not[ATID]::GetCursorPos([ref]$original)){throw 'cursor_read_failed'}
  $released=$false
  try{
    if(-not[ATID]::SetCursorPos($source.X,$source.Y)){throw 'cursor_source_move_failed'};Start-Sleep -Milliseconds 80
    [ATID]::mouse_event(0x0002,0,0,0,[UIntPtr]::Zero);Start-Sleep -Milliseconds 120
    for($i=1;$i-le10;$i++){[void][ATID]::SetCursorPos([int]($source.X+(($destination.X-$source.X)*$i/10)),[int]($source.Y+(($destination.Y-$source.Y)*$i/10)));Start-Sleep -Milliseconds 45}
    [ATID]::mouse_event(0x0004,0,0,0,[UIntPtr]::Zero);$released=$true;Start-Sleep -Milliseconds 250
  }finally{if(-not$released){[ATID]::mouse_event(0x0004,0,0,0,[UIntPtr]::Zero)};[void][ATID]::SetCursorPos($original.X,$original.Y)}
  $alive=@(Get-Process nwtoolset -ErrorAction SilentlyContinue)
  if($alive.Count-ne1-or$alive[0].Id-ne$processId-or-not$alive[0].Responding){throw 'toolset_not_live_after_inventory_drag'}
  [pscustomobject]@{ok=$true;processId=$processId;dialogHwnd=$dialog.ToInt64();item=$env:ITEM_TEXT;source=@{x=$source.X;y=$source.Y;treeHwnd=$tree.ToInt64()};destination=@{kind=$env:DESTINATION_KIND;x=$destination.X;y=$destination.Y;targetHwnd=$destinationHwnd.ToInt64()};cursorRestored=@{x=$original.X;y=$original.Y};monitor=@{deviceName=$screen.DeviceName;primary=$screen.Primary};safety=@{usesGlobalCursor=$true;usesGlobalMouse=$true;usesGlobalKeyboard=$false;method='temporary HWND_TOPMOST without activation, exact WindowFromPoint guards, validated physical VCL drag, immediate cursor restore, then HWND_NOTOPMOST'}}|ConvertTo-Json -Depth 7 -Compress
}finally{if($dialogRaised){[void][ATID]::SetWindowPos($dialog,[IntPtr](-2),0,0,0,0,0x0013)};[void][ATID]::VirtualFreeEx($proc,$remote,[UIntPtr]::Zero,0x8000);[void][ATID]::CloseHandle($proc)}
`;

const output = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", source], {
  encoding: "utf8",
  windowsHide: true,
  timeout: 30_000,
  maxBuffer: 4 * 1024 * 1024,
  env: { ...process.env, ITEM_TEXT: itemText, DESTINATION_KIND: destinationKind, INSPECT_ONLY: String(inspectOnly) },
});
console.log(JSON.stringify(JSON.parse(output.trim()), null, 2));

function parseArgs(argv) { const out = {}; for (let i = 0; i < argv.length; i += 2) { const key = argv[i], value = argv[i + 1]; if (!key?.startsWith("--") || value == null) throw new Error(`Expected --name <value> near ${key ?? "end"}.`); out[key.slice(2)] = value; } return out; }
function required(value, name) { const text = String(value ?? "").trim(); if (!text) throw new Error(`${name} is required.`); return text; }
