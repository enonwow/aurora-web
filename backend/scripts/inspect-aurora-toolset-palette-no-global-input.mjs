#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

const options = parseArgs(process.argv.slice(2));
const category = String(options.category ?? "creature").toLowerCase();
const categoryIndexes = {
  current: -1,
  creature: 0,
  door: 1,
  encounter: 2,
  item: 3,
  merchant: 4,
  placeable: 5,
  sound: 6,
  trigger: 7,
  waypoint: 8,
};
if (!(category in categoryIndexes)) throw new Error(`Unknown category ${category}.`);

const source = String.raw`
$ErrorActionPreference = 'Stop'
$expectedModule = $env:AURORA_PALETTE_MODULE
$expectedArea = $env:AURORA_PALETTE_AREA
$categoryIndex = [int]$env:AURORA_PALETTE_CATEGORY_INDEX
$frame = [IntPtr][int64]$env:AURORA_PALETTE_FRAME_HWND
$selectText = $env:AURORA_PALETTE_SELECT_TEXT
$placeX = [int]$env:AURORA_PALETTE_PLACE_X
$placeY = [int]$env:AURORA_PALETTE_PLACE_Y
$dragEndX = [int]$env:AURORA_PALETTE_DRAG_END_X
$dragEndY = [int]$env:AURORA_PALETTE_DRAG_END_Y
$dragSteps = [Math]::Max(1,[int]$env:AURORA_PALETTE_DRAG_STEPS)
$dragHoldMs = [Math]::Max(0,[int]$env:AURORA_PALETTE_DRAG_HOLD_MS)
$dragFromPalette = $env:AURORA_PALETTE_DRAG_FROM_PALETTE -eq 'true'
$polygonPointsText = $env:AURORA_PALETTE_POLYGON_POINTS
$restoreSelectObjects = $env:AURORA_PALETTE_RESTORE_SELECT_OBJECTS -ne 'false'

Add-Type @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class AuroraPaletteProbe {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc callback, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr parent, EnumWindowsProc callback, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr hWnd, StringBuilder text, int count);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr hWnd, uint msg, IntPtr wParam, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr hWnd, uint msg, IntPtr wParam, IntPtr lParam);
  [DllImport("kernel32.dll")] public static extern IntPtr OpenProcess(uint access, bool inherit, uint processId);
  [DllImport("kernel32.dll")] public static extern bool CloseHandle(IntPtr handle);
  [DllImport("kernel32.dll")] public static extern IntPtr VirtualAllocEx(IntPtr process, IntPtr address, UIntPtr size, uint allocationType, uint protection);
  [DllImport("kernel32.dll")] public static extern bool VirtualFreeEx(IntPtr process, IntPtr address, UIntPtr size, uint freeType);
  [DllImport("kernel32.dll")] public static extern bool WriteProcessMemory(IntPtr process, IntPtr address, byte[] buffer, UIntPtr size, out UIntPtr written);
  [DllImport("kernel32.dll")] public static extern bool ReadProcessMemory(IntPtr process, IntPtr address, byte[] buffer, UIntPtr size, out UIntPtr read);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
}
'@

function Text([IntPtr]$h) { $b=[Text.StringBuilder]::new(1024); [void][AuroraPaletteProbe]::GetWindowText($h,$b,1024); $b.ToString() }
function Get-ClassValue([IntPtr]$h) { $b=[Text.StringBuilder]::new(256); [void][AuroraPaletteProbe]::GetClassName($h,$b,256); $b.ToString() }
function Rect([IntPtr]$h) { $r=New-Object 'AuroraPaletteProbe+RECT'; [void][AuroraPaletteProbe]::GetWindowRect($h,[ref]$r); [pscustomobject]@{left=$r.Left;top=$r.Top;width=$r.Right-$r.Left;height=$r.Bottom-$r.Top;right=$r.Right;bottom=$r.Bottom} }
function UInt([int]$value) { [UIntPtr]::new([uint64]$value) }
function Read-TreeText([IntPtr]$tree,[IntPtr]$process,[IntPtr]$item) {
  $textSize=512; $itemSize=40; $commit=0x1000; $reserve=0x2000; $release=0x8000; $rw=4
  $remoteText=[AuroraPaletteProbe]::VirtualAllocEx($process,[IntPtr]::Zero,(UInt $textSize),$commit-bor$reserve,$rw)
  $remoteItem=[AuroraPaletteProbe]::VirtualAllocEx($process,[IntPtr]::Zero,(UInt $itemSize),$commit-bor$reserve,$rw)
  if($remoteText-eq[IntPtr]::Zero-or$remoteItem-eq[IntPtr]::Zero){throw 'palette_remote_alloc_failed'}
  try {
    $buffer=New-Object byte[] $itemSize
    [BitConverter]::GetBytes([uint32]1).CopyTo($buffer,0)
    [BitConverter]::GetBytes([uint32]$item.ToInt64()).CopyTo($buffer,4)
    [BitConverter]::GetBytes([uint32]$remoteText.ToInt64()).CopyTo($buffer,16)
    [BitConverter]::GetBytes([int32]$textSize).CopyTo($buffer,20)
    [UIntPtr]$written=[UIntPtr]::Zero
    if(-not[AuroraPaletteProbe]::WriteProcessMemory($process,$remoteItem,$buffer,(UInt $buffer.Length),[ref]$written)){throw 'palette_tree_item_write_failed'}
    [void][AuroraPaletteProbe]::SendMessage($tree,0x110C,[IntPtr]::Zero,$remoteItem)
    $out=New-Object byte[] $textSize; [UIntPtr]$read=[UIntPtr]::Zero
    if(-not[AuroraPaletteProbe]::ReadProcessMemory($process,$remoteText,$out,(UInt $out.Length),[ref]$read)){throw 'palette_tree_text_read_failed'}
    $zero=[Array]::IndexOf($out,[byte]0); if($zero-lt0){$zero=$out.Length}
    [Text.Encoding]::Default.GetString($out,0,$zero)
  } finally {
    [void][AuroraPaletteProbe]::VirtualFreeEx($process,$remoteText,[UIntPtr]::Zero,$release)
    [void][AuroraPaletteProbe]::VirtualFreeEx($process,$remoteItem,[UIntPtr]::Zero,$release)
  }
}
function Get-TreeItemRect([IntPtr]$tree,[IntPtr]$process,[IntPtr]$item) {
  $commit=0x1000; $reserve=0x2000; $release=0x8000; $rw=4
  $remote=[AuroraPaletteProbe]::VirtualAllocEx($process,[IntPtr]::Zero,(UInt 16),$commit-bor$reserve,$rw)
  if($remote-eq[IntPtr]::Zero){throw 'palette_tree_rect_alloc_failed'}
  try {
    $buffer=New-Object byte[] 16; [BitConverter]::GetBytes([uint32]$item.ToInt64()).CopyTo($buffer,0)
    [UIntPtr]$written=[UIntPtr]::Zero; [void][AuroraPaletteProbe]::WriteProcessMemory($process,$remote,$buffer,(UInt 16),[ref]$written)
    [void][AuroraPaletteProbe]::SendMessage($tree,0x1104,[IntPtr]1,$remote)
    $out=New-Object byte[] 16; [UIntPtr]$read=[UIntPtr]::Zero; [void][AuroraPaletteProbe]::ReadProcessMemory($process,$remote,$out,(UInt 16),[ref]$read)
    [pscustomobject]@{left=[BitConverter]::ToInt32($out,0);top=[BitConverter]::ToInt32($out,4);right=[BitConverter]::ToInt32($out,8);bottom=[BitConverter]::ToInt32($out,12)}
  } finally {[void][AuroraPaletteProbe]::VirtualFreeEx($process,$remote,[UIntPtr]::Zero,$release)}
}
function Read-ToolbarButton([IntPtr]$toolbar,[IntPtr]$process,[int]$index) {
  $remote=[AuroraPaletteProbe]::VirtualAllocEx($process,[IntPtr]::Zero,(UInt 32),0x1000,4)
  if($remote-eq[IntPtr]::Zero){throw 'selection_toolbar_remote_alloc_failed'}
  try {
    if([AuroraPaletteProbe]::SendMessage($toolbar,0x0417,[IntPtr]$index,$remote).ToInt64()-ne1){throw "selection_toolbar_getbutton_failed:$index"}
    $out=New-Object byte[] 32;[UIntPtr]$read=[UIntPtr]::Zero
    if(-not[AuroraPaletteProbe]::ReadProcessMemory($process,$remote,$out,(UInt 32),[ref]$read)){throw "selection_toolbar_read_failed:$index"}
    $state=[int]$out[8]
    [pscustomobject]@{index=$index;commandId=[BitConverter]::ToInt32($out,4);state=$state;checked=(($state-band1)-ne0);enabled=(($state-band4)-ne0)}
  } finally {[void][AuroraPaletteProbe]::VirtualFreeEx($process,$remote,[UIntPtr]::Zero,0x8000)}
}
function Add-TreeNodes([IntPtr]$tree,[IntPtr]$process,[IntPtr]$item,[int]$depth,[System.Collections.Generic.List[object]]$nodes) {
  $current=$item
  while($current-ne[IntPtr]::Zero-and$nodes.Count-lt500) {
    $child=[AuroraPaletteProbe]::SendMessage($tree,0x110A,[IntPtr]4,$current)
    $nodes.Add([pscustomobject]@{handle=$current.ToInt64();text=(Read-TreeText $tree $process $current);depth=$depth;hasChildren=$child-ne[IntPtr]::Zero})
    if($child-ne[IntPtr]::Zero-and$depth-lt4){ Add-TreeNodes $tree $process $child ($depth+1) $nodes }
    $current=[AuroraPaletteProbe]::SendMessage($tree,0x110A,[IntPtr]1,$current)
  }
}

$processes=@(Get-Process nwtoolset -ErrorAction SilentlyContinue)
if($processes.Count-ne1){throw "expected_one_toolset_process:$($processes.Count)"}
[uint32]$pidValue=$processes[0].Id
[uint32]$framePid=0; [void][AuroraPaletteProbe]::GetWindowThreadProcessId($frame,[ref]$framePid)
$frameVisible=[AuroraPaletteProbe]::IsWindowVisible($frame); $frameClass=Get-ClassValue $frame
if($frame -eq [IntPtr]::Zero -or $framePid -ne $pidValue -or -not $frameVisible -or $frameClass -ne 'TfrmFrame'){throw "expected_toolset_module_frame_missing:handle=$($frame.ToInt64()) framePid=$framePid expectedPid=$pidValue visible=$frameVisible class=$frameClass"}
$frameTitle=Text $frame
$normalizedFrameTitle=$frameTitle.TrimEnd('*')
if(-not $normalizedFrameTitle.EndsWith(" - $expectedModule",[StringComparison]::OrdinalIgnoreCase)){throw "toolset_module_title_mismatch:$frameTitle"}
$frameBounds=Rect $frame
$script:viewer=[IntPtr]::Zero; $script:toolbar=[IntPtr]::Zero; $script:selectionToolbar=[IntPtr]::Zero; $script:viewport=[IntPtr]::Zero
[void][AuroraPaletteProbe]::EnumChildWindows($frame,[AuroraPaletteProbe+EnumWindowsProc]{param($h,$l);$className=Get-ClassValue $h;$title=(Text $h).Trim().TrimStart('-').Trim();$bounds=Rect $h;if([AuroraPaletteProbe]::IsWindowVisible($h)-and$className-eq'TfrmViewerArea'-and$title-eq$expectedArea){$script:viewer=$h};if([AuroraPaletteProbe]::IsWindowVisible($h)-and$className-eq'TToolBar'-and$bounds.left-ge($frameBounds.right-400)-and$bounds.width-ge180-and$bounds.width-le240-and$bounds.height-ge18-and$bounds.height-le28){$script:toolbar=$h};if([AuroraPaletteProbe]::IsWindowVisible($h)-and$className-eq'TToolBar'-and$bounds.width-eq80-and$bounds.height-eq22){$script:selectionToolbar=$h};return $true},[IntPtr]::Zero)
if($viewer-eq[IntPtr]::Zero){throw 'expected_area_viewer_missing'}
if($toolbar-eq[IntPtr]::Zero){throw 'main_palette_toolbar_missing'}
if($selectionToolbar-eq[IntPtr]::Zero){throw 'selection_mode_toolbar_missing'}
[void][AuroraPaletteProbe]::EnumChildWindows($viewer,[AuroraPaletteProbe+EnumWindowsProc]{param($h,$l);$bounds=Rect $h;if([AuroraPaletteProbe]::IsWindowVisible($h)-and(Get-ClassValue $h)-eq'TScrollBox'-and$bounds.width-ge1000-and$bounds.height-ge700){$script:viewport=$h};return $true},[IntPtr]::Zero)
if($viewport-eq[IntPtr]::Zero){throw 'area_viewport_missing'}
$x=if($categoryIndex-ge0){$categoryIndex*23+11}else{-1}; $y=11
if($categoryIndex-ge0){$lParam=[IntPtr](($y-shl16)-bor($x-band0xffff));[void][AuroraPaletteProbe]::SendMessage($toolbar,0x0200,[IntPtr]::Zero,$lParam);[void][AuroraPaletteProbe]::SendMessage($toolbar,0x0201,[IntPtr]1,$lParam);[void][AuroraPaletteProbe]::SendMessage($toolbar,0x0202,[IntPtr]::Zero,$lParam);Start-Sleep -Milliseconds 800}
$script:trees=@()
[void][AuroraPaletteProbe]::EnumChildWindows($frame,[AuroraPaletteProbe+EnumWindowsProc]{param($h,$l);if([AuroraPaletteProbe]::IsWindowVisible($h)-and(Get-ClassValue $h)-eq'TTreeView'){$bounds=Rect $h;if($bounds.left-ge($frameBounds.right-400)-and$bounds.height-ge400){$script:trees+=[pscustomobject]@{hwnd=$h;bounds=$bounds}}};return $true},[IntPtr]::Zero)
if($trees.Count-ne1){throw "main_palette_tree_ambiguous:$($trees.Count)"}
$tree=[IntPtr]$trees[0].hwnd
$processHandle=[AuroraPaletteProbe]::OpenProcess(0x0008-bor0x0010-bor0x0020-bor0x0400,$false,$pidValue)
if($processHandle-eq[IntPtr]::Zero){throw 'palette_process_open_failed'}
$action=$null
try {
  $nodes=New-Object 'System.Collections.Generic.List[object]';$root=[AuroraPaletteProbe]::SendMessage($tree,0x110A,[IntPtr]0,[IntPtr]::Zero);Add-TreeNodes $tree $processHandle $root 0 $nodes
  if($selectText) {
    $target=@($nodes.ToArray()|Where-Object{$_.text-eq$selectText-and-not$_.hasChildren}|Select-Object -First 1)
    if($target.Count-ne1){throw "palette_leaf_missing:$selectText"}
    $targetHandle=[IntPtr][int64]$target[0].handle
    [void][AuroraPaletteProbe]::SendMessage($tree,0x110B,[IntPtr]9,$targetHandle)
    [void][AuroraPaletteProbe]::SendMessage($tree,0x1114,[IntPtr]::Zero,$targetHandle)
    Start-Sleep -Milliseconds 250
    $itemRect=Get-TreeItemRect $tree $processHandle $targetHandle
    $treeX=[Math]::Max(4,[Math]::Floor(($itemRect.left+$itemRect.right)/2));$treeY=[Math]::Max(4,[Math]::Floor(($itemRect.top+$itemRect.bottom)/2));$treeLp=[IntPtr](($treeY-shl16)-bor($treeX-band0xffff))
    [void][AuroraPaletteProbe]::SendMessage($tree,0x0201,[IntPtr]1,$treeLp);[void][AuroraPaletteProbe]::SendMessage($tree,0x0202,[IntPtr]::Zero,$treeLp)
    Start-Sleep -Milliseconds 300
    $placementMode=if($dragEndX-ge0-and$dragEndY-ge0){'drag'}else{'point'};$placementPoints=@([pscustomobject]@{x=$placeX;y=$placeY})
    if($placementMode-eq'drag'){$placementPoints+=@([pscustomobject]@{x=$dragEndX;y=$dragEndY})}
    if($polygonPointsText){$placementMode='polygon';$placementPoints=@($polygonPointsText.Split(';')|ForEach-Object{$parts=$_.Split(',');if($parts.Count-ne2){throw "invalid_polygon_point:$_"};[pscustomobject]@{x=[int]$parts[0];y=[int]$parts[1]}});if($placementPoints.Count-lt3){throw 'polygon_requires_at_least_three_points'}}
    $viewportBounds=Rect $viewport;foreach($point in $placementPoints){if($point.x-lt0-or$point.y-lt0-or$point.x-ge$viewportBounds.width-or$point.y-ge$viewportBounds.height){throw "placement_point_out_of_bounds:$($point.x),$($point.y)"}}
    if($dragFromPalette){
      $treeBounds=Rect $tree;$destination=$placementPoints[0];$destinationScreenX=$viewportBounds.left+$destination.x;$destinationScreenY=$viewportBounds.top+$destination.y
      $destinationTreeX=$destinationScreenX-$treeBounds.left;$destinationTreeY=$destinationScreenY-$treeBounds.top
      [void][AuroraPaletteProbe]::PostMessage($tree,0x0201,[IntPtr]1,$treeLp);Start-Sleep -Milliseconds 120
      for($step=1;$step-le16;$step++){
        $xStep=[int][Math]::Round($treeX+(($destinationTreeX-$treeX)*$step/16));$yStep=[int][Math]::Round($treeY+(($destinationTreeY-$treeY)*$step/16))
        $moveLp=[IntPtr](($yStep-shl16)-bor($xStep-band0xffff));[void][AuroraPaletteProbe]::PostMessage($tree,0x0200,[IntPtr]1,$moveLp);Start-Sleep -Milliseconds 55
      }
      $dropLp=[IntPtr](($destinationTreeY-shl16)-bor($destinationTreeX-band0xffff));[void][AuroraPaletteProbe]::PostMessage($tree,0x0202,[IntPtr]::Zero,$dropLp);Start-Sleep -Milliseconds 500
      $placementMode='palette-drag-drop'
    } elseif($placementMode-eq'drag'){
      $start=$placementPoints[0];$end=$placementPoints[1];$startLp=[IntPtr](($start.y-shl16)-bor($start.x-band0xffff))
      [void][AuroraPaletteProbe]::SendMessage($viewport,0x0200,[IntPtr]::Zero,$startLp)
      [void][AuroraPaletteProbe]::SendMessage($viewport,0x0201,[IntPtr]1,$startLp)
      if($dragHoldMs-gt0){Start-Sleep -Milliseconds $dragHoldMs}
      for($step=1;$step-le$dragSteps;$step++){
        $xStep=[int][Math]::Round($start.x+(($end.x-$start.x)*$step/$dragSteps));$yStep=[int][Math]::Round($start.y+(($end.y-$start.y)*$step/$dragSteps))
        $moveLp=[IntPtr](($yStep-shl16)-bor($xStep-band0xffff));[void][AuroraPaletteProbe]::SendMessage($viewport,0x0200,[IntPtr]1,$moveLp);Start-Sleep -Milliseconds 80
      }
      $endLp=[IntPtr](($end.y-shl16)-bor($end.x-band0xffff));[void][AuroraPaletteProbe]::SendMessage($viewport,0x0202,[IntPtr]::Zero,$endLp)
    } else {
      for($pointIndex=0;$pointIndex-lt$placementPoints.Count;$pointIndex++){$point=$placementPoints[$pointIndex];$placeLp=[IntPtr](($point.y-shl16)-bor($point.x-band0xffff));[void][AuroraPaletteProbe]::SendMessage($viewport,0x0200,[IntPtr]::Zero,$placeLp);[void][AuroraPaletteProbe]::SendMessage($viewport,0x0201,[IntPtr]1,$placeLp);[void][AuroraPaletteProbe]::SendMessage($viewport,0x0202,[IntPtr]::Zero,$placeLp);if($placementMode-eq'polygon'-and$pointIndex-eq($placementPoints.Count-1)){Start-Sleep -Milliseconds 100;[void][AuroraPaletteProbe]::SendMessage($viewport,0x0203,[IntPtr]1,$placeLp);[void][AuroraPaletteProbe]::SendMessage($viewport,0x0202,[IntPtr]::Zero,$placeLp)};Start-Sleep -Milliseconds 120}
    }
    Start-Sleep -Milliseconds 800
    $restored=$false;$selectionButtons=$null
    if($restoreSelectObjects){
      $selectLp=[IntPtr]((11-shl16)-bor(60-band0xffff))
      [void][AuroraPaletteProbe]::SendMessage($selectionToolbar,0x0201,[IntPtr]1,$selectLp)
      [void][AuroraPaletteProbe]::SendMessage($selectionToolbar,0x0202,[IntPtr]::Zero,$selectLp)
      Start-Sleep -Milliseconds 300
      $selectionButtons=@((Read-ToolbarButton $selectionToolbar $processHandle 0),(Read-ToolbarButton $selectionToolbar $processHandle 1))
      if($selectionButtons[0].checked-or-not$selectionButtons[1].checked){throw 'select_objects_checked_state_not_confirmed'}
      $restored=$true
    }
    $action=[pscustomobject]@{selectedText=$selectText;selectedHandle=$targetHandle.ToInt64();treeItemRect=$itemRect;treeClick=[pscustomobject]@{x=$treeX;y=$treeY};viewport=[pscustomobject]@{hwnd=$viewport.ToInt64();bounds=(Rect $viewport);placementMode=$placementMode;points=$placementPoints};selectObjectsRestored=$restored;selectObjectsToolbar=if($restored){[pscustomobject]@{hwnd=$selectionToolbar.ToInt64();targetIndex=1;nativeCommandId=1;buttons=$selectionButtons}}else{$null}}
  }
} finally {[void][AuroraPaletteProbe]::CloseHandle($processHandle)}
[pscustomobject]@{ok=$true;pid=$pidValue;module=(Text $frame);area=(Text $viewer);categoryIndex=$categoryIndex;toolbar=[pscustomobject]@{hwnd=$toolbar.ToInt64();bounds=(Rect $toolbar);click=[pscustomobject]@{x=$x;y=$y}};tree=[pscustomobject]@{hwnd=$tree.ToInt64();bounds=$trees[0].bounds;nodes=$nodes.ToArray()};action=$action;safety=[pscustomobject]@{usesGlobalCursor=$false;usesGlobalKeyboard=$false;usesGlobalMouse=$false;method='targeted TToolBar, TTreeView and Area viewport messages plus read-only remote TreeView text'}}|ConvertTo-Json -Depth 8 -Compress
`;

