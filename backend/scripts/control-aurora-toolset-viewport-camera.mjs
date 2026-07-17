#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeAuroraToolsetGridPose } from "./analyze-aurora-toolset-grid-pose.mjs";
import { analyzeAuroraToolsetSelectionAnchor } from "./analyze-aurora-toolset-selection-anchor.mjs";
import { buildToolsetCameraControlPlan } from "./lib/toolset-camera-control-plan.mjs";
import { buildVisualCameraTransition, requireMeasuredCameraCommand } from "./lib/aurora-visual-camera-pose.mjs";
import { buildSelectionAnchorTransition, requireMeasuredSelectionAnchorMovement } from "./lib/aurora-visual-selection-anchor.mjs";

const options = parseArgs(process.argv.slice(2));
for (const semanticOption of ["degrees", "yawDegrees", "pitchDegrees", "zoomFactor"]) {
  if (options[semanticOption] !== undefined) {
    const error = new Error(
      `--${semanticOption} is unavailable: Toolset camera angle/distance readback has not been proven.`,
    );
    error.code = "camera_angle_readback_unavailable";
    throw error;
  }
}
const scriptDir = dirname(fileURLToPath(import.meta.url));
const viewportProofScript = join(scriptDir, "aurora-toolset-viewport-proof.mjs");
const plan = buildToolsetCameraControlPlan({
  command: String(options.command ?? ""),
  steps: integer(options.steps ?? 1, "--steps"),
  holdMs: integer(options.holdMs ?? 800, "--holdMs"),
});
const allowUniformBefore = String(options.allowUniformBefore ?? "").trim().toLowerCase() === "true";
if (allowUniformBefore && !plan.command.startsWith("move-")) {
  const error = new Error("Uniform-state recovery is limited to an inverse camera movement command.");
  error.code = "toolset_uniform_state_recovery_command_forbidden";
  throw error;
}
const expectedArea = String(options.area ?? "").trim().toLowerCase();
if (!expectedArea) throw new Error("--area is required.");
const expectedModule = String(options.module ?? "the_last_city - codex.mod").trim();
if (!expectedModule) throw new Error("--module is required.");
const proofDir = requiredPath(options.proofDir, "--proofDir");
mkdirSync(proofDir, { recursive: true });
const proofPrefix = `${plan.command}-${Date.now()}`;
const beforeA = captureViewportProof({
  module: expectedModule,
  area: expectedArea,
  outPath: join(proofDir, `${proofPrefix}-before-a.png`),
  allowUniformScene: allowUniformBefore,
});
const beforeB = captureViewportProof({
  module: expectedModule,
  area: expectedArea,
  outPath: join(proofDir, `${proofPrefix}-before-b.png`),
  allowUniformScene: allowUniformBefore,
});

