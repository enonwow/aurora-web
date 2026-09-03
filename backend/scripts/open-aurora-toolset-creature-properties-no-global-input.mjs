#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const options = parseArgs(process.argv.slice(2));
const moduleName = required(options.module, "--module");
const objectText = required(options.objectText, "--objectText");
const reuseVisiblePopup = String(options.reuseVisiblePopup ?? "false").toLowerCase() === "true";
const expectedPropertiesId = positiveInteger(options.expectedPropertiesId ?? "19", "--expectedPropertiesId");
const timeoutMs = positiveInteger(options.timeoutMs ?? "8000", "--timeoutMs");
const here = dirname(fileURLToPath(import.meta.url));

let context = null;
if (!reuseVisiblePopup) {
  context = JSON.parse(execFileSync(process.execPath, [resolve(here, "inspect-aurora-toolset-area-tree-object-context-no-global-input.mjs"), "--module", moduleName, "--objectText", objectText], { encoding: "utf8", windowsHide: true, timeout: 45_000, maxBuffer: 4 * 1024 * 1024 }).trim());
  const properties = context.popup?.items?.filter((item) => item.text === "&Properties" && item.id === expectedPropertiesId && item.enabled === true && item.separator === false);
  if (properties?.length !== 1) throw new Error(`validated_creature_properties_menu_item_missing:${properties?.length ?? 0}`);
}

