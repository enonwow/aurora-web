#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const options = parseArgs(process.argv.slice(2));
const className = required(options.class, "--class");
const title = required(options.title, "--title");
const expectedProcessId = positiveInteger(options.expectedProcessId, "--expectedProcessId");
const expectedStartedAtUtc = required(options.expectedStartedAtUtc, "--expectedStartedAtUtc");
if (!Number.isFinite(Date.parse(expectedStartedAtUtc))) throw new Error("--expectedStartedAtUtc must be an ISO timestamp.");
const expectedDialogHwnd = positiveInteger(options.expectedDialogHwnd, "--expectedDialogHwnd");
const contractParseOnly = String(options.contractParseOnly ?? "false").toLowerCase() === "true";

const source = String.raw`
$ErrorActionPreference = 'Stop'
Add-Type @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class AuroraDialogClose {
  public delegate bool E(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumWindows(E c, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr p, E c, IntPtr l);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint p);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder b, int n);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr h, StringBuilder b, int n);
  [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr h, uint m, IntPtr w, IntPtr l);
}
'@
function Text([IntPtr]$h) {
  $b = [Text.StringBuilder]::new(1024)
  [void][AuroraDialogClose]::GetWindowText($h, $b, $b.Capacity)
  $b.ToString()
}
function Class([IntPtr]$h) {
  $b = [Text.StringBuilder]::new(256)
  [void][AuroraDialogClose]::GetClassName($h, $b, $b.Capacity)
  $b.ToString()
}
if ($env:ADC_CONTRACT_PARSE_ONLY -eq 'true') {
  [pscustomobject]@{
    ok = $true
    status = 'contract_parse_only'
    actionSubmitted = $false
    safety = [pscustomobject]@{
      usesGlobalInput = $false
      usesGlobalCursor = $false
      usesGlobalKeyboard = $false
      usesGlobalMouse = $false
      usesGlobalMouseWheel = $false
      savesModule = $false
      changesIniOrMru = $false
      method = 'parse and execute generated PowerShell through an action-free contract branch'
    }
  } | ConvertTo-Json -Depth 5 -Compress
  exit 0
}
[uint32]$expectedPid = [uint32]$env:ADC_EXPECTED_PROCESS_ID
[int64]$expectedHwnd = [int64]$env:ADC_EXPECTED_DIALOG_HWND
$processes = @(Get-Process -Id $expectedPid -ErrorAction SilentlyContinue)
if ($processes.Count -ne 1 -or $processes[0].ProcessName -ne 'nwtoolset') {
  throw "expected_exact_toolset_process:$($expectedPid):$($processes.Count)"
}
$expectedStartedAt = [DateTimeOffset]::Parse($env:ADC_EXPECTED_STARTED_AT_UTC).UtcDateTime
$actualStartedAt = $processes[0].StartTime.ToUniversalTime()
if (
  $actualStartedAt.ToString('yyyy-MM-ddTHH:mm:ss.fffZ') -ne
  $expectedStartedAt.ToString('yyyy-MM-ddTHH:mm:ss.fffZ')
) {
  throw "toolset_start_mismatch:expected=$($expectedStartedAt.ToString('o'));actual=$($actualStartedAt.ToString('o'))"
}
function Find-Exact {
  $script:found = @()
  $callback = [AuroraDialogClose+E]{
    param($h, $l)
    [uint32]$pidValue = 0
    [void][AuroraDialogClose]::GetWindowThreadProcessId($h, [ref]$pidValue)
    if (
      $pidValue -eq $expectedPid -and
      [AuroraDialogClose]::IsWindowVisible($h) -and
      (Class $h) -eq $env:ADC_CLASS -and
      (Text $h) -eq $env:ADC_TITLE
    ) {
      $script:found += $h
    }
    return $true
  }
  [void][AuroraDialogClose]::EnumWindows($callback, [IntPtr]::Zero)
  return @($script:found)
}
$matches = @(Find-Exact)
if ($matches.Count -ne 1 -or $matches[0].ToInt64() -ne $expectedHwnd) {
  throw "expected_one_bound_dialog:expected=$expectedHwnd;actual=$(@($matches | ForEach-Object { $_.ToInt64() }) -join ',')"
}
$dialog = $matches[0]
$script:cancel = @()
$child = [AuroraDialogClose+E]{
  param($h, $l)
  if (
    [AuroraDialogClose]::IsWindowVisible($h) -and
    (Class $h) -eq 'TButton' -and
    (Text $h) -eq 'Cancel'
  ) {
    $script:cancel += $h
  }
  return $true
}
[void][AuroraDialogClose]::EnumChildWindows($dialog, $child, [IntPtr]::Zero)
if ($script:cancel.Count -ne 1) {
  throw "expected_one_cancel_button:$($script:cancel.Count)"
}
[void][AuroraDialogClose]::SendMessage($script:cancel[0], 0x00F5, [IntPtr]::Zero, [IntPtr]::Zero)
Start-Sleep -Milliseconds 500
$remaining = @(Find-Exact)
if ($remaining.Count -ne 0) {
  throw "dialog_cancel_not_confirmed:$($remaining.Count)"
}
[pscustomobject]@{
  ok = $true
  processId = $expectedPid
  startedAtUtc = $env:ADC_EXPECTED_STARTED_AT_UTC
  dialogHwnd = $dialog.ToInt64()
  buttonHwnd = $script:cancel[0].ToInt64()
  className = $env:ADC_CLASS
  title = $env:ADC_TITLE
  command = 'Cancel'
  matchingBefore = $matches.Count
  matchingAfter = $remaining.Count
  safety = [pscustomobject]@{
    usesGlobalInput = $false
    usesGlobalCursor = $false
    usesGlobalKeyboard = $false
    usesGlobalMouse = $false
    usesGlobalMouseWheel = $false
    savesModule = $false
    changesIniOrMru = $false
    method = 'targeted synchronous BM_CLICK on one exact visible Cancel button in the exact PID/StartTime/HWND-bound Toolset dialog'
  }
} | ConvertTo-Json -Depth 5 -Compress
`;

const output = execFileSync(
  "powershell.exe",
  ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", source],
  {
    encoding: "utf8",
    windowsHide: true,
    timeout: 30_000,
    maxBuffer: 1024 * 1024,
    env: {
      ...process.env,
      ADC_CLASS: className,
      ADC_TITLE: title,
      ADC_EXPECTED_PROCESS_ID: String(expectedProcessId),
      ADC_EXPECTED_STARTED_AT_UTC: expectedStartedAtUtc,
      ADC_EXPECTED_DIALOG_HWND: String(expectedDialogHwnd),
      ADC_CONTRACT_PARSE_ONLY: String(contractParseOnly),
    },
  },
);
console.log(JSON.stringify(JSON.parse(output.trim()), null, 2));

function parseArgs(args) {
  const result = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!key?.startsWith("--") || value === undefined || value.startsWith("--")) {
      throw new Error(`Expected --name <value> near ${key ?? "end"}.`);
    }
    result[key.slice(2)] = value;
  }
  return result;
}

function required(value, name) {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`${name} is required.`);
  return text;
}

function positiveInteger(value, name) {
  const number = Number(required(value, name));
  if (!Number.isInteger(number) || number <= 0) throw new Error(`${name} must be a positive integer.`);
  return number;
}
