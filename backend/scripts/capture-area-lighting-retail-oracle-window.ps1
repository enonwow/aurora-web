param(
  [string]$NwnExe = "C:\Program Files (x86)\Steam\steamapps\common\Neverwinter Nights\bin\win32\nwmain.exe",
  [string]$ModuleName = "als_light_shadow_oracle_lab",
  [string]$UserDirectory = "",
  [string]$ArtifactDir = "C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\light-shadow-2026-07-03-shadowvol-preview",
  [string]$ClientLog = "$env:USERPROFILE\Documents\Neverwinter Nights\logs\nwclientLog1.txt",
  [int]$DurationSeconds = 90,
  [int]$FallbackSnapshotSeconds = 0,
  [string]$FallbackSnapshotName = "retail-oracle-window-fallback.png",
  [int]$WindowWidth = 1280,
  [int]$WindowHeight = 900,
  [switch]$AllowFocusInput,
  [switch]$AllowTopMostWithoutFocus,
  [switch]$NoFocus,
  [switch]$NoTopMost,
  [switch]$NoEscape,
  [switch]$Overwrite
)

$ErrorActionPreference = "Stop"

throw "This retail proof launcher is retired. It starts nwmain.exe and manipulates visible/topmost windows, which can disturb display 1 and activate Nahimic. Use the guarded Toolset workflow or ingest a user-provided capture instead."

if (-not $AllowFocusInput) {
  $NoFocus = $true
  if (-not $AllowTopMostWithoutFocus) {
    $NoTopMost = $true
  }
  $NoEscape = $true
}

Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class AlsWin32 {
  public static readonly IntPtr HWND_TOPMOST = new IntPtr(-1);
  public static readonly IntPtr HWND_TOP = new IntPtr(0);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
}
"@

function Get-SecondScreen {
  $screens = [System.Windows.Forms.Screen]::AllScreens
  $target = @($screens | Where-Object { -not $_.Primary } | Sort-Object { $_.WorkingArea.X }, { $_.WorkingArea.Y } | Select-Object -First 1)[0]
  if (-not $target) {
    $target = $screens[0]
  }
  return $target
}

function Move-NwnWindowToSecondScreen($process) {
  $target = Get-SecondScreen
  $wa = $target.WorkingArea
  $width = [Math]::Min($WindowWidth, [Math]::Max(800, $wa.Width))
  $height = [Math]::Min($WindowHeight, [Math]::Max(600, $wa.Height))
  $x = $wa.X + [Math]::Max(0, [int](($wa.Width - $width) / 2))
  $y = $wa.Y + [Math]::Max(0, [int](($wa.Height - $height) / 2))
  [AlsWin32]::ShowWindow($process.MainWindowHandle, 9) | Out-Null
  $insertAfter = if ($NoTopMost) { [AlsWin32]::HWND_TOP } else { [AlsWin32]::HWND_TOPMOST }
  $flags = 0x0040
  if ($NoFocus) {
    $flags = $flags -bor 0x0010
  }
  [AlsWin32]::SetWindowPos($process.MainWindowHandle, $insertAfter, $x, $y, $width, $height, $flags) | Out-Null
  if (-not $NoFocus) {
    [AlsWin32]::SetForegroundWindow($process.MainWindowHandle) | Out-Null
  }
  return [pscustomobject]@{
    device = $target.DeviceName
    primary = $target.Primary
    x = $x
    y = $y
    width = $width
    height = $height
  }
}

function Capture-NwnWindow($process, [string]$outputPath) {
  if (-not $NoFocus) {
    [AlsWin32]::ShowWindow($process.MainWindowHandle, 9) | Out-Null
    if (-not $NoTopMost) {
      [AlsWin32]::SetWindowPos($process.MainWindowHandle, [AlsWin32]::HWND_TOPMOST, 0, 0, 0, 0, 0x0001 -bor 0x0002 -bor 0x0040) | Out-Null
    }
    [AlsWin32]::SetForegroundWindow($process.MainWindowHandle) | Out-Null
    Start-Sleep -Milliseconds 150
  }
  $rect = New-Object AlsWin32+RECT
  [AlsWin32]::GetWindowRect($process.MainWindowHandle, [ref]$rect) | Out-Null
  $width = [Math]::Max(1, $rect.Right - $rect.Left)
  $height = [Math]::Max(1, $rect.Bottom - $rect.Top)
  $bitmap = New-Object System.Drawing.Bitmap $width, $height
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.CopyFromScreen($rect.Left, $rect.Top, 0, 0, (New-Object System.Drawing.Size $width, $height))
  $bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose()
  $bitmap.Dispose()
  return [pscustomobject]@{
    outputPath = $outputPath
    left = $rect.Left
    top = $rect.Top
    width = $width
    height = $height
  }
}