const dir = mkdtempSync(join(tmpdir(), "aurora-palette-probe-"));
const scriptPath = join(dir, "probe.ps1");
writeFileSync(scriptPath, source, "utf8");
try {
  const stdout = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath], {
    encoding: "utf8",
    windowsHide: true,
    timeout: 60_000,
    maxBuffer: 8 * 1024 * 1024,
    env: {
      ...process.env,
      AURORA_PALETTE_MODULE: String(options.module ?? "codex_npc_item_live_20260713.mod"),
      AURORA_PALETTE_AREA: String(options.area ?? "demo"),
      AURORA_PALETTE_CATEGORY_INDEX: String(categoryIndexes[category]),
      AURORA_PALETTE_FRAME_HWND: String(options.frameHwnd ?? "22219736"),
      AURORA_PALETTE_SELECT_TEXT: String(options.selectText ?? ""),
      AURORA_PALETTE_PLACE_X: String(options.placeX ?? "1050"),
      AURORA_PALETTE_PLACE_Y: String(options.placeY ?? "120"),
      AURORA_PALETTE_DRAG_END_X: String(options.dragEndX ?? "-1"),
      AURORA_PALETTE_DRAG_END_Y: String(options.dragEndY ?? "-1"),
      AURORA_PALETTE_DRAG_STEPS: String(options.dragSteps ?? "4"),
      AURORA_PALETTE_DRAG_HOLD_MS: String(options.dragHoldMs ?? "250"),
      AURORA_PALETTE_DRAG_FROM_PALETTE: String(options.dragFromPalette ?? "false"),
      AURORA_PALETTE_POLYGON_POINTS: String(options.polygonPoints ?? ""),
      AURORA_PALETTE_RESTORE_SELECT_OBJECTS: String(options.restoreSelectObjects ?? "true"),
    },
  }).trim();
  const result = JSON.parse(stdout);
  const rendered = `${JSON.stringify(result, null, 2)}\n`;
  if (options.out) {
    const outPath = resolve(String(options.out));
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, rendered, "utf8");
  }
  if (String(options.quiet ?? "false").toLowerCase() !== "true") {
    console.log(rendered.trimEnd());
  } else {
    console.log(JSON.stringify({ ok: result.ok, pid: result.pid, categoryIndex: result.categoryIndex, action: result.action, safety: result.safety }, null, 2));
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}

function parseArgs(args) {
  const result = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!key?.startsWith("--") || value === undefined) throw new Error(`Expected --name value, got ${key ?? "end"}.`);
    result[key.slice(2)] = value;
  }
  return result;
}
