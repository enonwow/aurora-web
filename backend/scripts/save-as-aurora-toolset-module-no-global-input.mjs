#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { basename, resolve } from "node:path";

const options = parseArgs(process.argv.slice(2));
const moduleName = required(options.module, "--module");
const output = resolve(required(options.output, "--output"));
throw new Error(
  "save_as_helper_forbidden_tdlgmoduleselect_not_common_dialog: this helper is fail-closed until it validates and atomically handles the retail TdlgModuleSelect workflow",
);
if (existsSync(output)) throw new Error(`save_as_destination_exists:${output}`);
const outputName = basename(output);

const ps = String.raw`
$ErrorActionPreference='Stop';Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;
public static class SAM{public delegate bool E(IntPtr h,IntPtr l);[StructLayout(LayoutKind.Sequential)]public struct R{public int L,T,Rt,B;}[DllImport("user32.dll")]public static extern bool EnumWindows(E c,IntPtr l);[DllImport("user32.dll")]public static extern bool IsWindowVisible(IntPtr h);[DllImport("user32.dll")]public static extern bool IsWindowEnabled(IntPtr h);[DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);[DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetWindowText(IntPtr h,StringBuilder b,int n);[DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetClassName(IntPtr h,StringBuilder b,int n);[DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern bool SetWindowText(IntPtr h,string t);[DllImport("user32.dll")]public static extern IntPtr GetMenu(IntPtr h);[DllImport("user32.dll")]public static extern IntPtr GetSubMenu(IntPtr m,int p);[DllImport("user32.dll")]public static extern uint GetMenuItemID(IntPtr m,int p);[DllImport("user32.dll")]public static extern uint GetMenuState(IntPtr m,uint i,uint f);[DllImport("user32.dll")]public static extern IntPtr GetDlgItem(IntPtr h,int id);[DllImport("user32.dll")]public static extern IntPtr GetWindow(IntPtr h,uint c);[DllImport("user32.dll")]public static extern bool GetWindowRect(IntPtr h,out R r);[DllImport("user32.dll")]public static extern bool SetWindowPos(IntPtr h,IntPtr z,int x,int y,int w,int ht,uint f);[DllImport("user32.dll")]public static extern bool PostMessage(IntPtr h,uint m,IntPtr w,IntPtr l);}
'@
function T($h){$b=[Text.StringBuilder]::new(2048);[void][SAM]::GetWindowText($h,$b,$b.Capacity);$b.ToString()};function C($h){$b=[Text.StringBuilder]::new(128);[void][SAM]::GetClassName($h,$b,$b.Capacity);$b.ToString()}
$proc=@(Get-Process nwtoolset -ErrorAction SilentlyContinue);if($proc.Count-ne1){throw "expected_one_toolset:$($proc.Count)"};[uint32]$pid=$proc[0].Id;$script:f=@();[void][SAM]::EnumWindows([SAM+E]{param($h,$l);[uint32]$p=0;[void][SAM]::GetWindowThreadProcessId($h,[ref]$p);if($p-eq$pid-and[SAM]::IsWindowVisible($h)-and(C $h)-eq'TfrmFrame'-and(T $h).TrimEnd('*').EndsWith(" - $env:MODULE",[StringComparison]::OrdinalIgnoreCase)){$script:f+=$h};$true},[IntPtr]::Zero);if($script:f.Count-ne1){throw 'exact_frame_missing'};$frame=$script:f[0];$screen=[Windows.Forms.Screen]::FromHandle($frame);if($screen.Primary){throw 'frame_on_primary'}
$menu=[SAM]::GetMenu($frame);$file=[SAM]::GetSubMenu($menu,0);$id=[uint32][SAM]::GetMenuItemID($file,5);$state=[uint32][SAM]::GetMenuState($file,5,0x400);if($id-ne48-or($state-band3)-ne0){throw "save_as_menu_invalid:id=$id state=$state"};if(-not[SAM]::PostMessage($frame,0x0111,[IntPtr]48,[IntPtr]0)){throw 'save_as_post_failed'}
$deadline=[DateTime]::UtcNow.AddSeconds(8);$dialog=[IntPtr]::Zero;do{Start-Sleep -Milliseconds 100;$script:d=@();[void][SAM]::EnumWindows([SAM+E]{param($h,$l);[uint32]$p=0;[void][SAM]::GetWindowThreadProcessId($h,[ref]$p);if($p-eq$pid-and[SAM]::IsWindowVisible($h)-and(C $h)-eq'#32770'){$script:d+=$h};$true},[IntPtr]::Zero);if($script:d.Count-eq1){$dialog=$script:d[0]}}while($dialog-eq[IntPtr]::Zero-and[DateTime]::UtcNow-lt$deadline);if($dialog-eq[IntPtr]::Zero){throw 'save_as_dialog_missing'}
$r=New-Object 'SAM+R';[void][SAM]::GetWindowRect($dialog,[ref]$r);$wa=$screen.WorkingArea;$x=$wa.Left+[Math]::Max(0,[int](($wa.Width-($r.Rt-$r.L))/2));$y=$wa.Top+[Math]::Max(0,[int](($wa.Height-($r.B-$r.T))/2));[void][SAM]::SetWindowPos($dialog,[IntPtr]::Zero,$x,$y,0,0,0x0015)
$comboEx=[SAM]::GetDlgItem($dialog,1148);$combo=[SAM]::GetWindow($comboEx,5);$edit=[SAM]::GetWindow($combo,5);if($edit-eq[IntPtr]::Zero-or(C $edit)-ne'Edit'){throw 'save_as_filename_edit_missing'};if(-not[SAM]::SetWindowText($edit,$env:OUTPUT)){throw 'save_as_filename_set_failed'};if((T $edit)-ne$env:OUTPUT){throw 'save_as_filename_readback_mismatch'};$save=[SAM]::GetDlgItem($dialog,1);if($save-eq[IntPtr]::Zero-or(C $save)-ne'Button'){throw 'save_as_button_missing'};if(-not[SAM]::PostMessage($save,0x00F5,[IntPtr]0,[IntPtr]0)){throw 'save_as_button_post_failed'}
$deadline=[DateTime]::UtcNow.AddSeconds(20);$final='';do{Start-Sleep -Milliseconds 250;$final=T $frame}while(-not$final.TrimEnd('*').EndsWith(" - $env:OUTPUT_NAME",[StringComparison]::OrdinalIgnoreCase)-and[DateTime]::UtcNow-lt$deadline);if(-not$final.TrimEnd('*').EndsWith(" - $env:OUTPUT_NAME",[StringComparison]::OrdinalIgnoreCase)){throw "save_as_title_not_updated:$final"}
$script:visible=@();[void][SAM]::EnumWindows([SAM+E]{param($h,$l);[uint32]$p=0;[void][SAM]::GetWindowThreadProcessId($h,[ref]$p);if($p-eq$pid-and[SAM]::IsWindowVisible($h)){$script:visible+=[pscustomobject]@{hwnd=$h.ToInt64();className=(C $h);text=(T $h)}};$true},[IntPtr]::Zero);if(@($script:visible|?{$_.className-eq'#32770'}).Count-ne0){throw "save_as_left_modal:$($script:visible|ConvertTo-Json -Compress)"}
[pscustomobject]@{ok=$true;processId=$pid;frameHwnd=$frame.ToInt64();title=$final;output=$env:OUTPUT;dialog=[pscustomobject]@{hwnd=$dialog.ToInt64();title=(T $dialog);movedTo=$screen.DeviceName};visibleAfter=$script:visible;safety=[pscustomobject]@{usesGlobalCursor=$false;usesGlobalKeyboard=$false;usesGlobalMouse=$false;method='validated File/Save As command, immediate dialog relocation to Toolset display, exact filename readback, asynchronous button activation'}}|ConvertTo-Json -Depth 6 -Compress
`;
const raw = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", ps], { encoding:"utf8", windowsHide:true, timeout:40_000, maxBuffer:1024*1024, env:{...process.env,MODULE:moduleName,OUTPUT:output,OUTPUT_NAME:outputName} }).trim();
const result = JSON.parse(raw);
if (!existsSync(output) || statSync(output).size <= 0) throw new Error(`save_as_output_missing:${output}`);
result.outputBytes = statSync(output).size;
process.stdout.write(`${JSON.stringify(result,null,2)}\n`);

function parseArgs(args){const out={};for(let i=0;i<args.length;i+=2){if(!args[i]?.startsWith("--")||args[i+1]==null)throw new Error(`invalid_argument:${args[i]??"end"}`);out[args[i].slice(2)]=args[i+1];}return out;}
function required(value,name){const text=String(value??"").trim();if(!text)throw new Error(`${name} is required`);return text;}
