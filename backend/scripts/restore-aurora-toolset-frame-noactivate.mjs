#!/usr/bin/env node

import { execFileSync } from "node:child_process";

const options = parseArgs(process.argv.slice(2));
const moduleName = required(options.module, "--module");
const ensureNonPrimary = options.ensureNonPrimary === "true";
if (options.ensureNonPrimary !== undefined && !["true", "false"].includes(options.ensureNonPrimary)) throw new Error("--ensureNonPrimary must be true or false.");
const strictPreArea=options.requirePreAreaHidden==='true';
const identityFields=['expectedPid','expectedStartedAtUtc','expectedFrameHwnd','expectedApplicationHwnd','expectedTitle'];
if(options.requirePreAreaHidden!==undefined&&!strictPreArea)throw new Error('pre_area_guard_mode_invalid');
if(identityFields.some(key=>options[key]!==undefined)&&!strictPreArea)throw new Error('pre_area_identity_requires_guard');
if(strictPreArea){
  if(!ensureNonPrimary||identityFields.some(key=>!options[key]))throw new Error('pre_area_identity_incomplete');
  for(const key of ['expectedPid','expectedFrameHwnd','expectedApplicationHwnd'])if(!/^[1-9]\d*$/.test(options[key])||!Number.isSafeInteger(Number(options[key])))throw new Error('pre_area_identity_invalid');
  if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{7}Z$/.test(options.expectedStartedAtUtc)||!options.expectedTitle.endsWith(` - ${moduleName}`))throw new Error('pre_area_identity_invalid');
}

