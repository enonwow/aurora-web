#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const options=parseArgs(process.argv.slice(2));
const moduleName=required(options.module,"--module");
const treeLabel=required(options.treeLabel,"--treeLabel");
const viewerResref=required(options.viewerResref,"--viewerResref").toLowerCase();
const timeoutMs=positiveInteger(options.timeoutMs??"60000","--timeoutMs");
const here=dirname(fileURLToPath(import.meta.url));

const context=JSON.parse(execFileSync(process.execPath,[resolve(here,"inspect-aurora-toolset-area-tree-object-context-no-global-input.mjs"),"--module",moduleName,"--objectText",treeLabel],{encoding:"utf8",windowsHide:true,timeout:45_000,maxBuffer:4*1024*1024}).trim());
const view=context.popup?.items?.[0];
if(view?.position!==0||view?.id!==4||view?.text!=="&View Area"||view?.enabled!==true)throw new Error("validated_view_area_menu_item_missing");

const source=String.raw`
$ErrorActionPreference='Stop';Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;
public static class VATI{
 public delegate bool E(IntPtr h,IntPtr l);[StructLayout(LayoutKind.Sequential)]public struct R{public int Left,Top,Right,Bottom;}
 [DllImport("user32.dll")]public static extern bool EnumWindows(E c,IntPtr l);[DllImport("user32.dll")]public static extern bool EnumChildWindows(IntPtr p,E c,IntPtr l);[DllImport("user32.dll")]public static extern bool IsWindowVisible(IntPtr h);[DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);[DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetWindowText(IntPtr h,StringBuilder b,int n);[DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetClassName(IntPtr h,StringBuilder b,int n);[DllImport("user32.dll")]public static extern bool GetWindowRect(IntPtr h,out R r);[DllImport("user32.dll")]public static extern bool GetMenuItemRect(IntPtr h,IntPtr m,uint i,out R r);[DllImport("user32.dll")]public static extern bool PostMessage(IntPtr h,uint m,IntPtr w,IntPtr l);
}
'@
function T([IntPtr]$h){$b=[Text.StringBuilder]::new(512);[void][VATI]::GetWindowText($h,$b,512);$b.ToString()};function C([IntPtr]$h){$b=[Text.StringBuilder]::new(128);[void][VATI]::GetClassName($h,$b,128);$b.ToString()}
$ps=@(Get-Process nwtoolset -ErrorAction SilentlyContinue);if($ps.Count-ne1){throw "expected_one_toolset:$($ps.Count)"};[uint32]$pid=$ps[0].Id
$script:frames=@();[void][VATI]::EnumWindows([VATI+E]{param($h,$l);[uint32]$p=0;[void][VATI]::GetWindowThreadProcessId($h,[ref]$p);if($p-eq$pid-and[VATI]::IsWindowVisible($h)-and(C $h)-eq'TfrmFrame'-and(T $h).TrimEnd('*').EndsWith(" - $env:MODULE",[StringComparison]::OrdinalIgnoreCase)){$script:frames+=$h};$true},[IntPtr]::Zero);if($script:frames.Count-ne1){throw 'exact_frame_missing'};$frame=$script:frames[0];$screen=[Windows.Forms.Screen]::FromHandle($frame);if($screen.Primary){throw 'frame_on_primary'}
$popup=[IntPtr][int64]$env:POPUP;$menu=[IntPtr][int64]$env:MENU;$popupRect=New-Object 'VATI+R';$itemRect=New-Object 'VATI+R';if(-not[VATI]::GetWindowRect($popup,[ref]$popupRect)-or-not[VATI]::GetMenuItemRect([IntPtr]::Zero,$menu,0,[ref]$itemRect)){throw 'view_area_menu_geometry_missing'}
if(-not[VATI]::PostMessage($popup,0x0102,[IntPtr][int][char]'V',[IntPtr]::Zero)){throw 'view_area_popup_accelerator_failed'}
$deadline=[DateTime]::UtcNow.AddMilliseconds([int]$env:TIMEOUT);$viewer=[IntPtr]::Zero;$viewport=[IntPtr]::Zero;$activeSheet=[IntPtr]::Zero
do{Start-Sleep -Milliseconds 350;$script:visibleViewers=@();$script:visibleSheets=@();[void][VATI]::EnumChildWindows($frame,[VATI+E]{param($h,$l);$text=(T $h).Trim().TrimStart('-').Trim();$class=C $h;if([VATI]::IsWindowVisible($h)-and$class-eq'TfrmViewerArea'){$script:visibleViewers+=[pscustomobject]@{hwnd=$h;text=$text}};if([VATI]::IsWindowVisible($h)-and$class-eq'TTabSheet'-and$text.Equals($env:VIEWER,[StringComparison]::OrdinalIgnoreCase)){$script:visibleSheets+=$h};$true},[IntPtr]::Zero);$matches=@($script:visibleViewers|Where-Object{$_.text.Equals($env:VIEWER,[StringComparison]::OrdinalIgnoreCase)});if($script:visibleViewers.Count-eq1-and$matches.Count-eq1-and$script:visibleSheets.Count-eq1){$viewer=$matches[0].hwnd;$activeSheet=$script:visibleSheets[0];$script:ports=@();[void][VATI]::EnumChildWindows($viewer,[VATI+E]{param($h,$l);if([VATI]::IsWindowVisible($h)-and(C $h)-eq'TScrollBox'){$r=New-Object 'VATI+R';[void][VATI]::GetWindowRect($h,[ref]$r);$script:ports+=[pscustomobject]@{h=$h;area=($r.Right-$r.Left)*($r.Bottom-$r.Top)}};$true},[IntPtr]::Zero);if($script:ports.Count-gt0){$viewport=($script:ports|Sort-Object area -Descending|Select-Object -First 1).h}}}while([DateTime]::UtcNow-lt$deadline-and$viewport-eq[IntPtr]::Zero)
if($viewer-eq[IntPtr]::Zero){throw ('exact_active_area_viewer_missing:'+($script:visibleViewers|ConvertTo-Json -Compress))};if($activeSheet-eq[IntPtr]::Zero){throw 'target_area_tab_not_active'};if($viewport-eq[IntPtr]::Zero){throw 'area_viewport_not_ready_after_view_command'};$script:popups=@();[void][VATI]::EnumWindows([VATI+E]{param($h,$l);[uint32]$p=0;[void][VATI]::GetWindowThreadProcessId($h,[ref]$p);if($p-eq$pid-and[VATI]::IsWindowVisible($h)-and(C $h)-eq'#32768'){$script:popups+=$h};$true},[IntPtr]::Zero);if($script:popups.Count-ne0){throw 'popup_left_after_view_area'}
[pscustomobject]@{ok=$true;processId=$pid;frameHwnd=$frame.ToInt64();treeLabel=$env:LABEL;viewerResref=$env:VIEWER;viewerHwnd=$viewer.ToInt64();viewportHwnd=$viewport.ToInt64();activeSheetHwnd=$activeSheet.ToInt64();hiddenChildRevealed=$false;menu=[pscustomobject]@{popupHwnd=$popup.ToInt64();menuHandle=$menu.ToInt64();position=0;commandId=4;text='&View Area';accelerator='V'};monitor=[pscustomobject]@{deviceName=$screen.DeviceName;primary=$screen.Primary};safety=[pscustomobject]@{usesGlobalCursor=$false;usesGlobalKeyboard=$false;usesGlobalMouse=$false;activatesFrame=$false;changesFramePlacement=$false;method='exact area-tree identity and live context-menu readback, validated targeted popup accelerator, exact active tab/viewer/viewport and zero-popup verification'}}|ConvertTo-Json -Depth 7 -Compress
`;
const live=JSON.parse(execFileSync("powershell.exe",["-NoProfile","-ExecutionPolicy","Bypass","-Command",source],{encoding:"utf8",windowsHide:true,timeout:timeoutMs+30_000,env:{...process.env,MODULE:moduleName,LABEL:treeLabel,VIEWER:viewerResref,POPUP:String(context.popup.hwnd),MENU:String(context.popup.menuHandle),TIMEOUT:String(timeoutMs)}}).trim());
console.log(JSON.stringify({...live,treeSelection:context.target,contextMenuReadback:view},null,2));

function parseArgs(argv){const out={};for(let i=0;i<argv.length;i+=2){const k=argv[i],v=argv[i+1];if(!k?.startsWith("--")||v===undefined)throw new Error(`Expected --name <value> near ${k??"end"}.`);out[k.slice(2)]=v;}return out;}
function required(value,name){const text=String(value??"").trim();if(!text)throw new Error(`${name} required`);return text;}
function positiveInteger(value,name){const n=Number(value);if(!Number.isInteger(n)||n<=0)throw new Error(`${name} must be a positive integer.`);return n;}
