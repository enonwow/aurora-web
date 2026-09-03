#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const options = parseArgs(process.argv.slice(2));
const text = required(options.text, "--text");
const expectedId = nonNegativeInteger(options.expectedId, "--expectedId");
const expectedPosition = nonNegativeInteger(options.expectedPosition, "--expectedPosition");
const postcondition = String(options.postcondition ?? "dialog").trim().toLowerCase();
const compileOnly = booleanOption(options.compileOnly);
if (!["dialog", "focus-object"].includes(postcondition)) throw new Error("--postcondition must be dialog or focus-object.");
const dialogClass = postcondition === "dialog" ? required(options.dialogClass, "--dialogClass") : "";
const dialogTitle = postcondition === "dialog" ? required(options.dialogTitle, "--dialogTitle") : "";
const moduleName = postcondition === "focus-object" ? required(options.module, "--module") : "";
const areaResref = postcondition === "focus-object" ? required(options.area, "--area") : "";
if (postcondition === "focus-object" && (text !== "&Focus on Object" || expectedId !== 2 || expectedPosition !== 0)) {
  throw new Error("focus-object requires exact &Focus on Object, ID 2, position 0.");
}
if (compileOnly) {
  console.log(JSON.stringify({ ok: true, mode: "compile-only", postcondition, startsToolset: false, startsNwn: false, usesGlobalInput: false }, null, 2));
  process.exit(0);
}

