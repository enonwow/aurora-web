#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const options = parseArgs(process.argv.slice(2));
const moduleName = required(options.module, "--module");
const event = required(options.event, "--event");
const resource = required(options.resource, "--resource");
const rows = {
  OnBlocked: 0,
  OnCombatRoundEnd: 1,
  OnConversation: 2,
  OnDamaged: 3,
  OnDeath: 4,
  OnDisturbed: 5,
  OnHeartbeat: 6,
  OnPerception: 7,
  OnPhysicalAttacked: 8,
  OnRested: 9,
  OnSpawn: 10,
  OnSpellCastAt: 11,
  OnUserDefined: 12,
};
if (!(event in rows)) throw new Error(`Unsupported event ${JSON.stringify(event)}.`);

const source = String.raw`
$ErrorActionPreference='Stop';Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;
public static class AuroraEventScriptEdit {
 public delegate bool E(IntPtr h,IntPtr l);
 [StructLayout(LayoutKind.Sequential)] public struct R { public int Left,Top,Right,Bottom; }
 [DllImport("user32.dll")] public static extern bool EnumWindows(E c,IntPtr l);
 [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr p,E c,IntPtr l);
 [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h,StringBuilder b,int n);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr h,StringBuilder b,int n);
 [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h,out R r);
 [DllImport("user32.dll")] public static extern IntPtr GetParent(IntPtr h);
 [DllImport("user32.dll")] public static extern int GetDlgCtrlID(IntPtr h);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern IntPtr SendMessage(IntPtr h,uint m,IntPtr w,string l);
 [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr h,uint m,IntPtr w,IntPtr l);
}
'@
function T([IntPtr]$h){$b=[Text.StringBuilder]::new(1024);[void][AuroraEventScriptEdit]::GetWindowText($h,$b,$b.Capacity);$b.ToString()}
function C([IntPtr]$h){$b=[Text.StringBuilder]::new(128);[void][AuroraEventScriptEdit]::GetClassName($h,$b,$b.Capacity);$b.ToString()}
function Get-R([IntPtr]$h){$r=New-Object 'AuroraEventScriptEdit+R';[void][AuroraEventScriptEdit]::GetWindowRect($h,[ref]$r);$r}
$ps=@(Get-Process nwtoolset -ErrorAction SilentlyContinue);if($ps.Count-ne1){throw 'expected_one_toolset_process'};[uint32]$pid=$ps[0].Id
$script:frame=@();$script:dialog=@();[void][AuroraEventScriptEdit]::EnumWindows([AuroraEventScriptEdit+E]{param($h,$l);[uint32]$p=0;[void][AuroraEventScriptEdit]::GetWindowThreadProcessId($h,[ref]$p);if($p-eq$pid-and[AuroraEventScriptEdit]::IsWindowVisible($h)){if((C $h)-eq'TfrmFrame'-and(T $h).TrimEnd('*').EndsWith(" - $env:MODULE",[StringComparison]::OrdinalIgnoreCase)){$script:frame+=$h};if((C $h)-eq'TdlgCreatureEdit'-and(T $h)-eq'Creature Properties'){$script:dialog+=$h}};$true},[IntPtr]::Zero)
if($script:frame.Count-ne1){throw 'expected_exact_module_frame'};if($script:dialog.Count-ne1){throw 'expected_creature_dialog'};$screen=[Windows.Forms.Screen]::FromHandle($script:frame[0]);if($screen.Primary){throw 'module_on_primary_display'}
$script:combos=@();[void][AuroraEventScriptEdit]::EnumChildWindows($script:dialog[0],[AuroraEventScriptEdit+E]{param($h,$l);if([AuroraEventScriptEdit]::IsWindowVisible($h)-and(C $h)-eq'TComboBox'){$r=Get-R $h;$script:combos+=[pscustomobject]@{h=$h;top=$r.Top}};$true},[IntPtr]::Zero);$combos=@($script:combos|Sort-Object top);if($combos.Count-ne13){throw "expected_thirteen_script_combos:$($combos.Count)"};$combo=$combos[[int]$env:ROW].h
$script:edits=@();[void][AuroraEventScriptEdit]::EnumChildWindows($combo,[AuroraEventScriptEdit+E]{param($h,$l);if([AuroraEventScriptEdit]::IsWindowVisible($h)-and(C $h)-eq'Edit'){$script:edits+=$h};$true},[IntPtr]::Zero);if($script:edits.Count-ne1){throw "expected_one_event_edit:$($script:edits.Count)"};$edit=$script:edits[0]
$setResult=[AuroraEventScriptEdit]::SendMessage($edit,0x000C,[IntPtr]::Zero,$env:RESOURCE);if($setResult.ToInt64()-eq0){throw 'event_edit_wm_settext_failed'};$comboParent=[AuroraEventScriptEdit]::GetParent($combo);$comboId=[AuroraEventScriptEdit]::GetDlgCtrlID($combo);$editChange=[IntPtr][int64](((5-band0xffff)-shl16)-bor($comboId-band0xffff));[void][AuroraEventScriptEdit]::SendMessage($comboParent,0x0111,$editChange,$combo);Start-Sleep -Milliseconds 500
[pscustomobject]@{ok=$true;processId=$pid;dialogHwnd=$script:dialog[0].ToInt64();comboHwnd=$combo.ToInt64();editHwnd=$edit.ToInt64();comboParentHwnd=$comboParent.ToInt64();comboId=$comboId;event=$env:EVENT;resource=$env:RESOURCE;wmSetTextResult=$setResult.ToInt64();moduleTitleAfterSelection=(T $script:frame[0]);requiresCreaturePropertiesCommit=$true;monitor=[pscustomobject]@{deviceName=$screen.DeviceName;primary=$screen.Primary};safety=[pscustomobject]@{usesGlobalCursor=$false;usesGlobalKeyboard=$false;usesGlobalMouse=$false;method='exact Scripts-tab event row and child edit plus targeted WM_SETTEXT/CBN_EDITCHANGE; durable readback deferred until Creature Properties OK and module save'}}|ConvertTo-Json -Depth 6
`;

const output = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", source], {
  encoding: "utf8",
  windowsHide: true,
  timeout: 30_000,
  env: { ...process.env, MODULE: moduleName, EVENT: event, RESOURCE: resource, ROW: String(rows[event]) },
});
console.log(JSON.stringify(JSON.parse(output.trim()), null, 2));

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined) throw new Error(`Expected --name <value> near ${key ?? "end"}.`);
    result[key.slice(2)] = value;
  }
  return result;
}
function required(value, name) {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`${name} is required.`);
  return text;
}