const script = String.raw`
$ErrorActionPreference = 'Stop'
$null = Add-Type -AssemblyName System.Windows.Forms
$expectedArea = $env:AURORA_CAMERA_EXPECTED_AREA
$expectedModule = $env:AURORA_CAMERA_EXPECTED_MODULE
$approvedScreenDeviceName = $env:AURORA_CAMERA_APPROVED_SCREEN_DEVICE
$buttonIndex = [int]$env:AURORA_CAMERA_BUTTON_INDEX
$interaction = $env:AURORA_CAMERA_INTERACTION
$steps = [int]$env:AURORA_CAMERA_STEPS
$holdMs = [int]$env:AURORA_CAMERA_HOLD_MS

Add-Type @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class AuroraCameraControl {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc callback, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr parent, EnumWindowsProc callback, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr hWnd, StringBuilder text, int count);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr hWnd, uint message, IntPtr wParam, IntPtr lParam);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
}
'@

function Get-Text([IntPtr]$hwnd) { $b = New-Object System.Text.StringBuilder 1024; [void][AuroraCameraControl]::GetWindowText($hwnd, $b, $b.Capacity); $b.ToString() }
function Get-Class([IntPtr]$hwnd) { $b = New-Object System.Text.StringBuilder 256; [void][AuroraCameraControl]::GetClassName($hwnd, $b, $b.Capacity); $b.ToString() }
function Get-Rect([IntPtr]$hwnd) { $r = New-Object 'AuroraCameraControl+RECT'; [void][AuroraCameraControl]::GetWindowRect($hwnd, [ref]$r); [pscustomobject]@{ left=$r.Left; top=$r.Top; width=$r.Right-$r.Left; height=$r.Bottom-$r.Top } }

$processIds = @(Get-Process nwtoolset -ErrorAction SilentlyContinue | ForEach-Object { [uint32]$_.Id })
if ($processIds.Count -ne 1) { throw "Expected exactly one nwtoolset process, found $($processIds.Count)." }
$script:topWindows = @()
$topEnum = [AuroraCameraControl+EnumWindowsProc]{
  param($hwnd, $lparam)
  [uint32]$windowProcessId = 0; [void][AuroraCameraControl]::GetWindowThreadProcessId($hwnd, [ref]$windowProcessId)
  if ($processIds -contains $windowProcessId -and [AuroraCameraControl]::IsWindowVisible($hwnd)) {
    $script:topWindows += [pscustomobject]@{ hwnd=$hwnd; processId=$windowProcessId; title=(Get-Text $hwnd); className=(Get-Class $hwnd); bounds=(Get-Rect $hwnd) }
  }
  return $true
}
[void][AuroraCameraControl]::EnumWindows($topEnum, [IntPtr]::Zero)
$moduleWindow = @($topWindows | Where-Object {
  $_.title.EndsWith(" - $expectedModule", [StringComparison]::OrdinalIgnoreCase)
}) | Select-Object -First 1
if ($null -eq $moduleWindow) { throw 'Expected loaded module window was not found.' }
$moduleScreen = [System.Windows.Forms.Screen]::FromHandle($moduleWindow.hwnd)
if ($moduleScreen.DeviceName -ne $approvedScreenDeviceName) {
  throw "Toolset camera control is not on the approved physical proof monitor: expected=$approvedScreenDeviceName, actual=$($moduleScreen.DeviceName)."
}

$script:allChildTexts = @()
$script:viewerMatches = @()
$childEnum = [AuroraCameraControl+EnumWindowsProc]{
  param($hwnd, $lparam)
  $text = Get-Text $hwnd
  if ($text) { $script:allChildTexts += $text }
  $areaTitle = $text.Trim()
  if ($areaTitle.StartsWith('-')) { $areaTitle = $areaTitle.Substring(1).Trim() }
  if ((Get-Class $hwnd) -eq 'TfrmViewerArea' -and [String]::Equals($areaTitle, $expectedArea, [StringComparison]::OrdinalIgnoreCase)) {
    $script:viewerMatches += [pscustomobject]@{ hwnd=$hwnd; title=$text; bounds=(Get-Rect $hwnd) }
  }
  return $true
}
[void][AuroraCameraControl]::EnumChildWindows($moduleWindow.hwnd, $childEnum, [IntPtr]::Zero)
$unsafeText = (@($topWindows.title) + @($allChildTexts)) -join [Environment]::NewLine
if ($unsafeText -match 'Access violation|List index out of bounds|Read of address|Write of address|Loading Inventory List|did not close properly|try to recover|recover it') {
  throw 'Toolset has a critical modal or loading state; camera command was not sent.'
}
if ($viewerMatches.Count -ne 1) { throw "Expected one viewer for $expectedArea, found $($viewerMatches.Count)." }
$viewer = $viewerMatches[0]

$script:buttons = @()
$script:viewports = @()
$controlEnum = [AuroraCameraControl+EnumWindowsProc]{
  param($hwnd, $lparam)
  if (-not [AuroraCameraControl]::IsWindowVisible($hwnd)) { return $true }
  $className = Get-Class $hwnd
  $rect = Get-Rect $hwnd
  if ($className -eq 'TBitBtn' -and $rect.width -ge 20 -and $rect.width -le 32 -and $rect.height -ge 20 -and $rect.height -le 32) {
    $script:buttons += [pscustomobject]@{ hwnd=$hwnd; bounds=$rect }
  }
  if ($className -eq 'TScrollBox' -and $rect.width -ge 400 -and $rect.height -ge 300) {
    $script:viewports += [pscustomobject]@{ hwnd=$hwnd; bounds=$rect }
  }
  return $true
}
[void][AuroraCameraControl]::EnumChildWindows($viewer.hwnd, $controlEnum, [IntPtr]::Zero)
$orderedButtons = @($buttons | Sort-Object { $_.bounds.left })
if ($orderedButtons.Count -ne 13) { throw "Expected the 13-button Area camera/object toolbar, found $($orderedButtons.Count)." }
if ($buttonIndex -lt 0 -or $buttonIndex -gt 9) { throw "Camera button index $buttonIndex is outside the allowed 0..9 range." }
$button = $orderedButtons[$buttonIndex]
$viewport = @($viewports | Sort-Object { $_.bounds.width * $_.bounds.height } -Descending) | Select-Object -First 1
if ($null -eq $viewport) { throw 'Validated Area viewport TScrollBox was not found.' }

$WM_MOUSEMOVE = 0x0200; $WM_LBUTTONDOWN = 0x0201; $WM_LBUTTONUP = 0x0202; $MK_LBUTTON = 1
$localX = [Math]::Floor($button.bounds.width / 2); $localY = [Math]::Floor($button.bounds.height / 2)
$lParam = [IntPtr][int64](($localY -shl 16) -bor ($localX -band 0xffff))
[void][AuroraCameraControl]::SendMessage($button.hwnd, $WM_MOUSEMOVE, [IntPtr]::Zero, $lParam)
if ($interaction -eq 'hold') {
  [void][AuroraCameraControl]::SendMessage($button.hwnd, $WM_LBUTTONDOWN, [IntPtr]$MK_LBUTTON, $lParam)
  Start-Sleep -Milliseconds $holdMs
  [void][AuroraCameraControl]::SendMessage($button.hwnd, $WM_LBUTTONUP, [IntPtr]::Zero, $lParam)
} else {
  for ($index = 0; $index -lt $steps; $index += 1) {
    [void][AuroraCameraControl]::SendMessage($button.hwnd, $WM_LBUTTONDOWN, [IntPtr]$MK_LBUTTON, $lParam)
    [void][AuroraCameraControl]::SendMessage($button.hwnd, $WM_LBUTTONUP, [IntPtr]::Zero, $lParam)
    Start-Sleep -Milliseconds 100
  }
}

Start-Sleep -Milliseconds 150
$script:postTexts = @()
$postChildEnum = [AuroraCameraControl+EnumWindowsProc]{
  param($hwnd, $lparam)
  $text = Get-Text $hwnd
  if ($text) { $script:postTexts += $text }
  return $true
}
$postTopEnum = [AuroraCameraControl+EnumWindowsProc]{
  param($hwnd, $lparam)
  [uint32]$windowProcessId = 0; [void][AuroraCameraControl]::GetWindowThreadProcessId($hwnd, [ref]$windowProcessId)
  if ($processIds -contains $windowProcessId -and [AuroraCameraControl]::IsWindowVisible($hwnd)) {
    $text = Get-Text $hwnd
    if ($text) { $script:postTexts += $text }
    [void][AuroraCameraControl]::EnumChildWindows($hwnd, $postChildEnum, [IntPtr]::Zero)
  }
  return $true
}
[void][AuroraCameraControl]::EnumWindows($postTopEnum, [IntPtr]::Zero)
$postUnsafeText = $postTexts -join [Environment]::NewLine
if ($postUnsafeText -match 'Access violation|List index out of bounds|Read of address|Write of address|Loading Inventory List|did not close properly|try to recover|recover it') {
  throw 'Toolset entered a critical modal or loading state after the camera command.'
}

[pscustomobject]@{
  ok = $true
  moduleTitle = $moduleWindow.title
  areaViewerTitle = $viewer.title
  command = $env:AURORA_CAMERA_COMMAND
  buttonIndex = $buttonIndex
  interaction = $interaction
  steps = $steps
  holdMs = $holdMs
  button = $button
  viewport = $viewport
  safety = [pscustomobject]@{ usesGlobalCursor=$false; usesGlobalKeyboard=$false; usesGlobalMouse=$false; method='targeted messages to validated Area TBitBtn control'; approvedPhysicalScreenDevice=$approvedScreenDeviceName; moduleScreenDevice=$moduleScreen.DeviceName; moduleScreenPrimary=$moduleScreen.Primary }
} | ConvertTo-Json -Depth 6 -Compress
`;