const source = String.raw`
$ErrorActionPreference='Stop';Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;
public static class ACPO{
 public delegate bool E(IntPtr h,IntPtr l);[StructLayout(LayoutKind.Sequential)]public struct R{public int Left,Top,Right,Bottom;}
 [DllImport("user32.dll")]public static extern bool EnumWindows(E c,IntPtr l);[DllImport("user32.dll")]public static extern bool EnumChildWindows(IntPtr p,E c,IntPtr l);[DllImport("user32.dll")]public static extern bool IsWindowVisible(IntPtr h);[DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);[DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetWindowText(IntPtr h,StringBuilder b,int n);[DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetClassName(IntPtr h,StringBuilder b,int n);[DllImport("user32.dll")]public static extern IntPtr SendMessage(IntPtr h,uint m,IntPtr w,IntPtr l);[DllImport("user32.dll")]public static extern bool PostMessage(IntPtr h,uint m,IntPtr w,IntPtr l);[DllImport("user32.dll")]public static extern int GetMenuItemCount(IntPtr m);[DllImport("user32.dll")]public static extern uint GetMenuItemID(IntPtr m,int p);[DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetMenuString(IntPtr m,uint i,StringBuilder b,int n,uint f);[DllImport("user32.dll")]public static extern uint GetMenuState(IntPtr m,uint i,uint f);[DllImport("user32.dll")]public static extern bool GetMenuItemRect(IntPtr h,IntPtr m,uint i,out R r);[DllImport("user32.dll")]public static extern bool GetWindowRect(IntPtr h,out R r);
}
'@
function T([IntPtr]$h){$b=[Text.StringBuilder]::new(512);[void][ACPO]::GetWindowText($h,$b,$b.Capacity);$b.ToString()};function C([IntPtr]$h){$b=[Text.StringBuilder]::new(128);[void][ACPO]::GetClassName($h,$b,$b.Capacity);$b.ToString()}
$ps=@(Get-Process nwtoolset -ErrorAction SilentlyContinue);if($ps.Count-ne1){throw "expected_one_toolset_process:$($ps.Count)"};[uint32]$pid=$ps[0].Id
$script:frames=@();$script:existingDialogs=@();$script:popups=@();[void][ACPO]::EnumWindows([ACPO+E]{param($h,$l);[uint32]$p=0;[void][ACPO]::GetWindowThreadProcessId($h,[ref]$p);if($p-eq$pid-and[ACPO]::IsWindowVisible($h)){if((C $h)-eq'TfrmFrame'-and(T $h).TrimEnd('*').EndsWith(" - $env:MODULE",[StringComparison]::OrdinalIgnoreCase)){$script:frames+=$h};if((C $h)-eq'TdlgCreatureEdit'){$script:existingDialogs+=$h};if((C $h)-eq'#32768'){$script:popups+=$h}};$true},[IntPtr]::Zero)
if($script:frames.Count-ne1){throw "exact_frame_missing:$($script:frames.Count)"};$frame=$script:frames[0];if([Windows.Forms.Screen]::FromHandle($frame).Primary){throw 'frame_on_primary'};if($script:existingDialogs.Count-ne0){throw "creature_properties_already_open:$($script:existingDialogs.Count)"}
if($env:REUSE-eq'true'){if($script:popups.Count-ne1){throw "expected_one_reusable_properties_popup:$($script:popups.Count)"};$popup=$script:popups[0]}else{$popup=[IntPtr][int64]$env:POPUP;if($popup-eq[IntPtr]::Zero-or$script:popups.Count-ne1-or$script:popups[0]-ne$popup){throw 'fresh_properties_popup_identity_missing'}}
$menu=[ACPO]::SendMessage($popup,0x01E1,[IntPtr]::Zero,[IntPtr]::Zero);if($menu-eq[IntPtr]::Zero){throw 'mn_gethmenu_failed'};$items=@();for($i=0;$i-lt[ACPO]::GetMenuItemCount($menu);$i++){$b=[Text.StringBuilder]::new(512);[void][ACPO]::GetMenuString($menu,[uint32]$i,$b,$b.Capacity,0x400);$state=[uint32][ACPO]::GetMenuState($menu,[uint32]$i,0x400);$items+=[pscustomobject]@{position=$i;id=[uint32][ACPO]::GetMenuItemID($menu,$i);text=$b.ToString();enabled=(($state-band3)-eq0);separator=(($state-band0x800)-ne0);state=$state}}
$properties=@($items|Where-Object{$_.text-eq'&Properties'-and$_.id-eq[uint32][int]$env:PROPERTIES_ID-and$_.enabled-and-not$_.separator});if($properties.Count-ne1){throw "validated_current_properties_menu_item_missing:$($properties.Count)"};$property=$properties[0];$acceleratorMatches=@($items|Where-Object{$_.enabled-and-not$_.separator-and$_.text-match'&P'});if($acceleratorMatches.Count-ne1-or$acceleratorMatches[0].position-ne$property.position){throw "properties_popup_accelerator_not_unique:$($acceleratorMatches.Count)"};$menuRect=New-Object 'ACPO+R';$itemRect=New-Object 'ACPO+R';if(-not[ACPO]::GetWindowRect($popup,[ref]$menuRect)-or-not[ACPO]::GetMenuItemRect([IntPtr]::Zero,$menu,[uint32]$property.position,[ref]$itemRect)){throw 'properties_popup_geometry_missing'}
if(-not[ACPO]::PostMessage($popup,0x0102,[IntPtr][int][char]'P',[IntPtr]::Zero)){throw 'properties_popup_accelerator_failed'}
$deadline=[DateTime]::UtcNow.AddMilliseconds([int]$env:TIMEOUT);$dialog=[IntPtr]::Zero;do{Start-Sleep -Milliseconds 120;$script:dialogs=@();$script:remainingPopups=@();[void][ACPO]::EnumWindows([ACPO+E]{param($h,$l);[uint32]$p=0;[void][ACPO]::GetWindowThreadProcessId($h,[ref]$p);if($p-eq$pid-and[ACPO]::IsWindowVisible($h)){if((C $h)-eq'TdlgCreatureEdit'-and(T $h)-eq'Creature Properties'){$script:dialogs+=$h};if((C $h)-eq'#32768'){$script:remainingPopups+=$h}};$true},[IntPtr]::Zero);if($script:dialogs.Count-eq1-and$script:remainingPopups.Count-eq0){$dialog=$script:dialogs[0];break}}while([DateTime]::UtcNow-lt$deadline)
if($dialog-eq[IntPtr]::Zero){throw "creature_properties_not_opened_after_popup_accelerator:$($script:dialogs.Count):$($script:remainingPopups.Count)"}
[pscustomobject]@{ok=$true;processId=$pid;frameHwnd=$frame.ToInt64();dialogHwnd=$dialog.ToInt64();reusedVisiblePopup=($env:REUSE-eq'true');contextTarget=$env:TARGET;menu=[pscustomobject]@{popupHwnd=$popup.ToInt64();menuHandle=$menu.ToInt64();position=$property.position;commandId=$property.id;text=$property.text;accelerator='P';acceleratorUnique=$true};safety=[pscustomobject]@{usesGlobalCursor=$false;usesGlobalKeyboard=$false;usesGlobalMouse=$false;method='exact current popup MN_GETHMENU text/id/state readback, unique enabled P accelerator, targeted popup WM_CHAR, and TdlgCreatureEdit readback'}}|ConvertTo-Json -Depth 7 -Compress
`;
const live = JSON.parse(execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", source], { encoding: "utf8", windowsHide: true, timeout: timeoutMs + 30_000, maxBuffer: 4 * 1024 * 1024, env: { ...process.env, MODULE: moduleName, TARGET: objectText, REUSE: String(reuseVisiblePopup), POPUP: String(context?.popup?.hwnd ?? 0), PROPERTIES_ID: String(expectedPropertiesId), TIMEOUT: String(timeoutMs) } }).trim());
console.log(JSON.stringify({ ...live, context }, null, 2));

function parseArgs(argv) { const out = {}; for (let index = 0; index < argv.length; index += 2) { const key = argv[index], value = argv[index + 1]; if (!key?.startsWith("--") || value === undefined) throw new Error(`Expected --name <value> near ${key ?? "end"}.`); out[key.slice(2)] = value; } return out; }
function required(value, name) { const text = String(value ?? "").trim(); if (!text) throw new Error(`${name} required`); return text; }
function positiveInteger(value, name) { const number = Number(value); if (!Number.isInteger(number) || number <= 0) throw new Error(`${name} must be a positive integer.`); return number; }
