#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const options = parseArgs(process.argv.slice(2));
const moduleName = required(options.module, "--module");
const source = String.raw`
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class AuroraSelectionModeProbe {
  public delegate bool EnumWindowsProc(IntPtr hWnd,IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc callback,IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr parent,EnumWindowsProc callback,IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd,out uint processId);
  [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd,StringBuilder text,int count);
  [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr hWnd,StringBuilder text,int count);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd,out RECT rect);
  [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr hWnd,uint message,IntPtr wParam,IntPtr lParam);
  [DllImport("kernel32.dll")] public static extern IntPtr OpenProcess(uint access,bool inherit,uint processId);
  [DllImport("kernel32.dll")] public static extern IntPtr VirtualAllocEx(IntPtr process,IntPtr address,UIntPtr size,uint allocationType,uint protect);
  [DllImport("kernel32.dll")] public static extern bool VirtualFreeEx(IntPtr process,IntPtr address,UIntPtr size,uint freeType);
  [DllImport("kernel32.dll")] public static extern bool ReadProcessMemory(IntPtr process,IntPtr address,byte[] buffer,UIntPtr size,out UIntPtr read);
  [DllImport("kernel32.dll")] public static extern bool CloseHandle(IntPtr handle);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left,Top,Right,Bottom; }
}
'@
function Text([IntPtr]$h){$b=[Text.StringBuilder]::new(1024);[void][AuroraSelectionModeProbe]::GetWindowText($h,$b,$b.Capacity);$b.ToString()}
function Class([IntPtr]$h){$b=[Text.StringBuilder]::new(256);[void][AuroraSelectionModeProbe]::GetClassName($h,$b,$b.Capacity);$b.ToString()}
function Rect([IntPtr]$h){$r=New-Object 'AuroraSelectionModeProbe+RECT';[void][AuroraSelectionModeProbe]::GetWindowRect($h,[ref]$r);[pscustomobject]@{left=$r.Left;top=$r.Top;width=$r.Right-$r.Left;height=$r.Bottom-$r.Top}}
$processes=@(Get-Process nwtoolset -ErrorAction SilentlyContinue);if($processes.Count-ne1){throw "expected_one_toolset_process:$($processes.Count)"};[uint32]$pidValue=$processes[0].Id
$script:frames=@();$top=[AuroraSelectionModeProbe+EnumWindowsProc]{param($h,$l);[uint32]$p=0;[void][AuroraSelectionModeProbe]::GetWindowThreadProcessId($h,[ref]$p);if($p-eq$pidValue-and[AuroraSelectionModeProbe]::IsWindowVisible($h)-and(Class $h)-eq'TfrmFrame'){$script:frames += [pscustomobject]@{hwnd=$h;text=(Text $h)}};return $true};[void][AuroraSelectionModeProbe]::EnumWindows($top,[IntPtr]::Zero)
$frame=@($script:frames|Where-Object{$_.text.TrimEnd('*').EndsWith(" - $env:ASM_MODULE",[StringComparison]::OrdinalIgnoreCase)})|Select-Object -First 1;if($null-eq$frame){throw 'expected_module_frame_missing'}
$screen=[System.Windows.Forms.Screen]::FromHandle($frame.hwnd);if($screen.Primary){throw "module_on_primary_display:$($screen.DeviceName)"}
$script:toolbars=@();$child=[AuroraSelectionModeProbe+EnumWindowsProc]{param($h,$l);if([AuroraSelectionModeProbe]::IsWindowVisible($h)-and(Class $h)-eq'TToolBar'){$r=Rect $h;if($r.width-ge60-and$r.width-le100-and$r.height-ge20-and$r.height-le30){$script:toolbars += [pscustomobject]@{hwnd=$h;bounds=$r}}};return $true};[void][AuroraSelectionModeProbe]::EnumChildWindows($frame.hwnd,$child,[IntPtr]::Zero)
if($script:toolbars.Count-ne1){throw "expected_one_selection_mode_toolbar:$($script:toolbars.Count)"};$toolbar=$script:toolbars[0]
$buttonCount=[int][AuroraSelectionModeProbe]::SendMessage($toolbar.hwnd,0x0418,[IntPtr]::Zero,[IntPtr]::Zero).ToInt64();if($buttonCount-ne2){throw "expected_two_selection_mode_buttons:$buttonCount"}
$processHandle=[AuroraSelectionModeProbe]::OpenProcess(0x438,$false,$pidValue);if($processHandle-eq[IntPtr]::Zero){throw 'open_process_failed'}
$bufferSize=[UIntPtr]::new(32);$remote=[AuroraSelectionModeProbe]::VirtualAllocEx($processHandle,[IntPtr]::Zero,$bufferSize,0x1000,4);if($remote-eq[IntPtr]::Zero){[void][AuroraSelectionModeProbe]::CloseHandle($processHandle);throw 'remote_buffer_failed'}
try{$buttons=@();foreach($index in 0..($buttonCount-1)){$ok=[AuroraSelectionModeProbe]::SendMessage($toolbar.hwnd,0x0417,[IntPtr]$index,$remote).ToInt64();if($ok-ne1){throw "tb_getbutton_failed:$index"};$buffer=New-Object byte[] 32;$read=[UIntPtr]::Zero;if(-not[AuroraSelectionModeProbe]::ReadProcessMemory($processHandle,$remote,$buffer,$bufferSize,[ref]$read)){throw "read_button_failed:$index"};$commandId=[BitConverter]::ToInt32($buffer,4);$state=[int]$buffer[8];$style=[int]$buffer[9];$buttons += [pscustomobject]@{index=$index;commandId=$commandId;state=$state;style=$style;checked=(($state-band1)-ne0);pressed=(($state-band2)-ne0);enabled=(($state-band4)-ne0);hidden=(($state-band8)-ne0)}}}finally{[void][AuroraSelectionModeProbe]::VirtualFreeEx($processHandle,$remote,[UIntPtr]::Zero,0x8000);[void][AuroraSelectionModeProbe]::CloseHandle($processHandle)}
[pscustomobject]@{processId=$pidValue;frameHwnd=$frame.hwnd.ToInt64();title=$frame.text;monitor=[pscustomobject]@{deviceName=$screen.DeviceName;primary=$screen.Primary};toolbar=[pscustomobject]@{hwnd=$toolbar.hwnd.ToInt64();bounds=$toolbar.bounds;buttonCount=$buttonCount;buttons=$buttons};safety=[pscustomobject]@{readOnly=$true;usesGlobalCursor=$false;usesGlobalKeyboard=$false;usesGlobalMouse=$false}}|ConvertTo-Json -Depth 7 -Compress
`;

const output = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", source], {
  encoding: "utf8", windowsHide: true, timeout: 30_000, maxBuffer: 1024 * 1024,
  env: { ...process.env, ASM_MODULE: moduleName },
});
console.log(JSON.stringify(JSON.parse(output.trim()), null, 2));

function parseArgs(argv){const result={};for(let i=0;i<argv.length;i+=2){const key=argv[i],value=argv[i+1];if(!key?.startsWith("--")||value===undefined||value.startsWith("--"))throw new Error(`Expected --name <value> near ${key??"end"}.`);result[key.slice(2)]=value;}return result;}
function required(value,name){const text=String(value??"").trim();if(!text)throw new Error(`${name} is required.`);return text;}
