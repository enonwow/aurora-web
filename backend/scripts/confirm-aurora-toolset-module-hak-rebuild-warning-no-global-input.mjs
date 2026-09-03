#!/usr/bin/env node

import { execFileSync } from "node:child_process";

const moduleName = required(process.argv[2], "<module>");

const source = String.raw`
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;
public static class HAKWarning {
 public delegate bool E(IntPtr h,IntPtr l);
 [DllImport("user32.dll")]public static extern bool EnumWindows(E c,IntPtr l);
 [DllImport("user32.dll")]public static extern bool EnumChildWindows(IntPtr p,E c,IntPtr l);
 [DllImport("user32.dll")]public static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll")]public static extern bool IsWindowEnabled(IntPtr h);
 [DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetWindowText(IntPtr h,StringBuilder b,int n);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetClassName(IntPtr h,StringBuilder b,int n);
 [DllImport("user32.dll",SetLastError=true)]public static extern bool PostMessage(IntPtr h,uint m,IntPtr w,IntPtr l);
}
'@
function Text([IntPtr]$h){$b=[Text.StringBuilder]::new(4096);[void][HAKWarning]::GetWindowText($h,$b,$b.Capacity);$b.ToString()}
function WindowClass([IntPtr]$h){$b=[Text.StringBuilder]::new(128);[void][HAKWarning]::GetClassName($h,$b,$b.Capacity);$b.ToString()}
function Tops([uint32]$toolsetPid){$script:tops=@();[void][HAKWarning]::EnumWindows([HAKWarning+E]{param($h,$l);[uint32]$p=0;[void][HAKWarning]::GetWindowThreadProcessId($h,[ref]$p);if($p-eq$toolsetPid-and[HAKWarning]::IsWindowVisible($h)){$script:tops+=[pscustomobject]@{h=$h;hwnd=$h.ToInt64();className=WindowClass $h;text=Text $h;enabled=[HAKWarning]::IsWindowEnabled($h)}};$true},[IntPtr]::Zero);@($script:tops)}
function Kids([IntPtr]$parent){$script:kids=@();[void][HAKWarning]::EnumChildWindows($parent,[HAKWarning+E]{param($h,$l);$script:kids+=[pscustomobject]@{h=$h;hwnd=$h.ToInt64();className=WindowClass $h;text=Text $h;visible=[HAKWarning]::IsWindowVisible($h);enabled=[HAKWarning]::IsWindowEnabled($h)};$true},[IntPtr]::Zero);@($script:kids)}

$ps=@(Get-Process nwtoolset -ErrorAction SilentlyContinue);if($ps.Count-ne1-or-not$ps[0].Responding){throw "expected_one_responding_toolset:$($ps.Count)"};[uint32]$toolsetPid=$ps[0].Id
$before=@(Tops $toolsetPid);$frame=@($before|Where-Object{$_.className-eq'TfrmFrame'-and$_.text-eq"BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - $env:MODULE.mod"});$properties=@($before|Where-Object{$_.className-eq'TfrmIFOProp'-and$_.text-eq'Module Properties'});$warnings=@($before|Where-Object{$_.className-eq'#32770'-and$_.text-eq'Warning'});$unexpected=@($before|Where-Object{$_.className-notin@('TfrmFrame','TApplication','TfrmIFOProp','#32770')})
if($frame.Count-ne1-or$properties.Count-ne1-or$warnings.Count-ne1-or$unexpected.Count-ne0){throw ('pending_hak_warning_modal_stack_unverified:'+($before|ConvertTo-Json -Compress))}
$warning=$warnings[0];$kids=@(Kids $warning.h|Where-Object{$_.visible});$message=@($kids|Where-Object{$_.className-eq'Static'-and$_.text.Length-gt0});if($message.Count-ne1){throw ('warning_message_control_unverified:'+($kids|ConvertTo-Json -Compress))}
$text=$message[0].text
if($text-notmatch'change the list of Hak (Paks|Files) used by this module'-or$text-notmatch'full build'-or$text-notmatch'Are you sure you wish to continue'){throw "warning_semantics_unverified:$text"}
$affirmative=@($kids|Where-Object{$_.className-in@('Button','TButton')-and$_.enabled-and$_.text-in@('&Yes','Yes','&Tak','Tak')});$negative=@($kids|Where-Object{$_.className-in@('Button','TButton')-and$_.enabled-and$_.text-in@('&No','No','&Nie','Nie')})
if($affirmative.Count-ne1-or$negative.Count-ne1){throw ('warning_affirmative_button_unverified:'+($kids|ConvertTo-Json -Compress))}
if(-not[HAKWarning]::PostMessage($affirmative[0].h,0x00F5,[IntPtr]::Zero,[IntPtr]::Zero)){throw 'warning_affirmative_post_failed'}
$deadline=[DateTime]::UtcNow.AddSeconds(3);$last=@();$transition=$false
do{Start-Sleep -Milliseconds 100;$last=@(Tops $toolsetPid);$transition=@($last|Where-Object{$_.className-eq'TdlgVerifyModule'-or$_.className-eq'TdlgProgress'-or$_.text-match'Build Module|Loading Inventory List'}).Count-gt0-or@($last|Where-Object{$_.className-eq'#32770'-and$_.text-eq'Warning'}).Count-eq0}while(-not$transition-and[DateTime]::UtcNow-lt$deadline)
if(-not$transition){throw ('warning_transition_unverified:'+($last|ConvertTo-Json -Compress))}
[pscustomobject]@{ok=$true;processId=$toolsetPid;module=$env:MODULE;warning=[pscustomobject]@{hwnd=$warning.hwnd;text=$text;affirmative=$affirmative[0].text;negative=$negative[0].text};buildStarted=$true;windowsAfterPost=$last;safety=[pscustomobject]@{usesGlobalCursor=$false;usesGlobalKeyboard=$false;usesGlobalMouse=$false;action='verified localized Hak Files warning plus targeted affirmative button only; rebuild settlement is read-only separately'}}|ConvertTo-Json -Depth 6 -Compress
`;
const output = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", source], { encoding: "utf8", windowsHide: true, timeout: 80_000, maxBuffer: 4 * 1024 * 1024, env: { ...process.env, MODULE: moduleName } });
console.log(JSON.stringify(JSON.parse(output.trim()), null, 2));
function required(value, name){const result=String(value??"").trim();if(!/^[a-z0-9_]{1,32}$/iu.test(result))throw new Error(`${name} must be an Aurora resref.`);return result;}
