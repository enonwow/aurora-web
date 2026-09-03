#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const options = parseArgs(process.argv.slice(2));
const text = required(options.text, "--text");
const expectedId = nonNegativeInteger(options.expectedId, "--expectedId");
const expectedPosition = nonNegativeInteger(options.expectedPosition, "--expectedPosition");
const dialogClass = required(options.dialogClass, "--dialogClass");
const dialogTitle = required(options.dialogTitle, "--dialogTitle");

const source = String.raw`
$ErrorActionPreference = 'Stop'
Add-Type @'
using System; using System.Text; using System.Runtime.InteropServices;
public static class AuroraVisibleMenuAccelerator {
  public delegate bool EnumProc(IntPtr hwnd, IntPtr lParam);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc callback, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hwnd);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint processId);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr hwnd, StringBuilder text, int capacity);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr hwnd, StringBuilder text, int capacity);
  [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr hwnd, uint message, IntPtr wParam, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr hwnd, uint message, IntPtr wParam, IntPtr lParam);
  [DllImport("user32.dll")] public static extern int GetMenuItemCount(IntPtr menu);
  [DllImport("user32.dll")] public static extern uint GetMenuItemID(IntPtr menu, int position);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetMenuString(IntPtr menu, uint item, StringBuilder text, int capacity, uint flags);
  [DllImport("user32.dll")] public static extern uint GetMenuState(IntPtr menu, uint item, uint flags);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hwnd, out RECT rect);
  [DllImport("user32.dll")] public static extern bool GetMenuItemRect(IntPtr hwnd, IntPtr menu, uint item, out RECT rect);
}
'@
function Text([IntPtr]$hwnd) { $buffer=[Text.StringBuilder]::new(512); [void][AuroraVisibleMenuAccelerator]::GetWindowText($hwnd,$buffer,$buffer.Capacity); $buffer.ToString() }
function Class([IntPtr]$hwnd) { $buffer=[Text.StringBuilder]::new(128); [void][AuroraVisibleMenuAccelerator]::GetClassName($hwnd,$buffer,$buffer.Capacity); $buffer.ToString() }
function ToolsetWindows([uint32]$targetProcessId) {
  $script:windows=@()
  [void][AuroraVisibleMenuAccelerator]::EnumWindows([AuroraVisibleMenuAccelerator+EnumProc]{
    param($hwnd,$lparam)
    [uint32]$windowPid=0; [void][AuroraVisibleMenuAccelerator]::GetWindowThreadProcessId($hwnd,[ref]$windowPid)
    if ($windowPid -eq $targetProcessId -and [AuroraVisibleMenuAccelerator]::IsWindowVisible($hwnd)) { $script:windows += [pscustomobject]@{ hwnd=$hwnd; className=(Class $hwnd); title=(Text $hwnd) } }
    return $true
  },[IntPtr]::Zero)
  @($script:windows)
}

$processes=@(Get-Process nwtoolset -ErrorAction SilentlyContinue)
if ($processes.Count -ne 1 -or -not $processes[0].Responding) { throw "expected_one_responding_toolset:$($processes.Count)" }
[uint32]$toolsetPid=$processes[0].Id
$visible=ToolsetWindows $toolsetPid
$popups=@($visible | Where-Object { $_.className -eq '#32768' })
if ($popups.Count -ne 1) { throw "expected_one_visible_context_menu:$($popups.Count)" }
$popup=$popups[0]
$menu=[AuroraVisibleMenuAccelerator]::SendMessage($popup.hwnd,0x01E1,[IntPtr]::Zero,[IntPtr]::Zero)
if ($menu -eq [IntPtr]::Zero) { throw 'mn_gethmenu_failed' }
$items=@()
for($index=0;$index -lt [AuroraVisibleMenuAccelerator]::GetMenuItemCount($menu);$index++) {
  $buffer=[Text.StringBuilder]::new(512)
  [void][AuroraVisibleMenuAccelerator]::GetMenuString($menu,[uint32]$index,$buffer,$buffer.Capacity,0x400)
  $state=[uint32][AuroraVisibleMenuAccelerator]::GetMenuState($menu,[uint32]$index,0x400)
  $items += [pscustomobject]@{ position=$index; id=[uint32][AuroraVisibleMenuAccelerator]::GetMenuItemID($menu,$index); text=$buffer.ToString(); enabled=(($state-band3)-eq0); separator=(($state-band0x800)-ne0); state=$state }
}
$matches=@($items | Where-Object { $_.text -eq $env:MENU_TEXT })
if ($matches.Count -ne 1) { throw "expected_one_exact_menu_item:$($env:MENU_TEXT):$($matches.Count)" }
$item=$matches[0]
if ($item.id -ne [uint32][int]$env:MENU_ID) { throw "menu_id_mismatch:actual=$($item.id) expected=$env:MENU_ID" }
if ($item.position -ne [int]$env:MENU_POSITION) { throw "menu_position_mismatch:actual=$($item.position) expected=$env:MENU_POSITION" }
if (-not $item.enabled -or $item.separator) { throw 'menu_item_not_enabled' }
$amp=$item.text.IndexOf('&')
if ($amp -lt 0 -or $amp+1 -ge $item.text.Length) { throw 'menu_accelerator_missing' }
$accelerator=[char]$item.text[$amp+1]
$acceleratorMatches=@($items | Where-Object { $_.enabled -and -not $_.separator -and $_.text.IndexOf('&') -ge 0 -and $_.text.IndexOf('&')+1 -lt $_.text.Length -and [char]::ToUpperInvariant([char]$_.text[$_.text.IndexOf('&')+1]) -eq [char]::ToUpperInvariant($accelerator) })
if ($acceleratorMatches.Count -ne 1 -or $acceleratorMatches[0].position -ne $item.position) { throw "menu_accelerator_not_unique:$($accelerator):$($acceleratorMatches.Count)" }
$menuRect=New-Object 'AuroraVisibleMenuAccelerator+RECT'; $itemRect=New-Object 'AuroraVisibleMenuAccelerator+RECT'
if (-not [AuroraVisibleMenuAccelerator]::GetWindowRect($popup.hwnd,[ref]$menuRect) -or -not [AuroraVisibleMenuAccelerator]::GetMenuItemRect([IntPtr]::Zero,$menu,[uint32]$item.position,[ref]$itemRect) -or $itemRect.Right -le $itemRect.Left -or $itemRect.Bottom -le $itemRect.Top) { throw 'menu_accelerator_geometry_missing' }
if (-not [AuroraVisibleMenuAccelerator]::PostMessage($popup.hwnd,0x0102,[IntPtr][int]$accelerator,[IntPtr]::Zero)) { throw 'menu_popup_accelerator_failed' }
$deadline=[DateTime]::UtcNow.AddSeconds(8); $dialog=$null
do {
  Start-Sleep -Milliseconds 80
  $after=ToolsetWindows $toolsetPid
  $dialogs=@($after | Where-Object { $_.className -eq $env:DIALOG_CLASS -and $_.title -eq $env:DIALOG_TITLE })
  if ($dialogs.Count -eq 1) { $dialog=$dialogs[0]; break }
} while ([DateTime]::UtcNow -lt $deadline)
if ($null -eq $dialog) { throw "context_menu_accelerator_dialog_not_opened:$env:DIALOG_CLASS:$env:DIALOG_TITLE" }
if (@($after | Where-Object { $_.className -eq '#32768' }).Count -ne 0) { throw 'context_menu_not_dismissed_after_accelerator' }
[pscustomobject]@{ ok=$true; processId=$toolsetPid; popupHwnd=$popup.hwnd.ToInt64(); menuHandle=$menu.ToInt64(); item=$item; accelerator=[string]$accelerator; dialogHwnd=$dialog.hwnd.ToInt64(); dialogClass=$dialog.className; dialogTitle=$dialog.title; safety=[pscustomobject]@{ usesGlobalCursor=$false; usesGlobalKeyboard=$false; usesGlobalMouse=$false; guessedCommandId=$false; method='current visible popup MN_GETHMENU exact text/id/position/state and unique accelerator validation, then targeted popup WM_CHAR with exact dialog readback' } } | ConvertTo-Json -Depth 7 -Compress
`;

const output = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", source], {
  encoding: "utf8", windowsHide: true, timeout: 30_000, maxBuffer: 1024 * 1024,
  env: { ...process.env, MENU_TEXT: text, MENU_ID: String(expectedId), MENU_POSITION: String(expectedPosition), DIALOG_CLASS: dialogClass, DIALOG_TITLE: dialogTitle },
}).trim();
console.log(JSON.stringify(JSON.parse(output), null, 2));

function parseArgs(argv) { const result={}; for(let index=0;index<argv.length;index+=2){ const key=argv[index], value=argv[index+1]; if(!key?.startsWith("--") || value===undefined || value.startsWith("--")) throw new Error(`Expected --name <value> near ${key??"end"}.`); result[key.slice(2)]=value; } return result; }
function required(value,name) { const text=String(value??"").trim(); if(!text) throw new Error(`${name} is required.`); return text; }
function nonNegativeInteger(value,name) { const parsed=Number(required(value,name)); if(!Number.isInteger(parsed) || parsed < 0) throw new Error(`${name} must be a non-negative integer.`); return parsed; }
