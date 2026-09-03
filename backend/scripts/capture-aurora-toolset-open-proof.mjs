#!/usr/bin/env node
// Read-only proof of a loaded Aurora Toolset frame. This deliberately does not
// open an area or compare scene content: it only proves the module window is
// present on the approved physical display.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";

const options = parseArgs(process.argv.slice(2));
const moduleName = requiredText(options.module, "--module");
const outPath = resolve(requiredText(options.out, "--out"));
mkdirSync(dirname(outPath), { recursive: true });

const source = String.raw`
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms
$expectedModule = $env:AURORA_OPEN_PROOF_MODULE
$outPath = $env:AURORA_OPEN_PROOF_OUT
$approvedScreen = $env:AURORA_OPEN_PROOF_SCREEN
Add-Type @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class AuroraOpenProof {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc callback, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr parent, EnumWindowsProc callback, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr hWnd, IntPtr hdcBlt, uint flags);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
}
'@
function Text([IntPtr]$hwnd) { $buffer = New-Object System.Text.StringBuilder 1024; [void][AuroraOpenProof]::GetWindowText($hwnd, $buffer, $buffer.Capacity); $buffer.ToString() }
function Rect([IntPtr]$hwnd) { $rect = New-Object 'AuroraOpenProof+RECT'; if (-not [AuroraOpenProof]::GetWindowRect($hwnd, [ref]$rect)) { throw 'GetWindowRect failed.' }; [pscustomobject]@{ left=$rect.Left; top=$rect.Top; width=$rect.Right-$rect.Left; height=$rect.Bottom-$rect.Top } }
function Has-Image-Variation([System.Drawing.Bitmap]$bitmap) {
  $min = 255; $max = 0
  for ($y = 0; $y -lt $bitmap.Height; $y += 12) { for ($x = 0; $x -lt $bitmap.Width; $x += 12) { $p = $bitmap.GetPixel($x, $y); foreach ($v in @($p.R,$p.G,$p.B)) { $min=[Math]::Min($min,[int]$v); $max=[Math]::Max($max,[int]$v) } } }
  return ($max - $min) -ge 12
}
$processes = @(Get-Process nwtoolset -ErrorAction SilentlyContinue)
if ($processes.Count -ne 1) { throw "Expected exactly one nwtoolset process, found $($processes.Count)." }
$toolsetPid = [uint32]$processes[0].Id
$script:windows = @()
$callback = [AuroraOpenProof+EnumWindowsProc]{ param($hwnd,$lparam); [uint32]$windowPid=0; [void][AuroraOpenProof]::GetWindowThreadProcessId($hwnd,[ref]$windowPid); if ($windowPid -eq $toolsetPid -and [AuroraOpenProof]::IsWindowVisible($hwnd)) { $script:windows += [pscustomobject]@{ hwnd=$hwnd; title=(Text $hwnd); bounds=(Rect $hwnd) } }; return $true }
[void][AuroraOpenProof]::EnumWindows($callback,[IntPtr]::Zero)
$moduleWindow = @($windows | Where-Object { $_.title.TrimEnd('*').EndsWith(" - $expectedModule", [StringComparison]::OrdinalIgnoreCase) }) | Select-Object -First 1
if ($null -eq $moduleWindow) { throw 'Expected exact loaded module window was not found.' }
$screen = [System.Windows.Forms.Screen]::FromHandle($moduleWindow.hwnd)
if ($screen.DeviceName -ne $approvedScreen -or $screen.Primary) { throw "Module window is not on approved non-primary display: expected=$approvedScreen actual=$($screen.DeviceName) primary=$($screen.Primary)." }
$script:texts = @($moduleWindow.title)
$childCallback = [AuroraOpenProof+EnumWindowsProc]{ param($hwnd,$lparam); $text=Text $hwnd; if ($text) { $script:texts += $text }; return $true }
[void][AuroraOpenProof]::EnumChildWindows($moduleWindow.hwnd,$childCallback,[IntPtr]::Zero)
$allText = $texts -join [Environment]::NewLine
if ($allText -match 'Access violation|List index out of bounds|Read of address|Write of address|Loading Inventory List|did not close properly|try to recover|recover it') { throw 'Toolset is unsafe or still loading; open proof was not captured.' }
$width=[int]$moduleWindow.bounds.width; $height=[int]$moduleWindow.bounds.height
if ($width -lt 640 -or $height -lt 480) { throw "Module window is unexpectedly small: $width x $height." }
$bitmap=[System.Drawing.Bitmap]::new($width,$height,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics=[System.Drawing.Graphics]::FromImage($bitmap)
try { $hdc=$graphics.GetHdc(); try { if (-not [AuroraOpenProof]::PrintWindow($moduleWindow.hwnd,$hdc,2)) { throw 'PrintWindow failed for module frame.' } } finally { $graphics.ReleaseHdc($hdc) }; if (-not (Has-Image-Variation $bitmap)) { throw 'Captured module frame has insufficient image variation.' }; $bitmap.Save($outPath,[System.Drawing.Imaging.ImageFormat]::Png) } finally { $graphics.Dispose(); $bitmap.Dispose() }
[pscustomobject]@{ ok=$true; evidenceKind='aurora-toolset-open-placement/v1'; moduleTitle=$moduleWindow.title; processId=$toolsetPid; pngPath=$outPath; bounds=$moduleWindow.bounds; monitorEvidence=[pscustomobject]@{ physicalDevice=$screen.DeviceName; primary=$screen.Primary; verifiedBy='Screen.FromHandle(moduleWindow)' }; safety=[pscustomobject]@{ usesGlobalCursor=$false; usesGlobalKeyboard=$false; usesGlobalMouse=$false; method='read-only PrintWindow of verified Toolset module frame' } } | ConvertTo-Json -Compress
`;

try {
  const output = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", source], {
    encoding: "utf8", windowsHide: true, timeout: 30_000, maxBuffer: 1024 * 1024,
    env: { ...process.env, AURORA_OPEN_PROOF_MODULE: moduleName, AURORA_OPEN_PROOF_OUT: outPath, AURORA_OPEN_PROOF_SCREEN: "\\\\.\\DISPLAY1" },
  }).trim();
  const result = JSON.parse(output);
  if (!result.ok || !existsSync(outPath) || statSync(outPath).size < 1024) throw new Error("Open proof PNG was not written.");
  console.log(JSON.stringify({ ...result, pngBytes: statSync(outPath).size }, null, 2));
} catch (error) {
  console.log(JSON.stringify({ ok: false, blockerCode: "aurora_toolset_open_proof_failed", message: error instanceof Error ? error.message : String(error), pngPath: outPath }, null, 2));
  process.exitCode = 2;
}

function parseArgs(argv) { const result = {}; for (let index=0; index<argv.length; index+=2) { const token=argv[index]; const value=argv[index+1]; if (!token?.startsWith("--") || value === undefined || value.startsWith("--")) throw new Error(`Expected --name <value>, received ${token ?? "end"}.`); result[token.slice(2)] = value; } return result; }
function requiredText(value, name) { const text=String(value ?? "").trim(); if (!text) throw new Error(`${name} is required.`); return text; }
