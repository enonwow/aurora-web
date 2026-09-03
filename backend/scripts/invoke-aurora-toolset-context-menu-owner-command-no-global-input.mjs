#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const options = parseArgs(process.argv.slice(2));
const itemText = required(options.itemText, "--itemText");
const inspectOnly = String(options.inspectOnly ?? "false").toLowerCase() === "true";
const method = String(options.method ?? "command").toLowerCase();
if (!new Set(["command", "accelerator", "enter"]).has(method)) throw new Error("--method must be command, accelerator, or enter.");

const source = String.raw`
$ErrorActionPreference = 'Stop'
Add-Type @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class AuroraMenuOwner {
  public delegate bool EnumProc(IntPtr hwnd, IntPtr lParam);
  [StructLayout(LayoutKind.Sequential)] public struct GUITHREADINFO {
    public int cbSize; public uint flags; public IntPtr hwndActive; public IntPtr hwndFocus;
    public IntPtr hwndCapture; public IntPtr hwndMenuOwner; public IntPtr hwndMoveSize; public IntPtr hwndCaret;
    public RECT rcCaret;
  }
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc callback, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hwnd);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint processId);
  [DllImport("user32.dll")] public static extern bool GetGUIThreadInfo(uint threadId, ref GUITHREADINFO info);
  [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr hwnd, uint msg, IntPtr wParam, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr hwnd, uint msg, IntPtr wParam, IntPtr lParam);
  [DllImport("user32.dll")] public static extern int GetMenuItemCount(IntPtr menu);
  [DllImport("user32.dll")] public static extern uint GetMenuItemID(IntPtr menu, int position);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetMenuString(IntPtr menu, uint item, StringBuilder text, int capacity, uint flags);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr hwnd, StringBuilder text, int capacity);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr hwnd, StringBuilder text, int capacity);
}
'@
function Class([IntPtr]$h) { $b=[Text.StringBuilder]::new(128); [void][AuroraMenuOwner]::GetClassName($h,$b,$b.Capacity); $b.ToString() }
function Text([IntPtr]$h) { $b=[Text.StringBuilder]::new(512); [void][AuroraMenuOwner]::GetWindowText($h,$b,$b.Capacity); $b.ToString() }

$toolset = @(Get-Process nwtoolset -ErrorAction SilentlyContinue)
if ($toolset.Count -ne 1) { throw "expected_one_toolset_process:$($toolset.Count)" }
[uint32]$toolsetPid = $toolset[0].Id
$script:popups = @()
[void][AuroraMenuOwner]::EnumWindows([AuroraMenuOwner+EnumProc]{
  param($h,$l)
  [uint32]$p=0
  $thread=[AuroraMenuOwner]::GetWindowThreadProcessId($h,[ref]$p)
  if ($p -eq $toolsetPid -and [AuroraMenuOwner]::IsWindowVisible($h) -and (Class $h) -eq '#32768') {
    $script:popups += [pscustomobject]@{ hwnd=$h; thread=$thread }
  }
  $true
}, [IntPtr]::Zero)
if ($script:popups.Count -ne 1) { throw "expected_one_toolset_popup:$($script:popups.Count)" }
$popup = $script:popups[0]
$menu = [AuroraMenuOwner]::SendMessage($popup.hwnd,0x01E1,[IntPtr]::Zero,[IntPtr]::Zero)
if ($menu -eq [IntPtr]::Zero) { throw 'mn_gethmenu_failed' }
$items = @()
for ($i=0; $i -lt [AuroraMenuOwner]::GetMenuItemCount($menu); $i++) {
  $b=[Text.StringBuilder]::new(512)
  [void][AuroraMenuOwner]::GetMenuString($menu,[uint32]$i,$b,$b.Capacity,0x400)
  $items += [pscustomobject]@{ position=$i; id=[uint32][AuroraMenuOwner]::GetMenuItemID($menu,$i); text=$b.ToString() }
}
$matches=@($items | Where-Object { $_.text -eq $env:ITEM_TEXT })
if ($matches.Count -ne 1) { throw "expected_one_exact_menu_item:$($env:ITEM_TEXT):$($matches.Count)" }
$selected=$matches[0]
$info=New-Object 'AuroraMenuOwner+GUITHREADINFO'
$info.cbSize=[Runtime.InteropServices.Marshal]::SizeOf($info)
if (-not [AuroraMenuOwner]::GetGUIThreadInfo([uint32]$popup.thread,[ref]$info)) { throw "get_gui_thread_info_failed:$([Runtime.InteropServices.Marshal]::GetLastWin32Error())" }
$owner = if ($info.hwndMenuOwner -ne [IntPtr]::Zero) { $info.hwndMenuOwner } elseif ($info.hwndActive -ne [IntPtr]::Zero) { $info.hwndActive } else { throw 'menu_owner_missing' }
$before=[pscustomobject]@{
  popupHwnd=$popup.hwnd.ToInt64(); popupThread=$popup.thread; menuHandle=$menu.ToInt64()
  activeHwnd=$info.hwndActive.ToInt64(); activeClass=(Class $info.hwndActive); activeText=(Text $info.hwndActive)
  focusHwnd=$info.hwndFocus.ToInt64(); focusClass=(Class $info.hwndFocus); focusText=(Text $info.hwndFocus)
  captureHwnd=$info.hwndCapture.ToInt64(); captureClass=(Class $info.hwndCapture)
  menuOwnerHwnd=$info.hwndMenuOwner.ToInt64(); menuOwnerClass=(Class $info.hwndMenuOwner); menuOwnerText=(Text $info.hwndMenuOwner)
}
$invoked=$false
if ($env:INSPECT_ONLY -ne 'true') {
  if ((Class $owner) -eq 'TPUtilWindow') {
    throw 'tp_util_window_menu_owner_dispatch_forbidden: use exact popup WM_CHAR accelerator transport'
  }
  if ($env:METHOD -eq 'accelerator') {
    $amp=$selected.text.IndexOf('&')
    if ($amp -lt 0 -or $amp+1 -ge $selected.text.Length) { throw 'menu_accelerator_missing' }
    $key=[int][char]$selected.text[$amp+1]
    if (-not [AuroraMenuOwner]::PostMessage($owner,0x0102,[IntPtr]$key,[IntPtr]::Zero)) { throw 'menu_owner_wm_char_failed' }
  } elseif ($env:METHOD -eq 'enter') {
    # Select the validated menu position through WM_MENUSELECT, then press Enter only on the menu-owner window.
    $menuSelect=[IntPtr][int64](($selected.id -band 0xffff) -bor (0 -shl 16))
    [void][AuroraMenuOwner]::PostMessage($owner,0x011F,$menuSelect,$menu)
    [void][AuroraMenuOwner]::PostMessage($owner,0x0100,[IntPtr]0x0D,[IntPtr]::Zero)
    [void][AuroraMenuOwner]::PostMessage($owner,0x0101,[IntPtr]0x0D,[IntPtr]::Zero)
  } else {
    # Cancel only the tracked popup, then deliver its validated command to the GUI-thread menu owner.
    [void][AuroraMenuOwner]::PostMessage($owner,0x001F,[IntPtr]::Zero,[IntPtr]::Zero)
    Start-Sleep -Milliseconds 100
    $wParam=[IntPtr][int64]($selected.id -band 0xffff)
    if (-not [AuroraMenuOwner]::PostMessage($owner,0x0111,$wParam,[IntPtr]::Zero)) { throw 'menu_owner_wm_command_failed' }
  }
  $invoked=$true
  Start-Sleep -Milliseconds 900
}
$script:visible=@()
[void][AuroraMenuOwner]::EnumWindows([AuroraMenuOwner+EnumProc]{
  param($h,$l)
  [uint32]$p=0; [void][AuroraMenuOwner]::GetWindowThreadProcessId($h,[ref]$p)
  if ($p -eq $toolsetPid -and [AuroraMenuOwner]::IsWindowVisible($h)) {
    $script:visible += [pscustomobject]@{ hwnd=$h.ToInt64(); className=(Class $h); title=(Text $h) }
  }
  $true
},[IntPtr]::Zero)
[pscustomobject]@{
  ok=$true; processId=$toolsetPid; item=$selected; guiThread=$before; invoked=$invoked; visibleToolsetWindows=$script:visible
  safety=[pscustomobject]@{ usesGlobalCursor=$false; usesGlobalKeyboard=$false; usesGlobalMouse=$false; method='GetGUIThreadInfo menu-owner resolution plus targeted WM_CANCELMODE/WM_COMMAND' }
} | ConvertTo-Json -Depth 8 -Compress
`;

const output = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", source], {
  encoding: "utf8", windowsHide: true, timeout: 30_000, maxBuffer: 4 * 1024 * 1024,
  env: { ...process.env, ITEM_TEXT: itemText, INSPECT_ONLY: String(inspectOnly), METHOD: method },
});
console.log(JSON.stringify(JSON.parse(output.trim()), null, 2));

function parseArgs(argv) { const result={}; for (let i=0;i<argv.length;i+=2) { const key=argv[i], value=argv[i+1]; if (!key?.startsWith("--") || value===undefined) throw new Error(`Expected --name <value> near ${key ?? "end"}.`); result[key.slice(2)]=value; } return result; }
function required(value,name) { const text=String(value ?? "").trim(); if (!text) throw new Error(`${name} is required.`); return text; }
