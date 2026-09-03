#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(scriptDir, "..");
const artifactRoot = resolve(
  backendRoot,
  "docs",
  "aurora-reverse",
  "artifacts",
  "last-city-apartment-area"
);
const moduleOpenSessionGuardPath = resolve(artifactRoot, "toolset-module-open-session-guard.json");

const expectedAreaName = process.env.AURORA_TOOLSET_EXPECTED_AREA_NAME ?? "Ostatnie Miasto - Port, Mieszkanie Kartografa";
const expectedAreaResref = process.env.AURORA_TOOLSET_EXPECTED_AREA ?? "cdx_mapflat01";
const expectedModuleParts = (process.env.AURORA_TOOLSET_EXPECTED_MODULE_PARTS ?? "the_last_city|codex.mod")
  .split("|")
  .map((part) => part.trim().toLowerCase())
  .filter(Boolean);
const allowRepeatAreaOpen = process.env.AURORA_TOOLSET_ALLOW_REPEAT_AREA_OPEN === "1";
const completedAreaOpenGuard = findFreshCompletedAreaOpenGuard();

if (completedAreaOpenGuard && !allowRepeatAreaOpen) {
  console.log(
    JSON.stringify(
      {
        ok: false,
        blockerCode: "area_open_session_already_completed",
        safety: {
          usesGlobalInput: false,
          usesGlobalCursor: false,
          usesGlobalKeyboard: false,
          usesGlobalMouse: false,
          usesGlobalMouseWheel: false,
          savesModule: false,
          changesIniOrMru: false,
          usesGlobalDrag: false,
          method: "persistent area-open guard; refuse a second TreeView double-click for an already-opened area"
        },
        expectedAreaName,
        expectedAreaResref,
        expectedModuleParts,
        completedAreaOpenGuard,
        hint:
          "Do not run the area opener again for the same loaded module/area. Use read-only screenshot/capture tools, or close Toolset and release the module-open guard first."
      },
      null,
      2
    )
  );
  process.exit(2);
}