function Send-EscapeToNwn($process) {
  [AlsWin32]::SetForegroundWindow($process.MainWindowHandle) | Out-Null
  Start-Sleep -Milliseconds 250
  [System.Windows.Forms.SendKeys]::SendWait("{ESC}")
}

function Write-ProximityContactSheet {
  $samples = @(
    @{ label = "near"; path = Join-Path $ArtifactDir "retail-progfx-proximity-distance-sweep-contact-sheet-near.png" },
    @{ label = "mid"; path = Join-Path $ArtifactDir "retail-progfx-proximity-distance-sweep-contact-sheet-mid.png" },
    @{ label = "far"; path = Join-Path $ArtifactDir "retail-progfx-proximity-distance-sweep-contact-sheet-far.png" }
  )
  if (($samples | Where-Object { -not (Test-Path $_.path) }).Count -gt 0) {
    return $null
  }

  $images = @($samples | ForEach-Object { [System.Drawing.Image]::FromFile($_.path) })
  try {
    $cellWidth = 426
    $cellHeight = 300
    $labelHeight = 32
    $sheetWidth = $cellWidth * $images.Count
    $sheetHeight = $cellHeight + $labelHeight
    $sheet = New-Object System.Drawing.Bitmap $sheetWidth, $sheetHeight
    $graphics = [System.Drawing.Graphics]::FromImage($sheet)
    try {
      $graphics.Clear([System.Drawing.Color]::Black)
      $font = New-Object System.Drawing.Font -ArgumentList "Arial", 14, ([System.Drawing.FontStyle]::Bold)
      $brush = [System.Drawing.Brushes]::White
      for ($index = 0; $index -lt $images.Count; $index += 1) {
        $image = $images[$index]
        $sample = $samples[$index]
        $destination = New-Object System.Drawing.Rectangle -ArgumentList ($index * $cellWidth), 0, $cellWidth, $cellHeight
        $graphics.DrawImage($image, $destination)
        $graphics.DrawString($sample.label, $font, $brush, ($index * $cellWidth + 12), ($cellHeight + 7))
      }
      $out = Join-Path $ArtifactDir "retail-progfx-proximity-distance-sweep-contact-sheet.png"
      $sheet.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
      return [pscustomobject]@{
        outputPath = $out
        samples = $samples
        width = $sheetWidth
        height = $sheetHeight
      }
    } finally {
      $graphics.Dispose()
      $sheet.Dispose()
    }
  } finally {
    foreach ($image in $images) {
      $image.Dispose()
    }
  }
}

New-Item -ItemType Directory -Force -Path $ArtifactDir | Out-Null

$existing = Get-Process nwmain -ErrorAction SilentlyContinue
if ($existing) {
  $existing | Stop-Process -Force
  Start-Sleep -Seconds 1
}

