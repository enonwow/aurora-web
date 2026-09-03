#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const options=parseArgs(process.argv.slice(2));
const className=required(options.class,"--class");
const title=String(options.title ?? "");
const button=String(options.button ?? "Cancel");
const source=String.raw`
$ErrorActionPreference='Stop'
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;
public static class AuroraCloseDialogs { public delegate bool E(IntPtr h,IntPtr l); [DllImport("user32.dll")] public static extern bool EnumWindows(E c,IntPtr l); [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr p,E c,IntPtr l); [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h); [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p); [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr h,StringBuilder b,int n); [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h,StringBuilder b,int n); [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr h,uint m,IntPtr w,IntPtr l); }
'@
function C([IntPtr]$h){$b=[Text.StringBuilder]::new(128);[void][AuroraCloseDialogs]::GetClassName($h,$b,$b.Capacity);$b.ToString()}
function T([IntPtr]$h){$b=[Text.StringBuilder]::new(512);[void][AuroraCloseDialogs]::GetWindowText($h,$b,$b.Capacity);$b.ToString()}
[uint32]$pidValue=(Get-Process nwtoolset -ErrorAction Stop).Id
$script:targets=@()
[void][AuroraCloseDialogs]::EnumWindows([AuroraCloseDialogs+E]{param($h,$l);[uint32]$p=0;[void][AuroraCloseDialogs]::GetWindowThreadProcessId($h,[ref]$p);if($p-eq$pidValue-and[AuroraCloseDialogs]::IsWindowVisible($h)-and(C $h)-eq$env:CLASS-and($env:TITLE-eq''-or(T $h)-eq$env:TITLE)){$script:targets+=$h};$true},[IntPtr]::Zero)
if($script:targets.Count-eq0){throw 'no_matching_visible_dialogs'}
$closed=@()
foreach($dialog in $script:targets){
  $script:buttons=@()
  [void][AuroraCloseDialogs]::EnumChildWindows($dialog,[AuroraCloseDialogs+E]{param($h,$l);if([AuroraCloseDialogs]::IsWindowVisible($h)-and((C $h)-eq'TButton'-or(C $h)-eq'Button')-and(T $h)-eq$env:BUTTON){$script:buttons+=$h};$true},[IntPtr]::Zero)
  if($script:buttons.Count-ne1){throw "expected_one_button:$($dialog.ToInt64()):$($script:buttons.Count)"}
  if(-not[AuroraCloseDialogs]::PostMessage($script:buttons[0],0x00F5,[IntPtr]::Zero,[IntPtr]::Zero)){throw 'bm_click_failed'}
  $closed+=[pscustomobject]@{dialogHwnd=$dialog.ToInt64();buttonHwnd=$script:buttons[0].ToInt64()}
  Start-Sleep -Milliseconds 400
}
Start-Sleep -Milliseconds 900
[pscustomobject]@{ok=$true;processId=$pidValue;closed=$closed;safety=[pscustomobject]@{usesGlobalCursor=$false;usesGlobalMouse=$false;usesGlobalKeyboard=$false;method='exact dialog/button enumeration plus targeted BM_CLICK'}}|ConvertTo-Json -Depth 5 -Compress
`;
const output=execFileSync("powershell.exe",["-NoProfile","-STA","-ExecutionPolicy","Bypass","-Command",source],{encoding:"utf8",windowsHide:true,timeout:30000,env:{...process.env,CLASS:className,TITLE:title,BUTTON:button}});
console.log(JSON.stringify(JSON.parse(output.trim()),null,2));
function parseArgs(a){const r={};for(let i=0;i<a.length;i+=2){const k=a[i],v=a[i+1];if(!k?.startsWith("--")||v===undefined)throw new Error(`Expected --name <value> near ${k??"end"}.`);r[k.slice(2)]=v;}return r;}
function required(v,n){const s=String(v??"").trim();if(!s)throw new Error(`${n} is required.`);return s;}
