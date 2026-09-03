#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const options = parseArgs(process.argv.slice(2));
const moduleName = required(options.module, "--module");
const mode = required(options.mode, "--mode").toLowerCase();
if (!new Set(["terrain", "objects"]).has(mode)) throw new Error("--mode must be terrain or objects.");

const source = String.raw`
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System; using System.Text; using System.Runtime.InteropServices;
public static class AuroraSelectionModeSet {
 public delegate bool E(IntPtr h,IntPtr l);
 [DllImport("user32.dll")] public static extern bool EnumWindows(E c,IntPtr l);
 [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr p,E c,IntPtr l);
 [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h,StringBuilder b,int n);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr h,StringBuilder b,int n);
 [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h,out RECT r);
 [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr h,uint m,IntPtr w,IntPtr l);
 [DllImport("kernel32.dll")] public static extern IntPtr OpenProcess(uint a,bool i,uint p);
 [DllImport("kernel32.dll")] public static extern IntPtr VirtualAllocEx(IntPtr p,IntPtr a,UIntPtr s,uint t,uint pr);
 [DllImport("kernel32.dll")] public static extern bool VirtualFreeEx(IntPtr p,IntPtr a,UIntPtr s,uint t);
 [DllImport("kernel32.dll")] public static extern bool ReadProcessMemory(IntPtr p,IntPtr a,byte[] b,UIntPtr s,out UIntPtr r);
 [DllImport("kernel32.dll")] public static extern bool CloseHandle(IntPtr h);
 [StructLayout(LayoutKind.Sequential)] public struct RECT{public int Left,Top,Right,Bottom;}
}
'@
function Text([IntPtr]$h){$b=[Text.StringBuilder]::new(1024);[void][AuroraSelectionModeSet]::GetWindowText($h,$b,$b.Capacity);$b.ToString()};function Class([IntPtr]$h){$b=[Text.StringBuilder]::new(256);[void][AuroraSelectionModeSet]::GetClassName($h,$b,$b.Capacity);$b.ToString()};function Rect([IntPtr]$h){$r=New-Object 'AuroraSelectionModeSet+RECT';[void][AuroraSelectionModeSet]::GetWindowRect($h,[ref]$r);[pscustomobject]@{left=$r.Left;top=$r.Top;width=$r.Right-$r.Left;height=$r.Bottom-$r.Top}}
$ps=@(Get-Process nwtoolset -ErrorAction SilentlyContinue);if($ps.Count-ne1){throw "expected_one_toolset_process:$($ps.Count)"};[uint32]$pidValue=$ps[0].Id;$script:frames=@();$cb=[AuroraSelectionModeSet+E]{param($h,$l);[uint32]$p=0;[void][AuroraSelectionModeSet]::GetWindowThreadProcessId($h,[ref]$p);if($p-eq$pidValue-and[AuroraSelectionModeSet]::IsWindowVisible($h)-and(Class $h)-eq'TfrmFrame'){$script:frames += [pscustomobject]@{hwnd=$h;text=(Text $h)}};return $true};[void][AuroraSelectionModeSet]::EnumWindows($cb,[IntPtr]::Zero);$frame=@($script:frames|Where-Object{$_.text.TrimEnd('*').EndsWith(" - $env:ASM_MODULE",[StringComparison]::OrdinalIgnoreCase)})|Select-Object -First 1;if($null-eq$frame){throw 'expected_module_frame_missing'};$screen=[Windows.Forms.Screen]::FromHandle($frame.hwnd);if($screen.Primary){throw "module_on_primary_display:$($screen.DeviceName)"}
$script:bars=@();$cc=[AuroraSelectionModeSet+E]{param($h,$l);if([AuroraSelectionModeSet]::IsWindowVisible($h)-and(Class $h)-eq'TToolBar'){$r=Rect $h;if($r.width-ge60-and$r.width-le100-and$r.height-ge20-and$r.height-le30){$script:bars += [pscustomobject]@{hwnd=$h;bounds=$r}}};return $true};[void][AuroraSelectionModeSet]::EnumChildWindows($frame.hwnd,$cc,[IntPtr]::Zero);if($script:bars.Count-ne1){throw "expected_one_selection_mode_toolbar:$($script:bars.Count)"};$bar=$script:bars[0];$count=[int][AuroraSelectionModeSet]::SendMessage($bar.hwnd,0x0418,[IntPtr]::Zero,[IntPtr]::Zero).ToInt64();if($count-ne2){throw "expected_two_selection_mode_buttons:$count"}
function Read-Buttons{$ph=[AuroraSelectionModeSet]::OpenProcess(0x438,$false,$pidValue);if($ph-eq[IntPtr]::Zero){throw 'open_process_failed'};$size=[UIntPtr]::new(32);$remote=[AuroraSelectionModeSet]::VirtualAllocEx($ph,[IntPtr]::Zero,$size,0x1000,4);if($remote-eq[IntPtr]::Zero){[void][AuroraSelectionModeSet]::CloseHandle($ph);throw 'remote_buffer_failed'};try{$result=@();foreach($i in 0..1){if([AuroraSelectionModeSet]::SendMessage($bar.hwnd,0x0417,[IntPtr]$i,$remote).ToInt64()-ne1){throw "tb_getbutton_failed:$i"};$buf=New-Object byte[] 32;$read=[UIntPtr]::Zero;if(-not[AuroraSelectionModeSet]::ReadProcessMemory($ph,$remote,$buf,$size,[ref]$read)){throw "read_button_failed:$i"};$state=[int]$buf[8];$result += [pscustomobject]@{index=$i;commandId=[BitConverter]::ToInt32($buf,4);state=$state;checked=(($state-band1)-ne0);enabled=(($state-band4)-ne0)}};return $result}finally{[void][AuroraSelectionModeSet]::VirtualFreeEx($ph,$remote,[UIntPtr]::Zero,0x8000);[void][AuroraSelectionModeSet]::CloseHandle($ph)}}
$before=@(Read-Buttons);$targetIndex=if($env:ASM_MODE-eq'objects'){1}else{0};if(-not$before[$targetIndex].checked){$x=[int][Math]::Floor(($targetIndex+0.5)*($bar.bounds.width/$count));$y=[int][Math]::Floor($bar.bounds.height/2);$lp=[IntPtr][int64](($y-shl16)-bor($x-band0xffff));[void][AuroraSelectionModeSet]::SendMessage($bar.hwnd,0x0201,[IntPtr]1,$lp);[void][AuroraSelectionModeSet]::SendMessage($bar.hwnd,0x0202,[IntPtr]::Zero,$lp);Start-Sleep -Milliseconds 250};$after=@(Read-Buttons);if(-not$after[$targetIndex].checked-or$after[1-$targetIndex].checked){throw "selection_mode_not_confirmed:$($env:ASM_MODE)"}
[pscustomobject]@{ok=$true;processId=$pidValue;frameHwnd=$frame.hwnd.ToInt64();toolbarHwnd=$bar.hwnd.ToInt64();mode=$env:ASM_MODE;targetIndex=$targetIndex;before=$before;after=$after;monitor=[pscustomobject]@{deviceName=$screen.DeviceName;primary=$screen.Primary};safety=[pscustomobject]@{usesGlobalCursor=$false;usesGlobalKeyboard=$false;usesGlobalMouse=$false;method='targeted WM_LBUTTONDOWN/UP to validated Selection Mode toolbar plus native checked-state readback'}}|ConvertTo-Json -Depth 7 -Compress
`;
const output = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", source], { encoding: "utf8", windowsHide: true, timeout: 30_000, maxBuffer: 1024 * 1024, env: { ...process.env, ASM_MODULE: moduleName, ASM_MODE: mode } });
console.log(JSON.stringify(JSON.parse(output.trim()), null, 2));

function parseArgs(argv){const r={};for(let i=0;i<argv.length;i+=2){const k=argv[i],v=argv[i+1];if(!k?.startsWith("--")||v===undefined||v.startsWith("--"))throw new Error(`Expected --name <value> near ${k??"end"}.`);r[k.slice(2)]=v;}return r;}
function required(v,n){const s=String(v??"").trim();if(!s)throw new Error(`${n} is required.`);return s;}
