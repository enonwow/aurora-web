#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const [command, ...argv] = process.argv.slice(2);
const scriptPath = fileURLToPath(import.meta.url);

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  if (command !== "inspect") {
    throw new Error("Use: inspect --module <exact module name> --area <resref> --out <json>");
  }
  const options = parseArgs(argv);
  const out = requiredOutput(options.out);
  const result = inspectLiveTileProperties({
    module: requiredText(options.module, "--module"),
    area: requiredText(options.area, "--area"),
  });
  writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ status: result.status, blockerCode: result.blockerCode ?? null, out }, null, 2));
}

/**
 * Converts a read-only native window snapshot into an audit result. The
 * Toolset's TDLGTILEPROPERTIES DFM resource has no Tile_ID or orientation
 * control, so this dialog can never be promoted to a selected-tile identity.
 */
export function evaluateTilePropertiesSnapshot({ module, area, processCount, dialogs }) {
  const base = {
    version: "aurora-toolset-tile-properties-readback/v1",
    observedAt: new Date().toISOString(),
    target: { module, areaResref: String(area).trim().toLowerCase() },
    safety: {
      readOnly: true,
      launchesToolset: false,
      sendsWindowMessages: false,
      usesGlobalCursor: false,
      usesGlobalKeyboard: false,
      usesGlobalMouse: false,
    },
  };
  if (Number(processCount) !== 1) {
    return { ...base, status: "blocked", blockerCode: "toolset_process_count_invalid", reason: `Expected exactly one nwtoolset process; found ${processCount}.`, dialogs: dialogs ?? [] };
  }
  const tileDialogs = (dialogs ?? []).filter((dialog) => String(dialog.className ?? "").toLowerCase() === "tdlgtileproperties");
  if (tileDialogs.length !== 1) {
    return {
      ...base,
      status: "blocked",
      blockerCode: tileDialogs.length === 0 ? "toolset_tile_properties_dialog_not_open" : "toolset_tile_properties_dialog_ambiguous",
      reason: tileDialogs.length === 0
        ? "No visible TdlgTileProperties dialog is open. This inspector will not open or activate it."
        : `Expected one visible TdlgTileProperties dialog; found ${tileDialogs.length}.`,
      dialogs: dialogs ?? [],
    };
  }
  return {
    ...base,
    status: "blocked",
    blockerCode: "toolset_tile_properties_has_no_tile_identity_fields",
    reason: "Static DFM audit proves TdlgTileProperties contains lighting, color, and animation controls but no Tile_ID, Tile_Orientation, or selected-tile coordinate field. It cannot provide semantic tile identity.",
    dialog: tileDialogs[0],
  };
}

function inspectLiveTileProperties({ module, area }) {
  const source = String.raw`
$ErrorActionPreference = 'Stop'
Add-Type @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class AuroraTilePropertiesReadback {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc callback, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr parent, EnumWindowsProc callback, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr hWnd, StringBuilder text, int count);
}
'@
function Get-Text([IntPtr]$hwnd) { $b = New-Object System.Text.StringBuilder 1024; [void][AuroraTilePropertiesReadback]::GetWindowText($hwnd, $b, $b.Capacity); $b.ToString() }
function Get-Class([IntPtr]$hwnd) { $b = New-Object System.Text.StringBuilder 256; [void][AuroraTilePropertiesReadback]::GetClassName($hwnd, $b, $b.Capacity); $b.ToString() }
$processIds = @(Get-Process nwtoolset -ErrorAction SilentlyContinue | ForEach-Object { [uint32]$_.Id })
$script:dialogs = @()
if ($processIds.Count -eq 1) {
  $top = [AuroraTilePropertiesReadback+EnumWindowsProc]{
    param($hwnd, $lparam)
    [uint32]$windowProcessId = 0; [void][AuroraTilePropertiesReadback]::GetWindowThreadProcessId($hwnd, [ref]$windowProcessId)
    if (($windowProcessId -eq $processIds[0]) -and [AuroraTilePropertiesReadback]::IsWindowVisible($hwnd)) {
      $class = Get-Class $hwnd
      if ($class -eq 'TdlgTileProperties') {
        $dialog = [ordered]@{ className=$class; title=(Get-Text $hwnd); childControls=@() }
        $children = [AuroraTilePropertiesReadback+EnumWindowsProc]{ param($child, $ignored) $dialog.childControls += [pscustomobject]@{ className=(Get-Class $child); text=(Get-Text $child) }; return $true }
        [void][AuroraTilePropertiesReadback]::EnumChildWindows($hwnd, $children, [IntPtr]::Zero)
        $script:dialogs += [pscustomobject]$dialog
      }
    }
    return $true
  }
  [void][AuroraTilePropertiesReadback]::EnumWindows($top, [IntPtr]::Zero)
}
[pscustomobject]@{ processCount=$processIds.Count; dialogs=$script:dialogs } | ConvertTo-Json -Depth 8 -Compress
`;
  const raw = JSON.parse(execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", source], {
    encoding: "utf8", env: { ...process.env }, maxBuffer: 1024 * 1024 * 2, timeout: 30_000, windowsHide: true,
  }).trim());
  return evaluateTilePropertiesSnapshot({ module, area, processCount: raw.processCount, dialogs: raw.dialogs ?? [] });
}

function parseArgs(tokens) {
  const result = {};
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token.startsWith("--")) throw new Error(`Unexpected argument: ${token}`);
    const value = tokens[index + 1];
    if (value === undefined || value.startsWith("--")) throw new Error(`Missing value for ${token}.`);
    result[token.slice(2)] = value;
    index += 1;
  }
  return result;
}

function requiredText(value, name) { const result = String(value ?? "").trim(); if (!result) throw new Error(`${name} is required.`); return result; }
function requiredOutput(value) { const path = resolve(requiredText(value, "--out")); mkdirSync(dirname(path), { recursive: true }); return path; }
