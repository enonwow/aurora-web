#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const options = parseArgs(process.argv.slice(2));
const light = integer(options.light ?? "1", "--light");
if (![1, 2].includes(light)) throw new Error("--light must be 1 or 2.");

const source = String.raw`
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;
public static class AuroraTileLight {
 public delegate bool E(IntPtr h,IntPtr l);
 [StructLayout(LayoutKind.Sequential)] public struct R{public int Left,Top,Right,Bottom;}
 [DllImport("user32.dll")] public static extern bool EnumWindows(E c,IntPtr l);
 [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr p,E c,IntPtr l);
 [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll")] public static extern bool IsWindowEnabled(IntPtr h);
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h,StringBuilder b,int n);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr h,StringBuilder b,int n);
 [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h,out R r);
 [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr h,uint m,IntPtr w,IntPtr l);
 [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr h,uint m,IntPtr w,IntPtr l);
}
'@
function T([IntPtr]$h){$b=[Text.StringBuilder]::new(512);[void][AuroraTileLight]::GetWindowText($h,$b,512);$b.ToString()}
function C([IntPtr]$h){$b=[Text.StringBuilder]::new(128);[void][AuroraTileLight]::GetClassName($h,$b,128);$b.ToString()}
function Bounds([IntPtr]$h){$r=New-Object 'AuroraTileLight+R';[void][AuroraTileLight]::GetWindowRect($h,[ref]$r);[pscustomobject]@{left=$r.Left;top=$r.Top;width=$r.Right-$r.Left;height=$r.Bottom-$r.Top}}
$ps=@(Get-Process nwtoolset -ErrorAction SilentlyContinue);if($ps.Count-ne1){throw "expected_one_toolset_process:$($ps.Count)"};[uint32]$pid=$ps[0].Id
function Visible-Tops{$script:tops=@();[void][AuroraTileLight]::EnumWindows([AuroraTileLight+E]{param($h,$l);[uint32]$p=0;[void][AuroraTileLight]::GetWindowThreadProcessId($h,[ref]$p);if($p-eq$pid-and[AuroraTileLight]::IsWindowVisible($h)){$script:tops+=[pscustomobject]@{hwnd=$h.ToInt64();className=(C $h);text=(T $h)}};$true},[IntPtr]::Zero);@($script:tops)}
$before=@(Visible-Tops);if(@($before|Where-Object{$_.className-eq'#32770'}).Count-ne0){throw 'unexpected_message_dialog_before_tile_light_action'}
$dialogs=@($before|Where-Object{$_.className-eq'TdlgTileProperties'-and$_.text-eq'Tile Properties'});if($dialogs.Count-ne1){throw "expected_one_tile_properties_dialog:$($dialogs.Count)"};$dialog=[IntPtr][int64]$dialogs[0].hwnd
$script:panels=@();[void][AuroraTileLight]::EnumChildWindows($dialog,[AuroraTileLight+E]{param($h,$l);if([AuroraTileLight]::IsWindowVisible($h)-and[AuroraTileLight]::IsWindowEnabled($h)-and(C $h)-eq'TPanel'){$r=Bounds $h;if($r.width-ge20-and$r.width-le30-and$r.height-ge20-and$r.height-le30){$script:panels+=[pscustomobject]@{hwnd=$h;bounds=$r}}};$true},[IntPtr]::Zero)
$ordered=@($script:panels|Sort-Object{$_.bounds.top},{$_.bounds.left});if($ordered.Count-ne2){throw "expected_two_enabled_main_light_panels:$($ordered.Count)"};$target=$ordered[[int]$env:LIGHT-1];$x=[int]($target.bounds.width/2);$y=[int]($target.bounds.height/2);$lp=[IntPtr][int64](($y-shl16)-bor($x-band0xffff));if(-not[AuroraTileLight]::PostMessage($target.hwnd,0x0201,[IntPtr]1,$lp)-or-not[AuroraTileLight]::PostMessage($target.hwnd,0x0202,[IntPtr]::Zero,$lp)){throw 'main_light_panel_post_failed'};Start-Sleep -Milliseconds 900
$after=@(Visible-Tops);$errors=@($after|Where-Object{$_.className-eq'#32770'-and$_.text-like'BioWare Aurora*'});if($errors.Count-ne0){throw 'vcl_focus_error_after_tile_light_panel_action'};$new=@($after|Where-Object{$_.hwnd-notin@($before.hwnd)});if($new.Count-ne1){throw "expected_one_new_color_dialog:$($new.Count)"}
[pscustomobject]@{ok=$true;processId=$pid;tileDialogHwnd=$dialog.ToInt64();property="Main Light $($env:LIGHT)";panelHwnd=$target.hwnd.ToInt64();panelBounds=$target.bounds;click=[pscustomobject]@{x=$x;y=$y};newDialog=$new[0];safety=[pscustomobject]@{usesGlobalCursor=$false;usesGlobalKeyboard=$false;usesGlobalMouse=$false;method='exact TdlgTileProperties plus version-pinned enabled Main Light TPanel order and targeted nonblocking panel messages'}}|ConvertTo-Json -Depth 7 -Compress
`;

const output = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", source], {
  encoding: "utf8", windowsHide: true, timeout: 30_000, maxBuffer: 2 * 1024 * 1024,
  env: { ...process.env, LIGHT: String(light) },
});
console.log(JSON.stringify(JSON.parse(output.trim()), null, 2));

function parseArgs(argv) { const result={}; for(let i=0;i<argv.length;i+=2){const key=argv[i],value=argv[i+1];if(!key?.startsWith("--")||value===undefined)throw new Error(`Expected --name <value> near ${key??"end"}.`);result[key.slice(2)]=value;}return result; }
function integer(value,name){const parsed=Number(value);if(!Number.isInteger(parsed))throw new Error(`${name} must be an integer.`);return parsed;}