const source = String.raw`
$ErrorActionPreference = 'Stop'
Add-Type @'
using System; using System.Text; using System.Runtime.InteropServices;
public static class AuroraVisibleMenuItem {
  public delegate bool EnumProc(IntPtr hwnd, IntPtr lParam);
  [StructLayout(LayoutKind.Sequential)] public struct Rect { public int Left, Top, Right, Bottom; }
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc callback, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr parent, EnumProc callback, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hwnd);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint pid);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr hwnd, StringBuilder text, int capacity);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr hwnd, StringBuilder text, int capacity);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hwnd, out Rect rect);
  [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr hwnd, uint message, IntPtr wParam, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr hwnd, uint message, IntPtr wParam, IntPtr lParam);
  [DllImport("user32.dll")] public static extern int GetMenuItemCount(IntPtr menu);
  [DllImport("user32.dll")] public static extern uint GetMenuItemID(IntPtr menu, int position);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetMenuString(IntPtr menu, uint item, StringBuilder text, int capacity, uint flags);
  [DllImport("user32.dll")] public static extern uint GetMenuState(IntPtr menu, uint item, uint flags);
}
'@
function Text([IntPtr]$hwnd) { $buffer=[Text.StringBuilder]::new(512); [void][AuroraVisibleMenuItem]::GetWindowText($hwnd,$buffer,$buffer.Capacity); $buffer.ToString() }
function Class([IntPtr]$hwnd) { $buffer=[Text.StringBuilder]::new(128); [void][AuroraVisibleMenuItem]::GetClassName($hwnd,$buffer,$buffer.Capacity); $buffer.ToString() }
function Bounds([IntPtr]$hwnd) { $rect=New-Object 'AuroraVisibleMenuItem+Rect'; [void][AuroraVisibleMenuItem]::GetWindowRect($hwnd,[ref]$rect); [pscustomobject]@{ left=$rect.Left; top=$rect.Top; width=$rect.Right-$rect.Left; height=$rect.Bottom-$rect.Top } }
function ToolsetWindows([uint32]$targetProcessId) {
  $script:windows=@()
  [void][AuroraVisibleMenuItem]::EnumWindows([AuroraVisibleMenuItem+EnumProc]{
    param($hwnd,$lparam)
    [uint32]$windowPid=0; [void][AuroraVisibleMenuItem]::GetWindowThreadProcessId($hwnd,[ref]$windowPid)
    if ($windowPid -eq $targetProcessId -and [AuroraVisibleMenuItem]::IsWindowVisible($hwnd)) { $script:windows += [pscustomobject]@{ hwnd=$hwnd; className=(Class $hwnd); title=(Text $hwnd) } }
    return $true
  },[IntPtr]::Zero)
  @($script:windows)
}
function Descendants([IntPtr]$parent,[uint32]$targetProcessId) {
  $script:children=@()
  [void][AuroraVisibleMenuItem]::EnumChildWindows($parent,[AuroraVisibleMenuItem+EnumProc]{
    param($hwnd,$lparam)
    [uint32]$windowPid=0; [void][AuroraVisibleMenuItem]::GetWindowThreadProcessId($hwnd,[ref]$windowPid)
    if ($windowPid -eq $targetProcessId -and [AuroraVisibleMenuItem]::IsWindowVisible($hwnd)) { $script:children += [pscustomobject]@{ hwnd=$hwnd; className=(Class $hwnd); title=(Text $hwnd); bounds=(Bounds $hwnd) } }
    return $true
  },[IntPtr]::Zero)
  @($script:children)
}

$processes=@(Get-Process nwtoolset -ErrorAction SilentlyContinue)
if ($processes.Count -ne 1 -or -not $processes[0].Responding) { throw "expected_one_responding_toolset:$($processes.Count)" }
[uint32]$toolsetPid=$processes[0].Id
$visible=ToolsetWindows $toolsetPid
$popups=@($visible | Where-Object { $_.className -eq '#32768' })
if ($popups.Count -ne 1) { throw "expected_one_visible_context_menu:$($popups.Count)" }
$popup=$popups[0]
$menu=[AuroraVisibleMenuItem]::SendMessage($popup.hwnd,0x01E1,[IntPtr]::Zero,[IntPtr]::Zero)
if ($menu -eq [IntPtr]::Zero) { throw 'mn_gethmenu_failed' }
$items=@()
for($index=0;$index -lt [AuroraVisibleMenuItem]::GetMenuItemCount($menu);$index++) {
  $buffer=[Text.StringBuilder]::new(512)
  [void][AuroraVisibleMenuItem]::GetMenuString($menu,[uint32]$index,$buffer,$buffer.Capacity,0x400)
  $state=[uint32][AuroraVisibleMenuItem]::GetMenuState($menu,[uint32]$index,0x400)
  $items += [pscustomobject]@{ position=$index; id=[uint32][AuroraVisibleMenuItem]::GetMenuItemID($menu,$index); text=$buffer.ToString(); enabled=(($state-band3)-eq0); separator=(($state-band0x800)-ne0); state=$state }
}
$matches=@($items | Where-Object { $_.text -eq $env:MENU_TEXT })
if ($matches.Count -ne 1) { throw "expected_one_exact_menu_item:$($env:MENU_TEXT):$($matches.Count)" }
$item=$matches[0]
if ($item.id -ne [uint32][int]$env:MENU_ID) { throw "menu_id_mismatch:actual=$($item.id) expected=$env:MENU_ID" }
if ($item.position -ne [int]$env:MENU_POSITION) { throw "menu_position_mismatch:actual=$($item.position) expected=$env:MENU_POSITION" }
if (-not $item.enabled -or $item.separator) { throw 'menu_item_not_enabled' }
if (-not [AuroraVisibleMenuItem]::PostMessage($popup.hwnd,0x0100,[IntPtr]0x24,[IntPtr]::Zero) -or -not [AuroraVisibleMenuItem]::PostMessage($popup.hwnd,0x0101,[IntPtr]0x24,[IntPtr]::Zero)) { throw 'menu_home_post_failed' }
for ($step=0;$step -lt $item.position;$step++) {
  if (-not [AuroraVisibleMenuItem]::PostMessage($popup.hwnd,0x0100,[IntPtr]0x28,[IntPtr]::Zero) -or -not [AuroraVisibleMenuItem]::PostMessage($popup.hwnd,0x0101,[IntPtr]0x28,[IntPtr]::Zero)) { throw "menu_down_post_failed:$step" }
}
if (-not [AuroraVisibleMenuItem]::PostMessage($popup.hwnd,0x0100,[IntPtr]0x0D,[IntPtr]::Zero) -or -not [AuroraVisibleMenuItem]::PostMessage($popup.hwnd,0x0101,[IntPtr]0x0D,[IntPtr]::Zero)) { throw 'menu_enter_post_failed' }
if ($env:POSTCONDITION -eq 'focus-object') {
  $deadline=[DateTime]::UtcNow.AddSeconds(8); $settled=$null; $lastState=$null
  do {
    Start-Sleep -Milliseconds 80
    $after=ToolsetWindows $toolsetPid
    $popupsAfter=@($after | Where-Object { $_.className -eq '#32768' })
    $frames=@($after | Where-Object { $_.className -eq 'TfrmFrame' -and $_.title.TrimEnd('*').EndsWith(" - $env:MODULE",[StringComparison]::OrdinalIgnoreCase) })
    $unexpected=@($after | Where-Object { $_.className -notin @('TfrmFrame','TApplication','#32768') })
    if ($popupsAfter.Count -eq 0 -and $frames.Count -eq 1 -and $unexpected.Count -eq 0) {
      $viewers=@(Descendants $frames[0].hwnd $toolsetPid | Where-Object { $_.className -eq 'TfrmViewerArea' -and $_.title.ToLowerInvariant().Contains($env:AREA.ToLowerInvariant()) })
      if ($viewers.Count -eq 1) {
        $scrolls=@(Descendants $viewers[0].hwnd $toolsetPid | Where-Object { $_.className -eq 'TScrollBox' })
        if ($scrolls.Count -eq 1 -and $scrolls[0].bounds.width -gt 0 -and $scrolls[0].bounds.height -gt 0) {
          $sampleA=[pscustomobject]@{ viewerHwnd=$viewers[0].hwnd.ToInt64(); viewerBounds=$viewers[0].bounds; viewportHwnd=$scrolls[0].hwnd.ToInt64(); viewportBounds=$scrolls[0].bounds }
          Start-Sleep -Milliseconds 250
          $viewersB=@(Descendants $frames[0].hwnd $toolsetPid | Where-Object { $_.className -eq 'TfrmViewerArea' -and $_.title.ToLowerInvariant().Contains($env:AREA.ToLowerInvariant()) })
          if ($viewersB.Count -eq 1) {
            $scrollsB=@(Descendants $viewersB[0].hwnd $toolsetPid | Where-Object { $_.className -eq 'TScrollBox' })
            if ($scrollsB.Count -eq 1) {
              $sampleB=[pscustomobject]@{ viewerHwnd=$viewersB[0].hwnd.ToInt64(); viewerBounds=$viewersB[0].bounds; viewportHwnd=$scrollsB[0].hwnd.ToInt64(); viewportBounds=$scrollsB[0].bounds }
              if (($sampleA | ConvertTo-Json -Compress) -eq ($sampleB | ConvertTo-Json -Compress)) { $settled=[pscustomobject]@{ sampleA=$sampleA; sampleB=$sampleB }; break }
            }
          }
        }
      }
    }
    $lastState=[pscustomobject]@{ popupCount=$popupsAfter.Count; frameCount=$frames.Count; unexpected=$unexpected; viewers=$viewers; scrolls=$scrolls }
  } while ([DateTime]::UtcNow -lt $deadline)
  if (@(ToolsetWindows $toolsetPid | Where-Object { $_.className -eq '#32768' }).Count -ne 0) { throw 'focus_object_popup_not_dismissed' }
  if ($null -eq $settled) { throw ('focus_object_viewer_not_settled:' + ($lastState | ConvertTo-Json -Depth 7 -Compress)) }
  [pscustomobject]@{ ok=$true; processId=$toolsetPid; popupHwnd=$popup.hwnd.ToInt64(); menuHandle=$menu.ToInt64(); item=$item; postcondition='focus-object'; module=$env:MODULE; area=$env:AREA; viewer=$settled; safety=[pscustomobject]@{ usesGlobalCursor=$false; usesGlobalKeyboard=$false; usesGlobalMouse=$false; guessedCommandId=$false; method='current visible popup exact item validation, targeted HOME/ENTER, popup dismissal, exact module/Area TfrmViewerArea and stable TScrollBox readback' } } | ConvertTo-Json -Depth 9 -Compress
  exit 0
}
$deadline=[DateTime]::UtcNow.AddSeconds(8); $dialog=$null
do {
  Start-Sleep -Milliseconds 80
  $after=ToolsetWindows $toolsetPid
  $dialogs=@($after | Where-Object { $_.className -eq $env:DIALOG_CLASS -and $_.title -eq $env:DIALOG_TITLE })
  if ($dialogs.Count -eq 1) { $dialog=$dialogs[0]; break }
} while ([DateTime]::UtcNow -lt $deadline)
if ($null -eq $dialog) { throw "context_menu_item_dialog_not_opened:$env:DIALOG_CLASS:$env:DIALOG_TITLE" }
if (@($after | Where-Object { $_.className -eq '#32768' }).Count -ne 0) { throw 'context_menu_not_dismissed_after_enter' }
[pscustomobject]@{ ok=$true; processId=$toolsetPid; popupHwnd=$popup.hwnd.ToInt64(); menuHandle=$menu.ToInt64(); item=$item; dialogHwnd=$dialog.hwnd.ToInt64(); dialogClass=$dialog.className; dialogTitle=$dialog.title; safety=[pscustomobject]@{ usesGlobalCursor=$false; usesGlobalKeyboard=$false; usesGlobalMouse=$false; guessedCommandId=$false; method='current visible popup MN_GETHMENU exact text/id/position/state validation then targeted popup HOME/DOWN/ENTER messages' } } | ConvertTo-Json -Depth 7 -Compress
`;

const output = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", source], {
  encoding: "utf8", windowsHide: true, timeout: 30_000, maxBuffer: 1024 * 1024,
  env: { ...process.env, MENU_TEXT: text, MENU_ID: String(expectedId), MENU_POSITION: String(expectedPosition), DIALOG_CLASS: dialogClass, DIALOG_TITLE: dialogTitle, POSTCONDITION: postcondition, MODULE: moduleName, AREA: areaResref },
}).trim();
console.log(JSON.stringify(JSON.parse(output), null, 2));

function parseArgs(argv) { const result={}; for(let index=0;index<argv.length;index+=2){ const key=argv[index], value=argv[index+1]; if(!key?.startsWith("--") || value===undefined || value.startsWith("--")) throw new Error(`Expected --name <value> near ${key??"end"}.`); result[key.slice(2)]=value; } return result; }
function required(value,name) { const text=String(value??"").trim(); if(!text) throw new Error(`${name} is required.`); return text; }
function nonNegativeInteger(value,name) { const parsed=Number(required(value,name)); if(!Number.isInteger(parsed) || parsed < 0) throw new Error(`${name} must be a non-negative integer.`); return parsed; }
function booleanOption(value) { return String(value ?? "false").trim().toLowerCase() === "true"; }