const actionResult = JSON.parse(runPowerShell(script, {
  AURORA_CAMERA_COMMAND: plan.command,
  AURORA_CAMERA_EXPECTED_AREA: expectedArea,
  AURORA_CAMERA_EXPECTED_MODULE: expectedModule,
  AURORA_CAMERA_BUTTON_INDEX: String(plan.buttonIndex),
  AURORA_CAMERA_INTERACTION: plan.interaction,
  AURORA_CAMERA_STEPS: String(plan.steps),
  AURORA_CAMERA_HOLD_MS: String(plan.holdMs),
  AURORA_CAMERA_APPROVED_SCREEN_DEVICE: "\\\\.\\DISPLAY1",
}));
const after = captureViewportProof({
  module: expectedModule,
  area: expectedArea,
  outPath: join(proofDir, `${proofPrefix}-after.png`),
});
const baselineNoise = compareViewportProof({ beforePath: beforeA.pngPath, afterPath: beforeB.pngPath });
const effect = compareViewportProof({ beforePath: beforeB.pngPath, afterPath: after.pngPath });
const requiredChangedRatio = Math.max(0.01, baselineNoise.changedRatio * 5 + 0.005);
const isTranslationCommand = plan.command.startsWith("move-");
let selectionAnchorMeasurement = null;
let visualEffectProven = effect.changedRatio >= requiredChangedRatio;
if (isTranslationCommand) {
  const beforeASelectionAnchor = analyzeAuroraToolsetSelectionAnchor({ imagePath: beforeA.pngPath });
  const beforeBSelectionAnchor = analyzeAuroraToolsetSelectionAnchor({ imagePath: beforeB.pngPath });
  const afterSelectionAnchor = analyzeAuroraToolsetSelectionAnchor({ imagePath: after.pngPath });
  if (
    beforeASelectionAnchor.acceptance.accepted &&
    beforeBSelectionAnchor.acceptance.accepted &&
    afterSelectionAnchor.acceptance.accepted
  ) {
    const anchorBaseline = buildSelectionAnchorTransition({ before: beforeASelectionAnchor, after: beforeBSelectionAnchor });
    const anchorEffect = buildSelectionAnchorTransition({ before: beforeBSelectionAnchor, after: afterSelectionAnchor });
    const commandMeasurement = requireMeasuredSelectionAnchorMovement({ baseline: anchorBaseline, effect: anchorEffect });
    selectionAnchorMeasurement = {
      beforeA: beforeASelectionAnchor,
      beforeB: beforeBSelectionAnchor,
      after: afterSelectionAnchor,
      baseline: anchorBaseline,
      effect: anchorEffect,
      commandMeasurement,
    };
    visualEffectProven = commandMeasurement.status === "measured";
  } else {
    selectionAnchorMeasurement = {
      beforeA: beforeASelectionAnchor,
      beforeB: beforeBSelectionAnchor,
      after: afterSelectionAnchor,
      commandMeasurement: {
        status: "not_available",
        reason: "No validated blue selection outline was present in every evidence frame; using whole-viewport diff fallback.",
      },
    };
  }
}
if (!visualEffectProven) {
  const error = new Error(
    `Camera command produced no proven visual movement: changedRatio=${effect.changedRatio}, required>=${requiredChangedRatio}.`,
  );
  error.code = "toolset_camera_visual_effect_not_proven";
  error.proof = { beforeA, beforeB, after, baselineNoise, effect, requiredChangedRatio, selectionAnchorMeasurement };
  throw error;
}
const requiresPoseMeasurement = [
  "rotate-clockwise",
  "rotate-counterclockwise",
  "pitch-up",
  "pitch-down",
  "zoom-in",
  "zoom-out",
].includes(plan.command);
let cameraMeasurement = null;
if (requiresPoseMeasurement) {
  const beforePose = analyzeAuroraToolsetGridPose({ imagePath: beforeB.pngPath });
  const afterPose = analyzeAuroraToolsetGridPose({ imagePath: after.pngPath });
  const transition = buildVisualCameraTransition({ before: beforePose, after: afterPose });
  const commandMeasurement = requireMeasuredCameraCommand({ command: plan.command, transition });
  cameraMeasurement = { beforePose, afterPose, transition, commandMeasurement };
  if (commandMeasurement.status !== "measured") {
    const error = new Error(commandMeasurement.reason ?? "Camera command lacks a measurable visual result.");
    error.code = commandMeasurement.blockerCode ?? "toolset_camera_pose_delta_not_proven";
    error.proof = { beforeA, beforeB, after, baselineNoise, effect, requiredChangedRatio, selectionAnchorMeasurement, cameraMeasurement };
    throw error;
  }
}
console.log(JSON.stringify({
  ...actionResult,
  visualProof: {
    passed: true,
    beforeA: beforeA.pngPath,
    beforeB: beforeB.pngPath,
    after: after.pngPath,
    baselineNoise,
    effect,
    requiredChangedRatio,
    selectionAnchorMeasurement,
    cameraMeasurement,
  },
}, null, 2));

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) throw new Error(`Unexpected argument: ${token}`);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) throw new Error(`Missing value for ${token}.`);
    result[token.slice(2)] = value;
    index += 1;
  }
  return result;
}

