#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const options = parseArgs(process.argv.slice(2));
const moduleName = required(options.module, "--module");
const area = required(options.area, "--area").toLowerCase();
const timeoutMs = integer(options.timeoutMs ?? "4000", "--timeoutMs", 1000, 15000);
const transport = required(options.transport ?? "rightclick", "--transport").toLowerCase();
if (!new Set(["rightclick", "contextmenu"]).has(transport)) throw new Error("--transport must be rightclick or contextmenu.");
throw new Error(`known_tile_properties_context_transport_forbidden:${transport}: rightclick reaches the focus-sensitive GLPanelMouseDown path; WM_CONTEXTMENU produced no popup for the exact selected source tile. Neither route may be repeated.`);

const source = String.raw`
$ErrorActionPreference='Stop';Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;
public static class ATPA{
 public delegate bool E(IntPtr h,IntPtr l);[StructLayout(LayoutKind.Sequential)]public struct R{public int Left,Top,Right,Bottom;}
 [DllImport("user32.dll")]public static extern bool EnumWindows(E c,IntPtr l);[DllImport("user32.dll")]public static extern bool EnumChildWindows(IntPtr p,E c,IntPtr l);[DllImport("user32.dll")]public static extern bool IsWindowVisible(IntPtr h);[DllImport("user32.dll")]public static extern bool IsWindowEnabled(IntPtr h);[DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);[DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetWindowText(IntPtr h,StringBuilder b,int n);[DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetClassName(IntPtr h,StringBuilder b,int n);[DllImport("user32.dll")]public static extern bool GetWindowRect(IntPtr h,out R r);[DllImport("user32.dll")]public static extern IntPtr SendMessage(IntPtr h,uint m,IntPtr w,IntPtr l);[DllImport("user32.dll")]public static extern bool PostMessage(IntPtr h,uint m,IntPtr w,IntPtr l);[DllImport("user32.dll")]public static extern int GetMenuItemCount(IntPtr m);[DllImport("user32.dll")]public static extern uint GetMenuItemID(IntPtr m,int p);[DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetMenuString(IntPtr m,uint i,StringBuilder b,int n,uint f);[DllImport("user32.dll")]public static extern uint GetMenuState(IntPtr m,uint i,uint f);[DllImport("user32.dll")]public static extern bool SetWindowPos(IntPtr h,IntPtr z,int x,int y,int w,int ht,uint f);
}
'@
function T([IntPtr]$h){$b=[Text.StringBuilder]::new(1024);[void][ATPA]::GetWindowText($h,$b,1024);$b.ToString()};function C([IntPtr]$h){$b=[Text.StringBuilder]::new(128);[void][ATPA]::GetClassName($h,$b,128);$b.ToString()};function Rect([IntPtr]$h){$r=New-Object 'ATPA+R';[void][ATPA]::GetWindowRect($h,[ref]$r);[pscustomobject]@{left=$r.Left;top=$r.Top;right=$r.Right;bottom=$r.Bottom;width=$r.Right-$r.Left;height=$r.Bottom-$r.Top}}
$ps=@(Get-Process nwtoolset -ErrorAction SilentlyContinue);if($ps.Count-ne1){throw "expected_one_toolset_process:$($ps.Count)"};[uint32]$script:toolsetPid=$ps[0].Id
function Toolset-Tops{$script:tops=@();[void][ATPA]::EnumWindows([ATPA+E]{param($h,$l);[uint32]$p=0;[void][ATPA]::GetWindowThreadProcessId($h,[ref]$p);if($p-eq[uint32]$l.ToInt64()-and[ATPA]::IsWindowVisible($h)){$script:tops+=[pscustomobject]@{hwnd=$h;className=C $h;text=T $h;enabled=[ATPA]::IsWindowEnabled($h);bounds=Rect $h}};$true},[IntPtr][int64]$script:toolsetPid);@($script:tops)}
function Children([IntPtr]$parent){$script:kids=@();[void][ATPA]::EnumChildWindows($parent,[ATPA+E]{param($h,$l);$script:kids+=[pscustomobject]@{hwnd=$h;className=C $h;text=T $h;visible=[ATPA]::IsWindowVisible($h);enabled=[ATPA]::IsWindowEnabled($h);bounds=Rect $h};$true},[IntPtr]::Zero);@($script:kids)}
function Error-Text([IntPtr]$dialog){@((Children $dialog)|Where-Object{$_.className-eq'Static'-and$_.text}|ForEach-Object{$_.text})-join' | '}
function Cleanup-OpenedWindows{
 $actions=@();for($round=0;$round-lt20;$round++){$progress=$false;foreach($w in @(Toolset-Tops|Where-Object{$_.className-notin@('TfrmFrame','TApplication')})){
  if($w.className-eq'#32768'){[void][ATPA]::PostMessage($w.hwnd,0x0100,[IntPtr]0x1B,[IntPtr]0);[void][ATPA]::PostMessage($w.hwnd,0x0101,[IntPtr]0x1B,[IntPtr]0);$actions+="popup-escape:$($w.hwnd.ToInt64())";$progress=$true;continue}
  $buttons=@((Children $w.hwnd)|Where-Object{$_.visible-and$_.enabled-and$_.className-in@('Button','TButton')});$target=$null
  if($w.className-eq'TdlgTileProperties'){$target=@($buttons|Where-Object{$_.text-eq'Cancel'})|Select-Object -First 1}
  elseif($w.className-eq'#32770'){$target=@($buttons|Where-Object{$_.text-in@('OK','Cancel')})|Select-Object -First 1}
  if($null-ne$target){[void][ATPA]::SendMessage($target.hwnd,0x00F5,[IntPtr]0,[IntPtr]0);$actions+="button:$($target.text):$($w.hwnd.ToInt64())";$progress=$true}
 };if(-not$progress){break};Start-Sleep -Milliseconds 100};@($actions)
}
$result=$null;$caught=$null;$cleanup=@();$frame=$null
try{
 $initial=@(Toolset-Tops);$frames=@($initial|Where-Object{$_.className-eq'TfrmFrame'-and$_.text.TrimEnd('*').EndsWith(" - $env:MODULE",[StringComparison]::OrdinalIgnoreCase)});if($frames.Count-ne1){throw "exact_module_frame_missing:$($frames.Count)"};$frame=$frames[0];$screen=[Windows.Forms.Screen]::FromHandle($frame.hwnd);if($screen.Primary-or$screen.DeviceName-ne'\\.\DISPLAY1'){throw "module_not_on_non_primary_display:$($screen.DeviceName)"};if(-not$frame.enabled){throw 'module_frame_disabled'};$unexpected=@($initial|Where-Object{$_.className-notin@('TfrmFrame','TApplication')});if($unexpected.Count-ne0){throw ('preflight_unexpected_toolset_window:'+($unexpected|ConvertTo-Json -Compress))}
 $script:viewers=@();[void][ATPA]::EnumChildWindows($frame.hwnd,[ATPA+E]{param($h,$l);$name=(T $h).Trim().TrimStart('-').Trim();if([ATPA]::IsWindowVisible($h)-and(C $h)-eq'TfrmViewerArea'-and$name.Equals($env:AREA,[StringComparison]::OrdinalIgnoreCase)){$script:viewers+=$h};$true},[IntPtr]::Zero);if($script:viewers.Count-ne1){throw "exact_visible_area_viewer_missing:$($script:viewers.Count)"};$viewer=$script:viewers[0]
 $ports=@((Children $viewer)|Where-Object{$_.visible-and$_.enabled-and$_.className-eq'TScrollBox'-and$_.bounds.width-ge640-and$_.bounds.height-ge480}|Sort-Object{$_.bounds.width*$_.bounds.height}-Descending);if($ports.Count-lt1){throw 'exact_visible_area_viewport_missing'};$port=$ports[0]
 $bars=@((Children $frame.hwnd)|Where-Object{$_.visible-and$_.enabled-and$_.className-eq'TToolBar'-and$_.bounds.width-ge60-and$_.bounds.width-le100-and$_.bounds.height-ge20-and$_.bounds.height-le30});if($bars.Count-ne1){throw "selection_toolbar_ambiguous:$($bars.Count)"};$terrainState=[ATPA]::SendMessage($bars[0].hwnd,0x0412,[IntPtr]0,[IntPtr]0).ToInt64();$objectsState=[ATPA]::SendMessage($bars[0].hwnd,0x0412,[IntPtr]1,[IntPtr]0).ToInt64();if(($terrainState-band1)-eq0-or($terrainState-band4)-eq0-or($objectsState-band1)-ne0){throw ("terrain_mode_not_confirmed:{0}:{1}" -f $terrainState,$objectsState)}
 $x=[int][Math]::Floor($port.bounds.width/2);$y=[int][Math]::Floor($port.bounds.height/2);if($env:TRANSPORT-eq'contextmenu'){$screenX=$port.bounds.left+$x;$screenY=$port.bounds.top+$y;$lp=[IntPtr][int64](($screenY-shl16)-bor($screenX-band0xffff));if(-not[ATPA]::PostMessage($port.hwnd,0x007B,$port.hwnd,$lp)){throw 'contextmenu_message_not_queued'}}else{$screenX=$null;$screenY=$null;$lp=[IntPtr][int64](($y-shl16)-bor($x-band0xffff));if(-not[ATPA]::PostMessage($port.hwnd,0x0204,[IntPtr]2,$lp)-or-not[ATPA]::PostMessage($port.hwnd,0x0205,[IntPtr]0,$lp)){throw 'context_messages_not_queued'}}
 $deadline=[DateTime]::UtcNow.AddMilliseconds([int]$env:TIMEOUT);$outcome=$null;do{Start-Sleep -Milliseconds 100;$new=@(Toolset-Tops|Where-Object{$_.className-notin@('TfrmFrame','TApplication')});if($new.Count-gt0){$outcome=$new;break}}while([DateTime]::UtcNow-lt$deadline)
 if($null-eq$outcome){$result=[pscustomobject]@{status='failed';failure='no_context_outcome';click=[pscustomobject]@{x=$x;y=$y}}}
 elseif(@($outcome|Where-Object{$_.className-eq'#32770'}).Count-gt0){$errs=@($outcome|Where-Object{$_.className-eq'#32770'}|ForEach-Object{[pscustomobject]@{hwnd=$_.hwnd.ToInt64();text=(Error-Text $_.hwnd)}});$result=[pscustomobject]@{status='failed';failure='context_opened_error_modal';errors=$errs;click=[pscustomobject]@{x=$x;y=$y}}}
 else{
  $popups=@($outcome|Where-Object{$_.className-eq'#32768'});if($popups.Count-ne1){throw ('unexpected_context_outcome:'+($outcome|ConvertTo-Json -Compress))};$popup=$popups[0];$menu=[ATPA]::SendMessage($popup.hwnd,0x01E1,[IntPtr]0,[IntPtr]0);if($menu-eq[IntPtr]::Zero){throw 'popup_menu_handle_missing'};$items=@();$count=[ATPA]::GetMenuItemCount($menu);for($i=0;$i-lt$count;$i++){$b=[Text.StringBuilder]::new(512);[void][ATPA]::GetMenuString($menu,[uint32]$i,$b,512,0x400);$state=[uint32][ATPA]::GetMenuState($menu,[uint32]$i,0x400);$items+=[pscustomobject]@{position=$i;id=[uint32][ATPA]::GetMenuItemID($menu,$i);text=$b.ToString();enabled=(($state-band3)-eq0)}};$tile=@($items|Where-Object{$_.text-eq'&Tile Properties'-and$_.id-eq277-and$_.enabled});if($tile.Count-ne1){$result=[pscustomobject]@{status='failed';failure='exact_tile_properties_item_missing';items=$items;click=[pscustomobject]@{x=$x;y=$y}}}
  else{
   if(-not[ATPA]::PostMessage($popup.hwnd,0x0102,[IntPtr][int][char]'T',[IntPtr]0)){throw 'tile_properties_accelerator_not_queued'};$dialog=$null;$errors=@();$deadline=[DateTime]::UtcNow.AddMilliseconds([int]$env:TIMEOUT);do{Start-Sleep -Milliseconds 100;$after=@(Toolset-Tops|Where-Object{$_.className-notin@('TfrmFrame','TApplication','#32768')});$dialog=@($after|Where-Object{$_.className-eq'TdlgTileProperties'})|Select-Object -First 1;$errors=@($after|Where-Object{$_.className-eq'#32770'});if($null-ne$dialog-or$errors.Count-gt0){break}}while([DateTime]::UtcNow-lt$deadline)
   if($errors.Count-gt0){$result=[pscustomobject]@{status='failed';failure='tile_properties_opened_error_modal';errors=@($errors|ForEach-Object{[pscustomobject]@{hwnd=$_.hwnd.ToInt64();text=(Error-Text $_.hwnd)}});menuItem=$tile[0];click=[pscustomobject]@{x=$x;y=$y}}}
   elseif($null-eq$dialog){$result=[pscustomobject]@{status='failed';failure='tile_properties_dialog_missing_after_exact_menu_item';menuItem=$tile[0];click=[pscustomobject]@{x=$x;y=$y}}}
   else{$wa=$screen.WorkingArea;$dr=Rect $dialog.hwnd;$dx=$wa.Left+[Math]::Max(0,[int](($wa.Width-$dr.width)/2));$dy=$wa.Top+[Math]::Max(0,[int](($wa.Height-$dr.height)/2));[void][ATPA]::SetWindowPos($dialog.hwnd,[IntPtr]::Zero,$dx,$dy,0,0,0x0015);$controls=@((Children $dialog.hwnd)|Where-Object{$_.className-in@('TCheckBox','TButton','Button')}|ForEach-Object{[pscustomobject]@{hwnd=$_.hwnd.ToInt64();className=$_.className;text=$_.text;visible=$_.visible;enabled=$_.enabled;checkState=if($_.className-eq'TCheckBox'){[ATPA]::SendMessage($_.hwnd,0x00F0,[IntPtr]0,[IntPtr]0).ToInt64()}else{$null};bounds=$_.bounds}});$result=[pscustomobject]@{status='probed';dialogHwnd=$dialog.hwnd.ToInt64();dialogTitle=$dialog.text;menuItem=$tile[0];click=[pscustomobject]@{x=$x;y=$y};controls=$controls}}
  }
 }
}
catch{$caught=$_.Exception.Message}
finally{$cleanup=@(Cleanup-OpenedWindows)}
$final=@(Toolset-Tops);$left=@($final|Where-Object{$_.className-notin@('TfrmFrame','TApplication')});$finalFrame=@($final|Where-Object{$_.className-eq'TfrmFrame'}|Select-Object -First 1);if($null-eq$result){$failure=if($caught){$caught}else{'unknown_atomic_probe_failure'};$result=[pscustomobject]@{status='failed';failure=$failure}}elseif($caught){$result=[pscustomobject]@{status='failed';failure=$caught}};$ok=$result.status-eq'probed'-and$left.Count-eq0-and$null-ne$finalFrame-and$finalFrame.enabled
[pscustomobject]@{ok=$ok;processId=$script:toolsetPid;module=$env:MODULE;area=$env:AREA;transport=$env:TRANSPORT;result=$result;cleanup=$cleanup;final=[pscustomobject]@{unexpectedWindowCount=$left.Count;unexpectedWindows=@($left|ForEach-Object{[pscustomobject]@{hwnd=$_.hwnd.ToInt64();className=$_.className;text=$_.text}});frameEnabled=if($null-ne$finalFrame){$finalFrame.enabled}else{$false}};safety=[pscustomobject]@{usesGlobalCursor=$false;usesGlobalKeyboard=$false;usesGlobalMouse=$false;activatesFrame=$false;changesFramePlacement=$false;syntheticFocus=$false;attemptCount=1;method=if($env:TRANSPORT-eq'contextmenu'){'single targeted WM_CONTEXTMENU, PID-scoped outcome race, exact menu accelerator, immediate dialog readback and Cancel cleanup'}else{'single targeted viewport context message pair, PID-scoped outcome race, exact menu accelerator, immediate dialog readback and Cancel cleanup'}}}|ConvertTo-Json -Depth 10 -Compress
`;

const raw = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", source], { encoding: "utf8", windowsHide: true, timeout: timeoutMs * 3 + 20_000, maxBuffer: 8 * 1024 * 1024, env: { ...process.env, MODULE: moduleName, AREA: area, TIMEOUT: String(timeoutMs), TRANSPORT: transport } }).trim();
const result = JSON.parse(raw);
if (options.out) { const out = resolve(options.out); mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`, "utf8"); }
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 2;

function parseArgs(args){const out={};for(let i=0;i<args.length;i+=2){const key=args[i],value=args[i+1];if(!key?.startsWith("--")||value===undefined)throw new Error(`Expected --name <value> near ${key??"end"}.`);out[key.slice(2)]=value;}return out;}
function required(value,name){const text=String(value??"").trim();if(!text)throw new Error(`${name} is required.`);return text;}
function integer(value,name,min,max){const number=Number(value);if(!Number.isInteger(number)||number<min||number>max)throw new Error(`${name} must be an integer from ${min} to ${max}.`);return number;}
