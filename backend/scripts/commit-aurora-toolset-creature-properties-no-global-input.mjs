#!/usr/bin/env node

import { execFileSync } from "node:child_process";

const source = String.raw`
$ErrorActionPreference='Stop'
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;
public static class ACC{
  public delegate bool E(IntPtr h,IntPtr l);
  [DllImport("user32.dll")]public static extern bool EnumWindows(E c,IntPtr l);
  [DllImport("user32.dll")]public static extern bool EnumChildWindows(IntPtr p,E c,IntPtr l);
  [DllImport("user32.dll")]public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")]public static extern bool IsWindowEnabled(IntPtr h);
  [DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);
  [DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetWindowText(IntPtr h,StringBuilder b,int n);
  [DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetClassName(IntPtr h,StringBuilder b,int n);
  [DllImport("user32.dll")]public static extern bool PostMessage(IntPtr h,uint m,IntPtr w,IntPtr l);
}
'@
function T([IntPtr]$h){$b=[Text.StringBuilder]::new(2048);[void][ACC]::GetWindowText($h,$b,$b.Capacity);$b.ToString()}
function C([IntPtr]$h){$b=[Text.StringBuilder]::new(128);[void][ACC]::GetClassName($h,$b,$b.Capacity);$b.ToString()}
function Tops([uint32]$toolsetProcessId){$script:tops=@();[void][ACC]::EnumWindows([ACC+E]{param($h,$l);[uint32]$p=0;[void][ACC]::GetWindowThreadProcessId($h,[ref]$p);if($p-eq$toolsetProcessId-and[ACC]::IsWindowVisible($h)){$script:tops+=[pscustomobject]@{h=$h;hwnd=$h.ToInt64();className=C $h;text=T $h}};$true},[IntPtr]::Zero);@($script:tops)}
function Kids([IntPtr]$parent){$script:kids=@();[void][ACC]::EnumChildWindows($parent,[ACC+E]{param($h,$l);if([ACC]::IsWindowVisible($h)){$script:kids+=[pscustomobject]@{h=$h;hwnd=$h.ToInt64();className=C $h;text=T $h;enabled=[ACC]::IsWindowEnabled($h)}};$true},[IntPtr]::Zero);@($script:kids)}

$ps=@(Get-Process nwtoolset -ErrorAction SilentlyContinue)
if($ps.Count-ne1-or-not$ps[0].Responding){throw "expected_one_responding_toolset:$($ps.Count)"}
[uint32]$toolsetProcessId=$ps[0].Id
$tops=@(Tops $toolsetProcessId)
$dialogs=@($tops|Where-Object{$_.className-eq'TdlgCreatureEdit'-and$_.text-eq'Creature Properties'})
if($dialogs.Count-ne1){throw "expected_one_creature_properties:$($dialogs.Count)"}
$dialog=$dialogs[0]
$buttons=@(Kids $dialog.h|Where-Object{$_.className-in@('TButton','Button')-and$_.text-eq'OK'-and$_.enabled})
if($buttons.Count-ne1){throw "expected_one_creature_properties_ok:$($buttons.Count)"}
if(-not[ACC]::PostMessage($buttons[0].h,0x00F5,[IntPtr]::Zero,[IntPtr]::Zero)){throw 'creature_properties_ok_post_failed'}

$deadline=[DateTime]::UtcNow.AddSeconds(8)
$warningHandled=$false;$warningText=$null;$last=@()
do{
  Start-Sleep -Milliseconds 80
  $last=@(Tops $toolsetProcessId)
  $properties=@($last|Where-Object{$_.className-eq'TdlgCreatureEdit'-and$_.text-eq'Creature Properties'})
  $other=@($last|Where-Object{$_.className-notin@('TfrmFrame','TApplication','TdlgCreatureEdit')})
  if($other.Count-gt0){
    if($other.Count-ne1-or$other[0].className-ne'#32770'-or$other[0].text-ne'Warning'){throw ('unexpected_modal_after_creature_ok:'+($other|ConvertTo-Json -Compress))}
    $warning=$other[0]
    $warningKids=@(Kids $warning.h)
    $warningText=($warningKids.text -join [Environment]::NewLine)
    if($warningText-notmatch'may unequip items from this creature|appropriate feats|sufficient level'){throw "unexpected_creature_warning:$warningText"}
    $warningOk=@($warningKids|Where-Object{$_.className-in@('TButton','Button')-and$_.text-eq'OK'-and$_.enabled})
    if($warningOk.Count-ne1){throw "expected_one_creature_warning_ok:$($warningOk.Count)"}
    if(-not[ACC]::PostMessage($warningOk[0].h,0x00F5,[IntPtr]::Zero,[IntPtr]::Zero)){throw 'creature_warning_ok_post_failed'}
    $warningHandled=$true
    Start-Sleep -Milliseconds 150
  }
}while(($properties.Count-ne0-or$other.Count-ne0)-and[DateTime]::UtcNow-lt$deadline)
if($properties.Count-ne0-or$other.Count-ne0){throw ('creature_properties_commit_not_settled:'+($last|ConvertTo-Json -Compress))}
if(-not(Get-Process -Id $toolsetProcessId).Responding){throw 'toolset_not_responding_after_creature_commit'}

[pscustomobject]@{
  ok=$true
  processId=$toolsetProcessId
  dialogHwnd=$dialog.hwnd
  warningHandled=$warningHandled
  warningText=$warningText
  safety=[pscustomobject]@{
    usesGlobalCursor=$false
    usesGlobalKeyboard=$false
    usesGlobalMouse=$false
    method='exact Creature Properties OK; optional exact known feat warning OK; targeted asynchronous BM_CLICK; settled modal readback'
  }
}|ConvertTo-Json -Depth 6 -Compress
`;

const output = execFileSync(
  "powershell.exe",
  ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", source],
  {
    encoding: "utf8",
    windowsHide: true,
    timeout: 15_000,
    maxBuffer: 1024 * 1024,
  },
);
console.log(JSON.stringify(JSON.parse(output.trim()), null, 2));
