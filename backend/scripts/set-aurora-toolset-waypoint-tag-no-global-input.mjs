#!/usr/bin/env node

import { execFileSync } from "node:child_process";

const options = parseArgs(process.argv.slice(2));
const moduleName = required(options.module, "--module");
const newTag = required(options.newTag, "--newTag");
if (!/^[A-Za-z0-9_]{1,32}$/u.test(newTag)) throw new Error("--newTag must match [A-Za-z0-9_]{1,32}.");

const source = String.raw`
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;
public static class AuroraWaypointTag {
 public delegate bool E(IntPtr h,IntPtr l);
 [DllImport("user32.dll")]public static extern bool EnumWindows(E c,IntPtr l);
 [DllImport("user32.dll")]public static extern bool EnumChildWindows(IntPtr p,E c,IntPtr l);
 [DllImport("user32.dll")]public static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetWindowText(IntPtr h,StringBuilder b,int n);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetClassName(IntPtr h,StringBuilder b,int n);
 [DllImport("user32.dll")]public static extern bool GetWindowRect(IntPtr h,out RECT r);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern IntPtr SendMessage(IntPtr h,uint m,IntPtr w,string l);
 [DllImport("user32.dll")]public static extern IntPtr SendMessage(IntPtr h,uint m,IntPtr w,IntPtr l);
 [DllImport("kernel32.dll")]public static extern IntPtr OpenProcess(uint a,bool i,uint p);
 [DllImport("kernel32.dll")]public static extern IntPtr VirtualAllocEx(IntPtr p,IntPtr a,UIntPtr s,uint t,uint pr);
 [DllImport("kernel32.dll")]public static extern bool VirtualFreeEx(IntPtr p,IntPtr a,UIntPtr s,uint t);
 [DllImport("kernel32.dll")]public static extern bool ReadProcessMemory(IntPtr p,IntPtr a,byte[] b,UIntPtr s,out UIntPtr r);
 [DllImport("kernel32.dll")]public static extern bool CloseHandle(IntPtr h);
 [StructLayout(LayoutKind.Sequential)]public struct RECT{public int Left,Top,Right,Bottom;}
}
'@
function Text([IntPtr]$h){$b=[Text.StringBuilder]::new(512);[void][AuroraWaypointTag]::GetWindowText($h,$b,$b.Capacity);$b.ToString()}
function Class([IntPtr]$h){$b=[Text.StringBuilder]::new(128);[void][AuroraWaypointTag]::GetClassName($h,$b,$b.Capacity);$b.ToString()}
function Rect([IntPtr]$h){$r=New-Object 'AuroraWaypointTag+RECT';[void][AuroraWaypointTag]::GetWindowRect($h,[ref]$r);[pscustomobject]@{left=$r.Left;top=$r.Top;width=$r.Right-$r.Left;height=$r.Bottom-$r.Top}}
function Remote-Text([IntPtr]$h,[uint32]$pidValue){$size=512;$ph=[AuroraWaypointTag]::OpenProcess(0x438,$false,$pidValue);if($ph-eq[IntPtr]::Zero){throw 'waypoint_tag_open_process_failed'};$remote=[AuroraWaypointTag]::VirtualAllocEx($ph,[IntPtr]::Zero,[UIntPtr]::new($size),0x1000,4);if($remote-eq[IntPtr]::Zero){[void][AuroraWaypointTag]::CloseHandle($ph);throw 'waypoint_tag_remote_alloc_failed'};try{[void][AuroraWaypointTag]::SendMessage($h,0x000D,[IntPtr]256,$remote);$bytes=New-Object byte[] $size;$read=[UIntPtr]::Zero;if(-not[AuroraWaypointTag]::ReadProcessMemory($ph,$remote,$bytes,[UIntPtr]::new($size),[ref]$read)){throw 'waypoint_tag_remote_read_failed'};$unicode=$bytes.Length-ge2-and$bytes[1]-eq0;if($unicode){$end=0;while($end+1-lt$bytes.Length-and-not($bytes[$end]-eq0-and$bytes[$end+1]-eq0)){$end+=2};return [Text.Encoding]::Unicode.GetString($bytes,0,$end)}else{$end=[Array]::IndexOf($bytes,[byte]0);if($end-lt0){$end=$bytes.Length};return [Text.Encoding]::Default.GetString($bytes,0,$end)}}finally{[void][AuroraWaypointTag]::VirtualFreeEx($ph,$remote,[UIntPtr]::Zero,0x8000);[void][AuroraWaypointTag]::CloseHandle($ph)}}
$ps=@(Get-Process nwtoolset -ErrorAction SilentlyContinue);if($ps.Count-ne1){throw "expected_one_toolset_process:$($ps.Count)"};[uint32]$pidValue=$ps[0].Id
$script:dialogs=@();[void][AuroraWaypointTag]::EnumWindows([AuroraWaypointTag+E]{param($h,$l);[uint32]$p=0;[void][AuroraWaypointTag]::GetWindowThreadProcessId($h,[ref]$p);if($p-eq$pidValue-and[AuroraWaypointTag]::IsWindowVisible($h)-and(Class $h)-eq'TdlgWaypointEdit'-and(Text $h)-eq'Waypoint Properties'){$script:dialogs += $h};return $true},[IntPtr]::Zero);if($script:dialogs.Count-ne1){throw "expected_one_waypoint_properties_dialog:$($script:dialogs.Count)"};$dialog=$script:dialogs[0]
$screen=[Windows.Forms.Screen]::FromHandle($dialog);if($screen.Primary){throw "waypoint_dialog_on_primary_display:$($screen.DeviceName)"};$dialogRect=Rect $dialog
$script:edits=@();[void][AuroraWaypointTag]::EnumChildWindows($dialog,[AuroraWaypointTag+E]{param($h,$l);if([AuroraWaypointTag]::IsWindowVisible($h)-and(Class $h)-eq'TEdit'){$script:edits += [pscustomobject]@{hwnd=$h;bounds=(Rect $h);text=(Text $h)}};return $true},[IntPtr]::Zero)
$ordered=@($script:edits|Sort-Object{$_.bounds.top});if($ordered.Count-ne2){throw "expected_two_waypoint_edits:$($ordered.Count)"};$name=$ordered[0];$tag=$ordered[1]
if($name.text-ne'Waypoint'){throw "waypoint_name_identity_mismatch:$($name.text)"};if(($tag.bounds.top-$name.bounds.top)-lt25-or($tag.bounds.top-$name.bounds.top)-gt40){throw 'waypoint_tag_field_geometry_invalid'}
$before=[pscustomobject]@{name=$name.text;tag=(Remote-Text $tag.hwnd $pidValue);nameHwnd=$name.hwnd.ToInt64();tagHwnd=$tag.hwnd.ToInt64();nameBounds=$name.bounds;tagBounds=$tag.bounds}
[void][AuroraWaypointTag]::SendMessage($tag.hwnd,0x000C,[IntPtr]::Zero,$env:AWT_NEW_TAG);Start-Sleep -Milliseconds 300
$controlReadback=Remote-Text $tag.hwnd $pidValue
[pscustomobject]@{ok=$true;processId=$pidValue;dialogHwnd=$dialog.ToInt64();dialogBounds=$dialogRect;before=$before;after=[pscustomobject]@{name=$name.text;requestedTag=$env:AWT_NEW_TAG;controlReadback=$controlReadback;controlReadbackUnavailable=($controlReadback-ne$env:AWT_NEW_TAG)};dialogLeftOpenForProof=$true;requiredFinalReadback='saved Area GIT waypoint tag';monitor=[pscustomobject]@{deviceName=$screen.DeviceName;primary=$screen.Primary};safety=[pscustomobject]@{usesGlobalCursor=$false;usesGlobalKeyboard=$false;usesGlobalMouse=$false;method='validated exact Waypoint Properties dialog, geometry-identified Tag TEdit, targeted WM_SETTEXT; old Delphi edit requires screenshot plus saved GIT readback'}}|ConvertTo-Json -Depth 7 -Compress
`;

const output = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", source], {
  encoding: "utf8",
  windowsHide: true,
  timeout: 30_000,
  maxBuffer: 1024 * 1024,
  env: { ...process.env, AWT_MODULE: moduleName, AWT_NEW_TAG: newTag },
});
console.log(JSON.stringify(JSON.parse(output.trim()), null, 2));

function parseArgs(argv){const result={};for(let i=0;i<argv.length;i+=2){const key=argv[i],value=argv[i+1];if(!key?.startsWith("--")||value===undefined||value.startsWith("--"))throw new Error(`Expected --name <value> near ${key??"end"}.`);result[key.slice(2)]=value;}return result;}
function required(value,name){const text=String(value??"").trim();if(!text)throw new Error(`${name} is required.`);return text;}