function runPowerShellScript(script, options) {
  const tempDir = mkdtempSync(join(tmpdir(), "aurora-toolset-area-ps-"));
  const scriptPath = join(tempDir, "script.ps1");
  writeFileSync(scriptPath, script, "utf8");
  try {
    return execFileSync(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath],
      options
    );
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

const script = String.raw`
$ErrorActionPreference = 'Stop'
$expectedAreaName = $env:AURORA_TOOLSET_EXPECTED_AREA_NAME
$expectedAreaResref = $env:AURORA_TOOLSET_EXPECTED_AREA
$expectedModuleParts = @($env:AURORA_TOOLSET_EXPECTED_MODULE_PARTS -split '\|' | ForEach-Object { $_.Trim().ToLowerInvariant() } | Where-Object { $_ })

Add-Type @'
using System;
using System.Text;
using System.Runtime.InteropServices;

public static class ToolsetTreeOpen {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

  [DllImport("user32.dll")]
  public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

  [DllImport("user32.dll")]
  public static extern bool EnumChildWindows(IntPtr hWndParent, EnumWindowsProc lpEnumFunc, IntPtr lParam);

  [DllImport("user32.dll")]
  public static extern bool IsWindowVisible(IntPtr hWnd);

  [DllImport("user32.dll")]
  public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);

  [DllImport("user32.dll", SetLastError=true)]
  public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

  [DllImport("user32.dll", SetLastError=true)]
  public static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);

  [DllImport("user32.dll")]
  public static extern IntPtr SendMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

  [DllImport("kernel32.dll", SetLastError=true)]
  public static extern IntPtr OpenProcess(uint dwDesiredAccess, bool bInheritHandle, uint dwProcessId);

  [DllImport("kernel32.dll", SetLastError=true)]
  public static extern bool CloseHandle(IntPtr hObject);

  [DllImport("kernel32.dll", SetLastError=true)]
  public static extern IntPtr VirtualAllocEx(IntPtr hProcess, IntPtr lpAddress, UIntPtr dwSize, uint flAllocationType, uint flProtect);

  [DllImport("kernel32.dll", SetLastError=true)]
  public static extern bool VirtualFreeEx(IntPtr hProcess, IntPtr lpAddress, UIntPtr dwSize, uint dwFreeType);

  [DllImport("kernel32.dll", SetLastError=true)]
  public static extern bool WriteProcessMemory(IntPtr hProcess, IntPtr lpBaseAddress, byte[] lpBuffer, UIntPtr nSize, out UIntPtr lpNumberOfBytesWritten);

  [DllImport("kernel32.dll", SetLastError=true)]
  public static extern bool ReadProcessMemory(IntPtr hProcess, IntPtr lpBaseAddress, byte[] lpBuffer, UIntPtr nSize, out UIntPtr lpNumberOfBytesRead);
}
'@

function Get-WindowTextValue([IntPtr]$hwnd) {
  $builder = New-Object System.Text.StringBuilder 512
  [void][ToolsetTreeOpen]::GetWindowText($hwnd, $builder, 512)
  return $builder.ToString()
}

function Get-ClassNameValue([IntPtr]$hwnd) {
  $builder = New-Object System.Text.StringBuilder 256
  [void][ToolsetTreeOpen]::GetClassName($hwnd, $builder, 256)
  return $builder.ToString()
}

function Find-ExpectedAreaViewer([IntPtr]$parent) {
  $script:expectedAreaViewer = $null
  $viewerEnum = [ToolsetTreeOpen+EnumWindowsProc]{
    param($hwnd, $lparam)
    if (-not [ToolsetTreeOpen]::IsWindowVisible($hwnd)) {
      return $true
    }
    $className = Get-ClassNameValue $hwnd
    $title = Get-WindowTextValue $hwnd
    if ($className -eq 'TfrmViewerArea' -and $title.ToLowerInvariant().Contains($expectedAreaResref.ToLowerInvariant())) {
      $script:expectedAreaViewer = [pscustomobject]@{
        hwnd = $hwnd.ToInt64()
        title = $title
        className = $className
      }
      return $false
    }
    return $true
  }
  [void][ToolsetTreeOpen]::EnumChildWindows($parent, $viewerEnum, [IntPtr]::Zero)
  return $script:expectedAreaViewer
}

function Wait-ExpectedAreaViewer([IntPtr]$parent, [int]$timeoutMs = 60000) {
  $startedAt = Get-Date
  do {
    $viewer = Find-ExpectedAreaViewer $parent
    if ($null -ne $viewer) {
      return [pscustomobject]@{
        viewer = $viewer
        elapsedMs = [int]((Get-Date) - $startedAt).TotalMilliseconds
      }
    }
    Start-Sleep -Milliseconds 100
  } while (((Get-Date) - $startedAt).TotalMilliseconds -lt $timeoutMs)
  return $null
}

function New-LParam([int]$x, [int]$y) {
  return [IntPtr](($y -shl 16) -bor ($x -band 0xffff))
}

function New-UIntPtrValue([int]$value) {
  return [UIntPtr]::new([uint64]$value)
}

function Read-TreeItemText([IntPtr]$tree, [IntPtr]$processHandle, [IntPtr]$item) {
  $TVM_GETITEMA = 0x110C
  $TVIF_TEXT = 0x0001
  $MEM_COMMIT = 0x1000
  $MEM_RESERVE = 0x2000
  $MEM_RELEASE = 0x8000
  $PAGE_READWRITE = 0x04

  $textBytes = 512
  $itemBytes = 40
  $remoteText = [ToolsetTreeOpen]::VirtualAllocEx($processHandle, [IntPtr]::Zero, (New-UIntPtrValue $textBytes), $MEM_COMMIT -bor $MEM_RESERVE, $PAGE_READWRITE)
  $remoteItem = [ToolsetTreeOpen]::VirtualAllocEx($processHandle, [IntPtr]::Zero, (New-UIntPtrValue $itemBytes), $MEM_COMMIT -bor $MEM_RESERVE, $PAGE_READWRITE)
  if ($remoteText -eq [IntPtr]::Zero -or $remoteItem -eq [IntPtr]::Zero) {
    throw 'VirtualAllocEx failed for TreeView item read.'
  }

  try {
    $buffer = New-Object byte[] $itemBytes
    [BitConverter]::GetBytes([uint32]$TVIF_TEXT).CopyTo($buffer, 0)
    [BitConverter]::GetBytes([uint32]$item.ToInt64()).CopyTo($buffer, 4)
    [BitConverter]::GetBytes([uint32]$remoteText.ToInt64()).CopyTo($buffer, 16)
    [BitConverter]::GetBytes([int32]$textBytes).CopyTo($buffer, 20)
    [UIntPtr]$written = [UIntPtr]::Zero
    if (-not [ToolsetTreeOpen]::WriteProcessMemory($processHandle, $remoteItem, $buffer, (New-UIntPtrValue $buffer.Length), [ref]$written)) {
      throw 'WriteProcessMemory failed for TVITEMA.'
    }
    [void][ToolsetTreeOpen]::SendMessage($tree, $TVM_GETITEMA, [IntPtr]::Zero, $remoteItem)
    $textBuffer = New-Object byte[] $textBytes
    [UIntPtr]$read = [UIntPtr]::Zero
    if (-not [ToolsetTreeOpen]::ReadProcessMemory($processHandle, $remoteText, $textBuffer, (New-UIntPtrValue $textBuffer.Length), [ref]$read)) {
      throw 'ReadProcessMemory failed for TreeView text.'
    }
    $zero = [Array]::IndexOf($textBuffer, [byte]0)
    if ($zero -lt 0) { $zero = $textBuffer.Length }
    return [System.Text.Encoding]::Default.GetString($textBuffer, 0, $zero)
  } finally {
    if ($remoteText -ne [IntPtr]::Zero) { [void][ToolsetTreeOpen]::VirtualFreeEx($processHandle, $remoteText, [UIntPtr]::Zero, $MEM_RELEASE) }
    if ($remoteItem -ne [IntPtr]::Zero) { [void][ToolsetTreeOpen]::VirtualFreeEx($processHandle, $remoteItem, [UIntPtr]::Zero, $MEM_RELEASE) }
  }
}

function Get-TreeItemRect([IntPtr]$tree, [IntPtr]$processHandle, [IntPtr]$item) {
  $TVM_GETITEMRECT = 0x1104
  $MEM_COMMIT = 0x1000
  $MEM_RESERVE = 0x2000
  $MEM_RELEASE = 0x8000
  $PAGE_READWRITE = 0x04
  $remoteRect = [ToolsetTreeOpen]::VirtualAllocEx($processHandle, [IntPtr]::Zero, (New-UIntPtrValue 16), $MEM_COMMIT -bor $MEM_RESERVE, $PAGE_READWRITE)
  if ($remoteRect -eq [IntPtr]::Zero) {
    throw 'VirtualAllocEx failed for TreeView rect.'
  }
  try {
    $buffer = New-Object byte[] 16
    [BitConverter]::GetBytes([uint32]$item.ToInt64()).CopyTo($buffer, 0)
    [UIntPtr]$written = [UIntPtr]::Zero
    [void][ToolsetTreeOpen]::WriteProcessMemory($processHandle, $remoteRect, $buffer, (New-UIntPtrValue $buffer.Length), [ref]$written)
    [void][ToolsetTreeOpen]::SendMessage($tree, $TVM_GETITEMRECT, [IntPtr]1, $remoteRect)
    $out = New-Object byte[] 16
    [UIntPtr]$read = [UIntPtr]::Zero
    [void][ToolsetTreeOpen]::ReadProcessMemory($processHandle, $remoteRect, $out, (New-UIntPtrValue $out.Length), [ref]$read)
    return @{
      left = [BitConverter]::ToInt32($out, 0)
      top = [BitConverter]::ToInt32($out, 4)
      right = [BitConverter]::ToInt32($out, 8)
      bottom = [BitConverter]::ToInt32($out, 12)
    }
  } finally {
    [void][ToolsetTreeOpen]::VirtualFreeEx($processHandle, $remoteRect, [UIntPtr]::Zero, $MEM_RELEASE)
  }
}

$toolsetWindows = New-Object System.Collections.Generic.List[object]
$enum = [ToolsetTreeOpen+EnumWindowsProc]{
  param($hwnd, $lparam)
  if (-not [ToolsetTreeOpen]::IsWindowVisible($hwnd)) { return $true }
  $className = Get-ClassNameValue $hwnd
  $title = Get-WindowTextValue $hwnd
  if ($className -eq 'TfrmFrame' -and $title -like '*Neverwinter Nights Toolset*') {
    $lower = $title.ToLowerInvariant()
    $matches = $true
    foreach ($part in $expectedModuleParts) {
      if (-not $lower.Contains($part)) { $matches = $false }
    }
    if ($matches) {
      [uint32]$processId = 0
      [void][ToolsetTreeOpen]::GetWindowThreadProcessId($hwnd, [ref]$processId)
      $toolsetWindows.Add([pscustomobject]@{ hwnd=$hwnd; title=$title; processId=$processId })
    }
  }
  return $true
}
[void][ToolsetTreeOpen]::EnumWindows($enum, [IntPtr]::Zero)
if ($toolsetWindows.Count -eq 0) {
  throw "No visible Toolset module window matched parts: $($expectedModuleParts -join ', ')"
}
$window = $toolsetWindows[0]

$treeViews = New-Object System.Collections.Generic.List[object]
$childEnum = [ToolsetTreeOpen+EnumWindowsProc]{
  param($hwnd, $lparam)
  if ((Get-ClassNameValue $hwnd) -eq 'TTreeView') {
    $treeViews.Add([pscustomobject]@{ hwnd=$hwnd })
  }
  return $true
}
[void][ToolsetTreeOpen]::EnumChildWindows($window.hwnd, $childEnum, [IntPtr]::Zero)
if ($treeViews.Count -eq 0) {
  throw 'No TTreeView child was found in the Toolset window.'
}

$PROCESS_VM_OPERATION = 0x0008
$PROCESS_VM_READ = 0x0010
$PROCESS_VM_WRITE = 0x0020
$PROCESS_QUERY_INFORMATION = 0x0400
$processHandle = [ToolsetTreeOpen]::OpenProcess($PROCESS_VM_OPERATION -bor $PROCESS_VM_READ -bor $PROCESS_VM_WRITE -bor $PROCESS_QUERY_INFORMATION, $false, [uint32]$window.processId)
if ($processHandle -eq [IntPtr]::Zero) {
  throw 'OpenProcess failed for Toolset.'
}

$TVM_GETNEXTITEM = 0x110A
$TVM_EXPAND = 0x1102
$TVM_SELECTITEM = 0x110B
$TVM_ENSUREVISIBLE = 0x1114
$TVGN_ROOT = 0
$TVGN_NEXT = 1
$TVGN_CHILD = 4
$TVGN_CARET = 9
$TVE_EXPAND = 2
$WM_LBUTTONDOWN = 0x0201
$WM_LBUTTONUP = 0x0202
$WM_LBUTTONDBLCLK = 0x0203
$MK_LBUTTON = 0x0001

try {
  $treeProbes = New-Object System.Collections.Generic.List[object]
  $bestTree = [IntPtr]::Zero
  $bestScore = -999
  foreach ($candidate in $treeViews) {
    $candidateTree = $candidate.hwnd
    $rootTexts = New-Object System.Collections.Generic.List[string]
    $root = [ToolsetTreeOpen]::SendMessage($candidateTree, $TVM_GETNEXTITEM, [IntPtr]$TVGN_ROOT, [IntPtr]::Zero)
    $rootLimit = 0
    while ($root -ne [IntPtr]::Zero -and $rootLimit -lt 12) {
      $rootTexts.Add((Read-TreeItemText $candidateTree $processHandle $root))
      $root = [ToolsetTreeOpen]::SendMessage($candidateTree, $TVM_GETNEXTITEM, [IntPtr]$TVGN_NEXT, $root)
      $rootLimit += 1
    }

    $rootSample = ($rootTexts -join ' | ')
    $sampleLower = $rootSample.ToLowerInvariant()
    $score = 0
    if ([ToolsetTreeOpen]::IsWindowVisible($candidateTree)) { $score += 10 }
    if ($sampleLower.Contains('areas')) { $score += 50 }
    if ($sampleLower.Contains('conversations')) { $score += 20 }
    if ($sampleLower.Contains('scripts')) { $score += 20 }
    if ($sampleLower.Contains('plot wizard')) { $score -= 80 }
    if ($sampleLower.Contains('creatures') -or $sampleLower.Contains('placeables')) { $score -= 20 }

    $treeProbes.Add([pscustomobject]@{
      hwnd = $candidateTree.ToInt64()
      visible = [ToolsetTreeOpen]::IsWindowVisible($candidateTree)
      score = $score
      roots = @($rootTexts)
    })

    if ($score -gt $bestScore) {
      $bestScore = $score
      $bestTree = $candidateTree
    }
  }

  if ($bestTree -eq [IntPtr]::Zero -or $bestScore -lt 50) {
    $samples = ($treeProbes | ForEach-Object { "$($_.hwnd):$($_.score):$($_.roots -join ' / ')" }) -join ' || '
    throw "No module contents TreeView was found. Probes: $samples"
  }

  $tree = $bestTree
  $visited = New-Object System.Collections.Generic.List[object]
  $found = [IntPtr]::Zero
  $foundText = $null
  $areasRoot = [IntPtr]::Zero
  $root = [ToolsetTreeOpen]::SendMessage($tree, $TVM_GETNEXTITEM, [IntPtr]$TVGN_ROOT, [IntPtr]::Zero)
  while ($root -ne [IntPtr]::Zero) {
    $text = Read-TreeItemText $tree $processHandle $root
    $visited.Add([pscustomobject]@{ handle=$root.ToInt64(); text=$text; depth=0 })
    if ($text -eq 'Areas') {
      $areasRoot = $root
      break
    }
    $root = [ToolsetTreeOpen]::SendMessage($tree, $TVM_GETNEXTITEM, [IntPtr]$TVGN_NEXT, $root)
  }

  if ($areasRoot -eq [IntPtr]::Zero) {
    $sample = ($visited | ForEach-Object { $_.text }) -join ' | '
    throw "Areas root not found in module contents tree. Roots: $sample"
  }

  [void][ToolsetTreeOpen]::SendMessage($tree, $TVM_EXPAND, [IntPtr]$TVE_EXPAND, $areasRoot)
  Start-Sleep -Milliseconds 250

  $areaItem = [ToolsetTreeOpen]::SendMessage($tree, $TVM_GETNEXTITEM, [IntPtr]$TVGN_CHILD, $areasRoot)
  while ($areaItem -ne [IntPtr]::Zero -and $visited.Count -lt 10000) {
    $text = Read-TreeItemText $tree $processHandle $areaItem
    $visited.Add([pscustomobject]@{ handle=$areaItem.ToInt64(); text=$text; depth=1 })
    $textLower = $text.ToLowerInvariant()
    if ($text -eq $expectedAreaName -or $textLower -eq $expectedAreaResref.ToLowerInvariant() -or $textLower.Contains($expectedAreaResref.ToLowerInvariant())) {
      $found = $areaItem
      $foundText = $text
      break
    }
    $areaItem = [ToolsetTreeOpen]::SendMessage($tree, $TVM_GETNEXTITEM, [IntPtr]$TVGN_NEXT, $areaItem)
  }

  if ($found -eq [IntPtr]::Zero) {
    $sample = ($visited | Where-Object { $_.depth -eq 1 } | Select-Object -First 50 | ForEach-Object { $_.text }) -join ' | '
    throw "Area item not found among direct Areas children. Visited $($visited.Count) tree items. Sample: $sample"
  }

  [void][ToolsetTreeOpen]::SendMessage($tree, $TVM_SELECTITEM, [IntPtr]$TVGN_CARET, $found)
  [void][ToolsetTreeOpen]::SendMessage($tree, $TVM_ENSUREVISIBLE, [IntPtr]::Zero, $found)
  Start-Sleep -Milliseconds 150
  $rect = Get-TreeItemRect $tree $processHandle $found
  $x = [Math]::Max(4, [Math]::Floor(($rect.left + $rect.right) / 2))
  $y = [Math]::Max(4, [Math]::Floor(($rect.top + $rect.bottom) / 2))
  $lp = New-LParam $x $y
  [void][ToolsetTreeOpen]::SendMessage($tree, $WM_LBUTTONDOWN, [IntPtr]$MK_LBUTTON, $lp)
  [void][ToolsetTreeOpen]::SendMessage($tree, $WM_LBUTTONUP, [IntPtr]::Zero, $lp)
  Start-Sleep -Milliseconds 80
  $areaOpenStartedAt = Get-Date
  [void][ToolsetTreeOpen]::SendMessage($tree, $WM_LBUTTONDBLCLK, [IntPtr]$MK_LBUTTON, $lp)
  [void][ToolsetTreeOpen]::SendMessage($tree, $WM_LBUTTONUP, [IntPtr]::Zero, $lp)
  $areaReady = Wait-ExpectedAreaViewer ([IntPtr][int64]$window.hwnd)
  if ($null -eq $areaReady) {
    throw "Area viewer $expectedAreaResref did not become ready within 60000 ms."
  }

  @{
    ok = $true
    safety = @{
      usesGlobalInput = $false
      usesGlobalCursor = $false
      usesGlobalKeyboard = $false
      usesGlobalMouse = $false
      usesGlobalMouseWheel = $false
      savesModule = $false
      changesIniOrMru = $false
    }
    method = 'targeted TreeView messages, no global mouse or keyboard'
    moduleWindowTitle = $window.title
    treeViewHwnd = $tree.ToInt64()
    treeViewScore = $bestScore
    treeViewProbeCount = $treeProbes.Count
    areaItemText = $foundText
    visitedTreeItems = $visited.Count
    clickPointX = [int]$x
    clickPointY = [int]$y
    areaViewerHwnd = $areaReady.viewer.hwnd
    areaViewerTitle = $areaReady.viewer.title
    areaReadyElapsedMs = $areaReady.elapsedMs
  } | ConvertTo-Json -Depth 5
} finally {
  [void][ToolsetTreeOpen]::CloseHandle($processHandle)
}
`;

const output = runPowerShellScript(script, {
  encoding: "utf8",
  env: {
    ...process.env,
    AURORA_TOOLSET_EXPECTED_AREA_NAME: expectedAreaName,
    AURORA_TOOLSET_EXPECTED_AREA: expectedAreaResref,
    AURORA_TOOLSET_EXPECTED_MODULE_PARTS: expectedModuleParts.join("|")
  },
  maxBuffer: 1024 * 1024 * 8
});

console.log(output.trim());

function findFreshCompletedAreaOpenGuard() {
  if (!existsSync(moduleOpenSessionGuardPath)) {
    return null;
  }
  let guard = null;
  try {
    guard = JSON.parse(readFileSync(moduleOpenSessionGuardPath, "utf8"));
  } catch (error) {
    return {
      guardPath: moduleOpenSessionGuardPath,
      unreadable: true,
      error: error?.message ?? String(error)
    };
  }
  if (String(guard?.state ?? "") !== "module_and_area_opened") {
    return null;
  }
  const guardAgeMs = getGuardAgeMs(guard);
  if (guardAgeMs === null || guardAgeMs > 30 * 60 * 1000) {
    return null;
  }
  const guardArea = String(guard.expectedAreaResref ?? "").toLowerCase();
  if (guardArea && guardArea !== expectedAreaResref.toLowerCase()) {
    return null;
  }
  const guardParts = Array.isArray(guard.expectedModuleParts)
    ? guard.expectedModuleParts.map((part) => String(part).toLowerCase())
    : String(guard.modulePath ? basename(guard.modulePath) : "")
        .toLowerCase()
        .split("|")
        .filter(Boolean);
  const matchesModule = expectedModuleParts.every((part) =>
    guardParts.some((guardPart) => guardPart.includes(part) || part.includes(guardPart))
  );
  if (!matchesModule) {
    return null;
  }
  return {
    guardPath: moduleOpenSessionGuardPath,
    state: guard.state,
    updatedAt: guard.updatedAt ?? null,
    guardAgeMs,
    modulePath: guard.modulePath ?? null,
    expectedAreaResref: guard.expectedAreaResref ?? null,
    expectedAreaName: guard.expectedAreaName ?? null,
    areaOpenOk: guard.areaOpenOk === true
  };
}

function getGuardAgeMs(guard) {
  const updatedAt = Date.parse(guard?.updatedAt ?? guard?.acquiredAt ?? "");
  if (!Number.isFinite(updatedAt)) {
    return null;
  }
  return Math.max(0, Date.now() - updatedAt);
}
