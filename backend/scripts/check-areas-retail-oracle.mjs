#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..", "..");

const ORACLE_CONTRACT_VERSION = "aurora-areas-retail-toolset-oracle/v1";
const CURRENT_WINDOW_STATE_VERSION = "aurora-toolset-current-window-state/v1";
const EXPECTED_AREA_RESREF = "_ikea";
const EXPECTED_MODULE_FILE_NAME = "the_last_city - codex.mod";
const EXPECTED_MODULE_NAME_PARTS = ["the_last_city", "codex.mod"];
const EXPECTED_STATUS = "retail_toolset_ikea_opened";
const EXPECTED_DISPLAY = "DISPLAY6";
const REQUIRED_CONTROL_NEEDLES = [
  "tbModuleDisplay",
  "sbRecenter",
  "Reorient Camera",
  "sbFindStart",
  "Goto Start Location",
  "actFindStartExecute",
  "sbRecenterClick",
  "toolset-reset-controls-extract.json",
  "WM_MOUSEWHEEL",
  "bRotateClockwise",
  "bRotateCounterClockwise",
  "bPitchUp",
  "bPitchDown",
  "bGobRotateCounter",
  "bGobRotateClockwise",
  "bRotateRandom",
  "dfm_control_tree_block",
  "symbolMapOnlyAccepted",
  "toolset-current-window-state.json",
];

const manifestPath = resolve(
  repoRoot,
  "backend/backend/docs/aurora-reverse/artifacts/areas-runtime-capture/aurora-toolset-ikea-oracle-manifest.json",
);
const currentWindowStatePath = resolve(
  repoRoot,
  "backend/backend/docs/aurora-reverse/artifacts/areas-runtime-capture/toolset-current-window-state.json",
);
const currentWindowStateRelativePath =
  "backend/backend/docs/aurora-reverse/artifacts/areas-runtime-capture/toolset-current-window-state.json";
const checkpointStatusPath = resolve(
  repoRoot,
  "backend/backend/docs/aurora-reverse/artifacts/areas-runtime-capture/toolset-visual-comparison-status.json",
);
const checkpointStatusRelativePath =
  "backend/backend/docs/aurora-reverse/artifacts/areas-runtime-capture/toolset-visual-comparison-status.json";
const readonlyCaptureScriptPath = resolve(repoRoot, "backend/scripts/capture-areas-toolset-window-readonly.mjs");
const readonlyCaptureManifestPath = resolve(
  repoRoot,
  "backend/backend/docs/aurora-reverse/artifacts/areas-runtime-capture/toolset-readonly-window-capture-manifest.json",
);
const runbookPath = resolve(repoRoot, "backend/docs/aurora-reverse/areas-toolset-oracle-controls.md");

const failures = [];

function fail(code, details = {}) {
  failures.push({ code, ...details });
}

function normalizeText(value) {
  return String(value ?? "").toLowerCase();
}

function extractLoadedModuleFileName(title) {
  const text = String(title ?? "").trim();
  if (!text.includes("Neverwinter Nights Toolset")) {
    return null;
  }
  const parts = text.split(" - ");
  if (parts.length < 2) {
    return null;
  }
  const loadedModule = parts.slice(1).join(" - ").trim();
  return loadedModule.length > 0 ? loadedModule : null;
}