const source = String.raw`
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;
public static class AuroraFrameRestore {
 public delegate bool E(IntPtr h,IntPtr l);
 [StructLayout(LayoutKind.Sequential)]public struct R{public int Left,Top,Right,Bottom;}
 [DllImport("user32.dll")]public static extern bool EnumWindows(E c,IntPtr l);
 [DllImport("user32.dll")]public static extern bool EnumChildWindows(IntPtr p,E c,IntPtr l);
 [DllImport("user32.dll")]public static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll")]public static extern bool IsIconic(IntPtr h);
 [DllImport("user32.dll")]public static extern bool IsZoomed(IntPtr h);
 [DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetWindowText(IntPtr h,StringBuilder b,int n);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetClassName(IntPtr h,StringBuilder b,int n);
 [DllImport("user32.dll")]public static extern bool GetWindowRect(IntPtr h,out R r);
 [DllImport("user32.dll")]public static extern bool ShowWindow(IntPtr h,int c);
 [DllImport("user32.dll")]public static extern bool SetWindowPos(IntPtr h,IntPtr a,int x,int y,int w,int z,uint f);
}
'@
function Text([IntPtr]$h){$b=[Text.StringBuilder]::new(512);[void][AuroraFrameRestore]::GetWindowText($h,$b,$b.Capacity);$b.ToString()}
function Class([IntPtr]$h){$b=[Text.StringBuilder]::new(128);[void][AuroraFrameRestore]::GetClassName($h,$b,$b.Capacity);$b.ToString()}
function Rect([IntPtr]$h){$r=New-Object 'AuroraFrameRestore+R';if(-not[AuroraFrameRestore]::GetWindowRect($h,[ref]$r)){throw 'frame_rect_unavailable'};[pscustomobject]@{left=$r.Left;top=$r.Top;right=$r.Right;bottom=$r.Bottom;width=$r.Right-$r.Left;height=$r.Bottom-$r.Top}}
# Exact pre-Area guard: shared readback APIs, no additional native transport.
function Assert-HiddenPreAreaOwner([bool]$hidden){
 if($env:AFR_STRICT_PREAREA-ne'true'){return}
 $current=@(Get-Process nwtoolset -ErrorAction SilentlyContinue)
 if($current.Count-ne1-or-not$current[0].Responding-or$current[0].Id-ne[long]$env:AFR_EXPECTED_PID-or$current[0].StartTime.ToUniversalTime().ToString('o')-cne$env:AFR_EXPECTED_START){throw 'pre_area_owner_drift'}
 if(@(Get-Process nwmain -ErrorAction SilentlyContinue).Count-ne0){throw 'pre_area_nwn_present'}
 if($frame.ToInt64()-ne[long]$env:AFR_EXPECTED_FRAME){throw 'pre_area_frame_drift'}
 [uint32]$actualOwner=0;[void][AuroraFrameRestore]::GetWindowThreadProcessId($frame,[ref]$actualOwner)
 if($actualOwner-ne[long]$env:AFR_EXPECTED_PID){throw 'pre_area_frame_owner_drift'}
 $script:guardWindows=@()
 [void][AuroraFrameRestore]::EnumWindows([AuroraFrameRestore+E]{param($h,$l);[uint32]$q=0;[void][AuroraFrameRestore]::GetWindowThreadProcessId($h,[ref]$q);if($q-eq[long]$env:AFR_EXPECTED_PID){$script:guardWindows+=[pscustomobject]@{hwnd=$h.ToInt64();className=(Class $h);title=(Text $h);visible=[AuroraFrameRestore]::IsWindowVisible($h);iconic=[AuroraFrameRestore]::IsIconic($h)}};$true},[IntPtr]::Zero)
 $guardFrames=@($script:guardWindows|Where-Object{$_.className-eq'TfrmFrame'});$guardApps=@($script:guardWindows|Where-Object{$_.className-eq'TApplication'})
 if($guardFrames.Count-ne1-or$guardFrames[0].hwnd-ne[long]$env:AFR_EXPECTED_FRAME-or$guardFrames[0].title-cne$env:AFR_EXPECTED_TITLE-or$guardFrames[0].title.EndsWith('*')-or$guardFrames[0].iconic){throw 'pre_area_frame_invalid'}
 if($guardApps.Count-ne1-or$guardApps[0].hwnd-ne[long]$env:AFR_EXPECTED_APPLICATION){throw 'pre_area_application_drift'}
 $guardVisible=@($script:guardWindows|Where-Object{$_.visible})
 if(@($guardVisible|Where-Object{$_.className-ne'TfrmFrame'-and$_.className-ne'TApplication'}).Count-ne0){throw 'pre_area_modal_present'}
 if($hidden){if($guardFrames[0].visible-or$guardVisible.Count-ne1-or-not$guardApps[0].visible-or-not$guardApps[0].iconic){throw 'pre_area_not_hidden'}}
 elseif(-not$guardFrames[0].visible){throw 'pre_area_not_restored'}
 $script:guardAreas=0;[void][AuroraFrameRestore]::EnumChildWindows($frame,[AuroraFrameRestore+E]{param($h,$l);if((Class $h)-eq'TfrmViewerArea'){$script:guardAreas++};$true},[IntPtr]::Zero)
 if($script:guardAreas-ne0){throw 'pre_area_viewer_present'}
}
# End exact pre-Area guard.
$ps=@(Get-Process nwtoolset -ErrorAction SilentlyContinue);if($ps.Count-ne1-or-not$ps[0].Responding){throw 'expected_one_responding_toolset'};[uint32]$pid=$ps[0].Id
$script:frames=@();[void][AuroraFrameRestore]::EnumWindows([AuroraFrameRestore+E]{param($h,$l);[uint32]$q=0;[void][AuroraFrameRestore]::GetWindowThreadProcessId($h,[ref]$q);if($q-eq$pid-and(Class $h)-eq'TfrmFrame'-and(Text $h).TrimEnd('*').EndsWith(" - $env:AFR_MODULE",[StringComparison]::OrdinalIgnoreCase)){$script:frames+=$h};$true},[IntPtr]::Zero)
if($script:frames.Count-ne1){throw "exact_frame_count:$($script:frames.Count)"};$frame=$script:frames[0]
Assert-HiddenPreAreaOwner $true
$before=[pscustomobject]@{visible=[AuroraFrameRestore]::IsWindowVisible($frame);iconic=[AuroraFrameRestore]::IsIconic($frame);maximized=[AuroraFrameRestore]::IsZoomed($frame);bounds=Rect $frame;monitor=[Windows.Forms.Screen]::FromHandle($frame).DeviceName}
$restored=$false;$placed=$false
if(-not$before.visible-or($env:AFR_ENSURE_NONPRIMARY-eq'true'-and$before.maximized)){
 [void][AuroraFrameRestore]::ShowWindow($frame,4)
 $restored=$true
 for($attempt=0;$attempt-lt20;$attempt++){Start-Sleep -Milliseconds 25;if([AuroraFrameRestore]::IsWindowVisible($frame)-and-not[AuroraFrameRestore]::IsIconic($frame)-and-not[AuroraFrameRestore]::IsZoomed($frame)){break}}
 if(-not[AuroraFrameRestore]::IsWindowVisible($frame)-or[AuroraFrameRestore]::IsIconic($frame)-or[AuroraFrameRestore]::IsZoomed($frame)){throw 'frame_show_noactivate_failed'}
}
$current=[Windows.Forms.Screen]::FromHandle($frame);$currentBounds=Rect $frame
Assert-HiddenPreAreaOwner $false
if($env:AFR_ENSURE_NONPRIMARY-eq'true'-and($current.Primary-or$currentBounds.left-lt$current.WorkingArea.Left-or$currentBounds.top-lt$current.WorkingArea.Top-or$currentBounds.right-gt$current.WorkingArea.Right-or$currentBounds.bottom-gt$current.WorkingArea.Bottom)){
 $targets=@([Windows.Forms.Screen]::AllScreens|Where-Object{-not$_.Primary});if($targets.Count-ne1){throw "expected_one_nonprimary_screen:$($targets.Count)"};$target=$targets[0];$work=$target.WorkingArea
 if($env:AFR_STRICT_PREAREA-eq'true'-and$target.DeviceName-cne'\\.\DISPLAY1'){throw 'pre_area_target_monitor_invalid'}
 $offsetX=[Math]::Max(0,$currentBounds.left-$current.Bounds.Left);$offsetY=[Math]::Max(0,$currentBounds.top-$current.Bounds.Top)
 $width=[Math]::Min($currentBounds.width,$work.Width);$height=[Math]::Min($currentBounds.height,$work.Height)
 $left=$work.Left+[Math]::Min($offsetX,[Math]::Max(0,$work.Width-$width));$top=$work.Top+[Math]::Min($offsetY,[Math]::Max(0,$work.Height-$height))
 if(-not[AuroraFrameRestore]::SetWindowPos($frame,[IntPtr]::Zero,$left,$top,$width,$height,0x0014)){throw 'frame_nonprimary_noactivate_placement_failed'};$placed=$true;Start-Sleep -Milliseconds 300
}
$afterBounds=Rect $frame;$afterScreen=[Windows.Forms.Screen]::FromHandle($frame)
Assert-HiddenPreAreaOwner $false
if($env:AFR_STRICT_PREAREA-eq'true'-and$afterScreen.DeviceName-cne'\\.\DISPLAY1'){throw 'pre_area_result_monitor_invalid'}
if(-not[AuroraFrameRestore]::IsWindowVisible($frame)-or[AuroraFrameRestore]::IsIconic($frame)){throw 'frame_restore_visibility_failed'}
if($env:AFR_ENSURE_NONPRIMARY-eq'true'-and$afterScreen.Primary){throw 'frame_restore_nonprimary_failed'}
$workAfter=$afterScreen.WorkingArea;if($afterBounds.left-lt$workAfter.Left-or$afterBounds.top-lt$workAfter.Top-or$afterBounds.right-gt$workAfter.Right-or$afterBounds.bottom-gt$workAfter.Bottom){throw 'frame_restore_bounds_outside_working_area'}
[pscustomobject]@{ok=$true;processId=$pid;frameHwnd=$frame.ToInt64();module=$env:AFR_MODULE;identityGuardVersion=if($env:AFR_STRICT_PREAREA-eq'true'){'aurora-hidden-frame-owner-guard/v1'}else{$null};startedAtUtc=$ps[0].StartTime.ToUniversalTime().ToString('o');before=$before;after=[pscustomobject]@{visible=$true;iconic=$false;maximized=[AuroraFrameRestore]::IsZoomed($frame);bounds=$afterBounds};restored=$restored;placedOnNonPrimary=$placed;monitor=[pscustomobject]@{deviceName=$afterScreen.DeviceName;primary=$afterScreen.Primary};safety=[pscustomobject]@{globalCursor=$false;globalKeyboard=$false;globalMouse=$false;activatesFrame=$false;changesFramePlacement=$placed;usesNoActivate=$true;usesNoZOrderChange=$true;method='exact TfrmFrame SW_SHOWNOACTIVATE plus optional exact-frame SetWindowPos to sole non-primary working area with SWP_NOACTIVATE|SWP_NOZORDER'}}|ConvertTo-Json -Depth 7 -Compress
`;

const output = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", source], {
  encoding: "utf8", windowsHide: true, timeout: 20_000, maxBuffer: 1024 * 1024,
  env: { ...process.env, AFR_MODULE: moduleName, AFR_ENSURE_NONPRIMARY: String(ensureNonPrimary),AFR_STRICT_PREAREA:String(strictPreArea),
    AFR_EXPECTED_PID:options.expectedPid??'',AFR_EXPECTED_START:options.expectedStartedAtUtc??'',AFR_EXPECTED_FRAME:options.expectedFrameHwnd??'',
    AFR_EXPECTED_APPLICATION:options.expectedApplicationHwnd??'',AFR_EXPECTED_TITLE:options.expectedTitle??'' },
});
console.log(JSON.stringify(JSON.parse(output.trim()), null, 2));

function parseArgs(argv) { const result = {}; for (let index = 0; index < argv.length; index += 2) { const key = argv[index], value = argv[index + 1]; if (!key?.startsWith("--") || value === undefined || value.startsWith("--")) throw new Error(`Expected --name <value> near ${key ?? "end"}.`); result[key.slice(2)] = value; } return result; }
function required(value, name) { const text = String(value ?? "").trim(); if (!text) throw new Error(`${name} is required.`); return text; }
