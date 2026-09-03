#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const resource = String(process.argv[process.argv.indexOf("--resource") + 1] ?? "").trim();
if (!resource) throw new Error("--resource is required.");

const source = String.raw`
$ErrorActionPreference='Stop'
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;
public static class AuroraResourceListGeneric {
 public delegate bool E(IntPtr h,IntPtr l);
 [DllImport("user32.dll")] public static extern bool EnumWindows(E c,IntPtr l);
 [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr p,E c,IntPtr l);
 [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h,StringBuilder b,int n);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr h,StringBuilder b,int n);
 [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr h,uint m,IntPtr w,IntPtr l);
 [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr h,uint m,IntPtr w,IntPtr l);
 [DllImport("kernel32.dll")] public static extern IntPtr OpenProcess(uint a,bool i,uint p);
 [DllImport("kernel32.dll")] public static extern IntPtr VirtualAllocEx(IntPtr p,IntPtr a,UIntPtr s,uint t,uint pr);
 [DllImport("kernel32.dll")] public static extern bool VirtualFreeEx(IntPtr p,IntPtr a,UIntPtr s,uint t);
 [DllImport("kernel32.dll")] public static extern bool WriteProcessMemory(IntPtr p,IntPtr a,byte[] b,UIntPtr s,out UIntPtr w);
 [DllImport("kernel32.dll")] public static extern bool ReadProcessMemory(IntPtr p,IntPtr a,byte[] b,UIntPtr s,out UIntPtr r);
 [DllImport("kernel32.dll")] public static extern bool CloseHandle(IntPtr h);
}
'@
function T([IntPtr]$h){$b=[Text.StringBuilder]::new(512);[void][AuroraResourceListGeneric]::GetWindowText($h,$b,$b.Capacity);$b.ToString()}
function C([IntPtr]$h){$b=[Text.StringBuilder]::new(128);[void][AuroraResourceListGeneric]::GetClassName($h,$b,$b.Capacity);$b.ToString()}
$ps=@(Get-Process nwtoolset -ErrorAction SilentlyContinue);if($ps.Count-ne1){throw 'expected_one_toolset_process'};[uint32]$pid=$ps[0].Id
$script:selectors=@();[void][AuroraResourceListGeneric]::EnumWindows([AuroraResourceListGeneric+E]{param($h,$l);[uint32]$p=0;[void][AuroraResourceListGeneric]::GetWindowThreadProcessId($h,[ref]$p);if($p-eq$pid-and[AuroraResourceListGeneric]::IsWindowVisible($h)-and(C $h)-eq'TdlgResOpen'-and(T $h)-eq'Select Resource'){$script:selectors+=$h};$true},[IntPtr]::Zero);if($script:selectors.Count-ne1){throw "expected_one_resource_selector:$($script:selectors.Count)"};$selector=$script:selectors[0]
$script:lists=@();$script:opens=@();[void][AuroraResourceListGeneric]::EnumChildWindows($selector,[AuroraResourceListGeneric+E]{param($h,$l);if([AuroraResourceListGeneric]::IsWindowVisible($h)){if((C $h)-eq'TListView'){$script:lists+=$h};if((C $h)-eq'TButton'-and(T $h)-eq'Open'){$script:opens+=$h}};$true},[IntPtr]::Zero);if($script:lists.Count-ne1-or$script:opens.Count-ne1){throw 'unexpected_resource_dialog_controls'};$list=$script:lists[0]
$proc=[AuroraResourceListGeneric]::OpenProcess(0x38,$false,$pid);if($proc-eq[IntPtr]::Zero){throw 'process_open_failed'};$remote=[AuroraResourceListGeneric]::VirtualAllocEx($proc,[IntPtr]::Zero,[UIntPtr]::new(2048),0x1000,4);if($remote-eq[IntPtr]::Zero){[void][AuroraResourceListGeneric]::CloseHandle($proc);throw 'remote_alloc_failed'}
try{$count=[AuroraResourceListGeneric]::SendMessage($list,0x1004,[IntPtr]::Zero,[IntPtr]::Zero).ToInt64();$names=@();for($i=0;$i-lt$count;$i++){$item=New-Object byte[] 60;[BitConverter]::GetBytes([uint32]1).CopyTo($item,0);[BitConverter]::GetBytes([int]0).CopyTo($item,8);[BitConverter]::GetBytes([uint32]($remote.ToInt64()+256)).CopyTo($item,20);[BitConverter]::GetBytes([int]512).CopyTo($item,24);$written=[UIntPtr]::Zero;if(-not[AuroraResourceListGeneric]::WriteProcessMemory($proc,$remote,$item,[UIntPtr]::new(60),[ref]$written)){throw 'list_item_write_failed'};[void][AuroraResourceListGeneric]::SendMessage($list,0x1073,[IntPtr]$i,$remote);$textBytes=New-Object byte[] 1024;$read=[UIntPtr]::Zero;if(-not[AuroraResourceListGeneric]::ReadProcessMemory($proc,[IntPtr]($remote.ToInt64()+256),$textBytes,[UIntPtr]::new(1024),[ref]$read)){throw 'list_item_read_failed'};$names+=[Text.Encoding]::Unicode.GetString($textBytes).Split([char]0)[0]};$matches=@();for($i=0;$i-lt$names.Count;$i++){if($names[$i]-eq$env:RESOURCE){$matches+=$i}};if($matches.Count-ne1){throw ('expected_one_exact_resource:'+$env:RESOURCE+':'+$matches.Count+':'+($names-join','))};$target=[int]$matches[0]
$state=New-Object byte[] 60;[BitConverter]::GetBytes([uint32]3).CopyTo($state,12);[BitConverter]::GetBytes([uint32]3).CopyTo($state,16);$written=[UIntPtr]::Zero;[void][AuroraResourceListGeneric]::WriteProcessMemory($proc,$remote,$state,[UIntPtr]::new(60),[ref]$written);[void][AuroraResourceListGeneric]::SendMessage($list,0x102B,[IntPtr]$target,$remote);[void][AuroraResourceListGeneric]::SendMessage($list,0x1013,[IntPtr]$target,[IntPtr]::Zero);if([AuroraResourceListGeneric]::SendMessage($list,0x1032,[IntPtr]::Zero,[IntPtr]::Zero).ToInt64()-ne1){throw 'resource_selection_count_invalid'};if(-not[AuroraResourceListGeneric]::PostMessage($script:opens[0],0x00F5,[IntPtr]::Zero,[IntPtr]::Zero)){throw 'open_button_post_failed'};for($i=0;$i-lt24-and[AuroraResourceListGeneric]::IsWindowVisible($selector);$i++){Start-Sleep -Milliseconds 250};if([AuroraResourceListGeneric]::IsWindowVisible($selector)){throw 'resource_selector_did_not_close'};[pscustomobject]@{ok=$true;processId=$pid;selectorHwnd=$selector.ToInt64();listHwnd=$list.ToInt64();resource=$env:RESOURCE;resourceIndex=$target;resourceNames=$names;safety=[pscustomobject]@{usesGlobalCursor=$false;usesGlobalKeyboard=$false;usesGlobalMouse=$false;method='remote exact TListView resource identity plus targeted native selection and Open'}}|ConvertTo-Json -Depth 6}finally{[void][AuroraResourceListGeneric]::VirtualFreeEx($proc,$remote,[UIntPtr]::Zero,0x8000);[void][AuroraResourceListGeneric]::CloseHandle($proc)}
`;

const output = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", source], {
  encoding: "utf8",
  windowsHide: true,
  timeout: 30_000,
  env: { ...process.env, RESOURCE: resource },
});
console.log(JSON.stringify(JSON.parse(output.trim()), null, 2));
