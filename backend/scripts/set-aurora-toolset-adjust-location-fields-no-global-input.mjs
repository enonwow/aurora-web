#!/usr/bin/env node

import { execFileSync } from "node:child_process";

const options = parseArgs(process.argv.slice(2));
for (const name of ["expectedX", "expectedY", "expectedZ", "x", "y", "z"]) {
  if (!options[name]) throw new Error(`--${name} required`);
}

const source = String.raw`
$ErrorActionPreference = 'Stop'
Add-Type @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class LocationEdit {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc callback, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr parent, EnumWindowsProc callback, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr hWnd, StringBuilder text, int count);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern bool SetWindowText(IntPtr hWnd, string text);
  [DllImport("user32.dll")] public static extern int GetDlgCtrlID(IntPtr hWnd);
  [DllImport("user32.dll", SetLastError=true)] public static extern IntPtr SendMessageTimeout(IntPtr hWnd, uint message, IntPtr wParam, IntPtr lParam, uint flags, uint timeout, out IntPtr result);
}
'@

function Text([IntPtr]$hwnd) {
  $buffer = [Text.StringBuilder]::new(256)
  [void][LocationEdit]::GetWindowText($hwnd, $buffer, $buffer.Capacity)
  $buffer.ToString()
}
function WindowClass([IntPtr]$hwnd) {
  $buffer = [Text.StringBuilder]::new(128)
  [void][LocationEdit]::GetClassName($hwnd, $buffer, $buffer.Capacity)
  $buffer.ToString()
}
function Bounds([IntPtr]$hwnd) {
  $rect = New-Object 'LocationEdit+RECT'
  if (-not [LocationEdit]::GetWindowRect($hwnd, [ref]$rect)) { throw 'position_field_bounds_missing' }
  $rect
}

$processes = @(Get-Process nwtoolset -ErrorAction SilentlyContinue)
if ($processes.Count -ne 1) { throw "expected_one_toolset_process:$($processes.Count)" }
[uint32]$toolsetPid = $processes[0].Id
$script:dialogs = @()
$dialogCallback = [LocationEdit+EnumWindowsProc]{
  param($hwnd, $lParam)
  [uint32]$windowPid = 0
  [void][LocationEdit]::GetWindowThreadProcessId($hwnd, [ref]$windowPid)
  if ($windowPid -eq $toolsetPid -and [LocationEdit]::IsWindowVisible($hwnd) -and (WindowClass $hwnd) -eq 'TdlgLocation' -and (Text $hwnd) -eq 'Adjust Location') { $script:dialogs += $hwnd }
  return $true
}
[void][LocationEdit]::EnumWindows($dialogCallback, [IntPtr]::Zero)
if ($script:dialogs.Count -ne 1) { throw "expected_one_adjust_location:$($script:dialogs.Count)" }
$dialog = $script:dialogs[0]
$dialogBounds = Bounds $dialog

$script:rawFields = @()
$fieldCallback = [LocationEdit+EnumWindowsProc]{
  param($hwnd, $lParam)
  if ([LocationEdit]::IsWindowVisible($hwnd) -and (WindowClass $hwnd) -eq 'TEdit') {
    $bounds = Bounds $hwnd
    if ($bounds.Left -lt ($dialogBounds.Left + 170) -and $bounds.Top -ge ($dialogBounds.Top + 40) -and $bounds.Top -lt ($dialogBounds.Top + 140)) { $script:rawFields += [pscustomobject]@{ hwnd=$hwnd; bounds=$bounds; text=(Text $hwnd) } }
  }
  return $true
}
[void][LocationEdit]::EnumChildWindows($dialog, $fieldCallback, [IntPtr]::Zero)
$fields = @($script:rawFields | Sort-Object { $_.bounds.Top })
if ($fields.Count -ne 3) { throw "expected_three_position_fields:$($fields.Count)" }
$before = @($fields | ForEach-Object { $_.text })
$expected = @($env:EX, $env:EY, $env:EZ)
for ($index = 0; $index -lt 3; $index++) { if ($before[$index] -ne $expected[$index]) { throw "position_field_mismatch:$index actual=$($before[$index]) expected=$($expected[$index])" } }

$values = @($env:NX, $env:NY, $env:NZ)
for ($index = 0; $index -lt 3; $index++) {
  if (-not [LocationEdit]::SetWindowText($fields[$index].hwnd, $values[$index])) { throw "set_window_text_failed:$index" }
}

# SetWindowText updates the visible TEdit but does not itself create the native edit-change notification.
# Match the documented control notification shape (LOWORD=actual control ID, HIWORD=EN_CHANGE, LPARAM=edit HWND).
$notifications = @()
for ($index = 0; $index -lt 3; $index++) {
  $controlId = [LocationEdit]::GetDlgCtrlID($fields[$index].hwnd)
  if ($controlId -le 0) { throw "position_field_control_id_invalid:$($index):$($controlId)" }
  $wParam = [IntPtr][int64](($controlId -band 0xffff) -bor (0x0300 -shl 16))
  $result = [IntPtr]::Zero
  $sent = [LocationEdit]::SendMessageTimeout($dialog, 0x0111, $wParam, $fields[$index].hwnd, 2, 2000, [ref]$result)
  if ($sent -eq [IntPtr]::Zero) { throw "position_field_en_change_timeout:$index" }
  $notifications += [pscustomobject]@{ name=@('X','Y','Z')[$index]; controlId=$controlId; code='EN_CHANGE'; wParam=$wParam.ToInt64(); target='TdlgLocation actual parent' }
}

Start-Sleep -Milliseconds 250
$after = @($fields | ForEach-Object { Text $_.hwnd })
for ($index = 0; $index -lt 3; $index++) { if ($after[$index] -ne $values[$index]) { throw "position_field_set_failed:$index actual=$($after[$index]) expected=$($values[$index])" } }

[pscustomobject]@{
  ok=$true; processId=$toolsetPid; dialogHwnd=$dialog.ToInt64()
  fields=@(
    [pscustomobject]@{ name='X'; hwnd=$fields[0].hwnd.ToInt64(); before=$before[0]; after=$after[0] }
    [pscustomobject]@{ name='Y'; hwnd=$fields[1].hwnd.ToInt64(); before=$before[1]; after=$after[1] }
    [pscustomobject]@{ name='Z'; hwnd=$fields[2].hwnd.ToInt64(); before=$before[2]; after=$after[2] }
  )
  notifications=$notifications; committed=$false
  safety=[pscustomobject]@{ usesGlobalCursor=$false; usesGlobalKeyboard=$false; usesGlobalMouse=$false; method='targeted SetWindowText followed by documented EN_CHANGE WM_COMMAND to the validated TdlgLocation parent' }
} | ConvertTo-Json -Depth 6 -Compress
`;

const output = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", source], {
  encoding: "utf8", windowsHide: true, timeout: 30000,
  env: { ...process.env, EX: options.expectedX, EY: options.expectedY, EZ: options.expectedZ, NX: options.x, NY: options.y, NZ: options.z },
}).trim();
console.log(JSON.stringify(JSON.parse(output), null, 2));

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) result[argv[index].slice(2)] = argv[index + 1];
  return result;
}