function asArray(value) {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function readJson(path) {
  if (!existsSync(path)) {
    fail("missing_manifest", { path });
    return null;
  }
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail("invalid_manifest_json", { path, message: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

function runWin32ToolsetWindowProbe() {
  const script = String.raw`
$ErrorActionPreference = 'Stop'
Add-Type @'
using System;
using System.Text;
using System.Runtime.InteropServices;

public static class AuroraToolsetWindowProbe {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

  [DllImport("user32.dll")]
  public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

  [DllImport("user32.dll")]
  public static extern bool EnumChildWindows(IntPtr hWndParent, EnumWindowsProc lpEnumFunc, IntPtr lParam);

  [DllImport("user32.dll", SetLastError=true)]
  public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

  [DllImport("user32.dll", SetLastError=true)]
  public static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);

  [DllImport("user32.dll")]
  public static extern bool IsWindowVisible(IntPtr hWnd);

  [DllImport("user32.dll")]
  public static extern bool IsHungAppWindow(IntPtr hWnd);

  [DllImport("user32.dll")]
  public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);

  [DllImport("user32.dll")]
  public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

  public struct RECT {
    public int Left;
    public int Top;
    public int Right;
    public int Bottom;
  }
}
'@

function Get-WindowProbeInfo {
  param([IntPtr]$Handle)

  $titleBuilder = New-Object System.Text.StringBuilder 512
  [void][AuroraToolsetWindowProbe]::GetWindowText($Handle, $titleBuilder, $titleBuilder.Capacity)
  $classBuilder = New-Object System.Text.StringBuilder 256
  [void][AuroraToolsetWindowProbe]::GetClassName($Handle, $classBuilder, $classBuilder.Capacity)
  [uint32]$windowProcessId = 0
  [void][AuroraToolsetWindowProbe]::GetWindowThreadProcessId($Handle, [ref]$windowProcessId)
  $processName = $null
  try {
    $processName = (Get-Process -Id $windowProcessId -ErrorAction Stop).ProcessName
  } catch {
    $processName = $null
  }

  [AuroraToolsetWindowProbe+RECT]$rect = New-Object 'AuroraToolsetWindowProbe+RECT'
  [void][AuroraToolsetWindowProbe]::GetWindowRect($Handle, [ref]$rect)

  [pscustomobject]@{
    hwnd = $Handle.ToInt64()
    title = $titleBuilder.ToString()
    className = $classBuilder.ToString()
    processId = $windowProcessId
    processName = $processName
    visible = [AuroraToolsetWindowProbe]::IsWindowVisible($Handle)
    responding = -not [AuroraToolsetWindowProbe]::IsHungAppWindow($Handle)
    bounds = [pscustomobject]@{
      left = $rect.Left
      top = $rect.Top
      width = $rect.Right - $rect.Left
      height = $rect.Bottom - $rect.Top
    }
  }
}

function Get-MatchingChildWindows {
  param([IntPtr]$ParentHandle)

  $script:auroraToolsetChildCount = 0
  $script:auroraToolsetMatchingChildren = @()
  $childCallback = [AuroraToolsetWindowProbe+EnumWindowsProc]{
    param([IntPtr]$childHandle, [IntPtr]$lParam)
    $script:auroraToolsetChildCount += 1
    $childInfo = Get-WindowProbeInfo -Handle $childHandle
    $matchesAreaTitle = $childInfo.title -like '*_ikea*'
    $matchesAreaClass = @('TfrmViewerArea', 'TScrollBox', 'TTabSheet') -contains $childInfo.className
    if ($matchesAreaTitle -or $matchesAreaClass) {
      $script:auroraToolsetMatchingChildren += $childInfo
    }
    return $true
  }

  [void][AuroraToolsetWindowProbe]::EnumChildWindows($ParentHandle, $childCallback, [IntPtr]::Zero)
  [pscustomobject]@{
    childWindowCount = $script:auroraToolsetChildCount
    matchingChildren = @($script:auroraToolsetMatchingChildren)
  }
}

$topLevelWindows = New-Object System.Collections.Generic.List[object]
$topLevelCallback = [AuroraToolsetWindowProbe+EnumWindowsProc]{
  param([IntPtr]$windowHandle, [IntPtr]$lParam)
  if (-not [AuroraToolsetWindowProbe]::IsWindowVisible($windowHandle)) {
    return $true
  }
  $windowInfo = Get-WindowProbeInfo -Handle $windowHandle
  if ($windowInfo.processName -eq 'nwtoolset' -or $windowInfo.title -like '*Neverwinter Nights Toolset*') {
    [void]$topLevelWindows.Add($windowInfo)
  }
  return $true
}

[void][AuroraToolsetWindowProbe]::EnumWindows($topLevelCallback, [IntPtr]::Zero)

$enrichedWindows = foreach ($windowInfo in $topLevelWindows) {
  $shouldInspectChildren = $windowInfo.title -like '*the_last_city*' -and $windowInfo.title -like '*codex.mod*'
  $childProbeError = $null
  if ($shouldInspectChildren) {
    try {
      $children = Get-MatchingChildWindows -ParentHandle ([IntPtr]$windowInfo.hwnd)
    } catch {
      $childProbeError = $_.Exception.Message
      $children = [pscustomobject]@{
        childWindowCount = 0
        matchingChildren = @()
      }
    }
  } else {
    $children = [pscustomobject]@{
      childWindowCount = 0
      matchingChildren = @()
    }
  }
  [pscustomobject]@{
    hwnd = $windowInfo.hwnd
    title = $windowInfo.title
    className = $windowInfo.className
    processId = $windowInfo.processId
    processName = $windowInfo.processName
    visible = $windowInfo.visible
    responding = $windowInfo.responding
    bounds = $windowInfo.bounds
    childWindowCount = $children.childWindowCount
    matchingChildren = $children.matchingChildren
    childProbeError = $childProbeError
  }
}

@($enrichedWindows) | ConvertTo-Json -Depth 8 -Compress
`;

  const raw = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 10000,
    windowsHide: true,
  }).trim();

  if (!raw) {
    return [];
  }
  return asArray(JSON.parse(raw));
}

function summarizeWindow(window) {
  const loadedModuleFileName = extractLoadedModuleFileName(window.title);
  const expectedModuleMatched = EXPECTED_MODULE_NAME_PARTS.every((part) => normalizeText(window.title).includes(part));
  return {
    hwnd: window.hwnd,
    title: window.title,
    loadedModuleFileName,
    expectedModuleMatched,
    className: window.className,
    processId: window.processId,
    processName: window.processName,
    visible: window.visible === true,
    responding: window.responding === true,
    bounds: window.bounds ?? null,
    childWindowCount: Number(window.childWindowCount ?? 0),
    childProbeError: window.childProbeError ?? null,
    matchingChildren: asArray(window.matchingChildren).map((child) => ({
      hwnd: child.hwnd,
      title: child.title,
      className: child.className,
      processId: child.processId,
      processName: child.processName,
      visible: child.visible === true,
      responding: child.responding === true,
      bounds: child.bounds ?? null,
    })),
  };
}

function classifyToolsetWindowState(windows, probeError = null) {
  const topLevelToolsetWindows = windows.map(summarizeWindow);
  const loadedModuleWindows = topLevelToolsetWindows.filter((window) => window.loadedModuleFileName);
  const loadedModuleWindow = loadedModuleWindows.find((window) => window.responding) ?? loadedModuleWindows[0] ?? null;
  const moduleWindows = topLevelToolsetWindows.filter((window) => window.expectedModuleMatched);
  const selectedModuleWindow = moduleWindows.find((window) => window.responding) ?? moduleWindows[0] ?? null;
  const childEvidence = selectedModuleWindow?.matchingChildren ?? [];
  const areaViewer = childEvidence.find(
    (child) => child.className === "TfrmViewerArea" && normalizeText(child.title).includes(EXPECTED_AREA_RESREF),
  );
  const areaTab = childEvidence.find(
    (child) => child.className === "TTabSheet" && normalizeText(child.title).includes(EXPECTED_AREA_RESREF),
  );
  const viewport = childEvidence.find((child) => child.className === "TScrollBox");
  const displayPlacement =
    selectedModuleWindow?.bounds &&
    selectedModuleWindow.bounds.left <= -1900 &&
    selectedModuleWindow.bounds.top === 0 &&
    selectedModuleWindow.bounds.width >= 1800 &&
    selectedModuleWindow.bounds.height >= 1000;

  const readyChecks = {
    probeSucceeded: !probeError,
    toolsetWindowVisible: topLevelToolsetWindows.length > 0,
    moduleWindowTitleMatched: Boolean(selectedModuleWindow),
    loadedModuleMatchesExpected: Boolean(selectedModuleWindow),
    moduleWindowResponding: selectedModuleWindow?.responding === true,
    ikeaAreaViewerOpen: Boolean(areaViewer),
    ikeaTabSheetObserved: Boolean(areaTab),
    viewportScrollBoxObserved: Boolean(viewport),
    expectedDisplayPlacementObserved: Boolean(displayPlacement),
  };

  const loadedModule = selectedModuleWindow?.loadedModuleFileName ?? loadedModuleWindow?.loadedModuleFileName ?? null;
  const current = {
    expectedModule: EXPECTED_MODULE_FILE_NAME,
    loadedModule,
    expectedAreaViewer: EXPECTED_AREA_RESREF,
    areaViewerOpen: Boolean(areaViewer),
    areaViewerMissing: areaViewer ? null : EXPECTED_AREA_RESREF,
    viewportObserved: Boolean(viewport),
    selectedModuleWindowHwnd: selectedModuleWindow?.hwnd ?? null,
    observedLoadedModuleWindowHwnd: loadedModuleWindow?.hwnd ?? null,
  };

  function makeBlocker(code, details, extra = {}) {
    return {
      code,
      expected_module: EXPECTED_MODULE_FILE_NAME,
      loaded_module: loadedModule,
      area_viewer_missing: areaViewer ? null : EXPECTED_AREA_RESREF,
      canRunVisualComparison: false,
      details,
      ...extra,
    };
  }

  let blocker = null;
  if (probeError) {
    blocker = makeBlocker("window_probe_failed", probeError);
  } else if (topLevelToolsetWindows.length === 0) {
    blocker = makeBlocker("no_visible_toolset_window", "No visible nwtoolset.exe top-level window was found.");
  } else if (!selectedModuleWindow) {
    blocker = loadedModule
      ? makeBlocker("loaded_module_mismatch", "Toolset is visible, but the loaded module is not the expected _ikea oracle module.")
      : makeBlocker(
          "missing_loaded_module_window",
          "Toolset is visible, but no top-level title contains both the_last_city and codex.mod.",
        );
  } else if (!selectedModuleWindow.responding) {
    blocker = makeBlocker(
      "module_window_not_responding",
      "The matching module window is visible but Windows reports it as not responding.",
      { module_window_hwnd: selectedModuleWindow.hwnd },
    );
  } else if (selectedModuleWindow.childProbeError) {
    blocker = makeBlocker("child_window_probe_failed", selectedModuleWindow.childProbeError, {
      module_window_hwnd: selectedModuleWindow.hwnd,
    });
  } else if (!areaViewer) {
    blocker = makeBlocker(
      "missing_ikea_area_viewer",
      "The expected loaded module window is present, but no TfrmViewerArea child titled _ikea was observed.",
      { module_window_hwnd: selectedModuleWindow.hwnd },
    );
  } else if (!viewport) {
    blocker = makeBlocker(
      "missing_ikea_viewport_scrollbox",
      "The _ikea area viewer is present, but no TScrollBox viewport child was observed.",
      { module_window_hwnd: selectedModuleWindow.hwnd, viewport_missing: "TScrollBox" },
    );
  }

  const ready = !blocker;
  const comparison = {
    canRunVisualComparison: ready,
    blockedBy: blocker,
    requiredCurrentState: {
      loaded_module: EXPECTED_MODULE_FILE_NAME,
      area_viewer: EXPECTED_AREA_RESREF,
      viewport_child_class: "TScrollBox",
      module_window_responding: true,
    },
  };

  return {
    version: CURRENT_WINDOW_STATE_VERSION,
    capturedAt: new Date().toISOString(),
    source: "Win32 EnumWindows/EnumChildWindows read-only inspection",
    safety: {
      usesGlobalCursor: false,
      usesGlobalKeyboard: false,
      usesGlobalMouseWheel: false,
      sendsWindowMessages: false,
      method: "read-only top-level and child-window enumeration",
    },
    expected: {
      processName: "nwtoolset",
      moduleTitleParts: EXPECTED_MODULE_NAME_PARTS,
      areaResRef: EXPECTED_AREA_RESREF,
      display: EXPECTED_DISPLAY,
    },
    status: probeError ? "probe_error" : ready ? "ready" : "not_ready",
    ready,
    canRunVisualComparison: comparison.canRunVisualComparison,
    comparison,
    current,
    blocker,
    readyChecks,
    selectedModuleWindow,
    topLevelToolsetWindows,
  };
}

function probeCurrentToolsetWindowState() {
  try {
    return classifyToolsetWindowState(runWin32ToolsetWindowProbe());
  } catch (error) {
    return classifyToolsetWindowState([], error instanceof Error ? error.message : String(error));
  }
}

function buildCheckpointStatus(currentWindowState) {
  return {
    canRunVisualComparison: currentWindowState.canRunVisualComparison === true,
    loadedModule: currentWindowState.current?.loadedModule ?? null,
    expectedModule: EXPECTED_MODULE_FILE_NAME,
    areaViewerOpen: currentWindowState.current?.areaViewerOpen === true,
    expectedArea: EXPECTED_AREA_RESREF,
    blockerCode: currentWindowState.blocker?.code ?? null,
  };
}

const currentWindowState = probeCurrentToolsetWindowState();
try {
  writeJson(currentWindowStatePath, currentWindowState);
} catch (error) {
  fail("current_window_state_evidence_write_failed", {
    path: currentWindowStatePath,
    message: error instanceof Error ? error.message : String(error),
  });
}
const checkpointStatus = buildCheckpointStatus(currentWindowState);
try {
  writeJson(checkpointStatusPath, checkpointStatus);
} catch (error) {
  fail("checkpoint_status_evidence_write_failed", {
    path: checkpointStatusPath,
    message: error instanceof Error ? error.message : String(error),
  });
}

const manifest = readJson(manifestPath);

if (manifest) {
  if (manifest.version !== ORACLE_CONTRACT_VERSION) {
    fail("unexpected_oracle_contract_version", { expected: ORACLE_CONTRACT_VERSION, actual: manifest.version });
  }
  if (manifest.areaResRef !== EXPECTED_AREA_RESREF) {
    fail("unexpected_area_resref", { expected: EXPECTED_AREA_RESREF, actual: manifest.areaResRef });
  }
  for (const part of EXPECTED_MODULE_NAME_PARTS) {
    if (typeof manifest.moduleFileName !== "string" || !manifest.moduleFileName.includes(part)) {
      fail("unexpected_module_file_name", { requiredPart: part, actual: manifest.moduleFileName });
    }
  }
  if (manifest.oracleStatus !== EXPECTED_STATUS) {
    fail("unexpected_oracle_status", { expected: EXPECTED_STATUS, actual: manifest.oracleStatus });
  }
  if (manifest.canonicalParityPromoted === false) {
    // Keep this gate honest: the Toolset oracle is evidence, not a web parity promotion.
  } else {
    fail("canonical_parity_must_remain_blocked_without_web_comparison", {
      expected: "manifest.canonicalParityPromoted === false",
      actual: manifest.canonicalParityPromoted,
    });
  }
  if (manifest.display?.device !== EXPECTED_DISPLAY) {
    fail("unexpected_display", { expected: EXPECTED_DISPLAY, actual: manifest.display?.device });
  }
  if (manifest.currentWindowStateEvidencePath !== currentWindowStateRelativePath) {
    fail("missing_current_window_state_evidence_path", {
      expected: currentWindowStateRelativePath,
      actual: manifest.currentWindowStateEvidencePath,
    });
  }
  if (manifest.liveReadinessRequiresCurrentWindowState !== true) {
    fail("missing_live_readiness_guard", {
      expected: "manifest.liveReadinessRequiresCurrentWindowState === true",
      actual: manifest.liveReadinessRequiresCurrentWindowState,
    });
  }
  if (!manifest.correctWindow?.titlePattern?.includes("the_last_city")) {
    fail("correct_window_title_pattern_missing_module", { titlePattern: manifest.correctWindow?.titlePattern });
  }
  if (!Array.isArray(manifest.evidence) || manifest.evidence.length < 6) {
    fail("insufficient_oracle_evidence_entries", { count: Array.isArray(manifest.evidence) ? manifest.evidence.length : null });
  }

  const screenshotPath = resolve(repoRoot, manifest.screenshotPath ?? "");
  if (!existsSync(screenshotPath)) {
    fail("missing_primary_screenshot", { path: manifest.screenshotPath });
  } else {
    const actualBytes = statSync(screenshotPath).size;
    if (actualBytes !== manifest.screenshotBytes) {
      fail("primary_screenshot_bytes_changed", {
        path: manifest.screenshotPath,
        expected: manifest.screenshotBytes,
        actual: actualBytes,
      });
    }
  }

  for (const [index, entry] of (manifest.evidence ?? []).entries()) {
    const evidencePath = resolve(repoRoot, entry.path ?? "");
    if (!existsSync(evidencePath)) {
      fail("missing_evidence_file", { index, kind: entry.kind, path: entry.path });
      continue;
    }
    const actualBytes = statSync(evidencePath).size;
    const generatedJsonEvidence = entry.kind === "toolset_reset_controls_extract";
    if (!generatedJsonEvidence && actualBytes !== entry.bytes) {
      fail("evidence_bytes_changed", { index, kind: entry.kind, path: entry.path, expected: entry.bytes, actual: actualBytes });
    }
    if (typeof entry.minimumBytes === "number" && actualBytes < entry.minimumBytes) {
      fail("evidence_too_small", { index, kind: entry.kind, path: entry.path, minimumBytes: entry.minimumBytes, actual: actualBytes });
    }
    if (entry.kind === "toolset_reset_controls_extract") {
      const resetExtract = JSON.parse(readFileSync(evidencePath, "utf8"));
      if (resetExtract.version !== "aurora-toolset-reset-controls-extract/v2") {
        fail("unexpected_reset_extract_version", { expected: "aurora-toolset-reset-controls-extract/v2", actual: resetExtract.version });
      }
      if (resetExtract.proof?.type !== "dfm_control_tree_block" || resetExtract.proof?.symbolMapOnly !== false) {
        fail("reset_extract_not_dfm_control_tree_proof", { proof: resetExtract.proof });
      }
    }
  }

  const controlsText = JSON.stringify(manifest.verifiedControls ?? {});
  for (const needle of REQUIRED_CONTROL_NEEDLES) {
    if (!controlsText.includes(needle)) {
      fail("missing_verified_control", { needle });
    }
  }
}

if (!existsSync(runbookPath)) {
  fail("missing_toolset_oracle_runbook", { path: runbookPath });
} else {
  const runbook = readFileSync(runbookPath, "utf8");
  for (const needle of [
    "Areas Toolset Oracle Controls",
    EXPECTED_AREA_RESREF,
    EXPECTED_DISPLAY,
    "toolset-current-window-state.json",
    "ready/not_ready",
    "DFM control-tree",
    "symbolMapOnly",
    "WM_MOUSEWHEEL",
    "bRotateClockwise",
    "bGobRotateClockwise",
    "canonicalParityPromoted",
    "tbModuleDisplay",
    "sbRecenter",
    "Reorient Camera",
    "Do not take ownership of the global cursor",
    "canvas/view position",
    "primary canvas-position reset",
    "toolset-reset-controls-extract.json",
    "areas:toolset-reset-gate",
  ]) {
    if (!runbook.includes(needle)) {
      fail("runbook_missing_oracle_detail", { needle });
    }
  }
}

if (!existsSync(readonlyCaptureScriptPath)) {
  fail("missing_readonly_toolset_window_capture_script", { path: readonlyCaptureScriptPath });
} else {
  const captureScript = readFileSync(readonlyCaptureScriptPath, "utf8");
  for (const needle of ["PrintWindow", "usesGlobalCursor", "usesGlobalKeyboard", "promotesVisualParity"]) {
    if (!captureScript.includes(needle)) {
      fail("readonly_capture_script_missing_safety_or_capture_detail", { needle });
    }
  }
}

if (existsSync(readonlyCaptureManifestPath)) {
  try {
    const captureManifest = JSON.parse(readFileSync(readonlyCaptureManifestPath, "utf8"));
    if (captureManifest.context?.contextMismatch === true && captureManifest.capture?.promotesVisualParity !== false) {
      fail("readonly_capture_context_mismatch_must_not_promote_parity", {
        contextMismatch: captureManifest.context?.contextMismatch,
        promotesVisualParity: captureManifest.capture?.promotesVisualParity,
      });
    }
  } catch (error) {
    fail("invalid_readonly_capture_manifest_json", {
      path: readonlyCaptureManifestPath,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

if (currentWindowState.version !== CURRENT_WINDOW_STATE_VERSION) {
  fail("unexpected_current_window_state_version", {
    expected: CURRENT_WINDOW_STATE_VERSION,
    actual: currentWindowState.version,
  });
}
if (currentWindowState.safety?.usesGlobalCursor !== false || currentWindowState.safety?.sendsWindowMessages !== false) {
  fail("unsafe_current_window_state_probe", { safety: currentWindowState.safety });
}
if (currentWindowState.current?.expectedModule !== EXPECTED_MODULE_FILE_NAME) {
  fail("current_window_state_missing_expected_module", {
    expected: EXPECTED_MODULE_FILE_NAME,
    actual: currentWindowState.current?.expectedModule,
  });
}
if (currentWindowState.canRunVisualComparison !== currentWindowState.ready) {
  fail("comparison_readiness_must_match_ready_state", {
    ready: currentWindowState.ready,
    canRunVisualComparison: currentWindowState.canRunVisualComparison,
  });
}
for (const field of ["canRunVisualComparison", "loadedModule", "expectedModule", "areaViewerOpen", "expectedArea", "blockerCode"]) {
  if (!Object.hasOwn(checkpointStatus, field)) {
    fail("checkpoint_status_missing_field", { field, checkpointStatus });
  }
}
if (checkpointStatus.expectedModule !== EXPECTED_MODULE_FILE_NAME || checkpointStatus.expectedArea !== EXPECTED_AREA_RESREF) {
  fail("checkpoint_status_unexpected_expected_target", { checkpointStatus });
}
if (checkpointStatus.canRunVisualComparison !== currentWindowState.canRunVisualComparison) {
  fail("checkpoint_status_readiness_mismatch", {
    checkpointStatus,
    canRunVisualComparison: currentWindowState.canRunVisualComparison,
  });
}
if (currentWindowState.ready !== true && !currentWindowState.blocker) {
  fail("current_window_not_ready_without_blocker", { status: currentWindowState.status });
}
if (currentWindowState.ready !== true && currentWindowState.blocker) {
  if (currentWindowState.blocker.expected_module !== EXPECTED_MODULE_FILE_NAME) {
    fail("current_window_blocker_missing_expected_module", { blocker: currentWindowState.blocker });
  }
  if (!Object.hasOwn(currentWindowState.blocker, "loaded_module")) {
    fail("current_window_blocker_missing_loaded_module", { blocker: currentWindowState.blocker });
  }
  if (!Object.hasOwn(currentWindowState.blocker, "area_viewer_missing")) {
    fail("current_window_blocker_missing_area_viewer_missing", { blocker: currentWindowState.blocker });
  }
}

if (failures.length > 0) {
  console.error("Areas retail Toolset oracle gate failed.");
  console.error(JSON.stringify({ failures }, null, 2));
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      status: "passed",
      gate: "areas-retail-toolset-oracle",
      canRunVisualComparison: checkpointStatus.canRunVisualComparison,
      loadedModule: checkpointStatus.loadedModule,
      expectedModule: checkpointStatus.expectedModule,
      areaViewerOpen: checkpointStatus.areaViewerOpen,
      expectedArea: checkpointStatus.expectedArea,
      blockerCode: checkpointStatus.blockerCode,
      currentWindowStateEvidencePath: currentWindowStateRelativePath,
      checkpointStatusEvidencePath: checkpointStatusRelativePath,
    },
    null,
    2,
  ),
);