function integer(value, name) {
  const result = Number.parseInt(String(value), 10);
  if (!Number.isInteger(result)) throw new Error(`${name} must be an integer.`);
  return result;
}

function requiredPath(value, name) {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`${name} is required: unproven camera actions are forbidden.`);
  return resolve(text);
}

function captureViewportProof({ module, area, outPath, allowUniformScene = false }) {
  const args = ["capture", "--module", module, "--area", area, "--out", outPath];
  if (allowUniformScene) args.push("--allowUniformScene", "true");
  return runViewportProof(args);
}

function compareViewportProof({ beforePath, afterPath }) {
  return runViewportProof(["compare", "--before", beforePath, "--after", afterPath]);
}

function runViewportProof(args) {
  const output = execFileSync(process.execPath, [viewportProofScript, ...args], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 2,
    timeout: 30_000,
    windowsHide: true,
  });
  return JSON.parse(output);
}

function runPowerShell(source, env) {
  const dir = mkdtempSync(join(tmpdir(), "aurora-camera-control-"));
  const path = join(dir, "camera.ps1");
  writeFileSync(path, source, "utf8");
  try {
    return execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path], {
      encoding: "utf8",
      env: { ...process.env, ...env },
      maxBuffer: 1024 * 1024 * 4,
      timeout: 30_000,
      windowsHide: true,
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