$workingDirectory = Split-Path -Parent $NwnExe
$arguments = @()
if ($UserDirectory) {
  $arguments += @("-userdirectory", "`"$UserDirectory`"")
}
$arguments += @("+TestNewModule", "`"$ModuleName`"")
$process = Start-Process -FilePath $NwnExe -WorkingDirectory $workingDirectory -ArgumentList $arguments -PassThru

$windowPlacement = $null
$deadline = (Get-Date).AddSeconds(25)
do {
  Start-Sleep -Milliseconds 250
  $process.Refresh()
  if ($process.MainWindowHandle -ne [IntPtr]::Zero) {
    $windowPlacement = Move-NwnWindowToSecondScreen $process
    break
  }
} while ((Get-Date) -lt $deadline)

if (-not $windowPlacement) {
  throw "NWN process started, but no main window handle appeared."
}

$lastLength = if (Test-Path $ClientLog) { (Get-Item $ClientLog).Length } else { 0 }
$start = Get-Date
$captured = @()
$seen = New-Object "System.Collections.Generic.HashSet[string]"
$lastMove = Get-Date
$sentEscape = $false
$fallbackSnapshotCaptured = $false

while (((Get-Date) - $start).TotalSeconds -lt $DurationSeconds) {
  if ($process.HasExited) {
    break
  }
  $process.Refresh()
  if ($process.MainWindowHandle -ne [IntPtr]::Zero -and ((Get-Date) - $lastMove).TotalSeconds -ge 2) {
    $windowPlacement = Move-NwnWindowToSecondScreen $process
    $lastMove = Get-Date
  }
  if (-not $NoEscape -and -not $sentEscape -and ((Get-Date) - $start).TotalSeconds -ge 12) {
    Send-EscapeToNwn $process
    $sentEscape = $true
  }
  if (
    $FallbackSnapshotSeconds -gt 0 -and
    -not $fallbackSnapshotCaptured -and
    ((Get-Date) - $start).TotalSeconds -ge $FallbackSnapshotSeconds
  ) {
    $fallbackPath = Join-Path $ArtifactDir $FallbackSnapshotName
    if ($Overwrite -or -not (Test-Path $fallbackPath)) {
      $capture = Capture-NwnWindow $process $fallbackPath
      $captured += [pscustomobject]@{
        artifactCue = $FallbackSnapshotName
        outputName = $FallbackSnapshotName
        line = "fallback snapshot after $FallbackSnapshotSeconds seconds without ALS_CAPTURE cue"
        captured = $true
        capture = $capture
      }
    } else {
      $captured += [pscustomobject]@{
        artifactCue = $FallbackSnapshotName
        outputName = $FallbackSnapshotName
        line = "fallback snapshot after $FallbackSnapshotSeconds seconds without ALS_CAPTURE cue"
        captured = $false
        reason = "exists"
      }
    }
    $fallbackSnapshotCaptured = $true
  }
  if (Test-Path $ClientLog) {
    $file = Get-Item $ClientLog
    if ($file.Length -lt $lastLength) {
      $lastLength = 0
    }
    if ($file.Length -gt $lastLength) {
      $stream = [System.IO.File]::Open($ClientLog, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
      try {
        $stream.Seek($lastLength, [System.IO.SeekOrigin]::Begin) | Out-Null
        $reader = New-Object System.IO.StreamReader($stream)
        $text = $reader.ReadToEnd()
        $reader.Dispose()
      } finally {
        $stream.Dispose()
      }
      $lastLength = $file.Length
      foreach ($line in ($text -split "\r?\n")) {
        if ($line -match "ALS_CAPTURE\s+(?<artifact>[A-Za-z0-9_.-]+\.(png|json))") {
          $artifact = $Matches.artifact
          $key = "$artifact|$line"
          if ($seen.Add($key)) {
            if ($artifact.ToLowerInvariant().EndsWith(".png")) {
              $outputName = $artifact
              if ($line -match "sample=(?<sample>[A-Za-z0-9_-]+)") {
                $stem = [System.IO.Path]::GetFileNameWithoutExtension($artifact)
                $outputName = "$stem-$($Matches.sample).png"
              }
              $outputPath = Join-Path $ArtifactDir $outputName
              if ($Overwrite -or -not (Test-Path $outputPath)) {
                $capture = Capture-NwnWindow $process $outputPath
                $captured += [pscustomobject]@{
                  artifactCue = $artifact
                  outputName = $outputName
                  line = $line
                  captured = $true
                  capture = $capture
                }
              } else {
                $captured += [pscustomobject]@{
                  artifactCue = $artifact
                  outputName = $outputName
                  line = $line
                  captured = $false
                  reason = "exists"
                }
              }
            } else {
              $captured += [pscustomobject]@{
                artifactCue = $artifact
                line = $line
                captured = $false
                reason = "json-cue-not-fabricated"
              }
            }
          }
        }
      }
    }
  }
  Start-Sleep -Milliseconds 250
}

$contactSheet = Write-ProximityContactSheet
if ($contactSheet) {
  $captured += [pscustomobject]@{
    artifactCue = "retail-progfx-proximity-distance-sweep-contact-sheet.png"
    outputName = "retail-progfx-proximity-distance-sweep-contact-sheet.png"
    line = "assembled from near/mid/far retail captures"
    captured = $true
    capture = $contactSheet
  }
}

[pscustomobject]@{
  status = "finished"
  processId = $process.Id
  processExited = $process.HasExited
  moduleName = $ModuleName
  userDirectory = $UserDirectory
  artifactDir = $ArtifactDir
  clientLog = $ClientLog
  secondScreen = $windowPlacement
  safety = [pscustomobject]@{
    focusInputRequiresExplicitOptIn = $true
    allowFocusInput = [bool]$AllowFocusInput
    usesGlobalCursor = $false
    usesGlobalKeyboard = -not $NoEscape
    usesForegroundWindow = -not $NoFocus
    usesTopmost = -not $NoTopMost
    safeNoFocusMode = [bool]($NoFocus -and $NoEscape)
    noFocusTopMostMode = [bool]($NoFocus -and (-not $NoTopMost) -and $NoEscape)
  }
  capturedCount = @($captured | Where-Object { $_.captured }).Count
  cues = $captured
} | ConvertTo-Json -Depth 8
